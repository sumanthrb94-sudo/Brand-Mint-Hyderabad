/**
 * Client portal — entry point and views.
 *
 * Boot: gate on role 'client' → load the workspace → if the brief has never
 * been submitted, the wizard IS the app; otherwise show the four tabs.
 *
 * Everything rendered here is already scoped by firestore.rules to the client(s) this
 * user belongs to. The filtering in this file is for layout, not security.
 */

import { requireRole, signOut, cleanAuthParamsFromUrl, recordSignup, getIdToken } from "/auth/session.js";
import { track, identify } from "/shared/analytics.js";
import {
  loadWorkspace,
  reviewDeliverable,
  postMessage,
  markThreadRead,
  watch,
  sendRequest,
  myRequests,
  saveReadiness,
} from "/portal/data.js";
import { renderWizard, briefSummaryCard } from "/portal/wizard.js";
import { TIERS, TIER_BY_ID, STEPS, CARE_PLANS, NEEDS, FAQ, inclusionsFor } from "/shared/tiers.js";
import { PERKS, LESSONS, COMPLIANCE, COMPLIANCE_NOTE, PRODUCTS, WHATSAPP_DISPLAY, waLink } from "/shared/resources.js";
import { QUIZ, scoreQuiz, scoreLabel } from "/shared/quiz.js";
import {
  h,
  mount,
  toast,
  modal,
  card,
  pill,
  empty,
  inr,
  dateLong,
  relTime,
  daysUntil,
  humanise,
  safeUrl,
} from "/portal/ui.js";

const view = document.getElementById("view");
const tabsEl = document.getElementById("tabs");

let profile = null;
let data = null;
let activeTab = "overview";
let forceWizard = false;

/* ------------------------------------------------------------------- boot */

async function boot() {
  cleanAuthParamsFromUrl();
  profile = await requireRole("client", { signIn: "/login", denied: "/login?denied=1" });
  identify(profile.id, getIdToken);

  document.getElementById("account-email").textContent = profile.email || "";
  document.getElementById("signout").addEventListener("click", () => signOut("/login?signedout=1"));

  // No client membership yet: they picked a tier and signed in, and we
  // haven't called them. That is a real state with its own screen, not an
  // error.
  if (!profile.clientIds.length) {
    document.getElementById("boot")?.remove();
    document.getElementById("app").hidden = false;
    renderLeadState();
    return;
  }

  await refresh();

  document.getElementById("boot")?.remove();
  document.getElementById("app").hidden = false;

  // The studio pushing a new deliverable or message should just appear.
  watch(() => refresh()).catch((e) => console.warn("[portal] realtime", e));

  window.addEventListener("hashchange", () => {
    const t = window.location.hash.replace(/^#\/?/, "");
    if (t && TABS.some((x) => x.id === t)) {
      activeTab = t;
      paint();
    }
  });
}

async function refresh() {
  try {
    data = await loadWorkspace();
  } catch (e) {
    console.error("[portal] load", e);
    document.getElementById("boot")?.remove();
    document.getElementById("app").hidden = false;
    mount(
      view,
      card(
        "We couldn't load your workspace",
        null,
        h("p", { class: "p-muted", text: e?.message || "Something went wrong talking to the server." }),
        h("button", { class: "p-btn p-btn-primary", type: "button", text: "Try again", onclick: () => location.reload() })
      )
    );
    return;
  }
  paint();
}

/* -------------------------------------------------------------------- tabs */

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "files", label: "Files & approvals" },
  { id: "invoices", label: "Invoices" },
  { id: "messages", label: "Messages" },
  { id: "resources", label: "Free resources" },
];

function paintTabs() {
  if (!data) return;
  const needsReview = data.deliverables.filter((d) => d.status === "awaiting_review").length;
  const unread = data.messages.filter((m) => m.authorRole === "admin" && !m.readByClient).length;
  const unpaid = data.invoices.filter((i) => i.status !== "paid" && i.status !== "draft").length;
  const counts = { files: needsReview, messages: unread, invoices: unpaid };

  mount(
    tabsEl,
    ...TABS.map((t) =>
      h("button", {
        class: "p-tab" + (t.id === activeTab ? " active" : ""),
        type: "button",
        onclick: () => {
          activeTab = t.id;
          window.location.hash = "#/" + t.id;
          paint();
        },
      }, [
        h("span", { text: t.label }),
        counts[t.id] ? h("span", { class: "p-dot", text: String(counts[t.id]) }) : null,
      ].filter(Boolean))
    )
  );
}

function paint() {
  if (!data) return;
  document.getElementById("client-name").textContent = data.client?.name || "Client portal";

  // The brief opens as a full-screen wizard only when asked for.
  if (forceWizard) {
    tabsEl.innerHTML = "";
    renderWizard(view, {
      brief: data.brief,
      client: data.client,
      onDone: async () => {
        forceWizard = false;
        await refresh();
      },
    });
    return;
  }

  paintTabs();
  // Until the agreement is signed and the deposit is in, the overview is the
  // onboarding checklist. Everything else (files, invoices, messages) works
  // as normal so the deposit invoice and the agreement are reachable.
  const active = (data.client?.status || "active") === "active";
  if (activeTab === "overview") return active ? renderOverview() : renderOnboardingOverview();
  if (activeTab === "files") return renderFiles();
  if (activeTab === "invoices") return renderInvoices();
  if (activeTab === "messages") return renderMessages();
  if (activeTab === "resources") return renderResources();
}

