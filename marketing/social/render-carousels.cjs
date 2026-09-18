/**
 * Render every carousel slide in carousels.json to a ready-to-post PNG.
 *
 *   python3 -m http.server 8000
 *   NODE_PATH=$(npm root -g) node marketing/social/render-carousels.cjs
 *
 * Writes marketing/social/out/<carousel-id>/01.png … in the order they are
 * posted, so the whole folder can be multi-selected in Instagram and it comes
 * out in sequence.
 *
 * Chromium rather than an image model, for the same reason the share card is:
 * ₹14,999 has to be exactly ₹14,999. A generated price is a takedown, not an
 * edit. Everything on these slides is a string from carousels.json, which is
 * checked against the live site.
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const ORIGIN = process.env.ORIGIN || "http://localhost:8000";
const OUT = path.join(ROOT, "marketing/social/out");
const DATA = JSON.parse(fs.readFileSync(path.join(__dirname, "carousels.json"), "utf8"));

const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));

(async () => {
  const browser = await chromium.launch();
  let slides = 0;
  const warnings = [];

  for (const car of DATA.carousels) {
    if (only.length && !only.includes(car.id)) continue;
    const dir = path.join(OUT, car.id);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });

    const page = await browser.newPage({
      viewport: { width: 1080, height: 1350 },
      deviceScaleFactor: 1,
    });
    page.on("pageerror", (e) => warnings.push(`${car.id}: ${e.message}`));

    for (let i = 0; i < car.slides.length; i++) {
      const slide = { ...car.slides[i], n: String(i + 1).padStart(2, "0"), of: String(car.slides.length).padStart(2, "0") };

      // addInitScript runs before the page's own script, which is what lets the
      // template read window.__SLIDE on first paint instead of re-rendering.
      await page.addInitScript((s) => { window.__SLIDE = s; }, slide);
      await page.goto(`${ORIGIN}/marketing/social/carousel.html`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts && document.fonts.ready);
      // The template auto-fits a loud cover's headline after the fonts land.
      // Screenshot before that settles and the slide is captured mid-shrink.
      await page.waitForFunction(() => window.__FIT_DONE === true, null, { timeout: 5000 });
      await page.waitForTimeout(160);

      // Catch a headline that has overflowed its slide — it renders happily and
      // only shows up as a clipped word in the posted image.
      const over = await page.evaluate(() => {
        // Measure the CONTENT box, not the slide. Photo and loud slides hold a
        // background image scaled past the frame on purpose (to crop the grey
        // hairline Gemini draws into the plates), and measuring the slide
        // counted that deliberate overflow as a layout failure on every cover.
        const el = document.getElementById("slide");
        const box = el.querySelector(".inner") || el;
        return Math.max(0, box.scrollHeight - box.clientHeight);
      });
      if (over > 2) warnings.push(`${car.id} slide ${i + 1}: content overflows by ${over}px`);

      // Vertical overflow is not the failure mode on a loud cover — horizontal
      // is. .slide.loud is overflow:hidden, so a headline one word too long
      // does not scroll or wrap, it simply loses its last letters, and the
      // only place that shows up is the posted image. Each line is measured
      // after the scaleX squeeze, because getBoundingClientRect includes the
      // parent transform.
      const wide = await page.evaluate(() => {
        const inner = document.querySelector(".loud .inner");
        if (!inner) return null;
        const cs = getComputedStyle(inner);
        const limit = inner.getBoundingClientRect().width
          - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        let over = 0, wrapped = 0;
        for (const ln of document.querySelectorAll(".loud .huge .ln")) {
          // A Range measures the text as laid out, not the block box. The
          // block is display:block and therefore always exactly as wide as
          // its parent, so measuring the element itself reports no overflow
          // however far the letters run past the edge.
          const r = document.createRange();
          r.selectNodeContents(ln);
          const rects = [...r.getClientRects()];
          if (!rects.length) continue;
          if (rects.length > 1) wrapped++;   // a cover line is never allowed to wrap
          for (const rc of rects) over = Math.max(over, Math.round(rc.width - limit));
        }
        return { over, wrapped };
      });
      if (wide && wide.over > 0)
        warnings.push(`${car.id} slide ${i + 1}: cover headline runs ${wide.over}px past the edge — shorten a word or split the line with |`);
      if (wide && wide.wrapped)
        warnings.push(`${car.id} slide ${i + 1}: ${wide.wrapped} cover line(s) wrapped — split them with | instead`);

      const file = path.join(dir, `${String(i + 1).padStart(2, "0")}.png`);
      await page.screenshot({ path: file });
      slides++;
    }

    await page.close();
    console.log(`  ok  social/out/${car.id}  ${car.slides.length} slides  (${car.title})`);
  }

  await browser.close();
  console.log(`  ${slides} slides total`);
  if (warnings.length) {
    console.log("\n  WARNINGS:");
    for (const w of warnings) console.log(`   - ${w}`);
    process.exitCode = 1;
  }
})();
