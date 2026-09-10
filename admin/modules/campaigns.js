/**
 * Admin → Campaigns
 *
 * Send bulk WhatsApp campaigns to form leads or imported prospects.
 * Track: sends, delivery, responses, conversion metrics.
 */

import { db } from "../../firebase/app.js";
import { getProfile } from "../../auth/session.js";

export async function render(ctx) {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    return createEl("p", "Admin access required.");
  }

  const root = createEl("div", { class: "module module-campaigns" });

  root.innerHTML = `
    <div class="module-head">
      <h2>Campaigns</h2>
      <p>Send bulk WhatsApp messages to leads</p>
    </div>

    <div class="campaigns-tabs">
      <button class="tab-btn active" data-tab="list">Active Campaigns</button>
      <button class="tab-btn" data-tab="create">New Campaign</button>
      <button class="tab-btn" data-tab="results">Results</button>
    </div>

    <div id="tab-list" class="tab-content active">
      <div id="campaigns-list" class="campaigns-list">
        <div class="empty">No campaigns yet.</div>
      </div>
    </div>

    <div id="tab-create" class="tab-content">
      <div class="campaign-form">
        <h3>Create Campaign</h3>
        <label>
          <span>Campaign name</span>
          <input type="text" id="campaign-name" placeholder="e.g., Online Store Offer Jan 2026" />
        </label>
        <label>
          <span>Target list</span>
          <select id="campaign-target">
            <option value="">Choose list</option>
            <option value="formLeads">Form Leads (Submitted)</option>
            <option value="formLeads-draft">Form Leads (Draft)</option>
            <option value="imported">Imported Prospects</option>
            <option value="custom">Custom List</option>
          </select>
        </label>
        <label>
          <span>Message template</span>
          <textarea id="campaign-message" placeholder="Hi {name}! We help brands like yours...&#10;&#10;Use {name}, {service} as placeholders" rows="4"></textarea>
        </label>
        <label>
          <input type="checkbox" id="campaign-test" />
          <span>Send test to my number first</span>
        </label>
        <button class="btn btn-primary" id="campaign-preview">Preview Recipients</button>
        <button class="btn btn-primary" id="campaign-send">Send Campaign</button>
      </div>
    </div>

    <div id="tab-results" class="tab-content">
      <div id="campaign-results" class="results-chart">
        <div class="empty">No data yet.</div>
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
    if (!target) {
      alert("Select a target list first.");
      return;
    }
    const count = await getTargetCount(target);
    alert(`This campaign will send to ${count} recipient(s).`);
  });

  // Campaign send
  root.querySelector("#campaign-send").addEventListener("click", async () => {
    const name = root.querySelector("#campaign-name").value;
    const target = root.querySelector("#campaign-target").value;
    const message = root.querySelector("#campaign-message").value;
    const test = root.querySelector("#campaign-test").checked;

    if (!name || !target || !message) {
      alert("Fill in all fields.");
      return;
    }

    if (!confirm(`Send "${name}" to ${target}?\n\nThis will trigger WhatsApp sends via Evolution API.`)) return;

    ctx.toast(`Campaign "${name}" queued for sending…`);
    // In a real implementation, call an API endpoint to queue the campaign
    console.log("[campaigns] Queuing:", { name, target, message, test });
  });

  loadCampaigns(root);
  return root;
}

async function getTargetCount(target) {
  // Placeholder: in a real app, query the respective collection
  switch (target) {
    case "formLeads":
      return 12; // would be db.list("formLeads", { status: "submitted" }).length
    case "formLeads-draft":
      return 8;
    case "imported":
      return 34;
    default:
      return 0;
  }
}

async function loadCampaigns(root) {
  // Placeholder: would fetch campaign history from Firestore
  const listEl = root.querySelector("#campaigns-list");
  listEl.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Target</th>
          <th>Sent</th>
          <th>Delivered</th>
          <th>Response Rate</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Q1 Store Promo</td>
          <td>Form Leads (Submitted)</td>
          <td>12</td>
          <td>11</td>
          <td>33%</td>
          <td><span class="badge badge-completed">Completed</span></td>
        </tr>
      </tbody>
    </table>
  `;
}

function createEl(tag, content = "") {
  const el = document.createElement(tag);
  if (typeof content === "string") el.textContent = content;
  else if (content && content.class) el.className = content.class;
  return el;
}
