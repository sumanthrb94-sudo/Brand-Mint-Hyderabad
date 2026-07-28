/**
 * The agreed scope — derived progress and derived money.
 *
 *   node --test tests/scope.test.mjs
 *
 * The scope is the quotation, kept alive on the project. Its whole value is
 * that two numbers stop being typed from memory: how far along the work is,
 * and how much of what was sold has actually been accepted. A number typed
 * from memory is a number that flatters, and a dashboard that flatters is
 * worse than none.
 *
 * So the arithmetic has to be right, and two properties matter more than the
 * rest:
 *
 *   - an unscoped project reports NOTHING, not 0%. Zero draws an empty bar
 *     that reads as "started, nothing done"; a project nobody has scoped has
 *     not stalled, it has not been scoped.
 *   - money follows acceptance, not effort. A line half-built has earned
 *     nothing, and counting it would be the same mistake as counting a
 *     proposal as revenue.
 *
 * These exercise the SHIPPED source rather than a copy of it: the two pure
 * functions are lifted out of assets/bm-app.js by text and evaluated. If
 * either is renamed or removed, extraction fails and this suite goes red —
 * which is the point. bm-app.js itself cannot be imported here because it
 * pulls the Firebase SDK from gstatic at module scope.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SRC = fs.readFileSync(
  path.join(path.resolve(import.meta.dirname, ".."), "assets/bm-app.js"),
  "utf8"
);

/** Pull one top-level `export function name(...) { ... }` out by brace balance. */
function lift(name) {
  const start = SRC.indexOf(`export function ${name}(`);
  assert.notEqual(start, -1, `${name} is gone from bm-app.js`);
  let i = SRC.indexOf("{", start);
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

const mod = await import(
  "data:text/javascript," + encodeURIComponent([lift("scopeProgress"), lift("scopeValue")].join("\n"))
);
const { scopeProgress, scopeValue } = mod;

const line = (status, days, amount) => ({ status, days, amount });

/* ── progress ─────────────────────────────────────────────────── */

test("no scope reports null, never 0", () => {
  // The rule that has already cost two review rounds: empty is not done, and
  // it is not started-and-stalled either.
  assert.equal(scopeProgress([]), null);
  assert.equal(scopeProgress(null), null);
  assert.equal(scopeProgress(undefined), null);
});

test("everything agreed and nothing begun is 0%, which is a different fact", () => {
  // Zero IS the honest answer once lines exist — the work is scoped and
  // untouched. Only the absence of scope is null.
  assert.equal(scopeProgress([line("agreed", 3, 1000), line("agreed", 1, 500)]), 0);
});

test("everything accepted is 100%", () => {
  assert.equal(scopeProgress([line("accepted", 3, 1000), line("accepted", 1, 500)]), 100);
});

test("progress is weighted by build days, not by line count", () => {
  // A 9-day line and a 1-day line are not each half the job. Counting lines
  // would let one trivial item report a project as 50% done.
  const byLines = [line("accepted", 1, 0), line("agreed", 9, 0)];
  assert.equal(scopeProgress(byLines), 10);
});

test("a line with no day estimate still counts, as one day", () => {
  // Otherwise an unestimated line is invisible to progress, and a project
  // made entirely of them would divide by zero.
  assert.equal(scopeProgress([line("accepted", 0, 0), line("agreed", 0, 0)]), 50);
  assert.equal(scopeProgress([line("agreed", 0, 0)]), 0);
});

test("in-flight states earn partial credit, and less than acceptance", () => {
  const at = (s) => scopeProgress([line(s, 1, 0)]);
  assert.equal(at("agreed"), 0);
  assert.equal(at("building"), 50);
  assert.equal(at("delivered"), 90);
  assert.equal(at("accepted"), 100);
  // Delivered is deliberately short of 100: handed over is not confirmed, and
  // the gap is the client's review round.
  assert.ok(at("delivered") < at("accepted"));
});

test("an unknown status earns nothing rather than crashing the bar", () => {
  assert.equal(scopeProgress([line("something-new", 1, 0), line("accepted", 1, 0)]), 50);
});

/* ── money ────────────────────────────────────────────────────── */

test("agreed value is every line; accepted value is only accepted ones", () => {
  const lines = [
    line("accepted", 2, 40000),
    line("delivered", 3, 25000),
    line("building", 1, 10000),
    line("agreed", 1, 5000),
  ];
  const v = scopeValue(lines);
  assert.equal(v.agreed, 80000);
  assert.equal(v.accepted, 40000);
  assert.equal(v.outstanding, 40000);
});

test("delivered is not earned — money follows acceptance, not effort", () => {
  // Same mistake as counting a proposal as revenue, one step further along.
  const v = scopeValue([line("delivered", 5, 100000)]);
  assert.equal(v.accepted, 0);
  assert.equal(v.outstanding, 100000);
});

test("an empty scope is worth nothing, and says so without dividing by zero", () => {
  const v = scopeValue([]);
  assert.deepEqual(v, { agreed: 0, accepted: 0, outstanding: 0 });
});

test("a missing or unparseable amount counts as zero, not NaN", () => {
  // A NaN here would print "₹NaN" on the studio dashboard, which is worse
  // than a wrong number because it looks like the page is broken.
  const v = scopeValue([line("accepted", 1, undefined), line("accepted", 1, "40000")]);
  assert.equal(v.agreed, 40000);
  assert.equal(v.accepted, 40000);
  assert.ok(Number.isFinite(v.outstanding));
});

/* ── the statuses themselves ──────────────────────────────────── */

test("the status ladder is ordered agreed → building → delivered → accepted", () => {
  // /studio advances a line by index, so the declared order IS the workflow.
  // Reordering this list silently reorders the workflow.
  const ids = [...SRC.matchAll(/\{ id: "(agreed|building|delivered|accepted)", label:/g)].map((m) => m[1]);
  assert.deepEqual(ids, ["agreed", "building", "delivered", "accepted"]);
});

test("saveScope is idempotent by feature id, so re-saving cannot reset a delivered line", () => {
  // The intake bug, one collection over: re-saving after scope grows must add
  // the new lines and leave existing ones exactly as they are.
  assert.match(SRC, /export async function saveScope\(/);
  assert.match(
    SRC,
    /const id = String\(line\.featureId \|\| `line-\$\{i\}`\);/,
    "scope lines no longer use a deterministic id — duplicates and status resets are back"
  );
  assert.match(SRC, /if \(existing\.has\(id\)\) \{ skipped \+= 1; return; \}/);
});

test("setScopeLineStatus refuses a status that is not on the ladder", () => {
  assert.match(SRC, /if \(!SCOPE_STATUS_IDS\.includes\(status\)\) throw new Error/);
});
