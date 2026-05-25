/**
 * Shared UI primitives. Pure-JS DOM helpers — no framework.
 *
 * Every module uses these. If you find yourself reaching for innerHTML
 * with strings, prefer the helpers here so the design stays consistent.
 */

/* ---------- DOM helpers ---------- */

const SVG_NS = "http://www.w3.org/2000/svg";
const SVG_TAGS =
  /^(svg|path|circle|rect|g|line|polyline|polygon|ellipse|text|tspan|defs|linearGradient|radialGradient|stop|use|symbol|mask|clipPath|marker|filter)$/i;

export function h(tag, attrs = {}, children = []) {
  const el = SVG_TAGS.test(tag)
    ? document.createElementNS(SVG_NS, tag)
    : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.setAttribute("class", v);
    else if (k === "html") el.innerHTML = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on") && typeof v === "function")
      el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  const kids = Array.isArray(children) ? children : [children];
  for (const c of kids) {
    if (c == null || c === false) continue;
    el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function mount(parent, node) {
  clear(parent);
  parent.appendChild(node);
}

/* ---------- Toast ---------- */

let toastTimer = null;
export function toast(msg, ms = 2400) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.hidden = true;
  }, ms);
}

/* ---------- Modal ---------- */

export function modal({ title, body, footer, wide = false }) {
  const root = document.getElementById("modal-root");
  clear(root);

  const close = () => {
    root.innerHTML = "";
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e) => {
    if (e.key === "Escape") close();
  };
  document.addEventListener("keydown", onKey);

  const overlay = h("div", {
    class: "modal-overlay",
    onclick: (e) => {
      if (e.target === overlay) close();
    },
  });

  const modalEl = h("div", { class: "modal" + (wide ? " modal-wide" : "") }, [
    h("div", { class: "modal-head" }, [
      h("h3", { text: title || "" }),
      h("button", {
        class: "modal-close",
        "aria-label": "Close",
        onclick: close,
        html: '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
      }),
    ]),
    h("div", { class: "modal-body" }, body ? [body] : []),
    footer && h("div", { class: "modal-foot" }, footer),
  ]);

  overlay.appendChild(modalEl);
  root.appendChild(overlay);
  return { close, root: modalEl };
}

export function confirm({ title, message, danger = false, onConfirm }) {
  const { close } = modal({
    title,
    body: h("p", { text: message, class: "muted" }),
    footer: [
      h("button", {
        class: "btn btn-ghost",
        text: "Cancel",
        onclick: () => close(),
      }),
      h("button", {
        class: "btn " + (danger ? "btn-danger" : "btn-primary"),
        text: danger ? "Delete" : "Confirm",
        onclick: () => {
          close();
          onConfirm && onConfirm();
        },
      }),
    ],
  });
}

/* ---------- Form helpers ---------- */

export function field({ label, name, type = "text", value = "", placeholder = " ", required = false, options }) {
  if (type === "select") {
    const sel = h(
      "select",
      { name, required: required ? "required" : null },
      (options || []).map((o) => {
        const opt = h("option", { value: o.value, text: o.label });
        if (o.value === value) opt.selected = true;
        return opt;
      })
    );
    return h("label", { class: "field has-value" }, [sel, h("span", { text: label })]);
  }
  if (type === "textarea") {
    return h("label", { class: "field" + (value ? " has-value" : "") }, [
      h("textarea", { name, placeholder, required: required ? "required" : null, text: value }),
      h("span", { text: label }),
    ]);
  }
  const input = h("input", { name, type, placeholder, required: required ? "required" : null, value });
  return h("label", { class: "field" + (value ? " has-value" : "") }, [input, h("span", { text: label })]);
}

export function formToObject(form) {
  const fd = new FormData(form);
  const out = {};
  for (const [k, v] of fd.entries()) out[k] = v;
  return out;
}

/* ---------- Table ---------- */

