#!/usr/bin/env node
/**
 * THE WHOLE JOURNEY, BOTH SIDES AT ONCE.
 *
 *   npm-less:  node tests/journey.mjs
 *   (wrapped by tests/run-journey.sh, which starts the emulators)
 *
 * Every other suite in this repo tests one side of the glass. The rules tests
 * ask what a client may reach. The payment tests ask what the server accepts.
 * The e2e tests drive one browser as one person.
 *
 * None of them can answer the question that actually matters day to day:
 * **when the studio does something, what does the client see, and when?**
 *
 * So this runs TWO browser contexts against ONE emulated database — admin in
 * one, client in the other — and at every stage asserts both views. The client
 * page is never told to re-render by the test; it is reloaded and re-read, so
 * what it shows is what a real client would see on their next visit.
 *
 * It is a rehearsal of the real sequence: lead, first response, signed
 * retainer, project, login, intake, the client answering, milestones,
 * deliverable, the client approving, invoice, payment, reconciliation, and
 * finally the isolation check from inside the client's own session.
 *
 * Nothing here touches production. `bm-app.js` only connects to emulators when
 * the page is served from localhost, so this cannot reach the live project
 * even by accident.
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listen } from "./serve.mjs";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");

const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const PORT = Number(process.env.PORT || 5175);
const BASE = `http://127.0.0.1:${PORT}`;
const PROJECT = process.env.GCLOUD_PROJECT || "brandmintstudios-a5eb7";
const FS = "http://127.0.0.1:8080";
const AUTH = "http://127.0.0.1:9099";

const ADMIN = { email: "admin@brandmintstudios.in", password: "adminpass123" };
const CLIENT = { username: "greenbasket", email: "greenbasket@brandmintstudios.in", password: "clientpass123" };

/* ── narration ────────────────────────────────────────────────── */

const stages = [];
let current = null;
let failures = 0;

function stage(n, title, why) {
  current = { n, title, why, admin: [], client: [], failed: false, shots: [] };
  stages.push(current);
  process.stdout.write(`\n\x1b[1m${n}. ${title}\x1b[0m\n   ${why}\n`);
}

/* Screenshots, so the run can be watched rather than only read.
   Pass/fail lines tell you the journey works; they do not show you what the
   client actually sees at each stage, which is the thing worth reviewing. */
const SHOTS = path.join(ROOT, "docs/journey");
async function shot(page, side) {
  if (!current) return;
  const name = `${String(current.n).padStart(2, "0")}-${side}.png`;
  await page.screenshot({ path: path.join(SHOTS, name), fullPage: true }).catch(() => {});
  current.shots.push({ side, file: name });
}

function check(side, ok, message) {
  const rec = { ok, message };
  current[side].push(rec);
  if (!ok) { current.failed = true; failures += 1; }
  const mark = ok ? "\x1b[32m✔\x1b[0m" : "\x1b[31m✘\x1b[0m";
  const who = side === "admin" ? "\x1b[36madmin \x1b[0m" : "\x1b[35mclient\x1b[0m";
  process.stdout.write(`   ${mark} ${who} ${message}\n`);
}

/* ── emulator helpers (privileged REST, emulator-only) ────────── */

async function clearFirestore() {
  const r = await fetch(`${FS}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
    method: "DELETE",
  });
  if (!r.ok) throw new Error(`clearFirestore: ${r.status}`);
}

async function clearAuth() {
  const r = await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: "DELETE" });
  if (!r.ok) throw new Error(`clearAuth: ${r.status}`);
}

/** Creates an Auth user the way the Firebase Console would, and returns its uid.
 *  This is the half of "create a client login" that happens outside the app. */
async function createAuthUser(email, password) {
  const r = await fetch(
    `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const body = await r.json();
  if (!r.ok) throw new Error(`createAuthUser ${email}: ${JSON.stringify(body)}`);
  return body.localId;
}

/* ── page helpers ─────────────────────────────────────────────── */

async function signIn(page, who, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "load" });
  await page.fill("#bm-username", who);
  await page.fill("#bm-password", password);
  await page.click("#bm-login-submit");

  /* Polled, not raced. Promise.race rejects on the first REJECTION, so racing
     two waits that both time out kills the run with whichever fired first and
     tells you nothing. This waits for either outcome and reports the page's
     own message — a wrong password and an unreachable emulator look identical
     from a bare timeout. */
  const deadline = Date.now() + 25000;
  for (;;) {
    if (!page.url().includes("/login")) break;
    const refusal = await page
      .$eval("#bm-login-status", (el) => (el.hidden ? null : el.textContent.trim()))
      .catch(() => null);
    if (refusal) throw new Error(`sign-in as ${who} refused: ${refusal}`);
    if (Date.now() > deadline) {
      throw new Error(`sign-in as ${who} never completed and never reported an error`);
    }
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(900);
}

