#!/usr/bin/env node
/**
 * THE STUDIO CRM, DRIVEN LIKE A PERSON.
 *
 *   bash tests/run-admin-ui.sh
 *
 * The journey suite proves the studio and the portal agree about the data. It
 * cannot answer the complaint that produced this screen — "very complex, I'm
 * unable to understand anything" — because correct data renders identically to
 * unreadable data.
 *
 * So this asks usability questions and answers them by clicking:
 *
 *   1. does an EMPTY system say it is empty, rather than showing a clear day?
 *   2. is each of the six views isolated, or do panels bleed across?
 *   3. is every visible control big enough to hit and dark enough to read?
 *   4. does clicking a record actually open that record?
 *   5. does the invoice ledger exist at all? (it did not, before this)
 *   6. IS THE CRM STILL USABLE WITH THE MOTION SCRIPT BLOCKED?
 *
 * (1) and (6) are the two that have historically been wrong, and they are the
 * two that look fine on the machine that built them.
 *
 * View isolation gets its own section because it was broken once already:
 * hiding by the `hidden` attribute loses to any class carrying a `display:`,
 * and `.bm-stats { display: grid }` won, so the Money row sat on every tab. A
 * test asserting "the Money panel is on Money" would have passed the whole
 * time. This asserts the inverse — that it is NOWHERE ELSE.
 *
 * Emulators only. bm-app.js connects to them exclusively from localhost, so
 * this cannot touch production.
 */

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { listen } from "./serve.mjs";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const PORT = Number(process.env.PORT || 5177);
const BASE = `http://127.0.0.1:${PORT}`;
const PROJECT = process.env.GCLOUD_PROJECT || "brandmintstudios-a5eb7";
const FS = "http://127.0.0.1:8080";
const AUTH = "http://127.0.0.1:9099";
const ADMIN = { email: "admin@brandmintstudios.in", password: "adminpass123" };

const SHOTS = path.join(ROOT, "docs/admin-ui");
fs.mkdirSync(SHOTS, { recursive: true });

/* The sidebar sections, in order. Delivery folded into the client record and
   Access into the client it belongs to.

   ACTIVITY IS NOT HERE ANY MORE. It was taken out of the sidebar at the
   owner's request — an audit log is genuinely useful the day something goes
   wrong and clutter every other day. The VIEW still exists and everything this
   suite asserted about it still runs; it is reached through the command
   palette instead, by goActivity() below.

   That is deliberately not a hash hack. Going through the palette means this
   suite PROVES the log is still reachable rather than trusting the claim —
   which matters, because removing the only route to an append-only record
   while saying it is still reachable would be exactly the kind of thing the
   record exists to catch. */
const VIEWS = ["today", "pipeline", "updates", "clients", "money"];

let pass = 0;
let fail = 0;
const failures = [];

function check(ok, what, detail = "") {
  if (ok) {
    pass += 1;
    process.stdout.write(`  \x1b[32m✔\x1b[0m ${what}\n`);
  } else {
    fail += 1;
    failures.push(what + (detail ? ` — ${detail}` : ""));
    process.stdout.write(`  \x1b[31m✘\x1b[0m ${what}${detail ? `\n      ${detail}` : ""}\n`);
  }
}
const section = (t) => process.stdout.write(`\n\x1b[1m${t}\x1b[0m\n`);

/* ── emulator setup ───────────────────────────────────────────── */

