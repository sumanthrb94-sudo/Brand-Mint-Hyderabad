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
  logout() {
    auth.endSession();
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

/* ---------- Auth gate ---------- */

function showGate() {
  document.getElementById("auth-gate").hidden = false;
  document.getElementById("app").hidden = true;
  const form = document.getElementById("auth-form");
  const input = document.getElementById("auth-input");
  const err = document.getElementById("auth-err");
  const skip = document.getElementById("auth-skip");
  const reset = document.getElementById("auth-reset");
  err.hidden = true;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    err.hidden = true;
    const ok = await auth.verify(input.value);
    if (ok) {
      auth.startSession();
      await boot();
    } else {
      err.hidden = false;
      input.select();
    }
  });

  skip.addEventListener("click", async () => {
    auth.startSession();
    await boot();
  });

  reset.addEventListener("click", (e) => {
    e.preventDefault();
    auth.resetToDefault();
    err.hidden = true;
    input.value = "";
    input.placeholder = " ";
    toast("Passcode reset. Default is brandmint2026.");
    input.focus();
  });
}

async function boot() {
  document.getElementById("auth-gate").hidden = true;
  document.getElementById("app").hidden = false;
  seedIfEmpty();
  await renderRoute();
}

/* ---------- Init ---------- */

window.addEventListener("hashchange", renderRoute);

if (auth.isSessionValid()) {
  await boot();
} else {
  showGate();
}

// Expose for debugging in the console
window.bm = { db, auth, ctx };
