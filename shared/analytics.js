/**
 * First-party analytics. No third-party script, no cookies, nothing sold.
 *
 * Every public page and the portal load this. It records page views, clicks
 * (with page coordinates for the heat map), scroll depth, section reach,
 * time on page and named events, batches them, and writes them straight to
 * Firestore's REST API — no SDK on the home page, one fetch every few
 * seconds at most. firestore.rules pins the shape and size of each event.
 *
 * Identity: an anonymous id per browser (localStorage), a session id per
 * tab, and the signed-in uid when the portal calls identify(). Honours
 * Do Not Track and Global Privacy Control. Off inside the admin's heat-map
 * iframe (?bm_nt=1) and when framed.
 *
 *   import { track, identify } from "/shared/analytics.js";
 *   track("quiz_finish", { score: 79, tier: "growth" });
 */
import { firebaseConfig, isConfigured } from "/firebase/config.js";

const KEYS = ["t", "ts", "path", "sid", "aid", "uid", "vw", "vh", "dev", "dh", "x", "y", "xr", "yr", "el", "txt", "href", "ref", "utm", "lang", "sec", "depth", "secs", "n", "p"];
const FLUSH_MS = 4000;
const MAX_BATCH = 20;
const MAX_PER_PAGE = 200;

const params = new URLSearchParams(location.search);
const enabled = (() => {
  try {
    if (!isConfigured()) return false;
    if (window.self !== window.top) return false;
    if (params.has("bm_nt")) return false;
    if (params.has("bm_track")) return true;
    if (navigator.doNotTrack === "1" || navigator.globalPrivacyControl) return false;
    if (/bot|crawl|spider|headless/i.test(navigator.userAgent)) return false;
    return true;
  } catch { return false; }
})();

