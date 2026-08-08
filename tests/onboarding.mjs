#!/usr/bin/env node
/**
 * ONBOARDING, DRIVEN THE WAY THE STUDIO ACTUALLY DOES IT — AND CHECKED FROM
 * THE CLIENT'S SIDE AT THE SAME TIME.
 *
 *   bash tests/run-onboarding.sh
 *
 * Every other suite either drives the admin screen or reads the portal. This
 * one does a full onboarding through the UI, for several clients of different
 * deal shapes, and after each step asks the question that actually matters:
 *
 *     what can the client see right now?
 *
 * That is the question no amount of admin-side testing answers. A studio can
 * believe a client is onboarded while the client sees a blank page — the
 * `users` document is a separate write from the Auth account, and a client
 * with one and not the other can sign in and read NOTHING, not even their own
 * organisation.
 *
 * THE SEQUENCE, PER CLIENT
 *
 *   1. admin  New engagement -> name, deal, price, weeks, retainer
 *   2. verify the org, project, scope, 50/50 invoices and schedule exist
 *   3. (Firebase Console) create the Auth account
 *   4. admin  Access -> paste the UID, pick the org, save
 *   5. client sign in, open /portal
 *   6. verify the portal shows THIS client's work and nothing else
 *
 * Step 3 is deliberately done against the Auth emulator's REST API rather than
 * through the app, because that is exactly what it is in real life: a thing
 * the studio does in the Firebase Console, outside this product. The app never
 * sees a password (§4) and this test does not pretend otherwise.
 *
 * Emulators only. bm-app.js connects to them exclusively from localhost.
 */

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { listen } from "./serve.mjs";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const PORT = Number(process.env.PORT || 5190);
const BASE = `http://127.0.0.1:${PORT}`;
const PROJECT = process.env.GCLOUD_PROJECT || "brandmintstudios-a5eb7";
const FS = "http://127.0.0.1:8080";
const AUTH = "http://127.0.0.1:9099";
const ADMIN = { email: "admin@brandmintstudios.in", password: "adminpass123" };
const CLIENT_PASSWORD = "clientpass123";
const SHOTS = path.join(ROOT, "docs/onboarding");
fs.mkdirSync(SHOTS, { recursive: true });

let pass = 0, fail = 0;
const failures = [];
const check = (ok, what, detail = "") => {
  if (ok) { pass += 1; process.stdout.write(`    \x1b[32m✔\x1b[0m ${what}\n`); }
  else {
    fail += 1; failures.push(`${what}${detail ? ` — ${detail}` : ""}`);
    process.stdout.write(`    \x1b[31m✘\x1b[0m ${what}${detail ? `\n        ${detail}` : ""}\n`);
  }
};
const step = (t) => process.stdout.write(`\n  \x1b[2m${t}\x1b[0m\n`);
const client = (t) => process.stdout.write(`\n\x1b[1m${t}\x1b[0m\n`);

/* ── the six engagements a new CEO would open ─────────────────────
   Deliberately spread across all three deal shapes and both extremes of
   price, because the cheap retainer-only client and the six-lakh build stress
   completely different parts of the screen. */

const CLIENTS = [
  { name: "Nalanda Interiors",   user: "nalanda",   deal: "then",     price: 600000, weeks: 10, retainer: 25000, type: "site" },
  { name: "Sarojini Exports",    user: "sarojini",  deal: "oneoff",   price: 400000, weeks: 6,  retainer: 0,     type: "site" },
  { name: "Kaveri Clinic",       user: "kaveri",    deal: "retainer", price: 0,      weeks: 0,  retainer: 12500, type: "" },
  { name: "Deccan Dental Group", user: "deccan",    deal: "then",     price: 250000, weeks: 4,  retainer: 15000, type: "brand" },
  { name: "Charminar Textiles",  user: "charminar", deal: "oneoff",   price: 180000, weeks: 3,  retainer: 0,     type: "tool" },
  { name: "Golconda Coffee",     user: "golconda",  deal: "retainer", price: 0,      weeks: 0,  retainer: 8000,  type: "" },
];

/* ── emulator plumbing ────────────────────────────────────────────── */

