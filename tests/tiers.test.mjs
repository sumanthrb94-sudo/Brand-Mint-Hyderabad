/**
 * The offer: three tiers, three care plans, three add-ons.
 *
 *   node --test tests/tiers.test.mjs
 *
 * WHAT THIS IS FOR
 * ----------------
 * Brand Mint used to publish seven service lines whose prices were DERIVED —
 * days × day rate × a scale multiplier — and the result was that the same
 * store had two prices depending on which screen produced it: /services said a
 * website started at ₹2,00,000 while /quote would assemble one for ₹40,000.
 *
 * Tiers exist to make that impossible: one price, one length, written once.
 * So the thing worth testing is not arithmetic, it is that the published
 * numbers stay published and that nothing quietly starts computing them again.
 *
 * The expected values are RESTATED here rather than imported. A test that
 * imported the number it is checking would assert only that a constant equals
 * itself. Restating means a price change fails this suite, which is correct: a
 * price change is a business decision that should require someone to look at
 * it in two places, not a one-character edit that slips through review.
 *
 * Same extraction trick as tests/income.test.mjs — bm-app.js pulls the
 * Firebase SDK from gstatic at module scope and cannot be imported in node, so
 * the shipped data and functions are lifted out by text.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = fs.readFileSync(path.join(ROOT, "assets/bm-app.js"), "utf8");

/** Lift `export const NAME = <literal>;` by bracket balance. */
function liftConst(name) {
  const start = SRC.indexOf(`export const ${name} = `);
  assert.notEqual(start, -1, `${name} is gone from bm-app.js`);
  const open = SRC.indexOf("=", start) + 1;
  let i = open;
  while (/\s/.test(SRC[i])) i += 1;
  const opener = SRC[i];
  if (opener !== "[" && opener !== "{") {
    const end = SRC.indexOf(";", i);
    return SRC.slice(start, end + 1);
  }
  const closer = opener === "[" ? "]" : "}";
  let depth = 0;
  let inStr = null;
  for (; i < SRC.length; i += 1) {
    const ch = SRC[i];
    if (inStr) {
      if (ch === "\\") i += 1;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; continue; }
    if (ch === opener) depth += 1;
    else if (ch === closer) {
      depth -= 1;
      if (depth === 0) return SRC.slice(start, i + 1) + ";";
    }
  }
  throw new Error(`unbalanced brackets lifting ${name}`);
}

/** Lift `export function name(...) {...}`, skipping the parameter list by
 *  paren balance first — see the note in tests/income.test.mjs. */
function liftFn(name) {
  const start = SRC.indexOf(`export function ${name}(`);
  assert.notEqual(start, -1, `${name} is gone from bm-app.js`);
  let i = SRC.indexOf("(", start);
  let parens = 0;
  for (; i < SRC.length; i += 1) {
    if (SRC[i] === "(") parens += 1;
    else if (SRC[i] === ")") { parens -= 1; if (parens === 0) { i += 1; break; } }
  }
  let depth = 0;
  for (i = SRC.indexOf("{", i); i < SRC.length; i += 1) {
    if (SRC[i] === "{") depth += 1;
    else if (SRC[i] === "}") { depth -= 1; if (depth === 0) return SRC.slice(start, i + 1); }
  }
  throw new Error(`unbalanced braces lifting ${name}`);
}

