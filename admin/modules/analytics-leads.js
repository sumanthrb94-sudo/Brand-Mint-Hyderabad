/**
 * Admin → Lead Analytics
 *
 * Track form → WhatsApp → response conversion metrics.
 * Real-time stats: forms captured, submitted, messages sent, responses, conversion rate.
 */

import { getProfile } from "../../auth/session.js";
import { renderTopbar } from "/admin/components.js";
import { firebaseConfig } from "../../firebase/config.js";

export async function render(ctx) {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    return createEl("p", "Admin access required.");
  }

  renderTopbar({ breadcrumb: "INSIGHT", title: "Lead analytics", actions: [] });

  const root = createEl("div", { class: "module module-analytics-leads" });

  root.innerHTML = `
    <div class="module-head"><p>Track form captures, WhatsApp sends, and response conversions</p></div>

    <div class="analytics-grid">
      <div class="stat-card">
        <div class="stat-value" id="stat-forms">0</div>
        <div class="stat-label">Forms Captured</div>
        <div class="stat-detail" id="detail-forms">0 submitted</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="stat-messages">0</div>
        <div class="stat-label">Messages Sent</div>
        <div class="stat-detail" id="detail-messages">0 delivered</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="stat-responses">0</div>
        <div class="stat-label">Responses Received</div>
        <div class="stat-detail" id="detail-responses">0% response rate</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="stat-conversion">0%</div>
        <div class="stat-label">Conversion Rate</div>
        <div class="stat-detail" id="detail-conversion">form → response</div>
      </div>
    </div>

    <div class="analytics-section">
      <h3>Form Captures by Status</h3>
      <div class="chart-placeholder" id="form-status-chart">
        <canvas id="form-status-canvas"></canvas>
      </div>
      <div id="form-status-table" class="stats-table">
        <div class="empty">Loading...</div>
      </div>
    </div>

    <div class="analytics-section">
      <h3>Campaign Performance</h3>
      <div id="campaigns-table" class="stats-table">
        <div class="empty">No active campaigns.</div>
      </div>
    </div>

    <div class="analytics-section">
      <h3>Lead Sources</h3>
      <div class="chart-placeholder" id="source-chart">
        <canvas id="source-canvas"></canvas>
      </div>
      <div id="source-table" class="stats-table">
        <div class="empty">Loading...</div>
      </div>
    </div>

    <div class="analytics-section">
      <h3>Recent Messages</h3>
      <div id="recent-messages" class="messages-list">
        <div class="empty">No messages yet.</div>
      </div>
    </div>
  `;

  // Load analytics data
  loadAnalytics(root);

  // Refresh every 30 seconds
  setInterval(() => loadAnalytics(root), 30000);

  return root;
}

async function loadAnalytics(root) {
  try {
    // Fetch all collections
    const [formLeads, waMessages, campaigns, waInbound] = await Promise.all([
      fetchCollection("formLeads"),
      fetchCollection("formWaMessages"),
      fetchCollection("campaigns"),
      fetchCollection("waMessages"),
    ]);

    // Calculate stats
    const submitted = formLeads.filter((f) => f.status === "submitted").length;
    const draft = formLeads.filter((f) => f.status === "draft").length;
    const totalForms = formLeads.length;
    const totalMessages = waMessages.length;
    const responses = waInbound.length;
    const conversionRate =
      totalMessages > 0 ? Math.round((responses / totalMessages) * 100) : 0;

    // Update main cards
    root.querySelector("#stat-forms").textContent = totalForms;
    root.querySelector("#detail-forms").textContent = `${submitted} submitted, ${draft} draft`;

    root.querySelector("#stat-messages").textContent = totalMessages;
    const delivered = waMessages.filter((m) => m.status === "sent").length;
    root.querySelector("#detail-messages").textContent = `${delivered} delivered`;

    root.querySelector("#stat-responses").textContent = responses;
    const responseRate =
      totalMessages > 0 ? Math.round((responses / totalMessages) * 100) : 0;
    root.querySelector(
      "#detail-responses"
    ).textContent = `${responseRate}% of sends`;

    root.querySelector("#stat-conversion").textContent = `${conversionRate}%`;
    root.querySelector(
      "#detail-conversion"
    ).textContent = `${responses} conversions`;

    // Form status breakdown
    updateFormStatusTable(root, { draft, submitted, total: totalForms });

    // Campaign performance
    updateCampaignsTable(root, campaigns);

    // Lead sources
    updateSourceTable(root, formLeads);

    // Recent messages
    updateRecentMessages(root, waInbound.slice(0, 10));
  } catch (e) {
    console.error("Analytics load error:", e);
    root.querySelector(".module-head").insertAdjacentHTML(
      "afterend",
      `<div class="error">Failed to load analytics: ${e.message}</div>`
    );
  }
}

