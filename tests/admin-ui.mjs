#!/usr/bin/env node
/**
 * THE ADMIN UI, DRIVEN LIKE A PERSON.
 *
 *   bash tests/run-admin-ui.sh
 *
 * The journey suite proves the studio and the portal agree about the data.
 * It does not prove the admin screen is usable, and that was the complaint:
 * "very complex, I'm unable to understand anything, and I don't see any click
 * or any light button."
 *
 * So this asks different questions, and answers them by clicking:
 *
 *   - does the landing say what to do, in one place?
 *   - is every tab actually isolated, or do panels bleed across?
 *   - is every control big enough and dark enough to see?
 *   - does clicking a thing do the thing?
 *
 * Tab isolation gets its own section because it was broken. showTab() hides by
 * setting the hidden attribute, and `.bm-stats { display: grid }` beat the UA
 * rule that implements it, so the Money panel sat on every tab. A test that
 * only checked "the Money panel is on the Money tab" would have passed
 * throughout. This checks the inverse — that it is NOWHERE ELSE.
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
      const m = document.querySelector("#bm-main, main");
      const l = document.querySelector("#bm-loading");
      return m && !m.hidden && (!l || l.hidden);
    }, null, { timeout: 20000 })
    .catch(() => {});
  await page.waitForTimeout(700);
}

/** Only the elements a person can actually see. */
const VISIBLE = (sel) => `[...document.querySelectorAll(${JSON.stringify(sel)})].filter((e) => {
  const r = e.getBoundingClientRect();
  const cs = getComputedStyle(e);
  return r.width > 1 && r.height > 1 && cs.visibility !== "hidden" && cs.display !== "none";
})`;

/* ── run ──────────────────────────────────────────────────────── */

const server = await listen(PORT);
const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });

const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error" && !/ERR_CONNECTION_RESET|favicon|fonts\.g/.test(m.text())) {
    consoleErrors.push(m.text());
  }
});

