// Regenerate the three free PDFs from their HTML sources.
//   NODE_PATH=$(npm root -g) node downloads/src/render.cjs
const { chromium } = require("playwright");
const path = require("path");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const out = path.resolve(__dirname, "..") + "/";
  for (const [f, name] of [["checklist", "brand-mint-launch-readiness-checklist"], ["catalogue", "brand-mint-product-catalogue-template"], ["scope", "brand-mint-scope-worksheet"]]) {
    await p.goto("file://" + path.resolve(__dirname, f + ".html"), { waitUntil: "load" });
    await p.pdf({ path: out + name + ".pdf", format: "A4", printBackground: true, preferCSSPageSize: true });
    console.log("wrote", name);
  }
  await b.close();
})();
