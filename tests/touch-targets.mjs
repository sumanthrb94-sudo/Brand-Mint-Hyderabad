#!/usr/bin/env node
/**
 * Tap targets and keyboard focus, MEASURED at a phone viewport.
 *
 *   bash tests/run-touch-targets.sh
 *
 * WHY THIS EXISTS
 * ---------------
 * Every control on the New engagement form was individually fine and the form
 * as a whole was 4px under the comfortable tap minimum on a phone. Nothing in
 * the existing suites could see it: tests/contrast.test.mjs measures colour,
 * tests/admin-ui.mjs measures behaviour, and neither measures a rectangle.
 *
 * TWO THINGS THIS GOT WRONG FIRST, BOTH WORTH KEEPING IN MIND:
 *
 * 1. `el.focus()` does NOT reliably match `:focus-visible`. A first version of
 *    this check focused each control from script and reported fifteen missing
 *    focus rings; tabbing through properly found zero. Programmatic focus is
 *    not keyboard focus. Press Tab.
 *
 * 2. A checkbox is 13x13px in every browser and always will be. Measuring the
 *    input measures the wrong box — the LABEL wrapping it is what a finger
 *    hits, so that is what is measured and that is what carries min-height.
 *
 * The overlay host is a SIBLING of .bm-crm, not a child, which is why the
 * focus-ring rule has to name both: a rule scoped to .bm-crm alone missed
 * every modal, drawer and the command palette.
 */
import { chromium } from "playwright";
import { listen } from "./serve.mjs";
const PORT = 5198, BASE = `http://127.0.0.1:${PORT}`, AUTH = "http://127.0.0.1:9099";
const A = { email: "admin@brandmintstudios.in", password: "adminpass123" };
const server = await listen(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
try {
  await fetch(`${AUTH}/emulator/v1/projects/brandmintstudios-a5eb7/accounts`, { method: "DELETE" });
  await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, { method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: A.email, password: A.password, returnSecureToken: true }) });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${BASE}/login`); await page.fill("#bm-username", A.email);
  await page.fill("#bm-password", A.password); await page.click("#bm-login-submit");
  await page.waitForFunction(() => !location.pathname.includes("/login"), null, { timeout: 25000 });
  await page.goto(`${BASE}/studio#clients`, { waitUntil: "load" });
  await page.waitForSelector('[data-new="engagement"]', { timeout: 20000 });
  await page.click('[data-new="engagement"]');
  await page.waitForSelector("#f-e-name", { timeout: 10000 });
  await page.waitForTimeout(600);

  // Is the modal inside .bm-crm at all?
  const inCrm = await page.evaluate(() => {
    const m = document.querySelector(".bm-modal");
    return { inCrm: !!m?.closest(".bm-crm"), parent: m?.parentElement?.className || m?.parentElement?.tagName };
  });
  console.log(`\nMODAL INSIDE .bm-crm? ${inCrm.inCrm}   (parent: ${inCrm.parent})`);

  // Real keyboard walk.
  const seen = [];
  for (let i = 0; i < 22; i += 1) {
    await page.keyboard.press("Tab");
    const r = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const ring = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== "none";
      return { name: (el.textContent || el.id || el.type || el.tagName).trim().slice(0, 34), ring,
               outline: `${cs.outlineStyle} ${cs.outlineWidth}` };
    });
    if (r) seen.push(r);
  }
  const noRing = seen.filter((s) => !s.ring);
  console.log(`TABBED THROUGH: ${seen.length}   NO VISIBLE RING: ${noRing.length}`);
  noRing.forEach((s) => console.log(`  MISSING  ${s.name}  [${s.outline}]`));
  seen.filter((s) => s.ring).slice(0, 3).forEach((s) => console.log(`  ok       ${s.name}  [${s.outline}]`));

  // Effective tap target = the LABEL wrapping each checkbox, not the box.
  const labels = await page.evaluate(() =>
    [...document.querySelectorAll(".bm-modal label.bm-mn-check")].map((l) => {
      const r = l.getBoundingClientRect();
      return { t: l.textContent.trim().slice(0, 30), h: Math.round(r.height), w: Math.round(r.width) };
    }));
  console.log(`\nCHECKBOX LABELS (the real tap target):`);
  labels.forEach((l) => console.log(`  ${l.h}x${l.w}px  ${l.t}`));
  const MIN = 44;
  const tooSmall = labels.filter((l) => l.h < MIN);
  const segs = await page.evaluate(() =>
    [...document.querySelectorAll(".bm-modal .bm-seg--wrap button")].map((b) => Math.round(b.getBoundingClientRect().height)));
  const segSmall = segs.filter((h) => h < MIN);
  const fails = [];
  if (noRing.length) fails.push(`${noRing.length} control(s) tab to no visible focus ring`);
  if (tooSmall.length) fails.push(`${tooSmall.length} checkbox label(s) under ${MIN}px`);
  if (segSmall.length) fails.push(`${segSmall.length} segmented button(s) under ${MIN}px`);
  console.log(`\nSEGMENTED BUTTONS: ${segs.join(", ")}px`);
  if (fails.length) { fails.forEach((f) => console.log(`  FAIL ${f}`)); process.exitCode = 1; }
  else console.log("\nAll tap targets >= 44px and every control shows a focus ring on Tab.");
} catch (e) { console.log("FAILED", e.message); process.exitCode = 1; }
finally { await browser.close(); server.close(); }
