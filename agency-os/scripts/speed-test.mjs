/**
 * Measure the built site's real load, on a throttled connection.
 *
 *   node scripts/speed-test.mjs                 # against the local build
 *   node scripts/speed-test.mjs https://…       # against production
 *
 * Not a Lighthouse score. A score is a number to feel good about; these are the
 * three metrics Google actually ranks on, plus the byte weight that causes them.
 *
 * It throttles to a slow 4G profile deliberately. Measuring on a datacentre
 * connection tells you nothing about a shop owner on a phone in Hyderabad, and
 * that is the entire audience.
 *
 * Exits non-zero if a metric is in the "poor" band, so it can gate a deploy.
 */
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { extname, join, resolve } from "node:path";

const require = createRequire(import.meta.url);
// Resolve whichever Playwright this repo actually has — the app depends on
// @playwright/test, a bare `playwright` import is not guaranteed anywhere.
let chromium;
for (const id of ["playwright", "@playwright/test", "playwright-core"]) {
  try { ({ chromium } = require(id)); break; } catch { /* try the next */ }
}
if (!chromium) {
  console.error("playwright not found — pnpm install in agency-os/");
  process.exit(1);
}

const DIST = resolve("dist/public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png",
  ".woff2": "font/woff2", ".json": "application/json", ".xml": "application/xml", ".txt": "text/plain" };

// Google's Core Web Vitals boundaries.
const GOOD = { LCP: 2500, CLS: 0.1, TTFB: 800 };
const POOR = { LCP: 4000, CLS: 0.25, TTFB: 1800 };
const band = (k, v) => (v <= GOOD[k] ? "good" : v <= POOR[k] ? "needs work" : "POOR");

async function serve() {
  const server = createServer(async (req, res) => {
    const url = decodeURIComponent((req.url || "/").split("?")[0]);
    let file = join(DIST, url === "/" ? "index.html" : url);
    try {
      if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    } catch {
      file = join(DIST, "index.html");        // SPA fallback, same as Vercel
    }
    try {
      let body = await readFile(file);
      const type = TYPES[extname(file)] ?? "application/octet-stream";
      const headers = { "content-type": type };
      // Vercel gzips text assets. Serving them raw here would measure a site
      // that never ships, and would overstate LCP by seconds on a throttled
      // connection.
      if (/text|javascript|json|xml|svg/.test(type) && /gzip/.test(req.headers["accept-encoding"] || "")) {
        body = gzipSync(body);
        headers["content-encoding"] = "gzip";
      }
      headers["content-length"] = String(body.length);   // so the byte count is real
      res.writeHead(200, headers);
      res.end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  await new Promise(r => server.listen(0, r));
  return { server, url: `http://127.0.0.1:${server.address().port}/` };
}

const target = process.argv[2];
const local = target ? null : await serve();
const url = target ?? local.url;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });

// Slow 4G: 1.6 Mbps down, 150 ms RTT — a realistic Indian mobile connection.
const cdp = await page.context().newCDPSession(page);
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", {
  offline: false, downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8, latency: 150,
});
// 4× approximates a mid-range phone against a normal laptop. Override with
// CPU=1 when the host itself is slow (a CI container), or the throttle compounds
// with the host and the number stops meaning anything.
const cpuRate = Number(process.env.CPU ?? 4);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpuRate });

const bytes = { total: 0, js: 0, css: 0, img: 0, font: 0 };
page.on("response", async res => {
  try {
    const len = Number(res.headers()["content-length"] || 0);
    if (!len) return;
    bytes.total += len;
    const t = res.request().resourceType();
    if (t === "script") bytes.js += len;
    else if (t === "stylesheet") bytes.css += len;
    else if (t === "image") bytes.img += len;
    else if (t === "font") bytes.font += len;
  } catch { /* a response that never resolved is not a measurement */ }
});

await page.goto(url, { waitUntil: "load", timeout: 60_000 });
await page.waitForTimeout(3500);              // let LCP and late shifts settle

const m = await page.evaluate(() => new Promise(resolve => {
  let lcp = 0, cls = 0;
  new PerformanceObserver(l => { const e = l.getEntries().at(-1); if (e) lcp = e.startTime; })
    .observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver(l => {
    for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value;
  }).observe({ type: "layout-shift", buffered: true });
  setTimeout(() => {
    const nav = performance.getEntriesByType("navigation")[0] || {};
    resolve({ LCP: lcp, CLS: cls, TTFB: nav.responseStart ?? 0,
              FCP: performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0,
              DCL: nav.domContentLoadedEventEnd ?? 0 });
  }, 300);
}));

const kb = n => `${(n / 1024).toFixed(0)} KB`;
console.log(`\n  ${target ?? "local build"}   ·  slow 4G, ${cpuRate}× CPU, 390×844\n`);
const rows = [["LCP", m.LCP, "ms"], ["CLS", m.CLS, ""], ["TTFB", m.TTFB, "ms"]];
let failed = [];
for (const [k, v, unit] of rows) {
  const b = band(k, v);
  const shown = k === "CLS" ? v.toFixed(3) : `${Math.round(v)}${unit}`;
  console.log(`  ${k.padEnd(6)} ${shown.padStart(8)}   ${b}`);
  if (b === "POOR") failed.push(k);
}
console.log(`  ${"FCP".padEnd(6)} ${`${Math.round(m.FCP)}ms`.padStart(8)}`);
console.log(`\n  transferred  ${kb(bytes.total)}   js ${kb(bytes.js)} · css ${kb(bytes.css)} · img ${kb(bytes.img)} · font ${kb(bytes.font)}\n`);

await browser.close();
local?.server.close();

if (failed.length) {
  console.error(`  ${failed.join(", ")} in the poor band.\n`);
  process.exit(1);
}
