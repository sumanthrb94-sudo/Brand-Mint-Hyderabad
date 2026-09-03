/**
 * Onboarding — the funnel from "signed the deal" to "project running".
 *
 * Four stages, and every client sits in exactly one:
 *   1. Invited        — you added their email; they haven't signed in yet
 *   2. In progress    — they signed in and started the brief
 *   3. Brief in       — they submitted; it's waiting on you to read
 *   4. Kicked off     — you've read it and created their milestones
 *
 * The invite is the whole trick: you add the client's email here, and when
 * that person signs in with Google the database trigger turns the pending
 * invite into a real membership. They never need a password, and you never
 * need to send credentials over WhatsApp.
 */

import {
  h,
  table,
  modal,
  field,
  formToObject,
  bindSubmit,
  renderTopbar,
  toast,
  pill,
  relTime,
  dateShort,
} from "/admin/components.js";
import { BRIEF_STEPS, answerPairs, completeness } from "/shared/brief.js";

const STAGES = [
  { id: "invited",     label: "Invited",     hint: "Waiting on their first sign-in" },
  { id: "in_progress", label: "Filling brief", hint: "They're partway through" },
  { id: "submitted",   label: "Brief in",    hint: "Waiting on you" },
  { id: "complete",    label: "Kicked off",  hint: "Milestones are live" },
];

/** Default milestones dropped in when you kick a project off. */
const STARTER_MILESTONES = [
  { title: "Kickoff call", detail: "Walk the brief, agree scope and dates.", offsetDays: 2 },
  { title: "Discovery & moodboard", detail: "Direction options for you to react to.", offsetDays: 9 },
  { title: "First concepts", detail: "The first real look at the work.", offsetDays: 18 },
  { title: "Revisions", detail: "One consolidated round against your feedback.", offsetDays: 26 },
  { title: "Final handover", detail: "Files, guidelines and everything you own.", offsetDays: 35 },
];

