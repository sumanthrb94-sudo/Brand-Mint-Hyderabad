/**
 * Analytics — what people do on the site and in the portal.
 * First-party events (shared/analytics.js), read on demand for a range.
 */
import { h, renderTopbar, kpi, table } from "/admin/components.js";
import { TIER_BY_ID } from "/shared/tiers.js";
import { RANGES, DEVICES, loadEvents, byDevice, dayKey, dayLabels, uniq, count, tierFromHref, basePath } from "/admin/modules/analytics-data.js";

const C = { a: "#047857", b: "#c9a14a" }; // validated pair on white (see dataviz palette check)
const state = { days: 30, dev: "all" };

export async function render(ctx) {
  const { db } = ctx;
  const root = h("div", {});
  renderTopbar({ breadcrumb: "INSIGHT", title: "Analytics", actions: [h("a", { class: "btn btn-sm", href: "#/heatmap", text: "Heat map →" })] });
  root.appendChild(filters(() => draw()));
  const host = h("div", {});
  root.appendChild(host);

  async function draw() {
    host.innerHTML = "";
    host.appendChild(h("p", { class: "muted", text: "Loading events…" }));
    let events;
    try { events = byDevice(await loadEvents(db, state.days), state.dev); }
    catch (e) { host.innerHTML = ""; host.appendChild(h("div", { class: "empty" }, [h("div", { class: "empty-title", text: "Couldn't load events" }), h("div", { class: "muted", text: e.message || String(e) })])); return; }
    host.innerHTML = "";
    if (!events.length) {
      host.appendChild(h("div", { class: "empty" }, [h("div", { class: "empty-title", text: "No events yet" }), h("div", { class: "muted", text: "Events arrive as soon as someone opens the site. Check back in a day." })]));
      return;
    }
    host.appendChild(overview(events));
  }
  draw();
  return root;
}

function filters(onChange) {
  const chips = (items, get, set) => h("div", { class: "table-filter" }, items.map((it) => {
    const id = typeof it === "object" ? it.id : it;
    const label = typeof it === "object" ? it.label : it[0].toUpperCase() + it.slice(1);
    return h("button", { class: "chip-btn" + (get() === id ? " active" : ""), text: label, onclick: (e) => { set(id); e.currentTarget.parentElement.querySelectorAll(".chip-btn").forEach((b) => b.classList.toggle("active", b === e.currentTarget)); onChange(); } });
  }));
  return h("div", { class: "table-toolbar", style: "margin-bottom:16px" }, [
    chips(RANGES, () => state.days, (v) => { state.days = v; }),
    chips(DEVICES, () => state.dev, (v) => { state.dev = v; }),
  ]);
}