const mod = await import(
  "data:text/javascript," +
    encodeURIComponent(
      [
        liftConst("DAY_RATE"),
        liftConst("TIERS"),
        liftConst("CARE_PLANS"),
        liftConst("CARE_NOTICE_DAYS"),
        liftConst("ADD_ONS"),
        liftConst("CLIENT_PROVIDES"),
        liftConst("NOT_INCLUDED"),
        liftConst("RETIRED_SERVICE_TYPES"),
        liftConst("MILESTONE_TEMPLATES"),
        liftConst("SCOPE_TERMS"),
        liftFn("tier"),
        liftFn("tierIncludes"),
        liftFn("carePlan"),
        liftFn("carePlanIncludes"),
        liftFn("addOn"),
        liftFn("addOnDays"),
        // isGstin closes over a module-level regex that is not exported, so
        // the constant has to travel with it or the function throws.
        (SRC.match(/^const GSTIN_RE = .*$/m) || [])[0],
        liftFn("isGstin"),
        liftFn("warrantyDaysFor"),
        liftFn("isRetiredType"),
        // SERVICE_TYPES is derived from TIERS in the source; rebuild it the
        // same way so the derivation itself is under test.
        `export const SERVICE_TYPES = TIERS.map((t) => ({ id: t.id, label: t.label, priceFloor: t.price, recurring: false }));`,
      ].join("\n")
    )
);

const {
  DAY_RATE, TIERS, CARE_PLANS, CARE_NOTICE_DAYS, ADD_ONS, CLIENT_PROVIDES,
  NOT_INCLUDED, RETIRED_SERVICE_TYPES, MILESTONE_TEMPLATES, SCOPE_TERMS,
  SERVICE_TYPES, tier, tierIncludes, carePlan, carePlanIncludes, addOn,
  addOnDays, isGstin, warrantyDaysFor, isRetiredType,
} = mod;

/* ── the published numbers ──────────────────────────────────────── */

const PUBLISHED = [
  { id: "starter",  label: "Starter Store",  price: 99000,  weeks: 8,  warrantyDays: 30 },
  { id: "growth",   label: "Growth Store",   price: 200000, weeks: 12, warrantyDays: 30 },
  { id: "commerce", label: "Commerce Store", price: 300000, weeks: 12, warrantyDays: 60 },
];

test("the three tiers are exactly what the services document publishes", () => {
  assert.equal(TIERS.length, 3, "there are three tiers and no more");
  PUBLISHED.forEach((want) => {
    const got = tier(want.id);
    assert.ok(got, `${want.id} exists`);
    assert.equal(got.label, want.label);
    assert.equal(got.price, want.price, `${want.id} price`);
    assert.equal(got.weeks, want.weeks, `${want.id} weeks`);
    assert.equal(got.warrantyDays, want.warrantyDays, `${want.id} warranty`);
  });
});

test("a tier's price is a FIXED number, never derived from days", () => {
  // The old model multiplied days by a rate by a scale multiplier, which is
  // exactly how two screens ended up disagreeing. If a tier ever gains a
  // buildDays/scale field, the derivation has come back.
  TIERS.forEach((t) => {
    assert.equal(typeof t.price, "number");
    assert.ok(t.price > 0);
    assert.equal(t.buildDays, undefined, `${t.id} must not carry buildDays`);
    assert.equal(t.scale, undefined, `${t.id} must not carry a scale`);
    assert.equal(t.priceFloor, undefined, `${t.id} is a price, not a floor`);
  });
});

test("Commerce is the only tier whose length is open-ended, and it says so", () => {
  assert.ok(tier("commerce").weeksNote, "Commerce carries the 12+ note");
  assert.equal(tier("starter").weeksNote, undefined);
  assert.equal(tier("growth").weeksNote, undefined);
  // `weeks` still carries the FLOOR of 12 rather than an invented 13, so
  // nothing schedules against a number nobody published.
  assert.equal(tier("commerce").weeks, 12);
});

test("warranty is read from the tier, not from the standing term", () => {
  assert.equal(warrantyDaysFor("starter"), 30);
  assert.equal(warrantyDaysFor("growth"), 30);
  assert.equal(warrantyDaysFor("commerce"), 60, "Commerce is the 60-day one");
  // An engagement with no tier recorded falls back rather than guessing.
  assert.equal(warrantyDaysFor(null), SCOPE_TERMS.warrantyDays);
  assert.equal(warrantyDaysFor("site"), SCOPE_TERMS.warrantyDays, "a retired type falls back");
});

