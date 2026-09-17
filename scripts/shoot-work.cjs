/**
 * Capture the portfolio screenshots for work/<id>.jpg.
 *
 * RUN THIS SOMEWHERE WITH ORDINARY INTERNET — your laptop, not the Claude Code
 * web sandbox. That sandbox's egress gateway answers 403 to CONNECT for every
 * host outside a small allowlist, including all four sites below and
 * brandmintstudios.in itself, so Playwright there dies with
 * ERR_TUNNEL_CONNECTION_FAILED before it reaches the network. Nothing in this
 * script can work around that; it is an organisation policy on the gateway.
 *
 * Setup once:
 *     npm i -g playwright && playwright install chromium
 *
 * Run from the repo root:
 *     NODE_PATH=$(npm root -g) node scripts/shoot-work.cjs
 *     NODE_PATH=$(npm root -g) node scripts/shoot-work.cjs simplysip   # one
 *     NODE_PATH=$(npm root -g) node scripts/shoot-work.cjs --headed    # watch
 *
 * CommonJS rather than ESM on purpose: NODE_PATH, which is how every other
 * Playwright script in this repo finds the global install, is ignored by ESM
 * imports. An .mjs version of this failed with ERR_MODULE_NOT_FOUND.
 *
 * Writes work/<id>.jpg at 1600x1000 — the ratio work/README.md specifies and
 * index.html's card renderer expects. A project with no file here still
 * renders, as a typographic card; it just does less work for you.
 *
 * Ids and URLs mirror WORK in shared/work.js. Add a project there, add it here.
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "work");

const SITES = [
  { id: "simplysip", url: "https://simplysip.in" },
  { id: "tresorcouture", url: "https://tresorcouture.in" },
  { id: "greenteam", url: "https://thegreenteam.in" },
  { id: "freshkart", url: "https://fresh-kart-six.vercel.app/" },
];

(async () => {
  const args = process.argv.slice(2);
  const headed = args.includes("--headed");
  const only = args.filter((a) => !a.startsWith("--"));
  const targets = only.length ? SITES.filter((s) => only.includes(s.id)) : SITES;

  if (!targets.length) {
    console.error(`No match. Ids: ${SITES.map((s) => s.id).join(", ")}`);
    process.exit(1);
  }

  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: !headed });
  let failed = 0;

  for (const site of targets) {
    const ctx = await browser.newContext({
      // Shoot at the final size rather than cropping a 1440-wide capture after.
      viewport: { width: 1600, height: 1000 },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();

    try {
      await page.goto(site.url, { waitUntil: "networkidle", timeout: 60000 });

      // Three of these are single-page apps — the HTML is an empty
      // <div id="root"> until the bundle boots, so wait for real content
      // rather than a fixed sleep.
      await page
        .waitForFunction(() => document.body.innerText.trim().length > 40, { timeout: 20000 })
        .catch(() => {});

      // Walk the page so lazy images load, then return to the top.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(1800);
      await page.evaluate(() => document.fonts && document.fonts.ready);

      // Consent banners and newsletter modals are the most common reason one
      // of these comes out unusable.
      await page.evaluate(() => {
        const yes = /^(accept|accept all|i agree|agree|got it|ok|okay|allow|continue|close|no thanks)$/i;
        for (const el of document.querySelectorAll("button, a, [role=button]")) {
          if (yes.test((el.textContent || "").trim()) && el.offsetParent) {
            try { el.click(); } catch (e) {}
          }
        }
        for (const el of document.querySelectorAll(
          "[class*=modal],[class*=popup],[class*=overlay],[id*=cookie],[class*=cookie]"
        )) {
          const r = el.getBoundingClientRect();
          if (r.width > window.innerWidth * 0.5 && r.height > 120) el.remove();
        }
      });
      await page.waitForTimeout(700);

      // Report a half-loaded page rather than quietly shipping it to the
      // portfolio, where a broken hero is worse than no screenshot at all.
      const broken = await page.evaluate(
        () => [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).length
      );

      const file = path.join(OUT, `${site.id}.jpg`);
      await page.screenshot({ path: file, type: "jpeg", quality: 82 });
      const kb = Math.round(fs.statSync(file).size / 1024);
      console.log(
        `  ok    work/${site.id}.jpg  ${kb} KB` +
          (broken ? `   ${broken} image(s) did not load — look before committing` : "")
      );
      if (kb > 300) console.log("        over the 300 KB budget in work/README.md");
    } catch (e) {
      console.error(`  FAIL  ${site.id}: ${String(e.message).split("\n")[0]}`);
      failed += 1;
    }
    await ctx.close();
  }

  await browser.close();
  console.log(
    failed
      ? `\n${failed} failed.`
      : "\nDone. Commit work/*.jpg — the cards pick them up with no other change."
  );
  process.exit(failed ? 1 : 0);
})();
