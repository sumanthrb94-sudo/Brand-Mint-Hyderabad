/**
 * The cart. localStorage, no account, no login.
 *
 * A shop owner's customer will not create an account to buy two kurtas. Every
 * extra step between "I want this" and "message sent" costs orders, and the
 * whole pitch of this tier is that ordering is as easy as it already is on
 * WhatsApp — just with the price, size and stock already answered.
 *
 * Keyed per store so two of our stores open in the same browser never see each
 * other's cart.
 */
import { STORE } from "../store.config.js";

const KEY = `bm.cart.${STORE.domain}`;
const listeners = new Set();

/** Every read is wrapped: localStorage throws in a private window and returns
 *  null with site data cleared. A cart that cannot be read must render as
 *  empty, never as a crash on the shop's homepage. */
function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch { return []; }
}
function write(items) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  listeners.forEach((fn) => { try { fn(items); } catch {} });
}

export const lines = () => read();
export const count = () => read().reduce((n, l) => n + l.qty, 0);
export const subtotal = () => read().reduce((n, l) => n + l.price * l.qty, 0);
export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

/** A line is identified by product AND variant: the same kurta in M and L are
 *  two lines, not one with qty 2. Merging them is the bug that turns a
 *  WhatsApp order into a phone call. */
const same = (a, b) => a.id === b.id && (a.variant || "") === (b.variant || "");

export function add(product, variant, qty = 1) {
  const items = read();
  const line = { id: product.id, name: product.name, price: product.price,
                 variant: variant || "", image: product.images?.[0] || "", qty };
  const hit = items.find((l) => same(l, line));
  if (hit) hit.qty += qty; else items.push(line);
  write(items);
  return items;
}

export function setQty(id, variant, qty) {
  const items = read().map((l) =>
    same(l, { id, variant }) ? { ...l, qty: Math.max(0, qty) } : l
  ).filter((l) => l.qty > 0);
  write(items);
  return items;
}

export const remove = (id, variant) => setQty(id, variant, 0);
export const clear = () => write([]);
