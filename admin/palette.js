/**
 * Command palette — ⌘K / Ctrl+K / "/" everywhere.
 *
 * Universal fuzzy-searchable index of:
 *   - All routes (Dashboard, Leads, Pipeline, …)
 *   - Quick create actions (+ New lead, + New invoice, …)
 *   - Every entity in the db (leads, projects, clients, invoices, content)
 *
 * Keyboard:  ↑ ↓ to move, Enter to run, Esc to close
 */

import { h, clear } from "/admin/components.js";

let openInstance = null;

const ROUTES = [
  { id: "dashboard", label: "Go to Dashboard", icon: "▦", kbd: "G D" },
  { id: "leads",     label: "Go to Leads",     icon: "✉", kbd: "G E" },
  { id: "pipeline",  label: "Go to Pipeline",  icon: "▥", kbd: "G P" },
  { id: "clients",   label: "Go to Clients",   icon: "◔", kbd: "G C" },
  { id: "invoices",  label: "Go to Invoices",  icon: "₹", kbd: "G I" },
  { id: "content",   label: "Go to Content calendar", icon: "▤", kbd: "G N" },
  { id: "metrics",   label: "Go to Metrics",   icon: "△", kbd: "G M" },
  { id: "brand-kit", label: "Go to Brand kit", icon: "◉", kbd: "G B" },
  { id: "documents", label: "Go to Documents", icon: "▢", kbd: "G U" },
  { id: "settings",  label: "Go to Settings",  icon: "⚙", kbd: "G S" },
];

const CREATE = [
  { label: "New lead",          target: "/leads?new=1",    icon: "+" },
  { label: "New project",       target: "/pipeline?new=1", icon: "+" },
  { label: "New client",        target: "/clients?new=1",  icon: "+" },
  { label: "New invoice",       target: "/invoices?new=1", icon: "+" },
  { label: "New content post",  target: "/content?new=1",  icon: "+" },
];

export function openPalette(ctx) {
  if (openInstance) return;

  const items = buildItems(ctx);
  let filtered = items.slice();
  let selectedIdx = 0;

  const list = h("div", { class: "palette-list" });
  const input = h("input", {
    type: "text",
    placeholder: "Search routes, actions, leads, clients, invoices…",
    class: "palette-input",
    autocomplete: "off",
    autocapitalize: "off",
    spellcheck: "false",
    oninput: (e) => {
      filtered = score(items, e.target.value);
      selectedIdx = 0;
      renderList();
    },
  });

  const foot = h("div", { class: "palette-foot" }, [
    h("span", {}, [kbd("↑"), kbd("↓"), " to move"]),
    h("span", {}, [kbd("↵"), " to select"]),
    h("span", {}, [kbd("Esc"), " to close"]),
  ]);

  const card = h("div", { class: "palette" }, [input, list, foot]);

  const overlay = h(
    "div",
    {
      class: "palette-overlay",
      onclick: (e) => {
        if (e.target === overlay) close();
      },
    },
    [card]
  );

  document.body.appendChild(overlay);
  input.focus();
  renderList();

  function renderList() {
    clear(list);
    if (!filtered.length) {
      list.appendChild(
        h("div", { class: "palette-empty" }, [
          h("div", { class: "palette-empty-title", text: "No matches" }),
          h("div", { class: "palette-empty-sub", text: "Try a route name, a client, or an invoice number." }),
        ])
      );
      return;
    }
    let lastSection = null;
    filtered.slice(0, 30).forEach((item, i) => {
      if (item.section !== lastSection) {
        list.appendChild(h("div", { class: "palette-section", text: item.section }));
        lastSection = item.section;
      }
      const row = h(
        "div",
        {
          class: "palette-item" + (i === selectedIdx ? " selected" : ""),
          dataset: { idx: String(i) },
          onmouseenter: () => {
            selectedIdx = i;
            highlight();
          },
          onclick: () => run(item),
        },
        [
          h("span", { class: "palette-item-icon", text: item.icon || "›" }),
          h("div", { class: "palette-item-text" }, [
            h("div", { class: "palette-item-label", text: item.label }),
            item.sub && h("div", { class: "palette-item-sub", text: item.sub }),
          ]),
          item.kbd && h("span", { class: "palette-item-kbd", text: item.kbd }),
        ]
      );
      list.appendChild(row);
    });
  }

  function highlight() {
    list.querySelectorAll(".palette-item").forEach((el) => {
      el.classList.toggle("selected", Number(el.dataset.idx) === selectedIdx);
    });
  }

  function scrollIntoView() {
    const el = list.querySelector(".palette-item.selected");
    if (el) el.scrollIntoView({ block: "nearest" });
  }

  function run(item) {
    close();
    item.run();
  }

  function onKey(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIdx = Math.min(selectedIdx + 1, Math.min(filtered.length, 30) - 1);
      highlight();
      scrollIntoView();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIdx = Math.max(selectedIdx - 1, 0);
      highlight();
      scrollIntoView();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIdx]) run(filtered[selectedIdx]);
    }
  }

  function close() {
    overlay.remove();
    document.removeEventListener("keydown", onKey, true);
    openInstance = null;
  }

  document.addEventListener("keydown", onKey, true);
  openInstance = { close };
}

