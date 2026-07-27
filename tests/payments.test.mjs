/**
 * The payment endpoints — the code that decides whether money arrived.
 *
 *   node --test tests/payments.test.mjs
 *
 * Needs no Razorpay account, no keys and no network: `fetch` is stubbed, so
 * every test is deterministic and none of them can accidentally touch a live
 * merchant account. The secret used here is a fixed string in this file and
 * has nothing to do with any real key.
 *
 * These are written adversarially. The happy path is one test; the rest are
 * attempts to get an invoice marked paid without paying for it.
 */

import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const SECRET = "test_secret_not_a_real_key";
const KEY_ID = "rzp_test_fake";

process.env.RAZORPAY_KEY_ID = KEY_ID;
process.env.RAZORPAY_KEY_SECRET = SECRET;

const rzp = require("../api/_lib/razorpay.js");
const createOrder = require("../api/payments/create-order.js");
const verify = require("../api/payments/verify.js");
const reconcile = require("../api/payments/reconcile.js");

/* ── harness ──────────────────────────────────────────────────── */

const realFetch = globalThis.fetch;
let routes = [];

/** Answer the next fetch matching `test` with `body`. */
function route(match, body, status = 200) {
  routes.push({ match, body, status });
}

beforeEach(() => {
  routes = [];
  globalThis.fetch = async (url) => {
    const u = String(url);
    const hit = routes.find((r) => u.includes(r.match));
    if (!hit) throw new Error(`unstubbed fetch: ${u}`);
    return {
      ok: hit.status >= 200 && hit.status < 300,
      status: hit.status,
      json: async () => hit.body,
      text: async () => JSON.stringify(hit.body),
    };
  };
});

afterEach(() => { globalThis.fetch = realFetch; });

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

/** A Firestore REST document, as the API actually returns it. */
function fsDoc(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === "number") out[k] = Number.isInteger(v) ? { integerValue: v } : { doubleValue: v };
    else if (typeof v === "boolean") out[k] = { booleanValue: v };
    else out[k] = { stringValue: String(v) };
  }
  return { fields: out };
}

const sign = (orderId, paymentId, secret = SECRET) =>
  crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");

/* ── signature verification ───────────────────────────────────── */

test("a correct signature verifies", () => {
  const s = sign("order_1", "pay_1");
  assert.equal(
    rzp.verifyCheckoutSignature({
      razorpay_order_id: "order_1",
      razorpay_payment_id: "pay_1",
      razorpay_signature: s,
    }),
    true
  );
});

test("a signature for a different order does not verify", () => {
  const s = sign("order_OTHER", "pay_1");
  assert.equal(
    rzp.verifyCheckoutSignature({
      razorpay_order_id: "order_1",
      razorpay_payment_id: "pay_1",
      razorpay_signature: s,
    }),
    false
  );
});

test("a signature made with the wrong secret does not verify", () => {
  const s = sign("order_1", "pay_1", "attacker_guess");
  assert.equal(
    rzp.verifyCheckoutSignature({
      razorpay_order_id: "order_1",
      razorpay_payment_id: "pay_1",
      razorpay_signature: s,
    }),
    false
  );
});

test("an empty or malformed signature does not verify", () => {
  for (const bad of ["", "zz", "not-hex", null, undefined, "00".repeat(31)]) {
    assert.equal(
      rzp.verifyCheckoutSignature({
        razorpay_order_id: "order_1",
        razorpay_payment_id: "pay_1",
        razorpay_signature: bad,
      }),
      false,
      `signature ${JSON.stringify(bad)} must be rejected`
    );
  }
});

test("hex comparison rejects a length mismatch rather than throwing", () => {
  assert.equal(rzp.timingSafeEqualHex("aabb", "aa"), false);
  assert.equal(rzp.timingSafeEqualHex("", ""), false);
  assert.equal(rzp.timingSafeEqualHex("aabb", "aabb"), true);
});

/* ── create-order: the amount is never the browser's ──────────── */

