/**
 * Delivery — everything a live client sees, edited from one screen.
 *
 * Three panels for the selected client:
 *   Timeline     — milestones; this is the progress bar in their portal
 *   Deliverables — what you send them, and their approve / revise verdict
 *   Thread       — the conversation, so feedback stops living in WhatsApp
 *
 * A deliverable stays invisible to the client while its status is 'draft'
 * (enforced by firestore.rules, not just by this UI). "Send to client" flips it to
 * awaiting_review, which is the moment it appears in their portal.
 *
 * Route: #/delivery  or  #/delivery/<clientId>
 */

import {
  h,
  modal,
  confirm,
  field,
  formToObject,
  bindSubmit,
  renderTopbar,
  toast,
  pill,
  relTime,
  dateShort,
  inr,
} from "/admin/components.js";
import { TIER_BY_ID, inr as inrTier } from "/shared/tiers.js";

const MILESTONE_STATUS = ["upcoming", "in_progress", "blocked", "done"];

export async function render(ctx) {
  const { db } = ctx;
  const root = h("div", {});

  /* --------------------------------------------------- client selection */

  function liveClients() {
    // Anyone with a project, a milestone, or a completed onboarding.
    const ids = new Set([
      ...db.list("milestones").map((m) => m.clientId),
      ...db.list("deliverables").map((d) => d.clientId),
      ...db.list("projects").map((p) => p.clientId),
    ]);
    return db
      .list("clients")
      .filter((c) => ids.has(c.id) || c.onboardingStatus === "complete")
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  function routeClientId() {
    const parts = window.location.hash.replace(/^#\/?/, "").split("/");
    return parts[1] || null;
  }

  const clients = liveClients();
  const state = {
    clientId: routeClientId() || clients[0]?.id || null,
  };

  /* ------------------------------------------------------------- data */

  const client = () => db.get("clients", state.clientId);
  const milestones = () =>
    db
      .list("milestones", (m) => m.clientId === state.clientId)
      .slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const deliverables = () =>
    db
      .list("deliverables", (d) => d.clientId === state.clientId)
      .slice()
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  const thread = () =>
    db
      .list("messages", (m) => m.clientId === state.clientId)
      .slice()
      .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  const clientProjects = () => db.list("projects", (p) => p.clientId === state.clientId);

  /* --------------------------------------------------------- topbar */

  function paintTopbar() {
    const c = client();
    renderTopbar({
      breadcrumb: "WORKSPACE",
      title: c ? `Delivery — ${c.name}` : "Delivery",
      actions: c
        ? [
            h("button", {
              class: "btn btn-ghost",
              text: "+ Milestone",
              onclick: () => openMilestone(null),
            }),
            h("button", {
              class: "btn btn-primary",
              text: "+ Deliverable",
              onclick: () => openDeliverable(null),
            }),
          ]
        : [],
    });
  }

  /* ------------------------------------------------------ client picker */

  function buildPicker() {
    const list = liveClients();
    if (!list.length) return null;
    const sel = h(
      "select",
      {
        onchange: (e) => {
          state.clientId = e.target.value;
          window.location.hash = "#/delivery/" + e.target.value;
          paint();
        },
      },
      list.map((c) => {
        const o = h("option", { value: c.id, text: c.name });
        if (c.id === state.clientId) o.selected = true;
        return o;
      })
    );
    return h("div", { class: "table-toolbar", style: "margin-bottom:16px;border-radius:12px;border:1px solid var(--line)" }, [
      h("span", { class: "muted", text: "Client", style: "font-size:12.5px" }),
      sel,
      h("span", { class: "spacer" }),
      h("a", {
        class: "chip-btn",
        href: "#/onboarding",
        text: "Onboarding funnel →",
      }),
    ]);
  }

  /* ----------------------------------------------------------- panels */

  function buildTimeline() {
    const rows = milestones();
    const body = rows.length
      ? h(
          "ul",
          { class: "timeline" },
          rows.map((m) =>
            h("li", { class: m.status }, [
              h("div", { class: "tl-title", text: m.title }),
              m.detail ? h("div", { class: "tl-meta", text: m.detail }) : null,
              h("div", { class: "tl-meta" }, [
                pill(m.status),
                h("span", {
                  text: m.dueDate ? ` · due ${dateShort(m.dueDate)}` : " · no date",
                }),
              ]),
              h("div", { class: "hstack", style: "margin-top:8px" }, [
                h("button", {
                  class: "chip-btn",
                  type: "button",
                  text: "Advance",
                  title: "Move to the next status",
                  onclick: () => advance(m),
                }),
                h("button", {
                  class: "chip-btn",
                  type: "button",
                  text: "Edit",
                  onclick: () => openMilestone(m),
                }),
                h("button", {
                  class: "chip-btn",
                  type: "button",
                  text: "Delete",
                  onclick: () =>
                    confirm({
                      title: "Delete milestone",
                      message: `"${m.title}" disappears from the client's portal immediately.`,
                      danger: true,
                      onConfirm: () => {
                        db.remove("milestones", m.id);
                        paint();
                      },
                    }),
                }),
              ]),
            ].filter(Boolean))
          )
        )
      : emptyPanel(
          "No timeline yet",
          "Add milestones and the client sees exactly where the project stands."
        );

    return panel("Timeline", "What the client watches", body);
  }

  function advance(m) {
    const i = MILESTONE_STATUS.indexOf(m.status);
    const next = MILESTONE_STATUS[Math.min(i + 1, MILESTONE_STATUS.length - 1)];
    if (next === m.status) return;
    db.update("milestones", m.id, { status: next });
    paint();
  }

  function buildDeliverables() {
    const rows = deliverables();
    const body = rows.length
      ? h(
          "div",
          { class: "vstack", style: "gap:12px" },
          rows.map((d) =>
            h("div", { class: "brief-item" }, [
              h("div", { class: "hstack", style: "justify-content:space-between;gap:10px" }, [
                h("div", {}, [
                  h("div", { text: d.title, style: "font-weight:600;font-size:14.5px" }),
                  d.description
                    ? h("div", { class: "muted", text: d.description, style: "font-size:13px;margin-top:3px" })
                    : null,
                ].filter(Boolean)),
                pill(d.status),
              ]),
              d.status === "revision_requested" && d.revisionNote
                ? h("div", {
                    class: "brief-item",
                    style: "margin-top:10px;border-color:var(--danger)",
                  }, [
                    h("dt", { text: "Revision requested" }),
                    h("dd", { text: d.revisionNote }),
                  ])
                : null,
              h("div", { class: "hstack flex-wrap", style: "margin-top:10px;gap:6px" }, [
                d.url
                  ? h("a", { class: "chip-btn", href: d.url, target: "_blank", rel: "noopener", text: "Open file" })
                  : null,
                d.status === "draft"
                  ? h("button", {
                      class: "chip-btn",
                      type: "button",
                      text: "Send to client",
                      onclick: () => {
                        db.update("deliverables", d.id, { status: "awaiting_review" });
                        notifyClient(d, `New for review: ${d.title}`);
                        toast("Sent — it's now visible in their portal.");
                        paint();
                      },
                    })
                  : null,
                d.status === "revision_requested"
                  ? h("button", {
                      class: "chip-btn",
                      type: "button",
                      text: "Send new version",
                      onclick: () => {
                        db.update("deliverables", d.id, {
                          status: "awaiting_review",
                          version: (d.version || 1) + 1,
                          revisionNote: null,
                        });
                        notifyClient(d, `Version ${(d.version || 1) + 1} of ${d.title} is up for review.`);
                        paint();
                      },
                    })
                  : null,
                h("button", { class: "chip-btn", type: "button", text: "Edit", onclick: () => openDeliverable(d) }),
                h("button", {
                  class: "chip-btn",
                  type: "button",
                  text: "Delete",
                  onclick: () =>
                    confirm({
                      title: "Delete deliverable",
                      message: `"${d.title}" and its approval history are removed.`,
                      danger: true,
                      onConfirm: () => {
                        db.remove("deliverables", d.id);
                        paint();
                      },
                    }),
                }),
                h("span", { class: "spacer" }),
                h("span", {
                  class: "muted",
                  style: "font-size:12px",
                  text:
                    d.reviewedAt
                      ? `v${d.version || 1} · reviewed ${relTime(d.reviewedAt)}`
                      : `v${d.version || 1} · ${relTime(d.createdAt)}`,
                }),
              ].filter(Boolean)),
            ].filter(Boolean))
          )
        )
      : emptyPanel(
          "Nothing sent yet",
          "Add a deliverable, then hit Send to client when it's ready for their eyes."
        );

    const waiting = rows.filter((d) => d.status === "awaiting_review").length;
    const revising = rows.filter((d) => d.status === "revision_requested").length;
    const sub = revising
      ? `${revising} needs your rework`
      : waiting
      ? `${waiting} waiting on the client`
      : "All clear";

    return panel("Deliverables", sub, body);
  }

  function notifyClient(deliverable, text) {
    db.create("messages", {
      clientId: state.clientId,
      projectId: deliverable.projectId || null,
      authorName: ctx.profile?.fullName || "Brand Mint",
      authorRole: "admin",
      body: text,
    });
  }

  function buildThread() {
    const rows = thread();
    const list = h(
      "div",
      { class: "thread" },
      rows.length
        ? rows.map((m) =>
            h("div", { class: "msg from-" + (m.authorRole === "admin" ? "admin" : "client") }, [
              h("span", { class: "who", text: m.authorName || (m.authorRole === "admin" ? "Brand Mint" : "Client") }),
              h("span", { text: m.body }),
              h("span", {
                class: "who",
                style: "margin:6px 0 0;opacity:.55",
                text: relTime(m.createdAt),
              }),
            ])
          )
        : [emptyPanel("No messages yet", "Anything you post here appears in the client's portal.")]
    );

    const form = h("form", { class: "hstack", style: "margin-top:12px;gap:8px;align-items:flex-end" }, [
      h("textarea", {
        name: "body",
        placeholder: "Write to the client…",
        required: "required",
        rows: "2",
        style:
          "flex:1;padding:10px 12px;border:1px solid var(--line);border-radius:10px;font:14px var(--sans);resize:vertical",
      }),
      h("button", { class: "btn btn-primary", type: "submit", text: "Send" }),
    ]);

    bindSubmit(form, async () => {
      const body = (formToObject(form).body || "").trim();
      if (!body) return;
      await db.createAsync("messages", {
        clientId: state.clientId,
        authorName: ctx.profile?.fullName || "Brand Mint",
        authorRole: "admin",
        body,
      });
      form.reset();
      paint();
    });

    const unread = rows.filter((m) => m.authorRole === "client" && !m.readByAdmin).length;
    return panel("Thread", unread ? `${unread} unread from them` : "Shared with the client", h("div", {}, [list, form]));
  }

  /**
   * The two gates between "converted" and "live": agreement signed, 50%
   * deposit received. Both are your calls, recorded here; the client sees
   * them tick off in their portal. When both are set the client goes active
   * and their overview switches to the live timeline.
   */
  function buildOnboarding() {
    const c = client();
    if (!c || (c.status || "active") === "active") return null;
    const tier = c.storeTier ? TIER_BY_ID[c.storeTier] : null;
    const signed = !!c.agreementSignedAt;
    const paid = !!c.depositPaidAt;

    const gate = (label, done, when, onDone) =>
      h("div", { class: "hstack", style: "justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid var(--line);border-radius:10px" }, [
        h("div", {}, [
          h("div", { text: label, style: "font-weight:600" }),
          h("div", { class: "muted", style: "font-size:12.5px", text: done ? `Done · ${dateShort(when)}` : "Not yet" }),
        ]),
        done
          ? pill("done")
          : h("button", { class: "chip-btn", type: "button", text: "Mark done", onclick: onDone }),
      ]);

    return panel(
      "Onboarding",
      tier ? `${tier.name} · ${inrTier(tier.price)} + GST` : "Waiting on agreement and deposit",
      h("div", { class: "vstack", style: "gap:8px" }, [
        gate("Agreement signed", signed, c.agreementSignedAt, () => {
          db.update("clients", c.id, { agreementSignedAt: new Date().toISOString() });
          notifyClient({ projectId: null }, "Agreement received — thank you. The deposit invoice is on its way.");
          paint();
        }),
        gate("50% deposit received", paid, c.depositPaidAt, () => {
          confirm({
            title: "Mark the deposit as received?",
            message: "This switches the client to active. Their portal turns from the onboarding checklist into the live timeline.",
            onConfirm: () => {
              db.update("clients", c.id, {
                depositPaidAt: new Date().toISOString(),
                status: "active",
                onboardingStatus: "complete",
              });
              notifyClient({ projectId: null }, "Deposit received. We're underway — your timeline is live.");
              toast(`${c.name} is active.`);
              paint();
            },
          });
        }),
        h("p", { class: "muted", style: "font-size:12.5px;margin:6px 2px 0" }, [
          h("span", { text: "Send the agreement as a deliverable of kind “Document to sign”, and raise the deposit invoice under Invoices. Both show up in their portal immediately." }),
        ]),
      ])
    );
  }

  function buildSummary() {
    const c = client();
    const ms = milestones();
    const done = ms.filter((m) => m.status === "done").length;
    const invoices = db.list("invoices", (i) => i.clientId === state.clientId);
    const outstanding = invoices
      .filter((i) => i.status !== "paid")
      .reduce((s, i) => s + (Number(i.total) || 0), 0);

    return h("div", { class: "brief-grid", style: "margin-bottom:16px" }, [
      summaryItem("Progress", ms.length ? `${done} / ${ms.length} milestones` : "No milestones"),
      summaryItem("Projects", String(clientProjects().length)),
      summaryItem("Outstanding", outstanding ? inr(outstanding) : "Nothing due"),
      summaryItem("Portal access", db.list("clientUsers", (u) => u.clientId === state.clientId).length
        ? "Signed in"
        : "Not signed in yet"),
    ]);
  }

  function summaryItem(label, value) {
    return h("div", { class: "brief-item" }, [
      h("dt", { text: label }),
      h("dd", { text: value }),
    ]);
  }

  /* ---------------------------------------------------------- editors */

  function openMilestone(existing) {
    const projects = clientProjects();
    const form = h("form", {}, [
      field({ label: "Title", name: "title", value: existing?.title || "", required: true }),
      field({ label: "What happens in this stage", name: "detail", type: "textarea", value: existing?.detail || "" }),
      field({ label: "Due date", name: "dueDate", type: "date", value: existing?.dueDate || "" }),
      field({
        label: "Status",
        name: "status",
        type: "select",
        value: existing?.status || "upcoming",
        options: MILESTONE_STATUS.map((s) => ({ value: s, label: s.replace("_", " ") })),
      }),
      projects.length
        ? field({
            label: "Project",
            name: "projectId",
            type: "select",
            value: existing?.projectId || projects[0].id,
            options: projects.map((p) => ({ value: p.id, label: p.name })),
          })
        : null,
    ].filter(Boolean));

    const { close } = modal({
      title: existing ? "Edit milestone" : "New milestone",
      body: form,
      footer: [
        h("button", { class: "btn btn-ghost", text: "Cancel", onclick: () => close() }),
        h("button", { class: "btn btn-primary", type: "submit", text: "Save" }),
      ],
    });

    bindSubmit(form, async () => {
      const data = formToObject(form);
      const payload = {
        title: (data.title || "").trim(),
        detail: (data.detail || "").trim() || null,
        dueDate: data.dueDate || null,
        status: data.status || "upcoming",
        projectId: data.projectId || existing?.projectId || null,
        clientId: state.clientId,
      };
      if (existing) await db.updateAsync("milestones", existing.id, payload);
      else await db.createAsync("milestones", { ...payload, position: milestones().length });
      close();
      paint();
    });
  }

  function openDeliverable(existing) {
    const projects = clientProjects();
    const form = h("form", {}, [
      field({ label: "Title", name: "title", value: existing?.title || "", required: true }),
      field({ label: "Note for the client", name: "description", type: "textarea", value: existing?.description || "" }),
      field({
        label: "Link (Drive, Figma, WeTransfer…)",
        name: "url",
        value: existing?.url || "",
        placeholder: "https://",
      }),
      field({
        label: "Kind",
        name: "kind",
        type: "select",
        value: existing?.kind || "file",
        options: [
          { value: "file", label: "File to download" },
          { value: "link", label: "Link to open" },
          { value: "preview", label: "Live preview" },
          { value: "document", label: "Document to sign (agreement, SOW)" },
        ],
      }),
      projects.length
        ? field({
            label: "Project",
            name: "projectId",
            type: "select",
            value: existing?.projectId || projects[0].id,
            options: projects.map((p) => ({ value: p.id, label: p.name })),
          })
        : null,
      h("p", { class: "muted", style: "font-size:13px;margin:6px 2px 0" }, [
        h("span", {
          text: existing
            ? "Editing does not re-notify the client. Use “Send new version” for that."
            : "Saved as a draft — invisible to the client until you hit “Send to client”.",
        }),
      ]),
    ].filter(Boolean));

    const { close } = modal({
      title: existing ? "Edit deliverable" : "New deliverable",
      body: form,
      footer: [
        h("button", { class: "btn btn-ghost", text: "Cancel", onclick: () => close() }),
        h("button", { class: "btn btn-primary", type: "submit", text: "Save" }),
      ],
    });

    bindSubmit(form, async () => {
      const data = formToObject(form);
      const payload = {
        title: (data.title || "").trim(),
        description: (data.description || "").trim() || null,
        url: (data.url || "").trim() || null,
        kind: data.kind || "file",
        projectId: data.projectId || existing?.projectId || null,
        clientId: state.clientId,
      };
      if (existing) await db.updateAsync("deliverables", existing.id, payload);
      else await db.createAsync("deliverables", { ...payload, status: "draft", version: 1 });
      close();
      paint();
    });
  }

  /* ------------------------------------------------------------- paint */

  function panel(title, subtitle, body) {
    return h("div", { class: "panel" }, [
      h("div", { class: "panel-head" }, [
        h("h3", { text: title }),
        subtitle ? h("span", { class: "subt", text: subtitle }) : null,
      ].filter(Boolean)),
      body,
    ]);
  }

  function emptyPanel(title, body) {
    return h("div", { class: "empty" }, [
      h("div", { class: "empty-title", text: title }),
      h("div", { class: "muted", text: body }),
    ]);
  }

  function paint() {
    paintTopbar();
    root.innerHTML = "";

    const list = liveClients();
    if (!list.length) {
      root.appendChild(
        emptyPanel(
          "No clients are live yet",
          "Invite a client under Onboarding, then kick their project off — they show up here."
        )
      );
      return;
    }
    if (!state.clientId || !client()) state.clientId = list[0].id;

    const picker = buildPicker();
    if (picker) root.appendChild(picker);
    root.appendChild(buildSummary());
    const onboarding = buildOnboarding();
    if (onboarding) root.appendChild(onboarding);
    root.appendChild(buildTimeline());
    root.appendChild(buildDeliverables());
    root.appendChild(buildThread());

    ctx.refreshSidebar();
    markThreadRead();
  }

  // Marking messages read writes to the cache, which fires the table listener,
  // which calls paint() again. Do it outside the paint pass and guard it so
  // that feedback loop can't recurse.
  let markingRead = false;
  function markThreadRead() {
    if (markingRead) return;
    const unread = thread().filter((m) => m.authorRole === "client" && !m.readByAdmin);
    if (!unread.length) return;
    markingRead = true;
    setTimeout(() => {
      for (const m of unread) db.update("messages", m.id, { readByAdmin: true });
      markingRead = false;
    }, 0);
  }

  paint();

  for (const t of ["milestones", "deliverables", "messages", "clients", "projects", "invoices"]) {
    const unsub = db.onTable(t, () => {
      if (root.isConnected) paint();
      else unsub();
    });
  }

  return root;
}