export function table({ columns, rows, empty, onRow }) {
  if (!rows.length) {
    return h("div", { class: "empty" }, [
      h("div", { class: "empty-title", text: empty?.title || "Nothing here yet" }),
      h("div", { class: "muted", text: empty?.body || "" }),
    ]);
  }
  return h("table", {}, [
    h(
      "thead",
      {},
      h(
        "tr",
        {},
        columns.map((c) => h("th", { class: c.num ? "num" : "", text: c.label }))
      )
    ),
    h(
      "tbody",
      {},
      rows.map((r) => {
        const tr = h(
          "tr",
          { class: onRow ? "row-clickable" : "", onclick: onRow ? () => onRow(r) : null },
          columns.map((c) => {
            const cell = typeof c.cell === "function" ? c.cell(r) : r[c.key];
            const td = h("td", { class: c.num ? "num" : "" });
            if (cell instanceof Node) td.appendChild(cell);
            else td.innerHTML = cell == null ? "" : String(cell);
            return td;
          })
        );
        return tr;
      })
    ),
  ]);
}

/* ---------- Pills ---------- */

export function pill(status) {
  const cls = String(status || "").toLowerCase().replace(/\s+/g, "-");
  return h("span", { class: "pill " + cls, text: status });
}

/* ---------- KPI card ---------- */

export function kpi({ label, value, unit, delta, trend }) {
  const cls = delta == null ? "flat" : delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const arrow = delta == null ? "·" : delta > 0 ? "↑" : delta < 0 ? "↓" : "·";
  const deltaText = delta == null ? "—" : `${arrow} ${Math.abs(delta)}%`;
  return h("div", { class: "kpi" }, [
    h("div", { class: "kpi-label", text: label }),
    h("div", { class: "kpi-value", html: value + (unit ? `<span class="unit">${unit}</span>` : "") }),
    h("div", { class: "kpi-delta " + cls, text: deltaText }),
    trend && sparkline(trend),
  ]);
}

/* ---------- Sparkline ---------- */

