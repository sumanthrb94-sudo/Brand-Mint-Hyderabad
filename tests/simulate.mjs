#!/usr/bin/env node
/**
 * A SIMULATED STUDIO, SHAPED LIKE THE REAL BUSINESS.
 *
 *   bash tests/run-simulate.sh
 *
 * The other suites prove the CRM is correct. This asks a different question:
 * with a realistic month loaded into it, does the CRM tell the truth about
 * the business — and is the truth it tells the one that helps?
 *
 * Brand Mint earns three ways, and they behave nothing alike:
 *
 *   A. PROJECT → RETAINER. A one-off build, 8-12 weeks, invoiced 50/50.
 *      A retainer begins only after launch. During delivery the studio is
 *      earning a great deal of money and has NO signed retainer at all.
 *
 *   B. RETAINER ONLY. No build, no fixed scope, no end date. Just a monthly
 *      fee for continuing work.
 *
 *   C. ONE-TIME ONLY. The same 50/50 build, and then the engagement simply
 *      ends. No retainer is coming and none was ever proposed.
 *
 * These two are the whole business, and they stress the dashboard in opposite
 * directions — so this loads both at once, at different stages, and reads back
 * what every view actually says.
 *
 * NOTHING HERE GOES NEAR PRODUCTION. Emulators only, seeded through the app's
 * own admin session, so every write passes the real security rules. CLAUDE.md
 * §4 forbids seeding invented data — that rule is about the LIVE database and
 * about numbers being presented as fact. These are throwaway rows in a
 * throwaway emulator, and the report below labels them as simulated.
 */

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { listen } from "./serve.mjs";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const PORT = Number(process.env.PORT || 5188);
const BASE = `http://127.0.0.1:${PORT}`;
const PROJECT = process.env.GCLOUD_PROJECT || "brandmintstudios-a5eb7";
const FS = "http://127.0.0.1:8080";
const AUTH = "http://127.0.0.1:9099";
const ADMIN = { email: "admin@brandmintstudios.in", password: "adminpass123" };
const SHOTS = path.join(ROOT, "docs/simulate");
fs.mkdirSync(SHOTS, { recursive: true });

const out = [];
const say = (s = "") => { out.push(s); process.stdout.write(s + "\n"); };
const head = (s) => say(`\n\x1b[1m${s}\x1b[0m`);

/* ── the simulated studio ─────────────────────────────────────────
   Every number is arbitrary and clearly labelled as such. The SHAPE is what
   matters: two income models, at four different stages between them. */

const DAY = 86400000;
const now = Date.now();
const inDays = (n) => new Date(now + n * DAY).toISOString().slice(0, 10);

