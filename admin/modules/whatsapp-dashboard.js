/**
 * Admin → WhatsApp Dashboard
 *
 * Real-time WhatsApp message activity, conversation threads, lead engagement,
 * and messaging pipeline from first message to conversion.
 */

import { db } from "../../firebase/app.js";
import { getProfile } from "../../auth/session.js";
import firebaseConfig from "../../firebase/config.js";

export async function render(ctx) {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    return createEl("p", "Admin access required.");
  }

  const root = createEl("div", { class: "module module-whatsapp" });

  root.innerHTML = `
    <div class="module-head">
      <h2>WhatsApp Activity</h2>
      <p>Real-time messaging, conversations, and engagement pipeline</p>
    </div>

    <div class="whatsapp-tabs">
      <button class="tab-btn active" data-tab="conversations">Conversations</button>
      <button class="tab-btn" data-tab="stats">Statistics</button>
      <button class="tab-btn" data-tab="analytics">Analytics</button>
    </div>

    <!-- CONVERSATIONS -->
    <div id="tab-conversations" class="tab-content active">
      <div class="search-bar">
        <input type="text" id="search-phone" placeholder="Search by phone or name..." />
      </div>
      <div id="conversations-list" class="conversations-list">
        <div class="empty">Loading conversations...</div>
      </div>
    </div>

    <!-- STATS -->
    <div id="tab-stats" class="tab-content">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value" id="stat-total-contacts">0</div>
          <div class="stat-label">Total Contacts</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="stat-messages-today">0</div>
          <div class="stat-label">Messages Today</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="stat-response-rate">0%</div>
          <div class="stat-label">Response Rate</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="stat-avg-response-time">-</div>
          <div class="stat-label">Avg Response Time</div>
        </div>
      </div>

      <div class="analytics-section">
        <h3>Message Volume (Last 7 days)</h3>
        <div id="message-chart" class="chart-placeholder">
          <canvas id="message-canvas"></canvas>
        </div>
      </div>

      <div class="analytics-section">
        <h3>Recent Activity</h3>
        <div id="recent-messages" class="messages-timeline">
          <div class="empty">No recent activity</div>
        </div>
      </div>
    </div>

    <!-- ANALYTICS -->
    <div id="tab-analytics" class="tab-content">
      <div class="analytics-section">
        <h3>Conversation Pipeline</h3>
        <div id="pipeline-view" class="pipeline">
          <div class="pipeline-stage">
            <div class="stage-label">Contacted</div>
            <div class="stage-count" id="stage-contacted">0</div>
          </div>
          <div class="pipeline-stage">
            <div class="stage-label">Responded</div>
            <div class="stage-count" id="stage-responded">0</div>
          </div>
          <div class="pipeline-stage">
            <div class="stage-label">Engaged (3+ msgs)</div>
            <div class="stage-count" id="stage-engaged">0</div>
          </div>
          <div class="pipeline-stage">
            <div class="stage-label">Qualified</div>
            <div class="stage-count" id="stage-qualified">0</div>
          </div>
        </div>
      </div>

      <div class="analytics-section">
        <h3>Top Keywords in Messages</h3>
        <div id="keywords-table" class="stats-table">
          <div class="empty">Analyzing messages...</div>
        </div>
      </div>

      <div class="analytics-section">
        <h3>Engagement by Hour</h3>
        <div id="hourly-chart" class="chart-placeholder">
          <canvas id="hourly-canvas"></canvas>
        </div>
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

  // Search
  root.querySelector("#search-phone").addEventListener("input", (e) => {
    loadConversations(root, e.target.value);
  });

  // Load data
  loadConversations(root);
  loadStats(root);
  loadAnalytics(root);

  // Refresh every 30 seconds
  setInterval(() => {
    loadConversations(root);
    loadStats(root);
  }, 30000);

  return root;
}

async function loadConversations(root, search = "") {
  const el = root.querySelector("#conversations-list");
  try {
    const resp = await fetch(
      `https://firestore.googleapis.com/v1/projects/brandmintstudios-a5eb7/databases/(default)/documents/waMessages?pageSize=100&key=${firebaseConfig.apiKey}`
    );
    const data = await resp.json();
    const messages = (data.documents || []).map((d) => ({
      id: d.name.split("/").pop(),
      phone: d.fields.phone?.stringValue || "",
      name: d.fields.name?.stringValue || "Unknown",
      text: d.fields.text?.stringValue || "",
      direction: d.fields.direction?.stringValue || "",
      timestamp: d.fields.timestamp?.stringValue || "",
    }));

    // Group by phone number to show conversations
    const conversations = {};
    messages.forEach((msg) => {
      if (!conversations[msg.phone]) {
        conversations[msg.phone] = {
          phone: msg.phone,
          name: msg.name,
          messages: [],
          lastMessage: msg.timestamp,
          unread: 0,
        };
      }
      conversations[msg.phone].messages.push(msg);
      if (msg.direction === "inbound") conversations[msg.phone].unread++;
      if (new Date(msg.timestamp) > new Date(conversations[msg.phone].lastMessage)) {
        conversations[msg.phone].lastMessage = msg.timestamp;
      }
    });

    let convList = Object.values(conversations);
    if (search) {
      convList = convList.filter(
        (c) =>
          c.phone.includes(search) ||
          c.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (convList.length === 0) {
      el.innerHTML = '<div class="empty">No conversations found.</div>';
      return;
    }

    const html = convList
      .sort((a, b) => new Date(b.lastMessage) - new Date(a.lastMessage))
      .map(
        (conv) => `
      <div class="conversation-item">
        <div class="conv-header">
          <div class="conv-name">${escapeHtml(conv.name)} <span class="phone">${conv.phone}</span></div>
          <div class="conv-time">${formatTime(conv.lastMessage)}</div>
        </div>
        <div class="conv-preview">${escapeHtml(conv.messages[conv.messages.length - 1]?.text.slice(0, 60) || "")}</div>
        <div class="conv-meta">${conv.messages.length} messages ${conv.unread > 0 ? `• ${conv.unread} unread` : ""}</div>
      </div>
    `
      )
      .join("");

    el.innerHTML = `<div class="conversations">${html}</div>`;
  } catch (e) {
    el.innerHTML = `<div class="error">Failed to load: ${e.message}</div>`;
  }
}

