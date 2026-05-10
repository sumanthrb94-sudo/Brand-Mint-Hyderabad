/**
 * Brand Mint Admin — Data Layer
 *
 * LocalStorage-backed CRUD with a clean abstraction. To migrate to Supabase
 * later, swap the internals of get/list/create/update/remove. Callers only
 * use the exported db.* API, never localStorage directly.
 *
 * Schema: every collection is an array of {id, createdAt, updatedAt, ...rest}.
 */

const NS = "bm.admin.v1.";
const COLLECTIONS = [
  "leads",
  "projects",
  "clients",
  "invoices",
  "content",
  "settings",
];

function key(name) {
  return NS + name;
}
function readAll(name) {
  try {
    const raw = localStorage.getItem(key(name));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function writeAll(name, rows) {
  localStorage.setItem(key(name), JSON.stringify(rows));
}
function nextId() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  ).toUpperCase();
}
function now() {
  return new Date().toISOString();
}

export const db = {
  /** Read one row by id, or null. */
  get(collection, id) {
    return readAll(collection).find((r) => r.id === id) || null;
  },
  /** Read all rows in a collection, optionally filtered. */
  list(collection, filter) {
    const rows = readAll(collection);
    if (typeof filter === "function") return rows.filter(filter);
    if (filter && typeof filter === "object") {
      return rows.filter((r) =>
        Object.entries(filter).every(([k, v]) => r[k] === v)
      );
    }
    return rows;
  },
  /** Insert a new row. Returns the new row with id/createdAt. */
  create(collection, data) {
    const rows = readAll(collection);
    const row = {
      id: nextId(),
      createdAt: now(),
      updatedAt: now(),
      ...data,
    };
    rows.unshift(row);
    writeAll(collection, rows);
    return row;
  },
  /** Patch a row by id. Returns the updated row, or null if not found. */
  update(collection, id, patch) {
    const rows = readAll(collection);
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    rows[idx] = { ...rows[idx], ...patch, updatedAt: now() };
    writeAll(collection, rows);
    return rows[idx];
  },
  /** Delete a row. Returns true if deleted. */
  remove(collection, id) {
    const rows = readAll(collection);
    const next = rows.filter((r) => r.id !== id);
    if (next.length === rows.length) return false;
    writeAll(collection, next);
    return true;
  },
  /** Bulk replace a collection (used by import). */
  replace(collection, rows) {
    writeAll(collection, rows);
  },
  /** Settings is a singleton object, not a collection. */
  settings: {
    get() {
      try {
        const raw = localStorage.getItem(key("settings"));
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },
    set(patch) {
      const cur = this.get() || {};
      const next = { ...cur, ...patch, updatedAt: now() };
      localStorage.setItem(key("settings"), JSON.stringify(next));
      return next;
    },
  },
  /** Dump everything for a JSON export. */
  exportAll() {
    const dump = { exportedAt: now(), version: 1, data: {} };
    for (const c of COLLECTIONS) {
      if (c === "settings") {
        dump.data.settings = this.settings.get() || {};
      } else {
        dump.data[c] = readAll(c);
      }
    }
    return dump;
  },
  /** Import a previously-exported JSON dump. */
  importAll(dump) {
    if (!dump || !dump.data) throw new Error("Invalid dump");
    for (const c of COLLECTIONS) {
      if (c === "settings" && dump.data.settings) {
        localStorage.setItem(key("settings"), JSON.stringify(dump.data.settings));
      } else if (Array.isArray(dump.data[c])) {
        writeAll(c, dump.data[c]);
      }
    }
  },
  /** Wipe all admin data. */
  wipe() {
    for (const c of COLLECTIONS) localStorage.removeItem(key(c));
  },
};

/** Seed first-run demo data so the dashboard isn't empty on first login. */
export function seedIfEmpty() {
  if (db.settings.get()) return; // already seeded

  db.settings.set({
    studioName: "Brand Mint",
    legalName: "Brand Mint Studio LLP",
    gstin: "36ABCDE1234F1Z5",
    pan: "ABCDE1234F",
    address: "HITEC City, Hyderabad 500081",
    email: "hello@brandmint.studio",
    phone: "+91 00000 00000",
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
    passcodeHash: null,
  });

  // Demo leads
  const demoLeads = [
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
  demoLeads.forEach((l) => db.create("leads", l));

  // Demo projects
  const demoProjects = [
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
  demoProjects.forEach((p) => db.create("projects", p));

  // Demo clients
  const demoClients = [
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
  demoClients.forEach((c) => db.create("clients", c));

  // Demo invoices
  const demoInvoices = [
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
  demoInvoices.forEach((i) => db.create("invoices", i));

  // Demo content calendar
  const today = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);
  const addDays = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return fmt(d);
  };
  const demoContent = [
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
  demoContent.forEach((c) => db.create("content", c));
}
