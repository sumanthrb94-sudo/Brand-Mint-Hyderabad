/**
 * Re-encode PNGs to web-sized JPEGs.
 *
 * Chromium does the encoding because this repo has no build step: there is no
 * package.json to add sharp to, and no ImageMagick on the box. Playwright is
 * already installed globally for the page checks, so it is the one image
 * encoder available.
 *
 *   NODE_PATH=$(npm root -g) node scripts/to-jpg.cjs
 *   NODE_PATH=$(npm root -g) node scripts/to-jpg.cjs images/foo.png 1600 900 82
 *
 * Deletes nothing. The PNGs stay put; add them to .gitignore or remove them by
 * hand once you are happy with the JPEGs.
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

/** Generated art, at the size the page actually displays it. */
const JOBS = [
  { src: "images/studio-desk.png", w: 1200, h: 900, q: 80 },
  { src: "images/packing-bench.png", w: 1200, h: 900, q: 80 },
  { src: "images/crm-flow.png", w: 1600, h: 900, q: 82 },
];

(async () => {
  const argv = process.argv.slice(2);
  const jobs = argv.length
    ? [{ src: argv[0], w: +argv[1] || 1600, h: +argv[2] || 900, q: +argv[3] || 82 }]
    : JOBS;

  const browser = await chromium.launch();
  for (const job of jobs) {
    const src = path.resolve(ROOT, job.src);
    if (!fs.existsSync(src)) {
      console.error(`  skip  ${job.src} (not found)`);
      continue;
    }
    const page = await browser.newPage({
      viewport: { width: job.w, height: job.h },
      deviceScaleFactor: 1,
    });
    const data = fs.readFileSync(src).toString("base64");
    await page.setContent(
      `<body style="margin:0">
         <img src="data:image/png;base64,${data}"
              style="width:${job.w}px;height:${job.h}px;display:block;object-fit:cover">
       </body>`
    );
    // Wait for the data URI to actually decode, or the shot is a blank page.
    await page.waitForFunction(() => {
      const i = document.querySelector("img");
      return i && i.complete && i.naturalWidth > 0;
    }, { timeout: 30000 });

    const out = src.replace(/\.png$/, ".jpg");
    await page.screenshot({ path: out, type: "jpeg", quality: job.q });
    const before = Math.round(fs.statSync(src).size / 1024);
    const after = Math.round(fs.statSync(out).size / 1024);
    console.log(`  ok  ${path.relative(ROOT, out)}  ${job.w}x${job.h}  ${before} KB -> ${after} KB`);
    await page.close();
  }
  await browser.close();
})();
