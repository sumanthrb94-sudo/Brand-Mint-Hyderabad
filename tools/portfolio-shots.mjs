#!/usr/bin/env node
/**
 * Five portfolio screenshots of the product, from a real running instance.
 *
 *   bash tools/run-portfolio-shots.sh
 *   -> docs/portfolio/*.png
 *
 * WHY THE EMULATOR AND NOT PRODUCTION
 * -----------------------------------
 * Production holds real client names, real amounts, and the studio's own bank
 * details. None of that may end up in a public portfolio image. The emulator
 * runs the SAME code against seeded demo data, so what is photographed is the
 * real product with data nobody can be harmed by.
 *
 * The invoice shot passes an obviously-fake payee for exactly this reason —
 * CLAUDE.md is explicit that anything rendered into docs/ uses placeholder
 * payee details, because a real account number in a committed PNG defeats the
 * whole arrangement of keeping it out of the repo.
 */

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { listen } from "../tests/serve.mjs";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const PORT = Number(process.env.PORT || 5191);
const BASE = `http://127.0.0.1:${PORT}`;
const PROJECT = process.env.GCLOUD_PROJECT || "brandmintstudios-a5eb7";
const AUTH = "http://127.0.0.1:9099";
const FS_EMU = "http://127.0.0.1:8080";
const ADMIN = { email: "admin@brandmintstudios.in", password: "adminpass123" };
const CLIENT = { user: "greenbasket", password: "clientpass123" };

const OUT = path.join(ROOT, "docs/portfolio");
fs.mkdirSync(OUT, { recursive: true });

const shot = async (page, name, opts = {}) => {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), ...opts });
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

const server = await listen(PORT);
const browser = await chromium.launch({ executablePath: CHROME });
process.stdout.write("Portfolio screenshots\n");