const STUDIO = {
  orgs: [
    // A1. Project in flight, week 5 of 10. Retainer agreed for AFTER launch,
    //     so it is correctly "proposed" and correctly not counted as revenue.
    { id: "nalanda", name: "Nalanda Interiors", kind: "client", status: "active",
      retainer: 25000, retainerStatus: "proposed",
      note: "Retainer starts at launch — proposed until then." },
    // A2. Same model, further along: build accepted, retainer now running.
    { id: "greenbasket", name: "Green Basket", kind: "client", status: "active",
      retainer: 25000, retainerStatus: "signed", note: "Build accepted Feb. Growth retainer." },
    // B. Retainer only. No build, no fixed scope, no end date.
    { id: "kaveri", name: "Kaveri Clinic", kind: "client", status: "active",
      retainer: 12500, retainerStatus: "signed", note: "Care retainer only — no build." },
    // C. ONE-TIME ONLY. A build, 50/50, and then nothing. No retainer is
    //    coming and none is proposed — the engagement simply ends. This is the
    //    shape the dashboard is worst at, because "retainerStatus: none" is
    //    indistinguishable from "we forgot to ask".
    { id: "sarojini", name: "Sarojini Exports", kind: "client", status: "active",
      retainer: 0, retainerStatus: "none", note: "One-time build. No retainer — by agreement." },
    // A proposal that has not been signed. Must never be counted.
    { id: "roasters", name: "Hyderabad Roasters", kind: "client", status: "active",
      retainer: 25000, retainerStatus: "proposed", note: "Quoted, not signed." },
  ],

  projects: [
    { id: "nalanda-build", orgId: "nalanda", name: "Nalanda site + booking tool",
      type: "site", dueAt: inDays(35), billable: true,
      scope: [
        { featureId: "f1", label: "Discovery & information architecture", amount: 60000, days: 4, status: "accepted" },
        { featureId: "f2", label: "Design system + key screens", amount: 140000, days: 10, status: "accepted" },
        { featureId: "f3", label: "Marketing site build", amount: 120000, days: 9, status: "delivered" },
        { featureId: "f4", label: "Booking tool — availability + slots", amount: 160000, days: 12, status: "building" },
        { featureId: "f5", label: "Payments + confirmation email", amount: 80000, days: 5, status: "agreed" },
        { featureId: "f6", label: "Launch, handover, 30-day warranty", amount: 40000, days: 2, status: "agreed" },
      ],
      intake: [
        { label: "Signed-off copy for the 6 main pages", group: "content", done: false, ageDays: 11 },
        { label: "Logo in vector + brand colours", group: "assets", done: true, ageDays: 30 },
        { label: "Access to the domain registrar", group: "access", done: false, ageDays: 4 },
      ],
      milestones: [
        { title: "Discovery workshop", owner: "us", status: "done", dueAt: inDays(-40) },
        { title: "Design sign-off", owner: "client", status: "done", dueAt: inDays(-21) },
        { title: "Booking tool build", owner: "us", status: "in_progress", dueAt: inDays(12) },
        { title: "Content freeze", owner: "client", status: "todo", dueAt: inDays(16) },
        { title: "Launch", owner: "us", status: "todo", dueAt: inDays(35) },
      ],
      deliverables: [
        { title: "Marketing site — staging", version: "v3", url: "https://example.com/staging", status: "in_review" },
      ],
      invoices: [
        { label: "50% advance", amount: 300000, status: "paid", dueAt: inDays(-38) },
        { label: "50% on launch", amount: 300000, status: "due", dueAt: inDays(35) },
      ],
    },

    { id: "gb-store", orgId: "greenbasket", name: "Green Basket store",
      type: "tool", dueAt: inDays(-30), billable: true,
      scope: [
        { featureId: "g1", label: "Catalogue + COD checkout", amount: 180000, days: 12, status: "accepted" },
        { featureId: "g2", label: "Order + delivery pin codes", amount: 90000, days: 6, status: "accepted" },
      ],
      intake: [], milestones: [
        { title: "Launch", owner: "us", status: "done", dueAt: inDays(-30) },
      ],
      deliverables: [], invoices: [
        { label: "Final 50%", amount: 135000, status: "paid", dueAt: inDays(-28) },
      ],
    },

    // THE INTERESTING ONE. A retainer-only engagement. There is no fixed
    // scope, no end date and no "percentage delivered" — by design, not by
    // neglect. Watch what the CRM says about it.
    { id: "kaveri-care", orgId: "kaveri", name: "Kaveri Clinic — care retainer",
      type: "internal", dueAt: null, billable: true,
      scope: [], intake: [
        { label: "Monthly blog topics for March", group: "content", done: false, ageDays: 6 },
      ],
      milestones: [], deliverables: [],
      invoices: [{ label: "March care retainer", amount: 12500, status: "due", dueAt: inDays(-3) }],
    },

    { id: "sarojini-site", orgId: "sarojini", name: "Sarojini Exports — export catalogue site",
      type: "site", dueAt: inDays(21), billable: true,
      scope: [
        { featureId: "s1", label: "Brand refresh + design system", amount: 150000, days: 9, status: "accepted" },
        { featureId: "s2", label: "Catalogue site build (EN + HI)", amount: 190000, days: 13, status: "building" },
        { featureId: "s3", label: "Enquiry flow + CRM handoff", amount: 60000, days: 4, status: "agreed" },
      ],
      intake: [
        { label: "Product photography for 40 SKUs", group: "assets", done: false, ageDays: 19 },
      ],
      milestones: [
        { title: "Design sign-off", owner: "client", status: "done", dueAt: inDays(-12) },
        { title: "Build complete", owner: "us", status: "in_progress", dueAt: inDays(14) },
        { title: "Launch", owner: "us", status: "todo", dueAt: inDays(21) },
      ],
      deliverables: [],
      invoices: [
        { label: "50% advance", amount: 200000, status: "paid", dueAt: inDays(-25) },
        { label: "50% on launch", amount: 200000, status: "due", dueAt: inDays(21) },
      ],
    },
  ],

  leads: [
    { name: "Deccan Dental Group", source: "referral", stage: "proposal", responded: true },
    { name: "Charminar Textiles", source: "inbound", stage: "discovery", responded: true },
    { name: "Sarath City Mall F&B", source: "inbound", stage: "inbound", responded: false },
  ],
};

