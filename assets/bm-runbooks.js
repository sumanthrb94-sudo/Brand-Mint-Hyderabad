/**
 * Every runbook, and the drawer that shows one.
 *
 * WHY THIS EXISTS
 * ---------------
 * "How do I get the UID?" was asked, answered once in a message, and then
 * lost. The next time it will be re-derived, slightly differently, and one of
 * those derivations will be wrong — a mistyped UID, or an Auth user created
 * without the users document, which signs in fine and shows a blank portal.
 *
 * A procedure that lives in someone's memory is a procedure that decays. These
 * live next to the thing they describe: a Help button on every service on
 * /services, and on the panels in /studio where the procedure actually bites.
 *
 * Runbooks are DATA, not prose in a doc. That means they can be checked — the
 * test suite asserts every service has one, that none of them asks anyone for
 * a password or an API key, and that every step says where it happens.
 */

import OPS_RUNBOOKS from "./runbooks/ops.js";

export { OPS_RUNBOOKS };

/**
 * The service playbooks load dynamically, one file per category group, and a
 * file that fails to load is caught rather than allowed to throw.
 *
 * A static import of five files means all five must exist or the importing
 * module never evaluates — which would take /services and /studio down
 * completely, over missing documentation. The blast radius of a missing
 * playbook should be that one service says it has no playbook yet, not that
 * the admin console renders a white page.
 *
 * This is the same rule as everywhere else here: a partial state must degrade
 * to something honest, never to something broken or something that looks fine.
 */
const GROUPS = [
  "./runbooks/foundation-catalog.js",
  "./runbooks/commerce-fulfilment.js",
  "./runbooks/support-content.js",
  "./runbooks/growth-platform.js",
];

export const SERVICE_RUNBOOKS = {};
export const ALL_RUNBOOKS = { ...OPS_RUNBOOKS };

/** Groups that failed to load, so the UI can say so rather than imply absence. */
export const LOAD_ERRORS = [];

let loading = null;

export function loadRunbooks() {
  if (loading) return loading;
  loading = Promise.all(
    GROUPS.map((path) =>
      import(path)
        .then((m) => m.RUNBOOKS || m.default || {})
        .catch((err) => {
          LOAD_ERRORS.push({ path, message: String(err && err.message) });
          return {};
        })
    )
  ).then((groups) => {
    for (const group of groups) {
      Object.assign(SERVICE_RUNBOOKS, group);
      Object.assign(ALL_RUNBOOKS, group);
    }
    return ALL_RUNBOOKS;
  });
  return loading;
}

export function getRunbook(id) {
  return ALL_RUNBOOKS[id] || null;
}

export function hasRunbook(id) {
  return Boolean(ALL_RUNBOOKS[id]);
}

/* ─────────────────────── the drawer ─────────────────────── */

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
  );

const WHERE_LABEL = {
  repo: "In our app",
  local: "On your machine",
  Vercel: "Vercel",
  "Firebase Console": "Firebase Console",
  Razorpay: "Razorpay",
  "Meta Business": "Meta Business Suite",
  Google: "Google",
  client: "With the client",
};

function list(items, className = "") {
  if (!items || !items.length) return "";
  return `<ul class="bm-rb-list ${className}">${items
    .map((i) => `<li>${esc(i)}</li>`)
    .join("")}</ul>`;
}

function section(title, inner, note) {
  if (!inner) return "";
  return `<section class="bm-rb-section">
    <h3 class="bm-rb-h">${esc(title)}</h3>
    ${note ? `<p class="bm-rb-note">${esc(note)}</p>` : ""}
    ${inner}
  </section>`;
}

function stepsHtml(steps) {
  if (!steps || !steps.length) return "";
  return `<ol class="bm-rb-steps">${steps
    .map(
      (s) => `<li>
        <div class="bm-rb-step-head">
          <span class="bm-rb-do">${esc(s.do)}</span>
          ${s.where ? `<span class="bm-pill bm-pill--mute">${esc(WHERE_LABEL[s.where] || s.where)}</span>` : ""}
        </div>
        ${s.detail ? `<p class="bm-rb-detail">${esc(s.detail)}</p>` : ""}
      </li>`
    )
    .join("")}</ol>`;
}

