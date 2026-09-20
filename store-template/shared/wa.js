/**
 * The WhatsApp desk — the thing the ₹49,999 tier is actually selling.
 *
 * "Orders arrive on your phone, on WhatsApp" (shared/tiers.js). So the order
 * is a MESSAGE, composed here, and it has to be readable by a shop owner on a
 * phone with one thumb while standing at a counter. Not a JSON blob, not a
 * link to a dashboard they will not open.
 *
 * Every order also carries a short reference. A shop owner scrolling WhatsApp
 * three days later needs to say "BM-7K2Q" and have both sides know which order
 * that is — without that, the returns and refunds promise in the same tier is
 * unworkable.
 */
import { STORE } from "../store.config.js";
import { inr, withGst, deliveryFor } from "./money.js";

/** Short, unambiguous, shoutable over a phone. No 0/O or 1/I — those are the
 *  two pairs people misread aloud, and this reference exists to be read
 *  aloud. */
export function orderRef() {
  const A = "23456789ACDEFGHJKLMNPQRSTUVWXYZ";
  let s = "";
  for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)];
  return `BM-${s}`;
}

export function composeOrder({ lines, customer, method, ref }) {
  const sub = lines.reduce((n, l) => n + l.price * l.qty, 0);
  const del = deliveryFor(sub, method);
  const g = withGst(sub);
  const total = g.total + del.fee;

  const L = [];
  L.push(`*New order · ${ref}*`);
  L.push(`${STORE.name}`);
  L.push("");
  for (const l of lines) {
    const v = l.variant ? ` (${l.variant})` : "";
    L.push(`• ${l.name}${v} × ${l.qty} — ${inr(l.price * l.qty)}`);
  }
  L.push("");
  L.push(`Subtotal: ${inr(g.net)}`);
  if (g.shown) L.push(`GST (${Math.round(STORE.gstRate * 100)}%): ${inr(g.tax)}`);
  L.push(del.free ? "Delivery: Free" : `Delivery: ${inr(del.fee)}`);
  L.push(`*Total: ${inr(total)}*`);
  L.push("");
  L.push(`Payment: ${method === "cod" ? "Cash on delivery" : "Paid online"}`);
  L.push("");
  L.push(`*${customer.name}*`);
  L.push(customer.phone);
  L.push(customer.address);
  if (customer.note) { L.push(""); L.push(`Note: ${customer.note}`); }
  return L.join("\n");
}

/** wa.me needs the text URI-encoded. encodeURIComponent handles the newlines
 *  and the asterisks that make WhatsApp render bold; building this by hand
 *  with escape() silently mangles both. */
export const orderLink = (text) =>
  `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(text)}`;