const ENDPOINT = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:commit?key=${firebaseConfig.apiKey}`;
const DOC = `projects/${firebaseConfig.projectId}/databases/(default)/documents/events/`;

function rid(n = 20) {
  const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const buf = new Uint8Array(n); crypto.getRandomValues(buf);
  let s = ""; for (const b of buf) s += a[b % a.length]; return s;
}
function stored(store, key, make) {
  try { const v = store.getItem(key); if (v) return v; const n = make(); store.setItem(key, n); return n; } catch { return make(); }
}
const aid = stored(localStorage, "bm.aid", () => rid(16));
const sid = stored(sessionStorage, "bm.sid", () => rid(12));
let uid = (() => { try { return JSON.parse(localStorage.getItem("bm.auth.profile.v1") || "null")?.id || ""; } catch { return ""; } })();
let tokenProvider = null;

const vw = () => window.innerWidth;
const vh = () => window.innerHeight;
const docH = () => Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0, 1);
const dev = () => (vw() < 720 ? "mobile" : vw() < 1000 ? "tablet" : "desktop");
const path = () => (location.pathname + location.search).slice(0, 200);

/* ------------------------------------------------------------ queue */
const queue = [];
let sent = 0;
let timer = null;

function push(ev) {
  if (!enabled || sent + queue.length >= MAX_PER_PAGE) return;
  queue.push({ t: ev.t, ts: new Date().toISOString(), path: path(), sid, aid, uid, vw: vw(), vh: vh(), dev: dev(), ...ev });
  if (!timer) timer = setTimeout(() => flush(false), FLUSH_MS);
}

function enc(v) {
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  return { stringValue: String(v) };
}

async function flush(keepalive) {
  clearTimeout(timer); timer = null;
  if (!queue.length) return;
  const batch = queue.splice(0, MAX_BATCH);
  sent += batch.length;
  const writes = batch.map((ev) => {
    const fields = {};
    for (const k of KEYS) if (ev[k] !== undefined && ev[k] !== null) fields[k] = enc(ev[k]);
    return { update: { name: DOC + rid(), fields }, currentDocument: { exists: false } };
  });
  const headers = { "Content-Type": "application/json" };
  try { const tok = tokenProvider ? await tokenProvider() : null; if (tok) headers.Authorization = "Bearer " + tok; } catch {}
  try {
    await fetch(ENDPOINT, { method: "POST", headers, body: JSON.stringify({ writes }), keepalive: !!keepalive });
  } catch {}
  if (queue.length) timer = setTimeout(() => flush(false), FLUSH_MS);
}

/* ------------------------------------------------------- public api */
export function track(n, props) {
  push({ t: "event", n: String(n).slice(0, 40), p: props ? JSON.stringify(props).slice(0, 300) : "" });
}
export function identify(id, provider) {
  uid = id || ""; tokenProvider = provider || null;
}
export const analyticsEnabled = enabled;

/* ----------------------------------------------------- auto capture */
if (enabled) {
  const utm = ["utm_source", "utm_medium", "utm_campaign"].map((k) => params.get(k) || "").join("|").replace(/\|+$/, "");
  let ref = "";
  try { ref = document.referrer ? new URL(document.referrer).host : ""; } catch {}
  if (ref === location.host) ref = "";
  push({ t: "page_view", ref: ref.slice(0, 100), utm: utm.slice(0, 120), lang: (navigator.language || "").slice(0, 12), dh: docH() });

  // Clicks, with page coordinates. Captured on the way down so nothing
  // that stops propagation can hide a click from the heat map.
  document.addEventListener("click", (e) => {
    if (e.button !== 0 || !(e.target instanceof Element)) return;
    const el = e.target.closest("a,button,summary,label,input,[data-track]") || e.target;
    const tag = el.tagName.toLowerCase();
    const desc = tag + (el.id ? "#" + el.id : "") + (el.classList[0] ? "." + el.classList[0] : "");
    const txt = (el.getAttribute("aria-label") || el.innerText || el.value || "").trim().replace(/\s+/g, " ").slice(0, 60);
    let href = "";
    if (el instanceof HTMLAnchorElement) { try { const u = new URL(el.href); href = (u.host === location.host ? u.pathname + u.search : u.href).slice(0, 200); } catch {} }
    const dh = docH();
    push({ t: "click", x: Math.round(e.pageX), y: Math.round(e.pageY), xr: Math.round((e.clientX / vw()) * 1000), yr: Math.round((e.pageY / dh) * 1000), dh, el: desc.slice(0, 80), txt, href });
  }, true);

  // Scroll depth milestones.
  let maxDepth = 0; let ticking = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const d = Math.min(100, Math.round(((window.scrollY + vh()) / docH()) * 100));
      for (const m of [25, 50, 75, 100]) if (d >= m && maxDepth < m) { maxDepth = m; push({ t: "scroll", depth: m }); }
    });
  };
  addEventListener("scroll", onScroll, { passive: true });
  setTimeout(onScroll, 800);

  // Section reach, once per section per page.
  if ("IntersectionObserver" in window) {
    const seen = new Set();
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting && !seen.has(en.target.id)) { seen.add(en.target.id); push({ t: "section", sec: en.target.id.slice(0, 40) }); }
    }, { threshold: 0.35 });
    document.querySelectorAll("section[id], main > [id]").forEach((s) => io.observe(s));
  }

  // Engaged time: seconds the tab was visible. Sent once, on leave.
  let engaged = 0; let since = document.visibilityState === "visible" ? Date.now() : 0; let left = false;
  const settle = () => { if (since) { engaged += Date.now() - since; since = 0; } };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") { since = Date.now(); return; }
    settle();
    if (!left) { left = true; push({ t: "leave", secs: Math.round(engaged / 1000), depth: maxDepth }); }
    flush(true);
  });
  addEventListener("pagehide", () => { settle(); if (!left) { left = true; push({ t: "leave", secs: Math.round(engaged / 1000), depth: maxDepth }); } flush(true); });
}
