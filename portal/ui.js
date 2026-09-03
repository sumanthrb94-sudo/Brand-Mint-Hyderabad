/**
 * Portal UI primitives.
 *
 * Same philosophy as admin/components.js — plain DOM, no framework — but a
 * separate, smaller set so the client-facing bundle doesn't drag in the CRM's
 * charts and tables.
 *
 * Note on safety: every helper here sets text via textContent. Client briefs,
 * revision notes and messages are user-written, so nothing in this file may
 * ever build markup from a string.
 */

const SVG_NS = "http://www.w3.org/2000/svg";
const SVG_TAGS = /^(svg|path|circle|rect|g|line|polyline|polygon|ellipse)$/i;

export function h(tag, attrs = {}, children = []) {
  const el = SVG_TAGS.test(tag)
    ? document.createElementNS(SVG_NS, tag)
    : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.setAttribute("class", v);
    else if (k === "text") el.textContent = v;
    else if (k === "html") el.innerHTML = v; // only ever called with our own literals
    else if (k.startsWith("on") && typeof v === "function")
      el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "dataset") Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of Array.isArray(children) ? children : [children]) {
    if (c == null || c === false) continue;
    el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return el;
}

export function mount(parent, ...nodes) {
  parent.innerHTML = "";
  for (const n of nodes) if (n) parent.appendChild(n);
}

/* ------------------------------------------------------------------ toast */

let toastTimer = null;
export function toast(message, ms = 3000) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}

/* ------------------------------------------------------------------ modal */

export function modal({ title, body, actions = [] }) {
  const root = document.getElementById("modal-root");
  const close = () => {
    root.innerHTML = "";
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey);

  const overlay = h("div", {
    class: "p-overlay",
    onclick: (e) => { if (e.target === overlay) close(); },
  }, [
    h("div", { class: "p-modal", role: "dialog", "aria-modal": "true" }, [
      h("h3", { text: title }),
      body,
      h("div", { class: "p-modal-foot" }, actions.map((a) =>
        h("button", {
          class: "p-btn " + (a.primary ? "p-btn-primary" : a.danger ? "p-btn-danger" : "p-btn-ghost"),
          type: "button",
          text: a.label,
          onclick: () => a.onClick ? a.onClick(close) : close(),
        })
      )),
    ]),
  ]);

  root.innerHTML = "";
  root.appendChild(overlay);
  return { close };
}

/* ------------------------------------------------------------------ atoms */

export function card(title, subtitle, ...body) {
  return h("section", { class: "p-card" }, [
    title
      ? h("div", { class: "p-card-head" }, [
          h("h2", { text: title }),
          subtitle ? h("span", { class: "sub", text: subtitle }) : null,
        ].filter(Boolean))
      : null,
    ...body,
  ].filter(Boolean));
}

export function pill(status, label) {
  const key = String(status || "").toLowerCase().replace(/\s+/g, "_");
  return h("span", { class: "p-pill " + key, text: label || humanise(status) });
}

export function empty(title, body) {
  return h("div", { class: "p-empty" }, [
    h("div", { class: "t", text: title }),
    body ? h("div", { text: body }) : null,
  ].filter(Boolean));
}

/* ----------------------------------------------------------------- format */

export function humanise(s) {
  return String(s || "")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function inr(n) {
  const v = Number(n) || 0;
  return "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function dateLong(iso) {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function relTime(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  return dateLong(iso);
}

/** Days from today; negative means overdue. */
export function daysUntil(isoDate) {
  if (!isoDate) return null;
  const d = new Date(isoDate.length <= 10 ? isoDate + "T00:00:00" : isoDate);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

/**
 * True when a URL is safe to put in an href. Blocks javascript: and data:
 * URLs — deliverable links are typed by an admin, but a link that renders is
 * a link that executes, and this costs nothing.
 */
export function safeUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url, window.location.origin);
    return ["http:", "https:", "mailto:"].includes(u.protocol) ? u.toString() : null;
  } catch {
    return null;
  }
}
