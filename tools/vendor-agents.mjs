/**
 * Vendor the agency-agents roster into .claude/agents/, with teeth.
 *
 *   node tools/vendor-agents.mjs --source <clone> [--check]
 *
 * WHY THIS EXISTS RATHER THAN `./scripts/install.sh`
 * --------------------------------------------------
 * Upstream's Claude Code installer copies to ~/.claude/agents/ — the home
 * directory, machine-wide, and wiped whenever this container is reclaimed. It
 * never touches the repo. We want the opposite: in the repo, committed,
 * reviewable in a diff, removable with `git rm`, and pinned so an upstream
 * merge cannot change what we run without us seeing it.
 *
 * Running upstream's script bare is also actively unsafe here: with no --tool
 * flag it installs for "all detected tools" and drops CONVENTIONS.md,
 * .windsurfrules and .cursor/rules/ into whatever directory you ran it from.
 *
 * THE ONE CHANGE THAT MATTERS
 * ---------------------------
 * 253 of the 270 agents declare no `tools:` field. In Claude Code a subagent
 * with no `tools:` inherits EVERYTHING the main thread has — Bash, Write, Edit,
 * and every connected MCP server. This session has Vercel, GitHub, Supabase,
 * Resend and Brevo connected, and the studio has a live Firestore and a live
 * domain. Inheriting all of that by omission is not a decision anyone made.
 *
 * So every vendored agent gets an explicit grant. Default-deny, not
 * default-inherit:
 *
 *   Read, Grep, Glob, Edit, Write, WebSearch, WebFetch
 *
 * No Bash. No mcp__* anything. That is CLAUDE.md section 9 item 4 respected in
 * the only way that matters — "build the audit log before any agent gets write
 * access to anything" is about writes to the DATABASE, and no agent here can
 * reach it. Repo edits land in git, get reviewed in a commit, and revert.
 *
 * QUARANTINE
 * ----------
 * Some upstream prompts instruct the agent to act without approval, or demand
 * API keys. The tool grant already defuses most of it — an agent with no Bash
 * and no MCP cannot publish to TikTok whatever its prompt says — but a prompt
 * that says "never ask for permission" is not something to ship into a repo
 * that touches production. Those files are still vendored (nothing is hidden)
 * into .claude/agents-quarantined/, which Claude Code does not load. Reversible
 * with one `git mv`.
 */

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i === -1 ? d : args[i + 1]; };
const CHECK = args.includes("--check");

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE = arg("--source", null);
const DEST = path.join(ROOT, ".claude/agents");
const QUARANTINE = path.join(ROOT, ".claude/agents-quarantined");

/** The grant. Deliberately uniform — a per-agent matrix is a thing nobody
 *  maintains, and one wrong row is a hole. Bash and mcp__* are absent by
 *  construction, and tests/agents.test.mjs asserts they stay absent. */
export const TOOL_GRANT = "Read, Grep, Glob, Edit, Write, WebSearch, WebFetch";

/** Prompts that tell an agent to skip human approval, or that need a
 *  credential. Vendored but not loaded. Keyed by basename. */
export const QUARANTINED = {
  "marketing-carousel-growth-engine.md":
    'line 41 reads "Zero Confirmation: Run the entire pipeline without asking for user approval between steps". It also auto-publishes to TikTok/Instagram and self-schedules its next run. Needs GEMINI_API_KEY + UPLOADPOST_TOKEN.',
  "specialized-chief-of-staff.md":
    'line 160: "if the boss seems depleted, lighten the day\'s load without asking permission". An agent deciding on its own what not to tell you is the opposite of what this studio needs.',
  "specialized-agents-orchestrator.md":
    'autonomous pipeline manager — "Handle errors and bottlenecks without manual intervention", spawns other agents and writes project files. Unreviewable by design.',
  "agents-orchestrator.md": "same as specialized-agents-orchestrator.md (name varies upstream).",
  "marketing-multi-platform-publisher.md":
    "requires Wechatsync / xhs-mcp / biliup credentials. CLAUDE.md section 4: never collect a credential.",
  "marketing-x-twitter-intelligence-analyst.md":
    "declares a services: block requiring API keys.",
  "design-ui-finish-gate-reviewer.md":
    "declares a services: block requiring API keys.",
};

/** Upstream directories that hold agents. `strategy/` is playbooks, not agents;
 *  `integrations/` is generated output for 16 other tools. Neither belongs. */
const SKIP_DIRS = new Set(["integrations", "strategy", "examples", "scripts", ".github", ".git", "docs"]);
const SKIP_FILES = new Set(["README.md", "CONTRIBUTING.md", "SECURITY.md", "CHANGELOG.md", "CODE_OF_CONDUCT.md"]);

function walk(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(path.join(dir, e.name), base, out);
    } else if (e.name.endsWith(".md") && !SKIP_FILES.has(e.name)) {
      out.push(path.join(dir, e.name));
    }
  }
  return out;
}

/** Split frontmatter from body. Returns null when the file has none — that is
 *  how upstream itself decides a file is an agent (`is_agent_file` checks the
 *  first line is `---`), so a file without it is documentation, not a persona. */
function split(src) {
  if (!src.startsWith("---")) return null;
  const end = src.indexOf("\n---", 3);
  if (end === -1) return null;
  return { front: src.slice(4, end + 1), body: src.slice(end + 4) };
}