/* ── inheritance ────────────────────────────────────────────────── */

test("each tier includes everything the tier below it does", () => {
  const flat = (id) => tierIncludes(id).flatMap((g) => g.items);
  const starter = flat("starter");
  const growth = flat("growth");
  const commerce = flat("commerce");

  assert.ok(starter.length > 0, "Starter includes something");
  starter.forEach((item) => {
    assert.ok(growth.includes(item), `Growth must still include "${item}"`);
    assert.ok(commerce.includes(item), `Commerce must still include "${item}"`);
  });
  growth.forEach((item) => {
    assert.ok(commerce.includes(item), `Commerce must still include "${item}"`);
  });
  assert.ok(growth.length > starter.length, "Growth adds something");
  assert.ok(commerce.length > growth.length, "Commerce adds something");
});

test("groups with the same name merge instead of opening a second heading", () => {
  // Starter and Growth both add under "Admin". A reader should see one Admin
  // section, not two.
  const names = tierIncludes("growth").map((g) => g.group);
  assert.equal(new Set(names).size, names.length, `duplicate group headings: ${names.join(", ")}`);
});

test("the inclusion lists carry no prices — apportioning them would be fiction", () => {
  // Nobody agreed what share of ₹99,000 is "Checkout & Payments". A price on a
  // line item here would end up on a progress bar.
  TIERS.forEach((t) => {
    (t.adds || []).forEach((g) => {
      g.items.forEach((item) => {
        assert.equal(typeof item, "string", `${t.id}/${g.group} items must be plain strings`);
      });
    });
  });
});

/* ── care plans ─────────────────────────────────────────────────── */

test("the three care plans are what the services document publishes", () => {
  assert.equal(CARE_PLANS.length, 3);
  assert.equal(carePlan("care").monthly, 12500);
  assert.equal(carePlan("growth-care").monthly, 25000);
  assert.equal(carePlan("managed").monthly, 50000);
  assert.equal(CARE_NOTICE_DAYS, 30);
});

test("each care plan covers everything the plan below it does", () => {
  const care = carePlanIncludes("care");
  const growth = carePlanIncludes("growth-care");
  const managed = carePlanIncludes("managed");
  care.forEach((x) => assert.ok(growth.includes(x) && managed.includes(x), `"${x}" must survive upward`));
  growth.forEach((x) => assert.ok(managed.includes(x), `"${x}" must survive upward`));
  assert.ok(managed.length > growth.length && growth.length > care.length);
});

test("a care plan is a defined scope, never an hourly bucket", () => {
  // An hourly bucket would need a timesheet, and time tracking is on the
  // do-not-build list. So no plan may carry hours.
  CARE_PLANS.forEach((p) => {
    assert.equal(p.hours, undefined, `${p.id} must not carry hours`);
    assert.ok(Array.isArray(p.adds) && p.adds.length > 0, `${p.id} states what it covers`);
  });
});

/* ── add-ons ────────────────────────────────────────────────────── */

test("add-ons are published at the prices in the services document", () => {
  assert.equal(addOn("android").price, 50000);
  assert.equal(addOn("gateway").price, 25000);
  assert.equal(addOn("revision").price, 15000);
  assert.equal(ADD_ONS.length, 3);
});

test("an add-on's length is derived from the day rate, so the two cannot drift", () => {
  assert.equal(DAY_RATE, 10000, "the studio's own day rate");
  assert.equal(addOnDays(addOn("android")), 5, "₹50,000 at ₹10,000/day");
  assert.equal(addOnDays(addOn("gateway")), 3, "₹25,000 rounds to 3 days");
  assert.equal(addOnDays(addOn("revision")), 2, "₹15,000 rounds to 2 days");
});

test("every add-on has at least one day, so scopeProgress can weight it", () => {
  // A zero-day line would either count as none of the job or half of it,
  // depending on which way the weighting divides.
  ADD_ONS.forEach((a) => assert.ok(addOnDays(a) >= 1, `${a.id} must weigh something`));
});

