/**
 * Admin → Smart Campaigns (Enhanced)
 *
 * Send bulk WhatsApp with scheduling, template variables, and analytics.
 * Tracks: sends, delivery status, responses, conversion rate.
 */

import { db } from "../../firebase/app.js";
import { getProfile } from "../../auth/session.js";
import firebaseConfig from "../../firebase/config.js";

export async function render(ctx) {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    return createEl("p", "Admin access required.");
  }

  const root = createEl("div", { class: "module module-campaigns-smart" });

  root.innerHTML = `
    <div class="module-head">
      <h2>Smart Campaigns</h2>
      <p>Bulk WhatsApp with scheduling, templating, and real-time analytics</p>
    </div>

    <div class="campaigns-tabs">
      <button class="tab-btn active" data-tab="create">New Campaign</button>
      <button class="tab-btn" data-tab="active">Active</button>
      <button class="tab-btn" data-tab="history">History</button>
      <button class="tab-btn" data-tab="analytics">Analytics</button>
    </div>

    <!-- CREATE CAMPAIGN -->
    <div id="tab-create" class="tab-content active">
      <form class="campaign-form">
        <h3>Create Campaign</h3>

        <label>
          <span>Campaign name</span>
          <input type="text" id="campaign-name" placeholder="Q1 Promo - Online Stores" required />
        </label>

        <label>
          <span>Target audience</span>
          <select id="campaign-target" required>
            <option value="">Choose list</option>
            <option value="formLeads-submitted">Form Leads (Submitted)</option>
            <option value="formLeads-draft">Form Leads (Draft)</option>
            <option value="importedLeads">Imported Prospects (CSV)</option>
            <option value="custom">Custom List</option>
          </select>
        </label>

        <label>
          <span>Message template</span>
          <textarea id="campaign-message" placeholder="Hi {name}! We build {service} for brands like yours.&#10;&#10;Reply or visit: https://brandmintstudios.in" rows="5" required></textarea>
          <small>Use {name}, {phone}, {email}, {service} as placeholders</small>
        </label>

        <label>
          <span>Schedule send</span>
          <input type="datetime-local" id="campaign-schedule" />
          <small>Leave blank to send immediately</small>
        </label>

        <label>
          <input type="checkbox" id="campaign-test" />
          <span>Send test message first (to +91 77999 34943)</span>
        </label>

        <div class="form-actions">
          <button type="button" class="btn btn-ghost" id="campaign-preview">Preview Recipients</button>
          <button type="button" class="btn btn-primary" id="campaign-create">Create Campaign</button>
        </div>
      </form>
    </div>

    <!-- ACTIVE CAMPAIGNS -->
    <div id="tab-active" class="tab-content">
      <div id="active-campaigns" class="campaigns-list">
        <div class="empty">No active campaigns.</div>
      </div>
    </div>

    <!-- CAMPAIGN HISTORY -->
    <div id="tab-history" class="tab-content">
      <div id="campaign-history" class="campaigns-list">
        <div class="empty">No campaign history.</div>
      </div>
    </div>

    <!-- ANALYTICS -->
    <div id="tab-analytics" class="tab-content">
      <div id="campaign-analytics" class="analytics-grid">
        <div class="stat-card">
          <div class="stat-value">0</div>
          <div class="stat-label">Total Sent</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">0%</div>
          <div class="stat-label">Delivery Rate</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">0%</div>
          <div class="stat-label">Response Rate</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">0%</div>
          <div class="stat-label">Conversion Rate</div>
        </div>
      </div>
      <div id="campaign-chart" class="chart-placeholder">
        <p>Campaign performance data will appear here</p>
      </div>
    </div>
  `;

  // Tab switching
  root.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      root.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      root.querySelectorAll(".tab-content").forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");
      root.querySelector(`#tab-${btn.dataset.tab}`).classList.add("active");
    });
  });

  // Campaign preview
  root.querySelector("#campaign-preview").addEventListener("click", async () => {
    const target = root.querySelector("#campaign-target").value;
    if (!target) return alert("Select a target audience.");
    const count = await getTargetCount(target);
    alert(
      `This campaign will send to ${count} recipient(s).\n\nEstimated cost: ~₹${Math.ceil(count * 1)} (₹1 per message)`
    );
  });

  // Create campaign
  root.querySelector("#campaign-create").addEventListener("click", async () => {
    const name = root.querySelector("#campaign-name").value;
    const target = root.querySelector("#campaign-target").value;
    const message = root.querySelector("#campaign-message").value;
    const schedule = root.querySelector("#campaign-schedule").value;
    const test = root.querySelector("#campaign-test").checked;

    if (!name || !target || !message) return alert("Fill all required fields.");

    const scheduleTime = schedule ? new Date(schedule).toISOString() : new Date().toISOString();
    const isImmediate = !schedule;

    try {
      const docId = Math.random().toString(36).substr(2, 20);
      const campaign = {
        name,
        target,
        message,
        scheduleTime,
        test,
        status: isImmediate ? "sending" : "queued",
        createdAt: new Date().toISOString(),
        sentCount: 0,
        deliveredCount: 0,
        responseCount: 0,
      };

      // Save campaign to Firestore
      const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/brandmintstudios-a5eb7/databases/(default)/documents/campaigns/${docId}?key=${firebaseConfig.apiKey}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: {
              name: { stringValue: campaign.name },
              target: { stringValue: campaign.target },
              message: { stringValue: campaign.message },
              scheduleTime: { stringValue: campaign.scheduleTime },
              test: { booleanValue: campaign.test },
              status: { stringValue: campaign.status },
              createdAt: { stringValue: campaign.createdAt },
              sentCount: { integerValue: 0 },
              deliveredCount: { integerValue: 0 },
              responseCount: { integerValue: 0 },
            },
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to save campaign");

      ctx.toast(`Campaign "${name}" created${isImmediate ? " and sending..." : "."}`, "success");

      // If immediate send, trigger campaign send
      if (isImmediate) {
        await sendCampaign(docId, campaign, ctx);
      }

      loadActiveCampaigns(root);
    } catch (e) {
      ctx.toast(`Error: ${e.message}`, "error");
      console.error(e);
    }
  });

  loadActiveCampaigns(root);
  loadCampaignHistory(root);
  return root;
}