async function clearAll() {
  await fetch(`${FS}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: "DELETE" });
  await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: "DELETE" });
}

async function createAuthUser(email, password) {
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
  for (;;) {
    if (!page.url().includes("/login")) break;
    const refusal = await page
      .$eval("#bm-login-status", (el) => (el.hidden ? null : el.textContent.trim()))
      .catch(() => null);
    if (refusal) throw new Error(`sign-in refused: ${refusal}`);
    if (Date.now() > deadline) throw new Error("sign-in never completed");
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(1200);
}

async function goStudio(page, hash = "today") {
  await page.goto(`${BASE}/studio?t=${Date.now()}#${hash}`, { waitUntil: "load" });
  await page
    .waitForFunction(() => {
      const l = document.querySelector("#bm-loading");
      const v = document.querySelector(".bm-view:not([hidden])");
      return l && l.hidden && v && v.innerHTML.trim().length > 0;
    }, null, { timeout: 20000 })
    .catch(() => {});
  await page.waitForTimeout(800);
}

/** Open the Activity view the way a person now has to: the command palette.
 *  Asserts nothing itself — a failure here surfaces as the activity checks
 *  failing, which is the honest place for it to show up. */
async function goActivity(page) {
  await page.keyboard.press("/");
  await page.waitForSelector("#bm-cmd-input", { timeout: 10000 });
  await page.fill("#bm-cmd-input", "activity");
  await page.waitForTimeout(400);
  await page.click(".bm-cmd-item");
  await page.waitForTimeout(1500);
}

/** Only the elements a person can actually see. */
const VISIBLE = (sel) => `[...document.querySelectorAll(${JSON.stringify(sel)})].filter((e) => {
  const r = e.getBoundingClientRect();
  const cs = getComputedStyle(e);
  return r.width > 1 && r.height > 1 && cs.visibility !== "hidden" && cs.display !== "none";
})`;

/** Contrast, computed from what the browser actually painted — not from the
 *  stylesheet. Walks up for the first non-transparent background, which is the
 *  step that catches a control inheriting a surface it was not designed for. */
const CONTRAST_FN = `
  window.__lum = (c) => {
    const s = c.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
  };
  window.__rgb = (str) => (str.match(/[\\d.]+/g) || []).slice(0, 3).map(Number);
  window.__bg = (el) => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const c = getComputedStyle(n).backgroundColor;
      const a = (c.match(/[\\d.]+/g) || [])[3];
      if (c && c !== "transparent" && a !== "0") return window.__rgb(c);
    }
    return window.__rgb(getComputedStyle(document.body).backgroundColor || "rgb(255,255,255)");
  };
  window.__ratio = (el) => {
    const fg = window.__rgb(getComputedStyle(el).color);
    const bg = window.__bg(el);
    const a = window.__lum(fg), b = window.__lum(bg);
    const [hi, lo] = a > b ? [a, b] : [b, a];
    return (hi + 0.05) / (lo + 0.05);
  };
`;

/* ── run ──────────────────────────────────────────────────────── */

const server = await listen(PORT);
const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error" && !/ERR_CONNECTION_RESET|favicon|fonts\.g/.test(m.text())) {
    consoleErrors.push(m.text());
  }
});
page.on("dialog", (d) => d.accept());

