/**
 * Brand Mint Admin — Data layer (Firestore).
 *
 * Keeps a synchronous in-memory cache so the admin modules stay sync — they
 * call db.list()/db.get() during render and can't await. Firestore's own
 * persistent cache handles durability and offline writes, which is what the
 * hand-rolled localStorage mirror used to do.
 *
 * Lifecycle:
 *   1. boot() awaits db.hydrate() — attaches an onSnapshot listener per
 *      collection. The first snapshot fills the cache; every later one keeps
 *      it live, so hydration and realtime are the same mechanism.
 *   2. db.list/get serve from cache (sync, instant)
 *   3. db.create/update/remove patch the cache immediately, then
 *      fire-and-forget the write. Firestore queues it if offline; a genuine
 *      rejection (usually a rules denial) increments a counter and toasts.
 *
 * No case conversion: Firestore stores the JS objects it's given, so the
 * app's camelCase goes in and comes back unchanged. Timestamps stay ISO
 * strings rather than Firestore Timestamps, because every consumer here
 * does Date.parse() or a string compare.
 */

import { getFirebase, isConfigured } from "/firebase/app.js";

const COLLECTIONS = [
  "leads",
  "projects",
  "clients",
  "invoices",
  // Portal + onboarding
  "clientUsers",
  "invites",
  "onboardingResponses",
  "milestones",
  "deliverables",
  "messages",
  // Free perks + pre-bookings from the portal
  "requests",
  // Sign-in profiles (readiness score lives here)
  "profiles",
];

// The singleton settings document lives at settings/singleton.
const SETTINGS_ID = "singleton";

// Optional toast handle, set by admin/app.js after components.js loads.
let toastFn = null;
export function setToastHandle(fn) { toastFn = fn; }
function toastIfAvailable(msg) {
  if (typeof toastFn === "function") {
    try { toastFn(msg, 4200); } catch (_) {}
  }
}

// Per-collection change listeners. Modules subscribe to re-render when their
// collection changes (locally or from a snapshot).
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
  clientUsers: [],
  invites: [],
  onboardingResponses: [],
  milestones: [],
  deliverables: [],
  messages: [],
  requests: [],
  profiles: [],
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

/* ---------- hydration + realtime (one mechanism) ---------- */

let bound = false;
const unsubscribers = [];

export async function hydrate() {
  if (!isConfigured()) {
    console.warn("[db] Firebase not configured; running in local-only mode");
    return { remote: false };
  }
  if (bound) return { remote: true };

  try {
    const fb = await getFirebase();
    const { collection, doc, onSnapshot } = fb.sdk;

    // Wait for the first snapshot of every collection before returning, so
    // the first render has data rather than flashing empty panels.
    await Promise.all(
      COLLECTIONS.map(
        (name) =>
          new Promise((resolve) => {
            let settled = false;
            const unsub = onSnapshot(
              collection(fb.db, name),
              (snap) => {
                cache[name] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
                lastSyncAt = new Date().toISOString();
                emitTable(name);
                emit();
                if (!settled) { settled = true; resolve(); }
              },
              (err) => {
                // One denied or missing collection must not blank the rest.
                console.warn(`[db] ${name} listener failed`, err);
                syncErrors++;
                lastError = `${name}: ${err.message}`;
                emit();
                if (!settled) { settled = true; resolve(); }
              }
            );
            unsubscribers.push(unsub);
          })
      )
    );

    // Settings is a single document, not a collection.
    await new Promise((resolve) => {
      let settled = false;
      const unsub = onSnapshot(
        doc(fb.db, "settings", SETTINGS_ID),
        (snap) => {
          cache.settings = snap.exists() ? { id: snap.id, ...snap.data() } : null;
          emit();
          if (!settled) { settled = true; resolve(); }
        },
        (err) => {
          console.warn("[db] settings listener failed", err);
          if (!settled) { settled = true; resolve(); }
        }
      );
      unsubscribers.push(unsub);
    });

    bound = true;
    emit();
    return { remote: true };
  } catch (e) {
    console.error("[db] hydrate failed", e);
    syncErrors++;
    lastError = e?.message || String(e);
    emit();
    return { remote: false, error: e };
  }
}

/** Detach every listener. Called on sign-out. */
export function teardown() {
  while (unsubscribers.length) {
    try { unsubscribers.pop()(); } catch (_) {}
  }
  bound = false;
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

/**
 * Firestore rejects `undefined` field values outright, where Postgres just
 * ignored them. Strip them rather than letting a write blow up.
 */
function clean(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

async function pushInsert(table, row) {
  if (!isConfigured()) return { ok: true, local: true };
  try {
    const fb = await getFirebase();
    const { doc, setDoc } = fb.sdk;
    const { id, ...rest } = row;
    await setDoc(doc(fb.db, table, id), clean(rest));
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
    const fb = await getFirebase();
    const { doc, updateDoc } = fb.sdk;
    const { id: _ignored, ...rest } = patch;
    await updateDoc(doc(fb.db, table, id), clean(rest));
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
    const fb = await getFirebase();
    const { doc, deleteDoc } = fb.sdk;
    await deleteDoc(doc(fb.db, table, id));
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
    const fb = await getFirebase();
    const { doc, setDoc } = fb.sdk;
    const { id: _ignored, ...rest } = patch;
    await setDoc(doc(fb.db, "settings", SETTINGS_ID), clean(rest), { merge: true });
    recordSuccess();
  } catch (e) {
    console.error("[db] settings write failed", e);
    recordFailure("settings write", e);
  }
}

// Kept so callers that still reference it don't break; the cache is now
// owned by Firestore's persistence layer, so there is nothing to mirror.
function persist(_table) {}

/* ---------- sync API ---------- */

function nowIso() {
  return new Date().toISOString();
}
function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/** Analytics events since an ISO timestamp, newest first. Not cached — the
 *  collection grows without bound, so the analytics views query on demand. */
export async function fetchEvents({ since, max = 5000 } = {}) {
  const fb = await getFirebase();
  const { collection, query, where, orderBy, limit, getDocs } = fb.sdk;
  const snap = await getDocs(query(collection(fb.db, "events"), where("ts", ">=", since), orderBy("ts", "desc"), limit(max)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export const db = {
  fetchEvents,
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
  /**
   * Clear the in-memory view only. This does NOT delete anything in
   * Firestore — a live listener will refill the cache on the next snapshot.
   * It exists for the Settings screen's "start over" affordance, which is a
   * local reset, not a destructive remote one.
   */
  wipe() {
    for (const t of COLLECTIONS) cache[t] = [];
    cache.settings = null;
    for (const t of COLLECTIONS) emitTable(t);
    emit();
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

}