function overview(events) {
  const views = events.filter((e) => e.t === "page_view");
  const home = views.filter((e) => basePath(e.path) === "/");
  const homeSessions = new Set(home.map((e) => e.sid));
  const clicks = events.filter((e) => e.t === "click");
  const tierClicks = clicks.filter((e) => tierFromHref(e.href));
  const portalUids = uniq(views.filter((e) => basePath(e.path).startsWith("/portal")).map((e) => e.uid));
  const leaves = events.filter((e) => e.t === "leave" && basePath(e.path) === "/");
  const secs = leaves.map((e) => Number(e.secs) || 0).sort((a, b) => a - b);
  const median = secs.length ? secs[Math.floor(secs.length / 2)] : 0;
  const conv = home.length ? Math.round((uniq(tierClicks.map((e) => e.sid)) / homeSessions.size) * 1000) / 10 : 0;

  const labels = dayLabels(state.days);
  const perDay = (rows, key) => labels.map((d) => uniq(rows.filter((e) => dayKey(e.ts) === d).map(key)));
  const viewsByDay = labels.map((d) => views.filter((e) => dayKey(e.ts) === d).length);
  const visitorsByDay = perDay(views, (e) => e.aid);

  const tiers = count(tierClicks, (e) => tierFromHref(e.href)).map(([id, n]) => ({ label: TIER_BY_ID[id]?.name || id, value: n }));
  const order = ["stores", "how", "care", "free", "faq"];
  const reach = order.map((sec) => ({ label: sec, value: uniq(events.filter((e) => e.t === "section" && e.sec === sec && basePath(e.path) === "/").map((e) => e.sid)), share: homeSessions.size }));
  const depth = [25, 50, 75, 100].map((d) => ({ label: `${d}%`, value: uniq(events.filter((e) => e.t === "scroll" && Number(e.depth) >= d && basePath(e.path) === "/").map((e) => e.sid)), share: homeSessions.size }));
  const devices = count(views, (e) => e.dev).map(([k, n]) => ({ label: k, value: n, share: views.length }));
  const refs = count(views, (e) => e.ref || "direct").slice(0, 8);
  const pages = count(views, (e) => basePath(e.path)).slice(0, 8);
  const named = count(events.filter((e) => e.t === "event"), (e) => e.n);
  const topClicks = count(clicks, (e) => (e.txt || e.el || "").slice(0, 48)).slice(0, 10);

  return h("div", { class: "vstack", style: "gap:18px" }, [
    h("div", { class: "kpi-grid" }, [
      kpi({ label: "Page views", value: String(views.length) }),
      kpi({ label: "Visitors", value: String(uniq(views.map((e) => e.aid))) }),
      kpi({ label: "Tier clicks", value: String(tierClicks.length) }),
      kpi({ label: "Home → tier click", value: conv + "%" }),
      kpi({ label: "Portal sign-ins", value: String(portalUids) }),
      kpi({ label: "Median time on home", value: median + "s" }),
    ]),
    card("Views and visitors by day", lineChart({ labels, series: [{ name: "Views", color: C.a, values: viewsByDay }, { name: "Visitors", color: C.b, values: visitorsByDay }] })),
    h("div", { class: "grid-2" }, [
      card("Tier buttons clicked", tiers.length ? hbars(tiers, C.a) : empty("No tier clicks yet")),
      card("Home page sections reached", hbars(reach, C.a, true)),
      card("Scroll depth on home", hbars(depth, C.a, true)),
      card("Devices", hbars(devices, C.a, true)),
    ]),
    h("div", { class: "grid-2" }, [
      card("Top pages", listTable(pages, "Page", "Views")),
      card("Referrers", listTable(refs, "Source", "Views")),
      card("Portal actions", named.length ? listTable(named, "Event", "Count") : empty("Nothing yet — quiz, perks and pre-books show here")),
      card("Most clicked", topClicks.length ? listTable(topClicks, "Element", "Clicks") : empty("No clicks yet")),
    ]),
  ]);
}

function card(title, body) {
  return h("section", { class: "card" }, [h("div", { class: "card-head" }, [h("h3", { text: title })]), body]);
}
function empty(text) { return h("p", { class: "muted", style: "padding:8px 0", text }); }
function listTable(rows, a, b) {
  return table({ columns: [{ label: a, cell: (r) => h("span", { class: "strong", text: r[0] }) }, { label: b, num: true, cell: (r) => String(r[1]) }], rows, empty: {} });
}

/* ------------------------------------------------------- charts */

/** Horizontal bars, thin, rounded data end, direct value labels. */
function hbars(rows, color, pct = false) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return h("div", { class: "hbars" }, rows.map((r) => {
    const w = Math.round((r.value / max) * 100);
    const lab = pct && r.share ? `${Math.round((r.value / r.share) * 100)}% · ${r.value}` : String(r.value);
    return h("div", { class: "hbar", title: `${r.label}: ${lab}` }, [
      h("span", { class: "hbar-label", text: r.label }),
      h("span", { class: "hbar-track" }, h("span", { class: "hbar-fill", style: `width:${w}%;background:${color}` })),
      h("span", { class: "hbar-value num", text: lab }),
    ]);
  }));
}

