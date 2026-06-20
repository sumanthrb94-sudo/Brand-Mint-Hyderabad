/**
 * Brand Mint Admin — Data layer.
 *
 * Offline-first Supabase sync wrapper. Keeps a synchronous in-memory cache
 * mirrored to localStorage so the existing modules don't need to be async.
 *
 * Lifecycle:
 *   1. boot() awaits db.hydrate()  -> pulls every row from Supabase into cache
 *   2. cache mirrors to localStorage so a refresh comes up instantly
 *   3. db.list/get serve from cache (sync, instant)
 *   4. db.create/update/remove patch cache + localStorage immediately, then
 *      fire-and-forget push to Supabase. On push failure the local change
 *      stays; console.error is emitted and an offline-write counter increments
 *      so the topbar can surface it later.
 *
 * Key handling: app uses camelCase, DB uses snake_case. We auto-convert at
 * the row boundary. JSON values (line_items, bank, pricing) pass through
 * unchanged.
 */

import { getClient, isConfigured } from "/admin/supabase.js";

const NS = "bm.admin.v2.";
const COLLECTIONS = ["leads", "projects", "clients", "invoices", "content"];

// Optional toast handle, set by admin/app.js after components.js loads.
let toastFn = null;
export function setToastHandle(fn) { toastFn = fn; }
function toastIfAvailable(msg) {
  if (typeof toastFn === "function") {
    try { toastFn(msg, 4200); } catch (_) {}
  }
}

// Per-table change listeners. Modules subscribe to re-render when their
// table changes (locally or via Postgres Changes).
const tableListeners = new Map();
function emitTable(table) {
  const set = tableListeners.get(table);
  if (!set) return;
  for (const fn of set) {
    try { fn(table); } catch (e) { console.error("[db] table listener", e); }
  }
}

const cache = {
  leads: [],
  projects: [],
  clients: [],
  invoices: [],
  content: [],
  settings: null,
};

let syncErrors = 0;
let lastSyncAt = null;
let lastError = null;
const listeners = new Set();

function emit() {
  const snap = status();
  for (const fn of listeners) {
    try {
      fn(snap);
    } catch (e) {
      console.error("[db] subscriber threw", e);
    }
  }
}

function status() {
  return {
    remote: isConfigured(),
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    errors: syncErrors,
    lastError,
    lastSyncAt,
  };
}

/* ---------- case conversion ---------- */

const toSnake = (s) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
const toCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

function toDbRow(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === "id" || k === "createdAt") continue; // server-managed for some flows
    out[toSnake(k)] = v;
  }
  return out;
}
function fromDbRow(row) {
  if (!row) return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) out[toCamel(k)] = v;
  return out;
}

/* ---------- local cache mirror ---------- */

function loadFromLocal() {
  try {
    for (const t of COLLECTIONS) {
      const raw = localStorage.getItem(NS + t);
      cache[t] = raw ? JSON.parse(raw) : [];
    }
    const s = localStorage.getItem(NS + "settings");
    cache.settings = s ? JSON.parse(s) : null;
  } catch {
    for (const t of COLLECTIONS) cache[t] = [];
    cache.settings = null;
  }
}
function persist(table) {
  try {
    if (table === "settings") {
      localStorage.setItem(NS + "settings", JSON.stringify(cache.settings));
    } else {
      localStorage.setItem(NS + table, JSON.stringify(cache[table]));
    }
  } catch (e) {
    console.warn("[db] persist failed", e);
  }
}

/* ---------- hydration ---------- */

export async function hydrate() {
  loadFromLocal();
  if (!isConfigured()) {
    console.warn("[db] Supabase not configured; running in local-only mode");
    return { remote: false };
  }
  try {
    const sb = await getClient();
    for (const t of COLLECTIONS) {
      const { data, error } = await sb.from(t).select("*");
      if (error) throw error;
      cache[t] = (data || []).map(fromDbRow);
      persist(t);
    }
    const { data: settingsRow, error: settingsErr } = await sb
      .from("settings")
      .select("*")
      .eq("id", "singleton")
      .maybeSingle();
    if (settingsErr) throw settingsErr;
    cache.settings = settingsRow ? fromDbRow(settingsRow) : null;
    persist("settings");
    lastSyncAt = new Date().toISOString();
    emit();
    for (const t of COLLECTIONS) emitTable(t);
    subscribeRealtime();
    return { remote: true };
  } catch (e) {
    console.error("[db] hydrate failed, using local cache only", e);
    syncErrors++;
    lastError = e?.message || String(e);
    emit();
    return { remote: false, error: e };
  }
}

