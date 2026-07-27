// Seed data for the walkthrough screenshots.
// Mirrors the real seed in assets/bm-app.js, plus the milestones, intake and
// deliverables a live project would have — so the screenshots show a working
// system rather than a page of empty states.

const ts = (iso) => ({ __ts: new Date(iso).toISOString() });
const daysAgo = (n) => ts(new Date(Date.now() - n * 86400000).toISOString());
const daysAhead = (n) => ts(new Date(Date.now() + n * 86400000).toISOString());

export const ADMIN_UID = "admin-uid-0001";
export const CLIENT_UID = "greenbasket-uid-0001";

export const store = {
  organisations: {
    brandmint: { name: "Brand Mint Studios", kind: "studio", status: "active", retainer: 0, retainerStatus: "none" },
    inventory: {
      name: "Inventory Manager", kind: "client", status: "active",
      retainer: 12500, retainerInKind: 12500, retainerStatus: "signed",
      note: "Rs 12,500/mo cash + Claude Max in kind. Shopify launch, then the commerce platform, paced over ~12 months.",
    },
    greenbasket: {
      name: "Green Basket", kind: "client", status: "active", retainer: 0, retainerStatus: "none",
      note: "COD-only web app + Play Store APK. Quoted Rs 95,000, Rs 15,000 received.",
    },
    tresor: {
      name: "Tresor Couture", kind: "client", status: "active", retainer: 10000, retainerStatus: "proposed",
      note: "Zero to production, unpaid so far. Rs 10,000/mo expected once live and deployed.",
    },
    modcon: { name: "Modcon HR", kind: "internal", status: "active", retainer: 0, retainerStatus: "none", note: "Free side build with an intern." },
    simplysip: { name: "SimplySip", kind: "client", status: "archived", retainer: 0, retainerStatus: "none" },
  },

  users: {
    [ADMIN_UID]: { orgId: "brandmint", role: "admin", name: "Admin", username: "admin" },
    [CLIENT_UID]: { orgId: "greenbasket", role: "client", name: "Green Basket", username: "greenbasket" },
  },

  projects: {
    "inventory-project": { orgId: "inventory", name: "Inventory Manager", type: "tool", dueAt: null, progress: 60, billable: true },
    "greenbasket-project": { orgId: "greenbasket", name: "Green Basket", type: "site", dueAt: daysAhead(18), progress: 70, billable: true },
    "tresor-project": { orgId: "tresor", name: "Tresor Couture", type: null, dueAt: null, progress: null, billable: false },
    "modcon-project": { orgId: "modcon", name: "Modcon HR", type: "internal", dueAt: null, progress: null, billable: false },
    "simplysip-project": { orgId: "simplysip", name: "SimplySip", type: null, dueAt: null, progress: null, billable: false },
  },

  "projects/greenbasket-project/milestones": {
    m1: { title: "Mint workshop + IA brief", owner: "us", status: "done", dueAt: daysAgo(24) },
    m2: { title: "Content + product photos supplied", owner: "client", status: "done", dueAt: daysAgo(19) },
    m3: { title: "Design system + key screens", owner: "us", status: "done", dueAt: daysAgo(12) },
    m4: { title: "COD checkout build", owner: "us", status: "in_progress", dueAt: daysAhead(4) },
    m5: { title: "Play Store APK submission", owner: "us", status: "todo", dueAt: daysAhead(18) },
  },
  "projects/greenbasket-project/intake": {
    i1: { label: "Product list: name, category, price, unit", group: "assets", done: true, raisedAt: daysAgo(26), clearedAt: daysAgo(20) },
    i2: { label: "Delivery pin codes you serve", group: "decisions", done: true, raisedAt: daysAgo(26), clearedAt: daysAgo(21) },
    i3: { label: "Google Play Developer account — add hello@brandmintstudios.in as a user on your own account", group: "access", done: false, raisedAt: daysAgo(9), clearedAt: null },
    i4: { label: "Privacy policy URL (required by Google)", group: "content", done: false, raisedAt: daysAgo(9), clearedAt: null },
    i5: { label: "COD order value limits, if any", group: "decisions", done: false, raisedAt: daysAgo(2), clearedAt: null },
  },
  "projects/greenbasket-project/deliverables": {
    d1: { title: "COD-only web application", version: 2, status: "in_review", url: "https://greenbasket-preview.vercel.app", decidedAt: null, decidedBy: null },
    d2: { title: "Play Store APK", version: 1, status: "in_review", url: "https://greenbasket-preview.vercel.app/apk", decidedAt: null, decidedBy: null },
    d3: { title: "Brand & storefront design system", version: 1, status: "approved", url: "https://greenbasket-preview.vercel.app/design", decidedAt: daysAgo(11), decidedBy: CLIENT_UID },
  },

  "projects/inventory-project/milestones": {
    m1: { title: "Shopify storefront launch", owner: "us", status: "in_progress", dueAt: daysAhead(26) },
    m2: { title: "Commerce platform — architecture", owner: "us", status: "todo", dueAt: daysAhead(70) },
  },
  "projects/inventory-project/intake": {
    i1: { label: "Shopify account — add hello@brandmintstudios.in as a staff user", group: "access", done: true, raisedAt: daysAgo(30), clearedAt: daysAgo(28) },
    i2: { label: "Supplier price list for the catalogue import", group: "assets", done: false, raisedAt: daysAgo(5), clearedAt: null },
  },

  invoices: {
    "greenbasket-inv-deposit": { orgId: "greenbasket", label: "Deposit received", amount: 15000, status: "paid", dueAt: daysAgo(30) },
    "greenbasket-inv-balance": { orgId: "greenbasket", label: "Balance of Rs 95,000 quote", amount: 80000, status: "due", dueAt: daysAhead(6) },
    "inventory-inv-retainer": { orgId: "inventory", label: "Monthly retainer", amount: 12500, status: "paid", dueAt: daysAgo(8) },
  },

  leads: {
    l1: { name: "Anjali Rao — bakery chain", source: "site", stage: "discovery", createdAt: daysAgo(3), firstResponseAt: ts(new Date(Date.now() - 3 * 86400000 + 4 * 60000).toISOString()), lossReason: null },
    l2: { name: "Vikram Textiles", source: "referral", stage: "proposal", createdAt: daysAgo(11), firstResponseAt: ts(new Date(Date.now() - 11 * 86400000 + 90 * 60000).toISOString()), lossReason: null },
    l3: { name: "Kirana POS enquiry", source: "linkedin", stage: "inbound", createdAt: daysAgo(1), firstResponseAt: null, lossReason: null },
  },

  catalog: {
    "payments-razorpay": { price: 40000, priceType: "fixed", buildDays: 4 },
    "returns-refunds": { price: 40000, priceType: "fixed", buildDays: 4 },
    "chat-support": { price: 30000, priceType: "fixed", buildDays: 3 },
    "gst-invoicing": { price: 30000, priceType: "fixed", buildDays: 3 },
    "instagram": { price: 40000, priceType: "fixed", buildDays: 4 },
  },
};

export const ADMIN_USER = { uid: ADMIN_UID, email: "admin@brandmintstudios.in" };
export const CLIENT_USER = { uid: CLIENT_UID, email: "greenbasket@brandmintstudios.in" };
