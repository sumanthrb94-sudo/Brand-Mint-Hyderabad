/**
 * Clients — roster of paying customers.
 *
 * Layout:
 *   1. Stat strip: total / Tier 1 / combined LTV / avg LTV
 *   2. Table with search + tier-filter chips
 *   3. New / edit modal (with engagement history when editing)
 */

import {
  h,
  kpi,
  table,
  modal,
  confirm,
  field,
  formToObject,
  renderTopbar,
  inr,
  inrFull,
  relTime,
} from "/admin/components.js";

const TIERS = ["Tier 1", "Tier 2", "Tier 3"];

export async function render(ctx) {
  const { db } = ctx;

  const state = {
    search: "",
    tier: "all",
  };

  renderTopbar({
    breadcrumb: "WORKSPACE",
    title: "Clients",
    actions: [
      h("button", {
        class: "btn btn-primary",
        text: "+ New client",
        onclick: () => openEditor(null),
      }),
    ],
  });

  const root = h("div", {});

  function getClients() {
    return db
      .list("clients")
      .slice()
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  function tierPill(tier) {
    const cls =
      tier === "Tier 1"
        ? "active"
        : tier === "Tier 2"
        ? "qualified"
        : "draft";
    return h("span", { class: "pill " + cls, text: tier || "Tier 3" });
  }

  function buildKpis(rows) {
    const total = rows.length;
    const t1 = rows.filter((r) => r.tier === "Tier 1").length;
    const ltv = rows.reduce((s, r) => s + (Number(r.lifetimeValue) || 0), 0);
    const avg = total ? Math.round(ltv / total) : 0;

    return h("div", { class: "kpi-grid" }, [
      kpi({ label: "Total clients", value: String(total) }),
      kpi({ label: "Tier 1 clients", value: String(t1) }),
      kpi({ label: "Combined LTV", value: inr(ltv) }),
      kpi({ label: "Avg LTV", value: inr(avg) }),
    ]);
  }

  function buildToolbar() {
    const searchInput = h("input", {
      type: "search",
      placeholder: "Search by name, contact, email or city…",
      value: state.search,
      oninput: (e) => {
        state.search = e.target.value;
        renderTable();
      },
    });

    const searchWrap = h("div", { class: "table-search" }, [
      h("span", {
        html:
          '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="7" cy="7" r="4.5"/><path d="M14 14l-3.5-3.5" stroke-linecap="round"/></svg>',
      }),
      searchInput,
    ]);

    const filters = ["all", ...TIERS];
    const chipRow = h(
      "div",
      { class: "table-filter" },
      filters.map((f) =>
        h("button", {
          class: "chip-btn" + (state.tier === f ? " active" : ""),
          text: f === "all" ? "All" : f,
          onclick: () => {
            state.tier = f;
            renderTable();
          },
        })
      )
    );

    return h("div", { class: "table-toolbar" }, [searchWrap, chipRow]);
  }

  function filterRows(rows) {
    const q = state.search.trim().toLowerCase();
    return rows.filter((r) => {
      if (state.tier !== "all" && r.tier !== state.tier) return false;
      if (!q) return true;
      const hay = [r.name, r.contact, r.email, r.city]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  let tableHost;

  function renderTable() {
    const rows = filterRows(getClients());
    const node = table({
      columns: [
        {
          label: "Client",
          cell: (r) =>
            h("div", {}, [
              h("div", { class: "strong", text: r.name }),
              h("div", { class: "sub", text: r.contact || "—" }),
            ]),
        },
        {
          label: "Contact",
          cell: (r) =>
            h("div", {}, [
              h("div", { text: r.email || "—" }),
              h("div", { class: "sub", text: r.phone || "—" }),
            ]),
        },
        { label: "City", cell: (r) => r.city || "—" },
        { label: "Tier", cell: (r) => tierPill(r.tier) },
        {
          label: "LTV",
          num: true,
          cell: (r) =>
            h("span", { class: "mono", text: inrFull(r.lifetimeValue || 0) }),
        },
        {
          label: "",
          cell: (r) =>
            h(
              "div",
              {
                class: "hstack",
                style: { justifyContent: "flex-end", gap: "6px" },
              },
              [
                h("button", {
                  class: "btn btn-ghost btn-sm",
                  text: "Edit",
                  onclick: (e) => {
                    e.stopPropagation();
                    openEditor(r);
                  },
                }),
                h("button", {
                  class: "btn btn-ghost btn-sm",
                  text: "Delete",
                  onclick: (e) => {
                    e.stopPropagation();
                    askDelete(r);
                  },
                }),
              ]
            ),
        },
      ],
      rows,
      empty: {
        title: "No clients match",
        body:
          state.search || state.tier !== "all"
            ? "Try clearing filters."
            : "Add your first client to start tracking lifetime value.",
      },
      onRow: (r) => openEditor(r),
    });

    if (tableHost) {
      tableHost.replaceChildren(node);
    }
  }

  function fullRender() {
    root.replaceChildren();
    const rows = getClients();
    root.appendChild(buildKpis(rows));

    const panel = h("div", { class: "panel mt-4", style: { padding: 0 } }, [
      buildToolbar(),
      h("div", { class: "table-wrap", style: { border: "0", borderRadius: 0 } }),
    ]);
    tableHost = panel.lastChild;
    root.appendChild(panel);
    renderTable();
  }

  function openEditor(client) {
    const isNew = !client;
    const data = client || {
      name: "",
      contact: "",
      email: "",
      phone: "",
      city: "",
      tier: "Tier 2",
      lifetimeValue: 0,
    };

    const form = h("form", { class: "vstack", style: { gap: "12px" } }, [
      field({
        label: "Client / company name",
        name: "name",
        value: data.name,
        required: true,
      }),
      h("div", { class: "two-col" }, [
        field({
          label: "Primary contact",
          name: "contact",
          value: data.contact || "",
        }),
        field({ label: "City", name: "city", value: data.city || "" }),
      ]),
      h("div", { class: "two-col" }, [
        field({
          label: "Email",
          name: "email",
          type: "email",
          value: data.email || "",
        }),
        field({ label: "Phone", name: "phone", value: data.phone || "" }),
      ]),
      h("div", { class: "two-col" }, [
        field({
          label: "Tier",
          name: "tier",
          type: "select",
          value: data.tier || "Tier 2",
          options: TIERS.map((t) => ({ value: t, label: t })),
        }),
        field({
          label: "Lifetime value (INR)",
          name: "lifetimeValue",
          type: "number",
          value: String(data.lifetimeValue || 0),
        }),
      ]),
    ]);

    const body = h("div", {}, [form]);

    if (!isNew) {
      const projects = db
        .list("projects")
        .filter((p) => p.client === data.name)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

      const history = h("div", { style: { marginTop: "20px" } }, [
        h("h4", {
          text: "Engagement history",
          style: {
            margin: "0 0 8px",
            fontSize: "12px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--faint)",
          },
        }),
        projects.length
          ? h(
              "div",
              { class: "vstack" },
              projects.map((p) =>
                h(
                  "div",
                  {
                    class: "hstack",
                    style: {
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      border: "1px solid var(--line)",
                      borderRadius: "8px",
                      background: "var(--surface-2)",
                    },
                  },
                  [
                    h("div", {}, [
                      h("div", { class: "strong", text: p.name }),
                      h("div", {
                        class: "sub muted",
                        text: relTime(p.createdAt),
                      }),
                    ]),
                    h("div", { class: "hstack" }, [
                      h("span", {
                        class:
                          "pill " +
                          String(p.stage || "")
                            .toLowerCase()
                            .replace(/\s+/g, "-"),
                        text: p.stage,
                      }),
                      h("span", { class: "mono", text: inr(p.value) }),
                    ]),
                  ]
                )
              )
            )
          : h("div", { class: "muted", text: "No engagements logged yet." }),
      ]);
      body.appendChild(history);
    }

    const { close } = modal({
      title: isNew ? "New client" : data.name,
      body,
      footer: [
        !isNew &&
          h("button", {
            class: "btn btn-ghost",
            text: "Delete",
            onclick: () => {
              close();
              askDelete(data);
            },
          }),
        h("button", {
          class: "btn btn-ghost",
          text: "Cancel",
          onclick: () => {
            close();
            clearUrlParams();
          },
        }),
        h("button", {
          class: "btn btn-primary",
          text: isNew ? "Create client" : "Save changes",
          onclick: () => {
            if (!form.reportValidity()) return;
            const obj = formToObject(form);
            const payload = {
              name: (obj.name || "").trim(),
              contact: (obj.contact || "").trim(),
              email: (obj.email || "").trim(),
              phone: (obj.phone || "").trim(),
              city: (obj.city || "").trim(),
              tier: obj.tier || "Tier 2",
              lifetimeValue: Number(obj.lifetimeValue) || 0,
            };
            if (isNew) {
              db.create("clients", payload);
              ctx.toast("Client added.");
            } else {
              db.update("clients", client.id, payload);
              ctx.toast("Client updated.");
            }
            close();
            clearUrlParams();
            fullRender();
          },
        }),
      ].filter(Boolean),
    });
  }

  function askDelete(client) {
    confirm({
      title: `Delete ${client.name}?`,
      message:
        "This removes the client from the roster. Past engagements with this client name will not be deleted.",
      danger: true,
      onConfirm: () => {
        db.remove("clients", client.id);
        ctx.toast("Client deleted.");
        clearUrlParams();
        fullRender();
      },
    });
  }

  function clearUrlParams() {
    const hash = window.location.hash;
    const qIdx = hash.indexOf("?");
    if (qIdx !== -1) {
      history.replaceState(null, "", hash.slice(0, qIdx));
    }
  }

  function handleUrlIntent() {
    const hash = window.location.hash;
    const qIdx = hash.indexOf("?");
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    if (params.get("new") === "1") {
      openEditor(null);
    } else if (params.get("id")) {
      const found = db.get("clients", params.get("id"));
      if (found) openEditor(found);
    }
  }

  fullRender();
  setTimeout(handleUrlIntent, 0);

  const unsub = db.onTable("clients", () => {
    if (root.isConnected) fullRender();
    else unsub();
  });
  const unsubProjects = db.onTable("projects", () => {
    if (root.isConnected) fullRender();
    else unsubProjects();
  });

  return root;
}