/* ---------- Realtime ---------- */

let realtimeBound = false;
async function subscribeRealtime() {
  if (realtimeBound || !isConfigured()) return;
  realtimeBound = true;
  try {
    const sb = await getClient();
    const ch = sb.channel("bm-admin-realtime");
    for (const t of COLLECTIONS) {
      ch.on(
        "postgres_changes",
        { event: "*", schema: "public", table: t },
        (payload) => applyRealtimeEvent(t, payload),
      );
    }
    ch.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "settings" },
      (payload) => {
        if (payload.eventType === "DELETE") {
          cache.settings = null;
        } else {
          cache.settings = fromDbRow(payload.new);
        }
        persist("settings");
        emit();
      },
    );
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.info("[db] realtime channel subscribed");
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn("[db] realtime channel", status);
      }
    });
  } catch (e) {
    console.warn("[db] realtime setup failed", e);
    realtimeBound = false;
  }
}

function applyRealtimeEvent(table, payload) {
  const list = cache[table] || [];
  if (payload.eventType === "INSERT") {
    const incoming = fromDbRow(payload.new);
    if (!list.find((r) => r.id === incoming.id)) {
      cache[table] = [incoming, ...list];
    }
  } else if (payload.eventType === "UPDATE") {
    const incoming = fromDbRow(payload.new);
    const idx = list.findIndex((r) => r.id === incoming.id);
    if (idx === -1) cache[table] = [incoming, ...list];
    else {
      // Last-write-wins by updatedAt to avoid clobbering a fresh local edit.
      const local = list[idx];
      const localTs = Date.parse(local.updatedAt || 0) || 0;
      const remoteTs = Date.parse(incoming.updatedAt || 0) || 0;
      if (remoteTs >= localTs) cache[table][idx] = incoming;
    }
  } else if (payload.eventType === "DELETE") {
    const oldId = payload.old?.id;
    if (oldId) cache[table] = list.filter((r) => r.id !== oldId);
  }
  persist(table);
  emitTable(table);
  emit();
}

/* ---------- async writers ---------- */

function recordSuccess() {
  lastSyncAt = new Date().toISOString();
  emit();
}
function recordFailure(op, e) {
  syncErrors++;
  lastError = `${op}: ${e?.message || String(e)}`;
  emit();
}

async function pushInsert(table, row) {
  if (!isConfigured()) return { ok: true, local: true };
  try {
    const sb = await getClient();
    const { error } = await sb.from(table).insert({
      id: row.id,
      ...toDbRow(row),
    });
    if (error) throw error;
    recordSuccess();
    return { ok: true };
  } catch (e) {
    console.error(`[db] insert ${table} failed`, e);
    recordFailure(`insert ${table}`, e);
    return { ok: false, error: e };
  }
}
async function pushUpdate(table, id, patch) {
  if (!isConfigured()) return { ok: true, local: true };
  try {
    const sb = await getClient();
    const { error } = await sb.from(table).update(toDbRow(patch)).eq("id", id);
    if (error) throw error;
    recordSuccess();
    return { ok: true };
  } catch (e) {
    console.error(`[db] update ${table} failed`, e);
    recordFailure(`update ${table}`, e);
    return { ok: false, error: e };
  }
}
async function pushDelete(table, id) {
  if (!isConfigured()) return { ok: true, local: true };
  try {
    const sb = await getClient();
    const { error } = await sb.from(table).delete().eq("id", id);
    if (error) throw error;
    recordSuccess();
    return { ok: true };
  } catch (e) {
    console.error(`[db] delete ${table} failed`, e);
    recordFailure(`delete ${table}`, e);
    return { ok: false, error: e };
  }
}
async function pushSettings(patch) {
  if (!isConfigured()) return;
  try {
    const sb = await getClient();
    const { error } = await sb.from("settings").upsert({
      id: "singleton",
      ...toDbRow({ ...patch, id: undefined }),
    });
    if (error) throw error;
    recordSuccess();
  } catch (e) {
    console.error("[db] settings upsert failed", e);
    recordFailure("settings upsert", e);
  }
}

