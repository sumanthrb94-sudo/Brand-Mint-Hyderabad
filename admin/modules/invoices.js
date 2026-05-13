/**
 * Invoices — GST-compliant invoicing with a printable preview.
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
  bindSubmit,
  renderTopbar,
  inr,
  inrFull,
  dateShort,
} from "/admin/components.js";

const state = {
  query: "",
  filter: "all",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function addDaysISO(iso, n) {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function displayStatus(inv) {
  if (inv.status === "paid") return "paid";
  if (inv.status !== "draft" && inv.dueDate && new Date(inv.dueDate) < new Date()) return "overdue";
  return inv.status || "draft";
}
function recalc(items, rate) {
  const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0);
  const gst = Math.round((subtotal * (Number(rate) || 0)) / 100);
  return { subtotal, gst, total: subtotal + gst };
}

export async function render(ctx) {
  const { db } = ctx;
  const root = h("div", {});

  function nextNumber() {
    const year = new Date().getFullYear();
    const existing = db
      .list("invoices")
      .filter((i) => (i.number || "").startsWith("BM-" + year))
      .length;
    return "BM-" + year + "-" + String(existing + 1).padStart(3, "0");
  }

  function redraw() {
    while (root.firstChild) root.removeChild(root.firstChild);
    const all = db.list("invoices");

    renderTopbar({
      breadcrumb: "WORKSPACE",
      title: "Invoices",
      actions: [
        h("button", {
          class: "btn btn-ghost",
          text: "Export CSV",
          onclick: () => exportCsv(all),
        }),
        h("button", {
          class: "btn btn-primary",
          text: "+ New invoice",
          onclick: () => openForm(null),
        }),
      ],
    });

    /* KPIs */
    const now = new Date();
    const ym = now.toISOString().slice(0, 7);
    const outstanding = all
      .filter((i) => i.status !== "paid")
      .filter((i) => (i.status === "sent" || displayStatus(i) === "overdue"))
      .reduce((s, i) => s + Number(i.total || 0), 0);
    const paidThisMonth = all
      .filter((i) => i.status === "paid" && (i.paidOn || "").slice(0, 7) === ym)
      .reduce((s, i) => s + Number(i.total || 0), 0);
    const overdueCount = all.filter((i) => i.status !== "paid" && i.dueDate && new Date(i.dueDate) < now).length;
    const draftCount = all.filter((i) => i.status === "draft").length;

    root.appendChild(
      h("div", { class: "kpi-grid" }, [
        kpi({ label: "Outstanding", value: inr(outstanding), delta: null }),
        kpi({ label: "Paid this month", value: inr(paidThisMonth), delta: null }),
        kpi({ label: "Overdue", value: String(overdueCount), delta: null }),
        kpi({ label: "Drafts", value: String(draftCount), delta: null }),
      ])
    );

    /* Toolbar */
    const tableWrap = h("div", { class: "table-wrap" });
    const search = h("input", {
      type: "search",
      placeholder: "Search invoice number or client…",
      value: state.query,
      oninput: (e) => {
        state.query = e.target.value;
        renderTable();
      },
    });
    const FILTERS = ["all", "draft", "sent", "paid", "overdue"];
    const chips = h(
      "div",
      { class: "table-filter" },
      FILTERS.map((s) =>
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
      if (state.filter !== "all") {
        rows = rows.filter((i) => displayStatus(i) === state.filter);
      }
      if (q) {
        rows = rows.filter((i) =>
          (i.number || "").toLowerCase().includes(q) ||
          (i.client || "").toLowerCase().includes(q)
        );
      }
      rows = rows.slice().sort((a, b) => (a.issueDate < b.issueDate ? 1 : -1));

      while (tableHost.firstChild) tableHost.removeChild(tableHost.firstChild);
      tableHost.appendChild(
        table({
          columns: [
            { label: "Number", cell: (r) => h("span", { class: "mono strong", text: r.number || "—" }) },
            { label: "Client", cell: (r) => r.client || "—" },
            { label: "Issued", cell: (r) => dateShort(r.issueDate) },
            {
              label: "Due",
              cell: (r) => {
                const overdue = displayStatus(r) === "overdue";
                return h("span", { style: overdue ? { color: "var(--danger)" } : {} }, dateShort(r.dueDate));
              },
            },
            { label: "Total", num: true, cell: (r) => inr(r.total) },
            { label: "Status", cell: (r) => pill(displayStatus(r)) },
            {
              label: "",
              cell: (r) =>
                h("div", { class: "hstack", style: { gap: "4px", justifyContent: "flex-end" } }, [
                  h("button", {
                    class: "btn btn-ghost btn-sm",
                    text: "View",
                    onclick: (e) => {
                      e.stopPropagation();
                      openPreview(r);
                    },
                  }),
                  r.status !== "paid"
                    ? h("button", {
                        class: "btn btn-ghost btn-sm",
                        text: "Mark paid",
                        onclick: (e) => {
                          e.stopPropagation();
                          markPaid(r);
                        },
                      })
                    : null,
                  h("button", {
                    class: "btn btn-danger btn-sm",
                    text: "Delete",
                    onclick: (e) => {
                      e.stopPropagation();
                      confirm({
                        title: "Delete invoice?",
                        message: `Invoice ${r.number} will be removed permanently.`,
                        danger: true,
                        onConfirm: () => {
                          db.remove("invoices", r.id);
                          ctx.toast("Invoice deleted.");
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
            title: state.query || state.filter !== "all" ? "No matching invoices" : "No invoices yet",
            body: "Create your first invoice to bill a client.",
          },
          onRow: (r) => openPreview(r),
        })
      );
    }

    renderTable();
  }

  function openForm(invoice) {
    const isNew = !invoice;
    const data = invoice
      ? JSON.parse(JSON.stringify(invoice))
      : {
          number: nextNumber(),
          client: "",
          issueDate: todayISO(),
          dueDate: addDaysISO(todayISO(), 30),
          gstRate: 18,
          lineItems: [{ desc: "", qty: 1, rate: 0 }],
          status: "draft",
          paidOn: "",
        };

    const form = h("form", { class: "vstack", style: { gap: "12px" } });

    form.appendChild(
      h("div", { class: "field-row" }, [
        field({ label: "Invoice number", name: "number", value: data.number, required: true }),
        field({ label: "Client", name: "client", value: data.client, required: true }),
      ])
    );
    form.appendChild(
      h("div", { class: "field-row" }, [
        h("label", { class: "field has-value" }, [
          h("input", { type: "date", name: "issueDate", value: data.issueDate }),
          h("span", { text: "Issue date" }),
        ]),
        h("label", { class: "field has-value" }, [
          h("input", { type: "date", name: "dueDate", value: data.dueDate }),
          h("span", { text: "Due date" }),
        ]),
      ])
    );

    /* Line items editor */
    const lineHost = h("div", { class: "vstack", style: { gap: "8px" } });
    const totalsHost = h("div", { class: "mono", style: { textAlign: "right", color: "var(--muted)", fontSize: "13px" } });

    function lineRow(item, idx) {
      return h(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 70px 100px 30px",
            gap: "8px",
            alignItems: "center",
          },
        },
        [
          h("input", {
            class: "field-inline",
            style: { padding: "8px 10px", border: "1px solid var(--line)", borderRadius: "6px", fontSize: "13px" },
            placeholder: "Description",
            value: item.desc,
            oninput: (e) => {
              data.lineItems[idx].desc = e.target.value;
            },
          }),
          h("input", {
            type: "number",
            min: "0",
            style: { padding: "8px 10px", border: "1px solid var(--line)", borderRadius: "6px", fontSize: "13px", fontFamily: "var(--mono)" },
            placeholder: "Qty",
            value: String(item.qty),
            oninput: (e) => {
              data.lineItems[idx].qty = Number(e.target.value) || 0;
              updateTotals();
            },
          }),
          h("input", {
            type: "number",
            min: "0",
            step: "0.01",
            style: { padding: "8px 10px", border: "1px solid var(--line)", borderRadius: "6px", fontSize: "13px", fontFamily: "var(--mono)" },
            placeholder: "Rate (₹)",
            value: String(item.rate),
            oninput: (e) => {
              data.lineItems[idx].rate = Number(e.target.value) || 0;
              updateTotals();
            },
          }),
          h("button", {
            class: "btn btn-danger btn-sm",
            type: "button",
            text: "×",
            onclick: () => {
              data.lineItems.splice(idx, 1);
              if (!data.lineItems.length) data.lineItems.push({ desc: "", qty: 1, rate: 0 });
              renderLines();
            },
          }),
        ]
      );
    }
    function renderLines() {
      while (lineHost.firstChild) lineHost.removeChild(lineHost.firstChild);
      data.lineItems.forEach((it, i) => lineHost.appendChild(lineRow(it, i)));
      updateTotals();
    }
    function updateTotals() {
      const { subtotal, gst, total } = recalc(data.lineItems, gstInput.value || data.gstRate);
      totalsHost.innerHTML = `Subtotal ${inrFull(subtotal)} · GST ${inrFull(gst)} · Total ${inrFull(total)}`;
    }

    form.appendChild(h("div", { class: "field-label", text: "Line items" }));
    form.appendChild(lineHost);
    form.appendChild(
      h("div", { class: "hstack", style: { justifyContent: "space-between", marginTop: "4px" } }, [
        h("button", {
          class: "btn btn-ghost btn-sm",
          type: "button",
          text: "+ Add line",
          onclick: () => {
            data.lineItems.push({ desc: "", qty: 1, rate: 0 });
            renderLines();
          },
        }),
        totalsHost,
      ])
    );

    const gstInput = h("input", {
      type: "number",
      name: "gstRate",
      min: "0",
      max: "100",
      step: "0.5",
      value: String(data.gstRate ?? 18),
      oninput: updateTotals,
    });

    form.appendChild(
      h("div", { class: "field-row" }, [
        h("label", { class: "field has-value" }, [gstInput, h("span", { text: "GST rate (%)" })]),
        field({
          label: "Status",
          name: "status",
          type: "select",
          value: data.status,
          options: [
            { value: "draft", label: "Draft" },
            { value: "sent", label: "Sent" },
            { value: "paid", label: "Paid" },
          ],
        }),
      ])
    );

    const paidOnLabel = h("label", { class: "field" + (data.paidOn ? " has-value" : "") }, [
      h("input", { type: "date", name: "paidOn", value: data.paidOn || "" }),
      h("span", { text: "Paid on" }),
    ]);
    if (data.status !== "paid") paidOnLabel.style.display = "none";
    form.appendChild(paidOnLabel);
    form.addEventListener("change", (e) => {
      if (e.target.name === "status") {
        paidOnLabel.style.display = e.target.value === "paid" ? "" : "none";
        if (e.target.value === "paid") {
          const input = paidOnLabel.querySelector("input");
          if (!input.value) input.value = todayISO();
        }
      }
    });

    renderLines();

    const footer = [];
    if (!isNew) {
      footer.push(
        h("button", {
          class: "btn btn-danger",
          type: "button",
          text: "Delete",
          onclick: () =>
            confirm({
              title: "Delete invoice?",
              message: `${invoice.number} will be removed permanently.`,
              danger: true,
              onConfirm: () => {
                db.remove("invoices", invoice.id);
                instance.close();
                ctx.toast("Invoice deleted.");
                ctx.refreshSidebar();
                redraw();
              },
            }),
        })
      );
    }
    footer.push(
      h("button", { class: "btn btn-ghost", type: "button", text: "Cancel", onclick: () => instance.close() }),
      h("button", { class: "btn btn-primary", type: "submit", text: isNew ? "Create" : "Save" })
    );

    const instance = modal({
      title: isNew ? "New invoice" : "Edit invoice",
      body: form,
      footer,
      wide: true,
    });

    bindSubmit(form, async () => {
      const v = formToObject(form);
      if (!v.number?.trim() || !v.client?.trim()) {
        ctx.toast("Number and client are required.");
        return;
      }
      const gstRate = Number(v.gstRate || 0);
      const { subtotal, gst, total } = recalc(data.lineItems, gstRate);
      const payload = {
        ...v,
        gstRate,
        lineItems: data.lineItems,
        subtotal,
        gst,
        total,
        paidOn: v.status === "paid" ? v.paidOn || todayISO() : null,
      };
      if (isNew) {
        await db.createAsync("invoices", payload);
        ctx.toast("Invoice created.");
      } else {
        await db.updateAsync("invoices", invoice.id, payload);
        ctx.toast("Saved.");
      }
      instance.close();
      ctx.refreshSidebar();
      redraw();
    });
  }

  function markPaid(inv) {
    db.update("invoices", inv.id, { status: "paid", paidOn: todayISO() });
    ctx.toast("Marked paid.");
    ctx.refreshSidebar();
    redraw();
  }

  function openPreview(inv) {
    const settings = db.settings.get() || {};
    const client = db.list("clients").find((c) => c.name === inv.client);

    const preview = h("div", { class: "invoice-preview" }, [
      h("div", { class: "hstack", style: { justifyContent: "space-between", alignItems: "flex-start" } }, [
        h("div", {}, [
          h("h1", { text: "INVOICE" }),
          h("div", { class: "num", text: inv.number || "—" }),
        ]),
        h("div", { class: "right" }, [
          h("div", { class: "muted", style: { fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase" }, text: "Issued" }),
          h("div", { class: "mono", text: dateShort(inv.issueDate) }),
          h("div", { class: "muted mt-4", style: { fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase" }, text: "Due" }),
          h("div", { class: "mono", text: dateShort(inv.dueDate) }),
        ]),
      ]),
      h("div", { class: "from-to" }, [
        h("div", {}, [
          h("div", { class: "muted", style: { fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "6px" }, text: "From" }),
          h("div", { class: "strong", text: settings.legalName || "Brand Mint" }),
          h("div", { class: "muted", text: settings.address || "HITEC City, Hyderabad" }),
          h("div", { class: "muted mono", style: { fontSize: "12px", marginTop: "6px" }, text: "GSTIN: " + (settings.gstin || "—") }),
          h("div", { class: "muted mono", style: { fontSize: "12px" }, text: "PAN: " + (settings.pan || "—") }),
          h("div", { class: "muted", style: { fontSize: "12px" }, text: settings.email || "" }),
        ]),
        h("div", {}, [
          h("div", { class: "muted", style: { fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "6px" }, text: "Bill to" }),
          h("div", { class: "strong", text: inv.client || "—" }),
          client && h("div", { class: "muted", text: client.city || "" }),
          client && h("div", { class: "muted", style: { fontSize: "12px" }, text: client.email || "" }),
        ]),
      ]),
      h("table", { class: "line-items" }, [
        h("thead", {}, [
          h("tr", {}, [
            h("th", { style: { textAlign: "left", borderBottom: "1px solid var(--ink)" }, text: "Description" }),
            h("th", { style: { textAlign: "right", borderBottom: "1px solid var(--ink)", width: "60px" }, text: "Qty" }),
            h("th", { style: { textAlign: "right", borderBottom: "1px solid var(--ink)", width: "120px" }, text: "Rate" }),
            h("th", { style: { textAlign: "right", borderBottom: "1px solid var(--ink)", width: "140px" }, text: "Amount" }),
          ]),
        ]),
        h(
          "tbody",
          {},
          (inv.lineItems || []).map((it) =>
            h("tr", {}, [
              h("td", { style: { padding: "10px 0", borderBottom: "1px solid var(--line)" }, text: it.desc }),
              h("td", { style: { padding: "10px 0", borderBottom: "1px solid var(--line)", textAlign: "right", fontFamily: "var(--mono)" }, text: String(it.qty) }),
              h("td", { style: { padding: "10px 0", borderBottom: "1px solid var(--line)", textAlign: "right", fontFamily: "var(--mono)" }, text: inrFull(it.rate) }),
              h("td", { style: { padding: "10px 0", borderBottom: "1px solid var(--line)", textAlign: "right", fontFamily: "var(--mono)" }, text: inrFull((Number(it.qty) || 0) * (Number(it.rate) || 0)) }),
            ])
          )
        ),
      ]),
      h("div", { class: "totals" }, [
        h("div", { class: "row" }, [h("span", { text: "Subtotal" }), h("span", { text: inrFull(inv.subtotal) })]),
        h("div", { class: "row" }, [h("span", { text: `GST (${inv.gstRate}%)` }), h("span", { text: inrFull(inv.gst) })]),
        h("div", { class: "row grand" }, [h("span", { text: "Total" }), h("span", { text: inrFull(inv.total) })]),
      ]),
      h("div", { class: "mt-6 muted", style: { fontSize: "12px", borderTop: "1px solid var(--line)", paddingTop: "16px" } }, [
        h("div", { class: "strong", style: { color: "var(--ink)", marginBottom: "4px" }, text: "Payable to " + (settings.legalName || "Brand Mint") }),
        h("div", { text: `Bank: ${settings.bank?.name || "—"} · A/C: ${settings.bank?.account || "—"} · IFSC: ${settings.bank?.ifsc || "—"}` }),
        h("div", { class: "mt-4", text: "GST extra. Please remit within 30 days of issue. Reply with the UTR after payment." }),
      ]),
    ]);

    const footer = [
      h("button", {
        class: "btn btn-ghost",
        type: "button",
        text: "Edit",
        onclick: () => {
          instance.close();
          openForm(inv);
        },
      }),
      inv.status !== "paid"
        ? h("button", {
            class: "btn btn-primary",
            type: "button",
            text: "Mark paid",
            onclick: () => {
              markPaid(inv);
              instance.close();
            },
          })
        : null,
      h("button", { class: "btn btn-ghost", type: "button", text: "Print", onclick: () => window.print() }),
    ].filter(Boolean);

    const instance = modal({
      title: inv.number + " · " + inv.client,
      body: preview,
      footer,
      wide: true,
    });
  }

  function exportCsv(rows) {
    const cols = ["Number", "Client", "Issued", "Due", "Subtotal", "GST", "Total", "Status"];
    const q = (v) => {
      const s = String(v == null ? "" : v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [cols.join(",")];
    for (const r of rows) {
      lines.push(
        [r.number, r.client, r.issueDate, r.dueDate, r.subtotal, r.gst, r.total, displayStatus(r)].map(q).join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brand-mint-invoices-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    ctx.toast("CSV exported.");
  }

  redraw();

  const params = new URLSearchParams(location.hash.split("?")[1] || "");
  if (params.get("new") === "1") openForm(null);
  else if (params.get("id")) {
    const i = db.get("invoices", params.get("id"));
    if (i) openPreview(i);
  }

  const unsub = db.onTable("invoices", () => {
    if (root.isConnected) redraw();
    else unsub();
  });

  return root;
}