test("the order amount comes from Firestore, not from the request body", async () => {
  // Asserts on what was SENT TO RAZORPAY, not on the response.
  //
  // The first version of this test stubbed Razorpay's reply as 8000000 paise
  // and then asserted the handler returned 8000000 — which only proved the
  // stub echoed itself. It would have passed just as happily if the handler
  // had forwarded the browser's `amount: 1`. Capturing the outgoing request is
  // the only way to test the property this endpoint exists for.
  let sentToRazorpay = null;
  globalThis.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes("firestore")) {
      return {
        ok: true, status: 200,
        json: async () => fsDoc({ orgId: "acme", label: "Retainer", amount: 80000, status: "due" }),
      };
    }
    sentToRazorpay = JSON.parse(opts.body);
    return {
      ok: true, status: 200,
      text: async () => JSON.stringify({ id: "order_x", amount: sentToRazorpay.amount, currency: "INR" }),
    };
  };

  const res = mockRes();
  await createOrder(
    {
      method: "POST",
      headers: { authorization: "Bearer client-token" },
      // The attack: pay one rupee for an eighty-thousand rupee invoice.
      body: { invoiceId: "inv1", amount: 1, amountRupees: 1, total: 1, amountPaise: 100 },
    },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(sentToRazorpay.amount, 8000000, "₹80,000 from the database, not ₹1 from the body");
  assert.equal(sentToRazorpay.notes.invoiceId, "inv1", "the order is attributable to an invoice");
  assert.equal(res.body.invoice.amount, 80000);
});

test("rupees are converted to paise exactly once", async () => {
  let sent = null;
  globalThis.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes("firestore")) {
      return { ok: true, status: 200, json: async () => fsDoc({ orgId: "a", amount: 1234.5, status: "due" }) };
    }
    sent = JSON.parse(opts.body);
    return { ok: true, status: 200, text: async () => JSON.stringify({ id: "o", amount: sent.amount, currency: "INR" }) };
  };

  const res = mockRes();
  await createOrder(
    { method: "POST", headers: { authorization: "Bearer t" }, body: { invoiceId: "i" } },
    res
  );
  assert.equal(sent.amount, 123450, "₹1,234.50 -> 123450 paise");
});

test("an already-paid invoice cannot be paid again", async () => {
  route("firestore.googleapis.com", fsDoc({ orgId: "a", amount: 5000, status: "paid" }));
  const res = mockRes();
  await createOrder(
    { method: "POST", headers: { authorization: "Bearer t" }, body: { invoiceId: "i" } },
    res
  );
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error, "already_paid");
});

test("an invoice with no usable amount is refused", async () => {
  for (const amount of [0, -100, "abc"]) {
    route("firestore.googleapis.com", fsDoc({ orgId: "a", amount, status: "due" }));
    const res = mockRes();
    await createOrder(
      { method: "POST", headers: { authorization: "Bearer t" }, body: { invoiceId: "i" } },
      res
    );
    assert.equal(res.statusCode, 422, `amount ${amount} must be refused`);
    routes = [];
  }
});

test("another org's invoice is refused by the rules, not by this code", async () => {
  // Firestore answers 403 because firestore.rules said so. The endpoint has
  // no tenancy check of its own, which is the point — one boundary, not two.
  route("firestore.googleapis.com", {}, 403);
  const res = mockRes();
  await createOrder(
    { method: "POST", headers: { authorization: "Bearer someone-elses-token" }, body: { invoiceId: "i" } },
    res
  );
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, "not_your_invoice");
});

test("no token means no order", async () => {
  const res = mockRes();
  await createOrder({ method: "POST", headers: {}, body: { invoiceId: "i" } }, res);
  assert.equal(res.statusCode, 401);
});

test("GET cannot create an order", async () => {
  const res = mockRes();
  await createOrder({ method: "GET", headers: {}, body: {} }, res);
  assert.equal(res.statusCode, 405);
});

test("an invoice id cannot escape its collection", async () => {
  const res = mockRes();
  await createOrder(
    { method: "POST", headers: { authorization: "Bearer t" }, body: { invoiceId: "../users/abc" } },
    res
  );
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "invalid_invoice_id");
});

/* ── verify: a signature alone proves nothing ─────────────────── */