/* ------------------------------------------------------------- lead state */

function tierCard(tierId) {
  const t = TIER_BY_ID[tierId];
  if (!t) return null;
  return card(
    t.name,
    `Tier ${t.tier} · ${inr(t.price)} · ${t.weeks} · GST extra`,
    h("p", { class: "p-muted", style: "margin:0 0 14px", text: t.blurb }),
    h("div", { class: "p-stack" }, t.groups.map((g) =>
      h("div", {}, [
        h("div", { class: "p-mono p-muted", style: "font-size:11px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px", text: g.title }),
        h("ul", { class: "p-timeline", style: "padding-left:0" }, g.items.map((it) =>
          h("li", { class: "done", style: "padding-bottom:8px;border-left-color:transparent" }, [
            h("span", { class: "p-tl-title", style: "font-weight:500;font-size:14px", text: it }),
          ])
        )),
      ])
    ))
  );
}

function stepsCard(doneCount) {
  return card("What happens next", null,
    h("ol", { class: "p-timeline", style: "list-style:none;padding-left:0" }, STEPS.map((s, i) =>
      h("li", { class: i < doneCount ? "done" : i === doneCount ? "in_progress" : "upcoming" }, [
        h("div", { class: "p-tl-head" }, [
          h("span", { class: "p-tl-title", text: s.title }),
          pill(i < doneCount ? "done" : i === doneCount ? "in_progress" : "upcoming"),
        ]),
        h("div", { class: "p-tl-detail", text: s.body }),
      ])
    ))
  );
}

/** Signed in, picked a tier, not yet converted by the studio.
 *  This is the services review: the whole offer, in detail, the moment they land. */
function renderLeadState() {
  tabsEl.innerHTML = "";
  document.getElementById("client-name").textContent = "Your request";
  const first = (profile.fullName || "").split(/\s+/)[0] || "there";
  const tier = profile.selectedTier ? TIER_BY_ID[profile.selectedTier] : null;

  const hero = h("div", { class: "p-hero" }, [
    h("p", { class: "p-mono p-hero-kicker", text: tier ? `Tier ${tier.tier} · ${tier.name}` : "Signed in" }),
    h("h1", { text: tier ? `Thanks, ${first} — we'll call you within one working day.` : `Welcome, ${first}. Pick the store that fits.` }),
    h("p", { text: tier
      ? "Below is everything your store includes, what we'll need from you, and what happens next. Nothing is due until the agreement is signed."
      : "Everything we build is below, in detail. Choose one and we'll call you within one working day to confirm the scope." }),
    tier ? h("div", { class: "p-hero-stats" }, [
      stat(inr(tier.price), "one-time, GST extra"),
      stat(tier.weeks, "to launch"),
      stat("50%", "deposit to start"),
    ]) : null,
    h("div", { class: "p-row", style: "margin-top:22px" }, [
      h("a", { class: "p-btn", href: "https://wa.me/917799934943?text=Hi%20Brand%20Mint%20%E2%80%94%20I%20just%20signed%20in%20on%20the%20site.", rel: "noopener", text: "Can't wait? WhatsApp us" }),
    ]),
  ]);

  mount(
    view,
    hero,
    quizCard(),
    tier ? inclusionsCard(tier) : null,
    tier ? alternativesCard(tier) : allTiersCard(),
    perksCard(),
    needsCard(),
    stepsCard(1),
    lessonsCard(),
    complianceCard(),
    careCard(),
    productsCard(),
    faqCard()
  );
  loadMyRequests();
  window.scrollTo(0, 0);
}

/* ------------------------------------------------- free resources (all states) */

/** Members get the same perks, lessons, compliance and pre-booking on a tab. */
function renderResources() {
  mount(
    view,
    h("div", { class: "p-hero p-hero--slim" }, [
      h("p", { class: "p-mono p-hero-kicker", text: "Free, because you signed in" }),
      h("h1", { text: "Things we'll do for you, and things worth knowing." }),
      h("p", { text: `Ask for any of these on WhatsApp (${WHATSAPP_DISPLAY}) and we do it — no charge, no tier required.` }),
    ]),
    quizCard(),
    perksCard(),
    productsCard(),
    lessonsCard(),
    complianceCard()
  );
  loadMyRequests();
}

/* ------------------------------------------------- store readiness score */

let quizAnswers = null; // null = not started; {} while in progress
let quizStep = 0;

function quizCard() {
  const host = h("section", { class: "p-card p-quiz", id: "quiz" });
  const paintQuiz = () => {
    host.innerHTML = "";
    const r = profile.readiness;
    if (quizAnswers) return host.appendChild(quizQuestion(paintQuiz));
    if (r && r.score != null) return host.appendChild(quizResult(r, paintQuiz));
    host.appendChild(quizIntro(paintQuiz));
  };
  paintQuiz();
  return host;
}

function quizIntro(repaint) {
  return h("div", { class: "p-quiz-intro" }, [
    h("div", {}, [
      h("p", { class: "p-mono p-quiz-kicker", text: "Two minutes · 10 questions" }),
      h("h2", { text: "How ready is your store to launch?" }),
      h("p", { class: "p-muted", text: "Answer ten quick questions. You get a score out of 100, the tier that fits how you operate, and the three things to fix first. We see it too, so the call starts where you are." }),
    ]),
    h("button", { class: "p-btn p-btn-primary", type: "button", text: "Start", onclick: () => { quizAnswers = {}; quizStep = 0; track("quiz_start"); repaint(); } }),
  ]);
}

