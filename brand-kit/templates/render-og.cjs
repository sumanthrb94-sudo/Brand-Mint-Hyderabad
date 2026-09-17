/**
 * Render brand-kit/templates/og-card.html to /og-image.png, and re-encode the
 * showcase render to /images/showcase-devices.jpg.
 *
 * Chromium is the renderer because the card uses the studio's real self-hosted
 * fonts and the same CSS tokens as the site — a hand-drawn SVG drifts from the
 * brand the moment styles.css changes, and a diffusion model cannot spell
 * "brandmintstudios.in".
 *
 *   python3 -m http.server 8000
 *   NODE_PATH=$(npm root -g) node brand-kit/templates/render-og.cjs
 *
 * Serving over http rather than file:// so /fonts/*.woff2 resolve exactly as
 * they do in production.
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const ORIGIN = process.env.ORIGIN || "http://localhost:8000";
const RAW = process.argv[2] || ""; // optional: source PNG for the showcase image

(async () => {
  const browser = await chromium.launch();
  const out = [];

  /* ------------------------------------------------- the share card, 1200x630 */
  {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 630 },
      deviceScaleFactor: 1,
    });
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e.message)));

    await page.goto(`${ORIGIN}/brand-kit/templates/og-card.html`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    // Block until the woff2 files are actually decoded, or the card renders in
    // a fallback face and every letter shifts.
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);

    // Catch the rupee-in-mono problem before it ships rather than after.
    const tofu = await page.evaluate(() => {
      const el = document.querySelector(".row-price");
      return el ? el.textContent.includes("�") : true;
    });

    const file = path.join(ROOT, "og-image.png");
    await page.screenshot({ path: file, type: "png" });
    out.push({
      file: "og-image.png",
      kb: Math.round(fs.statSync(file).size / 1024),
      pageErrors: errs.length,
      replacementChar: tofu,
    });
    await page.close();
  }

  /* ------------------------- re-encode the showcase render, 1600x900 JPEG ---- */
  if (RAW && fs.existsSync(RAW)) {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 900 },
      deviceScaleFactor: 1,
    });
    const data = fs.readFileSync(RAW).toString("base64");
    await page.setContent(
      `<body style="margin:0;background:#06140f">
         <img src="data:image/png;base64,${data}"
              style="width:1600px;height:900px;display:block;object-fit:cover">
       </body>`
    );
    await page.waitForTimeout(600);

    const file = path.join(ROOT, "images", "showcase-devices.jpg");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await page.screenshot({ path: file, type: "jpeg", quality: 82 });
    out.push({ file: "images/showcase-devices.jpg", kb: Math.round(fs.statSync(file).size / 1024) });
    await page.close();
  }

  await browser.close();
  console.log(JSON.stringify(out, null, 2));
})();
