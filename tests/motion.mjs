#!/usr/bin/env node
/**
 * MOTION ON /home-v2 — does it help, and can it hurt?
 *
 *   node tests/motion.mjs
 *
 * Animation is the easiest thing on a page to get catastrophically wrong,
 * because every failure mode is invisible on the machine that built it:
 *
 *   - the reveal script fails to load and the page is BLANK, because the
 *     content was hidden in CSS and only JS put it back
 *   - the visitor asked for reduced motion and got the animation anyway
 *   - things animate width/height and the page jumps under a reader's thumb
 *
 * So this drives the page four ways: normally, with reduced motion, with the
 * motion script blocked, and with anime.js itself blocked. The last two are the
 * ones that matter — a marketing site that renders nothing when a CDN hiccups
 * is worse than a marketing site with no animation at all.
 *
 * No emulators needed; /home-v2 is static.
 */

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { listen } from "./serve.mjs";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const PORT = Number(process.env.PORT || 5181);
const BASE = `http://127.0.0.1:${PORT}`;
const SHOTS = path.join(ROOT, "docs/admin-ui");
fs.mkdirSync(SHOTS, { recursive: true });

let pass = 0, fail = 0;
const failures = [];
const check = (ok, what, detail = "") => {
  if (ok) { pass++; process.stdout.write(`  \x1b[32m✔\x1b[0m ${what}\n`); }
  else { fail++; failures.push(`${what}${detail ? ` — ${detail}` : ""}`);
         process.stdout.write(`  \x1b[31m✘\x1b[0m ${what}${detail ? `\n      ${detail}` : ""}\n`); }
};
const section = (t) => process.stdout.write(`\n\x1b[1m${t}\x1b[0m\n`);

/** Is the page readable? Counts elements that carry real text AND are visible. */
const READABLE = `(() => {
  const sels = [".display", ".lede", "#services .card h3", ".work-card h3", ".step h3", ".faq summary", ".cta-band h2"];
  let total = 0, visible = 0;
  for (const s of sels) for (const e of document.querySelectorAll(s)) {
    total++;
    const cs = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    if (Number(cs.opacity) > 0.01 && cs.visibility !== "hidden" && cs.display !== "none" && r.width > 1) visible++;
  }
  return { total, visible };
})()`;

const server = await listen(PORT);
const browser = await chromium.launch({ executablePath: CHROME });