function quizQuestion(repaint) {
  const q = QUIZ[quizStep];
  const n = QUIZ.length;
  const wrap = h("div", { class: "p-quiz-q" }, [
    h("div", { class: "p-quiz-top" }, [
      h("span", { class: "p-mono p-muted", text: `${quizStep + 1} / ${n}` }),
      h("div", { class: "p-progress", "aria-hidden": "true" }, h("span", { style: `width:${Math.round((quizStep / n) * 100)}%` })),
    ]),
    h("h2", { text: q.q }),
    h("div", { class: "p-quiz-options", role: "group", "aria-label": q.q }, q.options.map((o, i) =>
      h("button", {
        class: "p-quiz-opt" + (quizAnswers[q.id] === i ? " picked" : ""), type: "button", text: o.label,
        onclick: () => {
          quizAnswers[q.id] = i;
          if (quizStep < n - 1) { quizStep += 1; repaint(); }
          else finishQuiz(repaint);
        },
      })
    )),
    h("div", { class: "p-row", style: "justify-content:space-between;margin-top:14px" }, [
      h("button", { class: "p-btn p-btn-ghost p-btn-sm", type: "button", text: quizStep ? "← Back" : "Cancel",
        onclick: () => { if (quizStep) { quizStep -= 1; } else { quizAnswers = null; } repaint(); } }),
      h("span", { class: "p-muted", style: "font-size:12.5px", text: "Pick the closest answer" }),
    ]),
  ]);
  setTimeout(() => wrap.querySelector(".p-quiz-opt")?.focus(), 0);
  return wrap;
}

async function finishQuiz(repaint) {
  const result = scoreQuiz(quizAnswers);
  const readiness = { ...result, answers: quizAnswers, at: new Date().toISOString() };
  profile.readiness = readiness;
  quizAnswers = null;
  track("quiz_finish", { score: readiness.score, tier: readiness.tierId });
  repaint();
  try {
    await saveReadiness(readiness);
    toast(`Saved — ${readiness.score}/100, ${scoreLabel(readiness.score)}.`);
  } catch (e) {
    console.error("[portal] readiness", e);
    toast("Scored, but we couldn't save it. It'll still be here until you reload.");
  }
}

function quizResult(r, repaint) {
  const fit = TIER_BY_ID[r.tierId];
  const isCurrent = profile.selectedTier === r.tierId;
  const circ = 2 * Math.PI * 52;
  const ring = h("svg", { class: "p-ring", viewBox: "0 0 120 120", width: "120", height: "120", role: "img", "aria-label": `${r.score} out of 100` }, [
    h("circle", { cx: "60", cy: "60", r: "52", class: "p-ring-track" }),
    h("circle", { cx: "60", cy: "60", r: "52", class: "p-ring-fill", style: `stroke-dasharray:${circ};stroke-dashoffset:${circ * (1 - r.score / 100)}` }),
    h("text", { x: "60", y: "58", class: "p-ring-num", "text-anchor": "middle", "dominant-baseline": "central", text: String(r.score) }),
    h("text", { x: "60", y: "80", class: "p-ring-sub", "text-anchor": "middle", text: "/ 100" }),
  ]);
  const chooseBtn = fit && !isCurrent
    ? h("button", { class: "p-btn p-btn-primary p-btn-sm", type: "button", text: `Choose ${fit.name}` })
    : null;
  if (chooseBtn) chooseBtn.addEventListener("click", async () => {
    chooseBtn.disabled = true; chooseBtn.textContent = "Saving…";
    try {
      await recordSignup({ tier: r.tierId, newsletter: !!profile.consent?.newsletter });
      profile.selectedTier = r.tierId;
      track("tier_switch", { tier: r.tierId, from: "quiz" });
      toast(`Noted — ${fit.name}. We'll confirm on the call.`);
      if (!profile.clientIds.length) renderLeadState(); else repaint();
    } catch (e) { console.error(e); chooseBtn.disabled = false; chooseBtn.textContent = `Choose ${fit.name}`; toast("Couldn't save that. Try again."); }
  });
  return h("div", { class: "p-quiz-result" }, [
    h("div", { class: "p-quiz-score" }, [
      ring,
      h("div", {}, [
        h("p", { class: "p-mono p-quiz-kicker", text: "Store readiness" }),
        h("h2", { text: scoreLabel(r.score) }),
        h("p", { class: "p-muted", text: fit
          ? (isCurrent ? `The ${fit.name} matches how you operate — the one you picked.` : `How you operate fits the ${fit.name} (${inr(fit.price)}, ${fit.weeks}).`)
          : "" }),
        h("div", { class: "p-row", style: "margin-top:10px" }, [
          chooseBtn,
          h("button", { class: "p-btn p-btn-ghost p-btn-sm", type: "button", text: "Retake", onclick: () => { quizAnswers = { ...(r.answers || {}) }; quizStep = 0; repaint(); } }),
        ].filter(Boolean)),
      ]),
    ]),
    r.fixes?.length
      ? h("div", { class: "p-quiz-fixes" }, [
          h("h3", { text: r.fixes.length === 1 ? "The one thing to fix first" : `The ${r.fixes.length} things to fix first` }),
          h("ol", {}, r.fixes.map((f) => h("li", {}, [h("strong", { text: f.q }), h("span", { text: f.fix })]))),
        ])
      : h("p", { class: "p-quiz-clean", text: "Nothing is holding you back. Sign the agreement and we start." }),
  ]);
}

