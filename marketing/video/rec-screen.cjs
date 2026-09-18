/**
 * Record the real site as phone screen footage.
 *
 *   python3 -m http.server 8000
 *   NODE_PATH=$(npm root -g) node marketing/video/rec-screen.cjs
 *
 * WHY THIS EXISTS. Veo was being asked to invent a phone screen, and it
 * produced blurred generic bubbles that sell nothing and read instantly as
 * fake. No real ad does that: you shoot the device and composite the actual
 * screen in post. This records the actual screen.
 *
 * Everything here is genuine product footage — the real pages, the real
 * prices, the real store tiers — captured at phone size from the live repo.
 * Nothing is a mockup, so nothing can be wrong.
 *
 * Output is a frame sequence rather than a video file: Playwright's own
 * recordVideo emits WebM at a frame rate it picks, and cut-ugc.sh wants exact
 * 24fps material it can trim to the frame. PNG frames go straight into ffmpeg
 * at whatever rate is asked for.
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "marketing/video/out/screen");
const ORIGIN = process.env.ORIGIN || "http://localhost:8000";
const FPS = 24;

/** Each take is a scripted move on a real page. Durations are what the edit
 *  needs, not what looks nice in isolation. */
/* `from` is a CSS selector to park on before the move starts, because a URL
   fragment does not survive the settle pass below — that pass scrolls the
   whole page to trigger the reveal animations, and lands back at the top.
   The first cut of this recorded #stores from the top of the home page and
   scrolled past the hero headline in the first second, which is the most
   valuable frame on the site.
   `travel` is how far to move from there, not an absolute position. */
const TAKES = [
  { id: "home", url: "/index.html", secs: 5, from: null, travel: 620, hold: 1.4 },
  { id: "tiers", url: "/index.html", secs: 5, from: "#stores", travel: 1000, hold: 1.0 },
  { id: "pricing", url: "/pricing.html", secs: 5, from: "#tiers, .tiers, main", travel: 1100, hold: 1.0 },
];

(async () => {
  const browser = await chromium.launch();
  fs.rmSync(OUT, { recursive: true, force: true });

  for (const take of TAKES) {
    const dir = path.join(OUT, take.id);
    fs.mkdirSync(dir, { recursive: true });

    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3, // 1170x2532 — comfortably above the 1080-wide timeline
      isMobile: true,
      hasTouch: true,
    });
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e.message).slice(0, 100)));

    await page.goto(ORIGIN + take.url, { waitUntil: "networkidle", timeout: 40000 });
    await page.evaluate(() => document.fonts && document.fonts.ready);

    // Reveal-on-scroll animations would otherwise fire mid-capture and show
    // half-faded sections. Settle them first, then scroll for real.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(900);

    // Park on the section this take is about, now that the settle pass is done.
    const base = await page.evaluate((sel) => {
      if (!sel) return 0;
      const el = document.querySelector(sel);
      if (!el) return 0;
      const y = el.getBoundingClientRect().top + window.scrollY;
      // A little above the section, so it does not start flush against the nav.
      return Math.max(0, Math.round(y - 40));
    }, take.from);
    if (take.from && base === 0) console.log(`      note: "${take.from}" not found, starting at top`);

    const total = Math.round(take.secs * FPS);
    const holdFrames = Math.round(take.hold * FPS);
    const moving = total - holdFrames;

    for (let f = 0; f < total; f++) {
      // Ease-in-out so the scroll starts and stops like a thumb, not a motor.
      const t = f < holdFrames ? 0 : (f - holdFrames) / Math.max(1, moving - 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      await page.evaluate((y) => window.scrollTo(0, y), base + Math.round(eased * take.travel));
      await page.screenshot({
        path: path.join(dir, `f${String(f).padStart(4, "0")}.png`),
        animations: "disabled",
      });
    }

    const n = fs.readdirSync(dir).length;
    console.log(`  ok  screen/${take.id}  ${n} frames  ${take.secs}s @${FPS}fps` +
      (errs.length ? `  (${errs.length} page errors)` : ""));
    await page.close();
  }

  await browser.close();
})();
