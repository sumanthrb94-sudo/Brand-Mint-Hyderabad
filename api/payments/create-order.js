/**
 * POST /api/payments/create-order   { invoiceId }
 * Authorization: Bearer <Firebase ID token>
 *
 * Creates a Razorpay order for an invoice, for an amount THIS SERVER read out
 * of Firestore. The browser sends an invoice id and nothing else that matters.
 *
 * The attack this exists to stop is the oldest one in online payments: the
 * browser posts `amount: 1` for an ₹80,000 invoice, the server believes it,
 * and the gateway happily takes ₹1. Every field that decides how much money
 * moves is read server-side, from the database, using the caller's own token
 * so the rules still apply.
 *
 * Returns only what Checkout needs. No secret, ever.
 */

const { configured, createOrder } = require("../_lib/razorpay.js");
const { bearer, getDoc } = require("../_lib/firestore.js");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  if (!configured()) {
    // 503, not 500: nothing is broken, the account simply is not wired up yet.
    res.status(503).json({ error: "payments_not_configured" });
    return;
  }

  const idToken = bearer(req);
  if (!idToken) {
    res.status(401).json({ error: "sign_in_required" });
    return;
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body || {};
  const invoiceId = String(body.invoiceId || "").trim();
  if (!invoiceId || invoiceId.length > 200 || invoiceId.includes("/")) {
    res.status(400).json({ error: "invalid_invoice_id" });
    return;
  }

  let invoice;
  try {
    // Reads as the caller. A client who is not on this invoice's org gets a
    // 403 from Firestore, not from a check written here — the rules decide.
    invoice = await getDoc("invoices", invoiceId, idToken);
  } catch (err) {
    res.status(err.status === 404 ? 404 : 403).json({
      error: err.status === 404 ? "invoice_not_found" : "not_your_invoice",
    });
    return;
  }

  if (invoice.status === "paid") {
    // Not an error the user caused — say so plainly so the UI can just refresh.
    res.status(409).json({ error: "already_paid" });
    return;
  }

  const amount = Number(invoice.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(422).json({ error: "invoice_has_no_amount" });
    return;
  }

  try {
    const order = await createOrder({
      amountRupees: amount,
      receipt: invoiceId,
      // notes are the audit trail. Reconciliation matches on invoiceId, so a
      // payment can always be traced back to what it was for — without them,
      // a captured payment is an orphan nobody can attribute.
      notes: {
        invoiceId,
        orgId: String(invoice.orgId || ""),
        label: String(invoice.label || "").slice(0, 100),
      },
    });

    res.status(200).json({
      orderId: order.id,
      amount: order.amount, // paise, straight from Razorpay
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID, // public by design
      invoice: { id: invoiceId, label: invoice.label || "", amount },
    });
  } catch (err) {
    // err.message is our own normalised code; the Razorpay body never reaches
    // a log or a response.
    res.status(502).json({ error: String(err.message || "razorpay_error") });
  }
};

function safeParse(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
