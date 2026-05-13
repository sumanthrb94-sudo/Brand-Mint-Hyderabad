/**
 * Pipeline — drag-and-drop Kanban of active engagements.
 *
 * Stages flow left to right: Mint → Architecture → Build → QA → Launch → Care.
 */

import {
  h,
  kpi,
  modal,
  confirm,
  field,
  formToObject,
  bindSubmit,
  renderTopbar,
  inr,
  dateShort,
} from "/admin/components.js";

const STAGES = ["Mint", "Architecture", "Build", "QA", "Launch", "Care"];
const TYPES = ["Site", "Tool", "Brand", "Retainer"];

// HTML5 drag-and-drop: dataTransfer.getData can return empty mid-drag in
// some browsers (Safari). A module-level fallback keeps the dragged id.
let dragId = null;

export async function render(ctx) {
  const { db } = ctx;

  const root = h("div", {});

  function redraw() {
    while (root.firstChild) root.removeChild(root.firstChild);
    const projects = db.list("projects");

    renderTopbar({
      breadcrumb: "WORKSPACE",
      title: "Pipeline",
      actions: [
        h("button", {
          class: "btn btn-primary",
          text: "+ New project",
          onclick: () => openForm(null),
        }),
      ],
    });

    /* ---- KPIs ---- */
    const active = projects.filter((p) => p.stage !== "Care");
    const pipelineValue = active.reduce((s, p) => s + (Number(p.value) || 0), 0);

    const now = new Date();
    const ym = now.toISOString().slice(0, 7);
    const closingThisMonth = projects.filter(
      (p) => p.stage !== "Care" && (p.due || "").slice(0, 7) === ym
    ).length;
    const avgVal = active.length ? Math.round(pipelineValue / active.length) : 0;

    root.appendChild(
      h("div", { class: "kpi-grid" }, [
        kpi({ label: "Active engagements", value: String(active.length), delta: null }),
        kpi({ label: "Pipeline value", value: inr(pipelineValue), delta: null }),
        kpi({ label: "Closing this month", value: String(closingThisMonth), delta: null }),
        kpi({ label: "Avg engagement value", value: inr(avgVal), delta: null }),
      ])
    );

    /* ---- Board ---- */
    root.appendChild(buildBoard(projects));
  }

  function buildBoard(projects) {
    const board = h("div", { class: "kanban" });
    for (const stage of STAGES) {
      const inStage = projects
        .filter((p) => p.stage === stage)
        .sort((a, b) => (a.due || "") < (b.due || "") ? -1 : 1);
      const col = h(
        "div",
        {
          class: "kanban-col",
          dataset: { stage },
          ondragover: (e) => {
            e.preventDefault();
            col.classList.add("drag-over");
          },
          ondragleave: () => col.classList.remove("drag-over"),
          ondrop: (e) => {
            e.preventDefault();
            col.classList.remove("drag-over");
            const id = e.dataTransfer.getData("text/plain") || dragId;
            if (!id) return;
            const cur = db.get("projects", id);
            if (!cur || cur.stage === stage) return;
            db.update("projects", id, { stage });
            ctx.toast(`Moved to ${stage}.`);
            redraw();
          },
        },
        [
          h("div", { class: "kanban-col-head" }, [
            h("h4", { text: stage }),
            h("span", { class: "count", text: String(inStage.length) }),
          ]),
          ...inStage.map(buildCard),
        ]
      );
      board.appendChild(col);
    }
    return board;
  }

  function buildCard(p) {
    const card = h(
      "div",
      {
        class: "kanban-card",
        draggable: "true",
        onclick: () => openForm(p),
        ondragstart: (e) => {
          dragId = p.id;
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", p.id);
          card.classList.add("dragging");
        },
        ondragend: () => {
          dragId = null;
          card.classList.remove("dragging");
        },
      },
      [
        h("div", { class: "title", text: p.name }),
        h(
          "div",
          { class: "muted", style: { fontSize: "12px" } },
          (p.client || "—") + (p.type ? " · " + p.type : "")
        ),
        h("div", { class: "meta" }, [
          h("span", { class: "amount", text: inr(p.value) }),
          h("span", { text: p.due ? "due " + dateShort(p.due) : "—" }),
        ]),
      ]
    );
    return card;
  }

  /* ---- Form modal ---- */

  function openForm(project) {
    const isNew = !project;
    const data = project || {
      name: "",
      client: "",
      type: "Site",
      stage: "Mint",
      value: 0,
      kickoff: new Date().toISOString().slice(0, 10),
      due: "",
      owner: "Sumanth",
    };

    const form = h("form", { class: "vstack", style: { gap: "12px" } });
    form.appendChild(field({ label: "Project name", name: "name", value: data.name, required: true }));
    form.appendChild(field({ label: "Client", name: "client", value: data.client, required: true }));

    form.appendChild(
      h("div", { class: "field-row" }, [
        field({
          label: "Type",
          name: "type",
          type: "select",
          value: data.type,
          options: TYPES.map((t) => ({ value: t, label: t })),
        }),
        field({
          label: "Stage",
          name: "stage",
          type: "select",
          value: data.stage,
          options: STAGES.map((s) => ({ value: s, label: s })),
        }),
      ])
    );

    const valueLabel = h("label", { class: "field has-value" }, [
      h("input", {
        type: "number",
        name: "value",
        min: "0",
        step: "1000",
        value: String(data.value || 0),
      }),
      h("span", { text: "Value (₹)" }),
    ]);
    form.appendChild(valueLabel);

    form.appendChild(
      h("div", { class: "field-row" }, [
        h("label", { class: "field has-value" }, [
          h("input", { type: "date", name: "kickoff", value: data.kickoff || "" }),
          h("span", { text: "Kickoff" }),
        ]),
        h("label", { class: "field has-value" }, [
          h("input", { type: "date", name: "due", value: data.due || "" }),
          h("span", { text: "Due" }),
        ]),
      ])
    );

    form.appendChild(field({ label: "Owner", name: "owner", value: data.owner }));

    const footer = [];
    if (!isNew) {
      footer.push(
        h("button", {
          class: "btn btn-danger",
          type: "button",
          text: "Delete",
          onclick: () =>
            confirm({
              title: "Delete project?",
              message: `"${project.name}" will be removed. This can't be undone.`,
              danger: true,
              onConfirm: () => {
                db.remove("projects", project.id);
                instance.close();
                ctx.toast("Project deleted.");
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
      title: isNew ? "New project" : "Edit project",
      body: form,
      footer,
    });

    bindSubmit(form, async () => {
      const v = formToObject(form);
      if (!v.name?.trim()) {
        ctx.toast("Name is required.");
        return;
      }
      v.value = Number(v.value || 0);
      if (isNew) {
        await db.createAsync("projects", v);
        ctx.toast("Project created.");
      } else {
        await db.updateAsync("projects", project.id, v);
        ctx.toast("Saved.");
      }
      instance.close();
      redraw();
    });
  }

  /* ---- URL params ---- */

  const params = new URLSearchParams((location.hash.split("?")[1] || ""));
  redraw();

  const unsub = db.onTable("projects", () => {
    if (root.isConnected) redraw();
    else unsub();
  });

  if (params.get("new") === "1") openForm(null);
  else if (params.get("id")) {
    const p = db.get("projects", params.get("id"));
    if (p) openForm(p);
  }

  return root;
}
