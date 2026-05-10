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

/* ---------- Init ---------- */

async function boot() {
  const gate = document.getElementById("auth-gate");
  if (gate) gate.hidden = true;
  document.getElementById("app").hidden = false;
  seedIfEmpty();
  await renderRoute();
}

window.addEventListener("hashchange", renderRoute);

// Auth disabled — always boot straight into the dashboard.
await boot();

// Expose for debugging in the console
window.bm = { db, auth, ctx };
