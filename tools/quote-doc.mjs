#!/usr/bin/env node
/**
 * Render a scope-and-quote document to a printable PDF.
 *
 *   node tools/quote-doc.mjs quotes/niraava.json
 *   -> docs/quotes/NIR-SOW-03.pdf
 *
 * WHY THIS IS A TOOL AND NOT A DOCUMENT
 * -------------------------------------
 * The quotation this replaces was written by hand, and by the time it was read
 * closely it had drifted from the studio's own published pricing in three
 * separate ways:
 *
 *   - it sold a "Starter Store" — a PUBLISHED tier at ₹99,000 over 8 weeks —
 *     for ₹39,999 over 3 weeks. Same name, 40% of the price. A client who
 *     searched the studio mid-negotiation would have found the contradiction
 *     before the studio did.
 *   - it offered a "care plan" at ₹2,500/month against a published ₹12,500.
 *   - it quoted ad-hoc work at ₹900/hour, when the SOW template says the
 *     studio does not bill by the hour, and ₹900/hr is ₹7,200/day — below the
 *     ₹8,000 floor.
 *
 * None of those was carelessness. They are what happens when a number lives in
 * a PDF instead of in the one place the site reads. tests/tiers.test.mjs makes
 * two SCREENS agreeing a build-time guarantee; nothing extended that guarantee
 * to a document, so this does.
 *
 * The tier prices, the care plans and the day rate are lifted out of
 * assets/bm-app.js at render time by the same text-extraction the offline test
 * suites use — bm-app.js pulls the Firebase SDK from gstatic at module scope
 * and cannot be imported in node. Nothing about pricing is typed into a quote
 * manifest, and the guards below refuse to render when a manifest tries.
 *
 * Printing is done by the Chromium already installed for the test suites, so
 * this adds nothing to install (CLAUDE.md §3: runtime dependencies, none).
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const SRC = fs.readFileSync(path.join(ROOT, "assets/bm-app.js"), "utf8");

const die = (msg) => {
  process.stderr.write(`\n  ${msg}\n\n`);
  process.exit(1);
};

/* ── the published numbers, lifted from the one place that owns them ──
   Same approach as tests/tiers.test.mjs. Deliberately NOT a second copy: a
   constant restated here would be exactly the drift this tool exists to stop. */

function liftConst(name) {
  const start = SRC.indexOf(`export const ${name} = `);
  if (start === -1) die(`${name} is gone from bm-app.js — this tool cannot price anything.`);
  let i = SRC.indexOf("=", start) + 1;
  while (/\s/.test(SRC[i])) i += 1;
  const opener = SRC[i];
  if (opener !== "[" && opener !== "{") return SRC.slice(start, SRC.indexOf(";", i) + 1);
  const closer = opener === "[" ? "]" : "}";
  let depth = 0;
  let inStr = null;
  for (; i < SRC.length; i += 1) {
    const ch = SRC[i];
    if (inStr) {
      if (ch === "\\") i += 1;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; continue; }
    if (ch === opener) depth += 1;
    else if (ch === closer && --depth === 0) return `${SRC.slice(start, i + 1)};`;
  }
  die(`unbalanced brackets lifting ${name}`);
}

const published = await import(
  "data:text/javascript," +
    encodeURIComponent(
      [liftConst("TIERS"), liftConst("CARE_PLANS"), liftConst("DAY_RATE"),
       liftConst("CARE_NOTICE_DAYS"), liftConst("SCOPE_TERMS")].join("\n")
    )
);

const { TIERS, CARE_PLANS, DAY_RATE, CARE_NOTICE_DAYS, SCOPE_TERMS } = published;

// The floor exists to stop work that is not worth starting. It lives in the
// generated catalog rather than bm-app.js, so it is read as a plain number.
const FLOOR_DAY_RATE = Number(
  /"floorDayRate":\s*(\d+)/.exec(fs.readFileSync(path.join(ROOT, "assets/bm-catalog.js"), "utf8"))?.[1] || 8000
);
const WORKING_DAYS_PER_WEEK = 5;

/* ── load and check the manifest ─────────────────────────────────── */

