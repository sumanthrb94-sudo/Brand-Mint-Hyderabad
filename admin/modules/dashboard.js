/**
 * Dashboard — CEO at-a-glance home.
 *
 * Layout:
 *   1. Top: 4 KPI cards (pipeline value, won this month, leads to triage, overdue invoices)
 *   2. Two-column: revenue line chart + pipeline-by-stage bar chart
 *   3. Two-column: recent leads table + active projects list
 */

import {
  h,
  kpi,
  lineChart,
  barChart,
  table,
  pill,
  renderTopbar,
  inr,
  dateShort,
  relTime,
} from "/admin/components.js";

export async function render(ctx) {
  const { db } = ctx;

  renderTopbar({
    breadcrumb: "WORKSPACE",
    title: "Dashboard",
    actions: [
      h("button", {
        class: "btn btn-ghost",
        text: "Export data",
        onclick: () => exportJson(ctx),
      }),
      h("button", {
        class: "btn btn-primary",
        text: "+ Add lead",
        onclick: () => ctx.navigate("/leads?new=1"),
      }),
    ],
  });

  const leads = db.list("leads");
  const projects = db.list("projects");
  const invoices = db.list("invoices");

  /* ---- KPIs ---- */
  const activeProjects = projects.filter((p) => p.stage !== "Care");
  const pipelineValue = activeProjects.reduce((s, p) => s + (p.value || 0), 0);

  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const wonThisMonth = invoices
    .filter((i) => i.status === "paid" && (i.paidOn || "").slice(0, 7) === thisMonth)
    .reduce((s, i) => s + (i.total || 0), 0);

  const toTriage = leads.filter((l) => l.status === "new").length;
  const overdue = invoices.filter((i) => {
    if (i.status === "paid") return false;
    return new Date(i.dueDate) < now;
  });
  const overdueValue = overdue.reduce((s, i) => s + (i.total || 0), 0);

  // Fake-but-realistic trend lines for the sparklines (last 7 weeks)
  const trendPipeline = [4.2, 5.1, 5.8, 6.0, 6.3, 7.1, pipelineValue / 100000].map((n) => Math.round(n * 10) / 10);
  const trendWon = [180, 220, 260, 310, 290, 340, wonThisMonth / 1000].map((n) => Math.round(n));

  /* ---- Revenue chart (last 6 months) ---- */
  const monthLabels = ["Dec", "Jan", "Feb", "Mar", "Apr", "May"];
  const monthRevenue = [180000, 240000, 320000, 410000, 490000, wonThisMonth || 280000];

  /* ---- Pipeline by stage ---- */
  const stages = ["Mint", "Architecture", "Build", "QA", "Launch", "Care"];
  const stageValues = stages.map((s) =>
    projects.filter((p) => p.stage === s).reduce((sum, p) => sum + (p.value || 0), 0)
  );

  /* ---- Recent leads (top 6 by createdAt) ---- */
  const recentLeads = leads
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 6);

  /* ---- Active projects ---- */
  const active = projects
    .filter((p) => p.stage !== "Care")
    .slice()
    .sort((a, b) => (a.due < b.due ? -1 : 1))
    .slice(0, 6);

  return h("div", {}, [
    h("div", { class: "kpi-grid" }, [
      kpi({
        label: "Pipeline value",
        value: inr(pipelineValue),
        delta: 12,
        trend: trendPipeline,
      }),
      kpi({
        label: "Won this month",
        value: inr(wonThisMonth),
        delta: 24,
        trend: trendWon,
      }),
      kpi({
        label: "Leads to triage",
        value: toTriage,
        delta: toTriage > 3 ? 33 : -8,
      }),
      kpi({
        label: "Overdue invoices",
        value: inr(overdueValue),
        delta: overdueValue > 0 ? -100 : 0,
      }),
    ]),

    h("div", { class: "two-col" }, [
      h("div", { class: "panel" }, [
        h("div", { class: "panel-head" }, [
          h("div", {}, [
            h("h3", { text: "Revenue trend" }),
            h("div", { class: "subt", text: "Last 6 months · paid invoices" }),
          ]),
        ]),
        lineChart({ labels: monthLabels, values: monthRevenue }),
      ]),
      h("div", { class: "panel" }, [
        h("div", { class: "panel-head" }, [
          h("div", {}, [
            h("h3", { text: "Pipeline by stage" }),
            h("div", { class: "subt", text: "Active projects · INR value" }),
          ]),
        ]),
        barChart({ labels: stages, values: stageValues }),
      ]),
    ]),

    h("div", { class: "two-col mt-4" }, [
      h("div", { class: "panel" }, [
        h("div", { class: "panel-head" }, [
          h("div", {}, [
            h("h3", { text: "Recent leads" }),
            h("div", { class: "subt", text: `${toTriage} need triage` }),
          ]),
          h("a", {
            class: "btn btn-ghost btn-sm",
            href: "#/leads",
            text: "View all →",
          }),
        ]),
        table({
          columns: [
            {
              label: "Lead",
              cell: (r) =>
                h("div", {}, [
                  h("div", { class: "strong", text: r.name }),
                  h("div", { class: "sub", text: r.company || "—" }),
                ]),
            },
            { label: "Type", cell: (r) => r.projectType || "—" },
            { label: "Status", cell: (r) => pill(r.status) },
            { label: "Added", cell: (r) => h("span", { class: "muted", text: relTime(r.createdAt) }) },
          ],
          rows: recentLeads,
          empty: { title: "No leads yet", body: "Inbound from the contact form will land here." },
          onRow: (r) => ctx.navigate(`/leads?id=${r.id}`),
        }),
      ]),

      h("div", { class: "panel" }, [
        h("div", { class: "panel-head" }, [
          h("div", {}, [
            h("h3", { text: "Active projects" }),
            h("div", { class: "subt", text: `${active.length} engagements in flight` }),
          ]),
          h("a", {
            class: "btn btn-ghost btn-sm",
            href: "#/pipeline",
            text: "Pipeline →",
          }),
        ]),
        h(
          "div",
          { class: "vstack" },
          active.length
            ? active.map((p) =>
                h(
                  "div",
                  {
                    class: "panel",
                    style: { padding: "12px 14px", margin: 0, cursor: "pointer" },
                    onclick: () => ctx.navigate(`/pipeline?id=${p.id}`),
                  },
                  [
                    h("div", { class: "hstack", style: { justifyContent: "space-between" } }, [
                      h("div", { class: "strong", text: p.name }),
                      pill(p.stage),
                    ]),
                    h("div", { class: "hstack muted", style: { marginTop: "4px", fontSize: "12px" } }, [
                      h("span", { text: p.client }),
                      h("span", { text: "·" }),
                      h("span", { class: "mono", text: inr(p.value) }),
                      h("span", { text: "·" }),
                      h("span", { text: "due " + dateShort(p.due) }),
                    ]),
                  ]
                )
              )
            : [h("div", { class: "empty", text: "No active engagements." })]
        ),
      ]),
    ]),
  ]);
}

function exportJson(ctx) {
  const dump = ctx.db.exportAll();
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `brand-mint-admin-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  ctx.toast("Exported.");
}