function buildItems(ctx) {
  const { db, navigate } = ctx;
  const items = [];

  for (const r of ROUTES) {
    items.push({
      section: "Navigation",
      label: r.label,
      icon: r.icon,
      kbd: r.kbd,
      run: () => navigate("/" + r.id),
    });
  }
  for (const c of CREATE) {
    items.push({
      section: "Create",
      label: c.label,
      icon: c.icon,
      run: () => navigate(c.target),
    });
  }

  for (const lead of db.list("leads")) {
    items.push({
      section: "Leads",
      label: lead.name || "(unnamed)",
      sub: [lead.company, lead.status, lead.projectType].filter(Boolean).join(" · "),
      icon: "●",
      run: () => navigate("/leads?id=" + lead.id),
    });
  }
  for (const p of db.list("projects")) {
    items.push({
      section: "Projects",
      label: p.name,
      sub: [p.client, p.stage, p.type].filter(Boolean).join(" · "),
      icon: "■",
      run: () => navigate("/pipeline?id=" + p.id),
    });
  }
  for (const c of db.list("clients")) {
    items.push({
      section: "Clients",
      label: c.name,
      sub: [c.city, c.tier, c.contact].filter(Boolean).join(" · "),
      icon: "◔",
      run: () => navigate("/clients?id=" + c.id),
    });
  }
  for (const inv of db.list("invoices")) {
    items.push({
      section: "Invoices",
      label: inv.number || "(no number)",
      sub: [inv.client, inv.status].filter(Boolean).join(" · "),
      icon: "₹",
      run: () => navigate("/invoices?id=" + inv.id),
    });
  }
  for (const post of db.list("content")) {
    items.push({
      section: "Content",
      label: post.title || "(untitled)",
      sub: [post.date, post.channel, post.status].filter(Boolean).join(" · "),
      icon: "▤",
      run: () => navigate("/content?id=" + post.id),
    });
  }

  return items;
}

// Simple ranked match: exact substring at position 0 wins, then any substring,
// then subsequence match (chars appear in order). Section-name match boosts too.
function score(items, query) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  const scored = [];
  for (const item of items) {
    const hay = (item.label + " " + (item.sub || "") + " " + item.section).toLowerCase();
    let s = -1;
    const idx = hay.indexOf(q);
    if (idx === 0) s = 0;
    else if (idx > 0) s = 100 + idx;
    else {
      let qi = 0;
      for (let i = 0; i < hay.length && qi < q.length; i++) {
        if (hay[i] === q[qi]) qi++;
      }
      if (qi === q.length) s = 1000 + (hay.length - q.length);
    }
    if (s >= 0) scored.push({ item, s });
  }
  scored.sort((a, b) => a.s - b.s);
  return scored.map((x) => x.item);
}

function kbd(text) {
  return h("kbd", { class: "palette-kbd", text });
}
