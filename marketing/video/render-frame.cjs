/** Render phone-frame.html to a transparent-screen PNG for the compose step. */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const ROOT = path.resolve(__dirname, "../..");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e.message)));
  await p.goto((process.env.ORIGIN || "http://localhost:8000") + "/marketing/video/phone-frame.html",
    { waitUntil: "networkidle" });
  await p.waitForTimeout(400);
  const out = path.join(ROOT, "marketing/video/assets/phone-frame-9x16.png");
  await p.screenshot({ path: out, omitBackground: true });  // keeps the cutout transparent
  console.log(`  ok  ${path.relative(ROOT, out)}  ${Math.round(fs.statSync(out).size / 1024)} KB` +
    (errs.length ? `  errors: ${errs.join("; ")}` : ""));
  await b.close();
})();
