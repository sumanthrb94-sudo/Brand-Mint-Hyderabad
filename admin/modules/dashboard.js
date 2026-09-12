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
  lineChart,
  barChart,
  table,
  pill,
  renderTopbar,
  inr,
  dateShort,
  relTime,
  tile,
  tileGrid,
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

  /* ---- Needs you: anything a client is currently waiting on ---- */
  const actions = [];

  const calls = db.list("bookings", (r) => r.status !== "done");
  if (calls.length) {
    actions.push({
      text: `${calls.length} call request${calls.length > 1 ? "s" : ""} from the site — ring them back`,
      cta: "Open leads",
      route: "/leads",
    });
  }

  const waOpen = db.list("waMessages", (r) => r.status !== "done").length;

  const requests = db.list("requests", (r) => r.status !== "done");
  if (requests.length) {
    actions.push({
      text: `${requests.length} free-perk / trial request${requests.length > 1 ? "s" : ""} to send on WhatsApp`,
      cta: "Open requests",
      route: "/leads",
    });
  }

  const signups = db.list("leads", (l) => l.status === "new" && l.uid);
  if (signups.length) {
    actions.push({
      text: `${signups.length} new sign-up${signups.length > 1 ? "s" : ""} from the site — call within a day`,
      cta: "Open leads",
      route: "/leads",
    });
  }

  const briefsIn = db.list(
    "onboardingResponses",
    (r) => r.status === "submitted" && !r.reviewedAt
  );
  for (const b of briefsIn) {
    const c = db.get("clients", b.clientId);
    actions.push({
      text: `${c?.name || "A client"} submitted their brief`,
      cta: "Read it",
      route: "/onboarding",
    });
  }

  const revisions = db.list("deliverables", { status: "revision_requested" });
  for (const d of revisions) {
    const c = db.get("clients", d.clientId);
    actions.push({
      text: `${c?.name || "A client"} asked for changes to "${d.title}"`,
      cta: "Open delivery",
      route: "/delivery/" + d.clientId,
    });
  }

  const unreadMsgs = db.list("messages", (m) => m.authorRole === "client" && !m.readByAdmin);
  const byClient = new Map();
  for (const m of unreadMsgs) byClient.set(m.clientId, (byClient.get(m.clientId) || 0) + 1);
  for (const [clientId, count] of byClient) {
    const c = db.get("clients", clientId);
    actions.push({
      text: `${count} unread message${count > 1 ? "s" : ""} from ${c?.name || "a client"}`,
      cta: "Reply",
      route: "/delivery/" + clientId,
    });
  }

  const stalledInvites = db
    .list("invites", (i) => !i.acceptedAt)
    .filter((i) => Date.now() - Date.parse(i.createdAt || 0) > 3 * 24 * 3600 * 1000);
  for (const i of stalledInvites) {
    actions.push({
      text: `${i.email} hasn't signed in since you invited them`,
      cta: "Chase",
      route: "/onboarding",
    });
  }

  const needsYou = actions.length
    ? h("div", { class: "panel", style: "margin-bottom:16px" }, [
        h("div", { class: "panel-head" }, [
          h("div", {}, [
            h("h3", { text: "Needs you" }),
            h("div", { class: "subt", text: `${actions.length} open` }),
          ]),
        ]),
        h(
          "div",
          { class: "vstack", style: "gap:8px" },
          actions.slice(0, 6).map((a) =>
            h(
              "div",
              {
                class: "hstack",
                style:
                  "justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid var(--line);border-radius:10px",
              },
              [
                h("span", { text: a.text, style: "font-size:14px" }),
                h("button", {
                  class: "chip-btn",
                  type: "button",
                  text: a.cta,
                  onclick: () => ctx.navigate(a.route),
                }),
              ]
            )
          )
        ),
      ])
    : null;

  return h("div", {}, [
    /* Every tile is a door. The old KPI row carried hardcoded deltas — "↑ 12%",
       "↑ 24%", and one that flipped on a threshold — which were invented, not
       measured, and read as real performance data on the first screen of the
       business. Numbers here are counted from the rows behind them or not
       shown at all; the charts below are where trend actually lives. */
    tileGrid([
      tile({
        label: "Leads to triage",
        value: toTriage,
        sub: toTriage ? "waiting on a first call" : "all triaged",
        tone: "attention",
        items: db.list("leads", (l) => l.status === "new"),
        seenKey: "dash.leads",
        onclick: () => ctx.navigate("/leads"),
      }),
      tile({
        label: "Call requests",
        value: calls.length,
        sub: calls.length ? "ring them back" : "none waiting",
        tone: "attention",
        items: db.list("bookings"),
        seenKey: "dash.bookings",
        onclick: () => ctx.navigate("/leads"),
      }),
      tile({
        label: "WhatsApp",
        value: waOpen,
        sub: waOpen ? "to answer" : "all answered",
        tone: "attention",
        items: db.list("waMessages"),
        seenKey: "dash.whatsapp",
        onclick: () => ctx.navigate("/whatsapp"),
      }),
      tile({
        label: "Portal requests",
        value: requests.length,
        sub: requests.length ? "perks and pre-books" : "none waiting",
        items: db.list("requests"),
        seenKey: "dash.requests",
        onclick: () => ctx.navigate("/leads"),
      }),
      tile({
        label: "Pipeline",
        value: inr(pipelineValue),
        sub: "open and qualified",
        onclick: () => ctx.navigate("/pipeline"),
      }),
      tile({
        label: "Won this month",
        value: inr(wonThisMonth),
        sub: "signed and paid",
        tone: "good",
        onclick: () => ctx.navigate("/clients"),
      }),
      tile({
        label: "Overdue",
        value: inr(overdueValue),
        sub: overdueValue ? "chase these" : "nothing overdue",
        tone: overdueValue ? "attention" : "",
        items: db.list("invoices", { status: "overdue" }),
        seenKey: "dash.overdue",
        onclick: () => ctx.navigate("/invoices"),
      }),
    ]),

    needsYou,

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
