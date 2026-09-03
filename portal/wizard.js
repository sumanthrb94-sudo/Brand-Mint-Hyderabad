/**
 * The onboarding brief — the client's first screen.
 *
 * One step at a time, autosaved on every move, so a client who closes the tab
 * halfway through a five-step form does not lose the four steps they did fill
 * in. The questions come from /shared/brief.js, which the admin reads back
 * with the same ids.
 */

import { h, mount, toast, card } from "/portal/ui.js";
import { BRIEF_STEPS, missingRequired, completeness } from "/shared/brief.js";
import { saveBrief } from "/portal/data.js";

export function renderWizard(view, { brief, client, onDone }) {
  const answers = { ...(brief?.answers || {}) };
  let stepIndex = Math.min(Number(brief?.step) || 0, BRIEF_STEPS.length - 1);
  let saving = false;

  function paint() {
    const step = BRIEF_STEPS[stepIndex];
    const isLast = stepIndex === BRIEF_STEPS.length - 1;

    const progress = h(
      "div",
      { class: "p-steps" },
      BRIEF_STEPS.map((_, i) =>
        h("span", { class: i < stepIndex ? "done" : i === stepIndex ? "on" : "" })
      )
    );

    const body = h("div", { class: "p-stack" }, step.questions.map(questionField));

    const foot = h("div", { class: "p-wizard-foot" }, [
      stepIndex > 0
        ? h("button", { class: "p-btn p-btn-ghost", type: "button", text: "← Back", onclick: () => go(-1) })
        : h("span", {}),
      h("div", { class: "p-row" }, [
        h("span", { class: "p-muted", style: "font-size:12.5px", text: `Step ${stepIndex + 1} of ${BRIEF_STEPS.length}` }),
        h("button", {
          class: "p-btn p-btn-primary",
          type: "button",
          text: isLast ? "Submit brief" : "Save & continue →",
          onclick: () => (isLast ? submit() : go(1)),
        }),
      ]),
    ]);

    mount(
      view,
      h("div", { class: "p-wizard" }, [
        h("div", { class: "p-hero" }, [
          h("h1", { text: brief?.status === "submitted" ? "Update your brief" : `Welcome, ${firstName(client)}` }),
          h("p", {
            text:
              brief?.status === "submitted"
                ? "Change anything below and re-submit — we'll see the update straight away."
                : "Five short steps. This is everything we need to start, and it saves as you go — " +
                  "close the tab and come back whenever.",
          }),
        ]),
        card(
          step.title,
          step.blurb,
          progress,
          body,
          foot
        ),
      ])
    );
  }

  /* --------------------------------------------------------------- fields */

  function questionField(q) {
    const labelRow = h("span", { class: "lbl" }, [
      h("span", { text: q.label }),
      q.required ? h("span", { class: "p-required", text: " *" }) : null,
    ].filter(Boolean));

    let control;

    if (q.type === "textarea") {
      control = h("textarea", {
        name: q.id,
        placeholder: q.placeholder || "",
        oninput: (e) => { answers[q.id] = e.target.value; },
      });
      control.value = answers[q.id] || "";
    } else if (q.type === "select") {
      control = h("select", { name: q.id, onchange: (e) => { answers[q.id] = e.target.value; } }, [
        h("option", { value: "", text: "Choose one…" }),
        ...q.options.map((o) => h("option", { value: o, text: o })),
      ]);
      control.value = answers[q.id] || "";
    } else if (q.type === "multi") {
      const selected = new Set(Array.isArray(answers[q.id]) ? answers[q.id] : []);
      control = h(
        "div",
        { class: "p-choices" },
        q.options.map((o) => {
          const btn = h("button", {
            class: "p-choice",
            type: "button",
            text: o,
            "aria-pressed": selected.has(o) ? "true" : "false",
            onclick: () => {
              if (selected.has(o)) selected.delete(o);
              else selected.add(o);
              btn.setAttribute("aria-pressed", selected.has(o) ? "true" : "false");
              answers[q.id] = [...selected];
            },
          });
          return btn;
        })
      );
    } else {
      control = h("input", {
        type: "text",
        name: q.id,
        placeholder: q.placeholder || "",
        oninput: (e) => { answers[q.id] = e.target.value; },
      });
      control.value = answers[q.id] || "";
    }

    return h("label", { class: "p-field" }, [labelRow, control]);
  }

  /* ------------------------------------------------------------- actions */

  async function persist(status) {
    if (saving) return;
    saving = true;
    try {
      await saveBrief({ answers, step: stepIndex, status });
    } catch (e) {
      console.error("[wizard] save", e);
      toast("Couldn't save just now — check your connection. Your answers are still on screen.", 5000);
      throw e;
    } finally {
      saving = false;
    }
  }

  async function go(delta) {
    const next = Math.max(0, Math.min(BRIEF_STEPS.length - 1, stepIndex + delta));
    // Only block on required fields when moving forward.
    if (delta > 0) {
      const step = BRIEF_STEPS[stepIndex];
      const missing = step.questions.filter((q) => {
        if (!q.required) return false;
        const v = answers[q.id];
        return Array.isArray(v) ? v.length === 0 : !v || !String(v).trim();
      });
      if (missing.length) {
        toast(`Still needed: ${missing.map((m) => m.label).join(", ")}`, 4500);
        return;
      }
    }
    stepIndex = next;
    paint();
    window.scrollTo({ top: 0, behavior: "smooth" });
    try { await persist("draft"); } catch {}
  }

  async function submit() {
    const missing = missingRequired(answers);
    if (missing.length) {
      toast(`A few things are still blank: ${missing.map((m) => m.label).join(", ")}`, 5500);
      const firstStep = BRIEF_STEPS.findIndex((s) => s.questions.some((q) => q.id === missing[0].id));
      if (firstStep >= 0) { stepIndex = firstStep; paint(); }
      return;
    }
    try {
      await persist("submitted");
    } catch {
      return;
    }
    toast("Brief sent. We'll be in touch shortly.", 4000);
    onDone();
  }

  paint();
}

function firstName(client) {
  const n = client?.contact || client?.name || "";
  return n.split(/\s+/)[0] || "there";
}

/** Small read-only echo of the brief, shown on the overview once submitted. */
export function briefSummaryCard(brief, onEdit) {
  if (!brief) return null;
  const pct = completeness(brief.answers || {});
  return card(
    "Your brief",
    brief.status === "submitted" ? `Submitted · ${pct}% complete` : "Draft — not sent yet",
    h("p", { class: "p-muted", style: "margin:0 0 14px", text:
      brief.status === "submitted"
        ? "We're working from this. If anything changes, update it and we'll see it immediately."
        : "You haven't submitted this yet. Nothing starts until you do." }),
    h("button", {
      class: "p-btn",
      type: "button",
      text: brief.status === "submitted" ? "Review or update" : "Finish the brief",
      onclick: onEdit,
    })
  );
}