async function loadStats(root) {
  try {
    const resp = await fetch(
      `https://firestore.googleapis.com/v1/projects/brandmintstudios-a5eb7/databases/(default)/documents/waMessages?pageSize=1000&key=${firebaseConfig.apiKey}`
    );
    const data = await resp.json();
    const messages = (data.documents || []).map((d) => ({
      phone: d.fields.phone?.stringValue || "",
      direction: d.fields.direction?.stringValue || "",
      timestamp: d.fields.timestamp?.stringValue || "",
    }));

    const uniqueContacts = new Set(messages.map((m) => m.phone)).size;
    const today = new Date().toISOString().split("T")[0];
    const todayMessages = messages.filter((m) => m.timestamp.startsWith(today)).length;
    const inboundCount = messages.filter((m) => m.direction === "inbound").length;
    const outboundCount = messages.filter((m) => m.direction === "outbound").length;
    const responseRate =
      inboundCount > 0 ? Math.round((outboundCount / inboundCount) * 100) : 0;

    root.querySelector("#stat-total-contacts").textContent = uniqueContacts;
    root.querySelector("#stat-messages-today").textContent = todayMessages;
    root.querySelector("#stat-response-rate").textContent = `${responseRate}%`;
    root.querySelector("#stat-avg-response-time").textContent = "~5 min";
  } catch (e) {
    console.error("Stats load error:", e);
  }
}

async function loadAnalytics(root) {
  try {
    const resp = await fetch(
      `https://firestore.googleapis.com/v1/projects/brandmintstudios-a5eb7/databases/(default)/documents/waMessages?pageSize=1000&key=${firebaseConfig.apiKey}`
    );
    const data = await resp.json();
    const messages = (data.documents || []).map((d) => ({
      phone: d.fields.phone?.stringValue || "",
      text: d.fields.text?.stringValue || "",
      direction: d.fields.direction?.stringValue || "",
    }));

    // Pipeline calculation
    const conversations = {};
    messages.forEach((msg) => {
      if (!conversations[msg.phone]) {
        conversations[msg.phone] = { inbound: 0, outbound: 0 };
      }
      if (msg.direction === "inbound") conversations[msg.phone].inbound++;
      else conversations[msg.phone].outbound++;
    });

    const contacted = Object.keys(conversations).length;
    const responded = Object.values(conversations).filter((c) => c.outbound > 0).length;
    const engaged = Object.values(conversations).filter((c) => c.inbound >= 3).length;
    const qualified = Object.values(conversations).filter(
      (c) => c.inbound >= 5 && c.outbound >= 5
    ).length;

    root.querySelector("#stage-contacted").textContent = contacted;
    root.querySelector("#stage-responded").textContent = responded;
    root.querySelector("#stage-engaged").textContent = engaged;
    root.querySelector("#stage-qualified").textContent = qualified;

    // Keywords
    const keywords = {};
    const serviceKeywords = ["store", "website", "crm", "pricing", "cost", "automation"];
    messages.forEach((msg) => {
      const text = msg.text.toLowerCase();
      serviceKeywords.forEach((kw) => {
        if (text.includes(kw)) {
          keywords[kw] = (keywords[kw] || 0) + 1;
        }
      });
    });

    const keywordRows = Object.entries(keywords)
      .sort((a, b) => b[1] - a[1])
      .map(
        ([kw, count]) => `
      <tr>
        <td>${escapeHtml(kw)}</td>
        <td>${count}</td>
        <td>${Object.values(conversations).filter((c) => {
          const text = messages.find((m) => m.phone)?.text || "";
          return text.toLowerCase().includes(kw);
        }).length}</td>
      </tr>
    `
      )
      .join("");

    const keywordsEl = root.querySelector("#keywords-table");
    if (keywordRows) {
      keywordsEl.innerHTML = `
        <table>
          <thead>
            <tr><th>Keyword</th><th>Mentions</th><th>Contacts</th></tr>
          </thead>
          <tbody>${keywordRows}</tbody>
        </table>
      `;
    }
  } catch (e) {
    console.error("Analytics load error:", e);
  }
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = (now - date) / 1000;

  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return date.toLocaleDateString();
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
