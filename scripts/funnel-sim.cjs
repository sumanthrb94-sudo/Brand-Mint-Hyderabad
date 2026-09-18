/**
 * End-to-end funnel simulation with objective visual metrics.
 *
 *   python3 -m http.server 8000
 *   NODE_PATH=$(npm root -g) node scripts/funnel-sim.cjs [label]
 *
 * Walks the real path a Hyderabad shop owner takes — home, the tier ladder,
 * the tier click, the sign-in wall, the portal — on a phone, and at every
 * step records numbers rather than impressions:
 *
 *   elements      nodes painted in the viewport (raw density)
 *   sizes         distinct rendered font-sizes (typographic noise)
 *   colours       distinct text colours (palette noise)
 *   ctas          competing buttons/links above the fold
 *   weight        PNG bytes of the viewport
 *
 * WEIGHT IS THE ONE THAT MATTERS AND THE ONE THAT NEEDS EXPLAINING.
 * Compressed file size of a screenshot is the standard computational proxy
 * for visual complexity in the HCI literature (Tuch, Reinecke et al.) —
 * an image with more edges, more distinct regions and more colour variance
 * compresses worse. It is a proxy for CLUTTER, not for quality: a beautiful
 * dense page and an ugly dense page score alike. Read it as "how much is
 * going on here", never as "how good is this".
 *
 * Auth cannot run in the sandbox (gstatic.com is blocked), so the two
 * signed-in steps are measured with JS disabled, which renders the real
 * shell against the real stylesheet without the gate redirecting. That
 * measures chrome honestly and does NOT measure signed-in behaviour.
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ORIGIN = process.env.ORIGIN || "http://localhost:8000";
const LABEL = process.argv[2] || "run";
const OUT = path.join("/tmp/funnel", LABEL);
fs.mkdirSync(OUT, { recursive: true });

const PHONE = { width: 390, height: 844 };

const MEASURE = () => {
  const vh = window.innerHeight, vw = window.innerWidth;
  const inView = (el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw && r.width > 0 && r.height > 0;
  };
  const els = [...document.body.querySelectorAll("*")].filter(el => {
    const cs = getComputedStyle(el);
    return cs.display !== "none" && cs.visibility !== "hidden" && cs.opacity !== "0" && inView(el);
  });
  const sizes = new Set(), colours = new Set();
  for (const el of els) {
    if (!el.textContent || !el.textContent.trim()) continue;
    const cs = getComputedStyle(el);
    sizes.add(cs.fontSize); colours.add(cs.color);
  }
  const ctas = els.filter(el =>
    (el.tagName === "A" || el.tagName === "BUTTON" || el.getAttribute("role") === "button")
    && el.textContent.trim());
  return {
    elements: els.length,
    sizes: sizes.size,
    colours: colours.size,
    ctas: ctas.length,
    ctaText: ctas.slice(0, 8).map(e => e.textContent.trim().replace(/\s+/g, " ").slice(0, 34)),
    docHeight: Math.round(document.body.scrollHeight / vh * 10) / 10,
  };
};

(async () => {
  const b = await chromium.launch();
  const rows = [];

  const step = async (n, name, url, opts = {}) => {
    const ctx = await b.newContext({ viewport: PHONE, javaScriptEnabled: opts.js !== false });
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", e => errs.push(e.message));
    await p.goto(`${ORIGIN}${url}`, { waitUntil: opts.js === false ? "load" : "networkidle" });
    await p.waitForTimeout(opts.js === false ? 300 : 1400);
    if (opts.before) await p.evaluate(opts.before).catch(() => {});
    const m = await p.evaluate(MEASURE);
    const file = path.join(OUT, `${n}-${name}.png`);
    await p.screenshot({ path: file });
    const weight = Math.round(fs.statSync(file).size / 1024);
    rows.push({ n, name, ...m, weight, errs: errs.length });
    await ctx.close();
  };

  // 1. Entry. What a cold visitor from Instagram lands on.
  await step(1, "home", "/index.html");
  // 2. The ladder — the section the hero's primary CTA points at.
  await step(2, "stores", "/index.html#stores");
  // 3. Every price, the page that carries the whole offer.
  await step(3, "pricing", "/pricing.html");
  // 4. The gate. Highest-intent click lands here.
  await step(4, "login", "/login.html?tier=whatsapp", { js: false });
  // 5. Exit. What a converted lead sees.
  await step(5, "portal", "/portal.html", { js: false, before: () => {
    const app = document.getElementById("app"); if (app) app.hidden = false;
    const boot = document.getElementById("boot"); if (boot) boot.hidden = true;
  }});

  console.log(`\n  FUNNEL: ${LABEL}   (390x844, phone)\n`);
  console.log("  step        elem  sizes  cols  CTAs  scrolls  weight  err");
  console.log("  " + "-".repeat(62));
  for (const r of rows) {
    console.log(`  ${String(r.n)}. ${r.name.padEnd(9)} ${String(r.elements).padStart(4)}  ${String(r.sizes).padStart(5)}  ${String(r.colours).padStart(4)}  ${String(r.ctas).padStart(4)}  ${String(r.docHeight).padStart(7)}  ${String(r.weight + "K").padStart(6)}  ${String(r.errs).padStart(3)}`);
  }
  console.log("\n  competing actions in the first screen:");
  for (const r of rows) console.log(`   ${r.n}. ${r.name}: ${r.ctaText.join(" | ") || "(none)"}`);

  fs.writeFileSync(path.join(OUT, "metrics.json"), JSON.stringify(rows, null, 2));
  console.log(`\n  shots + metrics.json in ${OUT}`);
  await b.close();
})();
