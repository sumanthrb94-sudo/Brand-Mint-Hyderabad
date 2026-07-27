/**
 * Razorpay, over plain HTTPS. No SDK, no npm, no package.json.
 *
 * This repo has zero runtime dependencies and must keep it that way — Vercel
 * serves it as static files with no build step (CLAUDE.md §3). Razorpay's REST
 * API is Basic auth over HTTPS and its signatures are HMAC-SHA256, both of
 * which Node gives us for free. Pulling in the `razorpay` package would buy
 * convenience and cost the property that makes this site deployable in one
 * step forever.
 *
 * SECRETS
 * -------
 * RAZORPAY_KEY_ID     — also safe in the browser; it identifies, it does not authorise
 * RAZORPAY_KEY_SECRET — server only. Never logged, never returned, never in a VITE_/public var.
 *
 * Nothing in this file prints a secret, and nothing returns a raw Razorpay
 * response to the caller — responses can echo request fields, and an
 * error dump is a classic way for a key to end up in a log aggregator.
 */

const crypto = require("node:crypto");

const API = "https://api.razorpay.com/v1";

function configured() {
  return Boolean(
    process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      process.env.RAZORPAY_KEY_ID.trim() &&
      process.env.RAZORPAY_KEY_SECRET.trim()
  );
}

function authHeader() {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error("payments_not_configured");
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

/**
 * One call to Razorpay. Throws a plain Error carrying only Razorpay's own
 * error code — never the body, which can contain request echoes.
 */
async function call(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: authHeader(),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });

  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON error page */ }

  if (!res.ok) {
    const code = json && json.error && json.error.code ? json.error.code : `http_${res.status}`;
    const err = new Error(`razorpay_${String(code).toLowerCase()}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

/**
 * Creates an order for an amount the SERVER determined.
 *
 * `amountPaise` must never come from the browser. Razorpay works in paise, so
 * a rupee/paise mix-up is a factor of 100 in the wrong direction — the callers
 * convert once, here, and nowhere else.
 */
async function createOrder({ amountRupees, receipt, notes }) {
  const amount = Math.round(Number(amountRupees) * 100);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("invalid_amount");
  return call("/orders", {
    method: "POST",
    body: {
      amount,
      currency: "INR",
      receipt: String(receipt).slice(0, 40),
      notes: notes || {},
      payment_capture: 1,
    },
  });
}

async function getOrder(orderId) {
  return call(`/orders/${encodeURIComponent(orderId)}`);
}

async function getPayment(paymentId) {
  return call(`/payments/${encodeURIComponent(paymentId)}`);
}

/** Every payment against an order. Used to confirm one was actually captured. */
async function getOrderPayments(orderId) {
  const res = await call(`/orders/${encodeURIComponent(orderId)}/payments`);
  return (res && res.items) || [];
}

/**
 * One page of orders created since `from` (unix seconds).
 * `count` is capped at 100 by Razorpay; asking for more is silently truncated,
 * so the caller paginates rather than trusting a single large request.
 */
async function listOrders({ from, skip = 0, count = 100 }) {
  const qs = new URLSearchParams({
    count: String(Math.min(100, count)),
    skip: String(skip),
    from: String(from),
  });
  const res = await call(`/orders?${qs.toString()}`);
  return (res && res.items) || [];
}

/**
 * The checkout handshake signature:
 *   HMAC_SHA256(order_id + "|" + payment_id, key_secret) === razorpay_signature
 *
 * Timing-safe, because a plain === leaks the correct prefix one byte at a time
 * to anyone willing to measure. This is the check that decides whether money
 * arrived, so it is the one place where "probably fine" is not fine.
 */
function verifyCheckoutSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");
  return timingSafeEqualHex(expected, razorpay_signature);
}

function timingSafeEqualHex(a, b) {
  try {
    const ba = Buffer.from(String(a), "hex");
    const bb = Buffer.from(String(b), "hex");
    if (ba.length !== bb.length || ba.length === 0) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

module.exports = {
  configured,
  createOrder,
  getOrder,
  getPayment,
  getOrderPayments,
  listOrders,
  verifyCheckoutSignature,
  timingSafeEqualHex,
};