/** ids of things already requested, so buttons can show it. */
let requested = new Set();
async function loadMyRequests() {
  try {
    const rows = await myRequests();
    requested = new Set(rows.map((r) => `${r.kind}:${r.item}`));
    for (const el of view.querySelectorAll("[data-req]")) markRequested(el);
  } catch (e) {
    console.warn("[portal] requests", e);
  }
}
function markRequested(el) {
  const key = el.getAttribute("data-req");
  if (!requested.has(key)) return;
  el.classList.add("is-requested");
  const kind = key.split(":")[0];
  if (el.hasAttribute("download")) { el.textContent = "Download again ✓"; return; }
  el.textContent = kind === "prebook" ? "Pre-booked ✓" : "Asked ✓ — check WhatsApp";
  if (kind === "prebook") el.disabled = true;
}

async function record(kind, item, label, btn) {
  const key = `${kind}:${item}`;
  if (requested.has(key)) return true;
  try {
    await sendRequest({ kind, item, label });
    requested.add(key);
    if (btn) markRequested(btn);
    return true;
  } catch (e) {
    console.error("[portal] request", e);
    toast("Couldn't save that — but WhatsApp still works.");
    return false;
  }
}

function perksCard() {
  return card("Free for you, right now", `The documents download instantly. For the rest, ask on WhatsApp ${WHATSAPP_DISPLAY} and we do it. No tier needed, nothing to pay.`,
    h("div", { class: "p-perks" }, PERKS.map((pk) => {
      const msg = `Hi Brand Mint — ${pk.ask} (signed in as ${profile.email})`;
      const wa = h("a", {
        class: "p-btn p-btn-sm" + (pk.file ? "" : " p-btn-primary"), href: waLink(msg), target: "_blank", rel: "noopener",
        "data-req": pk.file ? null : `perk:${pk.id}`, text: pk.file ? "Or ask on WhatsApp" : "Ask on WhatsApp",
      });
      wa.addEventListener("click", () => { track("perk_ask", { perk: pk.id }); record("perk", pk.id, pk.title, pk.file ? null : wa); });
      const dl = pk.file
        ? h("a", { class: "p-btn p-btn-sm p-btn-primary", href: pk.file, download: "", "data-req": `perk:${pk.id}`, text: "Download PDF" })
        : null;
      if (dl) dl.addEventListener("click", () => { track("perk_download", { perk: pk.id }); record("perk", pk.id, `${pk.title} (PDF)`, dl); });
      return h("article", { class: "p-perk" }, [
        h("h3", { text: pk.title }),
        h("p", { class: "p-perk-summary", text: pk.summary }),
        h("p", { class: "p-muted", text: pk.detail }),
        h("div", { class: "p-perk-actions" }, [dl, wa].filter(Boolean)),
      ]);
    })));
}

function lessonsCard() {
  return card("Running a store in India", "The six things that surprise first-time store owners. Five minutes each.",
    h("div", { class: "p-lessons" }, LESSONS.map((l) =>
      h("details", { class: "p-lesson" }, [
        h("summary", {}, [h("span", { class: "p-tag", text: l.tag }), h("span", { text: l.title })]),
        h("p", { text: l.body }),
      ])
    )));
}

function complianceCard() {
  return card("Compliance checklist for an Indian online store", COMPLIANCE_NOTE,
    h("div", { class: "p-lessons" }, COMPLIANCE.map((c, i) =>
      h("details", { class: "p-lesson", open: i === 0 }, [
        h("summary", {}, [h("span", { class: "p-tag p-tag-num p-mono", text: String(i + 1).padStart(2, "0") }), h("span", { text: c.title })]),
        h("p", { text: c.body }),
        h("p", { class: "p-built" }, [h("strong", { text: "What we build in: " }), c.built]),
      ])
    )));
}

function productsCard() {
  return card("Launching next from Brand Mint", "Pre-book a free trial. We'll message you on WhatsApp when it opens — nothing to pay.",
    h("div", { class: "p-products" }, PRODUCTS.map((pr) => {
      const btn = h("button", { class: "p-btn p-btn-sm p-btn-primary", type: "button", "data-req": `prebook:${pr.id}`, text: "Pre-book free trial" });
      btn.addEventListener("click", async () => {
        btn.disabled = true; btn.textContent = "Saving…";
        const ok = await record("prebook", pr.id, `${pr.name} — free trial`, btn);
        if (ok) { track("prebook", { product: pr.id }); toast(`You're on the list for ${pr.name}.`); }
        else { btn.disabled = false; btn.textContent = "Pre-book free trial"; }
      });
      markRequested(btn);
      return h("article", { class: "p-product" }, [
        h("span", { class: "p-tag", text: pr.status }),
        h("h3", { text: pr.name }),
        h("p", { class: "p-muted", text: pr.summary }),
        h("p", { class: "p-product-trial", text: pr.trial }),
        btn,
      ]);
    })));
}

function stat(value, label) {
  return h("div", { class: "p-hero-stat" }, [
    h("span", { class: "v p-mono", text: value }),
    h("span", { class: "l", text: label }),
  ]);
}

