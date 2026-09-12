/**
 * Admin → Form Leads
 *
 * View captured leads from form auto-saves and submissions.
 * Track: partial fills, submissions, WhatsApp sent status, responses.
 */

import { firebaseConfig } from "../../firebase/config.js";
import { h, renderTopbar, tile, tileGrid } from "/admin/components.js";

/** firestore.rules lets anyone create a formLeads document — that is how an
 *  abandoned form fill gets captured. Every field below is therefore written
 *  by a stranger, and this page builds its table with innerHTML, so a name of
 *  `<img onerror=...>` would run in the studio's own admin session. */
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
import { getProfile } from "../../auth/session.js";

// The router calls mod.render(ctx) — exported under any other name, the page
// only ever shows "Module is missing a render() export".
export async function render() {
  const root = document.createElement("div");
  root.className = "module module-leads";

  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    root.innerHTML = "<p>Admin access required.</p>";
    return root;
  }

  // This page drew its own heading while every other page uses the shell's
  // topbar, so it sat a little lower than the rest and had no breadcrumb.
  renderTopbar({
    breadcrumb: "WORKSPACE",
    title: "Form leads",
    actions: [],
  });

  root.innerHTML = `
    <div id="fl-tiles"></div>

    <div class="leads-filters">
      <label>
        <span>Status</span>
        <select id="status-filter">
          <option value="">All</option>
          <option value="draft">Draft (abandoned)</option>
          <option value="submitted">Submitted</option>
        </select>
      </label>
      <label>
        <span>Sort</span>
        <select id="sort-filter">
          <option value="recent">Most recent</option>
          <option value="oldest">Oldest</option>
        </select>
      </label>
    </div>

    <div id="leads-list" class="leads-table">
      <div class="loading">Loading leads…</div>
    </div>
  `;

  const tilesHost = root.querySelector("#fl-tiles");
  const listEl = root.querySelector("#leads-list");
  const statusFilter = root.querySelector("#status-filter");
  const sortFilter = root.querySelector("#sort-filter");

  const renderLeads = async () => {
    const status = statusFilter.value;
    const sort = sortFilter.value;

    try {
      const url = new URL(
        `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/formLeads`,
        location.origin
      );
      url.searchParams.set("key", firebaseConfig.apiKey);

      if (status) {
        url.searchParams.set(
          "pageSize",
          "100"
        );
      }

      const response = await fetch(url);
      const data = await response.json();

      const docs = (data.documents || []).map((d) => ({
        id: d.name.split("/").pop(),
        ...Object.fromEntries(
          Object.entries(d.fields).map(([k, v]) => [
            k,
            v.stringValue || v.booleanValue || v.integerValue || "",
          ])
        ),
      }));

      let filtered = docs;
      if (status) {
        filtered = docs.filter((d) => d.status === status);
      }

      if (sort === "oldest") {
        filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      } else {
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }

      const submitted = docs.filter((d) => d.status === "submitted");
      const drafts = docs.filter((d) => d.status === "draft");
      const setFilter = (v) => {
        statusFilter.value = v;
        renderLeads();
      };
      tilesHost.replaceChildren(
        tileGrid([
          tile({
            label: "All leads",
            value: docs.length,
            sub: "captured from the site",
            items: docs,
            seenKey: "formLeads.all",
            onclick: () => setFilter(""),
          }),
          tile({
            label: "Submitted",
            value: submitted.length,
            sub: submitted.length ? "sent the form" : "none yet",
            tone: "good",
            items: submitted,
            seenKey: "formLeads.submitted",
            onclick: () => setFilter("submitted"),
          }),
          tile({
            label: "Abandoned",
            value: drafts.length,
            sub: drafts.length ? "started, never sent" : "none",
            tone: "attention",
            items: drafts,
            seenKey: "formLeads.draft",
            onclick: () => setFilter("draft"),
          }),
        ])
      );

      if (filtered.length === 0) {
        listEl.innerHTML = "<p class='empty'>No leads found.</p>";
        return;
      }

      listEl.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Service</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${filtered
              .map(
                (d) => `
              <tr>
                <td>${esc(d.name) || "—"}</td>
                <td><a href="https://wa.me/${esc(String(d.phone || "").replace(/\D/g, ""))}" target="_blank" rel="noopener">${esc(d.phone)}</a></td>
                <td>${esc(d.email) || "—"}</td>
                <td>${esc(d.service) || "—"}</td>
                <td><span class="badge badge-${esc(d.status)}">${esc(d.status)}</span></td>
                <td>${d.submittedAt ? "✓" : "—"}</td>
                <td>
                  <button class="btn btn-sm btn-ghost" data-action="view" data-id="${esc(d.id)}">View</button>
                  ${d.status === "submitted" ? `<button class="btn btn-sm btn-primary" data-action="campaign" data-id="${esc(d.id)}">Campaign</button>` : ""}
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;

      listEl.querySelectorAll("[data-action]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const action = e.target.dataset.action;
          const id = e.target.dataset.id;
          if (action === "view") showLeadDetail(id, filtered);
          if (action === "campaign") showCampaignModal(id, filtered);
        });
      });
    } catch (e) {
      console.error("[form-leads]", e.message);
      listEl.innerHTML = `<p class='error'>Failed to load leads: ${e.message}</p>`;
    }
  };

  statusFilter.addEventListener("change", renderLeads);
  sortFilter.addEventListener("change", renderLeads);

  renderLeads();
  return root;
}

function showLeadDetail(id, leads) {
  const lead = leads.find((l) => l.id === id);
  if (!lead) return;

  alert(`
Lead: ${lead.name}
Phone: ${lead.phone}
Email: ${lead.email}
Service: ${lead.service}
Message: ${lead.message}
Status: ${lead.status}
Created: ${lead.createdAt}
${lead.submittedAt ? `Submitted: ${lead.submittedAt}` : ""}
  `.trim());
}

function showCampaignModal(id, leads) {
  const lead = leads.find((l) => l.id === id);
  if (!lead) return;

  const msg = prompt(
    `Send WhatsApp to ${lead.name}?\n\nDefaults to:\n\nHi ${lead.name}! Thanks for your interest in ${lead.service}. Ready to discuss? Reply here or call +91 77999 34943`,
    `Hi ${lead.name}! Thanks for your interest in ${lead.service}. Ready to discuss? Reply here or call +91 77999 34943`
  );

  if (!msg) return;

  // In a full implementation, this would trigger api/form-wa-trigger.js
  console.log(`[campaign] Would send to ${lead.phone}:`, msg);
  alert("Campaign ready. Integrate with Evolution API to send.");
}