/* ── emulator + sign-in ───────────────────────────────────────────── */

async function clearAll() {
  await fetch(`${FS}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: "DELETE" });
  await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: "DELETE" });
}

async function createAuthUser(email, password) {
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const b = await r.json();
  if (!r.ok) throw new Error(`createAuthUser: ${JSON.stringify(b)}`);
  return b.localId;
}

async function signIn(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "load" });
  await page.fill("#bm-username", ADMIN.email);
  await page.fill("#bm-password", ADMIN.password);
  await page.click("#bm-login-submit");
  const deadline = Date.now() + 25000;
  while (page.url().includes("/login")) {
    if (Date.now() > deadline) throw new Error("sign-in never completed");
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(1200);
}

async function goStudio(page, hash) {
  await page.goto(`${BASE}/studio?t=${Date.now()}#${hash}`, { waitUntil: "load" });
  await page.waitForFunction(() => {
    const l = document.querySelector("#bm-loading");
    const v = document.querySelector(".bm-view:not([hidden])");
    return l && l.hidden && v && v.innerHTML.trim().length > 0;
  }, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1000);
}

/* ── run ──────────────────────────────────────────────────────────── */

const server = await listen(PORT);
const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("dialog", (d) => d.accept());
const errors = [];
page.on("console", (m) => { if (m.type() === "error" && !/ERR_CONNECTION|favicon|fonts\.g/.test(m.text())) errors.push(m.text()); });

try {
  await clearAll();
  await createAuthUser(ADMIN.email, ADMIN.password);
  await signIn(page);

  head("Loading a simulated month into the emulator (as admin, through the real rules)");
  const written = await page.evaluate(async (S) => {
    const m = await import("/assets/bm-app.js");
    /* The test server rewrites gstatic imports inside the FILES it serves, but
       not a specifier constructed at runtime in here — so this asks for the
       rewritten path first and falls back to the real CDN. Same SDK build
       either way; 10.14.1 is pinned in both places. */
    const fsMod = await import("/__vendor/firebase-firestore.js")
      .catch(() => import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js"));
    const { doc, setDoc, collection, addDoc, serverTimestamp } = fsMod;
    const db = m.db;
    let n = 0;

    for (const o of S.orgs) {
      await setDoc(doc(db, "organisations", o.id), {
        name: o.name, kind: o.kind, status: o.status,
        retainer: o.retainer, retainerStatus: o.retainerStatus, note: o.note,
      });
      n += 1;
    }

    for (const p of S.projects) {
      await setDoc(doc(db, "projects", p.id), {
        orgId: p.orgId, name: p.name, type: p.type,
        dueAt: p.dueAt ? new Date(p.dueAt) : null, progress: null, billable: p.billable,
        // What createEngagement() writes. A retainer engagement is not a build
        // nobody set up, and the CRM has to be able to tell them apart.
        mode: p.scope.length ? "build" : "retainer",
      });
      n += 1;
      for (const [i, l] of p.scope.entries()) {
        await setDoc(doc(db, "projects", p.id, "scope", l.featureId), {
          featureId: l.featureId, label: l.label, amount: l.amount, days: l.days,
          status: l.status, order: i, agreedAt: serverTimestamp(), changedAt: null,
        });
        n += 1;
      }
      for (const it of p.intake) {
        await addDoc(collection(db, "projects", p.id, "intake"), {
          label: it.label, group: it.group, done: it.done,
          raisedAt: new Date(Date.now() - it.ageDays * 86400000),
          clearedAt: it.done ? new Date() : null,
        });
        n += 1;
      }
      for (const ms of p.milestones) {
        await addDoc(collection(db, "projects", p.id, "milestones"), {
          title: ms.title, owner: ms.owner, status: ms.status, dueAt: new Date(ms.dueAt),
        });
        n += 1;
      }
      for (const d of p.deliverables) {
        await addDoc(collection(db, "projects", p.id, "deliverables"), {
          title: d.title, version: d.version, url: d.url, status: d.status,
        });
        n += 1;
      }
      for (const inv of p.invoices) {
        await addDoc(collection(db, "invoices"), {
          orgId: p.orgId, label: inv.label, amount: inv.amount,
          status: inv.status, dueAt: new Date(inv.dueAt),
        });
        n += 1;
      }
    }

    for (const l of S.leads) {
      await addDoc(collection(db, "leads"), {
        name: l.name, source: l.source, stage: l.stage,
        createdAt: new Date(Date.now() - 3 * 86400000),
        firstResponseAt: l.responded ? new Date(Date.now() - 3 * 86400000 + 240000) : null,
        lossReason: null,
      });
      n += 1;
    }
    return n;
  }, STUDIO);
  say(`  wrote ${written} documents`);

  /* The ground truth, computed here rather than read off the screen — so the
     report can compare what IS with what the CRM SAYS. */
  const signedMrr = STUDIO.orgs.filter((o) => o.retainerStatus === "signed")
    .reduce((s, o) => s + o.retainer, 0);
  const proposedMrr = STUDIO.orgs.filter((o) => o.retainerStatus === "proposed")
    .reduce((s, o) => s + o.retainer, 0);
  const allInv = STUDIO.projects.flatMap((p) => p.invoices);
  const collected = allInv.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const outstanding = allInv.filter((i) => i.status !== "paid").reduce((s, i) => s + i.amount, 0);
  const contracted = STUDIO.projects.flatMap((p) => p.scope).reduce((s, l) => s + l.amount, 0);
  const liveProjectValue = STUDIO.projects.find((p) => p.id === "nalanda-build")
    .scope.reduce((s, l) => s + l.amount, 0);

  head("Ground truth of the simulated studio");
  say(`  signed retainers (MRR)        Rs ${signedMrr.toLocaleString("en-IN")}`);
  say(`  proposed retainers            Rs ${proposedMrr.toLocaleString("en-IN")}  (must never be counted)`);
  say(`  contracted project value      Rs ${contracted.toLocaleString("en-IN")}`);
  say(`  ... of which live right now   Rs ${liveProjectValue.toLocaleString("en-IN")}  (Nalanda, ~10 weeks)`);
  say(`  cash collected                Rs ${collected.toLocaleString("en-IN")}`);
  say(`  cash outstanding              Rs ${outstanding.toLocaleString("en-IN")}`);
  say(`  => a ~10-week build at Rs ${liveProjectValue.toLocaleString("en-IN")} is roughly`);
  say(`     Rs ${Math.round(liveProjectValue / 2.3).toLocaleString("en-IN")}/month of real income while it runs.`);

  head("What each view actually says");
  const views = ["today", "pipeline", "clients", "delivery", "money", "access", "activity"];
  const seen = {};
  for (const v of views) {
    await goStudio(page, v);
    const text = await page.evaluate(`document.querySelector("#view-${v}").innerText`);
    seen[v] = text;
    await page.screenshot({ path: path.join(SHOTS, `sim-${v}.png`), fullPage: true });
    say(`\n  ── ${v} ──`);
    say(text.split("\n").filter(Boolean).map((l) => "    " + l).join("\n"));
  }

  /* Open the two records that represent the two income models, because the
     drawer is where the working day actually happens. */
  head("The two income models, opened as records");
  await goStudio(page, "delivery");
  for (const [pid, label] of [["nalanda-build", "PROJECT -> RETAINER, mid-build"], ["kaveri-care", "RETAINER ONLY"]]) {
    await page.evaluate((id) => document.querySelector(`[data-project="${id}"]`)?.click(), pid);
    await page.waitForTimeout(900);
    const t = await page.evaluate(`document.querySelector(".bm-drawer")?.innerText || "(no drawer)"`);
    await page.screenshot({ path: path.join(SHOTS, `sim-drawer-${pid}.png`) });
    say(`\n  ── ${label} — ${pid} ──`);
    say(t.split("\n").filter(Boolean).slice(0, 40).map((l) => "    " + l).join("\n"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }

  head("Console");
  say(errors.length ? "  " + errors.slice(0, 5).join("\n  ") : "  clean");

  fs.writeFileSync(path.join(SHOTS, "report.txt"), out.join("\n").replace(/\x1b\[[0-9;]*m/g, ""));
  say(`\nreport -> docs/simulate/report.txt   screenshots -> docs/simulate/`);
} catch (err) {
  process.stdout.write(`\n\x1b[31mABORTED\x1b[0m ${err.stack}\n`);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