test("the extra revision round costs what the standing terms say it costs", () => {
  assert.equal(addOn("revision").price, SCOPE_TERMS.extraReviewRoundPrice,
    "two places name this price and they must agree");
});

/* ── schedules ──────────────────────────────────────────────────── */

test("every tier has a milestone template — a tier without one stamps nothing", () => {
  // This is the failure the last run actually hit: a project typed with a
  // service that had no template silently got "a schedule was stamped
  // (0 milestones)".
  TIERS.forEach((t) => {
    const tpl = MILESTONE_TEMPLATES[t.id];
    assert.ok(Array.isArray(tpl) && tpl.length > 0, `${t.id} has a template`);
  });
});

test("a template never overruns the length its tier was sold on", () => {
  // A schedule longer than the quote puts an engagement into visible lateness
  // on the day it is created.
  TIERS.forEach((t) => {
    const last = Math.max(...MILESTONE_TEMPLATES[t.id].map((m) => m.offsetDays));
    assert.equal(last, t.weeks * 7, `${t.id}: last milestone lands on the quoted end date`);
  });
});

test("every template dates at least one milestone to the CLIENT", () => {
  // "The project is late" is worth nothing; "we have been waiting nine days
  // for their photos" is the entire product.
  TIERS.forEach((t) => {
    const owners = MILESTONE_TEMPLATES[t.id].map((m) => m.owner);
    assert.ok(owners.includes("client"), `${t.id} has a client-owned milestone`);
    assert.ok(owners.includes("us"), `${t.id} has studio-owned milestones`);
    owners.forEach((o) => assert.ok(o === "us" || o === "client", `${t.id}: bad owner "${o}"`));
  });
});

test("milestone offsets only ever move forward", () => {
  TIERS.forEach((t) => {
    const offs = MILESTONE_TEMPLATES[t.id].map((m) => m.offsetDays);
    const sorted = [...offs].sort((a, b) => a - b);
    assert.deepEqual(offs, sorted, `${t.id}: milestones are listed out of order`);
  });
});

/* ── what the client owes us ────────────────────────────────────── */

test("the client's own list is real, and every entry lands in a known group", () => {
  assert.ok(CLIENT_PROVIDES.length > 0);
  const groups = new Set(["assets", "content", "access", "decisions"]);
  CLIENT_PROVIDES.forEach((i) => {
    assert.ok(i.label && i.label.trim(), "every item is labelled");
    assert.ok(groups.has(i.group), `"${i.label}" has group "${i.group}", which the portal cannot render`);
  });
});

test("nothing we ask the client for is a credential", () => {
  // The one rule that is never negotiable: no field anywhere asks a client for
  // a password, key, secret or token. If one landed in this database, one
  // breach would become the client's breach.
  const banned = /\b(password|passcode|api key|secret|token|credential|login details)\b/i;
  CLIENT_PROVIDES.forEach((i) => {
    assert.ok(!banned.test(i.label), `"${i.label}" asks for a credential`);
  });
});

test("every access request asks the client to ADD US, never to send anything", () => {
  // The correct shape of an access request is "add hello@ as a user on your
  // own account". Anything else drifts towards asking for a login.
  CLIENT_PROVIDES.filter((i) => i.group === "access").forEach((i) => {
    assert.match(i.label, /hello@brandmintstudios\.in/,
      `"${i.label}" must name the account to add rather than ask for access another way`);
  });
});

test("the two things that actually stop a launch are on the list", () => {
  // Payment activation and domain control are outside the studio's reach, take
  // days of somebody else's KYC, and are the last thing anyone starts.
  const joined = CLIENT_PROVIDES.map((i) => i.label).join(" | ").toLowerCase();
  assert.match(joined, /razorpay/, "Razorpay activation must be raised with the client");
  assert.match(joined, /domain/, "domain access must be raised with the client");
  assert.ok(CLIENT_PROVIDES.some((i) => i.group === "access"),
    "at least one item is an access request");
});

