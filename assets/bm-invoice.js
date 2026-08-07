/**
 * The invoice you actually send a client.
 *
 * HOW IT MAKES A PDF WITHOUT A SERVER
 * -----------------------------------
 * It opens a printable page and calls print(). Every browser turns that into a
 * PDF — "Save as PDF" on a desktop, "Print → Save as PDF" on a phone — so this
 * needs no library, no service, and no build step, which is the whole
 * architecture of this site (CLAUDE.md §3, runtime dependencies: none).
 *
 * A PDF generator would have been ~200 KB of dependency to produce a worse
 * document than the browser's own print engine, which already does fonts,
 * page breaks and margins properly.
 *
 * WHAT IS DELIBERATELY NOT ON IT
 * ------------------------------
 * No GSTIN, and no payee block until the account details have actually been
 * entered. An invoice is a financial document; a plausible-looking tax number
 * or account number on one is not a placeholder, it is a false statement to a
 * client. Each block is omitted entirely rather than printing an empty label,
 * so the document never looks half-filled.
 *
 * The payee arrives as an ARGUMENT rather than a constant because it lives in
 * Firestore, not in this public repository — see STUDIO in bm-app.js.
 *
 * Everything else on the page comes from the invoice and the organisation as
 * they are stored. Nothing is computed into existence.
 */

import { STUDIO, invoiceRef, invoiceReceived, invoiceOutstanding, invoiceState, escapeHtml } from "/assets/bm-app.js";

const money = (n) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");

