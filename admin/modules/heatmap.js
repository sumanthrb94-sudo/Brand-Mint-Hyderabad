/**
 * Heat map — where people click and how far they scroll, drawn over the
 * real page at the visitor's device width. Same-origin iframe of the page
 * (with ?bm_nt=1 so the tracker stays off inside it) plus a canvas overlay.
 */
import { h, renderTopbar, table } from "/admin/components.js";
import { RANGES, loadEvents, uniq, count, basePath } from "/admin/modules/analytics-data.js";

const PAGES = [{ id: "/", label: "Home" }, { id: "/login", label: "Sign-in" }, { id: "/portal", label: "Portal" }];
const WIDTHS = { mobile: 375, tablet: 820, desktop: 1280 };
const state = { days: 30, page: "/", dev: "desktop" };

export async function render(ctx) {
  const { db } = ctx;
  const root = h("div", {});
  renderTopbar({ breadcrumb: "INSIGHT", title: "Heat map", actions: [h("a", { class: "btn btn-sm", href: "#/analytics", text: "← Analytics" })] });

  const chips = (items, get, set) => h("div", { class: "table-filter" }, items.map((it) => {
    const id = typeof it === "object" ? it.id : it;
    const label = typeof it === "object" ? it.label : it[0].toUpperCase() + it.slice(1);
    return h("button", { class: "chip-btn" + (get() === id ? " active" : ""), text: label, onclick: (e) => { set(id); e.currentTarget.parentElement.querySelectorAll(".chip-btn").forEach((b) => b.classList.toggle("active", b === e.currentTarget)); draw(); } });
  }));
  root.appendChild(h("div", { class: "table-toolbar", style: "margin-bottom:16px" }, [
    chips(PAGES, () => state.page, (v) => { state.page = v; }),
    chips(Object.keys(WIDTHS), () => state.dev, (v) => { state.dev = v; }),
    chips(RANGES, () => state.days, (v) => { state.days = v; }),
  ]));
  const host = h("div", {});
  root.appendChild(host);

  async function draw() {
    host.innerHTML = "";
    let events;
    try { events = await loadEvents(db, state.days); }
    catch (e) { host.appendChild(h("div", { class: "empty" }, [h("div", { class: "empty-title", text: "Couldn't load events" }), h("div", { class: "muted", text: e.message || String(e) })])); return; }
    const onPage = events.filter((e) => basePath(e.path) === state.page && e.dev === state.dev);
    const clicks = onPage.filter((e) => e.t === "click" && e.xr != null && e.yr != null);
    const sessions = uniq(onPage.filter((e) => e.t === "page_view").map((e) => e.sid)) || uniq(clicks.map((e) => e.sid));
    const scrolls = onPage.filter((e) => e.t === "scroll");
    const bands = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((b) => ({ b, n: uniq(scrolls.filter((e) => Number(e.depth) >= Math.min(100, Math.ceil(b / 25) * 25)).map((e) => e.sid)) }));

    const width = WIDTHS[state.dev];
    const frame = h("iframe", { class: "heat-frame", src: `${state.page}?bm_nt=1`, style: `width:${width}px`, title: `${state.page} at ${width}px` });
    const canvas = h("canvas", { class: "heat-canvas", width: String(width), height: "10" });
    const strip = h("canvas", { class: "heat-strip", width: "28", height: "10", title: "Scroll depth: share of sessions reaching each band" });
    const stage = h("div", { class: "heat-stage", style: `width:${width + 28}px` }, [frame, canvas, strip]);
    host.appendChild(h("div", { class: "hstack", style: "gap:18px;align-items:baseline;margin-bottom:10px;flex-wrap:wrap" }, [
      h("span", { class: "strong", text: `${clicks.length} clicks · ${sessions} sessions · ${width}px` }),
      h("span", { class: "muted", text: "Darker mint = more clicks. The strip on the right is scroll depth: darker = more sessions got that far." }),
    ]));
    host.appendChild(h("div", { class: "heat-scroll" }, stage));
    const paint = () => {
      let docH = 2000;
      try { docH = Math.max(600, frame.contentDocument.documentElement.scrollHeight); } catch {}
      frame.style.height = docH + "px";
      canvas.height = docH; strip.height = docH;
      paintClicks(canvas, clicks, width, docH);
      paintDepth(strip, bands, sessions, docH);
    };
    // Paint on load, again once late assets settle, and on a timer in case a
    // blocked third-party asset (fonts) holds the load event hostage.
    frame.addEventListener("load", () => { paint(); setTimeout(paint, 1200); });
    setTimeout(paint, 2500);
    host.appendChild(h("section", { class: "card", style: "margin-top:18px" }, [
      h("div", { class: "card-head" }, [h("h3", { text: "Most clicked on this page" })]),
      table({ columns: [{ label: "Element", cell: (r) => h("span", { class: "strong", text: r[0] }) }, { label: "Clicks", num: true, cell: (r) => String(r[1]) }],
        rows: count(clicks, (e) => (e.txt ? `${e.txt} — ${e.el}` : e.el)).slice(0, 12), empty: { title: "No clicks yet", body: "Clicks on this page at this width will show here." } }),
    ]));
  }
  draw();
  return root;
}

/* Sequential single-hue ramp (light → dark mint) for intensity. */
const RAMP = [[214, 245, 230], [124, 246, 200], [16, 185, 129], [4, 120, 87], [6, 78, 59]];
function ramp(t) {
  const x = Math.max(0, Math.min(1, t)) * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(x)); const f = x - i;
  return RAMP[i].map((c, k) => Math.round(c + (RAMP[i + 1][k] - c) * f));
}

function paintClicks(canvas, clicks, width, docH) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, docH);
  if (!clicks.length) return;
  const off = document.createElement("canvas"); off.width = width; off.height = docH;
  const o = off.getContext("2d");
  const r = Math.max(18, Math.round(width / 36));
  for (const c of clicks) {
    const x = (c.xr / 1000) * width, y = (c.yr / 1000) * docH;
    const g = o.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(0,0,0,0.35)"); g.addColorStop(1, "rgba(0,0,0,0)");
    o.fillStyle = g; o.beginPath(); o.arc(x, y, r, 0, Math.PI * 2); o.fill();
  }
  const img = o.getImageData(0, 0, width, docH); const d = img.data;
  let max = 1; for (let i = 3; i < d.length; i += 4) if (d[i] > max) max = d[i];
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3]; if (!a) continue;
    const t = a / max; const [R, G, B] = ramp(t);
    d[i] = R; d[i + 1] = G; d[i + 2] = B; d[i + 3] = Math.round(Math.min(1, t * 1.4) * 215);
  }
  ctx.putImageData(img, 0, 0);
}

function paintDepth(strip, bands, sessions, docH) {
  const ctx = strip.getContext("2d");
  ctx.clearRect(0, 0, 28, docH);
  const bh = docH / bands.length;
  bands.forEach((b, i) => {
    const t = sessions ? b.n / sessions : 0;
    const [R, G, B] = ramp(t);
    ctx.fillStyle = `rgb(${R},${G},${B})`; ctx.fillRect(4, i * bh, 20, bh - 1);
    ctx.fillStyle = t > 0.55 ? "#f5f1ea" : "#0a0e0c"; ctx.font = "600 9px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.save(); ctx.translate(14, i * bh + bh / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(`${Math.round(t * 100)}%`, 0, 3); ctx.restore();
  });
}