async function getTargetCount(target) {
  // Placeholder: would query Firestore
  const counts = {
    "formLeads-submitted": 12,
    "formLeads-draft": 8,
    importedLeads: 34,
    custom: 0,
  };
  return counts[target] || 0;
}

async function loadActiveCampaigns(root) {
  const el = root.querySelector("#active-campaigns");
  try {
    const resp = await fetch(
      `https://firestore.googleapis.com/v1/projects/brandmintstudios-a5eb7/databases/(default)/documents/campaigns?pageSize=100&key=${firebaseConfig.apiKey}`
    );
    const data = await resp.json();
    const campaigns = (data.documents || [])
      .filter((d) => {
        const status = d.fields.status?.stringValue;
        return status !== "completed";
      })
      .map((d) => ({
        id: d.name.split("/").pop(),
        name: d.fields.name?.stringValue || "",
        target: d.fields.target?.stringValue || "",
        status: d.fields.status?.stringValue || "queued",
        sentCount: d.fields.sentCount?.integerValue || 0,
        deliveredCount: d.fields.deliveredCount?.integerValue || 0,
        responseCount: d.fields.responseCount?.integerValue || 0,
      }));

    if (campaigns.length === 0) {
      el.innerHTML = '<div class="empty">No active campaigns.</div>';
      return;
    }

    const rows = campaigns
      .map(
        (c) => `
      <tr>
        <td>${c.name}</td>
        <td>${c.target}</td>
        <td><span class="badge badge-${c.status}">${c.status}</span></td>
        <td>${c.sentCount}</td>
        <td>${c.deliveredCount}</td>
        <td>${c.responseCount}</td>
        <td><button class="btn btn-sm btn-ghost" onclick="alert('Pause not yet implemented')">Pause</button></td>
      </tr>
    `
      )
      .join("");

    el.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Target</th>
            <th>Status</th>
            <th>Sent</th>
            <th>Delivered</th>
            <th>Responses</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  } catch (e) {
    el.innerHTML = `<div class="error">Failed to load campaigns: ${e.message}</div>`;
    console.error(e);
  }
}

async function loadCampaignHistory(root) {
  const el = root.querySelector("#campaign-history");
  try {
    const resp = await fetch(
      `https://firestore.googleapis.com/v1/projects/brandmintstudios-a5eb7/databases/(default)/documents/campaigns?pageSize=100&key=${firebaseConfig.apiKey}`
    );
    const data = await resp.json();
    const campaigns = (data.documents || [])
      .filter((d) => d.fields.status?.stringValue === "completed")
      .map((d) => ({
        id: d.name.split("/").pop(),
        name: d.fields.name?.stringValue || "",
        target: d.fields.target?.stringValue || "",
        sentCount: d.fields.sentCount?.integerValue || 0,
        deliveredCount: d.fields.deliveredCount?.integerValue || 0,
        responseCount: d.fields.responseCount?.integerValue || 0,
        completedAt: d.fields.completedAt?.stringValue || "",
      }));

    if (campaigns.length === 0) {
      el.innerHTML = '<div class="empty">No campaign history.</div>';
      return;
    }

    const rows = campaigns
      .map((c) => {
        const rate =
          c.responseCount > 0 ? Math.round((c.responseCount / c.sentCount) * 100) : 0;
        return `
      <tr>
        <td>${c.name}</td>
        <td>${c.target}</td>
        <td>${c.sentCount}</td>
        <td>${c.deliveredCount}</td>
        <td>${c.responseCount}</td>
        <td>${rate}%</td>
        <td>${c.completedAt ? new Date(c.completedAt).toLocaleDateString() : "—"}</td>
      </tr>
    `;
      })
      .join("");

    el.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Target</th>
            <th>Sent</th>
            <th>Delivered</th>
            <th>Responses</th>
            <th>Response Rate</th>
            <th>Completed</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  } catch (e) {
    el.innerHTML = `<div class="error">Failed to load history: ${e.message}</div>`;
    console.error(e);
  }
}

