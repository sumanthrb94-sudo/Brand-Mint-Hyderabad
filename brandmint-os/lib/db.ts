// ---------------------------------------------------------------------------
// DATA LAYER
//
// Seeded in memory so the app runs with zero setup. Every read below goes
// through this module, so swapping in Postgres means replacing the function
// bodies — nothing in app/ changes.
//
// Corrected 27 Jul 2026 against reality:
//   - The Green Team and Modcon HR are INTERNAL projects, not clients.
//   - SimplySip Elixirs is ARCHIVED — closed, nothing to sell.
//   - Only the Inventory Manager retainer is SIGNED. Everything else is a
//     proposal, and proposals do not count as revenue.
// ---------------------------------------------------------------------------

export type Role = "admin" | "client";
export type OrgKind = "studio" | "client" | "internal";
export type OrgStatus = "active" | "archived";
export type RetainerStatus = "signed" | "proposed" | "none";

export type User = {
  id: string;
  username: string;
  passwordHash: string; // scrypt, "salt:hash" — never plaintext
  role: Role;
  orgId: string;
  name: string;
};

export type Org = {
  id: string;
  name: string;
  kind: OrgKind;
  status: OrgStatus;
  retainer: number;              // ₹ per month
  retainerStatus: RetainerStatus; // only "signed" counts as revenue
  note?: string;
};

export type Project = {
  id: string;
  orgId: string;
  name: string;
  type: string;
  status: "onboarding" | "in_progress" | "review" | "shipped" | "closed";
  billable: boolean;
  startedAt: string;
  dueAt: string;
  progress: number;
};

export type Milestone = {
  id: string; projectId: string; title: string;
  owner: "us" | "client";
  status: "done" | "in_progress" | "blocked" | "todo";
  dueAt: string;
};

export type IntakeItem = {
  id: string; projectId: string; label: string; help: string;
  kind: "asset" | "content" | "access" | "decision";
  done: boolean; raisedAt: string;
};

export type Deliverable = {
  id: string; projectId: string; title: string; url: string; version: number;
  status: "in_review" | "approved" | "changes_requested"; note?: string;
};

export type Invoice = {
  id: string; orgId: string; projectId: string; label: string; amount: number;
  status: "paid" | "due" | "scheduled"; dueAt: string; payUrl?: string;
};

export type Lead = {
  id: string; name: string; source: string;
  stage: "new" | "qualified" | "proposal" | "won" | "lost";
  value: number; createdAt: string; firstResponseMins: number | null;
};

// --- seed ------------------------------------------------------------------

const orgs: Org[] = [
  { id: "o0", name: "Brand Mint Studios", kind: "studio", status: "active", retainer: 0, retainerStatus: "none" },

  { id: "o6", name: "Inventory Manager", kind: "client", status: "active",
    retainer: 25000, retainerStatus: "signed", note: "The only signed retainer." },

  { id: "o1", name: "Green Basket", kind: "client", status: "active",
    retainer: 18000, retainerStatus: "proposed", note: "COD grocery — highest support load. Ask at handover." },
  { id: "o3", name: "Mobile Phone Market UK", kind: "client", status: "active",
    retainer: 15000, retainerStatus: "proposed", note: "Bill in GBP — same work, better rate." },
  { id: "o2", name: "Tresor Couture", kind: "client", status: "active",
    retainer: 6000, retainerStatus: "proposed", note: "Family rate. The point is the habit, not the money." },

  { id: "o4", name: "The Green Team", kind: "internal", status: "active",
    retainer: 0, retainerStatus: "none", note: "Your own project. Costs time, earns nothing." },
  { id: "o7", name: "Modcon", kind: "internal", status: "active",
    retainer: 0, retainerStatus: "none", note: "Modcon HR — built free with an intern. This is the productisation candidate." },

  { id: "o5", name: "SimplySip Elixirs", kind: "client", status: "archived",
    retainer: 0, retainerStatus: "none", note: "Closed. Nothing to sell here." },
];

const users: User[] = [
  { id: "u0", username: "admin", role: "admin", orgId: "o0", name: "Brand Mint",
    passwordHash: "38dff1cbb8b801dedb9f2ad5b1b7e324:71fa618d970d9f98e74ad0b400a07a70f7a3a5052c5d133068c919d7091c71ec6dd59685e56dd46dc0b5b3d2e834b8134461a67a99409c6a87a5619341259c9f" },
  { id: "u1", username: "greenbasket", role: "client", orgId: "o1", name: "Green Basket",
    passwordHash: "36bac8dd905bc2d1657f737f7b2634f2:a0d66bfb5b81e7797bd160c58fc5c528d52d2356363d1211db269b4b3270240f59d6a622e59d1eb291750ad239c5f51bfbb61de3ee185b1b23b63a5b81d67852" },
  { id: "u2", username: "tresor", role: "client", orgId: "o2", name: "Tresor Couture",
    passwordHash: "63ba3b57a90cab00368628321fe971a8:747ecb804ced108c9b770494e4e2b489fdcd664e22d6f043e11021b5005c90edb1a0f50d7945edff2ada0dea7c55898afaa428a779bd6cd5dea8baf9a514578c" },
  { id: "u3", username: "mpmuk", role: "client", orgId: "o3", name: "Mobile Phone Market",
    passwordHash: "922b72eebc23a9c5d1ae50c17abdec76:dad46101be3ab7ff3e32b79ffe20096e3c1d70d3677e496912bd85d20d3ba1bd2e5ac0b0a78208d9944cd69bc0314f061e1d6035a1e02fca58a6cc5bc97854fa" },
];