test("a valid signature on a captured, correctly-priced payment verifies", async () => {
  route("firestore.googleapis.com", fsDoc({ orgId: "a", amount: 5000, status: "due" }));
  route("api.razorpay.com/v1/payments/", {
    id: "pay_1", order_id: "order_1", status: "captured", amount: 500000, method: "upi", created_at: 1750000000,
  });

  const res = mockRes();
  await verify(
    {
      method: "POST",
      headers: { authorization: "Bearer t" },
      body: {
        invoiceId: "i",
        razorpay_order_id: "order_1",
        razorpay_payment_id: "pay_1",
        razorpay_signature: sign("order_1", "pay_1"),
      },
    },
    res
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.verified, true);
  assert.equal(res.body.amount, 5000);
});

test("a forged signature is rejected before anything else happens", async () => {
  const res = mockRes();
  await verify(
    {
      method: "POST",
      headers: { authorization: "Bearer t" },
      body: {
        invoiceId: "i",
        razorpay_order_id: "order_1",
        razorpay_payment_id: "pay_1",
        razorpay_signature: "de".repeat(32),
      },
    },
    res
  );
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.verified, false);
  // No fetch was stubbed; reaching Firestore or Razorpay would have thrown.
});

test("a payment that was authorised but never captured is not settlement", async () => {
  route("firestore.googleapis.com", fsDoc({ orgId: "a", amount: 5000, status: "due" }));
  route("api.razorpay.com/v1/payments/", {
    id: "pay_1", order_id: "order_1", status: "authorized", amount: 500000,
  });

  const res = mockRes();
  await verify(
    {
      method: "POST",
      headers: { authorization: "Bearer t" },
      body: {
        invoiceId: "i",
        razorpay_order_id: "order_1",
        razorpay_payment_id: "pay_1",
        razorpay_signature: sign("order_1", "pay_1"),
      },
    },
    res
  );
  assert.equal(res.statusCode, 402);
  assert.equal(res.body.verified, false);
});

test("a short payment is never accepted as settlement", async () => {
  route("firestore.googleapis.com", fsDoc({ orgId: "a", amount: 80000, status: "due" }));
  route("api.razorpay.com/v1/payments/", {
    id: "pay_1", order_id: "order_1", status: "captured", amount: 100, // ₹1
  });

  const res = mockRes();
  await verify(
    {
      method: "POST",
      headers: { authorization: "Bearer t" },
      body: {
        invoiceId: "i",
        razorpay_order_id: "order_1",
        razorpay_payment_id: "pay_1",
        razorpay_signature: sign("order_1", "pay_1"),
      },
    },
    res
  );
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error, "amount_mismatch");
  assert.equal(res.body.paid, 1);
  assert.equal(res.body.expected, 80000);
});

test("a genuine payment for a DIFFERENT order is rejected", async () => {
  // The signature is valid — it was made for order_1/pay_1 — but Razorpay says
  // pay_1 belongs to another order. Signature checking alone would pass this.
  route("firestore.googleapis.com", fsDoc({ orgId: "a", amount: 5000, status: "due" }));
  route("api.razorpay.com/v1/payments/", {
    id: "pay_1", order_id: "order_SOMEONE_ELSE", status: "captured", amount: 500000,
  });

  const res = mockRes();
  await verify(
    {
      method: "POST",
      headers: { authorization: "Bearer t" },
      body: {
        invoiceId: "i",
        razorpay_order_id: "order_1",
        razorpay_payment_id: "pay_1",
        razorpay_signature: sign("order_1", "pay_1"),
      },
    },
    res
  );
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "order_mismatch");
});

test("verify never marks anything paid — it only reports", async () => {
  route("firestore.googleapis.com", fsDoc({ orgId: "a", amount: 5000, status: "due" }));
  route("api.razorpay.com/v1/payments/", {
    id: "pay_1", order_id: "order_1", status: "captured", amount: 500000,
  });

  const writes = [];
  const inner = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (opts && opts.method && opts.method !== "GET") writes.push(String(url));
    return inner(url, opts);
  };

  const res = mockRes();
  await verify(
    {
      method: "POST",
      headers: { authorization: "Bearer t" },
      body: {
        invoiceId: "i",
        razorpay_order_id: "order_1",
        razorpay_payment_id: "pay_1",
        razorpay_signature: sign("order_1", "pay_1"),
      },
    },
    res
  );
  assert.equal(res.body.verified, true);
  assert.deepEqual(
    writes.filter((u) => u.includes("firestore")),
    [],
    "no write to Firestore — there is no privileged writer in this deployment"
  );
});