/* ---------- sync API ---------- */

function nowIso() {
  return new Date().toISOString();
}
function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export const db = {
  list(table, filter) {
    const rows = cache[table] || [];
    if (typeof filter === "function") return rows.filter(filter);
    if (filter && typeof filter === "object") {
      return rows.filter((r) =>
        Object.entries(filter).every(([k, v]) => r[k] === v)
      );
    }
    return rows;
  },
  get(table, id) {
    return (cache[table] || []).find((r) => r.id === id) || null;
  },
  create(table, data) {
    const row = {
      id: newId(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ...data,
    };
    cache[table] = [row, ...cache[table]];
    persist(table);
    emit();
    emitTable(table);
    pushInsert(table, row).then((res) => {
      if (res?.ok === false) {
        toastIfAvailable(`Saved locally — sync failed (${res.error?.message || "see console"}).`);
      }
    });
    return row;
  },
  // Awaitable variant — used by forms that want to know push succeeded.
  async createAsync(table, data) {
    const row = {
      id: newId(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ...data,
    };
    cache[table] = [row, ...cache[table]];
    persist(table);
    emit();
    const res = await pushInsert(table, row);
    if (res?.ok === false && isConfigured()) {
      throw res.error || new Error("Insert failed");
    }
    return row;
  },
  update(table, id, patch) {
    const idx = cache[table].findIndex((r) => r.id === id);
    if (idx === -1) return null;
    const next = { ...cache[table][idx], ...patch, updatedAt: nowIso() };
    cache[table][idx] = next;
    persist(table);
    emit();
    emitTable(table);
    pushUpdate(table, id, { ...patch, updatedAt: next.updatedAt }).then((res) => {
      if (res?.ok === false) {
        toastIfAvailable(`Saved locally — sync failed (${res.error?.message || "see console"}).`);
      }
    });
    return next;
  },
  async updateAsync(table, id, patch) {
    const idx = cache[table].findIndex((r) => r.id === id);
    if (idx === -1) return null;
    const next = { ...cache[table][idx], ...patch, updatedAt: nowIso() };
    cache[table][idx] = next;
    persist(table);
    emit();
    const res = await pushUpdate(table, id, { ...patch, updatedAt: next.updatedAt });
    if (res?.ok === false && isConfigured()) {
      throw res.error || new Error("Update failed");
    }
    return next;
  },
  remove(table, id) {
    const before = cache[table].length;
    cache[table] = cache[table].filter((r) => r.id !== id);
    if (cache[table].length === before) return false;
    persist(table);
    emit();
    emitTable(table);
    pushDelete(table, id).then((res) => {
      if (res?.ok === false) {
        toastIfAvailable(`Deleted locally — sync failed (${res.error?.message || "see console"}).`);
      }
    });
    return true;
  },
  replace(table, rows) {
    cache[table] = rows;
    persist(table);
  },
  settings: {
    get() {
      return cache.settings;
    },
    set(patch) {
      cache.settings = {
        ...(cache.settings || {}),
        ...patch,
        updatedAt: nowIso(),
      };
      persist("settings");
      pushSettings(cache.settings);
      return cache.settings;
    },
  },
  exportAll() {
    return {
      exportedAt: nowIso(),
      version: 2,
      data: {
        leads: cache.leads,
        projects: cache.projects,
        clients: cache.clients,
        invoices: cache.invoices,
        content: cache.content,
        settings: cache.settings || {},
      },
    };
  },
  importAll(dump) {
    if (!dump || !dump.data) throw new Error("Invalid dump");
    for (const t of COLLECTIONS) {
      if (Array.isArray(dump.data[t])) {
        cache[t] = dump.data[t];
        persist(t);
      }
    }
    if (dump.data.settings) {
      cache.settings = dump.data.settings;
      persist("settings");
    }
  },
  wipe() {
    for (const t of COLLECTIONS) {
      cache[t] = [];
      localStorage.removeItem(NS + t);
    }
    cache.settings = null;
    localStorage.removeItem(NS + "settings");
  },
  hydrate,
  status,
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  // Per-table subscription. fn(table) fires whenever the cache for the
  // given table changes — local mutations OR incoming Postgres Changes.
  onTable(table, fn) {
    let set = tableListeners.get(table);
    if (!set) { set = new Set(); tableListeners.set(table, set); }
    set.add(fn);
    return () => set.delete(fn);
  },
  resetSyncErrors() {
    syncErrors = 0;
    lastError = null;
    emit();
  },
  get syncErrors() {
    return syncErrors;
  },
  get isRemote() {
    return isConfigured();
  },
};

/* ---------- seed ---------- */

export async function seedIfEmpty() {
  if (cache.settings || cache.leads.length || cache.clients.length) return;

  db.settings.set({
    studioName: "Brand Mint",
    legalName: "Brand Mint Studio LLP",
    gstin: "36ABCDE1234F1Z5",
    pan: "ABCDE1234F",
    address: "HITEC City, Hyderabad 500081",
    email: "hello@brandmint.studio",
    phone: "+91 77999 34943",
    website: "brandmint.studio",
    bank: { name: "HDFC Bank", account: "00000000000000", ifsc: "HDFC0000000" },
    pricing: {
      site: 200000,
      tool: 400000,
      brand: 150000,
      retainer: 100000,
      seo: 75000,
      ai: 200000,
    },
  });

  const leads = [
    {
      name: "Aarav Mehta",
      company: "Lume D2C",
      email: "aarav@lume.in",
      phone: "+91 98000 10001",
      projectType: "Brand + Site",
      budget: "3-8L",
      message:
        "Just raised our seed. Need a brand refresh + Shopify storefront. Heard about you from Riya.",
      status: "qualified",
      score: 82,
      source: "Referral",
    },
    {
      name: "Pooja Iyer",
      company: "Nimbus AI",
      email: "pooja@nimbusai.com",
      phone: "+91 98000 10002",
      projectType: "Custom internal tool",
      budget: "8L+",
      message:
        "Want a sales-ops dashboard that replaces our 4 sheets + Zapier mess.",
      status: "new",
      score: 91,
      source: "LinkedIn",
    },
    {
      name: "Karan Singh",
      company: "Heritage Hospitality",
      email: "karan@heritage.ae",
      phone: "+971 50 000 0001",
      projectType: "Brand + Site",
      budget: "8L+",
      message:
        "Family-office boutique hotel group, 4 properties. Need bilingual EN/AR site.",
      status: "qualified",
      score: 88,
      source: "Site contact form",
    },
    {
      name: "Diya Khanna",
      company: "Khanna Capital",
      email: "diya@khanna.vc",
      phone: "+91 98000 10004",
      projectType: "Marketing site",
      budget: "1-3L",
      message: "Refresh for our portfolio review microsite.",
      status: "lost",
      score: 41,
      source: "Site contact form",
    },
    {
      name: "Rahul Bhat",
      company: "Verdant Foods",
      email: "rahul@verdant.in",
      phone: "+91 98000 10005",
      projectType: "Marketing site",
      budget: "1-3L",
      message: "Ready to start in 2 weeks. Have copy + photos ready.",
      status: "won",
      score: 78,
      source: "Referral",
    },
  ];
  leads.forEach((l) => db.create("leads", l));

  const projects = [
    {
      name: "Verdant Foods — Marketing site",
      client: "Verdant Foods",
      type: "Site",
      stage: "Build",
      value: 350000,
      kickoff: "2026-04-22",
      due: "2026-06-03",
      owner: "Sumanth",
    },
    {
      name: "Nimbus AI — Sales-ops console",
      client: "Nimbus AI",
      type: "Tool",
      stage: "Architecture",
      value: 850000,
      kickoff: "2026-05-06",
      due: "2026-07-15",
      owner: "Sumanth",
    },
    {
      name: "Lume D2C — Brand refresh",
      client: "Lume D2C",
      type: "Brand",
      stage: "Mint",
      value: 220000,
      kickoff: "2026-05-12",
      due: "2026-06-20",
      owner: "Sumanth",
    },
    {
      name: "Past: Saffron Group — Investor site",
      client: "Saffron Group",
      type: "Site",
      stage: "Care",
      value: 480000,
      kickoff: "2026-01-12",
      due: "2026-02-28",
      owner: "Sumanth",
    },
  ];
  projects.forEach((p) => db.create("projects", p));

  const clients = [
    {
      name: "Verdant Foods",
      contact: "Rahul Bhat",
      email: "rahul@verdant.in",
      phone: "+91 98000 10005",
      city: "Bengaluru",
      tier: "Tier 2",
      lifetimeValue: 350000,
    },
    {
      name: "Nimbus AI",
      contact: "Pooja Iyer",
      email: "pooja@nimbusai.com",
      phone: "+91 98000 10002",
      city: "Hyderabad",
      tier: "Tier 1",
      lifetimeValue: 850000,
    },
    {
      name: "Lume D2C",
      contact: "Aarav Mehta",
      email: "aarav@lume.in",
      phone: "+91 98000 10001",
      city: "Mumbai",
      tier: "Tier 2",
      lifetimeValue: 220000,
    },
    {
      name: "Saffron Group",
      contact: "Vikram Saffron",
      email: "vikram@saffrongroup.com",
      phone: "+91 98000 10010",
      city: "Hyderabad",
      tier: "Tier 1",
      lifetimeValue: 480000,
    },
  ];
  clients.forEach((c) => db.create("clients", c));

  const invoices = [
    {
      number: "BM-2026-001",
      client: "Verdant Foods",
      issueDate: "2026-04-25",
      dueDate: "2026-05-25",
      lineItems: [
        { desc: "Marketing site — 50% kickoff", qty: 1, rate: 175000 },
      ],
      subtotal: 175000,
      gstRate: 18,
      gst: 31500,
      total: 206500,
      status: "paid",
      paidOn: "2026-04-28",
    },
    {
      number: "BM-2026-002",
      client: "Nimbus AI",
      issueDate: "2026-05-08",
      dueDate: "2026-06-08",
      lineItems: [
        { desc: "Sales-ops console — 40% kickoff", qty: 1, rate: 340000 },
      ],
      subtotal: 340000,
      gstRate: 18,
      gst: 61200,
      total: 401200,
      status: "sent",
    },
    {
      number: "BM-2026-003",
      client: "Lume D2C",
      issueDate: "2026-05-09",
      dueDate: "2026-06-09",
      lineItems: [
        { desc: "Brand refresh — 50% kickoff", qty: 1, rate: 110000 },
      ],
      subtotal: 110000,
      gstRate: 18,
      gst: 19800,
      total: 129800,
      status: "draft",
    },
  ];
  invoices.forEach((i) => db.create("invoices", i));

  const today = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);
  const addDays = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return fmt(d);
  };
  const content = [
    {
      date: addDays(0),
      title: "Case study: Verdant Foods +47% conversion",
      channel: "LinkedIn",
      type: "Carousel",
      status: "published",
    },
    {
      date: addDays(2),
      title: "Why we charge in INR, not USD",
      channel: "LinkedIn",
      type: "Post",
      status: "scheduled",
    },
    {
      date: addDays(4),
      title: "Behind the scenes — Nimbus AI architecture diagram",
      channel: "X / Twitter",
      type: "Image",
      status: "draft",
    },
    {
      date: addDays(7),
      title: "Hyderabad studio reveal",
      channel: "Instagram",
      type: "Reel",
      status: "draft",
    },
    {
      date: addDays(10),
      title: "Pricing breakdown: the ₹2 L marketing site",
      channel: "LinkedIn",
      type: "Article",
      status: "scheduled",
    },
    {
      date: addDays(14),
      title: "Founder note: Q2 retrospective",
      channel: "Newsletter",
      type: "Long-form",
      status: "draft",
    },
  ];
  content.forEach((c) => db.create("content", c));
}