const projects: Project[] = [
  { id: "p1", orgId: "o1", name: "Green Basket storefront + Play Store", type: "Launch sprint",
    status: "in_progress", billable: true, startedAt: "2026-07-21", dueAt: "2026-08-06", progress: 60 },
  { id: "p3", orgId: "o3", name: "Mobile phone e-commerce", type: "E-commerce",
    status: "in_progress", billable: true, startedAt: "2026-06-30", dueAt: "2026-08-11", progress: 72 },
  { id: "p2", orgId: "o2", name: "Tresor Couture — brand site", type: "Launch sprint",
    status: "onboarding", billable: false, startedAt: "2026-07-24", dueAt: "2026-08-14", progress: 15 },
  { id: "p4", orgId: "o7", name: "Modcon HR", type: "Internal — intern build",
    status: "in_progress", billable: false, startedAt: "2026-06-20", dueAt: "2026-08-20", progress: 45 },
];

const milestones: Milestone[] = [
  { id: "m1", projectId: "p1", title: "Catalogue & search", owner: "us", status: "done", dueAt: "2026-07-25" },
  { id: "m2", projectId: "p1", title: "Cart & COD checkout", owner: "us", status: "done", dueAt: "2026-07-29" },
  { id: "m3", projectId: "p1", title: "Order management", owner: "us", status: "in_progress", dueAt: "2026-08-02" },
  { id: "m4", projectId: "p1", title: "Play Store build", owner: "client", status: "blocked", dueAt: "2026-08-03" },
  { id: "m5", projectId: "p1", title: "Handover & training", owner: "us", status: "todo", dueAt: "2026-08-06" },
  { id: "m8", projectId: "p3", title: "Payment integration", owner: "client", status: "blocked", dueAt: "2026-08-01" },
  { id: "m9", projectId: "p3", title: "Catalogue import", owner: "us", status: "done", dueAt: "2026-07-20" },
  { id: "m6", projectId: "p2", title: "Brand intake", owner: "client", status: "in_progress", dueAt: "2026-07-30" },
  { id: "m7", projectId: "p2", title: "Design direction", owner: "us", status: "todo", dueAt: "2026-08-04" },
  { id: "m10", projectId: "p4", title: "Roles & permissions", owner: "us", status: "done", dueAt: "2026-07-10" },
  { id: "m11", projectId: "p4", title: "Leave & attendance", owner: "us", status: "in_progress", dueAt: "2026-08-05" },
  { id: "m12", projectId: "p4", title: "Multi-tenant split", owner: "us", status: "todo", dueAt: "2026-08-20" },
];

const intake: IntakeItem[] = [
  { id: "i1", projectId: "p1", label: "Play Store developer account access", help: "Add hello@brandmintstudios.in as a user on your Play Console. Do not send us a password.", kind: "access", done: false, raisedAt: "2026-07-23" },
  { id: "i2", projectId: "p1", label: "Final delivery-radius list for COD", help: "Pin codes you deliver to, and any cash limits per zone.", kind: "decision", done: false, raisedAt: "2026-07-25" },
  { id: "i3", projectId: "p1", label: "Category icons sign-off", help: "Approve the icon set in the Approvals panel.", kind: "decision", done: false, raisedAt: "2026-07-27" },
  { id: "i4", projectId: "p1", label: "Product photography", help: "At least one image per SKU, 1000px or larger.", kind: "asset", done: true, raisedAt: "2026-07-21" },
  { id: "i5", projectId: "p1", label: "Business details for the store listing", help: "Registered name, GSTIN, support number, returns policy.", kind: "content", done: true, raisedAt: "2026-07-21" },
  { id: "i6", projectId: "p2", label: "Logo files", help: "Vector if you have them — SVG, AI or PDF.", kind: "asset", done: true, raisedAt: "2026-07-24" },
  { id: "i7", projectId: "p2", label: "Lookbook photography", help: "Current collection, high resolution.", kind: "asset", done: false, raisedAt: "2026-07-24" },
  { id: "i8", projectId: "p2", label: "Brand tone & reference sites", help: "Three sites you like and one line on why.", kind: "content", done: false, raisedAt: "2026-07-24" },
  { id: "i9", projectId: "p2", label: "Domain DNS access", help: "Add us as a user at your registrar. Never share the password.", kind: "access", done: false, raisedAt: "2026-07-25" },
  { id: "i10", projectId: "p3", label: "Payment gateway merchant ID", help: "Merchant ID only — we will request keys through your dashboard.", kind: "access", done: false, raisedAt: "2026-07-18" },
];

