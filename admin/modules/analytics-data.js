/**
 * Shared loading + shaping for the Analytics and Heat map views.
 * Events come from db.fetchEvents(); everything here is pure.
 */
export const RANGES = [{ id: 7, label: "7 days" }, { id: 30, label: "30 days" }, { id: 90, label: "90 days" }];
export const DEVICES = ["all", "mobile", "tablet", "desktop"];

const cache = new Map(); // days → { at, events }

export async function loadEvents(db, days) {
  const hit = cache.get(days);
  if (hit && Date.now() - hit.at < 60_000) return hit.events;
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const events = await db.fetchEvents({ since });
  cache.set(days, { at: Date.now(), events });
  return events;
}

export function byDevice(events, dev) {
  return dev === "all" ? events : events.filter((e) => e.dev === dev);
}

export function dayKey(iso) { return (iso || "").slice(0, 10); }

export function dayLabels(days) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) out.push(new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10));
  return out;
}

export function uniq(arr) { return new Set(arr.filter(Boolean)).size; }

export function count(arr, key) {
  const m = new Map();
  for (const x of arr) { const k = key(x); if (k == null || k === "") continue; m.set(k, (m.get(k) || 0) + 1); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export function tierFromHref(href) {
  const m = /[?&]tier=([a-z]+)/.exec(href || "");
  return m ? m[1] : null;
}

export function basePath(p) { return (p || "/").split("?")[0] || "/"; }
