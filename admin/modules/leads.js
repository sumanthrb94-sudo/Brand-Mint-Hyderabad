/**
 * Leads — inbound CRM.
 *
 * Inbox of inquiries from the contact form (plus manually-added leads).
 * Statuses: new → qualified → won / lost.
 */

import {
  h,
  kpi,
  table,
  pill,
  modal,
  confirm,
  field,
  formToObject,
  renderTopbar,
  relTime,
} from "/admin/components.js";

const STATUSES = ["new", "qualified", "won", "lost"];
const BUDGETS = ["", "<1L", "1-3L", "3-8L", "8L+"];
const PROJECT_TYPES = ["Marketing site", "Custom internal tool", "Brand + Site", "Brand system", "Retainer", "AI integration"];

const state = {
  query: "",
  filter: "all",
};

export async function render(ctx) {
  const { db } = ctx;
  const root = h("div", {});

  function redraw() {
    while (root.firstChild) root.removeChild(root.firstChild);
    const all = db.list("leads");

    renderTopbar({
      breadcrumb: "WORKSPACE",
      title: "Leads",
      actions: [
        h("button", {
          class: "btn btn-primary",
          text: "+ New lead",
          onclick: () => openForm(null),
        }),
      ],
    });

    /* KPIs */
    const count = (s) => all.filter((l) => l.status === s).length;
    root.appendChild(
      h("div", { class: "kpi-grid" }, [
        kpi({ label: "New", value: String(count("new")), delta: null }),
        kpi({ label: "Qualified", value: String(count("qualified")), delta: null }),
        kpi({ label: "Won", value: String(count("won")), delta: null }),
        kpi({ label: "Lost", value: String(count("lost")), delta: null }),
      ])
    );

    /* Toolbar + table */
    const tableWrap = h("div", { class: "table-wrap" });

    const search = h("input", {
      type: "search",
      placeholder: "Search name, company, email, message…",
      value: state.query,
      oninput: (e) => {
        state.query = e.target.value;
        renderTable();
      },
    });
    const chips = h(
      "div",
      { class: "table-filter" },
      ["all", ...STATUSES].map((s) =>
        h("button", {
          class: "chip-btn" + (state.filter === s ? " active" : ""),
          text: s === "all" ? "All" : s[0].toUpperCase() + s.slice(1),
          onclick: () => {
            state.filter = s;
            redraw();
          },
        })
      )
    );
    tableWrap.appendChild(
      h("div", { class: "table-toolbar" }, [
        h("div", { class: "table-search" }, [
          h("svg", {
            viewBox: "0 0 16 16",
            html:
              '<circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
              '<path d="M11 11l3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
          }),
          search,
        ]),
        chips,
      ])
    );

    const tableHost = h("div");
    tableWrap.appendChild(tableHost);
    root.appendChild(tableWrap);

    function renderTable() {
      const q = state.query.trim().toLowerCase();
      let rows = all;
      if (state.filter !== "all") rows = rows.filter((l) => l.status === state.filter);
      if (q) {
        rows = rows.filter((l) =>
          [l.name, l.company, l.email, l.message]
            .map((v) => (v || "").toLowerCase())
            .some((v) => v.includes(q))
        );
      }
      rows = rows.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

      while (tableHost.firstChild) tableHost.removeChild(tableHost.firstChild);
      tableHost.appendChild(
        table({
          columns: [
            {
              label: "Lead",
              cell: (r) =>
                h("div", {}, [
                  h("div", { class: "strong", text: r.name || "—" }),
                  h("div", { class: "sub", text: r.company || "—" }),
                ]),
            },
            { label: "Type", cell: (r) => r.projectType || "—" },
            { label: "Budget", cell: (r) => h("span", { class: "mono", text: r.budget || "—" }) },
            {
              label: "Score",
              num: true,
              cell: (r) => {
                const score = Number(r.score || 0);
                return h("div", { style: { display: "inline-flex", alignItems: "center", gap: "8px", justifyContent: "flex-end", width: "100%" } }, [
                  h("span", { class: "mono", text: String(score) }),
                  h(
                    "div",
                    {
                      style: {
                        width: "60px",
                        height: "6px",
                        background: "var(--mint-1)",
                        borderRadius: "999px",
                        overflow: "hidden",
                      },
                    },
                    h("div", {
                      style: {
                        width: score + "%",
                        height: "100%",
                        background: "var(--mint-3)",
                      },
                    })
                  ),
                ]);
              },
            },
            { label: "Source", cell: (r) => h("span", { class: "muted", text: r.source || "—" }) },
            { label: "Status", cell: (r) => pill(r.status || "new") },
            {
              label: "Added",
              cell: (r) => h("span", { class: "muted", text: relTime(r.createdAt) }),
            },
            {
              label: "",
              cell: (r) =>
                h("div", { class: "hstack", style: { gap: "4px", justifyContent: "flex-end" } }, [
                  h("button", {
                    class: "btn btn-ghost btn-sm",
                    text: "Edit",
                    onclick: (e) => {
                      e.stopPropagation();
                      openForm(r);
                    },
                  }),
                  h("button", {
                    class: "btn btn-danger btn-sm",
                    text: "Delete",
                    onclick: (e) => {
                      e.stopPropagation();
                      confirm({
                        title: "Delete lead?",
                        message: `"${r.name}" will be removed. This can't be undone.`,
                        danger: true,
                        onConfirm: () => {
                          db.remove("leads", r.id);
                          ctx.toast("Lead deleted.");
                          ctx.refreshSidebar();
                          redraw();
                        },
                      });
                    },
                  }),
                ]),
            },
          ],
          rows,
          empty: {
            title: state.query || state.filter !== "all" ? "No matching leads" : "No leads yet",
            body: "Inbound from the contact form will land here.",
          },
          onRow: (r) => openForm(r),
        })
      );
    }

    renderTable();
  }

  function openForm(lead) {
    const isNew = !lead;
    const data = lead || {
      name: "",
      company: "",
      email: "",
      phone: "",
      projectType: "",
      budget: "",
      message: "",
      status: "new",
      score: 50,
      source: "Site contact form",
    };

    const form = h("form", { class: "vstack", style: { gap: "12px" } });

    form.appendChild(
      h("div", { class: "field-row" }, [
        field({ label: "Name", name: "name", value: data.name, required: true }),
        field({ label: "Company", name: "company", value: data.company }),
      ])
    );
    form.appendChild(
      h("div", { class: "field-row" }, [
        field({ label: "Email", name: "email", type: "email", value: data.email }),
        field({ label: "Phone", name: "phone", value: data.phone }),
      ])
    );
    form.appendChild(
      h("div", { class: "field-row" }, [
        field({
          label: "Project type",
          name: "projectType",
          type: "select",
          value: data.projectType,
          options: [{ value: "", label: "—" }, ...PROJECT_TYPES.map((t) => ({ value: t, label: t }))],
        }),
        field({
          label: "Budget",
          name: "budget",
          type: "select",
          value: data.budget,
          options: BUDGETS.map((b) => ({ value: b, label: b || "—" })),
        }),
      ])
    );
    form.appendChild(
      h("div", { class: "field-row" }, [
        field({
          label: "Status",
          name: "status",
          type: "select",
          value: data.status,
          options: STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) })),
        }),
        h("label", { class: "field has-value" }, [
          h("input", { type: "number", name: "score", min: "0", max: "100", value: String(data.score || 0) }),
          h("span", { text: "Score (0-100)" }),
        ]),
      ])
    );
    form.appendChild(field({ label: "Source", name: "source", value: data.source }));
    form.appendChild(field({ label: "Message / notes", name: "message", type: "textarea", value: data.message }));

    const footer = [];
    if (!isNew) {
      footer.push(
        h("button", {
          class: "btn btn-danger",
          type: "button",
          text: "Delete",
          onclick: () =>
            confirm({
              title: "Delete lead?",
              message: `"${lead.name}" will be removed. This can't be undone.`,
              danger: true,
              onConfirm: () => {
                db.remove("leads", lead.id);
                instance.close();
                ctx.toast("Lead deleted.");
                ctx.refreshSidebar();
                redraw();
              },
            }),
        })
      );
    }
    footer.push(
      h("button", {
        class: "btn btn-ghost",
        type: "button",
        text: "Cancel",
        onclick: () => instance.close(),
      }),
      h("button", { class: "btn btn-primary", type: "submit", text: isNew ? "Create" : "Save" })
    );

    const instance = modal({
      title: isNew ? "New lead" : "Edit lead",
      body: form,
      footer,
      wide: true,
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = formToObject(form);
      if (!v.name?.trim()) return ctx.toast("Name is required.");
      v.score = Number(v.score || 0);
      if (isNew) {
        db.create("leads", v);
        ctx.toast("Lead created.");
      } else {
        db.update("leads", lead.id, v);
        ctx.toast("Saved.");
      }
      instance.close();
      ctx.refreshSidebar();
      redraw();
    });
  }

  redraw();

  // URL intents
  const params = new URLSearchParams(location.hash.split("?")[1] || "");
  if (params.get("new") === "1") openForm(null);
  else if (params.get("id")) {
    const l = db.get("leads", params.get("id"));
    if (l) openForm(l);
  }

  return root;
}