const deliverables: Deliverable[] = [
  { id: "d1", projectId: "p1", title: "Checkout flow", url: "#", version: 3, status: "in_review" },
  { id: "d2", projectId: "p1", title: "Order confirmation email", url: "#", version: 1, status: "in_review" },
  { id: "d3", projectId: "p1", title: "Category page layout", url: "#", version: 2, status: "approved" },
  { id: "d4", projectId: "p2", title: "Moodboard", url: "#", version: 1, status: "in_review" },
  { id: "d5", projectId: "p3", title: "Product detail page", url: "#", version: 4, status: "approved" },
];

const invoices: Invoice[] = [
  { id: "n1", orgId: "o1", projectId: "p1", label: "Advance", amount: 15000, status: "paid", dueAt: "2026-07-21" },
  { id: "n2", orgId: "o1", projectId: "p1", label: "Milestone 2", amount: 40000, status: "due", dueAt: "2026-07-30", payUrl: "#" },
  { id: "n3", orgId: "o1", projectId: "p1", label: "On delivery", amount: 40000, status: "scheduled", dueAt: "2026-08-06" },
  { id: "n5", orgId: "o3", projectId: "p3", label: "Milestone 3", amount: 60000, status: "due", dueAt: "2026-07-29", payUrl: "#" },
];

// Only real, verified leads. Invented names removed 27 Jul.
const leads: Lead[] = [
  { id: "l5", name: "Green Basket", source: "referral", stage: "won", value: 95000, createdAt: "2026-07-10", firstResponseMins: 11 },
  { id: "l6", name: "Jora Bakes", source: "past client", stage: "lost", value: 50000, createdAt: "2026-05-27", firstResponseMins: 240 },
];

// --- accessors -------------------------------------------------------------

export const BREAK_EVEN = 96100;

export const findUser = (u: string) =>
  users.find((x) => x.username.toLowerCase() === u.toLowerCase().trim());
export const getUser = (id: string) => users.find((u) => u.id === id);
export const getOrg = (id: string) => orgs.find((o) => o.id === id);

export const activeClients = () => orgs.filter((o) => o.kind === "client" && o.status === "active");
export const internalOrgs = () => orgs.filter((o) => o.kind === "internal");
export const archivedOrgs = () => orgs.filter((o) => o.status === "archived");

export const projectsFor = (orgId: string) => projects.filter((p) => p.orgId === orgId);
export const allProjects = () => projects;
export const billableProjects = () => projects.filter((p) => p.billable);

export const milestonesFor = (id: string) => milestones.filter((m) => m.projectId === id);
export const allMilestones = () => milestones;

export const intakeFor = (id: string) => intake.filter((i) => i.projectId === id);
export const openIntakeFor = (id: string) => intake.filter((i) => i.projectId === id && !i.done);
export const allIntake = () => intake;

export const deliverablesFor = (id: string) => deliverables.filter((d) => d.projectId === id);
export const invoicesFor = (orgId: string) => invoices.filter((n) => n.orgId === orgId);
export const allInvoices = () => invoices;
export const allLeads = () => leads;

/** Signed retainers only. A proposal is not revenue. */
export const signedMrr = () =>
  orgs.filter((o) => o.retainerStatus === "signed").reduce((s, o) => s + o.retainer, 0);

/** What the ladder is worth if every open proposal converts. */
export const proposedMrr = () =>
  orgs.filter((o) => o.retainerStatus === "proposed").reduce((s, o) => s + o.retainer, 0);

export const medianFirstResponse = () => {
  const v = leads.map((l) => l.firstResponseMins).filter((n): n is number => n !== null).sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : null;
};

export const openLeadCount = () =>
  leads.filter((l) => l.stage === "new" || l.stage === "qualified" || l.stage === "proposal").length;

// --- mutations (demo only) -------------------------------------------------

export function toggleIntake(id: string, done: boolean) {
  const item = intake.find((i) => i.id === id);
  if (item) item.done = done;
}

export function decideDeliverable(id: string, status: Deliverable["status"], note?: string) {
  const d = deliverables.find((x) => x.id === id);
  if (d) { d.status = status; if (note) d.note = note; }
}

export const daysSince = (iso: string) =>
  Math.max(0, Math.round((Date.parse("2026-07-27") - Date.parse(iso)) / 86400000));

export const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