async function fetchCollection(name) {
  const resp = await fetch(
    `https://firestore.googleapis.com/v1/projects/brandmintstudios-a5eb7/databases/(default)/documents/${name}?pageSize=1000&key=${firebaseConfig.apiKey}`
  );
  const data = await resp.json();
  return (data.documents || []).map((d) => {
    const fields = d.fields || {};
    return {
      id: d.name.split("/").pop(),
      ...Object.fromEntries(
        Object.entries(fields).map(([k, v]) => {
          const val = v.stringValue || v.integerValue || v.booleanValue || "";
          return [k, val];
        })
      ),
    };
  });
}

function updateFormStatusTable(root, stats) {
  const el = root.querySelector("#form-status-table");
  const draftPct = Math.round((stats.draft / stats.total) * 100) || 0;
  const submittedPct = Math.round((stats.submitted / stats.total) * 100) || 0;

  el.innerHTML = `
    <table>
      <thead>
        <tr><th>Status</th><th>Count</th><th>%</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>Submitted</td>
          <td>${stats.submitted}</td>
          <td>${submittedPct}%</td>
        </tr>
        <tr>
          <td>Draft (Abandoned)</td>
          <td>${stats.draft}</td>
          <td>${draftPct}%</td>
        </tr>
      </tbody>
    </table>
  `;
}

function updateCampaignsTable(root, campaigns) {
  const el = root.querySelector("#campaigns-table");

  if (campaigns.length === 0) {
    el.innerHTML = '<div class="empty">No campaigns yet.</div>';
    return;
  }

  const rows = campaigns
    .slice(0, 10)
    .map(
      (c) => `
    <tr>
      <td>${c.name}</td>
      <td>${c.target}</td>
      <td>${c.sentCount || 0}</td>
      <td>${c.deliveredCount || 0}</td>
      <td>${c.responseCount || 0}</td>
      <td>${
        c.sentCount > 0
          ? Math.round((c.responseCount / c.sentCount) * 100) + "%"
          : "—"
      }</td>
      <td><span class="badge badge-${c.status}">${c.status}</span></td>
    </tr>
  `
    )
    .join("");

  el.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Campaign</th>
          <th>Target</th>
          <th>Sent</th>
          <th>Delivered</th>
          <th>Responses</th>
          <th>Rate</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function updateSourceTable(root, formLeads) {
  const el = root.querySelector("#source-table");
  const sources = {};

  formLeads.forEach((f) => {
    const source = f.source || "unknown";
    sources[source] = (sources[source] || 0) + 1;
  });

  if (Object.keys(sources).length === 0) {
    el.innerHTML = '<div class="empty">No data yet.</div>';
    return;
  }

  const total = Object.values(sources).reduce((a, b) => a + b, 0);
  const rows = Object.entries(sources)
    .map(
      ([source, count]) => `
    <tr>
      <td>${source}</td>
      <td>${count}</td>
      <td>${Math.round((count / total) * 100)}%</td>
    </tr>
  `
    )
    .join("");

  el.innerHTML = `
    <table>
      <thead>
        <tr><th>Source</th><th>Count</th><th>%</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function updateRecentMessages(root, messages) {
  const el = root.querySelector("#recent-messages");

  if (messages.length === 0) {
    el.innerHTML = '<div class="empty">No inbound messages yet.</div>';
    return;
  }

  const rows = messages
    .map(
      (m) => `
    <div class="message-item">
      <div class="msg-from"><strong>${m.name || m.from}</strong> <span class="time">${
        m.createdAt ? new Date(m.createdAt).toLocaleString() : "—"
      }</span></div>
      <div class="msg-text">${escapeHtml(m.text)}</div>
    </div>
  `
    )
    .join("");

  el.innerHTML = `<div class="messages">${rows}</div>`;
}

function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function createEl(tag, content = "") {
  const el = document.createElement(tag);
  if (typeof content === "string") el.textContent = content;
  return el;
}