try {
  await clearAll();
  await createAuthUser(ADMIN.email, ADMIN.password);
  await signIn(page);

  /* ── 1. the landing answers the question ───────────────────── */
  section("1. The landing answers one question");
  await goStudio(page, "today");

  const landing = await page.evaluate(() => ({
    heading: document.querySelector(".bm-hero-q")?.textContent.trim() || null,
    greet: document.querySelector(".bm-hero-hi")?.textContent.trim() || null,
    gaugeShown: !!document.querySelector("#bm-gauge:not([hidden])"),
    gaugeValue: document.querySelector("#bm-gauge-value")?.textContent.trim() || null,
    cards: document.querySelectorAll(".bm-act").length,
  }));

  check(landing.heading === "What needs you today", "the page states its purpose in a heading", `saw: ${landing.heading}`);
  check(/^Good (morning|afternoon|evening)$/.test(landing.greet || ""), "it greets by time of day", `saw: ${landing.greet}`);
  check(landing.cards > 0, `the landing shows something actionable (${landing.cards} card${landing.cards === 1 ? "" : "s"})`);

  // An empty system must say it is empty, not "nothing needs you". Section 4:
  // empty is not the same as done.
  const emptyState = await page.evaluate(() => document.querySelector(".bm-act--empty")?.innerText || "");
  check(
    /nothing is set up yet/i.test(emptyState),
    "an empty system says it is EMPTY, not that the day is clear",
    emptyState ? `saw: ${emptyState.split("\n")[0]}` : "no empty-state card rendered"
  );

  await page.screenshot({ path: path.join(SHOTS, "01-landing-empty.png"), fullPage: true });

  /* ── 2. every control is visible and reachable ─────────────── */
  section("2. Every control is visible and big enough");

  const controls = await page.evaluate(`(() => {
    const els = ${VISIBLE("button, a.bm-btn, .bm-act[href], .bm-act-go, #bm-tabs button")};
    const lum = (c) => { const m = c.match(/\\d+/g); if (!m) return null;
      const s = m.slice(0,3).map(Number).map((v) => { v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); });
      return 0.2126*s[0]+0.7152*s[1]+0.0722*s[2]; };
    const bgOf = (el) => { let n = el; while (n && n !== document.documentElement) {
      const c = getComputedStyle(n).backgroundColor;
      if (c && !/rgba\\(0, 0, 0, 0\\)/.test(c)) return c; n = n.parentElement; } return "rgb(245,247,244)"; };
    return els.map((e) => {
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      const L1 = lum(cs.color), L2 = lum(bgOf(e));
      const ratio = (L1 == null || L2 == null) ? null
        : (Math.max(L1,L2) + 0.05) / (Math.min(L1,L2) + 0.05);
      // Identify by more than label text — an icon-only control has no text,
      // and "'' is 21px tall" is not a finding anyone can act on.
      const id = e.id ? "#" + e.id
        : (e.className && typeof e.className === "string" && e.className.trim())
          ? "." + e.className.trim().split(/\s+/).join(".")
          : e.tagName.toLowerCase();
      return { text: (e.innerText||e.textContent||"").trim().slice(0,26) || id,
               sel: id, h: Math.round(r.height),
               w: Math.round(r.width), ratio: ratio == null ? null : +ratio.toFixed(2) };
    });
  })()`);

  check(controls.length > 0, `found ${controls.length} visible controls to check`);
  const tooSmall = controls.filter((c) => c.h > 0 && c.h < 36);
  check(tooSmall.length === 0, "no visible control is under 36px tall",
    tooSmall.map((c) => `${c.sel} (${c.text}) ${c.w}x${c.h}px`).join(", "));
  const tooFaint = controls.filter((c) => c.ratio !== null && c.ratio < 4.5);
  check(tooFaint.length === 0, "no visible control is under 4.5:1 contrast",
    tooFaint.map((c) => `${c.sel} (${c.text}) ${c.ratio}:1`).join(", "));

  /* ── 3. TAB ISOLATION — the bug that was shipped ───────────── */
  section("3. Tab isolation — each tab shows ONLY its own panels");

  const TABS = ["today", "money", "delivery", "clients", "sales"];
  for (const tab of TABS) {
    await goStudio(page, tab);
    const leaked = await page.evaluate(`(() => {
      const shown = ${VISIBLE("[data-sect]")};
      return shown.map((e) => e.getAttribute("data-sect")).filter((s) => s !== ${JSON.stringify(tab)});
    })()`);
    check(
      leaked.length === 0,
      `#${tab} shows no panel belonging to another tab`,
      leaked.length ? `leaked: ${[...new Set(leaked)].join(", ")}` : ""
    );
  }

  // The specific regression: the Money stat row on the Today tab.
  await goStudio(page, "today");
  const statsOnToday = await page.evaluate(`${VISIBLE(".bm-stats")}.length`);
  check(statsOnToday === 0, "the Money stat row is NOT on the Today tab (the shipped bug)",
    statsOnToday ? "still visible" : "");

  /* ── 4. clicking a thing does the thing ────────────────────── */
  section("4. Clicking does something");

  // Seed enough for the landing to have real work on it.
  await page.evaluate(async () => {
    const m = await import("/assets/bm-app.js");
    const orgId = await m.createOrg({ name: "Test Client", kind: "client", retainer: 25000 });
    await m.updateOrg(orgId, { retainerStatus: "signed" });
    const pid = await m.createProject({ orgId, name: "Test site", type: "site", dueAt: null, billable: true });
    await m.pushRequirementsToIntake(pid, ["cod"]);
    await m.addLead({ name: "A lead", source: "site", stage: "inbound" });
  });
  await goStudio(page, "today");

  const withWork = await page.evaluate(() => ({
    cards: document.querySelectorAll(".bm-act[href]").length,
    gauge: !!document.querySelector("#bm-gauge:not([hidden])"),
    gaugeValue: document.querySelector("#bm-gauge-value")?.textContent.trim(),
    firstLabel: document.querySelector(".bm-act[href] .bm-act-go")?.textContent.trim(),
    firstTarget: document.querySelector(".bm-act[href]")?.getAttribute("data-goto"),
  }));
  check(withWork.cards > 0, `with real data the landing lists ${withWork.cards} thing(s) to do`);
  check(withWork.gauge, "the break-even gauge is shown", withWork.gaugeValue || "");
  check(
    withWork.gaugeValue === "Rs 75,000",
    "the gauge shows the real gap, signed cash only",
    `saw ${withWork.gaugeValue} (25,000 signed against 1,00,000)`
  );

  await page.screenshot({ path: path.join(SHOTS, "02-landing-with-work.png"), fullPage: true });

  // Click the first action card and confirm it lands on the right tab.
  if (withWork.cards) {
    const target = withWork.firstTarget;
    await page.click(".bm-act[href]");
    await page.waitForTimeout(700);
    const nowShowing = await page.evaluate(`(() => {
      const shown = ${VISIBLE("[data-sect]")};
      return [...new Set(shown.map((e) => e.getAttribute("data-sect")))];
    })()`);
    check(
      nowShowing.length > 0 && nowShowing.every((s) => s === target),
      `clicking "${withWork.firstLabel}" moves to the ${target} tab and nothing else`,
      `showing: ${nowShowing.join(", ")}`
    );
  }

  /* ── 5. the tabs themselves work ───────────────────────────── */
  section("5. The tab bar works by click, not just by URL");
  await goStudio(page, "today");
  for (const tab of ["money", "delivery", "clients", "sales", "today"]) {
    await page.click(`#bm-tabs button[data-tab="${tab}"]`);
    await page.waitForTimeout(350);
    const state = await page.evaluate(`(() => {
      const shown = [...new Set(${VISIBLE("[data-sect]")}.map((e) => e.getAttribute("data-sect")))];
      const current = document.querySelector('#bm-tabs button[aria-current="page"]')?.getAttribute("data-tab");
      return { shown, current };
    })()`);
    check(
      state.current === tab && state.shown.every((s) => s === tab),
      `clicking "${tab}" selects it and shows only its panels`,
      `current=${state.current} showing=${state.shown.join(",")}`
    );
  }

  /* ── 6. keyboard ───────────────────────────────────────────── */
  section("6. Keyboard reachable");
  await goStudio(page, "today");
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => {
    const a = document.activeElement;
    if (!a || a === document.body) return null;
    const cs = getComputedStyle(a);
    return { tag: a.tagName, outline: cs.outlineStyle, text: (a.innerText || "").trim().slice(0, 24) };
  });
  check(!!focused, "Tab moves focus into the page", focused ? `→ ${focused.tag} "${focused.text}"` : "focus stayed on body");
  check(focused?.outline !== "none", "the focused element shows a focus ring", `outline-style: ${focused?.outline}`);

  /* ── 7. nothing broken ─────────────────────────────────────── */
  section("7. No console errors across the whole admin");
  for (const tab of TABS) await goStudio(page, tab);
  check(consoleErrors.length === 0, "no console errors on any tab",
    consoleErrors.slice(0, 3).join(" | "));

  /* ── how simple is it, really ──────────────────────────────── */
  section("How much is on screen, per tab");
  for (const tab of TABS) {
    await goStudio(page, tab);
    const n = await page.evaluate(`(() => ({
      panels: ${VISIBLE("[data-sect]")}.length,
      controls: ${VISIBLE("button, input, select, a.bm-btn, .bm-act[href]")}.length,
    }))()`);
    process.stdout.write(`  ${tab.padEnd(9)} ${String(n.panels).padStart(2)} panel(s)  ${String(n.controls).padStart(3)} control(s)\n`);
    await page.screenshot({ path: path.join(SHOTS, `tab-${tab}.png`), fullPage: true });
  }
} catch (err) {
  fail += 1;
  failures.push(`RUN ABORTED: ${err.message}`);
  process.stdout.write(`\n\x1b[31mABORTED\x1b[0m ${err.stack}\n`);
} finally {
  await browser.close();
  server.close();
}

process.stdout.write(
  `\n${"─".repeat(62)}\n${pass + fail} checks · ${pass} passed · ${fail} failed\nscreenshots -> docs/admin-ui/\n`
);
if (failures.length) {
  process.stdout.write(`\n\x1b[31mFailures:\x1b[0m\n${failures.map((f) => `  - ${f}`).join("\n")}\n`);
}
process.exit(fail ? 1 : 0);
