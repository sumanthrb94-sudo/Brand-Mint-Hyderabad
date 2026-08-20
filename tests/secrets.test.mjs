/**
 * No credential is committed to this repository. Ever.
 *
 *   node --test tests/secrets.test.mjs
 *
 * WHY THIS EXISTS AS A TEST AND NOT A CONVENTION
 * ----------------------------------------------
 * This repository is public (CLAUDE.md section 2), and a secret committed here
 * is published permanently: deleting the line in a later commit does not remove
 * it from the history, and anything that has been pushed must be assumed read.
 *
 * Section 3 records the one time this was tested in anger. A Firebase
 * service-account key was pasted to publish a rules change; it never reached
 * git — .gitignore caught the filename pattern, and all 98 commits were
 * scanned — but the standing conclusion was that a key which has been pasted
 * anywhere is spent and must be rotated. The part that HELD was the mechanical
 * check. This is that check, generalised, and run on every suite.
 *
 * It exists because the alternative is remembering, and the sample script this
 * repo's video tooling was adapted from shipped with the token assigned as a
 * placeholder literal on line 20 — in the file, ready to be filled in and
 * committed. That is the normal shape of this mistake: not carelessness, just
 * a placeholder that somebody completes.
 *
 * Scope: TRACKED files only. What is in the working tree or ignored is the
 * author's business; what is committed is everyone's.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

/** Every file git actually tracks. */
function tracked() {
  return execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 })
    .toString()
    .split("\0")
    .filter(Boolean);
}

/* Vendored third-party code and its data files are excluded. They are pinned,
   diffable and reviewed on the way in (see .claude/skills/VENDORED.md), and
   their CSVs contain example strings that trip a pattern scan without being
   secrets. The rule still applies to everything this studio writes. */
const SKIP = [
  /^\.claude\/agents(-quarantined)?\//,
  /^\.claude\/skills\//,
  /^assets\/vendor\//,
  /^brand-mint-admin\//,
  /^admin\//,
  /^tests\/secrets\.test\.mjs$/,
  /\.(png|jpg|jpeg|webp|gif|svg|pdf|mp4|woff2?|ico)$/i,
];

const files = tracked().filter((f) => !SKIP.some((re) => re.test(f)));

/* Each pattern is a credential shape that is worth failing a build over. They
   are deliberately narrow: a scanner that cries wolf gets switched off, and a
   switched-off scanner is worse than none. */
/* The ONE allowed match, by exact value.
 *
 * `assets/bm-app.js` carries the Firebase web config, whose apiKey is shaped
 * exactly like a Google API key because it IS one — but CLAUDE.md section 3 is
 * explicit that the Firebase web config is public by design, ships in every
 * Firebase web app, and is not a credential. The thing that is a credential is
 * the service-account private key, which is caught by a different pattern below
 * and by .gitignore.
 *
 * Allowed BY VALUE rather than by suppressing the whole pattern: a different
 * Google API key appearing anywhere in this repo still fails the suite, which
 * is the point. Widening this to /AIza.../ would switch the check off for the
 * exact case it is meant to catch. */
const PUBLIC_BY_DESIGN = ["AIzaSyBk1rF-GagRY_XIXfXdXq2ndXfI0hZc2KI"];

const PATTERNS = [
  { name: "Hugging Face token",        re: /\bhf_[A-Za-z0-9]{16,}\b/ },
  { name: "AWS access key id",         re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "Google API key",            re: /\bAIza[0-9A-Za-z_\-]{35}\b/ },
  { name: "Slack token",               re: /\bxox[abprs]-[0-9A-Za-z-]{10,}/ },
  { name: "Stripe secret key",         re: /\bsk_(live|test)_[0-9A-Za-z]{16,}\b/ },
  { name: "Razorpay secret key",       re: /\brzp_(live|test)_[0-9A-Za-z]{14,}\b/ },
  { name: "GitHub token",              re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { name: "OpenAI key",                re: /\bsk-[A-Za-z0-9]{32,}\b/ },
  { name: "PEM private key",           re: /-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: "service-account private_key", re: /"private_key"\s*:\s*"-----BEGIN/ },
];

test("no credential-shaped string is committed anywhere", () => {
  const hits = [];
  for (const rel of files) {
    let text;
    try {
      text = fs.readFileSync(path.join(ROOT, rel), "utf8");
    } catch {
      continue; // binary or unreadable — the extension filter already covers assets
    }
    if (text.includes("\0")) continue;
    for (const p of PATTERNS) {
      const m = p.re.exec(text);
      if (m && !PUBLIC_BY_DESIGN.includes(m[0])) {
        const line = text.slice(0, m.index).split("\n").length;
        // Never print the match itself. A failure message is written to a log.
        hits.push(`${rel}:${line}  ${p.name}`);
      }
    }
  }
  assert.deepEqual(
    hits,
    [],
    `Credential-shaped strings are committed:\n  ${hits.join("\n  ")}\n\n` +
      "Remove it, then treat it as SPENT and rotate it. Deleting the line does\n" +
      "not remove it from the git history, and this repository is public."
  );
});

test("the Firebase service-account patterns are still in .gitignore", () => {
  // Section 3 says these lines are the part that held when a key was handled.
  const ignore = fs.readFileSync(path.join(ROOT, ".gitignore"), "utf8");
  ["*adminsdk*.json", "*service-account*.json", "serviceAccountKey.json"].forEach((pat) => {
    assert.ok(ignore.includes(pat), `.gitignore lost "${pat}"`);
  });
});

test("the video tool reads its token from the environment, never a literal", () => {
  // The script this was adapted from assigned the token as a literal on line 20.
  const src = fs.readFileSync(path.join(ROOT, "tools/brand-video.py"), "utf8");
  assert.ok(
    /os\.environ\.get\("HF_TOKEN"/.test(src),
    "brand-video.py must read HF_TOKEN from the environment"
  );
  assert.ok(
    !/HF_TOKEN\s*=\s*["']/.test(src),
    "brand-video.py has an assigned HF_TOKEN literal — that is the exact shape of the mistake"
  );
});
