/**
 * WHERE A CLIENT IS IN THE FLOW, AND THE BRAND KIT.
 *
 *   node --test tests/flow.test.mjs
 *
 * The report these exist for was, verbatim: "I don't understand the flow how
 * to add leads scope and give a agreement sign and get paid". Every one of
 * those steps already worked. What did not exist was anything on screen that
 * said which step you were on — so clientStage() derives it from records that
 * are already written rather than adding a field somebody has to maintain.
 *
 * That derivation is the whole risk. A stage strip is read as fact, so a wrong
 * stage is worse than no stage: it would tell the studio to raise a balance
 * invoice for work that has not been delivered, or say a client is settled
 * while money is outstanding. These assert the transitions and, more
 * importantly, the ones that must NOT happen.
 *
 * Lifted from the shipped source by text, same as scope.test.mjs and for the
 * same reason: bm-app.js pulls the Firebase SDK at module scope and cannot be
 * imported offline. Rename a function and extraction fails, which is intended.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SRC = fs.readFileSync(
  path.join(path.resolve(import.meta.dirname, ".."), "assets/bm-app.js"),
  "utf8"
);

/** Pull one top-level function out by brace balance. Handles `export function`
 *  and plain `function`, because cleanHex is a private helper the exported
 *  ones depend on. */
