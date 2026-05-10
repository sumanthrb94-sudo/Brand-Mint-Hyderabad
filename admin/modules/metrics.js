/**
 * Metrics — read-only KPI deep-dive. Derives everything from db state.
 */

import {
  h,
  kpi,
  lineChart,
  barChart,
  table,
  renderTopbar,
  inr,
} from "/admin/components.js";

export async function render(ctx) {
  const { db } = ctx;
  const leads = db.list("leads");
  const projects = db.list("projects");
  const invoices = db.list("invoices");
  const clients = db.list("clients");
  const content = db.list("content");

  renderTopbar({
    breadcrumb: "MARKETING",
    title: "Metrics",
    actions: [
      h("button", {
        class: "btn btn-ghost",
        text: "Export KPI snapshot",
        onclick: () => exportSnapshot(ctx, { leads, projects, invoices, clients, content }),
      }),
    ],
  });

  /* ---- Top KPIs ---- */
  const won = leads.filter((l) => l.status === "won").length;
  const lost = leads.filter((l) => l.status === "lost").length;
  const conv = won + lost > 0 ? Math.round((won / (won + lost)) * 100) + "%" : "—";

  const wonProjectValues = projects.filter((p) => p.stage !== "Mint").map((p) => Number(p.value || 0));
  const paidInvoiceTotals = invoices.filter((i) => i.status === "paid").map((i) => Number(i.total || 0));
  const allDeals = [...wonProjectValues, ...paidInvoiceTotals].filter((v) => v > 0);
  const avgDeal = allDeals.length ? Math.round(allDeals.reduce((a, b) => a + b, 0) / allDeals.length) : 0;

  const velocityDays = (() => {
    const ds = projects
      .filter((p) => p.createdAt && p.kickoff)
      .map((p) => Math.max(0, Math.floor((new Date(p.kickoff) - new Date(p.createdAt)) / 86400000)));
    if (!ds.length) return "—";
    return Math.floor(ds.reduce((a, b) => a + b, 0) / ds.length) + " days";
  })();

  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  const qStart = new Date(now.getFullYear(), q * 3, 1);
  const qEnd = new Date(now.getFullYear(), q * 3 + 3, 1);
  const qRev = invoices
    .filter((i) => i.status === "paid" && i.paidOn && new Date(i.paidOn) >= qStart && new Date(i.paidOn) < qEnd)
    .reduce((s, i) => s + Number(i.total || 0), 0);

  const activeRetainers = projects.filter((p) => p.type === "Retainer" && p.stage !== "Care").length;

  const ninetyAgo = Date.now() - 90 * 86400000;
  const recentLeads = leads.filter((l) => new Date(l.createdAt).getTime() >= ninetyAgo).length;
  const leadsPerMonth = Math.round((recentLeads / 3) * 10) / 10;

  const root = h("div", {});

  root.appendChild(
    h("div", { class: "kpi-grid" }, [
      kpi({ label: "Lead → Won conversion", value: conv, delta: null }),
      kpi({ label: "Avg deal size", value: inr(avgDeal), delta: null }),
      kpi({ label: "Pipeline velocity", value: velocityDays, delta: null }),
      kpi({ label: "Revenue this quarter", value: inr(qRev), delta: null }),
      kpi({ label: "Active retainers", value: String(activeRetainers), delta: null }),
      kpi({ label: "Leads/mo (90d avg)", value: String(leadsPerMonth), delta: null }),
    ])
  );

  /* ---- Revenue trend (last 6 months) ---- */
  const monthLabels = [];
  const monthRev = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthLabels.push(d.toLocaleString("en-IN", { month: "short" }));
    const ym = d.toISOString().slice(0, 7);
    monthRev.push(
      invoices
        .filter((inv) => inv.status === "paid" && (inv.paidOn || "").slice(0, 7) === ym)
        .reduce((s, inv) => s + Number(inv.total || 0), 0)
    );
  }

  /* ---- Lead source breakdown ---- */
  const sourceMap = new Map();
  for (const l of leads) {
    const k = l.source || "Unknown";
    sourceMap.set(k, (sourceMap.get(k) || 0) + 1);
  }
  const sourceEntries = [...sourceMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const trunc = (s) => (s.length > 10 ? s.slice(0, 8) + "…" : s);

  root.appendChild(
    h("div", { class: "two-col" }, [
      h("div", { class: "panel" }, [
        h("div", { class: "panel-head" }, [
          h("div", {}, [
            h("h3", { text: "Revenue trend" }),
            h("div", { class: "subt", text: "Last 6 months · paid invoices" }),
          ]),
        ]),
        lineChart({ labels: monthLabels, values: monthRev }),
      ]),
      h("div", { class: "panel" }, [
        h("div", { class: "panel-head" }, [
          h("div", {}, [
            h("h3", { text: "Lead source breakdown" }),
            h("div", { class: "subt", text: `${leads.length} leads total` }),
          ]),
        ]),
        sourceEntries.length
          ? barChart({ labels: sourceEntries.map(([n]) => trunc(n)), values: sourceEntries.map(([, v]) => v) })
          : h("div", { class: "empty", text: "No leads yet." }),
      ]),
    ])
  );

  /* ---- Stage + win/loss ---- */
  const stages = ["Mint", "Architecture", "Build", "QA", "Launch", "Care"];
  const stageCounts = stages.map((s) => projects.filter((p) => p.stage === s).length);

  const winLossSvg = (() => {
    const w = 800, h_ = 240, padL = 80, padR = 40, barH = 30;
    const max = Math.max(won, lost, 1);
    const innerW = w - padL - padR;
    const svgNs = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNs, "svg");
    svg.setAttribute("viewBox", `0 0 ${w} ${h_}`);

    function rowEl(y, label, value, color) {
      const labelEl = document.createElementNS(svgNs, "text");
      labelEl.setAttribute("x", padL - 12);
      labelEl.setAttribute("y", y + barH / 2 + 4);
      labelEl.setAttribute("text-anchor", "end");
      labelEl.setAttribute("class", "axis");
      labelEl.setAttribute("style", "font-size: 13px; fill: var(--ink); font-family: var(--sans); font-weight: 500;");
      labelEl.textContent = label;
      svg.appendChild(labelEl);

      const bar = document.createElementNS(svgNs, "rect");
      bar.setAttribute("x", padL);
      bar.setAttribute("y", y);
      bar.setAttribute("width", (value / max) * innerW);
      bar.setAttribute("height", barH);
      bar.setAttribute("rx", 4);
      bar.setAttribute("fill", color);
      svg.appendChild(bar);

      const valEl = document.createElementNS(svgNs, "text");
      valEl.setAttribute("x", padL + (value / max) * innerW + 10);
      valEl.setAttribute("y", y + barH / 2 + 4);
      valEl.setAttribute("class", "axis");
      valEl.setAttribute("style", "font-size: 13px; fill: var(--ink); font-family: var(--mono);");
      valEl.textContent = String(value);
      svg.appendChild(valEl);
    }
    rowEl(60, "Won", won, "var(--mint-3)");
    rowEl(120, "Lost", lost, "rgba(10,14,12,0.20)");
    return svg;
  })();

  root.appendChild(
    h("div", { class: "two-col mt-4" }, [
      h("div", { class: "panel" }, [
        h("div", { class: "panel-head" }, [
          h("div", {}, [
            h("h3", { text: "Pipeline by stage" }),
            h("div", { class: "subt", text: "Project count per stage" }),
          ]),
        ]),
        barChart({ labels: stages, values: stageCounts }),
      ]),
      h("div", { class: "panel" }, [
        h("div", { class: "panel-head" }, [
          h("div", {}, [
            h("h3", { text: "Win / loss" }),
            h("div", { class: "subt", text: "Across all lead history" }),
          ]),
        ]),
        h("div", { class: "chart-wrap" }, winLossSvg),
      ]),
    ])
  );

  /* ---- Top clients + content by channel ---- */
  const topClients = clients.slice().sort((a, b) => (b.lifetimeValue || 0) - (a.lifetimeValue || 0)).slice(0, 5);

  function tierPill(tier) {
    const cls = tier === "Tier 1" ? "active" : tier === "Tier 2" ? "qualified" : "draft";
    return h("span", { class: "pill " + cls, text: tier || "—" });
  }

  const channelMap = new Map();
  for (const c of content) {
    const k = c.channel || "Unknown";
    if (!channelMap.has(k)) channelMap.set(k, { posts: 0, published: 0 });
    const row = channelMap.get(k);
    row.posts++;
    if (c.status === "published") row.published++;
  }
  const channelRows = [...channelMap.entries()]
    .map(([channel, r]) => ({ channel, ...r }))
    .sort((a, b) => b.posts - a.posts);

  root.appendChild(
    h("div", { class: "two-col mt-4" }, [
      h("div", { class: "panel" }, [
        h("div", { class: "panel-head" }, [
          h("div", {}, [
            h("h3", { text: "Top clients by LTV" }),
            h("div", { class: "subt", text: `${clients.length} on the books` }),
          ]),
        ]),
        table({
          columns: [
            { label: "Client", cell: (r) => h("span", { class: "strong", text: r.name }) },
            { label: "City", cell: (r) => h("span", { class: "muted", text: r.city || "—" }) },
            { label: "Tier", cell: (r) => tierPill(r.tier) },
            { label: "LTV", num: true, cell: (r) => inr(r.lifetimeValue) },
            {
              label: "Engagements",
              num: true,
              cell: (r) => projects.filter((p) => p.client === r.name).length,
            },
          ],
          rows: topClients,
          empty: { title: "No clients yet", body: "Add clients to see LTV rankings." },
        }),
      ]),
      h("div", { class: "panel" }, [
        h("div", { class: "panel-head" }, [
          h("div", {}, [
            h("h3", { text: "Content by channel" }),
            h("div", { class: "subt", text: `${content.length} posts across all states` }),
          ]),
        ]),
        table({
          columns: [
            { label: "Channel", cell: (r) => h("span", { class: "strong", text: r.channel }) },
            { label: "Posts", num: true, cell: (r) => r.posts },
            { label: "Published", num: true, cell: (r) => r.published },
          ],
          rows: channelRows,
          empty: { title: "No posts yet", body: "Start scheduling in the Content calendar." },
        }),
      ]),
    ])
  );

  return root;
}

function exportSnapshot(ctx, raw) {
  const snapshot = {
    capturedAt: new Date().toISOString(),
    counts: {
      leads: raw.leads.length,
      projects: raw.projects.length,
      invoices: raw.invoices.length,
      clients: raw.clients.length,
      content: raw.content.length,
    },
    leads: raw.leads,
    projects: raw.projects,
    invoices: raw.invoices,
    clients: raw.clients,
    content: raw.content,
  };
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `brand-mint-kpis-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  ctx.toast("Snapshot exported.");
}