/** The chosen tier, then every tier it stands on, group by group. */
function inclusionsCard(tier) {
  const chain = inclusionsFor(tier.id);
  const blocks = chain.map(({ tier: t, own }) =>
    h("div", { class: "p-incl-block" + (own ? " own" : "") }, [
      h("div", { class: "p-incl-title" }, [
        h("h3", { text: own ? `In the ${t.name}` : `Also included — everything in the ${t.name}` }),
        own ? null : h("span", { class: "p-mono p-muted", text: `Tier ${t.tier}` }),
      ]),
      own ? h("p", { class: "p-muted", style: "margin:0 0 14px", text: t.blurb }) : null,
      h("div", { class: "p-incl-grid" }, t.groups.map((g) =>
        h("div", { class: "p-incl-group" }, [
          h("h4", { text: g.title }),
          h("ul", {}, g.items.map((it) => h("li", { text: it }))),
        ])
      )),
    ])
  );
  const total = chain.reduce((n, { tier: t }) => n + t.groups.reduce((m, g) => m + g.items.length, 0), 0);
  return card(`Your store, in full`, `${total} deliverables · ${inr(tier.price)} + GST · ${tier.weeks}`, ...blocks);
}

/** The other three tiers, each switchable in one click. */
function alternativesCard(tier) {
  const others = TIERS.filter((t) => t.id !== tier.id);
  return card("Not the right fit? Change it here", "Every tier includes the one before it. You can also change it on the call.",
    h("div", { class: "p-alts" }, others.map((t) => tierAlt(t, tier))));
}

function allTiersCard() {
  return card("The four stores", "One fixed price each, in INR, exclusive of 18% GST.",
    h("div", { class: "p-alts" }, TIERS.map((t) => tierAlt(t, null))));
}

function tierAlt(t, current) {
  const up = current ? t.tier > current.tier : true;
  const btn = h("button", { class: "p-btn p-btn-sm" + (t.featured ? " p-btn-primary" : ""), type: "button",
    text: current ? (up ? `Move up to ${t.name}` : `Switch to ${t.name}`) : `Choose ${t.name}` });
  btn.addEventListener("click", async () => {
    btn.disabled = true; btn.textContent = "Saving…";
    try {
      await recordSignup({ tier: t.id, newsletter: !!profile.consent?.newsletter });
      profile.selectedTier = t.id;
      track("tier_switch", { tier: t.id });
      toast(`Noted — ${t.name}. We'll confirm on the call.`);
      renderLeadState();
    } catch (e) {
      console.error("[portal] switch tier", e);
      btn.disabled = false; btn.textContent = `Choose ${t.name}`;
      toast("Couldn't save that. Try again, or tell us on the call.");
    }
  });
  return h("div", { class: "p-alt" + (t.featured ? " featured" : "") }, [
    h("div", { class: "p-mono p-muted", style: "font-size:11px;letter-spacing:.14em;text-transform:uppercase", text: `Tier ${t.tier}` }),
    h("h3", { text: t.name }),
    h("p", { class: "p-muted", text: t.blurb }),
    h("div", { class: "p-alt-price" }, [h("strong", { class: "p-mono", text: inr(t.price) }), h("span", { class: "p-muted", text: t.weeks })]),
    h("ul", { class: "p-alt-list" }, t.groups.flatMap((g) => g.items).slice(0, 4).map((it) => h("li", { text: it }))),
    btn,
  ]);
}

function needsCard() {
  return card("What we'll need from you", "Have these ready and the build starts sooner. Nothing is needed before the call.",
    h("ul", { class: "p-check" }, NEEDS.map((n) =>
      h("li", {}, [h("strong", { text: n.title }), h("span", { text: n.body })])
    )));
}

function careCard() {
  return card("After launch", "Optional monthly care plans. Per month, exclusive of GST. Cancel with 30 days' notice.",
    h("div", { class: "p-care" }, CARE_PLANS.map((c) =>
      h("div", { class: "p-care-row" }, [
        h("strong", { text: c.name }),
        h("span", { class: "p-mono", text: `${inr(c.price)}/mo` }),
        h("p", { class: "p-muted", text: c.body }),
      ])
    )));
}

function faqCard() {
  return card("Before you ask", null,
    h("div", { class: "p-faq" }, FAQ.map((f) =>
      h("details", { class: "p-faq-item" }, [h("summary", { text: f.q }), h("p", { text: f.a })])
    )));
}