/* ── reconcile: admin only ────────────────────────────────────── */

test("a client cannot reconcile", async () => {
  // Firestore refuses the admin-only leads read, so isAdmin() is false.
  route("firestore.googleapis.com", {}, 403);
  const res = mockRes();
  await reconcile({ method: "GET", headers: { authorization: "Bearer client-token" }, query: {} }, res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, "admin_only");
});

test("a signed-out visitor cannot reconcile, with the same message", async () => {
  const res = mockRes();
  await reconcile({ method: "GET", headers: {}, query: {} }, res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, "admin_only", "identical to the client case — no probing");
});

test("reconcile reports only captured payments as settled", async () => {
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes("/leads")) return { ok: true, status: 200, json: async () => ({}) };
    if (u.includes("/orders?")) {
      return {
        ok: true, status: 200,
        text: async () => JSON.stringify({
          items: [
            { id: "order_paid", status: "paid", amount: 500000, notes: { invoiceId: "inv-1", orgId: "acme" } },
            { id: "order_created", status: "created", amount: 900000, notes: { invoiceId: "inv-2" } },
            { id: "order_nonotes", status: "paid", amount: 100, notes: {} },
          ],
        }),
      };
    }
    if (u.includes("/payments")) {
      return {
        ok: true, status: 200,
        text: async () => JSON.stringify({
          items: [{ id: "pay_1", status: "captured", method: "upi", created_at: 1750000000 }],
        }),
      };
    }
    throw new Error("unstubbed " + u);
  };

  const res = mockRes();
  await reconcile({ method: "GET", headers: { authorization: "Bearer admin" }, query: {} }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.settled.length, 1);
  assert.equal(res.body.settled[0].invoiceId, "inv-1");
  assert.equal(res.body.settled[0].amount, 5000);
  // An order with no invoiceId note is skipped entirely rather than guessed at.
  assert.equal(res.body.unsettled.length, 1);
  assert.equal(res.body.unsettled[0].invoiceId, "inv-2");
});

test("the reconcile window is stated, so an empty result is not read as proof", async () => {
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes("/leads")) return { ok: true, status: 200, json: async () => ({}) };
    return { ok: true, status: 200, text: async () => JSON.stringify({ items: [] }) };
  };
  const res = mockRes();
  await reconcile({ method: "GET", headers: { authorization: "Bearer admin" }, query: {} }, res);
  assert.equal(res.body.settled.length, 0);
  assert.match(res.body.note, /last 60 days/);
  assert.match(res.body.note, /not absent/);
});

/* ── configuration ────────────────────────────────────────────── */

test("with no keys configured, every endpoint says so instead of failing oddly", async () => {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  delete process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_SECRET;
  try {
    for (const [name, fn, method] of [
      ["create-order", createOrder, "POST"],
      ["verify", verify, "POST"],
      ["reconcile", reconcile, "GET"],
    ]) {
      const res = mockRes();
      await fn({ method, headers: {}, body: {}, query: {} }, res);
      assert.equal(res.statusCode, 503, `${name} returns 503`);
      assert.equal(res.body.error, "payments_not_configured");
    }
  } finally {
    process.env.RAZORPAY_KEY_ID = id;
    process.env.RAZORPAY_KEY_SECRET = secret;
  }
});

test("no response body ever contains the key secret", async () => {
  route("firestore.googleapis.com", fsDoc({ orgId: "a", amount: 5000, status: "due" }));
  route("api.razorpay.com/v1/orders", { id: "o", amount: 500000, currency: "INR" });
  const res = mockRes();
  await createOrder(
    { method: "POST", headers: { authorization: "Bearer t" }, body: { invoiceId: "i" } },
    res
  );
  const serialised = JSON.stringify(res.body);
  assert.ok(!serialised.includes(SECRET), "the secret must never be serialised into a response");
  assert.ok(serialised.includes(KEY_ID), "the key id is public and IS returned, for Checkout");
});
