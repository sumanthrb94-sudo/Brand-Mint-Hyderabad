/**
 * Brand Mint Admin — App entry & router.
 *
 * Boot sequence:
 *   1. Decide auth state. Show gate if no valid session.
 *   2. On unlock, seed first-run demo data, mount shell.
 *   3. Hash router resolves to a module; module renders into #view.
 */

import { auth } from "/admin/auth.js";
import { db, seedIfEmpty } from "/admin/db.js";
import { renderSidebar, renderTopbar, mount, h, toast } from "/admin/components.js";
import { openPalette } from "/admin/palette.js";

const routes = {
  dashboard: () => import("/admin/modules/dashboard.js"),
  leads:     () => import("/admin/modules/leads.js"),
  pipeline:  () => import("/admin/modules/pipeline.js"),
  clients:   () => import("/admin/modules/clients.js"),
  invoices:  () => import("/admin/modules/invoices.js"),
  content:   () => import("/admin/modules/content.js"),
  metrics:   () => import("/admin/modules/metrics.js"),
  "brand-kit": () => import("/admin/modules/brand-kit.js"),
  documents: () => import("/admin/modules/documents.js"),
  settings:  () => import("/admin/modules/settings.js"),
};

const ctx = {
  db,
  auth,
  navigate(route) {
    window.location.hash = route.startsWith("#") ? route : "#/" + route;
  },
  toast,
  refreshSidebar() {
    const leadCount = db.list("leads", { status: "new" }).length;
    const overdueInvoices = db.list("invoices", { status: "overdue" }).length;
    renderSidebar(activeRoute(), {
      leads: leadCount || null,
      invoices: overdueInvoices || null,
    });
  },
  async logout() {
    await auth.signOut();
    location.reload();
  },
};

function activeRoute() {
  const hash = window.location.hash.replace(/^#\/?/, "") || "dashboard";
  return hash.split("/")[0];
}

async function renderRoute() {
  const route = activeRoute();
  const view = document.getElementById("view");
  ctx.refreshSidebar();

  const loader = routes[route] || routes.dashboard;
  try {
    const mod = await loader();
    mount(view, h("div", { class: "view-loading", text: "Loading…" }));
    if (typeof mod.render === "function") {
      const node = await mod.render(ctx);
      mount(view, node || h("div", { text: "Module returned nothing." }));
    } else {
      mount(view, h("div", { class: "empty", text: "Module is missing a render() export." }));
    }
  } catch (err) {
    console.error("[admin] render error", err);
    mount(
      view,
      h("div", { class: "panel" }, [
        h("h3", { text: "Something broke loading this view" }),
        h("p", { class: "muted", text: String(err && err.message ? err.message : err) }),
        h("button", { class: "btn btn-ghost", text: "Retry", onclick: renderRoute }),
      ])
    );
  }
}

/* ---------- Init ---------- */

function renderGate(state, errorMessage) {
  const gate = document.getElementById("auth-gate");
  const app = document.getElementById("app");
  if (!gate) return;
  app.hidden = true;
  gate.hidden = false;
  const err = gate.querySelector(".gate-error");
  if (err) {
    err.textContent = errorMessage || "";
    err.hidden = !errorMessage;
  }
  const subm = gate.querySelector("button[type=submit]");
  if (subm) {
    subm.disabled = state === "busy";
    subm.querySelector(".btn-label").textContent =
      state === "busy" ? "Signing in…" : "Sign in";
  }
}

async function showApp() {
  document.getElementById("auth-gate").hidden = true;
  document.getElementById("app").hidden = false;
  document.getElementById("view").innerHTML =
    '<div class="view-loading">Loading your data…</div>';
  await db.hydrate();
  await seedIfEmpty();
  await renderRoute();
}

async function boot() {
  const state = await auth.bootstrap();
  if (!state.configured) {
    // No Supabase config — fall through to offline-only mode (cache lives in
    // localStorage). Gate isn't useful here.
    document.getElementById("auth-gate").hidden = true;
    document.getElementById("app").hidden = false;
    document.getElementById("view").innerHTML =
      '<div class="view-loading">Loading your data…</div>';
    await db.hydrate();
    await seedIfEmpty();
    await renderRoute();
    return;
  }
  if (state.user && state.isAdmin) {
    await showApp();
    return;
  }

  renderGate("idle");
  const form = document.getElementById("gate-form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value;
    const password = form.password.value;
    renderGate("busy");
    try {
      await auth.signIn(email, password);
      await showApp();
    } catch (err) {
      renderGate("idle", err.message || "Sign-in failed.");
    }
  });
}

window.addEventListener("hashchange", renderRoute);

/* ---------- Keyboard shortcuts ---------- */

const NAV_KEYS = {
  d: "dashboard",
  e: "leads",
  p: "pipeline",
  c: "clients",
  i: "invoices",
  n: "content",
  m: "metrics",
  b: "brand-kit",
  u: "documents",
  s: "settings",
};

let lastGAt = 0;

function isTyping(e) {
  const tag = (e.target?.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (e.target?.isContentEditable) return true;
  return false;
}

window.addEventListener("keydown", (e) => {
  // ⌘K / Ctrl+K — open palette (works anywhere)
  if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
    e.preventDefault();
    openPalette(ctx);
    return;
  }
  // "/" — open palette when not already typing
  if (e.key === "/" && !isTyping(e)) {
    e.preventDefault();
    openPalette(ctx);
    return;
  }

  if (isTyping(e)) return;

  // g <key> sequence navigation, Vim/GitHub style
  if (e.key === "g") {
    lastGAt = Date.now();
    return;
  }
  if (Date.now() - lastGAt < 1500 && NAV_KEYS[e.key]) {
    e.preventDefault();
    ctx.navigate("/" + NAV_KEYS[e.key]);
    lastGAt = 0;
  }
});

// Auth disabled — always boot straight into the dashboard.
await boot();

// Expose helpers for the topbar palette trigger + console debugging.
window.bm = { db, auth, ctx, openPalette: () => openPalette(ctx) };