try {
  await clearAll();
  await createAuthUser(ADMIN.email, ADMIN.password);
  await signIn(page);

  /* ── 1. an empty system must say so ─────────────────────────── */
  section("1. An EMPTY system says it is empty, not that the day is clear");
  {
    await goStudio(page, "today");
    const body = await page.evaluate(`document.querySelector("#view-today").innerText`);
    check(/nothing is set up yet/i.test(body),
      "empty database → 'Nothing is set up yet'",
      body.slice(0, 160).replace(/\s+/g, " "));
    check(!/nothing is waiting on you/i.test(body),
      "and NOT 'nothing is waiting on you' — empty is not done");
    check(/no invoices raised yet|empty, not settled/i.test(body),
      "the unpaid tile says it is empty rather than showing a reassuring Rs 0");

    /* The audit log at the one moment it is genuinely empty — nothing has been
       done yet. Checked here rather than later because seeding is itself a
       logged action, so by section 8 the log correctly has an entry in it. */
    await goActivity(page);
    const log0 = await page.evaluate(`document.querySelector("#view-activity").innerText`);
    check(/no entries yet/i.test(log0), "an empty log says it is empty", log0.slice(0, 130).replace(/\s+/g, " "));
    check(/cannot reconstruct|not claiming nothing did/i.test(log0),
      "and does not let an empty log read as a quiet week");
    check(!/not published|permission/i.test(log0),
      "the rules ARE live against the emulator, so it is not showing the denied message");
    await page.click('[data-view="today"]');
    await page.waitForTimeout(300);
  }

  /* ── seed, then everything else runs against real rows ──────── */
  await page.click("#bm-seed");
  await page.waitForTimeout(2500);
  await goStudio(page, "today");

  /* ── 2. the landing answers one question ────────────────────── */
  section("2. Today answers one question and attaches the thing to click");
  {
    const h = await page.evaluate(`document.querySelector("#view-today h2")?.innerText || ""`);
    check(/good (morning|afternoon|evening)/i.test(h), "greets by time of day", h);

    const rows = await page.evaluate(`${VISIBLE("#bm-today-list .bm-listrow")}.length`);
    check(rows > 0, `the action list has ${rows} actionable row(s)`);

    const tiles = await page.evaluate(`${VISIBLE(".bm-tile")}.length`);
    check(tiles === 4, `four headline tiles (got ${tiles})`);

    const crumb = await page.evaluate(`document.querySelector("#bm-crumb").innerText`);
    check(crumb === "Today", "the topbar names where you are", crumb);
  }

  /* ── 3. view isolation, asked as the inverse ────────────────── */
  section("3. Each view is isolated — no panel bleeds into another");
  {
    for (const v of VIEWS) {
      await page.click(`[data-view="${v}"]`);
      await page.waitForTimeout(450);

      const leaked = await page.evaluate(`
        [...document.querySelectorAll(".bm-view")]
          .filter((s) => s.id !== "view-${v}")
          .filter((s) => { const r = s.getBoundingClientRect(); return r.width > 1 && r.height > 1; })
          .map((s) => s.id)
      `);
      check(leaked.length === 0, `${v}: no other view is on screen`, leaked.join(", "));

      const mine = await page.evaluate(`(() => {
        const s = document.querySelector("#view-${v}");
        const r = s.getBoundingClientRect();
        return r.width > 1 && r.height > 1 && s.innerText.trim().length > 20;
      })()`);
      check(mine, `${v}: its own view is on screen and has content`);

      const hash = await page.evaluate("location.hash");
      check(hash === `#${v}`, `${v}: the URL follows, so a reload keeps you here`, hash);
    }
  }

  /* ── 4. every control is hittable and readable ──────────────── */
  section("4. Every visible control clears 30px and 4.5:1, measured in the browser");
  {
    await page.evaluate(CONTRAST_FN);
    for (const v of VIEWS) {
      await page.click(`[data-view="${v}"]`);
      await page.waitForTimeout(400);
      await page.evaluate(CONTRAST_FN);

      const bad = await page.evaluate(`(() => {
        const out = [];
        for (const el of ${VISIBLE("button, a, select, input, summary")}) {
          const r = el.getBoundingClientRect();
          const id = el.id || el.className || el.tagName;
          const label = (el.innerText || el.value || el.getAttribute("aria-label") || "").trim().slice(0, 26);
          // Checkboxes are drawn by the UA at a fixed size; their LABEL is the
          // hit target and is measured separately as its own element.
          if (el.type === "checkbox") continue;
          if (r.height < 30) out.push({ why: "height " + Math.round(r.height) + "px", id, label });
          else if (el.innerText && el.innerText.trim()) {
            const ratio = window.__ratio(el);
            if (ratio < 4.5) out.push({ why: ratio.toFixed(2) + ":1", id, label });
          }
        }
        return out;
      })()`);
      check(bad.length === 0, `${v}: all controls pass`,
        bad.slice(0, 4).map((b) => `${b.why} on "${b.label}" (${b.id})`).join(" | "));
    }
  }

  /* ── 5. clicking a record opens that record ────────────────── */
  section("5. A record list opens the record you clicked");
  {
    await page.click('[data-view="clients"]');
    await page.waitForTimeout(450);

    const first = await page.evaluate(`(() => {
      const b = document.querySelector("#bm-client-list .bm-listrow[data-org]");
      return b ? b.querySelector(".bm-listrow-title").innerText.trim() : null;
    })()`);
    check(!!first, "the client list has a clickable row", String(first));

    await page.click("#bm-client-list .bm-listrow[data-org]");
    await page.waitForTimeout(600);

    const drawerTitle = await page.evaluate(`document.querySelector(".bm-drawer h3")?.innerText.trim() || null`);
    check(drawerTitle === first, "the drawer opens on the client you clicked", `${drawerTitle} vs ${first}`);

    /* Case-insensitive on purpose. These headings carry `text-transform:
       uppercase`, and Chrome's innerText returns the RENDERED text — so an
       exact-case check here tests the stylesheet, not the content. An earlier
       version did exactly that and "Retainer" passed only by coincidence,
       matching the onboarding step label further down the drawer. */
    const drawerText = (await page.evaluate(`document.querySelector(".bm-drawer")?.innerText || ""`)).toLowerCase();

    /* SEVEN SECTIONS, and the list changed on purpose.
       This used to assert Retainer / Onboarding / Projects / Invoices / Portal
       login — the ELEVEN-section record. The owner's verdict on that was "you
       didn't even restructure anything", and he was right: three passes had
       added panels to a record already too long.

       The seven below are his own list in his own order. "Onboarding" and the
       seven-stage strip are deliberately GONE, not renamed: every stage they
       narrated is visible as the state of the control that sets it, and a
       panel restating it was the third telling of one story.

       Asserting the old headings here would have kept the suite green while
       the screen it describes no longer existed, which is worse than no test. */
    /* "Care plan" rather than "Retainer": the studio now sells three named
       monthly plans, and the amount alone cannot answer whether a request is
       included work or a change order. */
    for (const want of ["Quote & price", "Signed", "Portal login", "Paid", "Care plan", "Updates", "Links"]) {
      check(drawerText.includes(want.toLowerCase()), `the client record shows "${want}"`);
    }
    check(!/onboarding/.test(drawerText),
      "and the onboarding checklist is GONE — it told the same story a third time");
    check(/signed|proposed|none/.test(drawerText), "and states the retainer status explicitly");

    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    const gone = await page.evaluate(`!document.querySelector(".bm-drawer")`);
    check(gone, "Escape closes the drawer");
  }

  /* ── 6. the project drawer is the whole working surface ────── */
  section("6. Projects open from the client, and carry the whole job");
  {
    await page.click('[data-view="clients"]');
    await page.waitForTimeout(450);
    await page.click("#bm-client-list .bm-listrow[data-org]");
    await page.waitForTimeout(700);
    const has = await page.evaluate(`!!document.querySelector(".bm-drawer .bm-listrow[data-project]")`);
    check(has, "a client's projects are listed inside their own record");

    if (has) {
      await page.click(".bm-drawer .bm-listrow[data-project]");
      await page.waitForTimeout(600);
      const t = (await page.evaluate(`document.querySelector(".bm-drawer")?.innerText || ""`)).toLowerCase();
      for (const want of ["Agreed scope", "Milestones", "What we need from the client", "Deliverables"]) {
        check(t.includes(want.toLowerCase()), `the project drawer shows "${want}"`);
      }
      check(!/\bprogress\b\s*%/i.test(t) && !t.includes("% done"),
        "there is no typed progress field — progress is derived from scope");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(450);
    }
  }

  /* ── 7. the invoice ledger, which did not exist before ─────── */
  section("7. Money shows every invoice — the ledger the old screen never had");
  {
    await page.click('[data-view="money"]');
    await page.waitForTimeout(500);
    const rows = await page.evaluate(`${VISIBLE("#bm-inv-list .bm-listrow")}.length`);
    check(rows > 0, `the ledger lists ${rows} invoice row(s)`);
    const text = await page.evaluate(`document.querySelector("#view-money").innerText`);
    check(/paid|due|overdue/i.test(text), "each row states paid, due or overdue");
    check(/signed mrr/i.test(text) && /still owed/i.test(text) && /collected/i.test(text),
      "MRR, what is still owed and what has actually been collected are three separate figures");
  }

  /* ── 8. the audit log ──────────────────────────────────────── */
  section("8. The audit log records what just happened, and says so honestly when empty");
  {
    // Seeding is itself a logged action, so by now there is already an entry.
    await goActivity(page);
    const before = await page.evaluate(`document.querySelector("#bm-activity-list").innerText`);
    check(/db\.seed/i.test(before), "seeding the database was itself recorded",
      before.slice(0, 130).replace(/\s+/g, " "));

    // Now do something worth logging: mark an invoice paid by hand.
    await page.click('[data-view="money"]');
    await page.waitForTimeout(500);
    const hadUnpaid = await page.evaluate(`!!document.querySelector("[data-inv-record]")`);
    check(hadUnpaid, "there is an invoice to record a payment against");

    if (hadUnpaid) {
      /* Record a PART payment first — half of whatever the invoice is for —
         so the three-state ledger is exercised, not just all-or-nothing. */
      await page.click("[data-inv-record]");
      await page.waitForSelector("#f-pay-amount", { timeout: 8000 });
      const full = Number(await page.inputValue("#f-pay-amount"));
      await page.fill("#f-pay-amount", String(Math.round(full / 2)));
      await page.waitForTimeout(300);
      const partPreview = await page.evaluate(`document.querySelector("#f-pay-preview").innerText`);
      check(/outstanding/i.test(partPreview), "a part payment says what will be left", partPreview);
      await page.click('.bm-modal button[type="submit"]');
      await page.waitForTimeout(2200);

      const ledger = await page.evaluate(`document.querySelector("#bm-inv-list").innerText`);
      check(/left/i.test(ledger), "the ledger shows the remaining balance, not 'paid'",
        ledger.slice(0, 140).replace(/\s+/g, " "));
      check(/received/i.test(ledger), "and states how much has actually arrived");

      // Now settle it in full.
      await page.click("[data-inv-record]");
      await page.waitForSelector("#f-pay-amount", { timeout: 8000 });
      await page.fill("#f-pay-amount", String(full));
      await page.click('.bm-modal button[type="submit"]');
      await page.waitForTimeout(2200);

      await goActivity(page);
      const after = await page.evaluate(`document.querySelector("#bm-activity-list").innerText`);
      check(/invoice\.payment/i.test(after), "the log carries an invoice.payment entry", after.slice(0, 140).replace(/\s+/g, " "));
      check(/by hand/i.test(after), "and records that it was settled by hand rather than reconciled");
      check(/still outstanding/i.test(after), "the part payment was logged with its remaining balance");
      check(/admin@brandmintstudios\.in/i.test(after), "attributed to the account that did it");
      check(!/no entries yet/i.test(after), "and no longer claims to be empty");
    }
  }

  /* ── 8. search finds a record by name ──────────────────────── */
  section("9. The command palette finds a record by typing its name");
  {
    await page.keyboard.press("/");
    await page.waitForTimeout(500);
    const open = await page.evaluate(`!!document.querySelector("#bm-cmd-input")`);
    check(open, "pressing / opens the palette");

    if (open) {
      await page.fill("#bm-cmd-input", "green");
      await page.waitForTimeout(350);
      const n = await page.evaluate(`document.querySelectorAll(".bm-cmd-item").length`);
      check(n > 0, `typing "green" returns ${n} result(s)`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(350);
      check(await page.evaluate(`!document.querySelector("#bm-cmd-input")`), "Escape closes it");
    }
  }

  /* ── 9. THE BLANK PAGE TEST ────────────────────────────────── */
  section("10. With the motion script blocked, the CRM is still fully usable");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    const p2 = await ctx.newPage();
    await p2.route("**/bm-crm-motion.js", (r) => r.abort());
    await p2.route("**/anime.esm.min.js", (r) => r.abort());
    await signIn(p2);
    await goStudio(p2, "clients");
    await p2.waitForTimeout(900);

    const visible = await p2.evaluate(`(() => {
      const rows = ${VISIBLE("#bm-client-list .bm-listrow")};
      const faded = rows.filter((e) => Number(getComputedStyle(e).opacity) < 0.99);
      return { total: rows.length, faded: faded.length };
    })()`);
    check(visible.total > 0 && visible.faded === 0,
      `blocked motion → all ${visible.total} client rows are fully opaque`,
      visible.faded ? "CONTENT IS HIDDEN WITH NOTHING TO REVEAL IT" : "");

    // And it must still be interactive, not merely visible.
    await p2.click("#bm-client-list .bm-listrow[data-org]");
    await p2.waitForTimeout(500);
    const drawerOpen = await p2.evaluate(`(() => {
      const d = document.querySelector(".bm-drawer");
      return !!d && Number(getComputedStyle(d).opacity) > 0.99;
    })()`);
    check(drawerOpen, "and the record drawer still opens, fully visible, with no animation");

    await p2.screenshot({ path: path.join(SHOTS, "crm-no-motion.png"), fullPage: true });
    await ctx.close();
  }

  /* ── 10. the phone ─────────────────────────────────────────── */
  section("11. On a phone the sections are still reachable");
  {
    await page.setViewportSize({ width: 390, height: 844 });
    await goStudio(page, "today");
    const navVisible = await page.evaluate(`${VISIBLE('[data-view]')}.length`);
    check(navVisible >= VIEWS.length, `all ${VIEWS.length} sections reachable (${navVisible} controls visible)`);

    await page.click('[data-view="money"]');
    await page.waitForTimeout(450);
    check(await page.evaluate(`location.hash === "#money"`), "and tapping one switches view");

    const overflow = await page.evaluate(`document.documentElement.scrollWidth <= window.innerWidth + 2`);
    check(overflow, "the page does not scroll sideways");

    await page.screenshot({ path: path.join(SHOTS, "crm-phone.png"), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 960 });
  }

  /* ── 11. nothing threw ─────────────────────────────────────── */
  section("12. No console errors along the way");
  check(consoleErrors.length === 0, "clean console", consoleErrors.slice(0, 3).join(" | "));

  await goStudio(page, "today");
  await page.screenshot({ path: path.join(SHOTS, "crm-today.png"), fullPage: true });
  await page.click('[data-view="pipeline"]');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(SHOTS, "crm-pipeline.png"), fullPage: true });
} catch (err) {
  fail += 1;
  failures.push(`ABORTED: ${err.message}`);
  process.stdout.write(`\n\x1b[31mABORTED\x1b[0m ${err.stack}\n`);
} finally {
  await browser.close();
  server.close();
}

process.stdout.write(`\n${"─".repeat(58)}\n${pass + fail} checks · ${pass} passed · ${fail} failed\n`);
if (failures.length) {
  process.stdout.write(`\n\x1b[31mFailures:\x1b[0m\n${failures.map((f) => `  - ${f}`).join("\n")}\n`);
}
process.exit(fail ? 1 : 0);
