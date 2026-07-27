/**
 * Intake identity and de-duplication.
 *
 *   node --test tests/intake.test.mjs
 *
 * The bug this exists to prevent, seen in production: pushing a quote's
 * requirements twice produced two complete sets of intake items, so the
 * client's "What we need from you" list showed the same request five times.
 *
 * That is not cosmetic. The list is the reason the portal exists — it is what
 * makes a client see, dated, that they are the holdup. A list that visibly
 * repeats itself reads as broken, and a client who decides it is broken
 * ignores all of it, including the items that really are blocking.
 *
 * These test the pure logic — id derivation and winner selection — extracted
 * from bm-app.js. The Firestore calls around them are not exercised here; the
 * rules tests cover who may write, and this covers what gets written.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SRC = fs.readFileSync(
  path.join(path.resolve(import.meta.dirname, ".."), "assets/bm-app.js"),
  "utf8"
);

/* ── the id derivation, lifted from source ────────────────────── */

function intakeIdFor(featureId, requirement) {
  const raw = `${featureId}--${requirement}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < raw.length; i += 1) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return `${slug || featureId}-${h.toString(36)}`;
}

test("the implementation still derives ids the way this test does", () => {
  // If bm-app.js stops using a deterministic id, every assertion below becomes
  // a test of a copy rather than of the product.
  assert.match(SRC, /function intakeIdFor\(/, "intakeIdFor is gone from bm-app.js");
  assert.match(
    SRC,
    /doc\(db, "projects", projectId, "intake", id\)/,
    "the push no longer writes to a deterministic id — duplicates are back"
  );
  assert.ok(
    !/batch\.set\(doc\(collection\(db, "projects", projectId, "intake"\)\)/.test(SRC),
    "the push is writing to an auto-generated id again, which is the original bug"
  );
});

test("the same requirement always gets the same id", () => {
  const a = intakeIdFor("cart-cod", "COD collection process confirmed");
  const b = intakeIdFor("cart-cod", "COD collection process confirmed");
  assert.equal(a, b);
});

test("different requirements on one feature get different ids", () => {
  const a = intakeIdFor("payments", "Razorpay account activated");
  const b = intakeIdFor("payments", "Business PAN and GSTIN for KYC");
  assert.notEqual(a, b);
});

test("the same requirement text under different features stays distinct", () => {
  // Several services legitimately ask for the same thing; they are separate
  // blockers and must not collapse into one.
  const a = intakeIdFor("instagram", "Add hello@brandmintstudios.in as a user");
  const b = intakeIdFor("analytics", "Add hello@brandmintstudios.in as a user");
  assert.notEqual(a, b);
});

test("very long requirements that slug identically still differ", () => {
  // Slugs truncate at 90 characters. Without the hash suffix these would
  // collide and one requirement would silently overwrite the other.
  const prefix = "x".repeat(120);
  const a = intakeIdFor("seo-schema", `${prefix} first`);
  const b = intakeIdFor("seo-schema", `${prefix} second`);
  assert.notEqual(a, b, "two long requirements collided into one id");
});

test("ids are legal Firestore document ids", () => {
  const samples = [
    intakeIdFor("gst-invoicing", "GSTIN, registered address & HSN/SAC codes"),
    intakeIdFor("whatsapp-notifications", "Add hello@brandmintstudios.in in Meta Business Suite"),
    intakeIdFor("catalog-bulk", "Product CSV — 50%+ rows filled"),
  ];
  for (const id of samples) {
    assert.ok(id.length > 0 && id.length <= 1500, `bad length: ${id}`);
    assert.ok(!id.includes("/"), `contains a slash: ${id}`);
    assert.ok(id !== "." && id !== "..", `reserved id: ${id}`);
    assert.ok(!/^__.*__$/.test(id), `reserved pattern: ${id}`);
  }
});

/* ── which duplicate survives ─────────────────────────────────── */

/** Mirrors the winner rule in dedupeIntake. */
function pickWinner(docs) {
  let current = null;
  for (const d of docs) {
    if (!current) { current = d; continue; }
    const currentDone = current.done === true;
    const candidateDone = d.done === true;
    const currentAt = current.raisedAt ?? Infinity;
    const candidateAt = d.raisedAt ?? Infinity;
    const candidateWins = candidateDone !== currentDone ? candidateDone : candidateAt < currentAt;
    if (candidateWins) current = d;
  }
  return current;
}

test("the oldest duplicate survives, so the blocker keeps its true age", () => {
  // Keeping the newest would reset a nine-day-old blocker to zero days, and
  // the age of a blocker is the whole mechanism that makes it move.
  const winner = pickWinner([
    { id: "new", raisedAt: 3000, done: false },
    { id: "old", raisedAt: 1000, done: false },
    { id: "mid", raisedAt: 2000, done: false },
  ]);
  assert.equal(winner.id, "old");
  assert.equal(winner.raisedAt, 1000);
});

test("a ticked duplicate beats an older unticked one", () => {
  // Losing the client's tick would make them do the work twice, which is
  // worse than losing a few days of age.
  const winner = pickWinner([
    { id: "old-open", raisedAt: 1000, done: false },
    { id: "new-done", raisedAt: 5000, done: true },
  ]);
  assert.equal(winner.id, "new-done");
});

test("between two ticked duplicates the older one still wins", () => {
  const winner = pickWinner([
    { id: "done-late", raisedAt: 5000, done: true },
    { id: "done-early", raisedAt: 1000, done: true },
  ]);
  assert.equal(winner.id, "done-early");
});

test("an item with no raisedAt never beats one that has a date", () => {
  // A missing timestamp sorts last rather than winning by accident.
  const winner = pickWinner([
    { id: "dated", raisedAt: 4000, done: false },
    { id: "undated", raisedAt: undefined, done: false },
  ]);
  assert.equal(winner.id, "dated");
});

/* ── the push is idempotent ───────────────────────────────────── */

/** Mirrors the loop in pushRequirementsToIntake. */
function simulatePush(features, existingIds) {
  const existing = new Set(existingIds);
  let added = 0;
  let skipped = 0;
  for (const f of features) {
    for (const requirement of f.requires) {
      const id = intakeIdFor(f.id, requirement);
      if (existing.has(id)) { skipped += 1; continue; }
      existing.add(id);
      added += 1;
    }
  }
  return { added, skipped, ids: [...existing] };
}

const FEATURES = [
  { id: "cart-cod", requires: ["COD process", "Delivery radius"] },
  { id: "payments", requires: ["Razorpay account activated"] },
];

test("a first push writes everything", () => {
  const r = simulatePush(FEATURES, []);
  assert.equal(r.added, 3);
  assert.equal(r.skipped, 0);
});

test("pushing the same scope twice adds nothing the second time", () => {
  const first = simulatePush(FEATURES, []);
  const second = simulatePush(FEATURES, first.ids);
  assert.equal(second.added, 0, "the second push created duplicates");
  assert.equal(second.skipped, 3);
});

test("pushing five times still leaves exactly one of each", () => {
  // The production symptom was the same request appearing five times.
  let ids = [];
  for (let i = 0; i < 5; i += 1) ids = simulatePush(FEATURES, ids).ids;
  assert.equal(ids.length, 3, `expected 3 unique items, got ${ids.length}`);
  assert.equal(new Set(ids).size, 3);
});

test("growing the scope adds only the new requirements", () => {
  const first = simulatePush(FEATURES, []);
  const grown = [...FEATURES, { id: "instagram", requires: ["Handle & access"] }];
  const second = simulatePush(grown, first.ids);
  assert.equal(second.added, 1, "should add only the new service's requirement");
  assert.equal(second.skipped, 3, "the original three should be left alone");
});

test("the same requirement listed twice in one push becomes one item", () => {
  const dupey = [{ id: "x", requires: ["Same thing", "Same thing"] }];
  const r = simulatePush(dupey, []);
  assert.equal(r.added, 1);
  assert.equal(r.skipped, 1);
});