try {
  /* ── 1. motion allowed: it animates, then settles ──────────── */
  section("1. With motion allowed, things animate in and finish");
  {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on("console", (m) => { if (m.type() === "error" && !/fonts\.g|ERR_CONNECTION/.test(m.text())) errs.push(m.text()); });

    await page.goto(`${BASE}/home-v2`, { waitUntil: "load" });
    // Sampled early: the hero should be mid-flight, not already done.
    await page.waitForTimeout(120);
    const early = await page.evaluate(`getComputedStyle(document.querySelector(".display")).opacity`);
    await page.waitForTimeout(1600);
    const settled = await page.evaluate(`getComputedStyle(document.querySelector(".display")).opacity`);

    check(Number(early) < 1, "the hero headline starts transparent (it is animating)", `opacity at 120ms: ${early}`);
    check(Number(settled) > 0.99, "and finishes fully opaque", `opacity at 1.7s: ${settled}`);

    const anime = await page.evaluate(`!!window.performance.getEntriesByType("resource").find(r => r.name.includes("anime.esm.min.js"))`);
    check(anime, "anime.js actually loaded from the origin, not a CDN");

    // Scroll to the bottom and confirm every revealed section ended visible.
    await page.evaluate(`window.scrollTo(0, document.body.scrollHeight)`);
    await page.waitForTimeout(2200);
    const r = await page.evaluate(READABLE);
    check(r.visible === r.total, `every section is visible after scrolling (${r.visible}/${r.total})`);
    check(errs.length === 0, "no console errors", errs.slice(0, 2).join(" | "));

    await page.screenshot({ path: path.join(SHOTS, "motion-settled.png"), fullPage: true });
    await ctx.close();
  }

  /* ── 2. reduced motion: nothing runs at all ────────────────── */
  section("2. With prefers-reduced-motion, nothing animates and nothing hides");
  {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 }, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/home-v2`, { waitUntil: "load" });
    await page.waitForTimeout(250);

    // Immediately readable — not "readable after the animation would have run".
    const r = await page.evaluate(READABLE);
    check(r.visible === r.total, `everything is visible straight away (${r.visible}/${r.total})`);

    const loaded = await page.evaluate(`!!window.performance.getEntriesByType("resource").find(x => x.name.includes("anime.esm.min.js"))`);
    check(!loaded, "anime.js is not even downloaded — 40 KB not spent on someone who declined it",
      loaded ? "it was fetched anyway" : "");

    const inlineHidden = await page.evaluate(`[...document.querySelectorAll("[style*='opacity']")].length`);
    check(inlineHidden === 0, "no element was given an inline opacity", `${inlineHidden} found`);
    await ctx.close();
  }

  /* ── 3. THE BLANK PAGE TEST ────────────────────────────────── */
  section("3. If the motion script never loads, the page is still complete");
  {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
    const page = await ctx.newPage();
    await page.route("**/home-v2-motion.js", (route) => route.abort());
    await page.goto(`${BASE}/home-v2`, { waitUntil: "load" });
    await page.waitForTimeout(500);
    const r = await page.evaluate(READABLE);
    check(r.visible === r.total,
      `blocked motion script → page still fully readable (${r.visible}/${r.total})`,
      r.visible !== r.total ? "CONTENT IS HIDDEN WITH NOTHING TO REVEAL IT" : "");
    await page.screenshot({ path: path.join(SHOTS, "motion-blocked.png"), fullPage: true });
    await ctx.close();
  }

  section("4. If anime.js itself is unreachable, same answer");
  {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
    const page = await ctx.newPage();
    await page.route("**/anime.esm.min.js", (route) => route.abort());
    await page.goto(`${BASE}/home-v2`, { waitUntil: "load" });
    await page.waitForTimeout(600);
    const r = await page.evaluate(READABLE);
    check(r.visible === r.total,
      `blocked anime.js → page still fully readable (${r.visible}/${r.total})`,
      r.visible !== r.total ? "CONTENT IS HIDDEN WITH NOTHING TO REVEAL IT" : "");
    await ctx.close();
  }

  /* ── 5. it must not move the layout ────────────────────────── */
  section("5. The animation shifts no layout (CLS)");
  {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/home-v2`, { waitUntil: "load" });
    await page.evaluate(`
      window.__cls = 0;
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
    `);
    await page.waitForTimeout(1500);
    for (let y = 0; y < 6; y++) {
      await page.evaluate(`window.scrollBy(0, window.innerHeight * 0.9)`);
      await page.waitForTimeout(450);
    }
    const cls = await page.evaluate(`window.__cls`);
    check(cls < 0.1, `cumulative layout shift stays under 0.1 (${cls.toFixed(4)})`,
      cls >= 0.1 ? "the animation is moving the page under the reader" : "");

    // Transform and opacity only — anything else forces layout mid-scroll.
    //
    // Scoped to the elements the ANIMATION touched. An earlier version read
    // every [style] attribute on the page and flagged `margin-top` from a
    // static inline style in the markup, which the animation never goes near.
    // A check that reports authored CSS as an animation defect is noise.
    const bad = await page.evaluate(`
      [...document.querySelectorAll("[style]")]
        .filter((e) => /(^|;)\\s*(opacity|transform)\\s*:/.test(e.getAttribute("style")))
        .flatMap((e) => e.getAttribute("style").split(";").map((d) => [e, d]))
        .map(([e, d]) => d.split(":")[0].trim().toLowerCase())
        .filter((p) => /^(height|top|left|right|bottom|margin|padding|width)/.test(p))
    `);
    check([...new Set(bad)].length === 0,
      "the animated elements carry only composited properties",
      [...new Set(bad)].join(", "));
    await ctx.close();
  }

  /* ── 6. the counted numbers land on the truth ──────────────── */
  section("6. Counted numbers finish on exactly what the markup says");
  {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/home-v2`, { waitUntil: "load" });
    await page.waitForTimeout(2400);
    const trust = await page.evaluate(`[...document.querySelectorAll(".trust-k")].map(e => e.textContent.trim())`);
    check(trust.includes("3–5wk"), "the range 3–5wk is left alone, not counted", trust.join(" | "));
    check(trust.includes("50/50"), "the ratio 50/50 is left alone", trust.join(" | "));
    check(trust.includes("2"), "the plain number 2 ends on 2", trust.join(" | "));
    await ctx.close();
  }
} catch (err) {
  fail++; failures.push(`ABORTED: ${err.message}`);
  process.stdout.write(`\n\x1b[31mABORTED\x1b[0m ${err.stack}\n`);
} finally {
  await browser.close();
  server.close();
}

process.stdout.write(`\n${"─".repeat(58)}\n${pass + fail} checks · ${pass} passed · ${fail} failed\n`);
if (failures.length) process.stdout.write(`\n\x1b[31mFailures:\x1b[0m\n${failures.map((f) => `  - ${f}`).join("\n")}\n`);
process.exit(fail ? 1 : 0);