export function sparkline(points, w = 200, hh = 30) {
  if (!points || points.length < 2) return h("div", { class: "kpi-trend" });
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const dx = w / (points.length - 1);
  const path = points
    .map((v, i) => {
      const x = i * dx;
      const y = hh - ((v - min) / range) * hh;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const svgNs = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNs, "svg");
  svg.setAttribute("viewBox", `0 0 ${w} ${hh}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.style.width = "100%";
  svg.style.height = hh + "px";
  const p = document.createElementNS(svgNs, "path");
  p.setAttribute("d", path);
  p.setAttribute("fill", "none");
  p.setAttribute("stroke", "#10b981");
  p.setAttribute("stroke-width", "1.5");
  p.setAttribute("stroke-linejoin", "round");
  svg.appendChild(p);
  return h("div", { class: "kpi-trend" }, svg);
}

/* ---------- Line chart ---------- */

export function lineChart({ labels, values, height = 240 }) {
  const w = 800;
  const h_ = height;
  const padL = 36;
  const padR = 12;
  const padT = 12;
  const padB = 24;
  const innerW = w - padL - padR;
  const innerH = h_ - padT - padB;

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const dx = innerW / Math.max(values.length - 1, 1);

  const pts = values.map((v, i) => ({
    x: padL + i * dx,
    y: padT + innerH - ((v - min) / range) * innerH,
  }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = path + ` L ${pts[pts.length - 1].x},${padT + innerH} L ${pts[0].x},${padT + innerH} Z`;

  const svgNs = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNs, "svg");
  svg.setAttribute("viewBox", `0 0 ${w} ${h_}`);
  svg.setAttribute("preserveAspectRatio", "none");

  // grid lines
  const grid = document.createElementNS(svgNs, "g");
  grid.setAttribute("class", "grid");
  for (let i = 0; i <= 4; i++) {
    const y = padT + (innerH / 4) * i;
    const ln = document.createElementNS(svgNs, "line");
    ln.setAttribute("x1", padL);
    ln.setAttribute("x2", w - padR);
    ln.setAttribute("y1", y);
    ln.setAttribute("y2", y);
    grid.appendChild(ln);
    const label = document.createElementNS(svgNs, "text");
    label.setAttribute("class", "axis");
    label.setAttribute("x", padL - 6);
    label.setAttribute("y", y + 3);
    label.setAttribute("text-anchor", "end");
    label.textContent = formatShort(max - (range / 4) * i);
    svg.appendChild(label);
  }
  svg.appendChild(grid);

  // area + line
  const areaEl = document.createElementNS(svgNs, "path");
  areaEl.setAttribute("d", area);
  areaEl.setAttribute("class", "area");
  svg.appendChild(areaEl);
  const lineEl = document.createElementNS(svgNs, "path");
  lineEl.setAttribute("d", path);
  lineEl.setAttribute("class", "line");
  svg.appendChild(lineEl);

  // dots
  for (const p of pts) {
    const c = document.createElementNS(svgNs, "circle");
    c.setAttribute("cx", p.x);
    c.setAttribute("cy", p.y);
    c.setAttribute("r", 3);
    c.setAttribute("class", "dot");
    svg.appendChild(c);
  }

  // x labels
  labels.forEach((lbl, i) => {
    const t = document.createElementNS(svgNs, "text");
    t.setAttribute("class", "axis");
    t.setAttribute("x", padL + i * dx);
    t.setAttribute("y", h_ - 6);
    t.setAttribute("text-anchor", "middle");
    t.textContent = lbl;
    svg.appendChild(t);
  });

  return h("div", { class: "chart-wrap" }, svg);
}

/* ---------- Bar chart ---------- */

export function barChart({ labels, values, height = 240 }) {
  const w = 800;
  const h_ = height;
  const padL = 36;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const innerW = w - padL - padR;
  const innerH = h_ - padT - padB;
  const max = Math.max(...values, 1);
  const slot = innerW / values.length;
  const barW = slot * 0.6;

  const svgNs = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNs, "svg");
  svg.setAttribute("viewBox", `0 0 ${w} ${h_}`);

  // grid
  for (let i = 0; i <= 4; i++) {
    const y = padT + (innerH / 4) * i;
    const ln = document.createElementNS(svgNs, "line");
    ln.setAttribute("x1", padL);
    ln.setAttribute("x2", w - padR);
    ln.setAttribute("y1", y);
    ln.setAttribute("y2", y);
    ln.setAttribute("stroke", "rgba(10,14,12,0.10)");
    svg.appendChild(ln);
    const label = document.createElementNS(svgNs, "text");
    label.setAttribute("class", "axis");
    label.setAttribute("x", padL - 6);
    label.setAttribute("y", y + 3);
    label.setAttribute("text-anchor", "end");
    label.textContent = formatShort(max - (max / 4) * i);
    svg.appendChild(label);
  }

  values.forEach((v, i) => {
    const x = padL + i * slot + (slot - barW) / 2;
    const bh = (v / max) * innerH;
    const y = padT + innerH - bh;
    const r = document.createElementNS(svgNs, "rect");
    r.setAttribute("x", x);
    r.setAttribute("y", y);
    r.setAttribute("width", barW);
    r.setAttribute("height", bh);
    r.setAttribute("rx", 3);
    r.setAttribute("class", "bar");
    svg.appendChild(r);
    const t = document.createElementNS(svgNs, "text");
    t.setAttribute("class", "axis");
    t.setAttribute("x", padL + i * slot + slot / 2);
    t.setAttribute("y", h_ - 8);
    t.setAttribute("text-anchor", "middle");
    t.textContent = labels[i];
    svg.appendChild(t);
  });

  return h("div", { class: "chart-wrap" }, svg);
}

/* ---------- Formatting ---------- */

export function inr(n) {
  if (n == null || isNaN(n)) return "—";
  const v = Number(n);
  if (Math.abs(v) >= 10000000) return "₹" + (v / 10000000).toFixed(2) + " Cr";
  if (Math.abs(v) >= 100000) return "₹" + (v / 100000).toFixed(2) + " L";
  if (Math.abs(v) >= 1000) return "₹" + (v / 1000).toFixed(1) + " K";
  return "₹" + v.toFixed(0);
}
export function inrFull(n) {
  if (n == null || isNaN(n)) return "—";
  return "₹" + Number(n).toLocaleString("en-IN");
}
export function formatShort(n) {
  const v = Number(n);
  if (Math.abs(v) >= 10000000) return (v / 10000000).toFixed(1) + "Cr";
  if (Math.abs(v) >= 100000) return (v / 100000).toFixed(1) + "L";
  if (Math.abs(v) >= 1000) return (v / 1000).toFixed(0) + "k";
  return v.toFixed(0);
}
export function dateShort(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
export function relTime(iso) {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  if (diff < 604800) return Math.floor(diff / 86400) + "d ago";
  return dateShort(iso);
}

/* ---------- Sidebar / Topbar ---------- */

const NAV = [
  {
    section: "Workspace",
    items: [
      { id: "dashboard", label: "Dashboard", route: "#/dashboard", icon: iconGrid() },
      { id: "leads", label: "Leads", route: "#/leads", icon: iconInbox() },
      { id: "pipeline", label: "Pipeline", route: "#/pipeline", icon: iconColumns() },
      { id: "clients", label: "Clients", route: "#/clients", icon: iconUsers() },
      { id: "invoices", label: "Invoices", route: "#/invoices", icon: iconFile() },
    ],
  },
  {
    section: "Marketing",
    items: [
      { id: "content", label: "Content calendar", route: "#/content", icon: iconCalendar() },
      { id: "metrics", label: "Metrics", route: "#/metrics", icon: iconChart() },
    ],
  },
  {
    section: "Brand",
    items: [
      { id: "brand-kit", label: "Brand kit", route: "#/brand-kit", icon: iconPalette() },
      { id: "documents", label: "Documents", route: "#/documents", icon: iconBook() },
    ],
  },
  {
    section: "System",
    items: [{ id: "settings", label: "Settings", route: "#/settings", icon: iconCog() }],
  },
];

export function renderSidebar(activeId, badges = {}) {
  const root = document.getElementById("sidebar");
  clear(root);

  root.appendChild(
    h("a", { class: "sidebar-brand", href: "#/dashboard" }, [
      h("svg", {
        viewBox: "0 0 32 32",
        html:
          '<defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#7CF6C8"/><stop offset="100%" stop-color="#10B981"/></linearGradient></defs>' +
          '<circle cx="16" cy="16" r="15" fill="url(#sg)"/>' +
          '<path d="M9 22V10l7 6 7-6v12" stroke="#0b1f1a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
      }),
      h("div", {}, [
        h("span", { text: "Brand Mint" }),
        h("small", { text: "ADMIN" }),
      ]),
    ])
  );

  for (const sec of NAV) {
    root.appendChild(h("div", { class: "nav-section", text: sec.section }));
    for (const it of sec.items) {
      const link = h(
        "a",
        {
          class: "nav-link" + (it.id === activeId ? " active" : ""),
          href: it.route,
          onclick: () => toggleSidebar(false),
        },
        [it.icon, h("span", { text: it.label })]
      );
      if (badges[it.id]) link.appendChild(h("span", { class: "badge", text: String(badges[it.id]) }));
      root.appendChild(link);
    }
  }

  root.appendChild(
    h("div", { class: "sidebar-foot" }, [
      h("div", { text: "v1.0 · Local mode" }),
      h("a", { href: "/", text: "← View public site" }),
    ])
  );
}

export function renderTopbar({ breadcrumb, title, actions }) {
  const root = document.getElementById("topbar");
  clear(root);

  const burger = h("button", {
    class: "nav-toggle",
    "aria-label": "Toggle navigation",
    onclick: () => toggleSidebar(),
    html:
      '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">' +
      '<path d="M3 5h12M3 9h12M3 13h12"/></svg>',
  });
  root.appendChild(burger);

  root.appendChild(
    h(
      "a",
      {
        class: "topbar-back",
        href: "/",
        "aria-label": "Back to Brand Mint public site",
        title: "Back to public site",
      },
      [
        h("svg", {
          viewBox: "0 0 14 14",
          html: '<path d="M9 3L5 7l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
        }),
        h("span", { text: "Back to home page" }),
      ]
    )
  );

  root.appendChild(
    h(
      "a",
      {
        class: "topbar-dashboard",
        href: "#/dashboard",
        "aria-label": "Go to Dashboard",
        title: "Dashboard",
      },
      [
        h("svg", {
          viewBox: "0 0 16 16",
          html:
            '<rect x="2" y="2" width="5" height="5" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
            '<rect x="9" y="2" width="5" height="5" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
            '<rect x="2" y="9" width="5" height="5" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
            '<rect x="9" y="9" width="5" height="5" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>',
        }),
        h("span", { text: "Dashboard" }),
      ]
    )
  );

  root.appendChild(
    h("div", {}, [
      breadcrumb && h("div", { class: "breadcrumb", text: breadcrumb }),
      h("h1", { text: title }),
    ])
  );

  const trigger = h(
    "button",
    {
      class: "palette-trigger",
      onclick: () => window.bm?.openPalette?.(),
      "aria-label": "Open command palette",
    },
    [
      h("svg", {
        viewBox: "0 0 16 16",
        html:
          '<circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
          '<path d="M11 11l3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
      }),
      h("span", { class: "palette-trigger-label", text: "Search or run a command…" }),
      h("span", { class: "palette-trigger-kbd", text: kbdHint() }),
    ]
  );

  const syncPill = buildSyncPill();
  const actionBox = h("div", { class: "topbar-actions" }, [syncPill, trigger]);
  if (actions && actions.length) actions.forEach((a) => actionBox.appendChild(a));
  root.appendChild(actionBox);
}

let pillUnsub = null;
function buildSyncPill() {
  const pill = h("button", {
    class: "sync-pill",
    type: "button",
    "aria-label": "Sync status",
  });
  pill.appendChild(h("span", { class: "sync-pill-dot" }));
  const label = h("span", { class: "sync-pill-label" });
  pill.appendChild(label);

  function update(snap) {
    pill.title = snap.lastError
      ? `Last error: ${snap.lastError}`
      : snap.lastSyncAt
        ? `Last synced ${new Date(snap.lastSyncAt).toLocaleTimeString()}`
        : "Not yet synced";
    pill.classList.remove("ok", "warn", "err");
    if (!snap.remote) {
      pill.classList.add("warn");
      label.textContent = "Local only";
    } else if (!snap.online) {
      pill.classList.add("warn");
      label.textContent = "Offline";
    } else if (snap.errors > 0) {
      pill.classList.add("err");
      label.textContent = `${snap.errors} sync error${snap.errors > 1 ? "s" : ""}`;
    } else {
      pill.classList.add("ok");
      label.textContent = "Synced";
    }
  }

  // Pull current state via the global handle exposed in app.js. Defer one
  // tick because window.bm is set after the first renderTopbar() runs.
  queueMicrotask(() => {
    const dbRef = window.bm?.db;
    if (!dbRef) return;
    update(dbRef.status());
    if (pillUnsub) pillUnsub();
    pillUnsub = dbRef.subscribe(update);
    pill.addEventListener("click", () => {
      if (dbRef.status().errors > 0) {
        dbRef.resetSyncErrors();
      }
    });
  });

  window.addEventListener("online", () => {
    const dbRef = window.bm?.db;
    if (dbRef) update(dbRef.status());
  });
  window.addEventListener("offline", () => {
    const dbRef = window.bm?.db;
    if (dbRef) update(dbRef.status());
  });

  return pill;
}

function kbdHint() {
  if (typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform)) return "⌘K";
  return "Ctrl K";
}

export function toggleSidebar(force) {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;
  let backdrop = document.getElementById("sidebar-backdrop");
  if (!backdrop) {
    backdrop = h("div", {
      id: "sidebar-backdrop",
      class: "sidebar-backdrop",
      onclick: () => toggleSidebar(false),
    });
    document.body.appendChild(backdrop);
  }
  const open = force == null ? !sidebar.classList.contains("open") : !!force;
  sidebar.classList.toggle("open", open);
  backdrop.classList.toggle("show", open);
}

/* ---------- Icons ---------- */

function svg(d) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  el.setAttribute("viewBox", "0 0 16 16");
  el.setAttribute("fill", "none");
  el.setAttribute("stroke", "currentColor");
  el.setAttribute("stroke-width", "1.4");
  el.setAttribute("stroke-linecap", "round");
  el.setAttribute("stroke-linejoin", "round");
  el.innerHTML = d;
  return el;
}
function iconGrid()    { return svg('<rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/>'); }
function iconInbox()   { return svg('<path d="M2 9l2-5h8l2 5v4a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V9z"/><path d="M2 9h3l1 2h4l1-2h3"/>'); }
function iconColumns() { return svg('<rect x="2" y="2" width="3.5" height="12" rx="1"/><rect x="6.5" y="2" width="3.5" height="12" rx="1"/><rect x="11" y="2" width="3" height="12" rx="1"/>'); }
function iconUsers()   { return svg('<circle cx="6" cy="6" r="2.5"/><path d="M2 13c0-2.2 1.8-4 4-4s4 1.8 4 4"/><circle cx="11" cy="6" r="2"/><path d="M14 12c0-1.5-1-2.8-2.5-3"/>'); }
function iconFile()    { return svg('<path d="M4 1.5h5l3 3V14a.5.5 0 0 1-.5.5h-7A.5.5 0 0 1 4 14V2a.5.5 0 0 1 .5-.5z"/><path d="M9 1.5V4a.5.5 0 0 0 .5.5H12"/><path d="M6 8h4M6 11h4"/>'); }
function iconCalendar(){ return svg('<rect x="2" y="3" width="12" height="11" rx="1"/><path d="M2 6h12M5 1.5v3M11 1.5v3"/>'); }
function iconChart()   { return svg('<path d="M2 14V2M14 14H2M5 11V8M8 11V5M11 11V7"/>'); }
function iconPalette() { return svg('<path d="M8 1.5C4.4 1.5 1.5 4.4 1.5 8c0 3 2 5.5 5 6.4.5.1.8-.2.8-.6v-1.4c-2-.1-2.4-1-2.4-1 0-.3-.2-.5-.2-.5"/><circle cx="5" cy="5.5" r=".5"/><circle cx="8" cy="3.5" r=".5"/><circle cx="11" cy="5.5" r=".5"/><circle cx="12" cy="9" r=".5"/>'); }
function iconBook()    { return svg('<path d="M3 2.5h4.5C8 2.5 8 3 8 3v11s-.2-.5-.7-.5H3V2.5z"/><path d="M13 2.5H8.5C8 2.5 8 3 8 3v11s.2-.5.7-.5H13V2.5z"/>'); }
function iconCog()     { return svg('<circle cx="8" cy="8" r="2"/><path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.8 3.8l1 1M11.2 11.2l1 1M11.2 4.8l1-1M3.8 12.2l1-1"/>'); }