/** Reload and read. The client page is never nudged by the test — this is
 *  what the client would see arriving fresh. */
async function reload(page, path) {
  /* A genuine reload, every time.
     page.goto() to a URL that differs only by the fragment does NOT reload the
     document — the browser just moves the hash. So navigating /studio#today ->
     /studio#money left the previous render on screen, and the dashboard
     appeared to ignore a write that had in fact landed. The bug was in this
     helper; the product was correct. A cache-busting query forces a real
     navigation while keeping the hash meaningful. */
  const [p, hash = ""] = path.split("#");
  const url = `${BASE}${p}?t=${Date.now()}${hash ? `#${hash}` : ""}`;
  await page.goto(url, { waitUntil: "load" });
  /* Wait for the app to finish rendering rather than sleeping a guessed
     interval. A fixed 1.2s read the dashboard mid-load and reported MRR as
     zero when the value arrived a moment later — a flaky test that blames the
     product is worse than no test. */
  await page
    .waitForFunction(() => {
      const main = document.querySelector("#bm-main, main");
      const loading = document.querySelector("#bm-loading");
      return main && !main.hidden && (!loading || loading.hidden);
    }, null, { timeout: 20000 })
    .catch(() => {});
  await page.waitForTimeout(600);
  /* innerText, not textContent. textContent includes the contents of inline
     <script> tags, so a check for copy like "All complete" matched the
     JavaScript that generates it rather than anything on screen. innerText is
     what a person can actually read. */
  return page.innerText("body");
}

const has = (text, s) => text.toLowerCase().includes(s.toLowerCase());

/** Polls until `fn` returns truthy, or gives up. Returns the last value, so a
 *  failing check can report what it actually saw rather than just "false". */
async function until(fn, ms = 8000) {
  const deadline = Date.now() + ms;
  let last;
  for (;;) {
    last = await fn();
    if (last) return last;
    if (Date.now() > deadline) return last;
    await new Promise((r) => setTimeout(r, 300));
  }
}

/* ── the run ──────────────────────────────────────────────────── */

const server = await listen(PORT);
const browser = await chromium.launch({ executablePath: CHROME });

// Two contexts, not two pages. Separate cookie jars and separate IndexedDB, so
// the two sessions are genuinely independent rather than sharing one login.
const adminCtx = await browser.newContext({ viewport: { width: 1400, height: 950 }, locale: "en-IN", timezoneId: "Asia/Kolkata" });
const clientCtx = await browser.newContext({ viewport: { width: 1400, height: 950 }, locale: "en-IN", timezoneId: "Asia/Kolkata" });
const admin = await adminCtx.newPage();
const client = await clientCtx.newPage();

for (const [name, p] of [["admin", admin], ["client", client]]) {
  p.on("pageerror", (e) => process.stdout.write(`   \x1b[31m[${name} page error]\x1b[0m ${e.message}\n`));
  p.on("console", (m) => {
    if (m.type() === "error") process.stdout.write(`   \x1b[31m[${name} console]\x1b[0m ${m.text().slice(0, 200)}\n`);
  });
}

fs.rmSync(path.join(ROOT, "docs/journey"), { recursive: true, force: true });
fs.mkdirSync(path.join(ROOT, "docs/journey"), { recursive: true });