/** Two-series line: legend, direct end labels, crosshair tooltip, table toggle. */
function lineChart({ labels, series, height = 220 }) {
  const w = 800, padL = 34, padR = 64, padT = 14, padB = 26;
  const iw = w - padL - padR, ih = height - padT - padB;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const nice = Math.ceil(max / 5) * 5 || 5;
  const X = (i) => padL + (labels.length > 1 ? (i / (labels.length - 1)) * iw : iw / 2);
  const Y = (v) => padT + ih - (v / nice) * ih;
  const svg = h("svg", { viewBox: `0 0 ${w} ${height}`, class: "chart", role: "img", "aria-label": series.map((s) => s.name).join(" and ") + " by day" });
  const ns = "http://www.w3.org/2000/svg";
  const el = (tag, attrs) => { const e = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
  for (let g = 0; g <= 4; g++) {
    const y = padT + (ih * g) / 4;
    svg.appendChild(el("line", { x1: padL, x2: padL + iw, y1: y, y2: y, class: "chart-grid" }));
    const t = el("text", { x: padL - 6, y: y + 4, class: "chart-tick", "text-anchor": "end" }); t.textContent = String(Math.round(nice - (nice * g) / 4)); svg.appendChild(t);
  }
  const step = Math.max(1, Math.round(labels.length / 6));
  labels.forEach((d, i) => { if (i % step === 0 || i === labels.length - 1) { const t = el("text", { x: X(i), y: height - 8, class: "chart-tick", "text-anchor": "middle" }); t.textContent = d.slice(5); svg.appendChild(t); } });
  for (const s of series) {
    const d = s.values.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
    svg.appendChild(el("path", { d, fill: "none", stroke: s.color, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }));
    const last = s.values.length - 1;
    const t = el("text", { x: X(last) + 8, y: Y(s.values[last]) + 4, class: "chart-label" }); t.textContent = `${s.name} ${s.values[last]}`; svg.appendChild(t);
  }
  const cross = el("line", { y1: padT, y2: padT + ih, class: "chart-cross", style: "display:none" }); svg.appendChild(cross);
  const dots = series.map((s) => { const c = el("circle", { r: 4, fill: s.color, stroke: "#fff", "stroke-width": 2, style: "display:none" }); svg.appendChild(c); return c; });
  const tip = h("div", { class: "chart-tip", hidden: true });
  const wrap = h("div", { class: "chart-wrap" }, [
    h("div", { class: "chart-legend" }, series.map((s) => h("span", {}, [h("i", { style: `background:${s.color}` }), s.name]))),
    svg, tip,
  ]);
  svg.addEventListener("mousemove", (e) => {
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * w;
    const i = Math.max(0, Math.min(labels.length - 1, Math.round(((px - padL) / iw) * (labels.length - 1))));
    cross.setAttribute("x1", X(i)); cross.setAttribute("x2", X(i)); cross.style.display = "";
    series.forEach((s, k) => { dots[k].setAttribute("cx", X(i)); dots[k].setAttribute("cy", Y(s.values[i])); dots[k].style.display = ""; });
    tip.hidden = false; tip.innerHTML = "";
    tip.appendChild(h("strong", { text: labels[i] }));
    series.forEach((s) => tip.appendChild(h("div", {}, [h("i", { style: `background:${s.color}` }), `${s.name}: ${s.values[i]}`])));
    tip.style.left = Math.min(r.width - 150, Math.max(0, (X(i) / w) * r.width + 10)) + "px";
  });
  svg.addEventListener("mouseleave", () => { cross.style.display = "none"; dots.forEach((d) => (d.style.display = "none")); tip.hidden = true; });
  // Table view for screen readers and the contrast relief the gold series needs.
  const tbl = h("details", { class: "chart-table" }, [h("summary", { text: "Show as table" }),
    table({ columns: [{ label: "Day", key: 0 }, ...series.map((s, k) => ({ label: s.name, num: true, cell: (r) => String(r[k + 1]) }))], rows: labels.map((d, i) => [d, ...series.map((s) => s.values[i])]), empty: {} })]);
  return h("div", {}, [wrap, tbl]);
}
