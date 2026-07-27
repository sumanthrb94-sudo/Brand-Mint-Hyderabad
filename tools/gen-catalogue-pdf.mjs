#!/usr/bin/env node
/**
 * Renders docs/Brand-Mint-Service-Catalogue.pdf from assets/bm-catalog.js.
 *
 *   node tools/gen-catalog.mjs && node tools/gen-catalogue-pdf.mjs
 *
 * Reads the same generated catalogue the /services page reads, so the PDF and
 * the app can never quote different numbers. Playwright installs outside the
 * repo — there is still no package.json here.
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { CATALOG, FEATURES, CATEGORY_LABELS, DAY_RATE, FLOOR_DAY_RATE } from "../assets/bm-catalog.js";

const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const READY = {
  ready: ["ready", "#0b6b4f", "#e3f5ec", "Shipped before"],
  next:  ["next",  "#92700f", "#faf1da", "Adjacent — low risk"],
  later: ["later", "#b3261e", "#fbe9e7", "Needs discovery first"],
};

const cats = [...new Set(FEATURES.map((f) => f.category))];
const count = (r) => FEATURES.filter((f) => (f.readiness || "ready") === r).length;

const card = (f) => {
  const [, fg, bg, label] = READY[f.readiness] || READY.ready;
  return `<div class="svc">
    <div class="svc-h">
      <div>
        <div class="svc-n">${esc(f.label)}</div>
        <div class="svc-s">${esc(f.summary)}</div>
      </div>
      <div class="svc-p">${inr(f.buildDays * DAY_RATE)}<span>${f.buildDays}d${f.monthlyDays ? ` · +${inr(f.monthlyDays * DAY_RATE)}/mo` : ""}</span></div>
    </div>
    <div class="tags">
      <span class="tag" style="color:${fg};background:${bg}">${label}</span>
      ${f.needsServer ? `<span class="tag" style="color:#92700f;background:#faf1da">Needs a server</span>` : ""}
      ${f.evidence?.length ? `<span class="tag tag--q">Built for ${esc(f.evidence.join(", "))}</span>` : ""}
    </div>
    ${f.stack ? `<div class="stack"><b>Stack</b> ${esc(f.stack)}</div>` : ""}
    ${f.howToBuild ? `<p class="how">${esc(f.howToBuild)}</p>` : ""}
    ${f.requires?.length ? `<div class="need"><b>From the client</b> ${f.requires.map(esc).join(" · ")}</div>` : ""}
    ${f.thirdPartyCost?.length ? `<div class="need"><b>They pay directly</b> ${f.thirdPartyCost.map(esc).join(" · ")}</div>` : ""}
  </div>`;
};

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Brand Mint — Service Catalogue</title>
<style>
  @page { size:A4; margin:14mm 12mm; }
  *{box-sizing:border-box}
  body{font-family:-apple-system,"Segoe UI",Roboto,sans-serif;color:#16241f;font-size:9.6pt;line-height:1.5;margin:0}
  h1{font-size:27pt;margin:0 0 4pt;letter-spacing:-.6pt}
  h2{font-size:14pt;margin:0 0 3pt;padding-bottom:5pt;border-bottom:2px solid #10b981}
  .cover{height:250mm;display:flex;flex-direction:column;justify-content:center;page-break-after:always}
  .mark{width:54px;height:54px;border-radius:50%;background:linear-gradient(140deg,#7cf6c8,#10b981);margin-bottom:18pt}
  .sub{color:#5d7368;font-size:12pt}
  .kpis{display:flex;gap:10pt;margin-top:26pt}
  .kpi{border:1px solid #d8e0d4;border-radius:9px;padding:11pt 14pt;flex:1}
  .kpi b{display:block;font-size:21pt;line-height:1.1}
  .kpi span{font-size:8pt;color:#5d7368}
  section{page-break-before:always}
  .cat-note{color:#5d7368;font-size:8.6pt;margin:0 0 11pt}
  .svc{border:1px solid #e2e8df;border-radius:9px;padding:10pt 12pt;margin-bottom:8pt;page-break-inside:avoid}
  .svc-h{display:flex;justify-content:space-between;gap:12pt;align-items:flex-start}
  .svc-n{font-weight:700;font-size:11pt}
  .svc-s{color:#5d7368;font-size:8.6pt;margin-top:1pt}
  .svc-p{font-weight:800;font-size:13pt;white-space:nowrap;text-align:right}
  .svc-p span{display:block;font-size:7.6pt;font-weight:500;color:#5d7368}
  .tags{display:flex;flex-wrap:wrap;gap:4pt;margin:6pt 0}
  .tag{font-size:7.4pt;font-weight:600;padding:2pt 7pt;border-radius:99px}
  .tag--q{color:#5d7368;background:#eef2ec;font-weight:500}
  .stack{font-size:8.2pt;color:#294a40;margin-bottom:3pt}
  .stack b,.need b{color:#064e3b;font-weight:700}
  .how{margin:0 0 4pt;font-size:8.8pt;line-height:1.55}
  .need{font-size:7.9pt;color:#5d7368;margin-top:2pt}
  .legend{display:flex;gap:8pt;flex-wrap:wrap;margin:10pt 0 0}
  table{width:100%;border-collapse:collapse;font-size:9pt;margin-top:8pt}
  th{text-align:left;font-size:7.4pt;text-transform:uppercase;letter-spacing:.5pt;color:#5d7368;border-bottom:1px solid #d8e0d4;padding:4pt 5pt}
  td{padding:4pt 5pt;border-bottom:1px solid #eef2ec}
  td.n{text-align:right;white-space:nowrap}
  .note{background:#e3f5ec;border-left:3px solid #0b6b4f;padding:8pt 11pt;margin:10pt 0;font-size:8.8pt}
</style></head><body>

<div class="cover">
  <div class="mark"></div>
  <h1>Service catalogue</h1>
  <div class="sub">${FEATURES.length} services · what they cost · how they are built</div>
  <div class="kpis">
    <div class="kpi"><b style="color:#0b6b4f">${count("ready")}</b><span>SHIPPED BEFORE</span></div>
    <div class="kpi"><b>${count("next")}</b><span>ADJACENT — LOW RISK</span></div>
    <div class="kpi"><b style="color:#b3261e">${count("later")}</b><span>NEEDS DISCOVERY</span></div>
  </div>
  <p class="sub" style="font-size:9pt;margin-top:24pt;max-width:125mm">
    Every price is build days × ${inr(DAY_RATE)}. Nothing is sold below
    ${inr(FLOOR_DAY_RATE)}/day. Generated from the same file the quote tool
    reads, so these figures cannot disagree with a quote.
  </p>
</div>

<section>
  <h2>At a glance</h2>
  <p class="cat-note">Ranked by price within each category.</p>
  <table><thead><tr><th>Service</th><th>Category</th><th>Days</th><th class="n">Price</th><th class="n">Monthly</th></tr></thead><tbody>
  ${cats.map((c) => FEATURES.filter((f) => f.category === c).sort((a, b) => b.buildDays - a.buildDays)
      .map((f) => `<tr><td>${esc(f.label)}</td><td style="color:#5d7368">${esc(CATEGORY_LABELS[c] || c)}</td><td>${f.buildDays}</td><td class="n"><b>${inr(f.buildDays * DAY_RATE)}</b></td><td class="n">${f.monthlyDays ? inr(f.monthlyDays * DAY_RATE) : "—"}</td></tr>`).join("")).join("")}
  </tbody></table>
  <div class="note"><b>Care plans.</b> Care ${inr(12500)}/mo · Growth ${inr(25000)}/mo ·
  Managed commerce ${inr(50000)}/mo. All pay ${inr(12500)}/day, because recurring
  revenue is worth more than one-off. Four Growth retainers is break-even on
  eight days of fifteen.</div>
</section>

${cats.map((c) => `<section>
  <h2>${esc(CATEGORY_LABELS[c] || c)}</h2>
  <p class="cat-note">${FEATURES.filter((f) => f.category === c).length} services</p>
  ${FEATURES.filter((f) => f.category === c).map(card).join("")}
</section>`).join("")}

</body></html>`;

const tmp = "/tmp/bm-catalogue.html";
fs.writeFileSync(tmp, html);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage();
await page.goto("file://" + tmp, { waitUntil: "networkidle" });
const out = path.resolve(import.meta.dirname, "../docs/Brand-Mint-Service-Catalogue.pdf");
await page.pdf({ path: out, format: "A4", printBackground: true,
  margin: { top: "14mm", bottom: "14mm", left: "12mm", right: "12mm" } });
await browser.close();
console.log(`${FEATURES.length} services -> ${path.relative(process.cwd(), out)}`);
console.log(`${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
