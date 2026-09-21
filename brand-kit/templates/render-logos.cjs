/**
 * Rasterise the logo set to brand-kit/logo/png/ for the places that will not
 * take an SVG: Google Business Profile, LinkedIn, JustDial, Sulekha, Clutch.
 *
 * Chromium renders them because the wordmark is live text in Plus Jakarta
 * Sans, served from /fonts exactly as the site serves it.
 *
 *   NODE_PATH=$(npm root -g) node brand-kit/templates/render-logos.cjs
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "brand-kit/logo/png");
// Fonts are inlined: a page built with setContent lives on about:blank, and a
// cross-origin woff2 without CORS headers is silently refused.
const font = (f) => `url("data:font/woff2;base64,${fs.readFileSync(path.join(ROOT, "fonts", f)).toString("base64")}") format("woff2")`;
const ORIGIN = null;

const CREAM = "#F5F1EA", DARK = "#0B1F1A", INK = "#0A0E0C";
const MARK = (s) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${s}" height="${s}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#7CF6C8"/><stop offset="100%" stop-color="#10B981"/></linearGradient></defs>
  <circle cx="32" cy="32" r="32" fill="url(#g)"/>
  <path d="M18 44V20l14 12 14-12v24" stroke="${DARK}" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

const page = (w, h, bg, body) => `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:"Plus Jakarta Sans";src:${font("plus-jakarta-sans.woff2")};font-weight:200 800}
  @font-face{font-family:"Inter";src:${font("inter.woff2")};font-weight:100 900}
  html,body{margin:0;width:${w}px;height:${h}px;background:${bg};overflow:hidden}
  body{display:flex;align-items:center;justify-content:center;font-family:"Plus Jakarta Sans",Inter,sans-serif}
  .row{display:flex;align-items:center;gap:${h * 0.17}px}
  .word{font-weight:600;letter-spacing:-0.02em;line-height:1}
  .city{font-style:italic;font-weight:400;opacity:.55}
  .col{display:flex;flex-direction:column;justify-content:center}
  .tag{font-family:Inter,sans-serif;font-weight:500;letter-spacing:-0.01em}
  .url{font-family:Inter,sans-serif;font-weight:400;opacity:.6}
</style></head><body>${body}</body></html>`;

// Horizontal lockup: mark + "Brand Mint — Hyderabad", matching brand-mint-primary.svg
const lockup = (h, ink) => {
  const m = h * 0.667, fs = h * 0.354, cs = h * 0.19;
  return `<div class="row" style="gap:${h * 0.167}px">${MARK(m)}<div style="display:flex;align-items:baseline;gap:${h * 0.12}px;color:${ink}">
    <span class="word" style="font-size:${fs}px">Brand Mint</span><span class="city" style="font-size:${cs}px">— Hyderabad</span></div></div>`;
};

// Cover: mark, name, one line of what we do, the URL. Used at 16:9 and LinkedIn's 5.9:1.
const cover = (w, h, ink) => {
  const m = Math.min(h * 0.5, w * 0.12), name = m * 0.55, tag = m * 0.3, url = m * 0.22;
  return `<div class="row" style="gap:${m * 0.35}px;padding:0 ${w * 0.06}px;color:${ink}">${MARK(m)}<div class="col" style="gap:${m * 0.16}px">
    <div class="word" style="font-size:${name}px">Brand Mint</div>
    <div class="tag" style="font-size:${tag}px">Online stores for Indian brands. Fixed prices.</div>
    <div class="url" style="font-size:${url}px">brandmintstudios.in</div></div></div>`;
};

const ASSETS = [
  // Square profile images. GBP wants ≥250, LinkedIn ≥268; 1080 covers everything.
  { file: "logo-square-cream-1080.png", w: 1080, h: 1080, bg: CREAM, body: MARK(640) },
  { file: "logo-square-white-1080.png", w: 1080, h: 1080, bg: "#FFFFFF", body: MARK(640) },
  { file: "logo-square-dark-1080.png",  w: 1080, h: 1080, bg: DARK,  body: MARK(640) },
  { file: "monogram-transparent-1024.png", w: 1024, h: 1024, bg: "transparent", body: MARK(1024) },
  // Horizontal lockups, 4× the SVG master.
  { file: "logo-horizontal-transparent-1920x384.png", w: 1920, h: 384, bg: "transparent", body: lockup(384, INK) },
  { file: "logo-horizontal-cream-1920x384.png", w: 1920, h: 384, bg: CREAM, body: lockup(384, INK) },
  { file: "logo-horizontal-dark-1920x384.png",  w: 1920, h: 384, bg: DARK,  body: lockup(384, CREAM) },
  // Covers. LinkedIn company cover is 1128×191 (rendered at 2×). GBP cover is 16:9, 1024×576 recommended.
  { file: "linkedin-cover-2256x382.png", w: 2256, h: 382, bg: DARK, body: cover(2256, 382, CREAM) },
  { file: "gbp-cover-1024x576.png", w: 1024, h: 576, bg: DARK, body: cover(1024, 576, CREAM) },
  { file: "gbp-cover-cream-1024x576.png", w: 1024, h: 576, bg: CREAM, body: cover(1024, 576, INK) },
  // Favicon / app icon.
  { file: "favicon-512.png", w: 512, h: 512, bg: "transparent",
    body: fs.readFileSync(path.join(ROOT, "brand-kit/logo/brand-mint-favicon.svg"), "utf8").replace("<svg ", '<svg width="512" height="512" ') },
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ deviceScaleFactor: 1 });
  for (const a of ASSETS) {
    const p = await ctx.newPage();
    await p.setViewportSize({ width: a.w, height: a.h });
    await p.setContent(page(a.w, a.h, a.bg, a.body), { waitUntil: "load" });
    await p.evaluate(() => document.fonts.ready);
    const ok = await p.evaluate(() => document.fonts.check('600 20px "Plus Jakarta Sans"'));
    await p.screenshot({ path: path.join(OUT, a.file), omitBackground: a.bg === "transparent" });
    console.log(`${ok ? "ok " : "NOFONT"} ${a.file} ${a.w}x${a.h}`);
    await p.close();
  }
  await browser.close();
})();
