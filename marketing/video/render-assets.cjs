// Render the video overlay pack to PNGs.
//   python3 -m http.server 8000   (from the repo root, so /fonts/ resolves)
//   NODE_PATH=$(npm root -g) node marketing/video/render-assets.cjs
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");

// transparent: overlays that sit on top of footage. opaque: standalone frames.
const FRAMES = [
  ["ov-hook", true], ["ov-features", true], ["ov-price", true],
  ["ov-proof", true], ["ov-cta", true], ["ov-lower-third", true],
  ["endcard-9x16", false], ["endcard-1x1", false], ["endcard-16x9", false],
  ["style-board", false],
];

(async () => {
  const out = path.join(__dirname, "assets");
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1920 }, deviceScaleFactor: 1 });
  await p.goto("http://localhost:8000/marketing/video/overlay-pack.html", { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  for (const [id, transparent] of FRAMES) {
    const el = await p.$("#" + id);
    if (!el) { console.error("MISSING", id); continue; }
    const file = path.join(out, id + ".png");
    await el.screenshot({ path: file, omitBackground: transparent });
    const { width, height } = await el.boundingBox();
    console.log(`  ${id}.png  ${width}x${height}  ${(fs.statSync(file).size / 1024).toFixed(0)} KB${transparent ? "  (alpha)" : ""}`);
  }
  await b.close();
})();
