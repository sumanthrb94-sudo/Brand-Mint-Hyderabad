/**
 * What a month is actually worth.
 *
 *   node --test tests/income.test.mjs
 *
 * Brand Mint sells three ways — a one-off build, a build that becomes a
 * retainer, and a retainer with no build at all — and the dashboard was only
 * ever counting the third. Against a realistic month it reported ₹37,500
 * against a ₹1,00,000 break-even while two builds worth ₹10,00,000 were in
 * flight, which reads as a studio about to go under during its best quarter.
 *
 * A number that frightens is exactly as false as one that flatters, and this
 * suite exists because the FIRST attempt at the fix overshot in the other
 * direction: it summed each build's own run rate and reported ₹6,43,846 —
 * one person delivering sixty-eight working days of work inside a calendar
 * month. The blend is the property worth protecting, so it is the property
 * asserted hardest below.
 *
 * Same extraction trick as tests/scope.test.mjs: the shipped functions are
 * lifted out of assets/bm-app.js by text, because bm-app.js pulls the Firebase
 * SDK from gstatic at module scope and cannot be imported in node.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SRC = fs.readFileSync(
  path.join(path.resolve(import.meta.dirname, ".."), "assets/bm-app.js"),
  "utf8"
);

/**
 * Lift one `export function name(...) { ... }` out of the source by balance.
 *
 * The parameter list has to be skipped by PARENTHESIS balance before brace
 * counting starts. `monthlyIncome({ orgs, projects, ... })` destructures its
 * argument, so the first `{` in the declaration belongs to the parameter
 * pattern, not the body — counting from there closes the function at the end
 * of its own arguments and lifts a fragment that will not parse.
 * tests/scope.test.mjs never hit this because both functions it lifts take
 * plain positional arguments.
 */