try {
  await fetch(`${FS_EMU}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: "DELETE" });
  await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: "DELETE" });
  await createAuthUser(ADMIN.email, ADMIN.password);

  /* Desktop, retina. Portfolio images are viewed full-width on a laptop and
     Upwork downscales them; shooting at 2x keeps text crisp after that. */
  const page = await browser.newPage({ viewport: { width: 1440, height: 940 }, deviceScaleFactor: 2 });
  page.on("dialog", (d) => d.accept());

  await signIn(page, ADMIN.email, ADMIN.password);
  await page.goto(`${BASE}/studio?t=${Date.now()}#today`, { waitUntil: "load" });
  await page.waitForSelector("#bm-seed", { timeout: 20000 });
  await page.click("#bm-seed");
  await page.waitForTimeout(3200);

  /* 1. The dashboard. */
  await page.goto(`${BASE}/studio?t=${Date.now()}#today`, { waitUntil: "load" });
  await page.waitForTimeout(2200);
  await shot(page, "1-dashboard");

  /* 2. Money — the invoice ledger. */
  await page.click('[data-view="money"]');
  await page.waitForTimeout(1600);
  await shot(page, "2-invoicing");

  /* 3. A client record: the whole engagement on one surface. */
  await page.click('[data-view="clients"]');
  await page.waitForTimeout(1200);
  await page.click("#bm-client-list .bm-listrow[data-org]");
  await page.waitForTimeout(1600);
  await shot(page, "3-client-record");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);

  /* Give the demo project something to show. The seeded client has a project
     and invoices but no milestones, no open items and no preview links, so the
     portal photographs as three empty panels — honest, but it sells the
     product as unfinished rather than as working.

     This is DEMO CONTENT for a demo instance, not invented client results.
     The distinction that matters: nothing here is presented as a real
     engagement's outcome, and none of it touches production. */
  await page.evaluate(async () => {
    const m = await import("/assets/bm-app.js");
    const projects = await m.getAllProjects();
    const p = projects[0];
    if (!p) return;
    const day = 86400000;
    await m.addMilestone(p.id, { title: "Design sign-off", owner: "client", status: "done", dueAt: new Date(Date.now() - 9 * day) });
    await m.addMilestone(p.id, { title: "Catalogue build", owner: "us", status: "doing", dueAt: new Date(Date.now() + 4 * day) });
    await m.addMilestone(p.id, { title: "Payment gateway live", owner: "us", status: "todo", dueAt: new Date(Date.now() + 11 * day) });
    /* addIntakeItem() pins raisedAt to serverTimestamp() and ignores any date
       passed in — correct, because a blocker whose raised-date the studio can
       choose would make "waiting 9 days" meaningless. So the demo ages them
       with a second write, which only the admin can do. Without this the panel
       photographs as "0d" on every row and the one feature that distinguishes
       this product — how long the client has been the holdup — is invisible. */
    await m.addIntakeItem(p.id, { label: "Product photography for 40 SKUs", group: "assets" });
    await m.addIntakeItem(p.id, { label: "Razorpay account access", group: "access" });
    const items = await m.getIntake(p.id);
    const ages = [9, 3];
    for (let i = 0; i < items.length; i += 1) {
      await m.updateIntakeItem(p.id, items[i].id, { raisedAt: new Date(Date.now() - ages[i % ages.length] * day) });
    }
    await m.addDeliverable(p.id, { title: "Staging build", version: 2, status: "in_review", url: "https://staging.example.com" });
    await m.updateProject(p.id, { updateText: "Catalogue is loaded and the checkout flow is wired to Razorpay in test mode. Next: product photography, then we go live.", updateAt: new Date() });
  });
  await page.waitForTimeout(2500);

  /* 4. The client's own portal, from a real client session. Grant a login,
     then sign in as them — the same two writes the product requires, so this
     photographs the genuine tenant-isolated view and not a mock. */
  const orgId = await page.evaluate(`document.querySelector("#bm-client-list .bm-listrow[data-org]")?.dataset.org`);
  const uid = await createAuthUser(`${CLIENT.user}@brandmintstudios.in`, CLIENT.password);
  await page.click(`#bm-client-list .bm-listrow[data-org="${orgId}"]`);
  await page.waitForSelector("#bm-a-uid", { timeout: 15000 });
  await page.fill("#bm-a-username", CLIENT.user);
  await page.fill("#bm-a-name", "Green Basket");
  await page.fill("#bm-a-uid", uid);
  await page.click("[data-grant-login]");
  await page.waitForTimeout(3000);

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 940 }, deviceScaleFactor: 2 });
  const cp = await ctx.newPage();
  await signIn(cp, CLIENT.user, CLIENT.password);
  await cp.goto(`${BASE}/portal?t=${Date.now()}`, { waitUntil: "load" });
  await cp.waitForFunction(() => document.querySelectorAll("#bm-invoices-body tr").length > 0,
    null, { timeout: 25000 }).catch(() => {});
  await shot(cp, "4-client-portal", { fullPage: true });

  /* 5. The invoice document the client receives.
     PLACEHOLDER PAYEE, always — see the header of this file. */
  const inv = await cp.evaluate(async () => {
    const m = await import("/assets/bm-invoice.js");
    return m.invoiceHtml(
      { id: "demo01", label: "Website build — 50% advance", amount: 90000, status: "due",
        dueAt: new Date(Date.now() + 12 * 86400000) },
      { name: "Green Basket" },
      { payee: { holder: "Your Studio Name", account: "00000000000000", ifsc: "BANK0000000", bank: "Your Bank" } }
    );
  });
  const ip = await ctx.newPage();
  await ip.setContent(inv, { waitUntil: "load" });
  await ip.waitForTimeout(700);
  await shot(ip, "5-invoice", { fullPage: true });

  process.stdout.write(`\nWritten to ${path.relative(ROOT, OUT)}/\n`);
} catch (err) {
  process.stdout.write(`\nFAILED: ${err.message}\n${err.stack}\n`);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