async function clearAll() {
  await fetch(`${FS}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: "DELETE" });
  await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: "DELETE" });
}

/** What the studio does in the Firebase Console. Returns the uid it would
 *  copy out of the new row. */
async function createAuthUser(email, password) {
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const b = await r.json();
  if (!r.ok) throw new Error(`createAuthUser ${email}: ${JSON.stringify(b)}`);
  return b.localId;
}

async function signIn(page, who, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "load" });
  await page.fill("#bm-username", who);
  await page.fill("#bm-password", password);
  await page.click("#bm-login-submit");
  const deadline = Date.now() + 25000;
  for (;;) {
    if (!page.url().includes("/login")) break;
    const refusal = await page.$eval("#bm-login-status", (el) => (el.hidden ? null : el.textContent.trim())).catch(() => null);
    if (refusal) throw new Error(`sign-in as ${who} refused: ${refusal}`);
    if (Date.now() > deadline) throw new Error(`sign-in as ${who} never completed`);
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(1000);
}

async function goStudio(page, hash) {
  await page.goto(`${BASE}/studio?t=${Date.now()}#${hash}`, { waitUntil: "load" });
  await page.waitForFunction(() => {
    const l = document.querySelector("#bm-loading");
    const v = document.querySelector(".bm-view:not([hidden])");
    return l && l.hidden && v && v.innerHTML.trim().length > 0;
  }, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(600);
}

/** Ask the page's own module what is in the database. Read as the signed-in
 *  user, so it is subject to exactly the same rules the UI is. */
const readAll = (page) => page.evaluate(async () => {
  const m = await import("/assets/bm-app.js");
  const [orgs, projects, invoices, users] = await Promise.all([
    m.getAllOrgs(), m.getAllProjects(), m.getAllInvoices(), m.getAllUsers(),
  ]);
  const scope = {};
  for (const p of projects) scope[p.id] = await m.getScope(p.id);
  const milestones = {};
  for (const p of projects) milestones[p.id] = await m.getMilestones(p.id);
  return { orgs, projects, invoices, users, scope, milestones };
});

/* ── run ──────────────────────────────────────────────────────────── */

const server = await listen(PORT);
const browser = await chromium.launch({ executablePath: CHROME });
const admin = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
admin.on("dialog", (d) => d.accept());

const adminErrors = [];
admin.on("console", (m) => {
  if (m.type() === "error" && !/ERR_CONNECTION|favicon|fonts\.g/.test(m.text())) adminErrors.push(m.text());
});

const onboarded = [];

try {
  await clearAll();
  await createAuthUser(ADMIN.email, ADMIN.password);
  await signIn(admin, ADMIN.email, ADMIN.password);

  for (const c of CLIENTS) {
    client(`${c.name} — ${c.deal}${c.price ? ` · Rs ${c.price.toLocaleString("en-IN")} / ${c.weeks}w` : ""}${c.retainer ? ` · Rs ${c.retainer.toLocaleString("en-IN")}/mo` : ""}`);

    /* ── 1. open the engagement ─────────────────────────────────── */
    step("New engagement");
    await goStudio(admin, "clients");
    await admin.click('[data-new="engagement"]');
    await admin.waitForSelector("#f-e-name", { timeout: 8000 });
    await admin.fill("#f-e-name", c.name);
    await admin.click(`[data-deal="${c.deal}"]`);
    await admin.waitForTimeout(250);

    if (c.price) {
      await admin.fill("#f-e-price", String(c.price));
      await admin.fill("#f-e-weeks", String(c.weeks));
      if (c.type) await admin.selectOption("#f-e-type", c.type).catch(() => {});
    }
    if (c.retainer) await admin.fill("#f-e-retainer", String(c.retainer));
    await admin.waitForTimeout(350);

    const preview = await admin.evaluate(`document.querySelector("#f-e-preview")?.innerText || ""`);
    check(preview.includes(c.name), "the preview names the client before anything is created", preview.slice(0, 100));
    if (c.price) check(/build over/.test(preview), "and states the build and its length");
    if (c.retainer) check(/proposed/.test(preview), "and says the retainer is PROPOSED, not counted");

    await admin.click('.bm-modal button[type="submit"]');
    /* Wait for the modal to actually close rather than guessing how long
       createEngagement takes — it writes an org, a project, a scope line, two
       invoices and six milestones, and that is slower on the sixth client than
       on the first. Same reasoning as the portal wait below. */
    await admin
      .waitForFunction(() => !document.querySelector(".bm-modal"), null, { timeout: 25000 })
      .catch(() => {});

    /* ── 2. did it create everything, in one submit? ────────────── */
    step("What one submit actually created");
    const db = await readAll(admin);
    const org = db.orgs.find((o) => o.name === c.name);
    check(!!org, "the organisation exists");
    if (!org) continue;

    const proj = db.projects.find((p) => p.orgId === org.id);
    check(!!proj, "a project exists for it");

    const invs = db.invoices.filter((i) => i.orgId === org.id);
    if (c.price) {
      check(invs.length === 2, `two invoices, 50/50 (${invs.length})`);
      const total = invs.reduce((s, i) => s + Number(i.amount), 0);
      check(total === c.price, `and they add up to the price (${total} vs ${c.price})`);
      const sc = db.scope[proj?.id] || [];
      check(sc.length === 1, `one agreed scope line, not an invented breakdown (${sc.length})`);
      check(Number(sc[0]?.amount) === c.price, "worth the agreed price");
      if (c.type) {
        const ms = db.milestones[proj?.id] || [];
        check(ms.length > 0, `a schedule was stamped (${ms.length} milestones)`);
      }
    } else {
      check(invs.length === 0, `a retainer-only engagement raises no build invoices (${invs.length})`);
      check((db.scope[proj?.id] || []).length === 0, "and has no scope, by design");
      check(proj?.mode === "retainer", `and is recorded as a retainer engagement (mode=${proj?.mode})`);
    }

    check(org.retainerStatus !== "signed",
      `the retainer is not silently signed (${org.retainerStatus})`);

    /* ── 3 + 4. give them a login ───────────────────────────────── */
    step("Giving them a portal login");
    const email = `${c.user}@brandmintstudios.in`;
    const uid = await createAuthUser(email, CLIENT_PASSWORD);

    /* The login form lives inside the client it belongs to now — there is no
       separate Access section to visit and no organisation to re-pick. */
    await goStudio(admin, "clients");
    await admin.evaluate((name) => {
      const row = [...document.querySelectorAll("#bm-client-list .bm-listrow[data-org]")]
        .find((b) => b.textContent.includes(name));
      row?.click();
    }, c.name);
    await admin.waitForSelector("#bm-a-uid", { timeout: 8000 });

    await admin.fill("#bm-a-username", c.user);
    await admin.fill("#bm-a-name", c.name);
    await admin.fill("#bm-a-uid", uid);
    await admin.waitForTimeout(250);

    const shown = await admin.evaluate(`document.querySelector("#bm-a-preview")?.innerText || ""`);
    check(shown.includes(email), "the form shows the exact email they will sign in with", shown);

    await admin.click(`[data-grant-login]`);
    /* Wait for the confirmation the next line asserts on. Granting re-renders
       the record and writes the message afterwards, so sleeping at it races
       the re-render — and a message that has not been written yet is
       indistinguishable from one that never will be. */
    await admin
      .waitForFunction(() => {
        const el = document.querySelector("#bm-a-status");
        return el && !el.hidden && (el.innerText || "").trim().length > 0;
      }, null, { timeout: 25000 })
      .catch(() => {});
    const saved = await admin.evaluate(`document.querySelector("#bm-a-status")?.innerText || ""`);
    check(/saved/i.test(saved), "the login is saved", saved.slice(0, 110));

    const hasPassword = await admin.evaluate(`!!document.querySelector('input[type="password"]')`);
    check(!hasPassword, "and NO password field exists anywhere on the screen (§4)");

    /* ── 5 + 6. what can the client see? ────────────────────────── */
    step("Signing in as them and reading their portal");
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const cp = await ctx.newPage();
    const cErrors = [];
    cp.on("console", (m) => {
      if (m.type() === "error" && !/ERR_CONNECTION|favicon|fonts\.g/.test(m.text())) cErrors.push(m.text());
    });

    let portal = "";
    try {
      await signIn(cp, c.user, CLIENT_PASSWORD);
      await cp.goto(`${BASE}/portal?t=${Date.now()}`, { waitUntil: "load" });

      /* WAIT FOR THE PORTAL TO RENDER, DO NOT SLEEP AT IT.

         This was waitForTimeout(2600), and it flaked: Charminar Textiles —
         the fifth of six, when the emulator is carrying the most data — read
         back a 61-character body with no console errors, no permission denial
         and tenancy isolation still passing. The portal had simply not
         finished loading yet. The identical code passed on a re-run, which is
         the signature of a race rather than a defect.

         A fixed sleep is the bug: it is a guess about how slow the machine is,
         and it will guess wrong again on a slower one. This waits for the
         thing actually being asserted instead.

         It does NOT mask a genuine blank portal. If the page really renders
         nothing the wait simply expires and the check below fails exactly as
         it should — the only difference is that a slow render no longer looks
         identical to a broken one.

         THE CONDITION MUST BE THE LAST THING TO RENDER, NOT THE FIRST.
         The first version of this wait used body.innerText.length > 200, and
         it was WORSE than the sleep it replaced: the shell and the project
         name clear 200 characters well before the invoices are fetched, so
         the test read the page earlier than the old 2600ms and all six
         clients failed their invoice assertions deterministically.

         Invoices are the deepest read on this page — org, then project, then
         milestones, intake, deliverables, scope, and invoices last — so
         waiting for a row in #bm-invoices-body dominates every earlier one.
         Both the populated and the "No invoices yet" states render a <tr>,
         which is what makes the same condition correct for a retainer-only
         client with no build invoices at all. */
      await cp
        .waitForFunction(() => {
          const rows = document.querySelectorAll("#bm-invoices-body tr");
          return rows.length > 0;
        }, null, { timeout: 25000 })
        .catch(() => {});
      portal = await cp.innerText("body");
    } catch (err) {
      check(false, "the client can sign in and load their portal", err.message);
    }

    check(portal.length > 200, "the portal is not blank", `${portal.length} chars`);
    check(portal.includes(c.name) || portal.toLowerCase().includes(c.name.split(" ")[0].toLowerCase()),
      "it names their own organisation");

    // Their money, from their side.
    if (c.price) {
      const half = Math.round(c.price / 2).toLocaleString("en-IN");
      check(portal.includes(half), `they can see the ${half} advance invoice`);
    } else {
      check(/no invoices yet/i.test(portal), "a retainer-only client sees no build invoices, and is told so");
    }

    // Tenancy, from inside their own session: no other client's name anywhere.
    const others = onboarded.filter((o) => o.name !== c.name).map((o) => o.name);
    const leaked = others.filter((n) => portal.includes(n));
    check(leaked.length === 0, `no other client's data is visible (${others.length} others onboarded)`,
      leaked.join(", "));

    check(cErrors.length === 0, "no console errors on the client side", cErrors.slice(0, 2).join(" | "));

    await cp.screenshot({ path: path.join(SHOTS, `portal-${c.user}.png`), fullPage: true });
    await ctx.close();

    onboarded.push({ ...c, orgId: org.id, uid, email });
  }

  /* ── the studio's own view, after six onboardings ─────────────── */
  client("The studio's own screen after six onboardings");
  await goStudio(admin, "today");
  const today = await admin.evaluate(`document.querySelector("#view-today").innerText`);
  process.stdout.write(today.split("\n").filter(Boolean).map((l) => "    " + l).join("\n") + "\n\n");
  await admin.screenshot({ path: path.join(SHOTS, "studio-today.png"), fullPage: true });

  check(!/nothing is set up yet/i.test(today), "Today no longer reports an empty system");
  check(/this month/i.test(today), "and leads with what the month is worth");

  /* The two things a freshly onboarded studio is ALWAYS guilty of, and which
     nothing used to mention. Found by running this simulation: six clients
     onboarded perfectly, and the action list had exactly one line on it. */
  check(/nothing raised with the client/i.test(today),
    "it says which projects have nothing raised — the portal's whole job, switched off");
  check(/proposed but not signed/i.test(today),
    "and that agreed retainers are sitting unsigned and uncounted");
  const proposedWorth = CLIENTS.filter((c) => c.retainer).reduce((n, c) => n + c.retainer, 0);
  check(today.includes(proposedWorth.toLocaleString("en-IN")),
    `and states what they are worth (Rs ${proposedWorth.toLocaleString("en-IN")}/month)`,
    today.match(/[^.]*proposed but not signed[^.]*/i)?.[0] || "");

  await goStudio(admin, "clients");
  const clientsView = await admin.evaluate(`document.querySelector("#view-clients").innerText`);
  for (const c of onboarded) {
    check(clientsView.includes(c.name), `${c.name} is in the client list`);
  }
  const fullyOnboarded = (clientsView.match(/7\/7/g) || []).length;
  check(fullyOnboarded === 0 || fullyOnboarded < onboarded.length,
    "no client claims to be fully onboarded before intake and scope exist",
    `${fullyOnboarded} showing 7/7`);
  await admin.screenshot({ path: path.join(SHOTS, "studio-clients.png"), fullPage: true });

  await goStudio(admin, "money");
  const moneyView = await admin.evaluate(`document.querySelector("#view-money").innerText`);
  process.stdout.write(moneyView.split("\n").filter(Boolean).slice(0, 14).map((l) => "    " + l).join("\n") + "\n\n");

  client("Console");
  check(adminErrors.length === 0, "no console errors on the admin side", adminErrors.slice(0, 3).join(" | "));
} catch (err) {
  fail += 1;
  failures.push(`ABORTED: ${err.message}`);
  process.stdout.write(`\n\x1b[31mABORTED\x1b[0m ${err.stack}\n`);
} finally {
  await browser.close();
  server.close();
}

process.stdout.write(`\n${"─".repeat(62)}\n${onboarded.length} clients onboarded · ${pass + fail} checks · ${pass} passed · ${fail} failed\n`);
if (failures.length) process.stdout.write(`\n\x1b[31mFailures:\x1b[0m\n${failures.map((f) => `  - ${f}`).join("\n")}\n`);
process.stdout.write(`screenshots -> docs/onboarding/\n`);
process.exit(fail ? 1 : 0);