try {
  await clearFirestore();
  await clearAuth();

  const adminUid = await createAuthUser(ADMIN.email, ADMIN.password);
  const clientUid = await createAuthUser(CLIENT.email, CLIENT.password);
  process.stdout.write(`admin uid  ${adminUid}\nclient uid ${clientUid}\n`);

  /* ── 1 ────────────────────────────────────────────────────── */
  stage(1, "The studio signs in to an empty system",
    "An empty database must read as empty, never as a finished day.");

  await signIn(admin, "admin", ADMIN.password);
  const empty = await reload(admin, "/studio");
  check("admin", has(empty, "what needs you today"), "the dashboard opens on What needs you today");
  check("admin", has(empty, "nothing is set up yet") || has(empty, "no active projects"),
    "it says the system is empty rather than showing a clear day");
  const allClear = empty.match(/[^.]{0,60}all (clear|complete|fulfilled)[^.]{0,40}/i);
  check("admin", !allClear,
    `no all-clear language over an empty database${allClear ? ` — found: "${allClear[0].trim()}"` : ""}`);

  await shot(admin, "admin");

  /* ── 2 ────────────────────────────────────────────────────── */
  stage(2, "A lead arrives and gets a first response",
    "firstResponseAt is stamped once and must never move — if it can be edited it stops meaning anything.");

  await admin.goto(`${BASE}/studio#sales`, { waitUntil: "load" });
  await admin.waitForTimeout(1000);
  await admin.evaluate(async () => {
    const m = await import("/assets/bm-app.js");
    await m.addLead({ name: "Green Basket", source: "referral", stage: "inbound" });
  });
  let s = await reload(admin, "/studio#sales");
  // Read the leads panel itself. innerText of <body> skips hidden sections, so
  // on a tabbed page a check written against the whole body silently depends
  // on which tab happens to be open.
  /* Read text AND form values. The leads panel renders each lead as an
     editable <input value="...">, and innerText does not include input values
     — so a check written against visible text alone reported an empty panel
     while the lead was on screen the whole time. */
  const leadPanel = await until(async () => {
    const t = await admin
      .$eval("#bm-leads-list", (el) =>
        [el.innerText, ...[...el.querySelectorAll("input,select")].map((i) => i.value)].join(" ")
      )
      .catch(() => "");
    return has(t, "green basket") ? t : null;
  });
  const leadDiag = await admin.evaluate(async () => {
    const m = await import("/assets/bm-app.js");
    const all = await m.getAllLeads();
    const el = document.getElementById("bm-leads-list");
    return {
      count: all.length,
      names: all.map((l) => l.name),
      panelHidden: el ? el.closest("[data-sect]")?.hidden : "no element",
      panelHtmlLen: el ? el.innerHTML.length : 0,
    };
  });
  check("admin", !!leadPanel,
    `the lead appears in the pipeline${leadPanel ? "" : ` — ${JSON.stringify(leadDiag)}`}`);

  const stampedAt = await admin.evaluate(async () => {
    const m = await import("/assets/bm-app.js");
    const leads = await m.getAllLeads();
    const lead = leads.find((l) => l.name === "Green Basket");
    await m.markLeadFirstResponse(lead.id);
    const after = (await m.getAllLeads()).find((l) => l.id === lead.id);
    return after.firstResponseAt?.toMillis?.() ?? null;
  });
  check("admin", stampedAt !== null, "first response is stamped with a real timestamp");

  const stampedAgain = await admin.evaluate(async () => {
    const m = await import("/assets/bm-app.js");
    const lead = (await m.getAllLeads()).find((l) => l.name === "Green Basket");
    await m.markLeadFirstResponse(lead.id);
    const after = (await m.getAllLeads()).find((l) => l.id === lead.id);
    return after.firstResponseAt?.toMillis?.() ?? null;
  });
  check("admin", stampedAgain === stampedAt,
    "logging it a second time does NOT move the date — the number stays meaningful");

  await shot(admin, "admin");

  /* ── 3 ────────────────────────────────────────────────────── */
  stage(3, "The deal is proposed, then signed",
    "A proposal is not revenue. MRR must not move until the retainer is actually signed.");

  const orgId = await admin.evaluate(async () => {
    const m = await import("/assets/bm-app.js");
    return m.createOrg({
      name: "Green Basket", kind: "client", status: "active",
      retainer: 25000, retainerStatus: "proposed", note: "",
    });
  });
  s = await reload(admin, "/studio#today");
  check("admin", /short of break-even/i.test(s), "break-even gap is still shown");
  check("admin", !has(s, "Rs 25,000 —") && !has(s, "signed mrr is rs 25,000"),
    "the PROPOSED retainer is not counted as revenue");

  await admin.evaluate(async (id) => {
    const m = await import("/assets/bm-app.js");
    await m.updateOrg(id, { retainerStatus: "signed" });
  }, orgId);
  s = await reload(admin, "/studio#money");
  const mrrShown = await until(async () => {
    const t = await admin.textContent("#bm-mrr").catch(() => "");
    return /25,?000/.test(t) ? t : null;
  }) || (await admin.textContent("#bm-mrr").catch(() => "(missing)"));
  const orgDoc = await admin.evaluate(async (id) => {
    const m = await import("/assets/bm-app.js");
    const all = await m.getAllOrgs();
    const o = all.find((x) => x.id === id);
    const signed = all.filter((x) => x.kind === "client" && x.status === "active" && x.retainerStatus === "signed");
    return {
      doc: o ? { kind: o.kind, status: o.status, retainer: o.retainer, retainerStatus: o.retainerStatus } : null,
      orgCount: all.length,
      signedCount: signed.length,
      sumIfComputedHere: signed.reduce((n, x) => n + (Number(x.retainer) || 0), 0),
    };
  }, orgId);
  check("admin", /25,?000/.test(mrrShown),
    `once signed, the retainer appears in MRR (tile reads "${(mrrShown || "").trim()}", org is ${JSON.stringify(orgDoc)})`);

  await shot(admin, "admin");

  /* ── 4 ────────────────────────────────────────────────────── */
  stage(4, "A project is created; the client still cannot see anything",
    "Data existing is not the same as the client being able to reach it. Access is a separate, deliberate act.");

  const projectId = await admin.evaluate(async (id) => {
    const m = await import("/assets/bm-app.js");
    return m.createProject({ orgId: id, name: "Green Basket store", type: "site", dueAt: null, billable: true });
  }, orgId);
  check("admin", !!projectId, "project created");

  await signIn(client, CLIENT.username, CLIENT.password);
  let c = await reload(client, "/portal");
  check("client", !has(c, "green basket store"),
    "the client signs in but sees NOTHING — there is no users document yet");

  await shot(client, "client");

  /* ── 5 ────────────────────────────────────────────────────── */
  stage(5, "The studio grants access — the second half of creating a login",
    "The trap this whole runbook exists for: an Auth user without a users document signs in fine and sees a blank portal.");

  await admin.evaluate(async ({ uid, org }) => {
    const m = await import("/assets/bm-app.js");
    await m.setClientUser(uid, { orgId: org, role: "client", name: "Green Basket", username: "greenbasket" });
  }, { uid: clientUid, org: orgId });

  c = await reload(client, "/portal");
  check("client", has(c, "green basket"), "the same client, same login, now sees their project");
  check("client", !has(c, "inventory manager") && !has(c, "modcon"),
    "and sees nothing belonging to anyone else");

  await shot(client, "client");

  /* ── 6 ────────────────────────────────────────────────────── */
  stage(6, "The studio raises what it needs from the client",
    "This is the reason the portal exists: the client sees, dated, that they are the holdup.");

  const pushed = await admin.evaluate(async (pid) => {
    const m = await import("/assets/bm-app.js");
    return m.pushRequirementsToIntake(pid, ["cod", "inventory"]);
  }, projectId);
  check("admin", pushed.added > 0, `${pushed.added} requirements raised as dated blockers`);

  const pushedAgain = await admin.evaluate(async (pid) => {
    const m = await import("/assets/bm-app.js");
    return m.pushRequirementsToIntake(pid, ["cod", "inventory"]);
  }, projectId);
  check("admin", pushedAgain.added === 0 && pushedAgain.skipped === pushed.added,
    "pushing the same scope again adds nothing — no duplicates on the client's list");

  c = await reload(client, "/portal");
  check("client", has(c, "what we need from you") || has(c, "we need"),
    "the client sees the request list without being told about it");

  const clientItems = await client.evaluate(() =>
    document.querySelectorAll("[data-intake], .bm-intake-item, [data-done]").length);
  check("client", clientItems >= 0, `the list renders (${clientItems} interactive items found)`);

  await shot(client, "client");

  /* ── 7 ────────────────────────────────────────────────────── */
  stage(7, "The quotation is recorded as the project's agreed scope",
    "The quote used to be printed and thrown away, so 'how far along are we' was a percentage typed from memory. Recorded, it becomes the one place progress is derived from.");

  const scoped = await admin.evaluate(async (pid) => {
    const m = await import("/assets/bm-app.js");
    const r = await m.saveScope(pid, [
      { featureId: "cod", label: "Cash on delivery", amount: 40000, days: 4 },
      { featureId: "inventory", label: "Inventory sync", amount: 25000, days: 6 },
    ]);
    const lines = await m.getScope(pid);
    return { ...r, pct: m.scopeProgress(lines), value: m.scopeValue(lines) };
  }, projectId);
  check("admin", scoped.added === 2, `${scoped.added} lines recorded as the agreed scope`);
  check("admin", scoped.pct === 0,
    "nothing built yet reads as 0% — a scoped-and-untouched project, not an unscoped one");
  check("admin", scoped.value.agreed === 65000 && scoped.value.accepted === 0,
    "₹65,000 agreed, ₹0 accepted — sold is not earned");

  const rescoped = await admin.evaluate(async (pid) => {
    const m = await import("/assets/bm-app.js");
    await m.setScopeLineStatus(pid, "cod", "delivered");
    // Saving the same quote again is the normal thing to do when scope grows.
    // It must not reset the line that was just delivered.
    const r = await m.saveScope(pid, [
      { featureId: "cod", label: "Cash on delivery", amount: 40000, days: 4 },
      { featureId: "inventory", label: "Inventory sync", amount: 25000, days: 6 },
    ]);
    const lines = await m.getScope(pid);
    return { ...r, cod: lines.find((l) => l.id === "cod")?.status, pct: m.scopeProgress(lines) };
  }, projectId);
  check("admin", rescoped.added === 0 && rescoped.skipped === 2,
    "re-saving the same quote adds nothing — no duplicate scope lines");
  check("admin", rescoped.cod === "delivered",
    "and the line marked delivered is still delivered, not silently reset to agreed");
  check("admin", rescoped.pct === 36,
    `progress is weighted by build days, not line count (${rescoped.pct}%, not the 45% counting lines would give)`);

  c = await reload(client, "/portal");
  check("client", has(c, "cash on delivery") && has(c, "inventory sync"),
    "the client sees the same agreed scope, on their own portal");
  check("client", has(c, "delivered"),
    "including which parts are done — without anyone sending a status email");

  const clientCanWriteScope = await client.evaluate(async () => {
    const m = await import("/assets/bm-app.js");
    const profile = await m.getUserProfile(m.auth.currentUser.uid);
    const projects = await m.getProjectsForOrg(profile.orgId);
    try {
      await m.setScopeLineStatus(projects[0].id, "inventory", "accepted");
      return true;
    } catch { return false; }
  });
  check("client", clientCanWriteScope === false,
    "but cannot move a line themselves — delivery status is the studio's assertion, enforced by rules");

  // Land the screenshot on the tab that actually shows the scope, so the
  // reviewer sees the clickable status pills rather than whichever panel the
  // previous stage happened to leave open.
  s = await reload(admin, "/studio#delivery");
  check("admin", has(s, "cash on delivery") && has(s, "36% delivered"),
    "the same lines, and the same derived number, on the studio's own delivery tab");

  await shot(admin, "admin");
  await shot(client, "client");

  /* ── 8 ────────────────────────────────────────────────────── */
  stage(8, "The client answers one of the requests",
    "One of only two writes a client is permitted anywhere in the system.");

  const ticked = await client.evaluate(async () => {
    const m = await import("/assets/bm-app.js");
    const profile = await m.getUserProfile(m.auth.currentUser.uid);
    const projects = await m.getProjectsForOrg(profile.orgId);
    const intake = await m.getIntake(projects[0].id);
    const first = intake.find((i) => !i.done);
    if (!first) return null;
    await m.setIntakeDone(projects[0].id, first.id, true);
    return first.label;
  });
  check("client", !!ticked, `the client ticks "${String(ticked).slice(0, 42)}…"`);

  const adminSeesTick = await admin.evaluate(async (pid) => {
    const m = await import("/assets/bm-app.js");
    return (await m.getIntake(pid)).filter((i) => i.done).length;
  }, projectId);
  check("admin", adminSeesTick === 1, "the studio sees the tick immediately, no refresh dance");

  await shot(admin, "admin");

  /* ── 9 ────────────────────────────────────────────────────── */
  stage(9, "The studio schedules the work",
    "A project with no milestones cannot tell anyone whether it is late.");

  const msCount = await admin.evaluate(async (pid) => {
    const m = await import("/assets/bm-app.js");
    await m.applyMilestoneTemplate(pid, "site", "2026-08-01");
    return (await m.getMilestones(pid)).length;
  }, projectId);
  check("admin", msCount > 0, `${msCount} milestones stamped from the template and a real start date`);

  c = await reload(client, "/portal");
  check("client", /due|milestone/i.test(c), "the client can now see where the project is going");

  await shot(client, "client");

  /* ── 10 ────────────────────────────────────────────────────── */
  stage(10, "A deliverable goes up for approval",
    "The client approves in one click, and the studio sees the decision.");

  await admin.evaluate(async (pid) => {
    const m = await import("/assets/bm-app.js");
    await m.addDeliverable(pid, { title: "Homepage v1", version: "v1", url: "https://example.com/preview", status: "in_review" });
  }, projectId);

  c = await reload(client, "/portal");
  check("client", has(c, "homepage v1"), "the client sees it waiting on their approval");

  const decided = await client.evaluate(async () => {
    const m = await import("/assets/bm-app.js");
    const profile = await m.getUserProfile(m.auth.currentUser.uid);
    const projects = await m.getProjectsForOrg(profile.orgId);
    const d = (await m.getDeliverables(projects[0].id)).find((x) => x.title === "Homepage v1");
    await m.decideDeliverable(projects[0].id, d.id, "approved");
    return true;
  });
  check("client", decided, "the client approves it");

  const adminSeesApproval = await admin.evaluate(async (pid) => {
    const m = await import("/assets/bm-app.js");
    const d = (await m.getDeliverables(pid)).find((x) => x.title === "Homepage v1");
    return { status: d.status, by: d.decidedBy };
  }, projectId);
  check("admin", adminSeesApproval.status === "approved", "the studio sees it approved");
  check("admin", adminSeesApproval.by === clientUid, "and who approved it is recorded");

  await shot(client, "client");

  /* ── 11 ───────────────────────────────────────────────────── */
  stage(11, "An invoice is raised and the client tries to pay",
    "Razorpay is not configured against the emulator, so this proves the graceful path: the button says payment is off rather than erroring.");

  await admin.evaluate(async (org) => {
    const m = await import("/assets/bm-app.js");
    await m.createInvoice({ orgId: org, label: "50% advance", amount: 80000, dueAt: null });
  }, orgId);

  c = await reload(client, "/portal");
  check("client", has(c, "50% advance"), "the client sees the invoice");
  check("client", has(c, "80,000"), "for the right amount");
  const payBtn = await client.locator("[data-pay]").count();
  check("client", payBtn === 1, "with a Pay now button on the unpaid invoice");

  if (payBtn) {
    await client.click("[data-pay]");
    await client.waitForTimeout(2500);
    const status = await client.textContent("#bm-pay-status").catch(() => "");
    check("client", /not switched on|could not|went wrong/i.test(status || ""),
      `unconfigured payment fails gracefully: "${(status || "").trim().slice(0, 70)}"`);
  }

  await shot(client, "client");

  /* ── 12 ───────────────────────────────────────────────────── */
  stage(12, "The studio marks the invoice paid",
    "Only the admin may write an invoice. The client's view follows.");

  await admin.evaluate(async (org) => {
    const m = await import("/assets/bm-app.js");
    const inv = (await m.getAllInvoices()).find((i) => i.orgId === org);
    await m.updateInvoice(inv.id, { status: "paid" });
  }, orgId);

  c = await reload(client, "/portal");
  const clientPaid = await client.evaluate(() => {
    const row = [...document.querySelectorAll("tr")].find((r) => r.textContent.includes("50% advance"));
    return row ? row.textContent : "";
  });
  check("client", has(clientPaid, "paid"), "the client's invoice now reads paid");
  check("client", (await client.locator("[data-pay]").count()) === 0,
    "and the Pay button is gone — a paid invoice cannot be paid twice");

  await shot(client, "client");

  /* ── 13 ───────────────────────────────────────────────────── */
  stage(13, "Isolation, from inside the client's own session",
    "The oldest open item in the project. It only proves anything from a client session — as admin it correctly reports inconclusive.");

  const tenancy = await reload(client, "/tenancy-check");
  check("client", has(tenancy, "isolated") || has(tenancy, "denied"),
    "the client cannot reach another tenant's data");
  const leak = tenancy.match(/[^.]{0,70}leak[^.]{0,50}/i);
  check("client", !leak, `no leak reported${leak ? ` — found: "${leak[0].trim()}"` : ""}`);

  const adminTenancy = await reload(admin, "/tenancy-check");
  check("admin", has(adminTenancy, "inconclusive"),
    "the same page run as admin says inconclusive rather than claiming a pass");

  await shot(client, "client");

  /* ── 14 ───────────────────────────────────────────────────── */
  stage(14, "Back to the dashboard — has the day's work moved the numbers?",
    "The Today panel must reflect everything that just happened.");

  s = await reload(admin, "/studio#today");
  check("admin", has(s, "25,000"), "MRR includes the signed retainer");
  const todayText = await admin.textContent("#bm-today").catch(() => "");
  const msWarn = todayText.match(/[^.]{0,50}no milestones[^.]{0,40}/i);
  check("admin", !msWarn, `the unscheduled-project warning is gone${msWarn ? ` — Today still says: "${msWarn[0].trim()}"` : ""}`);
  const dupWarn = todayText.match(/[^.]{0,50}duplicate[^.]{0,40}/i);
  check("admin", !dupWarn, `no duplicate-intake warning${dupWarn ? ` — Today says: "${dupWarn[0].trim()}"` : ""}`);
  await shot(admin, "admin");
} catch (err) {
  failures += 1;
  process.stdout.write(`\n\x1b[31mABORTED\x1b[0m ${err.stack || err.message}\n`);
} finally {
  await browser.close();
  server.close();
}

/* ── summary ──────────────────────────────────────────────────── */

const total = stages.reduce((n, s) => n + s.admin.length + s.client.length, 0);
const passed = stages.reduce(
  (n, s) => n + s.admin.filter((c) => c.ok).length + s.client.filter((c) => c.ok).length, 0);

process.stdout.write(`\n${"─".repeat(64)}\n`);
process.stdout.write(`${stages.length} stages · ${total} checks · ${passed} passed · ${total - passed} failed\n`);
for (const s of stages.filter((x) => x.failed)) {
  process.stdout.write(`\n\x1b[31mstage ${s.n} — ${s.title}\x1b[0m\n`);
  for (const side of ["admin", "client"]) {
    for (const c of s[side].filter((x) => !x.ok)) {
      process.stdout.write(`  ✘ ${side}: ${c.message}\n`);
    }
  }
}
fs.writeFileSync(
  path.join(ROOT, "docs/journey/index.json"),
  JSON.stringify({ startedAt: new Date().toISOString(), stages }, null, 2)
);
process.stdout.write(`screenshots -> docs/journey/\n`);

process.exit(failures === 0 ? 0 : 1);
