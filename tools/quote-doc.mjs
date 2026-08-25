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
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
<style>
  /* The studio's own palette, so a quotation looks like it came from the same
     place as the website. Not a generic document template with a logo on it. */
  :root {
    --ink: #0b1f1a; --ink-2: #294a40; --muted: #5d7368;
    --bg: #f5f7f4; --line: #d8e0d4; --cream: #fbfaf2;
    --mint: #10b981; --mint-2: #7cf6c8; --mint-3: #064e3b;
    --gold: #c9a961; --gold-2: #e8d49c;
  }
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0; color: var(--ink); background: #fff;
    font-family: Inter, "DejaVu Sans", system-ui, sans-serif;
    font-size: 9.4pt; line-height: 1.58;
    -webkit-font-smoothing: antialiased;
  }
  .page { padding: 20mm 18mm 22mm; page-break-after: always; position: relative; min-height: 297mm; }
  .page:last-child { page-break-after: auto; }

  /* ── the cover ──────────────────────────────────────────────────
     Full-bleed ink. A quotation is the first thing this studio hands a
     client who has never seen its work; the cover is doing the job a
     portfolio would. */
  .cover {
    background: var(--ink); color: var(--cream);
    display: flex; flex-direction: column; justify-content: space-between;
  }
  /* A single hairline of gold, the one flourish in the document. Sits directly
     under the wordmark rather than floating at a fixed offset — absolutely
     positioned it landed in dead space, which reads as a stray rule instead of
     a deliberate one. */
  .hairline {
    height: 1px; margin-top: 12px;
    background: linear-gradient(90deg, var(--gold), rgba(201,169,97,0));
  }
  .mark {
    display: flex; align-items: center; gap: 9px;
    font-weight: 700; font-size: 11pt; letter-spacing: -0.01em;
  }
  .mark i {
    width: 22px; height: 22px; border-radius: 6px; display: grid; place-items: center;
    background: var(--mint); color: var(--ink); font-style: normal;
    font-weight: 700; font-size: 11pt;
  }
  .mark span { color: var(--mint-2); font-weight: 500; font-size: 8.4pt; letter-spacing: .06em; }
  .cover h1 {
    font-family: "Instrument Serif", "DejaVu Serif", Georgia, serif;
    font-weight: 400; font-size: 40pt; line-height: 1.04;
    margin: 0 0 14px; letter-spacing: -0.015em;
  }
  .cover h1 em { font-style: italic; color: var(--mint-2); }
  .cover .lede { color: #a9c4b8; font-size: 11.5pt; max-width: 118mm; margin: 0; line-height: 1.5; }
  .cover .kv { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px 20px; margin-top: 4mm; }
  .cover .k { font-size: 6.8pt; letter-spacing: .2em; text-transform: uppercase; color: #7d9a8d; margin-bottom: 3px; }
  .cover .v { font-size: 11pt; font-weight: 600; color: var(--cream); }
  .cover .v small { display: block; font-weight: 400; font-size: 8pt; color: #a9c4b8; margin-top: 2px; }

  /* The price, treated as the moment it is. */
  .price-block { border-top: 1px solid rgba(251,250,242,.18); padding-top: 7mm; margin-top: 7mm; }
  .price {
    font-family: "Instrument Serif", "DejaVu Serif", Georgia, serif;
    font-size: 34pt; font-weight: 400; line-height: 1; color: var(--mint-2);
  }
  .price s { color: #6d8a7e; font-size: 17pt; margin-right: 10px; text-decoration-thickness: 1px; }
  .price-note { color: #a9c4b8; font-size: 8.6pt; margin-top: 6px; }

  /* ── interior pages ─────────────────────────────────────────── */
  .eyebrow {
    font-size: 6.8pt; letter-spacing: .2em; text-transform: uppercase;
    color: var(--mint-3); font-weight: 600; display: block; margin-bottom: 5px;
  }
  h2 {
    font-family: "Instrument Serif", "DejaVu Serif", Georgia, serif;
    font-weight: 400; font-size: 22pt; line-height: 1.12;
    margin: 0 0 6px; letter-spacing: -0.01em;
  }
  h3 {
    font-size: 10pt; margin: 20px 0 7px; font-weight: 600;
    letter-spacing: -0.005em;
  }
  h3::before {
    content: ""; display: inline-block; width: 12px; height: 2px;
    background: var(--mint); vertical-align: middle; margin-right: 8px;
    position: relative; top: -1px;
  }
  p { margin: 0 0 9px; }
  .lede { color: var(--ink-2); font-size: 10.6pt; line-height: 1.55; }
  .note { color: var(--muted); font-size: 8.5pt; line-height: 1.55; }
  ul { margin: 0 0 10px; padding-left: 0; list-style: none; }
  li { margin-bottom: 6px; padding-left: 16px; position: relative; }
  li::before {
    content: ""; position: absolute; left: 0; top: 7px;
    width: 5px; height: 5px; border-radius: 50%; background: var(--mint);
  }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 22px; }

  table { width: 100%; border-collapse: collapse; margin: 10px 0 16px; }
  th {
    text-align: left; font-size: 6.8pt; letter-spacing: .16em; text-transform: uppercase;
    color: var(--muted); border-bottom: 1px solid var(--ink); padding: 0 0 6px; font-weight: 600;
  }
  td { padding: 9px 0; border-bottom: 1px solid #eaefe9; vertical-align: top; }
  td.r, th.r { text-align: right; white-space: nowrap; }
  .amt { font-family: "JetBrains Mono", "DejaVu Sans Mono", monospace; font-size: 9pt; }
  .sub td { font-weight: 600; }
  .disc td { color: var(--mint-3); }
  .total td {
    border-top: 1.5px solid var(--ink); border-bottom: none;
    font-weight: 700; font-size: 13pt; padding-top: 11px;
  }
  .total td.r { font-family: "Instrument Serif", Georgia, serif; font-weight: 400; font-size: 19pt; }

  .callout {
    background: #f2f7f4; border-left: 2px solid var(--mint);
    padding: 12px 15px; margin: 14px 0; font-size: 9pt;
  }
  .callout strong { display: block; margin-bottom: 3px; }
  .paybox {
    border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px;
    background: linear-gradient(180deg, #fbfcfb, #f4f7f4); margin: 12px 0 16px;
  }
  .paybox .row { display: flex; justify-content: space-between; padding: 6px 0; }
  .paybox .row + .row { border-top: 1px solid #e6ece9; }
  .paybox .row b { font-family: "JetBrains Mono", "DejaVu Sans Mono", monospace; font-weight: 500; }

  .foot {
    position: absolute; bottom: 13mm; left: 18mm; right: 18mm;
    font-size: 7pt; color: #8fa298; display: flex; justify-content: space-between;
    border-top: 1px solid #eaefe9; padding-top: 7px; letter-spacing: .04em;
  }
  .sig { display: grid; grid-template-columns: 1fr 1fr; gap: 34px; margin-top: 30px; }
  .sig div { border-top: 1px solid var(--ink); padding-top: 8px; font-size: 7.8pt; color: var(--muted); }
  .closer {
    font-family: "Instrument Serif", "DejaVu Serif", Georgia, serif;
    font-size: 14pt; line-height: 1.4; color: var(--ink); margin: 4px 0 0;
  }
</style></head><body>

<section class="page cover">
  <div>
    <div class="mark"><i>B</i>Brand Mint <span>— Hyderabad</span></div>
    <div class="hairline"></div>
  </div>

  <div>
    <span class="eyebrow" style="color:var(--mint-2);">Scope of work &amp; deliverables</span>
    <h1>${esc(q.title.replace(/&/g, "and"))}<br /><em>for ${esc(q.client)}</em></h1>
    <p class="lede">${esc(q.subtitle)}</p>

    <div class="price-block">
      <div class="price">${q.listPrice !== q.price ? `<s>${money(q.listPrice)}</s>` : ""}${money(q.price)}</div>
      <div class="price-note">${esc(q.discountLabel || "")} · ${q.weeks} weeks from kick-off · no GST added</div>
    </div>
  </div>

  <div class="kv">
    <div><div class="k">Prepared for</div><div class="v">${esc(q.client)}</div></div>
    <div><div class="k">Package</div><div class="v">${esc(q.package)}</div></div>
    <div><div class="k">Document</div><div class="v">${esc(q.docId)}<small>Valid ${q.validDays} days from issue</small></div></div>
  </div>
</section>

<section class="page">
  <span class="eyebrow">The project</span>
  <h2>A store that sells, and a phone that runs it</h2>
  <p class="lede">You get a complete, live jewellery store — browse, choose, pay —
     plus a private dashboard where you manage products and orders yourself.
     Everything after the sale happens where your customers already are.</p>

  <h3>What you get</h3>
  <ul>
    <li>A live jewellery store your customers can browse, choose from and pay for.</li>
    <li>A private dashboard at <strong>/admin</strong> that works on your phone —
        add pieces, set stock and prices, move orders, record returns.</li>
    <li>Every order handed to you on WhatsApp with the message already written.</li>
    <li>Four ways to pay: UPI, cards, netbanking, and cash on delivery.</li>
  </ul>

  <p class="note">${esc(smallerThanNote)}</p>

  <h3>How an order actually moves</h3>
  <ul>
    <li><strong>They order and pay.</strong> Razorpay handles UPI, cards and netbanking.
        Money lands in your account. If they would rather talk first, they reserve
        the piece and you send a payment link.</li>
    <li><strong>You confirm on WhatsApp.</strong> The order page hands the customer a
        pre-written message with the pieces, sizes, total, address and gift note.
        One tap and it is in your inbox.</li>
    <li><strong>You pack, ship and close it out.</strong> Add the courier and tracking
        number; their order page updates immediately. Returns and refunds are
        recorded on the same screen.</li>
  </ul>

  <div class="foot"><span>${esc(q.client)} · Scope &amp; Deliverables</span><span>02</span></div>
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
        <td class="r amt">${money(l.amount)}</td></tr>`).join("")}
      <tr class="sub"><td>Subtotal</td><td class="r amt">${money(q.listPrice)}</td></tr>
      ${discount > 0 ? `<tr class="disc"><td>${esc(q.discountLabel || "Discount")}</td>
        <td class="r amt">−${money(discount)}</td></tr>` : ""}
      <tr class="total"><td>Payable</td><td class="r">${money(q.price)}</td></tr>
    </tbody>
  </table>

  <p class="note"><strong>${money(q.price)} is what you pay.</strong>
     We are not GST registered, so no tax is added and no tax invoice is issued.
     If our registration completes while your project is running, we will tell
     you before it affects any invoice.</p>

  <h3>Payment schedule</h3>
  <div class="paybox">
    ${schedule.map((s) => `<div class="row"><span>${esc(s.label)} <span class="note">(${s.pct}%)</span></span>
      <b>${money(s.amount)}</b></div>`).join("")}
  </div>
  <p class="note">${esc(completionNote)}</p>

  <h3>Delivery — ${q.weeks} weeks</h3>
  <table>
    <thead><tr><th>Stage</th><th>What happens</th><th class="r">Days</th></tr></thead>
    <tbody>
      ${q.stages.map((s) => `<tr><td style="width:66px;"><strong>${esc(s.name)}</strong></td>
        <td>${esc(s.what)}</td><td class="r note">${esc(s.days)}</td></tr>`).join("")}
    </tbody>
  </table>
  <p class="note">${esc(SCOPE_TERMS.timelineRule)}</p>
  <div class="foot"><span>${esc(q.client)} · Scope &amp; Deliverables</span><span>03</span></div>
</section>

<section class="page">
  <span class="eyebrow">After launch</span>
  <h2>When you outgrow WhatsApp</h2>
  <p class="lede">Each of these bolts onto the shop you already have. Nothing
     gets rebuilt, and there is no rush — most shops run happily on WhatsApp
     for a long time before they need any of it.</p>
  <table>
    <thead><tr><th>What it adds</th><th class="r">Price</th></tr></thead>
    <tbody>
      ${q.addOns.map((a) => `<tr><td>${esc(a.label)}<div class="note">${esc(a.note)}</div></td>
        <td class="r amt">${money(a.amount)}</td></tr>`).join("")}
    </tbody>
  </table>

  <h3>Support after launch</h3>
  <ul>
    <li><strong>${SCOPE_TERMS.warrantyDays} days of free fixes</strong> — anything that does not work as described here.</li>
    <li>A recorded walkthrough of the dashboard, plus a written guide you keep.</li>
    ${care ? `<li>Optional <strong>${esc(care.label)} plan at ${money(care.monthly)} a month</strong>. Cancel with ${CARE_NOTICE_DAYS} days' notice.</li>` : ""}
    <li>Work beyond the warranty is quoted as a fixed scope before it begins.
        We do not bill by the hour.</li>
  </ul>

  <h3>Outside this engagement</h3>
  <div class="grid2">
    <ul>${q.notIncluded.slice(0, Math.ceil(q.notIncluded.length / 2)).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
    <ul>${q.notIncluded.slice(Math.ceil(q.notIncluded.length / 2)).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
  </div>

  <div class="callout">
    <strong>Policies and compliance are yours</strong>
    We build, style and publish your terms, privacy, returns, refund and shipping
    pages, and tell you what headings each needs — but the wording and its
    compliance with the Consumer Protection (E-Commerce) Rules, the IT Rules and
    GST rest with you. We are a development studio, not a law firm.
  </div>

  <h3>Terms</h3>
  <ul>
    <li>This quotation is valid ${q.validDays} days from issue.</li>
    <li>Two rounds of revisions are included at the design stage.</li>
    <li>${esc(SCOPE_TERMS.uatRule)}</li>
    <li>${esc(SCOPE_TERMS.ownershipRule)}</li>
    <li>Hosting, domain and gateway accounts are created in your name, not ours.</li>
  </ul>

  <p class="closer">A live store your customers can buy from, a dashboard you can
     run from your phone, and every order handled on WhatsApp — for
     ${money(q.price)}, in ${q.weeks} weeks.</p>

  <div class="sig">
    <div>For ${esc(q.client)} — name, signature, date</div>
    <div>For Brand Mint Studios — name, signature, date</div>
  </div>
  <div class="foot"><span>${esc(q.client)} · ${esc(q.docId)}</span><span>04</span></div>
</section>

</body></html>`;

const OUT_DIR = path.join(ROOT, "docs/quotes");
fs.mkdirSync(OUT_DIR, { recursive: true });
const out = path.join(OUT_DIR, `${q.docId}.pdf`);

if (process.env.BM_QUOTE_HTML) fs.writeFileSync(process.env.BM_QUOTE_HTML, html);

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
// Web fonts load over the network. Printing before they arrive silently falls
// back to DejaVu and the document loses the typography it was designed around,
// with nothing in the output to say why.
await page.evaluate(() => document.fonts.ready);
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