function longDate(ts) {
  if (!ts) return null;
  const d = typeof ts?.toDate === "function" ? ts.toDate() : new Date(ts);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Build the document. Exported separately from printing so it can be tested
 * and eyeballed without a print dialog appearing.
 */
export function invoiceHtml(inv, org, { note, payee } = {}) {
  const amount = Number(inv.amount) || 0;
  const received = invoiceReceived(inv);
  const owed = invoiceOutstanding(inv);
  const state = invoiceState(inv);
  const due = longDate(inv.dueAt);

  const statusLabel = state === "paid" ? "Paid in full"
    : state === "part" ? `Part paid — ${money(owed)} outstanding`
    : "Payable";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(invoiceRef(inv))} — ${escapeHtml(org?.name || "Invoice")}</title>
<style>
  /* Print-first. The screen view is the print view at screen size, so what you
     approve is exactly what the client receives. */
  @page { size: A4; margin: 16mm 15mm; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0; padding: 28px 22px 60px;
    background: #ffffff; color: #0b1f1a;
    font: 11pt/1.55 "DejaVu Sans", ui-sans-serif, system-ui, -apple-system, sans-serif;
    max-width: 800px; margin-inline: auto;
  }
  .head { display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap; align-items: flex-start; }
  .mark {
    width: 40px; height: 40px; border-radius: 11px; background: #0b1f1a; color: #fbfaf2;
    display: grid; place-items: center; font-size: 19px; font-weight: 800; margin-bottom: 10px;
  }
  .from strong { font-size: 15pt; letter-spacing: -0.02em; display: block; }
  .from span { color: #4a5d54; font-size: 9.5pt; display: block; }
  .title { text-align: right; }
  .title h1 {
    margin: 0; font-size: 26pt; letter-spacing: -0.03em; font-weight: 800; line-height: 1;
  }
  .title .ref {
    font-family: "DejaVu Sans Mono", ui-monospace, monospace;
    font-size: 10pt; color: #4a5d54; margin-top: 5px;
  }
  .status {
    display: inline-block; margin-top: 9px; padding: 3px 11px; border-radius: 999px;
    font-size: 8.5pt; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
  }
  .status--paid { background: #e3f5ec; color: #0b6b4f; }
  .status--part { background: #faf1da; color: #6b4f08; }
  .status--due  { background: #fbe9e7; color: #b3261e; }

  .rule { height: 3px; background: #10b981; border-radius: 3px; margin: 22px 0 20px; }

  .parties { display: flex; gap: 34px; flex-wrap: wrap; margin-bottom: 26px; }
  .parties > div { min-width: 190px; }
  .label {
    font-size: 8pt; letter-spacing: .12em; text-transform: uppercase;
    color: #4a5d54; font-weight: 700; margin-bottom: 4px;
  }
  .parties .who { font-size: 12pt; font-weight: 700; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 22px; }
  th {
    text-align: left; font-size: 8pt; letter-spacing: .1em; text-transform: uppercase;
    color: #4a5d54; font-weight: 700; padding: 0 0 7px; border-bottom: 1.5px solid #0b1f1a;
  }
  td { padding: 13px 0; border-bottom: 1px solid rgba(11,31,26,.13); vertical-align: top; }
  th.r, td.r { text-align: right; }
  td.amt {
    font-family: "DejaVu Sans Mono", ui-monospace, monospace;
    font-variant-numeric: tabular-nums; white-space: nowrap;
  }

  .totals { display: flex; justify-content: flex-end; }
  .totals dl {
    margin: 0; min-width: 250px;
    display: grid; grid-template-columns: 1fr auto; gap: 8px 20px;
  }
  .totals dt { color: #4a5d54; font-size: 10pt; }
  .totals dd {
    margin: 0; text-align: right; font-family: "DejaVu Sans Mono", ui-monospace, monospace;
    font-variant-numeric: tabular-nums;
  }
  .totals .grand dt, .totals .grand dd {
    border-top: 1.5px solid #0b1f1a; padding-top: 9px; font-size: 13pt; font-weight: 800; color: #0b1f1a;
  }

  .foot { margin-top: 34px; padding-top: 16px; border-top: 1px solid rgba(11,31,26,.13); }
  .foot p { margin: 0 0 7px; font-size: 9.5pt; color: #4a5d54; }
  .foot strong { color: #0b1f1a; }

  .payee {
    margin: 4px 0 14px; padding: 13px 15px;
    background: #f5f7f4; border: 1px solid rgba(11,31,26,.13); border-radius: 8px;
  }
  .payee .plabel {
    font-size: 8pt; letter-spacing: .12em; text-transform: uppercase;
    color: #4a5d54; font-weight: 700; margin-bottom: 7px;
  }
  .payee dl {
    margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 4px 18px; font-size: 10pt;
  }
  .payee dt { color: #4a5d54; }
  .payee dd { margin: 0; color: #0b1f1a; font-weight: 600; }
  .payee dd.num {
    font-family: "DejaVu Sans Mono", ui-monospace, monospace;
    letter-spacing: .02em; font-variant-numeric: tabular-nums;
  }

  .actions { margin-top: 30px; display: flex; gap: 10px; flex-wrap: wrap; }
  .actions button {
    font: inherit; font-size: 10.5pt; font-weight: 650; cursor: pointer;
    padding: 11px 20px; border-radius: 10px; border: 1px solid rgba(11,31,26,.2);
    background: #ffffff; color: #0b1f1a; min-height: 44px;
  }
  .actions button.primary { background: #0b1f1a; color: #fbfaf2; border-color: #0b1f1a; }
  @media print { .actions { display: none; } body { padding: 0; } }
</style></head>
<body>

  <div class="head">
    <div class="from">
      <div class="mark" aria-hidden="true">B</div>
      <strong>${escapeHtml(STUDIO.name)}</strong>
      <span>${escapeHtml(STUDIO.city)}</span>
      <span>${escapeHtml(STUDIO.email)}</span>
    </div>
    <div class="title">
      <h1>Invoice</h1>
      <div class="ref">${escapeHtml(invoiceRef(inv))}</div>
      <span class="status status--${state}">${escapeHtml(statusLabel)}</span>
    </div>
  </div>

  <div class="rule"></div>

  <div class="parties">
    <div>
      <div class="label">Billed to</div>
      <div class="who">${escapeHtml(org?.name || "—")}</div>
    </div>
    ${due ? `<div><div class="label">Due</div><div class="who">${escapeHtml(due)}</div></div>` : ""}
  </div>

  <table>
    <thead>
      <tr><th>Description</th><th class="r">Amount</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>${escapeHtml(inv.label || "Professional services")}</td>
        <td class="r amt">${money(amount)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <dl>
      <dt>Subtotal</dt><dd>${money(amount)}</dd>
      ${received > 0 ? `<dt>Received</dt><dd>−${money(received)}</dd>` : ""}
      <div class="grand" style="display:contents;">
        <dt>${received > 0 ? "Balance due" : "Total due"}</dt>
        <dd>${money(received > 0 ? owed : amount)}</dd>
      </div>
    </dl>
  </div>

  <div class="foot">
    ${note ? `<p>${escapeHtml(note)}</p>` : ""}
    ${payee ? `
      <div class="payee">
        <div class="plabel">Pay by transfer to</div>
        <dl>
          <dt>Account name</dt><dd>${escapeHtml(payee.holder)}</dd>
          <dt>Account number</dt><dd class="num">${escapeHtml(payee.account)}</dd>
          <dt>IFSC</dt><dd class="num">${escapeHtml(payee.ifsc)}</dd>
          ${payee.bank ? `<dt>Bank</dt><dd>${escapeHtml(payee.bank)}</dd>` : ""}
        </dl>
      </div>` : ""}
    <p>Amounts are exclusive of GST unless stated otherwise.</p>
    <p>Questions about this invoice: <strong>${escapeHtml(STUDIO.email)}</strong> · ${escapeHtml(STUDIO.site)}</p>
  </div>

  <div class="actions">
    <button type="button" class="primary" onclick="window.print()">Save as PDF / Print</button>
    <button type="button" onclick="window.close()">Close</button>
  </div>

</body></html>`;
}

/**
 * Open the invoice in its own tab, ready to save.
 *
 * A new tab rather than an overlay: the browser's print dialog is what makes
 * the PDF, and printing a page that also contains the whole CRM would need a
 * print stylesheet hiding everything else — one more thing to get wrong.
 *
 * Popup blockers are the one failure mode here, so a blocked window is
 * reported rather than silently doing nothing.
 */
export function openInvoice(inv, org, opts) {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Your browser blocked the invoice window. Allow pop-ups for this site and try again.");
    return null;
  }
  w.document.write(invoiceHtml(inv, org, opts));
  w.document.close();
  return w;
}
