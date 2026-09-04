/**
 * Brand Mint Admin — App entry & router.
 *
 * Boot sequence:
 *   1. Decide auth state. Show gate if no valid session.
 *   2. On unlock, seed first-run demo data, mount shell.
 *   3. Hash router resolves to a module; module renders into #view.
 */

import { auth } from "/admin/auth.js";
import { db, seedIfEmpty, setToastHandle } from "/admin/db.js";
import {
  renderSidebar,
  renderTopbar,
  mount,
  h,
  toast,
  setSidebarAccount,
} from "/admin/components.js";
import { openPalette } from "/admin/palette.js";

// Let the data layer surface sync errors via the topbar toast.
setToastHandle(toast);

const routes = {
  dashboard: () => import("/admin/modules/dashboard.js"),
  leads:     () => import("/admin/modules/leads.js"),
  pipeline:  () => import("/admin/modules/pipeline.js"),
  onboarding: () => import("/admin/modules/onboarding.js"),
  clients:   () => import("/admin/modules/clients.js"),
  delivery:  () => import("/admin/modules/delivery.js"),
  invoices:  () => import("/admin/modules/invoices.js"),
  settings:  () => import("/admin/modules/settings.js"),
  analytics: () => import("/admin/modules/analytics.js"),
  heatmap:   () => import("/admin/modules/heatmap.js"),
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
    // Things the client is waiting on you for, or you on them.
    const briefsToRead = db.list(
      "onboardingResponses",
      (r) => r.status === "submitted" && !r.reviewedAt
    ).length;
    const awaitingReview = db.list("deliverables", { status: "awaiting_review" }).length;
    const revisions = db.list("deliverables", { status: "revision_requested" }).length;
    renderSidebar(activeRoute(), {
      leads: leadCount || null,
      invoices: overdueInvoices || null,
      onboarding: briefsToRead || null,
      delivery: revisions || awaitingReview || null,
    });
  },
  logout() {
    // signOut() navigates away; no reload needed.
    auth.endSession();
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
  // Gate first. requireAdmin() navigates away (and never resolves) when the
  // visitor is not a signed-in admin, so nothing below runs for them.
  const profile = await auth.requireAdmin();

  const bootScreen = document.getElementById("boot");
  if (bootScreen) bootScreen.remove();
  document.getElementById("app").hidden = false;
  document.getElementById("view").innerHTML =
    '<div class="view-loading">Loading your data…</div>';

  ctx.profile = profile;
  setSidebarAccount(profile.email || "Signed in", () => ctx.logout());

  await db.hydrate();
  // Demo data is NOT seeded automatically any more. On Supabase this ran on
  // first boot; against a real Firebase project it would write fake clients
  // ("Verdant Foods" and friends) into live data. Run `bm.seed()` from the
  // console if you want the sample set to look around.
  await renderRoute();

  // Being signed out in another tab must not leave this one showing data.
  auth.onChange((event) => {
    if (event === "SIGNED_OUT") window.location.replace("/login?signedout=1");
  });
}

window.addEventListener("hashchange", renderRoute);

/* ---------- Keyboard shortcuts ---------- */

const NAV_KEYS = {
  d: "dashboard",
  e: "leads",
  p: "pipeline",
  o: "onboarding",
  c: "clients",
  v: "delivery",
  i: "invoices",
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

boot().catch((err) => {
  // requireAdmin() navigates away on a genuine auth failure, so reaching here
  // means the check itself could not complete — offline, a blocked CDN, or
  // Firebase being unreachable. Say so instead of spinning forever.
  console.error("[admin] boot failed", err);
  const bootScreen = document.getElementById("boot");
  if (!bootScreen) return;
  bootScreen.innerHTML = "";
  bootScreen.appendChild(
    h("div", { class: "boot-inner" }, [
      h("div", { class: "boot-mark", style: "animation:none", html: document.querySelector(".sidebar-brand svg")?.outerHTML || "" }),
      h("p", { text: "We couldn't verify your access." }),
      h("p", {
        class: "muted",
        style: "font-size:13px;max-width:34ch;margin:0 auto 16px",
        text: err?.message || "Check your connection and try again.",
      }),
      h("div", { class: "hstack", style: "justify-content:center" }, [
        h("button", { class: "btn btn-primary", text: "Retry", onclick: () => location.reload() }),
        h("a", { class: "btn btn-ghost", href: "/login", text: "Sign in again" }),
      ]),
    ])
  );
});

// Expose helpers for the topbar palette trigger + console debugging.
window.bm = { db, auth, ctx, seed: seedIfEmpty, openPalette: () => openPalette(ctx) };
