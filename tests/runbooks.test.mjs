/**
 * The playbooks.
 *
 *   node --test tests/runbooks.test.mjs
 *
 * Runbooks are data rather than prose in a document, which is the whole point:
 * a document drifts and nobody notices, whereas this fails the build.
 *
 * The two that matter most:
 *   - every sellable service has a playbook, so /services can never show a
 *     Playbook button that opens an empty drawer
 *   - no playbook anywhere asks a client to send a password, key or token
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

const { FEATURES } = await import(`${ROOT}/assets/bm-catalog.js`);
const rbModule = await import(`${ROOT}/assets/bm-runbooks.js`);
const { SERVICE_RUNBOOKS, OPS_RUNBOOKS, ALL_RUNBOOKS, LOAD_ERRORS } = rbModule;

// Playbooks load lazily in the browser so a missing file cannot take a page
// down. Here we load them up front and FAIL if any group did not load — the
// browser degrades gracefully, the test suite must not.
await rbModule.loadRunbooks();

const FIELDS = ["summary", "prerequisites", "fromClient", "steps", "verify", "traps", "handover"];

/** Every string in a runbook, flattened, for scanning. */
function strings(rb) {
  const out = [];
  const walk = (v) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(rb);
  return out;
}

/* ── coverage ─────────────────────────────────────────────────── */

test("every playbook group file loaded", () => {
  // Graceful degradation is for production. A group that silently failed to
  // load here would make every coverage assertion below pass vacuously.
  assert.deepEqual(
    LOAD_ERRORS,
    [],
    `playbook files failed to load:\n${LOAD_ERRORS.map((e) => `${e.path}: ${e.message}`).join("\n")}`
  );
});

test("every sellable service has a playbook", () => {
  const missing = FEATURES.map((f) => f.id).filter((id) => !SERVICE_RUNBOOKS[id]);
  assert.deepEqual(missing, [], `services with no playbook: ${missing.join(", ")}`);
});

test("no playbook exists for a service that is not in the catalogue", () => {
  const ids = new Set(FEATURES.map((f) => f.id));
  const orphans = Object.keys(SERVICE_RUNBOOKS).filter((id) => !ids.has(id));
  assert.deepEqual(orphans, [], `playbooks for unknown services: ${orphans.join(", ")}`);
});

test("the catalogue and the playbook set are the same size", () => {
  assert.equal(Object.keys(SERVICE_RUNBOOKS).length, FEATURES.length);
});

test("the operational playbooks cover the procedures that are easy to get wrong", () => {
  // Each of these has cost real time or would have. A missing one means the
  // knowledge is back in somebody's head.
  for (const id of [
    "ops-client-login",
    "ops-publish-rules",
    "ops-promote-production",
    "ops-tenancy-check",
    "ops-add-client",
    "ops-payments-setup",
  ]) {
    assert.ok(OPS_RUNBOOKS[id], `missing operational playbook: ${id}`);
  }
});

/* ── shape ────────────────────────────────────────────────────── */

for (const [id, rb] of Object.entries(ALL_RUNBOOKS)) {
  test(`${id} is complete and usable`, () => {
    for (const field of FIELDS) {
      assert.ok(rb[field], `${id} is missing ${field}`);
      if (Array.isArray(rb[field])) {
        assert.ok(rb[field].length > 0, `${id}.${field} is an empty list`);
      }
    }

    assert.ok(rb.summary.length > 40, `${id}.summary is too short to be useful`);
    assert.ok(rb.steps.length >= 3, `${id} has fewer than three steps`);

    for (const step of rb.steps) {
      assert.ok(step.do && step.do.length > 8, `${id} has a step with no real instruction`);
      assert.ok(step.where, `${id} has a step that does not say where it happens: "${step.do}"`);
      // "Configure it" and "set it up" are the shapes a useless step takes.
      assert.ok(
        !/^(configure|set up|setup|do the|handle)\b/i.test(step.do.trim()),
        `${id} has a vague step: "${step.do}"`
      );
    }
  });
}

/* ── the rule that matters most ───────────────────────────────── */