function lift(name) {
  let start = SRC.indexOf(`export function ${name}(`);
  if (start === -1) start = SRC.indexOf(`\nfunction ${name}(`);
  assert.notEqual(start, -1, `${name} is gone from bm-app.js`);

  /* Skip the PARAMETER LIST by paren balance before looking for the body.
     clientStage's signature is `(org, { projects = [], ... } = {})`, so the
     first `{` after the name belongs to a destructuring pattern, not to the
     function. Taking it as the body lifts a fragment that will not parse.
     income.test.mjs hit exactly this and fixed it exactly this way. */
  let i = SRC.indexOf("(", start);
  let parens = 0;
  for (; i < SRC.length; i += 1) {
    if (SRC[i] === "(") parens += 1;
    else if (SRC[i] === ")") {
      parens -= 1;
      if (parens === 0) { i += 1; break; }
    }
  }

  i = SRC.indexOf("{", i);
  let depth = 0;
  for (; i < SRC.length; i += 1) {
    if (SRC[i] === "{") depth += 1;
    else if (SRC[i] === "}") {
      depth -= 1;
      if (depth === 0) return SRC.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced braces lifting ${name}`);
}

/** CLIENT_STAGES is a const array, not a function — lifted to its closing
 *  bracket so the suite fails if a stage is added without a test. */
function liftStages() {
  const start = SRC.indexOf("export const CLIENT_STAGES");
  assert.notEqual(start, -1, "CLIENT_STAGES is gone from bm-app.js");
  const end = SRC.indexOf("];", start);
  return SRC.slice(start, end + 2);
}

const mod = await import(
  "data:text/javascript," +
    encodeURIComponent(
      [
        liftStages(),
        lift("invoiceReceived"),
        lift("clientStage"),
        lift("cleanHex"),
        lift("parseBrandColors"),
        lift("brandKit"),
      ].join("\n")
    )
);
const { CLIENT_STAGES, clientStage, parseBrandColors, brandKit } = mod;

const inv = (amount, paidAmount, status = "due") => ({ amount, paidAmount, status });
const line = (status) => ({ status, days: 1, amount: 1000 });

/* ── the stages themselves ────────────────────────────────────── */

test("every stage has a key and a label, and the order is the real order", () => {
  assert.equal(CLIENT_STAGES.length, 7);
  assert.deepEqual(
    CLIENT_STAGES.map((s) => s.key),
    ["new", "quoted", "signed", "deposit", "building", "delivered", "settled"]
  );
  for (const s of CLIENT_STAGES) {
    assert.ok(s.key && s.label, `${JSON.stringify(s)} is missing a key or label`);
  }
});

/* ── the derivation ───────────────────────────────────────────── */

test("a client with nothing on them is New, and is told to start an engagement", () => {
  const s = clientStage({}, {});
  assert.equal(s.key, "new");
  assert.match(s.next, /Start an engagement/);
});

test("scope saved moves them to Scope agreed", () => {
  const s = clientStage({}, { scope: [line("agreed")] });
  assert.equal(s.key, "quoted");
});

test("an unloaded scope is NOT reported as an unscoped project", () => {
  // scope: null means "not read yet". Treating it as "no scope" would tell the
  // studio to go and quote a client who was quoted months ago. §4, applied to
  // a lazy read: empty and unknown are different facts.
  const s = clientStage({ agreementSignedAt: {} }, { scope: null });
  assert.equal(s.scopeKnown, false);
  assert.equal(s.key, "signed", "an unread scope must not drag the stage backwards");
});

test("agreementSignedAt moves them to Agreement signed", () => {
  const s = clientStage({ agreementSignedAt: {} }, { scope: [line("agreed")] });
  assert.equal(s.key, "signed");
  assert.match(s.next, /deposit invoice/i);
});

test("a signed retainer counts as a signed agreement, because it is one", () => {
  const s = clientStage({ retainerStatus: "signed" }, {});
  assert.equal(s.key, "signed");
});

test("A PROPOSED RETAINER DOES NOT — it is not signed and never counts", () => {
  // The rule that governs every number in this product: no proposal is ever
  // treated as a commitment. A proposed retainer lighting "Agreement signed"
  // would be that mistake wearing a progress bar.
  assert.equal(clientStage({ retainerStatus: "proposed" }, {}).key, "new");
  assert.equal(clientStage({ retainerStatus: "none" }, {}).key, "new");
});

test("money actually received moves them to Deposit received", () => {
  const s = clientStage(
    { agreementSignedAt: {} },
    { scope: [line("agreed")], invoices: [inv(100000, 50000)] }
  );
  assert.equal(s.key, "deposit");
});

test("an invoice merely RAISED does not — only money that arrived counts", () => {
  const s = clientStage(
    { agreementSignedAt: {} },
    { scope: [line("agreed")], invoices: [inv(100000, 0)] }
  );
  assert.equal(s.key, "signed", "raising an invoice is not being paid");
});

test("a scope line moving off agreed puts them In build", () => {
  const s = clientStage(
    { agreementSignedAt: {} },
    { scope: [line("building"), line("agreed")], invoices: [inv(100000, 50000)] }
  );
  assert.equal(s.key, "building");
});

test("every line delivered is Delivered, and asks for the balance invoice", () => {
  const s = clientStage(
    { agreementSignedAt: {} },
    { scope: [line("delivered"), line("accepted")], invoices: [inv(100000, 50000)] }
  );
  assert.equal(s.key, "delivered");
  assert.match(s.next, /balance invoice/i);
});

test("SOME lines delivered is not Delivered", () => {
  const s = clientStage(
    { agreementSignedAt: {} },
    { scope: [line("delivered"), line("building")], invoices: [inv(100000, 50000)] }
  );
  assert.equal(s.key, "building");
});

test("Settled needs the work delivered AND the money all in", () => {
  const full = { scope: [line("accepted")], invoices: [inv(100000, 100000, "paid")] };
  assert.equal(clientStage({ agreementSignedAt: {} }, full).key, "settled");
  assert.equal(clientStage({ agreementSignedAt: {} }, full).next, null);
});

test("paid in full but not delivered is NOT settled", () => {
  const s = clientStage(
    { agreementSignedAt: {} },
    { scope: [line("building")], invoices: [inv(100000, 100000, "paid")] }
  );
  assert.notEqual(s.key, "settled");
});

test("delivered but still owed money is NOT settled", () => {
  const s = clientStage(
    { agreementSignedAt: {} },
    { scope: [line("accepted")], invoices: [inv(100000, 40000)] }
  );
  assert.equal(s.key, "delivered");
});

test("no invoices at all is never settled — empty is not paid", () => {
  const s = clientStage({ agreementSignedAt: {} }, { scope: [line("accepted")], invoices: [] });
  assert.notEqual(s.key, "settled");
});

test("an old invoice with no paidAmount is read from its status, not as zero", () => {
  // Every invoice written before part payments existed has no paidAmount. If
  // that read as 0 the stage would walk backwards for every historic client.
  const s = clientStage(
    { agreementSignedAt: {} },
    { scope: [line("accepted")], invoices: [{ amount: 100000, status: "paid" }] }
  );
  assert.equal(s.key, "settled");
});

test("index and label agree with the key, so the strip cannot light the wrong pip", () => {
  for (const stage of CLIENT_STAGES) {
    const s = { key: stage.key };
    const i = CLIENT_STAGES.findIndex((x) => x.key === s.key);
    assert.equal(CLIENT_STAGES[i].label, stage.label);
  }
  const s = clientStage({}, {});
  assert.equal(CLIENT_STAGES[s.index].key, s.key);
  assert.equal(CLIENT_STAGES[s.index].label, s.label);
  assert.equal(s.total, CLIENT_STAGES.length);
});

/* ── the brand kit ────────────────────────────────────────────── */

test("nothing set returns null, so the portal omits the block entirely", () => {
  // Same rule as studioPayee(): a labelled empty row on a client-facing screen
  // reads as a mistake rather than as an absence.
  assert.equal(brandKit(null), null);
  assert.equal(brandKit({}), null);
  assert.equal(brandKit({ brandColors: [], brandFonts: "  " }), null);
});

test("one real value is enough to render the block", () => {
  assert.deepEqual(brandKit({ brandFonts: "Inter" }).fonts, "Inter");
  assert.equal(brandKit({ brandColors: ["#10b981"] }).colors.length, 1);
});

test("colours are parsed from whatever was typed, and normalised", () => {
  assert.deepEqual(parseBrandColors("#10B981, 0b1f1a  #FBFAF2"), ["#10b981", "#0b1f1a", "#fbfaf2"]);
  assert.deepEqual(parseBrandColors(["#ABC"]), ["#abc"]);
});

test("anything that is not a colour is DROPPED, not stored", () => {
  // A swatch is painted as a background. A junk value there paints nothing and
  // reads as a missing colour rather than a bad one, so it never gets in.
  assert.deepEqual(parseBrandColors("red, #zzzzzz, javascript:alert(1), #10b981"), ["#10b981"]);
  assert.deepEqual(parseBrandColors("nonsense"), []);
});

test("duplicates collapse and the list is capped", () => {
  assert.deepEqual(parseBrandColors("#10b981 #10B981"), ["#10b981"]);
  assert.equal(parseBrandColors(Array.from({ length: 30 }, (_, i) => `#${String(i).padStart(6, "0")}`)).length, 8);
});

/* ── the weekly update, and WhatsApp ──────────────────────────── */

const upd = await import(
  "data:text/javascript," +
    encodeURIComponent([lift("waNumber"), lift("waLink"), lift("updateMessage"), lift("updatableProjects")].join("\n"))
);
const { waNumber, waLink, updateMessage, updatableProjects } = upd;

test("a bare 10-digit number is treated as Indian", () => {
  assert.equal(waNumber("9876543210"), "919876543210");
  assert.equal(waNumber("98765 43210"), "919876543210");
  assert.equal(waNumber("+91 98765 43210"), "919876543210");
});

test("a number that cannot be used returns null rather than a guess", () => {
  // A wa.me link built from a malformed number opens a chat with a STRANGER,
  // and the message is a client's project update. Refusing is the only safe
  // failure here.
  assert.equal(waNumber(""), null);
  assert.equal(waNumber("12345"), null);
  assert.equal(waNumber("abcd"), null);
  assert.equal(waLink("12345", "hello"), null);
});

test("the link is a wa.me URL with the message encoded into it", () => {
  const l = waLink("9876543210", "Hi — update on Site: shipped.");
  assert.match(l, /^https:\/\/wa\.me\/919876543210\?text=/);
  assert.ok(l.includes(encodeURIComponent("shipped")));
  assert.ok(!l.includes(" "), "an unencoded space would truncate the message");
});

test("the message names the project and carries the update verbatim", () => {
  const m = updateMessage({ clientName: "Asha", projectName: "Green Basket", text: "Homepage is live." });
  assert.ok(m.includes("Asha"));
  assert.ok(m.includes("Green Basket"));
  assert.ok(m.includes("Homepage is live."));
});

test("it states open blockers, because an update that ends in a request gets an answer", () => {
  assert.match(updateMessage({ projectName: "X", text: "y", blockers: 1 }), /1 thing open on your side/);
  assert.match(updateMessage({ projectName: "X", text: "y", blockers: 3 }), /3 things open on your side/);
  assert.ok(!/open on your side/.test(updateMessage({ projectName: "X", text: "y", blockers: 0 })));
});

test("archived clients and archived projects are not updatable", () => {
  const orgs = [
    { id: "a", kind: "client", status: "active" },
    { id: "b", kind: "client", status: "archived" },
    { id: "s", kind: "studio", status: "active" },
  ];
  const projects = [
    { id: "1", orgId: "a" },
    { id: "2", orgId: "b" },
    { id: "3", orgId: "a", status: "archived" },
    { id: "4", orgId: "s" },
  ];
  assert.deepEqual(updatableProjects(projects, orgs).map((p) => p.id), ["1"]);
});

test("a project with nothing set up is still updatable — it is the likeliest to need one", () => {
  const out = updatableProjects([{ id: "1", orgId: "a" }], [{ id: "a", kind: "client", status: "active" }]);
  assert.equal(out.length, 1);
});
