/**
 * Money. One place, because a rupee formatted two ways on one page is the
 * fastest way to lose a small shop's trust in the whole build.
 */
import { STORE } from "../store.config.js";

/** Indian grouping: 1,00,000 — not 100,000. toLocaleString("en-IN") does the
 *  lakh/crore grouping correctly; Intl with "en-US" does not, and the
 *  difference is invisible until a price crosses ₹99,999. */
export const inr = (paise) =>
  STORE.currency + Math.round(paise).toLocaleString("en-IN");

/** THE ONLY PLACE GST IS DECIDED.
 *  gstExtra true  → listed prices are pre-tax, tax is added at checkout.
 *  gstExtra false → listed prices already include tax, and the invoice shows
 *                   the tax component extracted from the total.
 *  Everything downstream reads this result rather than re-deriving it, so the
 *  cart, the WhatsApp message and the invoice can never disagree. */
export function withGst(subtotal) {
  const r = STORE.gstRate;
  if (!STORE.gstin) return { net: subtotal, tax: 0, total: subtotal, shown: false };
  return STORE.gstExtra
    ? { net: subtotal, tax: subtotal * r, total: subtotal * (1 + r), shown: true }
    : { net: subtotal / (1 + r), tax: subtotal - subtotal / (1 + r), total: subtotal, shown: true };
}

/** Delivery. freeAbove of 0 means the client never promised free delivery, so
 *  no free-delivery line is ever shown — an unasked-for promise on someone
 *  else's shopfront is their problem to honour, not ours to invent. */
export function deliveryFor(subtotal, method) {
  const d = STORE.delivery;
  const free = d.freeAbove > 0 && subtotal >= d.freeAbove;
  const base = free ? 0 : d.flatFee;
  const cod = method === "cod" ? (d.codFee || 0) : 0;
  return { fee: base + cod, free, freeAbove: d.freeAbove };
}