export async function render(ctx) {
  const { db } = ctx;

  const root = h("div", {});
  const state = { stage: "all", search: "" };

  renderTopbar({
    breadcrumb: "WORKSPACE",
    title: "Onboarding",
    actions: [
      h("button", {
        class: "btn btn-primary",
        text: "+ Invite client",
        onclick: () => openInvite(),
      }),
    ],
  });

  /* ------------------------------------------------------------ data ---- */

  function briefFor(clientId) {
    return db.list("onboardingResponses", (r) => r.clientId === clientId)[0] || null;
  }

  function inviteFor(clientId) {
    return db.list("invites", (r) => r.clientId === clientId)[0] || null;
  }

  function membersFor(clientId) {
    return db.list("clientUsers", (r) => r.clientId === clientId);
  }

  /**
   * A client's real stage, derived rather than trusted: the stored
   * `onboardingStatus` can drift if a write failed, but the presence of a
   * membership row and a submitted brief cannot.
   */
  function stageOf(client) {
    if (client.onboardingStatus === "complete") return "complete";
    const brief = briefFor(client.id);
    if (brief?.status === "submitted") return "submitted";
    if (membersFor(client.id).length > 0 || brief) return "in_progress";
    return "invited";
  }

  function rows() {
    const all = db
      .list("clients")
      .filter((c) => inviteFor(c.id) || membersFor(c.id).length || briefFor(c.id) ||
                     c.onboardingStatus !== "not_started")
      .map((c) => ({ ...c, _stage: stageOf(c), _brief: briefFor(c.id), _invite: inviteFor(c.id) }));

    const q = state.search.trim().toLowerCase();
    return all
      .filter((c) => state.stage === "all" || c._stage === state.stage)
      .filter(
        (c) =>
          !q ||
          (c.name || "").toLowerCase().includes(q) ||
          (c.email || "").toLowerCase().includes(q) ||
          (c.contact || "").toLowerCase().includes(q)
      )
      .sort((a, b) => STAGES.findIndex((s) => s.id === a._stage) - STAGES.findIndex((s) => s.id === b._stage));
  }

  /* ------------------------------------------------------------- UI ----- */

  function buildStageTrack(list) {
    const counts = Object.fromEntries(STAGES.map((s) => [s.id, 0]));
    for (const c of list) counts[c._stage] = (counts[c._stage] || 0) + 1;

    return h(
      "div",
      { class: "stage-track" },
      STAGES.map((s, i) =>
        h(
          "button",
          {
            class:
              "stage-step" +
              (state.stage === s.id ? " hot" : "") +
              (s.id === "submitted" && counts.submitted ? " hot" : ""),
            type: "button",
            onclick: () => {
              state.stage = state.stage === s.id ? "all" : s.id;
              paint();
            },
          },
          [
            h("span", { class: "n", text: `STAGE ${i + 1}` }),
            h("span", { class: "t", text: s.label }),
            h("span", { class: "c", text: String(counts[s.id] || 0) }),
            h("span", { class: "muted", text: s.hint, style: "font-size:12px" }),
          ]
        )
      )
    );
  }

  function buildTable(list) {
    return table({
      columns: [
        {
          label: "Client",
          cell: (r) =>
            h("div", {}, [
              h("div", { text: r.name || "Untitled", style: "font-weight:600" }),
              h("div", { class: "muted", text: r.email || r.contact || "—", style: "font-size:12.5px" }),
            ]),
        },
        { label: "Stage", cell: (r) => pill(r._stage) },
        {
          label: "Brief",
          cell: (r) => {
            if (!r._brief) return h("span", { class: "muted", text: "Not started" });
            const pct = completeness(r._brief.answers || {});
            return h("span", { class: "mono", text: `${pct}%` });
          },
        },
        {
          label: "Portal access",
          cell: (r) => {
            const members = membersFor(r.id).length;
            if (members) return h("span", { class: "success", text: `${members} signed in` });
            if (r._invite) return h("span", { class: "muted", text: "Invite pending" });
            return h("span", { class: "muted", text: "No access" });
          },
        },
        {
          label: "Last activity",
          cell: (r) =>
            h("span", {
              class: "muted",
              text: relTime(r._brief?.updatedAt || r._invite?.createdAt || r.createdAt),
            }),
        },
      ],
      rows: list,
      empty: {
        title: "No one is onboarding yet",
        body: 'Hit "Invite client" to add a client\'s email. They sign in with Google and fill the brief themselves.',
      },
      onRow: (r) => openClient(r),
    });
  }

  function buildToolbar() {
    const search = h("input", {
      type: "search",
      placeholder: "Search clients…",
      value: state.search,
      oninput: (e) => {
        state.search = e.target.value;
        const caret = e.target.selectionStart;
        paint();
        const next = root.querySelector('input[type="search"]');
        if (next) {
          next.focus();
          next.setSelectionRange(caret, caret);
        }
      },
    });
    return h("div", { class: "table-toolbar" }, [
      h("div", { class: "table-search" }, [
        h("svg", {
          viewBox: "0 0 14 14",
          html:
            '<circle cx="6" cy="6" r="4.2" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
            '<path d="M9.2 9.2 12.5 12.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
        }),
        search,
      ]),
      state.stage !== "all"
        ? h("button", {
            class: "chip-btn",
            type: "button",
            text: `Stage: ${STAGES.find((s) => s.id === state.stage)?.label} ✕`,
            onclick: () => {
              state.stage = "all";
              paint();
            },
          })
        : null,
    ].filter(Boolean));
  }

  function paint() {
    const list = rows();
    root.innerHTML = "";
    root.appendChild(buildStageTrack(list));
    root.appendChild(
      h("div", { class: "table-wrap" }, [buildToolbar(), buildTable(list)])
    );
    ctx.refreshSidebar();
  }

  /* -------------------------------------------------------- invite ----- */

  function openInvite() {
    const clients = db.list("clients").slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    const form = h("form", {}, [
      field({
        label: "Client",
        name: "clientMode",
        type: "select",
        value: "new",
        options: [
          { value: "new", label: "— Create a new client —" },
          ...clients.map((c) => ({ value: c.id, label: c.name })),
        ],
      }),
      h("div", { id: "new-client-fields" }, [
        field({ label: "Business name", name: "name", required: true }),
        field({ label: "Contact person", name: "contact" }),
        field({ label: "City", name: "city" }),
      ]),
      field({
        label: "Email to invite (must match their Google account)",
        name: "email",
        type: "email",
        required: true,
      }),
      h("p", { class: "muted", style: "font-size:13px;line-height:1.55;margin:4px 2px 0" }, [
        h("span", {
          text:
            "They'll sign in at /login with this exact address. Nothing is emailed automatically — " +
            "send them the link yourself once you've saved this.",
        }),
      ]),
    ]);

    const modeSel = form.querySelector('select[name="clientMode"]');
    const newFields = form.querySelector("#new-client-fields");
    const syncMode = () => {
      const isNew = modeSel.value === "new";
      newFields.style.display = isNew ? "" : "none";
      newFields.querySelectorAll("input").forEach((i) => {
        if (i.name === "name") i.required = isNew;
      });
    };
    modeSel.addEventListener("change", syncMode);
    syncMode();

    const { close } = modal({
      title: "Invite a client to the portal",
      body: form,
      footer: [
        h("button", { class: "btn btn-ghost", text: "Cancel", onclick: () => close() }),
        h("button", { class: "btn btn-primary", type: "submit", text: "Create invite" }),
      ],
    });

    bindSubmit(form, async () => {
      const data = formToObject(form);
      const email = (data.email || "").trim().toLowerCase();
      if (!email.includes("@")) throw new Error("That doesn't look like an email address.");

      let clientId = data.clientMode;
      if (clientId === "new") {
        const created = await db.createAsync("clients", {
          name: (data.name || "").trim(),
          contact: (data.contact || "").trim(),
          email,
          city: (data.city || "").trim(),
          tier: "Tier 3",
          lifetimeValue: 0,
          onboardingStatus: "invited",
          portalEnabled: true,
        });
        clientId = created.id;
      } else {
        await db.updateAsync("clients", clientId, { onboardingStatus: "invited" });
      }

      // The invite's document id MUST be `{email}_{clientId}`: firestore.rules
      // proves an invite exists with a single exists() on that exact path when
      // the client claims their membership. A random id would make the claim
      // unverifiable and every client sign-in would be denied.
      const inviteId = `${email}_${clientId}`;

      if (db.get("invites", inviteId)) {
        close();
        toast("That email is already invited to this client.");
        paint();
        return;
      }

      await db.createAsync("invites", {
        id: inviteId,
        email,
        clientId,
        role: "client",
        acceptedAt: null,
      });

      close();
      paint();
      showInviteLink(email);
    });
  }

  function showInviteLink(email) {
    const url = `${window.location.origin}/login`;
    const message =
      `Hi — your Brand Mint client portal is ready.\n\n` +
      `Open ${url} and choose "Continue with Google" using ${email}. ` +
      `You'll be asked a few questions about your business, then you can follow ` +
      `progress, approve work and see invoices in one place.`;

    const body = h("div", {}, [
      h("p", { class: "muted", style: "margin-top:0" }, [
        h("span", { text: "Invite saved. Send them this — copy it into WhatsApp or email." }),
      ]),
      h("textarea", {
        class: "input",
        style: "width:100%;min-height:150px;font-size:13.5px;line-height:1.6",
        text: message,
        readonly: "readonly",
      }),
    ]);

    const { close } = modal({
      title: "Send this to your client",
      body,
      footer: [
        h("button", { class: "btn btn-ghost", text: "Done", onclick: () => close() }),
        h("button", {
          class: "btn btn-primary",
          text: "Copy message",
          onclick: async () => {
            try {
              await navigator.clipboard.writeText(message);
              toast("Copied — paste it to your client.");
            } catch {
              body.querySelector("textarea").select();
              toast("Select-all done — press ⌘C / Ctrl-C.");
            }
          },
        }),
      ],
    });
  }

  /* --------------------------------------------------- client detail --- */

  function openClient(client) {
    const brief = briefFor(client.id);
    const answers = brief?.answers || {};
    const pairs = answerPairs(answers);
    const members = membersFor(client.id);
    const invite = inviteFor(client.id);

    const meta = h("div", { class: "brief-grid", style: "margin-bottom:18px" }, [
      metaItem("Stage", STAGES.find((s) => s.id === stageOf(client))?.label || "—"),
      metaItem("Portal access", members.length ? `${members.length} person signed in` : invite ? `Invited: ${invite.email}` : "No access"),
      metaItem("Brief completeness", brief ? `${completeness(answers)}%` : "Not started"),
      metaItem("Submitted", brief?.submittedAt ? dateShort(brief.submittedAt) : "Not yet"),
    ]);

    const briefBody = pairs.length
      ? h(
          "div",
          {},
          BRIEF_STEPS.map((step) => {
            const inStep = pairs.filter((p) => p.step === step.title);
            if (!inStep.length) return null;
            return h("div", { style: "margin-bottom:20px" }, [
              h("h4", { text: step.title, style: "margin:0 0 10px;font-size:14px" }),
              h(
                "dl",
                { class: "brief-grid" },
                inStep.map((p) =>
                  h("div", { class: "brief-item" }, [
                    h("dt", { text: p.label }),
                    h("dd", { text: p.value }),
                  ])
                )
              ),
            ]);
          }).filter(Boolean)
        )
      : h("div", { class: "empty" }, [
          h("div", { class: "empty-title", text: "No answers yet" }),
          h("div", {
            class: "muted",
            text: members.length
              ? "They've signed in but haven't started the brief. A nudge usually does it."
              : "They haven't signed in yet. Resend the invite link.",
          }),
        ]);

    const footer = [
      h("button", { class: "btn btn-ghost", text: "Close", onclick: () => close() }),
      h("button", {
        class: "btn btn-ghost",
        text: "Copy invite link",
        onclick: () => showInviteLink(invite?.email || client.email || ""),
      }),
      h("button", {
        class: "btn btn-ghost",
        text: "Open delivery →",
        onclick: () => {
          close();
          ctx.navigate("/delivery/" + client.id);
        },
      }),
    ];

    if (client.onboardingStatus !== "complete") {
      footer.push(
        h("button", {
          class: "btn btn-primary",
          text: "Kick off project",
          onclick: () => {
            close();
            openKickoff(client, answers);
          },
        })
      );
    }

    const { close } = modal({
      title: client.name || "Client",
      wide: true,
      body: h("div", {}, [meta, briefBody]),
      footer,
    });
  }

  function metaItem(label, value) {
    return h("div", { class: "brief-item" }, [
      h("dt", { text: label }),
      h("dd", { text: value }),
    ]);
  }

  /* -------------------------------------------------------- kickoff ---- */

  function openKickoff(client, answers) {
    const suggestedName =
      (Array.isArray(answers.deliverables) && answers.deliverables[0]
        ? `${client.name} — ${answers.deliverables[0]}`
        : `${client.name} — engagement`) || client.name;

    const form = h("form", {}, [
      field({ label: "Project name", name: "name", value: suggestedName, required: true }),
      field({
        label: "Type",
        name: "type",
        type: "select",
        value: "Brand",
        options: ["Brand", "Site", "Tool", "Content"].map((v) => ({ value: v, label: v })),
      }),
      field({ label: "Kickoff date", name: "kickoff", type: "date", value: today() }),
      field({ label: "Project value (₹)", name: "value", type: "number", value: "0" }),
      h("label", { class: "field has-value", style: "flex-direction:row;align-items:center;gap:10px" }, [
        h("input", { type: "checkbox", name: "starter", checked: "checked", style: "width:auto" }),
        h("span", {
          text: `Create the ${STARTER_MILESTONES.length} standard milestones`,
          style: "position:static;font-size:14px",
        }),
      ]),
    ]);

    const { close } = modal({
      title: `Kick off ${client.name}`,
      body: form,
      footer: [
        h("button", { class: "btn btn-ghost", text: "Cancel", onclick: () => close() }),
        h("button", { class: "btn btn-primary", type: "submit", text: "Start project" }),
      ],
    });

    bindSubmit(form, async () => {
      const data = formToObject(form);
      const kickoff = data.kickoff || today();

      const project = await db.createAsync("projects", {
        name: (data.name || "").trim(),
        client: client.name,
        clientId: client.id,
        type: data.type || "Brand",
        stage: "Mint",
        value: Number(data.value) || 0,
        kickoff,
        owner: "Sumanth",
      });

      if (form.querySelector('input[name="starter"]').checked) {
        STARTER_MILESTONES.forEach((m, i) => {
          db.create("milestones", {
            projectId: project.id,
            clientId: client.id,
            title: m.title,
            detail: m.detail,
            dueDate: addDays(kickoff, m.offsetDays),
            position: i,
            status: i === 0 ? "in_progress" : "upcoming",
          });
        });
      }

      await db.updateAsync("clients", client.id, { onboardingStatus: "complete" });

      // Say hello in the thread so the portal isn't an empty room.
      db.create("messages", {
        clientId: client.id,
        projectId: project.id,
        authorName: ctx.profile?.fullName || "Brand Mint",
        authorRole: "admin",
        body:
          `We're underway. Your timeline is live in the portal — I'll post here ` +
          `whenever something needs your eyes.`,
      });

      close();
      toast(`${client.name} is live. Their portal now shows the timeline.`);
      paint();
    });
  }

  /* ---------------------------------------------------------- wiring --- */

  paint();

  // Re-render on realtime changes, and drop the subscription once this view
  // has been swapped out (same pattern the other modules use).
  for (const t of ["clients", "invites", "onboardingResponses", "clientUsers", "milestones"]) {
    const unsub = db.onTable(t, () => {
      if (root.isConnected) paint();
      else unsub();
    });
  }

  return root;
}

/* ------------------------------------------------------------- utils ---- */

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(isoDate, days) {
  const d = new Date(isoDate + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
