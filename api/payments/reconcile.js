/**
 * GET /api/payments/reconcile
 * Authorization: Bearer <Firebase ID token, admin>
 *
 * Answers one question: which invoices has Razorpay actually been paid for?
 *
 * Returns a list. It writes nothing. The admin's browser — already permitted
 * by firestore.rules to write invoices — does the writing.
 *
 * WHY NOT A WEBHOOK
 * -----------------
 * A webhook is the usual answer and it is the wrong one here, because a
 * webhook needs somewhere to put what it learns, and writing to Firestore
 * from a server needs a service account key: a credential that bypasses every
 * rule and never expires. This deployment has no such credential and is better
 * for it.
 *
 * Polling Razorpay instead turns out to be *more* robust than a webhook
 * without a database, not less:
 *
 *   - A payment made while the customer's browser was closing is found on the
 *     next sync. The classic "paid but the order never updated" bug cannot
 *     happen, because nothing depends on the browser coming back.
 *   - A missed or failed webhook delivery is not a lost payment. There is
 *     nothing to miss; the question is asked fresh each time.
 *   - Razorpay is the source of truth about Razorpay. Copying its state into
 *     our database and then trusting the copy is how the two drift.
 *
 * The cost is that an invoice is marked paid when the studio next looks,
 * rather than within seconds. For a studio sending a handful of invoices a
 * month, that is the correct trade — and CLAUDE.md §9 says an audit log should
 * exist *before* anything automated gets write access, which it does not yet.
 */

const { configured, getOrderPayments, listOrders } = require("../_lib/razorpay.js");
const { bearer, isAdmin } = require("../_lib/firestore.js");

/** Razorpay paginates; 100 is its maximum page size. */
const PAGE = 100;
/** Hard cap on one sync, so a busy account cannot hang the function. */
const MAX_ORDERS = 500;
/** Two months back by default — long enough to catch anything missed while
 *  short enough to stay one or two API calls. */
const DEFAULT_DAYS = 60;

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  if (!configured()) {
    res.status(503).json({ error: "payments_not_configured" });
    return;
  }

  const idToken = bearer(req);
  if (!(await isAdmin(idToken))) {
    // Deliberately identical for "not signed in" and "signed in as a client".
    res.status(403).json({ error: "admin_only" });
    return;
  }

  const days = clampDays(req.query && req.query.days);
  const from = Math.floor(Date.now() / 1000) - days * 86400;

  try {
    const orders = await fetchOrders(from);

    // An order exists the moment someone clicks Pay. Only a CAPTURED payment
    // against it means money arrived — `order.status === "paid"` is Razorpay's
    // own summary, and it is confirmed against the payment list below rather
    // than taken on trust.
    const results = [];
    for (const order of orders) {
      const invoiceId = order.notes && order.notes.invoiceId;
      if (!invoiceId) continue; // not ours, or created before notes existed

      if (order.status !== "paid") {
        results.push({
          invoiceId,
          orderId: order.id,
          settled: false,
          reason: `order_${order.status}`,
          amount: Number(order.amount) / 100,
        });
        continue;
      }

      const payments = await getOrderPayments(order.id);
      const captured = payments.find((p) => p.status === "captured");
      results.push({
        invoiceId,
        orgId: (order.notes && order.notes.orgId) || null,
        orderId: order.id,
        settled: Boolean(captured),
        paymentId: captured ? captured.id : null,
        method: captured ? captured.method || null : null,
        amount: Number(order.amount) / 100,
        at: captured && captured.created_at
          ? new Date(captured.created_at * 1000).toISOString()
          : null,
        reason: captured ? null : "no_captured_payment",
      });
    }

    const settled = results.filter((r) => r.settled);

    res.status(200).json({
      windowDays: days,
      ordersSeen: orders.length,
      settled,
      unsettled: results.filter((r) => !r.settled),
      truncated: Boolean(orders.truncated),
      // Stated so the caller can tell "nothing was paid" from "we only looked
      // back 60 days". An empty list is not proof of no payments.
      note:
        `Covers orders created in the last ${days} days` +
        (orders.truncated
          ? `, and stopped at ${MAX_ORDERS} orders — this sync is INCOMPLETE. Narrow the window with ?days= and run it again.`
          : `. Anything older is outside this window, not absent.`),
    });
  } catch (err) {
    res.status(502).json({ error: String(err.message || "razorpay_error") });
  }
};

/**
 * All orders since `from`, paginated.
 *
 * Bounded at MAX_ORDERS so one click cannot turn into a serverless invocation
 * that runs until it is killed. When the cap is hit the caller reports it —
 * silent truncation would make a partial sync look like a complete one, and
 * "no new payments" would then be a lie rather than an answer.
 */
async function fetchOrders(from) {
  const all = [];
  let skip = 0;
  let truncated = false;
  for (;;) {
    const page = await listOrders({ from, skip, count: PAGE });
    all.push(...page);
    if (page.length < PAGE) break;
    skip += PAGE;
    if (skip >= MAX_ORDERS) { truncated = true; break; }
  }
  all.truncated = truncated;
  return all;
}

function clampDays(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return DEFAULT_DAYS;
  return Math.min(365, Math.max(1, Math.floor(n)));
}