export function runbookHtml(id, meta = {}) {
  const rb = getRunbook(id);
  if (!rb) {
    // Never render a confident-looking empty page. Say what is missing.
    const failed = LOAD_ERRORS.length
      ? `<p class="bm-rb-note">${LOAD_ERRORS.length} playbook file(s) failed to load, so this may exist
         but be unreachable: ${esc(LOAD_ERRORS.map((e) => e.path).join(", "))}</p>`
      : "";
    return `<div class="bm-rb-missing">
      <h2 class="bm-rb-title" id="bm-rb-title">No playbook yet</h2>
      ${failed}
      <p>There is no runbook for <code>${esc(id)}</code>. That is a gap, not a service without steps —
      write one in <code>assets/runbooks/</code> before selling this.</p>
    </div>`;
  }

  const title = meta.label || rb.label || id;

  return `
    <header class="bm-rb-top">
      <p class="bm-eyebrow">Playbook</p>
      <h2 class="bm-rb-title" id="bm-rb-title">${esc(title)}</h2>
      <p class="bm-rb-summary">${esc(rb.summary)}</p>
      ${
        meta.buildDays
          ? `<p class="bm-rb-meta">${esc(String(meta.buildDays))} build days${
              meta.needsServer ? " · needs a server" : ""
            }</p>`
          : ""
      }
    </header>

    ${section("Before you start", list(rb.prerequisites))}
    ${section(
      "What you need from the client",
      list(rb.fromClient),
      "Access is always delegated — they add hello@brandmintstudios.in as a user on their own account. We never ask anyone to send a password, key or token."
    )}
    ${section("Steps", stepsHtml(rb.steps))}
    ${section("How you know it worked", list(rb.verify, "bm-rb-list--ok"))}
    ${section("What goes wrong", list(rb.traps, "bm-rb-list--bad"))}
    ${section("What the client gets", list(rb.handover))}
  `;
}

/**
 * Mounts a single drawer for the page and returns { open }.
 *
 * One drawer, reused — not one per card. Forty-three hidden dialogs in the DOM
 * is forty-three chances for a duplicate id, and the content is regenerated on
 * open anyway.
 */
export function mountRunbookDrawer() {
  if (document.getElementById("bm-rb-drawer")) {
    return { open: window.__bmOpenRunbook };
  }

  const scrim = document.createElement("div");
  scrim.className = "bm-rb-scrim";
  scrim.hidden = true;

  const drawer = document.createElement("aside");
  drawer.id = "bm-rb-drawer";
  drawer.className = "bm-rb-drawer";
  drawer.hidden = true;
  drawer.setAttribute("role", "dialog");
  drawer.setAttribute("aria-modal", "true");
  drawer.setAttribute("aria-labelledby", "bm-rb-title");
  drawer.innerHTML = `
    <button class="bm-rb-close" type="button" aria-label="Close playbook">&times;</button>
    <div class="bm-rb-body" id="bm-rb-body"></div>
  `;

  document.body.append(scrim, drawer);

  let lastFocused = null;

  function close() {
    drawer.hidden = true;
    scrim.hidden = true;
    document.body.style.overflow = "";
    // Focus goes back where it came from, or a keyboard user is dumped at the
    // top of the document with no idea what just happened.
    if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
  }

  async function open(id, meta) {
    lastFocused = document.activeElement;
    const body = document.getElementById("bm-rb-body");

    // Shown while the playbook file loads. Deliberately not the empty state —
    // "no playbook yet" and "not loaded yet" are different facts.
    body.innerHTML = '<p class="bm-rb-summary">Loading the playbook…</p>';
    drawer.hidden = false;
    scrim.hidden = false;
    document.body.style.overflow = "hidden";
    drawer.scrollTop = 0;
    drawer.querySelector(".bm-rb-close").focus();

    await loadRunbooks();
    body.innerHTML = runbookHtml(id, meta);
  }

  scrim.addEventListener("click", close);
  drawer.querySelector(".bm-rb-close").addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !drawer.hidden) close();
  });

  window.__bmOpenRunbook = open;
  return { open, close };
}

/**
 * Delegated click handler for any element carrying data-runbook="<id>".
 * Delegated so it survives a re-render — binding per button means a second
 * listener on every pass.
 */
export function bindRunbookButtons(root = document) {
  const { open } = mountRunbookDrawer();
  // Warm the cache now rather than on the first click.
  loadRunbooks();

  /* Capture phase, and it stops propagation.
     On /services each card is itself role="button" and toggles selection, so a
     Help button sitting inside one would open the playbook AND silently add
     the service to the quote. Bubbling would not save us: the card's own
     delegated listener is closer to the target than this one and fires first.
     Capturing at the root means this runs before any of them. */
  const handle = (event) => {
    const btn = event.target.closest("[data-runbook]");
    if (!btn) return;
    if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    open(btn.getAttribute("data-runbook"), {
      label: btn.getAttribute("data-runbook-label") || "",
      buildDays: btn.getAttribute("data-runbook-days") || "",
      needsServer: btn.getAttribute("data-runbook-server") === "1",
    });
  };

  root.addEventListener("click", handle, true);
  root.addEventListener("keydown", handle, true);
}
