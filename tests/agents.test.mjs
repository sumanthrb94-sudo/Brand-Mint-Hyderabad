/**
 * The agent bench.
 *
 *   node --test tests/agents.test.mjs
 *
 * 264 agent personas live in .claude/agents/. They were written by 100+
 * drive-by contributors to a public repo whose CI validates formatting and not
 * semantics. What makes them safe to keep here is not trust — it is that every
 * one of them carries an explicit `tools:` line that withholds Bash and every
 * MCP server.
 *
 * That property is one careless paste away from being untrue, and nothing about
 * a missing `tools:` line looks wrong. In Claude Code an agent that omits it
 * silently inherits EVERYTHING the main thread has — Bash, and whatever MCP
 * servers happen to be connected, which here includes Vercel, GitHub and
 * Supabase against a live studio.
 *
 * So it is asserted rather than assumed. An agent added without a grant fails
 * the suite instead of quietly acquiring the keys.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const AGENTS = path.join(ROOT, ".claude/agents");
const QUARANTINE = path.join(ROOT, ".claude/agents-quarantined");

const files = fs.existsSync(AGENTS)
  ? fs.readdirSync(AGENTS).filter((f) => f.endsWith(".md"))
  : [];

/** Everything a vendored agent is allowed to hold. Bash is absent on purpose,
 *  and so is every mcp__* tool. Widening this list is a decision, so it should
 *  look like one in a diff. */
const ALLOWED = new Set(["Read", "Grep", "Glob", "Edit", "Write", "WebSearch", "WebFetch"]);

function frontmatter(file) {
  const src = fs.readFileSync(path.join(AGENTS, file), "utf8");
  assert.ok(src.startsWith("---"), `${file}: no frontmatter`);
  const end = src.indexOf("\n---", 3);
  assert.notEqual(end, -1, `${file}: unterminated frontmatter`);
  return src.slice(4, end + 1);
}

function toolsOf(file) {
  const m = /^tools:\s*(.+)$/m.exec(frontmatter(file));
  return m ? m[1].split(",").map((s) => s.trim()).filter(Boolean) : null;
}

/* ── the bench exists ─────────────────────────────────────────── */

test("the agent bench is present and non-trivial", () => {
  assert.ok(files.length > 200, `expected the full roster, found ${files.length}`);
});

test("the Brand Mint CEO is on the bench", () => {
  assert.ok(files.includes("brand-mint-ceo.md"), "brand-mint-ceo.md is missing");
});

/* ── the grant ────────────────────────────────────────────────── */

test("EVERY agent declares tools: — none inherits by omission", () => {
  const missing = files.filter((f) => toolsOf(f) === null);
  assert.deepEqual(
    missing,
    [],
    `these agents would inherit Bash and every connected MCP server:\n  ${missing.join("\n  ")}`
  );
});

test("no agent can reach Bash", () => {
  const bad = files.filter((f) => (toolsOf(f) || []).some((t) => /^Bash/i.test(t)));
  assert.deepEqual(bad, [], `Bash granted to:\n  ${bad.join("\n  ")}`);
});

test("no agent can reach an MCP server", () => {
  // Vercel, GitHub, Supabase, Resend and Brevo are connected to this session.
  // An agent with one of those can change production directly.
  const bad = files.filter((f) => (toolsOf(f) || []).some((t) => t.startsWith("mcp__")));
  assert.deepEqual(bad, [], `MCP access granted to:\n  ${bad.join("\n  ")}`);
});

test("no agent holds a tool outside the allowed set", () => {
  const offenders = [];
  for (const f of files) {
    for (const t of toolsOf(f) || []) if (!ALLOWED.has(t)) offenders.push(`${f}: ${t}`);
  }
  assert.deepEqual(offenders, [], `unexpected tools:\n  ${offenders.join("\n  ")}`);
});

test("the CEO is read-only — it decides, it does not implement", () => {
  const ceo = toolsOf("brand-mint-ceo.md") || [];
  assert.ok(!ceo.includes("Write"), "the CEO has Write");
  assert.ok(!ceo.includes("Edit"), "the CEO has Edit");
  assert.ok(ceo.includes("Read"), "the CEO cannot read");
});

/* ── no agent demands a credential ────────────────────────────── */

test("no agent declares a services: block asking for API keys", () => {
  // CLAUDE.md §4: never collect a credential. Upstream ships four agents that
  // want GEMINI_API_KEY, UPLOADPOST_TOKEN and similar; the vendoring script
  // strips the block and quarantines the file.
  const bad = files.filter((f) => /^services:/m.test(frontmatter(f)));
  assert.deepEqual(bad, [], `services: blocks found in:\n  ${bad.join("\n  ")}`);
});