/** Converted to a client; agreement and deposit still outstanding. */
function renderOnboardingOverview() {
  const c = data.client || {};
  const signed = !!c.agreementSignedAt;
  const paid = !!c.depositPaidAt;
  const docs = data.deliverables.filter((d) => d.kind === "document");
  const tier = c.storeTier ? TIER_BY_ID[c.storeTier] : null;

  const checklist = card("Before we start", `${[signed, paid].filter(Boolean).length} of 2 done`,
    h("ul", { class: "p-timeline" }, [
      h("li", { class: signed ? "done" : "in_progress" }, [
        h("div", { class: "p-tl-head" }, [h("span", { class: "p-tl-title", text: "Agreement signed" }), pill(signed ? "done" : "in_progress")]),
        h("div", { class: "p-tl-detail", text: signed ? `Signed ${dateLong(c.agreementSignedAt)}.` : docs.length ? "Open the agreement under Files, sign it, and tell us in Messages." : "We'll send the agreement to your portal after the call." }),
      ]),
      h("li", { class: paid ? "done" : signed ? "in_progress" : "upcoming" }, [
        h("div", { class: "p-tl-head" }, [h("span", { class: "p-tl-title", text: "50% deposit paid" }), pill(paid ? "done" : signed ? "in_progress" : "upcoming")]),
        h("div", { class: "p-tl-detail", text: paid ? `Received ${dateLong(c.depositPaidAt)}. Your timeline goes live now.` : "The deposit invoice appears under Invoices once the agreement is signed. Work starts the day it lands." }),
      ]),
    ])
  );

  const actions = [];
  if (docs.length) actions.push({ text: `${docs.length} document${docs.length > 1 ? "s" : ""} to review`, cta: "Open Files", tab: "files" });
  const unpaid = data.invoices.filter((i) => i.status === "sent" || i.status === "overdue");
  if (unpaid.length) actions.push({ text: `Deposit invoice — ${inr(unpaid.reduce((s, i) => s + (Number(i.total) || 0), 0))}`, cta: "See invoice", tab: "invoices" });
  const todo = actions.length
    ? card("Over to you", null, h("div", { class: "p-stack" }, actions.map((a) =>
        h("div", { class: "p-row", style: "justify-content:space-between;padding:12px 14px;border:1px solid var(--line);border-radius:12px" }, [
          h("span", { text: a.text }),
          h("button", { class: "p-btn p-btn-sm", type: "button", text: a.cta, onclick: () => { activeTab = a.tab; window.location.hash = "#/" + a.tab; paint(); } }),
        ]))))
    : null;

  mount(
    view,
    h("div", { class: "p-hero" }, [
      h("h1", { text: c.name || "Getting started" }),
      h("p", { text: tier ? `${tier.name} · ${inr(tier.price)} + GST · ${tier.weeks}` : "We're setting up your project." }),
    ]),
    todo,
    checklist,
    stepsCard(paid ? 3 : 2),
    briefSummaryCard(data.brief, () => { forceWizard = true; paint(); }) ||
      card("Your brief", "Not started", h("p", { class: "p-muted", style: "margin:0 0 14px", text: "Five short questions about your business, so we start from facts. Takes ten minutes and saves as you go." }),
        h("button", { class: "p-btn p-btn-primary", type: "button", text: "Start the brief", onclick: () => { forceWizard = true; paint(); } })),
    tier ? tierCard(c.storeTier) : null
  );
}

/* ---------------------------------------------------------------- overview */

function renderOverview() {
  const ms = data.milestones;
  const done = ms.filter((m) => m.status === "done").length;
  const current = ms.find((m) => m.status === "in_progress") || ms.find((m) => m.status !== "done");
  const pct = ms.length ? Math.round((done / ms.length) * 100) : 0;
  const awaiting = data.deliverables.filter((d) => d.status === "awaiting_review");
  const outstanding = data.invoices
    .filter((i) => i.status !== "paid" && i.status !== "draft")
    .reduce((s, i) => s + (Number(i.total) || 0), 0);

  const hero = h("div", { class: "p-hero" }, [
    h("h1", { text: data.client?.name || "Your project" }),
    h("p", {
      text: current
        ? `Currently: ${current.title}.`
        : ms.length
        ? "Everything on the timeline is done."
        : "Your timeline goes up as soon as we've kicked off.",
    }),
    h("div", { class: "p-hero-stats" }, [
      heroStat("Progress", ms.length ? `${done} of ${ms.length}` : "—"),
      heroStat("Waiting on you", String(awaiting.length)),
      heroStat("Outstanding", outstanding ? inr(outstanding) : "Nothing due"),
      heroStat("Next date", nextDate(ms)),
    ]),
    ms.length ? h("div", { class: "p-progress" }, [h("span", { style: `width:${pct}%` })]) : null,
  ].filter(Boolean));

  const actionItems = [];
  if (awaiting.length) {
    actionItems.push({
      text: `${awaiting.length} ${awaiting.length === 1 ? "item is" : "items are"} waiting for your approval`,
      cta: "Review now",
      tab: "files",
    });
  }
  const unpaid = data.invoices.filter((i) => i.status === "sent" || i.status === "overdue");
  if (unpaid.length) {
    actionItems.push({
      text: `${unpaid.length} unpaid invoice${unpaid.length > 1 ? "s" : ""} — ${inr(
        unpaid.reduce((s, i) => s + (Number(i.total) || 0), 0)
      )}`,
      cta: "See invoices",
      tab: "invoices",
    });
  }
  const unread = data.messages.filter((m) => m.authorRole === "admin" && !m.readByClient);
  if (unread.length) {
    actionItems.push({
      text: `${unread.length} new message${unread.length > 1 ? "s" : ""} from Brand Mint`,
      cta: "Read",
      tab: "messages",
    });
  }

  const todo = actionItems.length
    ? card(
        "Over to you",
        null,
        h("div", { class: "p-stack" }, actionItems.map((a) =>
          h("div", { class: "p-row", style: "justify-content:space-between;padding:12px 14px;border:1px solid var(--line);border-radius:12px" }, [
            h("span", { text: a.text }),
            h("button", {
              class: "p-btn p-btn-sm",
              type: "button",
              text: a.cta,
              onclick: () => { activeTab = a.tab; window.location.hash = "#/" + a.tab; paint(); },
            }),
          ])
        ))
      )
    : null;

  const timeline = card(
    "Timeline",
    ms.length ? `${pct}% complete` : null,
    ms.length
      ? h("ul", { class: "p-timeline" }, ms.map(milestoneItem))
      : empty("Nothing scheduled yet", "Your milestones appear here the moment we kick off.")
  );

  mount(view, hero, todo, timeline, briefSummaryCard(data.brief, () => { forceWizard = true; paint(); }));
}