test("the exclusions match what the services document excludes", () => {
  const joined = NOT_INCLUDED.join(" | ").toLowerCase();
  ["multi-vendor", "react native", "whatsapp", "multi-currency"].forEach((x) => {
    assert.ok(joined.includes(x), `"${x}" must stay on the excluded list`);
  });
});

/* ── retirement ─────────────────────────────────────────────────── */

test("the tiers are the service types, derived rather than written twice", () => {
  assert.deepEqual(SERVICE_TYPES.map((s) => s.id), TIERS.map((t) => t.id));
  SERVICE_TYPES.forEach((s) => assert.equal(s.priceFloor, tier(s.id).price));
});

test("every id the studio ever sold under still resolves to a name", () => {
  // project.type is stored on the document. Dropping an id would blank every
  // historic project's type and let the next save silently re-type it.
  ["site", "tool", "brand", "media", "seo", "ai", "internal"].forEach((id) => {
    assert.ok(isRetiredType(id), `${id} must stay resolvable`);
    assert.ok(RETIRED_SERVICE_TYPES.find((t) => t.id === id).label, `${id} has a label`);
  });
});

test("no retired id is also a live tier, and no live tier is marked retired", () => {
  TIERS.forEach((t) => assert.ok(!isRetiredType(t.id), `${t.id} is live, not retired`));
});

/* ── GST ────────────────────────────────────────────────────────── */

test("pricing states GST at 18%, which is what the client will owe", () => {
  assert.match(SCOPE_TERMS.gst, /18\s*%/);
  assert.equal(SCOPE_TERMS.gstRate, 0.18);
});

test("a GSTIN is only accepted in the shape a real one has", () => {
  assert.ok(isGstin("36AABCU9603R1ZM"), "a well-formed GSTIN passes");
  assert.ok(isGstin("29aabcu9603r1zm"), "case is normalised before checking");
  assert.ok(!isGstin(""), "empty is not a GSTIN");
  assert.ok(!isGstin(null), "null is not a GSTIN");
  assert.ok(!isGstin("36AABCU9603R1Z"), "14 characters is not a GSTIN");
  assert.ok(!isGstin("36AABCU9603R1ZMX"), "16 characters is not a GSTIN");
  assert.ok(!isGstin("ABCDE1234F1Z5XX"), "the leading state code must be numeric");
  assert.ok(!isGstin("36AABCU9603R1AM"), "the 14th character must be Z");
  assert.ok(!isGstin("in progress"), "prose is not a GSTIN");
});

test("the GSTIN is nowhere in the source — it is read from the database", () => {
  // This repository is public. A tax number here would be published
  // permanently, in the history, and there is no real one yet in any case.
  const files = ["assets/bm-app.js", "assets/bm-invoice.js", "studio.html", "portal.html", "index.html"];
  files.forEach((f) => {
    const text = fs.readFileSync(path.join(ROOT, f), "utf8");
    // Any 15-char GSTIN-shaped token that is not the documented example.
    // No exceptions, not even an example in a placeholder or a comment: an
    // example number is how a plausible one ends up copied into a real field.
    const found = text.match(/\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]\b/g) || [];
    assert.deepEqual(found, [], `${f} contains a GSTIN-shaped string: ${found.join(", ")}`);
  });
});

test("the invoice template never multiplies an amount by the GST rate", () => {
  // create-order.js charges invoice.amount and verify.js requires an exact
  // match, so printing amount × 1.18 would produce an invoice the client
  // cannot settle online. Making the tax arithmetic real means changing that
  // amount check in the same commit — not inferring it in the template.
  const inv = fs.readFileSync(path.join(ROOT, "assets/bm-invoice.js"), "utf8");
  assert.ok(!/\*\s*1\.18|\*\s*0\.18|gstRate|\/\s*1\.18/.test(inv),
    "bm-invoice.js has started computing GST — verify.js must change with it");
});