const manifestPath = process.argv[2];
if (!manifestPath) die("usage: node tools/quote-doc.mjs <quote.json>");
const q = JSON.parse(fs.readFileSync(path.resolve(ROOT, manifestPath), "utf8"));

const money = (n) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* GUARD 1 — a quote may not reuse a published tier's name.
   This is the one that actually happened. A smaller, cheaper product sold
   under a tier's name is a contradiction a client can find with one search,
   and it destroys the fixed-price promise the tiers exist to make. */
const clash = TIERS.find(
  (t) => t.label.toLowerCase() === String(q.package || "").trim().toLowerCase()
);
if (clash) {
  die(
    `"${q.package}" is a PUBLISHED TIER: ${money(clash.price)} over ${clash.weeks} weeks.\n` +
    `  This quote prices it at ${money(q.price)} over ${q.weeks} weeks.\n\n` +
    `  Give the package its own name, or quote the tier at its published price.\n` +
    `  Two different products cannot share a name — the site declares this one\n` +
    `  in structured data, and a client will find the contradiction.`
  );
}

/* GUARD 2 — the care plan is read from bm-app.js, never from the manifest.
   The manifest names a plan id; the price comes from the published list. */
let care = null;
if (q.carePlan) {
  care = CARE_PLANS.find((p) => p.id === q.carePlan);
  if (!care) {
    die(`No published care plan with id "${q.carePlan}".\n` +
        `  Available: ${CARE_PLANS.map((p) => `${p.id} (${money(p.monthly)}/mo)`).join(", ")}`);
  }
}
if (q.carePlanMonthly !== undefined) {
  die("A quote may not set carePlanMonthly. Care plan prices are published in\n" +
      "  bm-app.js and read from there. Name a plan with \"carePlan\": \"<id>\".");
}

/* GUARD 3 — no hourly rate, anywhere. The SOW template says the studio quotes
   a fixed scope before work begins and never bills after it. */
if (q.hourlyRate !== undefined || /per hour|\/ ?hour|an hour/i.test(JSON.stringify(q.notIncluded || []))) {
  die("This quote carries an hourly rate. The studio does not bill by the hour —\n" +
      "  work is quoted as a fixed scope before it begins, never invoiced after.");
}

/* GUARD 4 — the line items must reconcile to the list price. A quotation whose
   own arithmetic does not add up is the fastest way to lose a negotiation. */
const lineTotal = (q.lineItems || []).reduce((n, l) => n + Number(l.amount || 0), 0);
if (lineTotal !== Number(q.listPrice)) {
  die(`Line items total ${money(lineTotal)} but listPrice is ${money(q.listPrice)}.\n` +
      `  They must agree — the client will add them up.`);
}
const schedTotal = (q.schedule || []).reduce((n, s) => n + Number(s.pct || 0), 0);
if (q.schedule && schedTotal !== 100) die(`Payment schedule sums to ${schedTotal}%, not 100%.`);

/* THE DAY RATE. Not a guard that blocks — a number printed where it cannot be
   missed. Pricing below the floor is the studio's decision to make; making it
   ACCIDENTALLY is not. The original quote was ₹2,666/day and nothing said so. */
const days = Number(q.weeks) * WORKING_DAYS_PER_WEEK;
const impliedDayRate = Math.round(Number(q.price) / days);
const belowFloor = impliedDayRate < FLOOR_DAY_RATE;

/* ── the document ────────────────────────────────────────────────── */

const discount = Number(q.listPrice) - Number(q.price);
const schedule = (q.schedule || []).map((s, i, arr) => {
  // Last row absorbs the rounding so the instalments sum to the price exactly.
  const amount = i === arr.length - 1
    ? Number(q.price) - arr.slice(0, -1).reduce((n, x) => n + Math.round(Number(q.price) * x.pct / 100), 0)
    : Math.round(Number(q.price) * s.pct / 100);
  return { ...s, amount };
});

/* SCOPE_TERMS.paymentSchedule describes the STANDARD tier terms — "50% to
   start, 50% on completion". A quote using any other split (this one is
   40/40/20) must not print it, or the page contradicts its own table two lines
   above it. Caught by reading the rendered PDF rather than the source, which is
   the only way this kind of thing is ever caught.

   What survives either way is the definition of completion, because that is the
   sentence that stops a client expecting a live store before the final payment
   clears. */