test("no loaded agent is told to act without asking", () => {
  // The specific strings that got files quarantined. If one reappears in
  // .claude/agents/ it means a quarantined file was un-parked, or upstream
  // grew a new one during a re-vendor.
  //
  // These target instructions to skip a HUMAN, not descriptions of automation.
  // An earlier version matched /without manual intervention/ and flagged
  // `sales-data-extraction-agent.md`, whose line is "100% of valid Excel files
  // processed without manual intervention" — a throughput metric, not an
  // autonomy instruction. A check that cries wolf gets switched off, so it is
  // narrowed to approval and permission specifically.
  const phrases = [
    /zero.{0,3}confirmation/i,
    /without asking (?:for )?(?:user |human )?(?:approval|permission)/i,
    /never ask(?:ing)? (?:for )?permission/i,
    /(?:skip|skipping|bypass|bypassing)\b[^.\n]{0,30}(?:approval|confirmation|permission)/i,
  ];
  // A sixth pattern — /(?:do|does) not (?:ask|require|wait) .{0,20}(approval|
  // confirmation|permission)/ — was tried and removed. It flagged
  // `healthcare-sovereign-health-systems-agent.md` for "Do not wait for a
  // commercial contract" and "exit pathway that does not require government
  // approval", both of which are advice about deal structure. The four above
  // caught the genuine offender on three separate lines, so the sixth bought
  // nothing but noise.
  const offenders = [];
  for (const f of files) {
    const src = fs.readFileSync(path.join(AGENTS, f), "utf8");
    for (const p of phrases) if (p.test(src)) offenders.push(`${f}: ${p}`);
  }
  assert.deepEqual(offenders, [], `autonomy instructions in loaded agents:\n  ${offenders.join("\n  ")}`);
});

/* ── provenance ───────────────────────────────────────────────── */

test("every vendored agent records where it came from", () => {
  // So a diff against upstream is possible, and so nobody has to guess whether
  // a file is ours or theirs.
  const bad = files.filter((f) => {
    if (f === "brand-mint-ceo.md") return false; // ours, written here
    return !/# vendored from msitarzewski\/agency-agents@/.test(frontmatter(f));
  });
  assert.deepEqual(bad, [], `no provenance line:\n  ${bad.join("\n  ")}`);
});

test("quarantined agents are parked, not loaded", () => {
  assert.ok(fs.existsSync(QUARANTINE), "the quarantine directory is gone");
  const parked = fs.readdirSync(QUARANTINE).filter((f) => f.endsWith(".md") && f !== "README.md");
  assert.ok(parked.length > 0, "nothing is quarantined — was the list emptied?");
  for (const f of parked) {
    assert.ok(!files.includes(f), `${f} is BOTH quarantined and loaded`);
  }
  assert.ok(
    fs.existsSync(path.join(QUARANTINE, "README.md")),
    "the quarantine has no README explaining why each file is there"
  );
});

/* ── the studio's own facts ───────────────────────────────────── */

test("the CEO's fact sheet exists and carries the real numbers", () => {
  const facts = fs.readFileSync(path.join(ROOT, "docs/STUDIO-FACTS.md"), "utf8");
  // These are the figures that decide most questions. If the file stops
  // containing them it has drifted into the same uselessness as the folder it
  // exists to replace.
  for (const n of ["₹1,00,000", "₹12,500", "₹87,500", "₹10,000", "₹8,000", "₹80,000"]) {
    assert.ok(facts.includes(n), `docs/STUDIO-FACTS.md no longer states ${n}`);
  }
});

test("the fact sheet warns off the aspirational business docs", () => {
  const facts = fs.readFileSync(path.join(ROOT, "docs/STUDIO-FACTS.md"), "utf8");
  for (const f of [
    "06-FINANCIAL-MODEL.md",
    "y1-pnl-model.md",
    "pricing-calculator.md",
    "11-HIRING-ROADMAP.md",
    "00-EXECUTIVE-SUMMARY.md",
  ]) {
    assert.ok(facts.includes(f), `the fact sheet no longer quarantines ${f}`);
  }
});

test("the CEO is told to read the fact sheet and to avoid brand-mint-admin numbers", () => {
  const ceo = fs.readFileSync(path.join(AGENTS, "brand-mint-ceo.md"), "utf8");
  assert.match(ceo, /docs\/STUDIO-FACTS\.md/, "the CEO is not pointed at the fact sheet");
  assert.match(ceo, /brand-mint-admin/, "the CEO is not warned off the aspirational folder");
});