function heroStat(label, value) {
  return h("div", { class: "p-hero-stat" }, [
    h("span", { class: "l", text: label }),
    h("span", { class: "v", text: value }),
  ]);
}

function nextDate(milestones) {
  const upcoming = milestones
    .filter((m) => m.status !== "done" && m.dueDate)
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))[0];
  return upcoming ? dateLong(upcoming.dueDate) : "—";
}

function milestoneItem(m) {
  const d = daysUntil(m.dueDate);
  let when = "";
  // The status already reads as a pill beside the title, so this line carries
  // the date rather than repeating the word.
  if (m.status === "done") when = m.dueDate ? dateLong(m.dueDate) : "Complete";
  else if (d == null) when = "No date set";
  else if (d < 0) when = `${Math.abs(d)} day${Math.abs(d) === 1 ? "" : "s"} overdue`;
  else if (d === 0) when = "Due today";
  else when = `Due ${dateLong(m.dueDate)} · in ${d} day${d === 1 ? "" : "s"}`;

  return h("li", { class: m.status }, [
    h("div", { class: "p-tl-head" }, [
      h("span", { class: "p-tl-title", text: m.title }),
      pill(m.status),
    ]),
    m.detail ? h("div", { class: "p-tl-detail", text: m.detail }) : null,
    h("div", { class: "p-tl-date", text: when }),
  ].filter(Boolean));
}

/* ------------------------------------------------------------------- files */

function renderFiles() {
  const items = data.deliverables;
  if (!items.length) {
    mount(view, card("Files & approvals", null,
      empty("Nothing to review yet", "When we send work across it lands here, and you approve or ask for changes right on the item.")));
    return;
  }

  const awaiting = items.filter((d) => d.status === "awaiting_review");
  const rest = items.filter((d) => d.status !== "awaiting_review");

  mount(
    view,
    awaiting.length
      ? card("Waiting for you", `${awaiting.length} to review`, ...awaiting.map(deliverableCard))
      : null,
    card("Everything we've sent", `${items.length} item${items.length === 1 ? "" : "s"}`,
      rest.length ? h("div", {}, rest.map(deliverableCard)) : empty("All caught up", "Nothing else to show yet."))
  );
}

function deliverableCard(d) {
  const needsYou = d.status === "awaiting_review";
  const href = safeUrl(d.url);

  return h("article", { class: "p-deliverable" + (needsYou ? " needs-you" : "") }, [
    h("div", { class: "p-row", style: "justify-content:space-between;align-items:flex-start" }, [
      h("div", {}, [
        h("h3", { text: d.title }),
        d.description ? h("div", { class: "desc", text: d.description }) : null,
      ].filter(Boolean)),
      pill(d.status, d.status === "awaiting_review" ? "Needs your review" : humanise(d.status)),
    ]),

    d.status === "revision_requested" && d.revisionNote
      ? h("div", { class: "p-note" }, [
          h("strong", { text: "Changes you asked for" }),
          h("span", { text: d.revisionNote }),
        ])
      : null,

    h("div", { class: "row" }, [
      href
        ? h("a", {
            class: "p-btn p-btn-sm",
            href,
            target: "_blank",
            rel: "noopener noreferrer",
            text: d.kind === "document" ? "Open document" : d.kind === "preview" ? "Open preview" : d.kind === "link" ? "Open link" : "Download",
          })
        : h("span", { class: "p-muted", style: "font-size:13px", text: "No link attached — ask us for it in Messages." }),

      needsYou
        ? h("button", {
            class: "p-btn p-btn-sm p-btn-primary",
            type: "button",
            text: d.kind === "document" ? "I've signed this" : "Approve",
            onclick: () => confirmApprove(d),
          })
        : null,
      needsYou
        ? h("button", {
            class: "p-btn p-btn-sm p-btn-danger",
            type: "button",
            text: "Request changes",
            onclick: () => openRevision(d),
          })
        : null,

      h("span", { class: "p-spacer" }),
      h("span", {
        class: "p-muted p-mono",
        style: "font-size:11.5px",
        text: `v${d.version || 1} · ${d.reviewedAt ? "reviewed " + relTime(d.reviewedAt) : relTime(d.createdAt)}`,
      }),
    ].filter(Boolean)),
  ].filter(Boolean));
}

function confirmApprove(d) {
  modal({
    title: `Approve "${d.title}"?`,
    body: h("p", { class: "p-muted", text:
      "This tells us it's signed off and we move on to the next stage. You can still message us if something comes up." }),
    actions: [
      { label: "Cancel" },
      {
        label: "Yes, approve",
        primary: true,
        onClick: async (close) => {
          close();
          try {
            await reviewDeliverable(d.id, "approve");
            toast("Approved — thank you.");
            await refresh();
          } catch (e) {
            console.error("[portal] approve", e);
            toast("Couldn't record that. Try again in a moment.", 4500);
          }
        },
      },
    ],
  });
}