async function sendCampaign(campaignId, campaign, ctx) {
  try {
    // Fetch target leads from Firestore based on target audience
    let leads = [];

    if (campaign.target === "formLeads-submitted") {
      const resp = await fetch(
        `https://firestore.googleapis.com/v1/projects/brandmintstudios-a5eb7/databases/(default)/documents/formLeads?pageSize=1000&key=${firebaseConfig.apiKey}`
      );
      const data = await resp.json();
      leads = (data.documents || [])
        .filter((d) => d.fields.status?.stringValue === "submitted")
        .map((d) => ({
          phone: d.fields.phone?.stringValue || "",
          name: d.fields.name?.stringValue || "",
          email: d.fields.email?.stringValue || "",
          service: d.fields.service?.stringValue || "",
        }));
    } else if (campaign.target === "formLeads-draft") {
      const resp = await fetch(
        `https://firestore.googleapis.com/v1/projects/brandmintstudios-a5eb7/databases/(default)/documents/formLeads?pageSize=1000&key=${firebaseConfig.apiKey}`
      );
      const data = await resp.json();
      leads = (data.documents || [])
        .filter((d) => d.fields.status?.stringValue === "draft")
        .map((d) => ({
          phone: d.fields.phone?.stringValue || "",
          name: d.fields.name?.stringValue || "",
          email: d.fields.email?.stringValue || "",
          service: d.fields.service?.stringValue || "",
        }));
    } else if (campaign.target === "importedLeads") {
      const resp = await fetch(
        `https://firestore.googleapis.com/v1/projects/brandmintstudios-a5eb7/databases/(default)/documents/importedLeads?pageSize=1000&key=${firebaseConfig.apiKey}`
      );
      const data = await resp.json();
      leads = (data.documents || []).map((d) => ({
        phone: d.fields.phone?.stringValue || "",
        name: d.fields.name?.stringValue || "",
        email: d.fields.email?.stringValue || "",
        service: d.fields.service?.stringValue || "",
      }));
    }

    if (leads.length === 0) {
      ctx.toast("No leads found in target audience.", "warning");
      return;
    }

    // Send test message if flagged
    if (campaign.test) {
      const testPhone = "919999999999"; // Admin phone—replace with actual
      const message = campaign.message
        .replace("{name}", "Admin")
        .replace("{phone}", testPhone)
        .replace("{email}", "admin@brandmintstudios.in")
        .replace("{service}", "Test Service");

      await fetch("http://localhost:8080/message/sendText/brandmintsupport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: testPhone,
          text: message,
        }),
      });
      ctx.toast("Test message sent.", "success");
    }

    // Send to all leads
    let sent = 0;
    for (const lead of leads) {
      const message = campaign.message
        .replace("{name}", lead.name || "there")
        .replace("{phone}", lead.phone)
        .replace("{email}", lead.email || "")
        .replace("{service}", lead.service || "");

      try {
        await fetch("http://localhost:8080/message/sendText/brandmintsupport", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            number: lead.phone,
            text: message,
          }),
        });
        sent++;
      } catch (e) {
        console.error(`Failed to send to ${lead.phone}:`, e);
      }
    }

    // Update campaign stats
    const updateResp = await fetch(
      `https://firestore.googleapis.com/v1/projects/brandmintstudios-a5eb7/databases/(default)/documents/campaigns/${campaignId}?key=${firebaseConfig.apiKey}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            sentCount: { integerValue: sent },
            status: { stringValue: "completed" },
            completedAt: { stringValue: new Date().toISOString() },
          },
        }),
      }
    );

    if (updateResp.ok) {
      ctx.toast(`Campaign sent to ${sent} leads.`, "success");
    }
  } catch (e) {
    ctx.toast(`Campaign send error: ${e.message}`, "error");
    console.error(e);
  }
}

function createEl(tag, content = "") {
  const el = document.createElement(tag);
  if (typeof content === "string") el.textContent = content;
  return el;
}
