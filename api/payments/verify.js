/**
 * POST /api/payments/verify
 *   { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoiceId }
 * Authorization: Bearer <Firebase ID token>
 *
 * Confirms a payment actually happened, for the right invoice, for the right
 * amount. Called by the browser immediately after Checkout closes.
 *
 * TWO CHECKS, NOT ONE
 * -------------------
 * 1. The signature proves the response came from Razorpay and was not forged
 *    by the page that received it.
 * 2. The payment is then FETCHED FROM RAZORPAY and inspected — captured, right
 *    order, right amount.
 *
 * The second check is not redundant. A signature only proves Razorpay said
 * something about this order id; it does not prove the money was captured or
 * that the amount matches. Verifying the signature alone is the single most
 * common flaw in Razorpay integrations.
 *
 * WHAT THIS DOES NOT DO
 * ---------------------
 * It does not mark the invoice paid. It cannot: there is no privileged writer
 * in this deployment, by design (see _lib/firestore.js). Marking paid happens
 * in /api/payments/reconcile, driven by the admin, whose own token is allowed
 * to write invoices. So this endpoint's answer is advisory to the UI — the
 * database is only ever changed by someone the rules already trust.
 *
 * That is a feature. A "payment succeeded" screen that lies is embarrassing;
 * a database that can be told an invoice is paid by whoever asks is fraud.
 */

const { configured, verifyCheckoutSignature, getPayment } = require("../_lib/razorpay.js");
const { bearer, getDoc } = require("../_lib/firestore.js");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  if (!configured()) {
    res.status(503).json({ error: "payments_not_configured" });
    return;
  }

  const idToken = bearer(req);
  if (!idToken) {
    res.status(401).json({ error: "sign_in_required" });
    return;
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body || {};
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
  const invoiceId = String(body.invoiceId || "").trim();

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !invoiceId) {
    res.status(400).json({ error: "missing_fields" });
    return;
  }

  // Check 1 — the handshake is genuinely from Razorpay.
  if (!verifyCheckoutSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature })) {
    res.status(400).json({ error: "signature_mismatch", verified: false });
    return;
  }

  // The invoice, read as the caller, so the amount is the database's and the
  // rules decide whether this person may see it at all.
  let invoice;
  try {
    invoice = await getDoc("invoices", invoiceId, idToken);
  } catch (err) {
    res.status(err.status === 404 ? 404 : 403).json({
      error: err.status === 404 ? "invoice_not_found" : "not_your_invoice",
      verified: false,
    });
    return;
  }

  // Check 2 — ask Razorpay what actually happened.
  let payment;
  try {
    payment = await getPayment(razorpay_payment_id);
  } catch (err) {
    res.status(502).json({ error: String(err.message || "razorpay_error"), verified: false });
    return;
  }

  if (payment.order_id !== razorpay_order_id) {
    // A valid signature for a payment belonging to a different order.
    res.status(400).json({ error: "order_mismatch", verified: false });
    return;
  }
  if (payment.status !== "captured") {
    res.status(402).json({ error: `payment_${payment.status}`, verified: false });
    return;
  }

  const expectedPaise = Math.round(Number(invoice.amount) * 100);
  if (Number(payment.amount) !== expectedPaise) {
    // Underpayment, or an order created against a since-edited invoice.
    // Never treat a short payment as settlement.
    res.status(409).json({
      error: "amount_mismatch",
      verified: false,
      paid: Number(payment.amount) / 100,
      expected: Number(invoice.amount),
    });
    return;
  }

  res.status(200).json({
    verified: true,
    invoiceId,
    paymentId: razorpay_payment_id,
    orderId: razorpay_order_id,
    amount: Number(payment.amount) / 100,
    method: payment.method || null,
    at: payment.created_at ? new Date(payment.created_at * 1000).toISOString() : null,
    // Told plainly, because the client will otherwise refresh and wonder why
    // the invoice still says due.
    note: "Payment confirmed. The invoice is marked paid when the studio syncs payments.",
  });
};

function safeParse(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