/** Rewrite the frontmatter: force our tool grant, drop `services:` (a demand
 *  for API keys we will never supply), and record where it came from. */
function rewrite(front, sourceRel, upstreamSha) {
  const lines = front.split("\n");
  const kept = [];
  let skipping = false;

  for (const line of lines) {
    // Drop existing tools:/services: blocks, including their indented children.
    if (/^(tools|services):/.test(line)) { skipping = /^services:/.test(line); continue; }
    if (skipping) {
      if (/^\s+/.test(line) || line.trim() === "") continue;
      skipping = false;
    }
    if (line.trim() !== "") kept.push(line);
  }

  kept.push(`tools: ${TOOL_GRANT}`);
  kept.push(`# vendored from msitarzewski/agency-agents@${upstreamSha} :: ${sourceRel}`);
  kept.push(`# tools: line added here, not upstream. No Bash, no MCP — see tools/vendor-agents.mjs`);
  return `---\n${kept.join("\n")}\n---\n`;
}

// ── run ────────────────────────────────────────────────────────

if (!SOURCE) {
  console.error("usage: node tools/vendor-agents.mjs --source <path-to-agency-agents-clone> [--check]");
  process.exit(2);
}
if (!fs.existsSync(SOURCE)) {
  console.error(`source not found: ${SOURCE}`);
  process.exit(2);
}

let upstreamSha = "unknown";
try {
  upstreamSha = fs
    .readFileSync(path.join(SOURCE, ".git/HEAD"), "utf8")
    .trim()
    .replace(/^ref: /, "");
  if (upstreamSha.startsWith("refs/")) {
    upstreamSha = fs.readFileSync(path.join(SOURCE, ".git", upstreamSha), "utf8").trim();
  }
  upstreamSha = upstreamSha.slice(0, 7);
} catch { /* shallow clone without .git — leave "unknown" */ }

const files = walk(SOURCE).sort();
const stats = { vendored: 0, quarantined: 0, skipped: 0, hadTools: 0, hadServices: 0 };
const collisions = new Map();
const plan = [];

for (const abs of files) {
  const src = fs.readFileSync(abs, "utf8");
  const parts = split(src);
  const rel = path.relative(SOURCE, abs);

  if (!parts || !/^name:/m.test(parts.front)) { stats.skipped += 1; continue; }
  if (/^tools:/m.test(parts.front)) stats.hadTools += 1;
  if (/^services:/m.test(parts.front)) stats.hadServices += 1;

  const base = path.basename(abs);
  if (collisions.has(base)) {
    console.error(`COLLISION: ${base} from both ${collisions.get(base)} and ${rel}`);
    process.exit(1);
  }
  collisions.set(base, rel);

  const quarantined = Object.prototype.hasOwnProperty.call(QUARANTINED, base);
  const target = path.join(quarantined ? QUARANTINE : DEST, base);
  const out = rewrite(parts.front, rel, upstreamSha) + parts.body.replace(/^\n+/, "\n");

  plan.push({ target, out, quarantined, base });
  if (quarantined) stats.quarantined += 1; else stats.vendored += 1;
}

if (CHECK) {
  console.log(`would vendor    ${stats.vendored}`);
  console.log(`would quarantine ${stats.quarantined}`);
  console.log(`non-agent files skipped ${stats.skipped}`);
  console.log(`upstream declared tools: on ${stats.hadTools}, services: on ${stats.hadServices}`);
  console.log(`\nquarantine list:`);
  for (const p of plan.filter((x) => x.quarantined)) console.log(`  ${p.base}`);
  process.exit(0);
}

fs.rmSync(DEST, { recursive: true, force: true });
fs.rmSync(QUARANTINE, { recursive: true, force: true });
fs.mkdirSync(DEST, { recursive: true });
fs.mkdirSync(QUARANTINE, { recursive: true });

for (const p of plan) fs.writeFileSync(p.target, p.out);

fs.writeFileSync(
  path.join(QUARANTINE, "README.md"),
  `# Quarantined agents\n\n` +
    `Vendored so nothing is hidden, but **not loaded** — Claude Code only reads\n` +
    `\`.claude/agents/\`. Each of these either instructs the agent to act without\n` +
    `human approval, or demands an API key we will never supply (CLAUDE.md §4:\n` +
    `never collect a credential).\n\n` +
    `The tool grant already defuses most of the risk — none of these can reach\n` +
    `Bash or an MCP server — but a prompt that says "never ask for permission"\n` +
    `has no business in a repo that touches production.\n\n` +
    `To un-quarantine one, read it end to end first, then:\n\n` +
    `    git mv .claude/agents-quarantined/<file> .claude/agents/\n\n` +
    Object.entries(QUARANTINED)
      .filter(([k]) => plan.some((p) => p.base === k))
      .map(([k, why]) => `## \`${k}\`\n\n${why}\n`)
      .join("\n") +
    `\nUpstream: msitarzewski/agency-agents@${upstreamSha}\n`
);

console.log(`vendored    ${stats.vendored} -> .claude/agents/`);
console.log(`quarantined ${stats.quarantined} -> .claude/agents-quarantined/`);
console.log(`skipped     ${stats.skipped} non-agent files`);
console.log(`upstream    msitarzewski/agency-agents@${upstreamSha}`);
console.log(`grant       ${TOOL_GRANT}`);