function lift(name) {
  const start = SRC.indexOf(`export function ${name}(`);
  assert.notEqual(start, -1, `${name} is gone from bm-app.js`);

  let i = SRC.indexOf("(", start);
  let parens = 0;
  for (; i < SRC.length; i += 1) {
    if (SRC[i] === "(") parens += 1;
    else if (SRC[i] === ")") {
      parens -= 1;
      if (parens === 0) { i += 1; break; }
    }
  }

  let depth = 0;
  for (i = SRC.indexOf("{", i); i < SRC.length; i += 1) {
    if (SRC[i] === "{") depth += 1;
    else if (SRC[i] === "}") {
      depth -= 1;
      if (depth === 0) return SRC.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced braces lifting ${name}`);
}

const constMatch = /export const WORKING_DAYS_PER_MONTH = ([\d.]+);/.exec(SRC);
assert.ok(constMatch, "WORKING_DAYS_PER_MONTH is gone from bm-app.js");
const MONTH_DAYS = Number(constMatch[1]);

const mod = await import(
  "data:text/javascript," +
    encodeURIComponent(
      [
        `export const WORKING_DAYS_PER_MONTH = ${MONTH_DAYS};`,
        lift("projectMode"),
        lift("isLiveBuild"),
        lift("projectRunRate"),
        lift("monthlyIncome"),
      ].join("\n")
    )
);
const { projectMode, isLiveBuild, projectRunRate, monthlyIncome } = mod;

const line = (status, days, amount) => ({ status, days, amount });
const org = (id, over = {}) => ({ id, kind: "client", status: "active", retainer: 0, retainerStatus: "none", ...over });
const proj = (id, orgId, over = {}) => ({ id, orgId, billable: true, ...over });

/* ── which kind of engagement is this ─────────────────────────── */

test("an explicit mode always wins", () => {
  // Written by createEngagement. Nothing may override what the studio said.
  assert.equal(projectMode({ mode: "retainer" }, org("a", { retainer: 0 }), [line("agreed", 5, 100)]), "retainer");
  assert.equal(projectMode({ mode: "build" }, org("a", { retainer: 25000, retainerStatus: "signed" }), []), "build");
});

test("with no mode recorded, scope means it is a build", () => {
  // Every project created before `mode` existed. Inferred rather than migrated.
  assert.equal(projectMode({}, org("a"), [line("agreed", 5, 100)]), "build");
});

test("with no mode and no scope, a paying retainer client means a retainer", () => {
  assert.equal(projectMode({}, org("a", { retainer: 12500, retainerStatus: "signed" }), []), "retainer");
  assert.equal(projectMode({}, org("a", { retainer: 12500, retainerStatus: "proposed" }), []), "retainer");
});

test("no mode, no scope and no retainer is a build nobody has set up", () => {
  // This one SHOULD still be nagged about. It is genuinely unfinished.
  assert.equal(projectMode({}, org("a"), []), "build");
});

/* ── is there earning left ────────────────────────────────────── */

test("a fully accepted build is finished and earns nothing more", () => {
  // The money is in the invoice ledger by now. Counting it here too would
  // double it.
  assert.equal(isLiveBuild([line("accepted", 5, 100), line("accepted", 5, 100)]), false);
  assert.equal(projectRunRate([line("accepted", 5, 100)]), 0);
});

test("an unscoped project earns nothing rather than guessing", () => {
  assert.equal(isLiveBuild([]), false);
  assert.equal(projectRunRate([]), 0);
  assert.equal(projectRunRate(null), 0);
});

test("a single build's run rate is its value over its own duration", () => {
  // 6,00,000 over 42 working days = 1.935 months = 3,10,000/month.
  const scope = [line("accepted", 20, 300000), line("building", 22, 300000)];
  const expected = Math.round(600000 / (42 / MONTH_DAYS));
  assert.equal(projectRunRate(scope), expected);
});

/* ── THE PROPERTY THIS SUITE EXISTS FOR ───────────────────────── */

test("two concurrent builds BLEND, they do not add", () => {
  // The regression that shipped for about ten minutes: summing per-project run
  // rates claimed 6,43,846/month for one person. Pooled, the same two builds
  // are 10,00,000 over 68 days — the studio's real blended capacity.
  const orgs = [org("a"), org("b")];
  const projects = [proj("p1", "a"), proj("p2", "b")];
  const scopeByProject = {
    p1: [line("building", 42, 600000)],
    p2: [line("building", 26, 400000)],
  };
  const got = monthlyIncome({ orgs, projects, scopeByProject });

  const summed = projectRunRate(scopeByProject.p1) + projectRunRate(scopeByProject.p2);
  const blended = Math.round(1000000 / (68 / MONTH_DAYS));

  assert.equal(got.project, blended);
  assert.ok(got.project < summed,
    `blended ${got.project} must be below the naive sum ${summed} — otherwise capacity is being ignored`);
  assert.equal(got.liveBuilds, 2);
});

test("adding a third build lengthens the schedule, it does not raise the month", () => {
  // The behaviour that makes the number trustworthy: taking on more work does
  // not magically increase what one person can deliver in thirty days.
  const orgs = [org("a"), org("b"), org("c")];
  const scope2 = { p1: [line("building", 42, 600000)], p2: [line("building", 26, 400000)] };
  const scope3 = { ...scope2, p3: [line("agreed", 30, 300000)] };

  const two = monthlyIncome({ orgs, projects: [proj("p1", "a"), proj("p2", "b")], scopeByProject: scope2 });
  const three = monthlyIncome({
    orgs, projects: [proj("p1", "a"), proj("p2", "b"), proj("p3", "c")], scopeByProject: scope3,
  });

  // A cheaper-per-day third project pulls the blended rate DOWN, which is the
  // honest signal: the studio just sold time at a lower rate.
  assert.ok(three.project < two.project,
    `taking on work at a lower day rate must not raise the month (${two.project} -> ${three.project})`);
});

/* ── the rules that must survive the new arithmetic ───────────── */

test("a PROPOSED retainer is still counted as nothing", () => {
  const orgs = [org("a", { retainer: 25000, retainerStatus: "proposed" })];
  const got = monthlyIncome({ orgs, projects: [], scopeByProject: {} });
  assert.equal(got.retainer, 0);
  assert.equal(got.total, 0);
});

test("a signed retainer counts, and stays separate from build income", () => {
  const orgs = [org("a", { retainer: 25000, retainerStatus: "signed" })];
  const projects = [proj("p1", "a")];
  const scopeByProject = { p1: [line("building", 21.7, 100000)] };
  const got = monthlyIncome({ orgs, projects, scopeByProject });

  assert.equal(got.retainer, 25000);
  assert.equal(got.project, 100000);
  assert.equal(got.total, 125000);
  // Kept apart on purpose: one arrives again next month, the other stops at
  // launch. A single merged figure cannot answer "should I be selling".
  assert.notEqual(got.retainer, got.total);
});

test("a retainer engagement contributes no build income", () => {
  // Otherwise a care retainer with an intake list would be counted twice.
  const orgs = [org("a", { retainer: 12500, retainerStatus: "signed" })];
  const projects = [proj("p1", "a", { mode: "retainer" })];
  const got = monthlyIncome({ orgs, projects, scopeByProject: { p1: [] } });
  assert.equal(got.project, 0);
  assert.equal(got.total, 12500);
});

test("an archived client contributes nothing at all", () => {
  const orgs = [org("a", { status: "archived", retainer: 25000, retainerStatus: "signed" })];
  const projects = [proj("p1", "a")];
  const got = monthlyIncome({ orgs, projects, scopeByProject: { p1: [line("building", 20, 500000)] } });
  assert.equal(got.retainer, 0);
  assert.equal(got.project, 0);
});

test("a non-billable project earns nothing", () => {
  const orgs = [org("a")];
  const projects = [proj("p1", "a", { billable: false })];
  const got = monthlyIncome({ orgs, projects, scopeByProject: { p1: [line("building", 20, 500000)] } });
  assert.equal(got.project, 0);
});

test("an empty studio is zero, and says so without dividing by zero", () => {
  const got = monthlyIncome({ orgs: [], projects: [], scopeByProject: {} });
  assert.deepEqual(
    { retainer: got.retainer, project: got.project, total: got.total, liveBuilds: got.liveBuilds },
    { retainer: 0, project: 0, total: 0, liveBuilds: 0 }
  );
});

test("scope with amounts but no days cannot divide by zero", () => {
  // A quote saved without build days is possible; it must not produce Infinity.
  const orgs = [org("a")];
  const projects = [proj("p1", "a")];
  const got = monthlyIncome({ orgs, projects, scopeByProject: { p1: [line("building", 0, 500000)] } });
  assert.ok(Number.isFinite(got.project), `got ${got.project}`);
});