/* The one sentence that keeps the package-name guard honest on the page.
   The naming collision is solved by calling this something else; this line
   says WHY it costs less, in a form a small shop owner cares about. The full
   tier table was dropped — a jeweller doing thirty orders a month does not
   need to read about a ₹3,00,000 package, and listing it reads as showing off
   rather than as an explanation. */
const starter = TIERS.find((t) => t.id === "starter");
const smallerThanNote =
  `This is a smaller build than our standard ${starter.label} `
  + `(${money(starter.price)}, ${starter.weeks} weeks), which adds customer `
  + `accounts, OTP sign-in and automated email. You have told us you would `
  + `rather answer customers on WhatsApp, so we have left those out — and you `
  + `can add any of them later without rebuilding the shop.`;

const isStandardSplit = (q.schedule || []).length === 2
  && q.schedule.every((s) => Number(s.pct) === 50);
const completionNote = isStandardSplit
  ? SCOPE_TERMS.paymentSchedule
  : "Completion means the build is finished, tested and signed off on staging. "
    + "Go-live follows the final payment, not the other way round.";

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<title>${esc(q.client)} — Scope &amp; Deliverables</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "DejaVu Sans", system-ui, sans-serif;
         color: #0b1f1a; font-size: 9.6pt; line-height: 1.5; }
  .page { padding: 18mm 16mm 20mm; page-break-after: always; position: relative; min-height: 297mm; }
  .page:last-child { page-break-after: auto; }
  .rule { height: 1px; background: #d8e2dc; margin: 14px 0; }
  .eyebrow { font-size: 7.2pt; letter-spacing: .18em; text-transform: uppercase; color: #5d7368; }
  h1 { font-size: 26pt; line-height: 1.12; margin: 6px 0 10px; font-weight: 700; }
  h2 { font-size: 15pt; margin: 0 0 4px; font-weight: 700; }
  h3 { font-size: 10.5pt; margin: 16px 0 6px; font-weight: 700; }
  p { margin: 0 0 9px; }
  .lede { color: #3d5249; font-size: 10.4pt; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .kv { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 18px; margin-top: 18px; }
  .kv .k { font-size: 7.2pt; letter-spacing: .16em; text-transform: uppercase; color: #5d7368; }
  .kv .v { font-size: 12.5pt; font-weight: 700; }
  .strike { text-decoration: line-through; color: #93a69e; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 14px; }
  th { text-align: left; font-size: 7.2pt; letter-spacing: .14em; text-transform: uppercase;
       color: #5d7368; border-bottom: 1px solid #0b1f1a; padding: 0 0 5px; font-weight: 600; }
  td { padding: 7px 0; border-bottom: 1px solid #e6ece9; vertical-align: top; }
  td.r, th.r { text-align: right; white-space: nowrap; }
  .note { color: #5d7368; font-size: 8.4pt; }
  .total td { border-top: 1.5px solid #0b1f1a; border-bottom: none; font-weight: 700; font-size: 11.5pt; padding-top: 9px; }
  .disc td { color: #0f7a52; }
  ul { margin: 0 0 9px; padding-left: 15px; }
  li { margin-bottom: 3px; }
  .card { border: 1px solid #d8e2dc; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; }
  .card h4 { margin: 0 0 5px; font-size: 8pt; letter-spacing: .14em; text-transform: uppercase; color: #5d7368; font-weight: 600; }
  .foot { position: absolute; bottom: 12mm; left: 16mm; right: 16mm;
          font-size: 7.4pt; color: #7b8f86; display: flex; justify-content: space-between;
          border-top: 1px solid #e6ece9; padding-top: 6px; }
  .callout { background: #f2f7f4; border-left: 3px solid #10b981; padding: 11px 14px; margin: 12px 0; }
  .callout strong { display: block; margin-bottom: 4px; }
  .sig { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 34px; }
  .sig div { border-top: 1px solid #0b1f1a; padding-top: 7px; font-size: 8pt; color: #5d7368; }
</style></head><body>

<section class="page">
  <span class="eyebrow">Scope of work &amp; deliverables</span>
  <h1>${esc(q.title)}</h1>
  <p class="lede">${esc(q.subtitle)}</p>
  <div class="rule"></div>
  <div class="kv">
    <div><div class="k">Prepared for</div><div class="v">${esc(q.client)}</div></div>
    <div><div class="k">Package</div><div class="v">${esc(q.package)}</div></div>
    <div><div class="k">Investment</div><div class="v">
      ${q.listPrice !== q.price ? `<span class="strike">${money(q.listPrice)}</span> ` : ""}${money(q.price)}
    </div></div>
    <div><div class="k">Delivery</div><div class="v">${q.weeks} weeks from kick-off</div></div>
    <div><div class="k">Quotation valid</div><div class="v">${q.validDays} days from issue</div></div>
    <div><div class="k">Document</div><div class="v">${esc(q.docId)}</div></div>
  </div>
  ${q.packageNote ? `<div class="callout"><strong>About this package</strong>${esc(q.packageNote)}</div>` : ""}

  <h3>What you get</h3>
  <ul>
    <li>A live jewellery store your customers can browse, choose from and pay for.</li>
    <li>A private dashboard at <strong>/admin</strong> that works on your phone —
        add pieces, set stock and prices, move orders, record returns.</li>
    <li>Every order handed to you on WhatsApp with the message already written.</li>
    <li>Four ways to pay: UPI, cards, netbanking, and cash on delivery.</li>
  </ul>

  <p class="note">${esc(smallerThanNote)}</p>
  <div class="foot"><span>${esc(q.client)} · Scope &amp; Deliverables</span><span>1</span></div>
</section>

<section class="page">
  <span class="eyebrow">Commercials</span>
  <h2>What it costs</h2>
  <p class="lede">One fixed price. No platform subscription, no per-order
     commission, no licence renewal.</p>
  <table>
    <thead><tr><th>Line item</th><th class="r">Amount</th></tr></thead>
    <tbody>
      ${q.lineItems.map((l) => `<tr><td>${esc(l.label)}<div class="note">${esc(l.note)}</div></td>
        <td class="r">${money(l.amount)}</td></tr>`).join("")}
      <tr><td><strong>Subtotal</strong></td><td class="r"><strong>${money(q.listPrice)}</strong></td></tr>
      ${discount > 0 ? `<tr class="disc"><td>${esc(q.discountLabel || "Discount")}</td>
        <td class="r">−${money(discount)}</td></tr>` : ""}
      <tr class="total"><td>Payable</td><td class="r">${money(q.price)}</td></tr>
    </tbody>
  </table>

  <p class="note"><strong>${money(q.price)} is what you pay.</strong>
     We are not GST registered, so no tax is added and no tax invoice is issued.
     If our registration completes while your project is running, we will tell
     you before it affects any invoice.</p>

  <h3>Payment schedule</h3>
  <table>
    <tbody>
      ${schedule.map((s) => `<tr><td>${esc(s.label)} (${s.pct}%)</td>
        <td class="r">${money(s.amount)}</td></tr>`).join("")}
    </tbody>
  </table>
  <p class="note">${esc(completionNote)}</p>

  <h3>Delivery — ${q.weeks} weeks, in ${q.stages.length} stages</h3>
  <p class="note">The clock starts when your material reaches us, not on the day
     the invoice is paid.</p>
  <table>
    <thead><tr><th>Stage</th><th>What happens</th><th class="r">Working days</th></tr></thead>
    <tbody>
      ${q.stages.map((s) => `<tr><td style="width:70px;"><strong>${esc(s.name)}</strong></td>
        <td>${esc(s.what)}</td><td class="r">${esc(s.days)}</td></tr>`).join("")}
    </tbody>
  </table>
  <p class="note">${esc(SCOPE_TERMS.timelineRule)}</p>
  <div class="foot"><span>${esc(q.client)} · Scope &amp; Deliverables</span><span>2</span></div>
</section>

<section class="page">
  <span class="eyebrow">After launch &amp; boundaries</span>
  <h2>Support, add-ons and what is not included</h2>

  <h3>Support after launch</h3>
  <ul>
    <li><strong>${SCOPE_TERMS.warrantyDays} days of free fixes</strong> — anything that does not work as described in this document.</li>
    <li>A recorded walkthrough of the dashboard, plus a written guide you keep.</li>
    ${care ? `<li>Optional <strong>${esc(care.label)} plan at ${money(care.monthly)} a month</strong> —
      ${esc((care.adds || []).join(", ").toLowerCase())}. Cancel with ${CARE_NOTICE_DAYS} days' notice.</li>` : ""}
    <li>Work beyond the warranty is quoted as a fixed scope before it begins.
        <strong>We do not bill by the hour</strong> — you get a price before the
        work starts, never an invoice after it.</li>
  </ul>

  <h3>When you outgrow WhatsApp</h3>
  <p class="note">Each of these bolts onto the shop you already have. Nothing
     gets rebuilt, and there is no rush — most shops run happily on WhatsApp
     for a long time before they need any of it.</p>
  <table>
    <thead><tr><th>What it adds</th><th class="r">Price</th></tr></thead>
    <tbody>
      ${q.addOns.map((a) => `<tr><td>${esc(a.label)}<div class="note">${esc(a.note)}</div></td>
        <td class="r">${money(a.amount)}</td></tr>`).join("")}
    </tbody>
  </table>

  <h3>Outside the engagement entirely</h3>
  <div class="grid2">
    <ul>${q.notIncluded.slice(0, Math.ceil(q.notIncluded.length / 2)).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
    <ul>${q.notIncluded.slice(Math.ceil(q.notIncluded.length / 2)).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
  </div>

  <div class="callout">
    <strong>Policies and compliance are yours</strong>
    We build, style and publish your terms of use, privacy, returns, refund and
    shipping pages, and tell you what headings each needs — but the wording, its
    accuracy and its compliance with the Consumer Protection (E-Commerce) Rules,
    the IT Rules, GST and any other applicable law rest with you. We are a
    development studio, not a law firm, and nothing here is legal advice.
  </div>

  <h3>Terms</h3>
  <ul>
    <li>This quotation is valid ${q.validDays} days from issue.</li>
    <li>Two rounds of revisions are included at the design stage; further rounds are quoted separately.</li>
    <li>${esc(SCOPE_TERMS.uatRule)}</li>
    <li>${esc(SCOPE_TERMS.ownershipRule)}</li>
    <li>Hosting, domain and gateway accounts are created in your name, not ours.</li>
    <li>We may show the finished store in our portfolio unless you ask us not to.</li>
  </ul>

  <div class="sig">
    <div>For ${esc(q.client)} — name, signature, date</div>
    <div>For Brand Mint Studios — name, signature, date</div>
  </div>
  <div class="foot"><span>${esc(q.client)} · ${esc(q.docId)}</span><span>3</span></div>
</section>

</body></html>`;

const OUT_DIR = path.join(ROOT, "docs/quotes");
fs.mkdirSync(OUT_DIR, { recursive: true });
const out = path.join(OUT_DIR, `${q.docId}.pdf`);

if (process.env.BM_QUOTE_HTML) fs.writeFileSync(process.env.BM_QUOTE_HTML, html);

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "load" });
await page.pdf({ path: out, format: "A4", printBackground: true,
                 margin: { top: 0, bottom: 0, left: 0, right: 0 } });
await browser.close();

const kb = (fs.statSync(out).size / 1024).toFixed(0);
process.stdout.write(
  `\n  ${path.relative(ROOT, out)} — ${kb} KB\n\n` +
  `  package     ${q.package}\n` +
  `  price       ${money(q.price)}${discount > 0 ? `  (from ${money(q.listPrice)})` : ""}\n` +
  `  timeline    ${q.weeks} weeks = ${days} working days\n` +
  `  day rate    ${money(impliedDayRate)}/day` +
  (belowFloor
    ? `   ** BELOW YOUR ${money(FLOOR_DAY_RATE)} FLOOR **\n\n` +
      `  The floor exists to stop work that is not worth starting. Quoting under\n` +
      `  it is a decision you are allowed to make — but make it deliberately:\n` +
      `  raise the price, or lengthen the timeline, or accept the loss knowingly.\n`
    : `   (floor ${money(FLOOR_DAY_RATE)}, standard ${money(DAY_RATE)})\n`) +
  (care ? `  care plan   ${care.label} — ${money(care.monthly)}/mo, read from bm-app.js\n` : "") +
  `\n`
);