test("no playbook asks anyone to send a credential", () => {
  // A studio that holds client credentials turns one breach of itself into a
  // breach of every client it has. Access is always delegated instead.
  //
  // The check is about DIRECTION, not vocabulary. These are all fine and must
  // not trip it:
  //   - "Send the client the username and password"      we made it, we hand it over
  //   - "They paste the secret into their own Vercel"     they hold their own key
  //   - "Never ask them to send a password"               an explicit prohibition
  //   - "identified by the email claim on the token"      'token' as a noun
  // The violation is a credential moving TOWARDS us.
  const offenders = [];
  for (const [id, rb] of Object.entries(ALL_RUNBOOKS)) {
    for (const s of strings(rb)) {
      if (collectsCredential(s)) offenders.push(`${id}: "${s.trim().slice(0, 140)}"`);
    }
  }
  assert.deepEqual(offenders, [], `credential collection found:\n${offenders.join("\n")}`);
});

/** A credential moving toward the studio, in a sentence that is not forbidding it. */
function collectsCredential(sentence) {
  const CRED = /\b(password|passphrase|api[ _-]?key|secret key|key secret|client secret|access token|credentials?|login details)\b/i;
  if (!CRED.test(sentence)) return false;
  // A sentence that forbids the thing is the opposite of a violation.
  if (/\b(never|do not|don't|must not|rather than|instead of|no need to)\b/i.test(sentence)) return false;
  // Toward us, or extracted from them.
  const TO_US = /\b(to us|us the|with us|send us|to me|to the studio|our (inbox|email|team))\b/i;
  // "ask"/"request" need an object marker; "collect"/"obtain"/"store" are
  // transitive and take the credential directly — requiring "for" after them
  // left "Collect their access token" unflagged, which the canary caught.
  const ASK_FOR = /\b(ask|request)\b[^.]{0,50}\bfor\b/i;
  // Possessive required: taking THEIR credential is the violation. Recording a
  // login we created ourselves in our own password manager is correct
  // practice, and an earlier version of this flagged it.
  const TAKE = /\b(collect|obtain|gather|store|save|keep|record)\b[^.]{0,40}\b(their|the client'?s|customer'?s|his|her)\b[^.]{0,25}\b(password|passphrase|api[ _-]?key|secret key|key secret|client secret|access token|credentials?|login details)\b/i;
  return TO_US.test(sentence) || ASK_FOR.test(sentence) || TAKE.test(sentence);
}

test("the credential check still catches a real violation", () => {
  // A canary. Without it, the fix for a false positive can quietly weaken the
  // check until it never fires and the suite looks green forever.
  const musts = [
    "Ask the client for their API key and store it in the project.",
    "Send us the password once you have created it.",
    "Email the secret key to us before the call.",
    "Collect their access token so we can post on their behalf.",
    "Store the client's API key in Firestore so the app can use it.",
  ];
  for (const bad of musts) {
    assert.ok(collectsCredential(bad), `this SHOULD be flagged but was not: "${bad}"`);
  }
  const fines = [
    "Send the client the username and password by a channel they already use.",
    "They generate the API key themselves and paste the secret into their own Vercel project.",
    "Never ask them to send a password or key.",
    "The admin is identified by the email claim on the token.",
    "Set a password and record it in your password manager.",
  ];
  for (const ok of fines) {
    assert.ok(!collectsCredential(ok), `this should NOT be flagged: "${ok}"`);
  }
});

test("no playbook contains something that looks like a real key", () => {
  // Catches a live key pasted into a step as an example.
  const keyish = [
    /rzp_live_[A-Za-z0-9]{10,}/,
    /AIza[0-9A-Za-z_-]{30,}/,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /"private_key"/,
  ];
  for (const [id, rb] of Object.entries(ALL_RUNBOOKS)) {
    for (const s of strings(rb)) {
      for (const re of keyish) {
        assert.ok(!re.test(s), `${id} contains key-shaped text: ${s.slice(0, 80)}`);
      }
    }
  }
});

test("where a playbook needs access to a client account, it delegates", () => {
  // Mentioning a client's account is not the same as needing to get into one.
  // "The client's own Razorpay account collects the client's money" is a
  // statement about who holds the funds; it requires no access at all. Only
  // runbooks that actually need to get in must say how — and the house answer
  // is always "add hello@brandmintstudios.in as a user".
  const NEEDS_ACCESS =
    /\b(access to (their|the client'?s)|add (us|hello@)|invite (us|hello@)|we need access|log in to (their|the client'?s)|added as a (user|member|collaborator))\b/i;

  const undelegated = [];
  for (const [id, rb] of Object.entries(ALL_RUNBOOKS)) {
    const all = strings(rb).join(" ");
    if (!NEEDS_ACCESS.test(all)) continue;
    if (!/hello@brandmintstudios\.in/i.test(all)) undelegated.push(id);
  }
  assert.deepEqual(
    undelegated,
    [],
    `these need access to a client account but never name the address to add: ${undelegated.join(", ")}`
  );
});

test("delegation is how third-party access is obtained, everywhere it is obtained", () => {
  // The positive form: at least a meaningful share of the catalogue should be
  // delegating, or the rule has quietly stopped being applied.
  const delegating = Object.values(ALL_RUNBOOKS).filter((rb) =>
    /hello@brandmintstudios\.in/i.test(strings(rb).join(" "))
  ).length;
  assert.ok(
    delegating >= 8,
    `only ${delegating} playbooks delegate access — the pattern has stopped being applied`
  );
});

/* ── verification steps must be observable ────────────────────── */

test("verify steps describe something a person can look at", () => {
  const useless = /^(test it|check it works?|make sure it works?|confirm it works?|verify it works?)\.?$/i;
  const offenders = [];
  for (const [id, rb] of Object.entries(ALL_RUNBOOKS)) {
    for (const v of rb.verify) {
      if (useless.test(v.trim())) offenders.push(`${id}: "${v}"`);
    }
  }
  assert.deepEqual(offenders, [], `unobservable checks:\n${offenders.join("\n")}`);
});

/* ── the UI cannot offer a playbook that does not exist ───────── */

test("every Playbook button in the pages points at a real runbook", () => {
  const ids = new Set(Object.keys(ALL_RUNBOOKS));
  const problems = [];
  for (const page of ["services.html", "studio.html", "portal.html"]) {
    const html = fs.readFileSync(path.join(ROOT, page), "utf8");
    for (const m of html.matchAll(/data-runbook="([^"$]+)"/g)) {
      // Skip template literals — those are resolved from the catalogue at
      // render time and covered by the coverage test above.
      if (!ids.has(m[1])) problems.push(`${page} -> ${m[1]}`);
    }
  }
  assert.deepEqual(problems, [], `buttons pointing at missing runbooks:\n${problems.join("\n")}`);
});

test("the drawer renders every runbook without throwing", async () => {
  const { runbookHtml } = await import(`${ROOT}/assets/bm-runbooks.js`);
  for (const id of Object.keys(ALL_RUNBOOKS)) {
    const html = runbookHtml(id);
    assert.ok(html.length > 200, `${id} rendered almost nothing`);
    assert.ok(!html.includes("No playbook yet"), `${id} rendered the missing state`);
    assert.ok(!/undefined|\[object Object\]/.test(html), `${id} rendered a placeholder value`);
  }
});

test("a missing runbook renders an honest empty state, not a blank drawer", async () => {
  const { runbookHtml } = await import(`${ROOT}/assets/bm-runbooks.js`);
  const html = runbookHtml("no-such-service");
  assert.match(html, /No playbook yet/);
  assert.match(html, /no-such-service/);
});

test("runbook text is escaped, so a stray angle bracket cannot inject markup", async () => {
  const { runbookHtml } = await import(`${ROOT}/assets/bm-runbooks.js`);
  const html = runbookHtml("ops-client-login");
  // The ampersand in a real step ("Settings, then API Keys") is fine; what
  // must never appear is an unescaped tag from runbook content.
  assert.ok(!/<script/i.test(html));
});
