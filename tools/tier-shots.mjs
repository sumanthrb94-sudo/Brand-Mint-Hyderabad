#!/usr/bin/env node
/**
 * Screenshots of the three-tier rebuild — the marketing pages and the admin
 * screens that changed.
 *
 *   bash tools/run-tier-shots.sh
 *   -> docs/tiers/*.png
 *
 * WHY THE EMULATOR AND NOT PRODUCTION
 * -----------------------------------
 * Production holds real client names, real amounts, and the studio's own bank
 * details. None of that may end up in a committed PNG. The emulator runs the
 * SAME code against seeded demo data, so what is photographed is the real
 * product with data nobody can be harmed by.
 *
 * The marketing shots need no database at all — they are static pages — so
 * they are taken first and would still work if the emulator never came up.
 */

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { listen } from "../tests/serve.mjs";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const PORT = Number(process.env.PORT || 5193);
const BASE = `http://127.0.0.1:${PORT}`;
const PROJECT = process.env.GCLOUD_PROJECT || "brandmintstudios-a5eb7";
const AUTH = "http://127.0.0.1:9099";
const FS_EMU = "http://127.0.0.1:8080";
const ADMIN = { email: "admin@brandmintstudios.in", password: "adminpass123" };

const OUT = path.join(ROOT, "docs/tiers");
fs.mkdirSync(OUT, { recursive: true });

const shot = async (target, name, opts = {}) => {
  await target.screenshot({ path: path.join(OUT, `${name}.png`), ...opts });
  process.stdout.write(`  ${name}.png\n`);
};

async function createAuthUser(email, password) {
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const b = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(b));
  return b.localId;
}

async function signIn(page, who, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "load" });
  await page.fill("#bm-username", who);
  await page.fill("#bm-password", password);
  await page.click("#bm-login-submit");
  await page.waitForFunction(() => !location.pathname.includes("/login"), null, { timeout: 25000 });
  await page.waitForTimeout(1400);
}

async function goStudio(page, hash) {
  await page.goto(`${BASE}/studio?t=${Date.now()}#${hash}`, { waitUntil: "load" });
  await page.waitForFunction(() => {
    const l = document.querySelector("#bm-loading");
    const v = document.querySelector(".bm-view:not([hidden])");
    return l && l.hidden && v && v.innerHTML.trim().length > 0;
  }, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(900);
}

const server = await listen(PORT);
const browser = await chromium.launch({ executablePath: CHROME });
process.stdout.write("Tier screenshots\n");

try {
  /* ── 1. the marketing pages ──────────────────────────────────────
     No database needed. Shot at 2x so the prices stay legible after
     any downscaling. */
  const mk = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });

  /* Both pages reveal sections on scroll — the motion modules set a starting
     state at runtime and animate when the section comes into view. Screenshot
     a section without scrolling to it first and you photograph the state
     BEFORE the reveal, which is a blank card grid.
     (The page itself is fine either way: tests/motion.mjs blocks the motion
     script and anime.js and asserts both pages stay fully readable. This is a
     camera problem, not a page problem.) */
  const reveal = async (page, sel) => {
    await page.locator(sel).scrollIntoViewIfNeeded();
    await page.waitForTimeout(1600);
  };

  await mk.goto(`${BASE}/`, { waitUntil: "load" });
  await mk.waitForTimeout(1500);
  await reveal(mk, "#services");
  await shot(mk.locator("#services"), "1-home-tiers");
  await reveal(mk, "#care");
  await shot(mk.locator("#care"), "2-home-care-plans");

  await mk.goto(`${BASE}/home-v2`, { waitUntil: "load" });
  await mk.waitForTimeout(1500);
  await reveal(mk, "#services");
  await shot(mk.locator("#services"), "3-home-v2-tiers");
  await mk.close();

  /* ── 2. the admin screens ────────────────────────────────────── */
  await fetch(`${FS_EMU}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: "DELETE" });
  await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: "DELETE" });
  await createAuthUser(ADMIN.email, ADMIN.password);

  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  page.on("dialog", (d) => d.accept());
  await signIn(page, ADMIN.email, ADMIN.password);

  /* New engagement, empty system — the form is the headline change, and it
     photographs best before any data exists, because that is the state a new
     studio actually opens it in. */
  await goStudio(page, "clients");
  await page.click('[data-new="engagement"]');
  await page.waitForSelector("#f-e-name", { timeout: 10000 });
  await page.fill("#f-e-name", "Nalanda Interiors");
  await page.click('[data-tier="growth"]');
  await page.check('.f-e-addon[value="android"]');
  await page.click('[data-care="growth-care"]');
  await page.waitForTimeout(700);
  await shot(page.locator(".bm-modal"), "4-new-engagement");
  /* The preview at the foot of the form is the payoff — it states exactly what
     is about to be created — and it sits below the fold of a scrolling modal.
     Worth its own frame. */
  await page.locator("#f-e-preview").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await shot(page.locator(".bm-modal"), "4b-new-engagement-preview");

  /* Submit it, so every screen below has something real on it rather than an
     empty state — the tiers are what is being shown, not the empty case. */
  await page.click('.bm-modal button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector(".bm-modal"), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);

  /* A second engagement on a different tier, so Today and the lists are not a
     single row. Starter, one-off, no care plan. */
  await goStudio(page, "clients");
  await page.click('[data-new="engagement"]');
  await page.waitForSelector("#f-e-name", { timeout: 10000 });
  await page.fill("#f-e-name", "Sarojini Exports");
  await page.click('[data-deal="oneoff"]');
  await page.click('[data-tier="starter"]');
  await page.waitForTimeout(500);
  await page.click('.bm-modal button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector(".bm-modal"), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);

  await goStudio(page, "today");
  await page.waitForTimeout(1200);
  await shot(page, "5-today");

  /* The client record — care plan named, and what it covers. */
  await goStudio(page, "clients");
  await page.waitForTimeout(600);
  await page.click("#bm-client-list .bm-listrow[data-org]");
  await page.waitForTimeout(1400);
  await shot(page.locator(".bm-drawer"), "6-client-record");
  /* Scroll to the Care plan section — the part that changed, and the part that
     answers "is this request included work or a change order". */
  await page.locator(".bm-drawer h4", { hasText: "Care plan" }).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await shot(page.locator(".bm-drawer"), "6b-client-care-plan");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  /* The project drawer — the tier as one agreed scope line, the add-on as its
     own, and the milestone schedule the tier stamped.

     It opens from INSIDE the client record, not from a section of its own: a
     project belongs to a client, so that is where it lives. There is no
     Delivery view any more. */
  await goStudio(page, "clients");
  await page.waitForTimeout(600);
  await page.click("#bm-client-list .bm-listrow[data-org]");
  await page.waitForTimeout(1200);
  await page.click(".bm-drawer [data-project]");
  await page.waitForTimeout(1600);
  await shot(page.locator(".bm-drawer"), "7-project-scope");
  /* The milestone schedule, in date order. It used to come back in Firestore
     document order — effectively random — so this frame is the fix. */
  await page.locator(".bm-drawer h4", { hasText: "Milestones" }).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await shot(page.locator(".bm-drawer"), "7b-project-milestones");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  /* Money — the 50/50 invoices the tier raised, and the GSTIN field that stays
     empty until registration completes. */
  await goStudio(page, "money");
  await page.waitForTimeout(1400);
  await shot(page, "8-money", { fullPage: true });

  process.stdout.write(`\nWritten to ${path.relative(ROOT, OUT)}/\n`);
} catch (err) {
  process.stdout.write(`\nFAILED: ${err.message}\n${err.stack}\n`);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
