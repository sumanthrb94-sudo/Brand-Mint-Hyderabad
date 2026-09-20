/**
 * Products. Two sources, one interface.
 *
 * "local" reads data/products.json. That matters more than it sounds: it means
 * the shop is fully browsable on day two of a build, before the client's
 * Firebase project exists and before they have sent a single photograph. We
 * can put a real, clickable store in front of them while they are still
 * deciding — which is when they are most likely to keep deciding.
 *
 * "firestore" is the same shape, live, once it is wired. Nothing above this
 * module knows or cares which one is in use.
 */
import { STORE } from "../store.config.js";

/** The product shape, stated once. Anything reading a product may rely on
 *  these keys existing; normalise() guarantees it for both sources. */
const normalise = (p, i) => ({
  id: String(p.id ?? i),
  name: String(p.name ?? "Untitled"),
  price: Number(p.price) || 0,
  mrp: Number(p.mrp) || 0,              // 0 = no strike-through price shown
  category: String(p.category ?? "All"),
  variants: Array.isArray(p.variants) ? p.variants : [],
  images: Array.isArray(p.images) ? p.images : [],
  blurb: String(p.blurb ?? ""),
  // Stock is a NUMBER, and 0 is a real answer meaning sold out. undefined
  // means the client does not track stock for this item, which must render as
  // available rather than as sold out — defaulting the wrong way here hides a
  // shop's entire catalogue behind "out of stock".
  stock: p.stock === undefined || p.stock === null ? null : Number(p.stock),
});

export const inStock = (p) => p.stock === null || p.stock > 0;

let _cache = null;

export async function all() {
  if (_cache) return _cache;
  if (STORE.catalogueSource === "firestore") {
    const { db } = await import("./firebase.js");
    _cache = (await db.list(STORE.firestore.collection)).map(normalise);
  } else {
    const r = await fetch("/data/products.json", { cache: "no-store" });
    if (!r.ok) throw new Error(`products.json ${r.status}`);
    _cache = (await r.json()).map(normalise);
  }
  return _cache;
}

export const byId = async (id) => (await all()).find((p) => p.id === String(id)) || null;

export async function byCategory(cat) {
  const list = await all();
  return !cat || cat === "All" ? list : list.filter((p) => p.category === cat);
}

/** Search across name, blurb and category. Deliberately dumb substring
 *  matching: a 40-product boutique does not need an index, and every
 *  dependency we add here is one we maintain across every store we ship. */
export async function search(q) {
  const s = q.trim().toLowerCase();
  if (!s) return all();
  return (await all()).filter((p) =>
    `${p.name} ${p.blurb} ${p.category}`.toLowerCase().includes(s));
}