function openRevision(d) {
  const input = h("textarea", {
    class: "p-input",
    placeholder: "What needs to change? The more specific, the fewer rounds this takes.",
  });
  modal({
    title: `Request changes to "${d.title}"`,
    body: h("div", {}, [
      h("p", { class: "p-muted", style: "margin-top:0", text: "We'll get a note with this and send a new version." }),
      input,
    ]),
    actions: [
      { label: "Cancel" },
      {
        label: "Send request",
        danger: true,
        onClick: async (close) => {
          const note = input.value.trim();
          if (!note) { toast("Tell us what to change first."); return; }
          close();
          try {
            await reviewDeliverable(d.id, "revise", note);
            await postMessage(`Requested changes to "${d.title}": ${note}`, d.projectId || null);
            toast("Sent — we're on it.");
            await refresh();
          } catch (e) {
            console.error("[portal] revision", e);
            toast("Couldn't send that. Try again in a moment.", 4500);
          }
        },
      },
    ],
  });
}

/* ---------------------------------------------------------------- invoices */

function renderInvoices() {
  const rows = data.invoices.filter((i) => i.status !== "draft");
  if (!rows.length) {
    mount(view, card("Invoices", null, empty("No invoices yet", "Anything we raise will show up here with its payment status.")));
    return;
  }

  const outstanding = rows
    .filter((i) => i.status !== "paid")
    .reduce((s, i) => s + (Number(i.total) || 0), 0);

  const tableEl = h("div", { class: "p-table-scroll" }, [
    h("table", { class: "p-table" }, [
      h("thead", {}, h("tr", {}, [
        h("th", { text: "Invoice" }),
        h("th", { text: "Issued" }),
        h("th", { text: "Due" }),
        h("th", { text: "Status" }),
        h("th", { class: "num", text: "Amount" }),
      ])),
      h("tbody", {}, rows.map((i) => {
        const overdue = i.status !== "paid" && daysUntil(i.dueDate) < 0;
        return h("tr", {}, [
          h("td", {}, [
            h("div", { class: "p-mono", text: i.number || "—" }),
            i.paidOn ? h("div", { class: "p-muted", style: "font-size:12px", text: `Paid ${dateLong(i.paidOn)}` }) : null,
          ].filter(Boolean)),
          h("td", { text: dateLong(i.issueDate) }),
          h("td", { text: dateLong(i.dueDate) }),
          h("td", {}, pill(overdue ? "overdue" : i.status)),
          h("td", { class: "num", text: inr(i.total) }),
        ]);
      })),
    ]),
  ]);

  mount(
    view,
    card(
      "Invoices",
      outstanding ? `${inr(outstanding)} outstanding` : "All settled",
      tableEl,
      h("p", { class: "p-muted", style: "font-size:13px;margin:16px 0 0", text:
        "Payment details are on each invoice we email you. Questions about a line item? Send us a message and we'll sort it." })
    )
  );
}

/* ---------------------------------------------------------------- messages */

function renderMessages() {
  const rows = data.messages;

  const thread = h("div", { class: "p-thread" },
    rows.length
      ? rows.map((m) =>
          h("div", { class: "p-msg from-" + (m.authorRole === "admin" ? "admin" : "client") }, [
            h("span", { class: "who", text: m.authorRole === "admin" ? "Brand Mint" : "You" }),
            h("span", { text: m.body }),
            h("span", { class: "when", text: relTime(m.createdAt) }),
          ])
        )
      : [empty("No messages yet", "Anything you send here reaches the team working on your project.")]
  );

  const input = h("textarea", { class: "p-input", placeholder: "Write a message…", rows: "2" });
  const send = h("button", { class: "p-btn p-btn-primary", type: "button", text: "Send" });

  send.addEventListener("click", async () => {
    const body = input.value.trim();
    if (!body) return;
    send.disabled = true;
    try {
      await postMessage(body);
      input.value = "";
      await refresh();
    } catch (e) {
      console.error("[portal] message", e);
      toast("Couldn't send that. Try again in a moment.", 4500);
    } finally {
      send.disabled = false;
    }
  });

  input.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send.click();
  });

  mount(view, card("Messages", "Straight to the team on your project", thread,
    h("div", { class: "p-composer" }, [input, send])));

  thread.scrollTop = thread.scrollHeight;

  // Seeing them counts as reading them; do it after paint so the write can't
  // re-enter this render.
  const unread = rows.filter((m) => m.authorRole === "admin" && !m.readByClient);
  if (unread.length) {
    setTimeout(async () => {
      try {
        await markThreadRead(rows);
        for (const m of unread) m.readByClient = true;
        paintTabs();
      } catch (e) {
        console.warn("[portal] mark read", e);
      }
    }, 400);
  }
}

/* -------------------------------------------------------------------- go */

boot().catch((e) => {
  console.error("[portal] boot", e);
  const bootEl = document.getElementById("boot");
  if (bootEl) bootEl.innerHTML = "";
  if (bootEl) {
    bootEl.appendChild(
      h("div", {}, [
        h("p", { text: "We couldn't open your workspace." }),
        h("p", { class: "p-muted", style: "font-size:13px", text: e?.message || "" }),
        h("a", { class: "p-btn", href: "/login", text: "Back to sign in" }),
      ])
    );
  }
});
