// Brand Mint client portal — Firebase init + every read and write.
// Plain ES module, no bundler. Firebase v10.14.1 from the official CDN.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  connectAuthEmulator,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  writeBatch,
  runTransaction,
  serverTimestamp,
  connectFirestoreEmulator,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBk1rF-GagRY_XIXfXdXq2ndXfI0hZc2KI",
  authDomain: "brandmintstudios-a5eb7.firebaseapp.com",
  projectId: "brandmintstudios-a5eb7",
  storageBucket: "brandmintstudios-a5eb7.firebasestorage.app",
  messagingSenderId: "347410314571",
  appId: "1:347410314571:web:ca05f839b43bec5f1a64ce",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/* Local emulators, and ONLY on a local host.
 *
 * The whole journey — a lead becoming a signed client, an intake item being
 * ticked, an invoice being paid — cannot be rehearsed against production
 * without inventing fake clients in the real database, which is exactly what
 * this project forbids. It has to be rehearsed somewhere, so it is rehearsed
 * here.
 *
 * The gate is the hostname, checked against an explicit list. Not "is not
 * brandmintstudios.in", because a negative test passes for every host nobody
 * thought of, including a Vercel preview URL — and a preview silently talking
 * to an emulator that is not running would look exactly like the database
 * being down. A positive list can only be wrong in the safe direction.
 */
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"];
export const USING_EMULATOR =
  typeof location !== "undefined" && LOCAL_HOSTS.includes(location.hostname);

if (USING_EMULATOR) {
  connectAuthEmulator(auth, `http://${location.hostname}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, location.hostname, 8080);
  // Loud on purpose. Silence here would leave you wondering why production
  // data is missing when you are simply not looking at production.
  console.info("[bm] Firebase emulators — nothing here touches the live project.");
}

export const ADMIN_EMAIL = "admin@brandmintstudios.in";
const USERNAME_DOMAIN = "brandmintstudios.in";

// --- Auth ---------------------------------------------------------------

export function resolveUsernameToEmail(input) {
  const value = (input || "").trim().toLowerCase();
  return value.includes("@") ? value : `${value}@${USERNAME_DOMAIN}`;
}

export function isAdminUser(user) {
  return !!user && user.email === ADMIN_EMAIL;
}

export function loginWithUsername(usernameOrEmail, password) {
  const email = resolveUsernameToEmail(usernameOrEmail);
  return signInWithEmailAndPassword(auth, email, password);
}

export function logout() {
  return signOut(auth);
}

// Resolves once with the first known auth state (null if signed out).
function waitForAuth() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}

// Signed-out visitors get bounced to /login.
export async function requireClientAuth() {
  const user = await waitForAuth();
  if (!user) {
    window.location.replace("/login");
    return null;
  }
  return user;
}

// Non-admins get bounced to /portal; signed-out visitors to /login.
export async function requireAdminAuth() {
  const user = await waitForAuth();
  if (!user) {
    window.location.replace("/login");
    return null;
  }
  if (!isAdminUser(user)) {
    window.location.replace("/portal");
    return null;
  }
  return user;
}

// For /login: an already signed-in visitor is sent straight to their page.
export async function redirectIfSignedIn() {
  const user = await waitForAuth();
  if (user) {
    window.location.replace(isAdminUser(user) ? "/studio" : "/portal");
  }
}

// --- Reads ----------------------------------------------------------------

function withId(snap) {
  return { id: snap.id, ...snap.data() };
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? withId(snap) : null;
}

export async function getOrg(orgId) {
  const snap = await getDoc(doc(db, "organisations", orgId));
  return snap.exists() ? withId(snap) : null;
}

/** Every users document. Admin only — the rules allow a client to read
 *  exactly their own, so a client calling this gets nothing. */
export async function getAllUsers() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map(withId);
}

export async function getAllOrgs() {
  const snap = await getDocs(collection(db, "organisations"));
  return snap.docs.map(withId);
}

export async function getProjectsForOrg(orgId) {
  const q = query(collection(db, "projects"), where("orgId", "==", orgId));
  const snap = await getDocs(q);
  return snap.docs.map(withId);
}

export async function getAllProjects() {
  const snap = await getDocs(collection(db, "projects"));
  return snap.docs.map(withId);
}

export async function getMilestones(projectId) {
  const snap = await getDocs(collection(db, "projects", projectId, "milestones"));
  return snap.docs.map(withId);
}

export async function getIntake(projectId) {
  const snap = await getDocs(collection(db, "projects", projectId, "intake"));
  return snap.docs.map(withId);
}

export async function getDeliverables(projectId) {
  const snap = await getDocs(collection(db, "projects", projectId, "deliverables"));
  return snap.docs.map(withId);
}

export async function getInvoicesForOrg(orgId) {
  const q = query(collection(db, "invoices"), where("orgId", "==", orgId));
  const snap = await getDocs(q);
  return snap.docs.map(withId);
}

export async function getAllInvoices() {
  const snap = await getDocs(collection(db, "invoices"));
  return snap.docs.map(withId);
}

export async function getAllLeads() {
  const snap = await getDocs(collection(db, "leads"));
  return snap.docs.map(withId);
}

// --- The audit log (§9 item 4) ---------------------------------------------

/**
 * Append one entry. **This function never throws, and never rejects.**
 *
 * That is the whole contract, and it is deliberate rather than lazy. Logging
 * is a side effect of an action that has ALREADY SUCCEEDED — the invoice is
 * already paid, the retainer is already signed. If this threw, the caller's
 * error handler would report a failure that did not happen and, worse, would
 * likely re-run the action. A failed log must never turn into a wrong story
 * about the thing it was logging.
 *
 * It also makes the deployment order safe in both directions. CLAUDE.md §2
 * says publish rules BEFORE code, because new code against old rules gets
 * denied — but if this ships first anyway, every entry is simply denied and
 * discarded, and the CRM behaves exactly as it did before the log existed.
 * The Activity view is what tells you the difference, by distinguishing
 * "denied" from "empty" rather than rendering both as a reassuring blank.
 *
 * Returns true if the entry landed, false if it did not. Callers may ignore it.
 */
export async function logActivity(action, summary, extra = {}) {
  try {
    const user = auth.currentUser;
    if (!user) return false;
    await addDoc(collection(db, "activity"), {
      // Pinned by the rules to request.time / the caller's own identity — an
      // entry cannot be backdated or attributed to someone else. Sent here in
      // the only form that satisfies them.
      at: serverTimestamp(),
      actor: user.uid,
      actorEmail: user.email,
      action: String(action).slice(0, 64),
      summary: String(summary).slice(0, 300),
      // Free-form context. Never trusted for identity or ordering.
      orgId: extra.orgId ?? null,
      target: extra.target ?? null,
      amount: extra.amount ?? null,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * The log, newest first. Unlike logActivity this DOES throw — the Activity
 * view has to be able to tell a permission-denied (rules not published yet)
 * apart from a genuinely empty collection, and swallowing the error here
 * would make an unpublished ruleset look identical to a quiet week.
 *
 * Ordered on a single field, so Firestore's automatic single-field index
 * covers it and no composite index has to be created by hand.
 */
export async function getActivity(max = 200) {
  const snap = await getDocs(
    query(collection(db, "activity"), orderBy("at", "desc"), limit(max))
  );
  return snap.docs.map(withId);
}

// --- Writes (client-facing) ------------------------------------------------

// Rules only allow a client to touch `done` + `clearedAt` on their own org's
// intake items — nothing else.
export async function setIntakeDone(projectId, intakeId, done) {
  await updateDoc(doc(db, "projects", projectId, "intake", intakeId), {
    done,
    clearedAt: done ? serverTimestamp() : null,
  });
}

// Rules only allow a client to set status to 'approved' or 'changes_requested'
// plus decidedAt/decidedBy — nothing else, and only on their own org's deliverables.
export async function decideDeliverable(projectId, deliverableId, status) {
  await updateDoc(doc(db, "projects", projectId, "deliverables", deliverableId), {
    status,
    decidedAt: serverTimestamp(),
    decidedBy: auth.currentUser ? auth.currentUser.uid : null,
  });
}

// --- Seed (admin only — enforced again by firestore.rules) -----------------

const SEED_ORGS = [
  { id: "brandmint", name: "Brand Mint Studios", kind: "studio", status: "active", retainer: 0, retainerStatus: "none" },
  // Rs 12,500 cash + a Claude Max subscription. Only the cash counts toward
  // MRR — a subscription cannot pay a bill, and the break-even gauge exists to
  // answer "can I cover this month", not "what is this worth".
  { id: "inventory", name: "Inventory Manager", kind: "client", status: "active", retainer: 12500, retainerInKind: 12500, retainerStatus: "signed", note: "Rs 12,500/mo cash + Claude Max in kind. Shopify launch, then the commerce platform, paced over ~12 months." },
  { id: "greenbasket", name: "Green Basket", kind: "client", status: "active", retainer: 0, retainerStatus: "none", note: "COD-only web app + Play Store APK. Quoted Rs 95,000, Rs 15,000 received." },
  // Rs 10,000/mo is expected once the store is production-ready and deployed —
  // not yet agreed, so it is `proposed`. Proposals render faded and are never
  // summed into MRR. It becomes real the day it is signed, not the day it is
  // hoped for.
  { id: "tresor", name: "Tresor Couture", kind: "client", status: "active", retainer: 10000, retainerStatus: "proposed", note: "Zero to production, unpaid so far. Rs 10,000/mo expected once live and deployed." },
  { id: "modcon", name: "Modcon HR", kind: "internal", status: "active", retainer: 0, retainerStatus: "none", note: "Free side build with an intern." },
  { id: "simplysip", name: "SimplySip", kind: "client", status: "archived", retainer: 0, retainerStatus: "none" },
];

// `type` uses the service-catalog vocabulary (see SERVICE_TYPES) so milestone
// templates can key off it. It is set only where the evidence is unambiguous —
// Inventory Manager is a tool, Green Basket is a COD web app, Modcon HR is the
// internal build. Tresor and SimplySip are left null rather than guessed; the
// admin picks their type in one click on /studio.
// dueAt stays null and progress stays null rather than inventing a schedule or
// a completion percentage nobody has confirmed. null progress renders as
// "not set", never as a reassuring 0% bar.
const SEED_PROJECTS = [
  { id: "inventory-project", orgId: "inventory", name: "Inventory Manager", type: "tool", dueAt: null, progress: null, billable: true },
  { id: "greenbasket-project", orgId: "greenbasket", name: "Green Basket", type: "site", dueAt: null, progress: null, billable: true },
  { id: "tresor-project", orgId: "tresor", name: "Tresor Couture", type: null, dueAt: null, progress: null, billable: false },
  { id: "modcon-project", orgId: "modcon", name: "Modcon HR", type: "internal", dueAt: null, progress: null, billable: false },
  // Archived org — never billable.
  { id: "simplysip-project", orgId: "simplysip", name: "SimplySip", type: null, dueAt: null, progress: null, billable: false },
];

const SEED_INVOICES = [
  { id: "greenbasket-inv-deposit", orgId: "greenbasket", label: "Deposit received", amount: 15000, status: "paid" },
  { id: "greenbasket-inv-balance", orgId: "greenbasket", label: "Balance of Rs 95,000 quote", amount: 80000, status: "due" },
  { id: "inventory-inv-retainer", orgId: "inventory", label: "Monthly retainer", amount: 25000, status: "paid" },
];

// The only two Green Basket deliverables confirmed real — nothing else is
// invented. Everything else gets entered through the studio's own
// milestone/intake/deliverable forms.
const SEED_GREENBASKET_DELIVERABLES = [
  { id: "cod-web-app", title: "COD-only web application", version: 1, status: "in_review", url: null },
  { id: "play-store-apk", title: "Play Store APK", version: 1, status: "in_review", url: null },
];

// Deterministic IDs + a full overwrite each time make this safe to run
// more than once — same input, same end state.
export async function seedDatabase() {
  const batch = writeBatch(db);

  for (const org of SEED_ORGS) {
    const { id, ...data } = org;
    batch.set(doc(db, "organisations", id), data);
  }
  for (const project of SEED_PROJECTS) {
    const { id, ...data } = project;
    batch.set(doc(db, "projects", id), data);
  }
  for (const invoice of SEED_INVOICES) {
    const { id, ...data } = invoice;
    batch.set(doc(db, "invoices", id), data);
  }
  for (const deliverable of SEED_GREENBASKET_DELIVERABLES) {
    const { id, ...data } = deliverable;
    batch.set(doc(db, "projects", "greenbasket-project", "deliverables", id), data);
  }

  // Without this, the admin's own users/{uid} doc never exists and every
  // rule that calls me()/myOrg() would fail for them too — isAdmin() saves
  // /studio itself, but nothing else.
  if (auth.currentUser) {
    batch.set(doc(db, "users", auth.currentUser.uid), {
      orgId: "brandmint",
      role: "admin",
      name: "Admin",
      username: "admin",
    });
  }

  await batch.commit();
}

// --- Client access (admin only) --------------------------------------------

// The only way a client's users/{uid} doc gets created. No password ever
// passes through this — that only ever exists in the Firebase Console.
export async function setClientUser(uid, { orgId, role, name, username }) {
  await setDoc(doc(db, "users", uid), {
    orgId,
    role: role || "client",
    name,
    username,
  });
}

/* ══════════════════════════════════════════════════════════════════
   THE TEAM — making the five roles usable, not just enforced

   firestore.rules already implements the spec's Section 3 matrix. Until this
   existed, every one of those roles had to be created by hand-editing
   documents in the Firebase Console, which means the boundary was enforced
   and unusable at the same time.

   Three things, and no more: who someone is, what they may see, and which
   engagements they are on.

   NO PASSWORD, EVER (§4). Like the client access panel, this takes a UID.
   The account itself is created in the Firebase Console, and the password
   exists there and nowhere else — this app never sees one. A "create the
   account for me" button here would mean this form collecting a credential,
   which is the one thing that is never negotiable.
   ══════════════════════════════════════════════════════════════════ */

/* The studio's own organisation. Hardcoded, like ADMIN_EMAIL — CLAUDE.md §1
   records both as the multi-tenancy debt to pay before this ships to a second
   studio. Named here rather than typed inline again so there is one more
   place to change and not two. */
export const STUDIO_ORG_ID = "brandmint";

export const STAFF_ROLES = [
  { id: "partner", label: "Partner",
    blurb: "Full operational access to the engagements they are on. Sees clients and invoices; cannot settle one, and cannot read any rate." },
  { id: "collaborator", label: "Collaborator",
    blurb: "Tasks and deliverables on assigned engagements only. No clients, no invoices, no scope — scope carries the prices." },
  { id: "finance", label: "Finance",
    blurb: "Invoices and payments, in full. Reads clients and rates; cannot touch deliverables or scope." },
];

/** Everyone who works for the studio. Excludes clients and the CEO — the CEO
 *  is a token claim, not a row, so there is nothing here to edit. */
export function staffUsers(users) {
  const ids = STAFF_ROLES.map((r) => r.id);
  return (users || []).filter((u) => ids.includes(u.role));
}

/** Create or update a staff member. Same shape as setClientUser and the same
 *  rule: a UID, never a password. */
export async function setStaffUser(uid, { name, role, orgId }) {
  const id = String(uid || "").trim();
  if (!id) throw new Error("Paste the UID from the Firebase Console.");
  if (!STAFF_ROLES.some((r) => r.id === role)) throw new Error("Pick a role.");
  await setDoc(doc(db, "users", id), {
    orgId: orgId || STUDIO_ORG_ID,
    role,
    name: String(name || "").trim(),
    username: "",
  });
}

export async function setUserRole(uid, role) {
  await updateDoc(doc(db, "users", uid), { role });
}

/** Remove someone from the studio. Deletes the users document, which is what
 *  every rule resolves through — so access stops immediately and everywhere,
 *  which SEC-08 asks for ("revoked within one business day"). It does NOT
 *  delete their Auth account; that is the Console's job, and the app says so
 *  rather than pretending otherwise. */
export async function removeStaffUser(uid) {
  await deleteDoc(doc(db, "users", uid));
  await deleteDoc(doc(db, "rates", uid)).catch(() => {});
}

/* ── rates, in their own collection ───────────────────────────────
   Separate because Firestore grants reads per DOCUMENT and cannot withhold a
   field — see the comment at the top of firestore.rules. Read is CEO,
   Finance, or the collaborator themselves; a partner cannot read any. */

export async function getRates() {
  const snap = await getDocs(collection(db, "rates"));
  return snap.docs.map(withId);
}

export async function setRate(uid, rate, currency = "INR") {
  const n = Number(rate) || 0;
  if (n <= 0) { await deleteDoc(doc(db, "rates", uid)); return null; }
  await setDoc(doc(db, "rates", uid), { rate: n, currency });
  return n;
}

/* ── assignment ───────────────────────────────────────────────────
   `team` on the project is what the rules key partner and collaborator access
   off. A project with no team denies staff entirely, so this is the only way
   anybody but the CEO reaches an engagement. */

export async function setProjectTeam(projectId, uids) {
  const list = [...new Set((uids || []).map((u) => String(u).trim()).filter(Boolean))];
  await updateDoc(doc(db, "projects", projectId), { team: list });
  return list;
}

export function onTeam(project, uid) {
  return (project?.team || []).includes(uid);
}

// --- Admin CRUD: milestones / intake / deliverables ------------------------

export async function addMilestone(projectId, data) {
  await addDoc(collection(db, "projects", projectId, "milestones"), data);
}
export async function updateMilestone(projectId, id, data) {
  await updateDoc(doc(db, "projects", projectId, "milestones", id), data);
}
export async function deleteMilestone(projectId, id) {
  await deleteDoc(doc(db, "projects", projectId, "milestones", id));
}

export async function addIntakeItem(projectId, { label, group }) {
  await addDoc(collection(db, "projects", projectId, "intake"), {
    label,
    group,
    done: false,
    raisedAt: serverTimestamp(),
    clearedAt: null,
  });
}
export async function updateIntakeItem(projectId, id, data) {
  await updateDoc(doc(db, "projects", projectId, "intake", id), data);
}
export async function deleteIntakeItem(projectId, id) {
  await deleteDoc(doc(db, "projects", projectId, "intake", id));
}

export async function addDeliverable(projectId, data) {
  await addDoc(collection(db, "projects", projectId, "deliverables"), data);
}
export async function updateDeliverable(projectId, id, data) {
  await updateDoc(doc(db, "projects", projectId, "deliverables", id), data);
}
export async function deleteDeliverable(projectId, id) {
  await deleteDoc(doc(db, "projects", projectId, "deliverables", id));
}

// --- Tenancy probes ---------------------------------------------------------
// Used by /tenancy-check to demonstrate isolation from a real client session
// rather than assuming it. A probe never writes; a rules rejection is the
// expected, successful outcome for a foreign tenant.

export const SEED_ORG_IDS = SEED_ORGS.map((o) => o.id);
export const SEED_PROJECT_IDS = SEED_PROJECTS.map((p) => p.id);

async function probe(ref) {
  try {
    const snap = await getDoc(ref);
    return { allowed: true, exists: snap.exists() };
  } catch (err) {
    return { allowed: false, code: err?.code || "unknown", message: err?.message || String(err) };
  }
}

export function probeOrgAccess(orgId) {
  return probe(doc(db, "organisations", orgId));
}

export function probeProjectAccess(projectId) {
  return probe(doc(db, "projects", projectId));
}

// --- Business structure -----------------------------------------------------
// Shapes (not numbers, not client facts) lifted from the studio's own service
// catalog and sales playbook in brand-mint-admin/. These describe how work and
// deals are structured here; they never seed data on their own.

// The one break-even constant. Do not scatter copies of this number.
// This is the solo studio's actual monthly survival line. The ₹6.5L figure in
// brand-mint-admin/06-FINANCIAL-MODEL.md is a Y1 plan for a three-person
// studio that has not been hired — it is a target, not this month's bar.
export const BREAK_EVEN_MONTHLY = 100000;

// priceFloor is the published "from" price. These six are verified to match
// both the live marketing site and brand-mint-admin/03-SERVICE-CATALOG.md
// exactly, so they are safe to hardcode. Add-on prices are NOT hardcoded —
// see FEATURE_CATALOG.
export const SERVICE_TYPES = [
  { id: "site", label: "Custom website", priceFloor: 200000, recurring: false },
  { id: "tool", label: "Custom internal tool", priceFloor: 400000, recurring: false },
  { id: "brand", label: "Brand system", priceFloor: 150000, recurring: false },
  { id: "media", label: "Performance media", priceFloor: 100000, recurring: true },
  { id: "seo", label: "SEO & content engine", priceFloor: 75000, recurring: true },
  { id: "ai", label: "AI integration", priceFloor: 200000, recurring: false },
  { id: "internal", label: "Internal build", priceFloor: 0, recurring: false },
];

// Standing commercial terms. Every one of these is stated in the service
// catalog — none is invented.
export const SCOPE_TERMS = {
  warrantyDays: 30,
  reviewRoundsIncluded: 2,
  extraReviewRoundPrice: 15000,
  paymentSchedule: "50% advance to start, 50% at launch",
  gst: "GST extra",
  freeAfterLaunch: "Bugs — anything that does not behave as specified in this document — are fixed free for 30 days after launch.",
  chargeable: [
    "Design changes after sign-off",
    "New integrations not listed below",
    "Additional pages, screens or features",
    "Review rounds beyond the two included",
  ],
  chargeableRule:
    "Any of the above requires either a new fixed-scope contract or an open retainer. We will quote before starting, never after.",
};

// Add-on features. Deliberately NO prices here — a wrong number in a
// client-facing quote is a direct financial loss, so prices are set once by
// the admin on /quote and stored in Firestore. `requires` is the access a
// client must grant, always phrased so no password is ever requested.
// `needsServer` marks features that cannot run on this static architecture
// and require Vercel serverless functions — that is a cost and a decision,
// not a detail.
export const FEATURE_CATEGORIES = [
  { id: "commerce", label: "Commerce" },
  { id: "support", label: "Support & comms" },
  { id: "content", label: "Content & media" },
  { id: "automation", label: "Automation" },
  { id: "platform", label: "Platform" },
];

export const FEATURE_CATALOG = [
  {
    id: "cod",
    label: "Cash on delivery",
    category: "commerce",
    needsServer: false,
    delivers: ["COD checkout without a payment gateway", "Order confirmation screen", "Admin order list"],
    requires: ["Delivery pin codes you serve", "COD order value limits, if any"],
    skeleton: ["cart module", "COD checkout flow", "order store", "admin order list"],
  },
  {
    id: "payments-razorpay",
    label: "Online payments (Razorpay)",
    category: "commerce",
    needsServer: true,
    delivers: ["Cards, UPI and netbanking checkout", "Payment webhook and reconciliation", "Refund initiation from admin"],
    requires: [
      "Razorpay account — add hello@brandmintstudios.in as a team member on your own account",
      "Business PAN and GSTIN for Razorpay KYC",
      "Settlement bank account already verified inside Razorpay",
    ],
    skeleton: ["checkout module", "payment webhook handler (serverless)", "order state machine", "reconciliation view"],
  },
  {
    id: "returns-refunds",
    label: "Returns & refunds",
    category: "commerce",
    needsServer: true,
    delivers: ["Customer-initiated return request", "Return approval queue for you", "Refund trigger back to the gateway"],
    requires: ["Your written returns policy and window", "Who approves a return", "Restocking rules, if any"],
    skeleton: ["return request form", "approval queue", "refund handler (serverless)", "status notifications"],
  },
  {
    id: "invoicing-gst",
    label: "GST invoicing",
    category: "commerce",
    needsServer: true,
    delivers: ["GST-compliant invoice per order", "Sequential invoice numbering", "PDF download and email"],
    requires: [
      "GSTIN, registered legal name and address",
      "HSN/SAC codes for what you sell",
      "Invoice series prefix you want to use",
    ],
    skeleton: ["invoice generator (serverless)", "numbering sequence", "PDF template", "email dispatch"],
  },
  {
    id: "inventory",
    label: "Inventory management",
    category: "commerce",
    needsServer: false,
    delivers: ["Stock count per product", "Out-of-stock handling at checkout", "Low-stock view for you"],
    requires: ["Opening stock per SKU", "Low-stock threshold you want alerting on"],
    skeleton: ["product/SKU model", "stock decrement on order", "low-stock view"],
  },
  {
    id: "fulfilment-tracking",
    label: "Fulfilment & order tracking",
    category: "commerce",
    needsServer: true,
    delivers: ["Order status pipeline", "Customer-facing tracking page", "Courier AWB capture"],
    requires: [
      "Courier or aggregator you use — add hello@brandmintstudios.in as a user on that account",
      "Your fulfilment stages, in order",
    ],
    skeleton: ["status pipeline", "tracking page", "courier webhook (serverless)"],
  },
  {
    id: "chat-support",
    label: "Chat support",
    category: "support",
    needsServer: true,
    delivers: ["In-site chat widget", "Conversation inbox", "Office-hours and away handling"],
    requires: [
      "Chat provider account if you have a preference — add hello@brandmintstudios.in as a user",
      "Who answers, and during which hours",
    ],
    skeleton: ["chat widget", "inbox view", "availability rules"],
  },
  {
    id: "auto-replies",
    label: "Automated replies",
    category: "automation",
    needsServer: true,
    delivers: ["Auto-response to common questions", "Escalation to a human on no-match", "Reply log you can audit"],
    requires: ["Your top questions and the answers you want given", "What must always escalate to a human"],
    skeleton: ["intent matcher", "reply templates", "escalation rule", "audit log"],
  },
  {
    id: "notifications",
    label: "Email & SMS notifications",
    category: "support",
    needsServer: true,
    delivers: ["Order and shipping notifications", "Templated sender identity", "Delivery/failure log"],
    requires: [
      "Sending domain — add hello@brandmintstudios.in to your DNS or email provider as a user",
      "SMS provider account if SMS is wanted",
      "Approved message wording",
    ],
    skeleton: ["template set", "dispatch queue (serverless)", "delivery log"],
  },
  {
    id: "image-system",
    label: "Image system",
    category: "content",
    needsServer: false,
    delivers: ["Responsive image pipeline", "Automatic compression and modern formats", "Consistent product crops"],
    requires: ["Source images at highest available resolution", "Crop ratio and background preference"],
    skeleton: ["image pipeline", "responsive srcset", "placeholder strategy"],
  },
  {
    id: "video-system",
    label: "Video system (Higgsfield)",
    category: "content",
    needsServer: true,
    delivers: ["Generated product/brand video", "Hosting and playback", "Repeatable render pipeline"],
    requires: [
      "Higgsfield account — add hello@brandmintstudios.in as a user on your own account",
      "Brand assets and any script or shot direction",
      "Written confirmation you hold rights to all source material",
    ],
    skeleton: ["render pipeline (serverless)", "asset store", "player embed"],
  },
  {
    id: "instagram",
    label: "Instagram integration",
    category: "automation",
    needsServer: true,
    delivers: ["Feed embed on site", "Scheduled posting", "Comment and DM auto-reply"],
    requires: [
      "Instagram Business account linked to a Facebook Page",
      "Add hello@brandmintstudios.in as a user in Meta Business Suite — never send login details",
      "Confirmation you accept Meta's automated-messaging policies",
    ],
    skeleton: ["Meta Graph API client (serverless)", "token refresh job", "scheduler", "reply automation"],
  },
  {
    id: "analytics",
    label: "Analytics dashboard",
    category: "platform",
    needsServer: false,
    delivers: ["Traffic and conversion view", "Privacy-friendly, no cookie banner needed", "Monthly summary"],
    requires: ["Which events matter to you", "Analytics account — add hello@brandmintstudios.in as a user"],
    skeleton: ["event instrumentation", "dashboard view"],
  },
  {
    id: "multi-language",
    label: "Multi-language",
    category: "platform",
    needsServer: false,
    delivers: ["Language switcher", "Translated content model", "Per-language SEO tags"],
    requires: ["Languages wanted", "Who supplies and signs off translations"],
    skeleton: ["i18n content model", "language switcher", "hreflang tags"],
  },
  {
    id: "play-store-apk",
    label: "Play Store APK",
    category: "platform",
    needsServer: false,
    delivers: ["Installable Android build of the web app", "Store listing assets", "Submission support"],
    requires: [
      "Google Play Developer account — add hello@brandmintstudios.in as a user on your own account",
      "App icon, screenshots and store description",
      "Privacy policy URL (required by Google)",
    ],
    skeleton: ["app shell wrapper", "store assets", "signing and submission"],
  },
];

// --- Feature pricing (admin sets these; never hardcoded) --------------------

export async function getFeaturePricing() {
  const snap = await getDocs(collection(db, "catalog"));
  return Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
}

export async function setFeaturePricing(featureId, { price, priceType, buildDays }) {
  await setDoc(
    doc(db, "catalog", featureId),
    {
      price: price === "" || price === null || price === undefined ? null : Number(price),
      priceType: priceType || "fixed",
      buildDays: buildDays === "" || buildDays === null || buildDays === undefined ? null : Number(buildDays),
    },
    { merge: true }
  );
}

// Turns the features chosen for a quote into real intake items on a project,
// so what the client must supply becomes dated blockers they can see on
// /onboarding instead of living in an email nobody re-reads.
/**
 * A stable document id for one feature's requirement.
 *
 * This is the whole fix for duplicate intake. The previous version wrote with
 * `doc(collection(...))`, which mints a fresh random id on every call — so
 * pushing the same quote twice produced two complete sets, and a client's
 * "What we need from you" list showed the same request five times. A list that
 * repeats itself reads as broken, and a client who decides the list is broken
 * ignores all of it, which is the one thing this portal cannot afford.
 *
 * A short hash is appended because slugs truncate, and two different
 * requirements on the same feature could otherwise collide and silently
 * overwrite each other.
 */
function intakeIdFor(featureId, requirement) {
  const raw = `${featureId}--${requirement}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < raw.length; i += 1) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return `${slug || featureId}-${h.toString(36)}`;
}

/**
 * Turns the features chosen for a quote into real intake items on a project,
 * so what the client must supply becomes dated blockers they can see on
 * /onboarding instead of living in an email nobody re-reads.
 *
 * Idempotent. Running it again after adding a service to the scope adds only
 * the new requirements and leaves every existing one exactly as it is.
 *
 * An existing item is SKIPPED, never rewritten. Overwriting would reset
 * `raisedAt` to now, and the age of a blocker is the entire mechanism that
 * makes it move — a nine-day-old request silently becoming zero days old is
 * worse than not re-running this at all.
 *
 * Returns { added, skipped }.
 */
export async function pushRequirementsToIntake(projectId, featureIds) {
  const chosen = FEATURE_CATALOG.filter((f) => featureIds.includes(f.id));

  const existingSnap = await getDocs(collection(db, "projects", projectId, "intake"));
  const existing = new Set(existingSnap.docs.map((d) => d.id));

  const batch = writeBatch(db);
  let added = 0;
  let skipped = 0;

  for (const feature of chosen) {
    for (const requirement of feature.requires) {
      const id = intakeIdFor(feature.id, requirement);
      if (existing.has(id)) {
        skipped += 1;
        continue;
      }
      existing.add(id); // the same requirement twice in one push is still one item
      batch.set(doc(db, "projects", projectId, "intake", id), {
        label: `${feature.label}: ${requirement}`,
        // Anything mentioning an account or being added as a user is access;
        // everything else is an asset the client owes us.
        group: /account|add hello@|user on|DNS|GSTIN|PAN/i.test(requirement) ? "access" : "assets",
        done: false,
        raisedAt: serverTimestamp(),
        clearedAt: null,
      });
      added += 1;
    }
  }

  if (added) await batch.commit();
  return { added, skipped };
}

/**
 * Removes duplicate intake items left behind by the pre-idempotent version.
 *
 * Keeps the OLDEST of each identical label and deletes the rest, so the
 * surviving item carries the original raisedAt and the blocker's true age is
 * preserved. An item that has been ticked wins over one that has not,
 * whatever the dates — losing a client's tick would make them do the work
 * twice, which is worse than losing a few days of age.
 *
 * Returns { removed, kept }.
 */
export async function dedupeIntake(projectId) {
  const snap = await getDocs(collection(db, "projects", projectId, "intake"));
  const byLabel = new Map();

  for (const d of snap.docs) {
    const data = d.data();
    const key = String(data.label || "").trim().toLowerCase();
    const current = byLabel.get(key);
    if (!current) {
      byLabel.set(key, { id: d.id, data, losers: [] });
      continue;
    }
    const currentDone = current.data.done === true;
    const candidateDone = data.done === true;
    const currentAt = current.data.raisedAt?.toMillis?.() ?? Infinity;
    const candidateAt = data.raisedAt?.toMillis?.() ?? Infinity;

    // A ticked item always wins; otherwise the older one wins.
    const candidateWins = candidateDone !== currentDone ? candidateDone : candidateAt < currentAt;
    if (candidateWins) {
      current.losers.push(current.id);
      byLabel.set(key, { id: d.id, data, losers: current.losers });
    } else {
      current.losers.push(d.id);
    }
  }

  const doomed = [...byLabel.values()].flatMap((v) => v.losers);
  // Firestore batches cap at 500 writes.
  for (let i = 0; i < doomed.length; i += 400) {
    const batch = writeBatch(db);
    for (const id of doomed.slice(i, i + 400)) {
      batch.delete(doc(db, "projects", projectId, "intake", id));
    }
    await batch.commit();
  }

  return { removed: doomed.length, kept: byLabel.size };
}

// Milestone templates per service type. `offsetDays` is measured from a start
// date the admin picks at apply time — no date is ever invented here, the
// template only supplies the shape and the ownership split.
export const MILESTONE_TEMPLATES = {
  site: [
    { title: "Mint workshop + IA brief", owner: "us", offsetDays: 7 },
    { title: "Content + assets supplied", owner: "client", offsetDays: 5 },
    { title: "Design system + key screens", owner: "us", offsetDays: 14 },
    { title: "Build", owner: "us", offsetDays: 28 },
    { title: "QA + accessibility pass", owner: "us", offsetDays: 32 },
    { title: "Launch", owner: "us", offsetDays: 35 },
  ],
  tool: [
    { title: "Architecture review + system diagram", owner: "us", offsetDays: 7 },
    { title: "Access to systems granted", owner: "client", offsetDays: 5 },
    { title: "Auth + role-based access", owner: "us", offsetDays: 14 },
    { title: "Primary screens", owner: "us", offsetDays: 28 },
    { title: "LLM automation", owner: "us", offsetDays: 35 },
    { title: "Handover + ownership transfer", owner: "us", offsetDays: 42 },
  ],
  brand: [
    { title: "Discovery + competitor mood-board", owner: "us", offsetDays: 5 },
    { title: "Three directions presented", owner: "us", offsetDays: 12 },
    { title: "Direction narrowed to one", owner: "client", offsetDays: 16 },
    { title: "Final marks + type + colour system", owner: "us", offsetDays: 24 },
    { title: "Brand book site", owner: "us", offsetDays: 28 },
  ],
  media: [
    { title: "Ad account access granted", owner: "client", offsetDays: 3 },
    { title: "ICP + funnel + bid plan", owner: "us", offsetDays: 7 },
    { title: "First creative set", owner: "us", offsetDays: 14 },
    { title: "Campaigns live", owner: "us", offsetDays: 18 },
    { title: "Monthly written deep-dive", owner: "us", offsetDays: 30 },
  ],
  seo: [
    { title: "CMS + Search Console access granted", owner: "client", offsetDays: 3 },
    { title: "SEO audit + roadmap", owner: "us", offsetDays: 10 },
    { title: "Content calendar agreed", owner: "us", offsetDays: 14 },
    { title: "First articles published", owner: "us", offsetDays: 30 },
    { title: "Technical fix sprint", owner: "us", offsetDays: 30 },
  ],
  ai: [
    { title: "Use-case workshop", owner: "us", offsetDays: 7 },
    { title: "Architecture diagram + cost estimate", owner: "us", offsetDays: 12 },
    { title: "Implementation + auth + observability", owner: "us", offsetDays: 30 },
    { title: "Eval suite (top 20 prompts)", owner: "us", offsetDays: 37 },
    { title: "Documentation + handover", owner: "us", offsetDays: 42 },
  ],
  internal: [
    { title: "Scope agreed", owner: "us", offsetDays: 7 },
    { title: "Build", owner: "us", offsetDays: 28 },
    { title: "Ship", owner: "us", offsetDays: 35 },
  ],
};

// Funnel stages, in order, from the sales playbook.
export const LEAD_STAGES = [
  { id: "inbound", label: "Inbound" },
  { id: "discovery", label: "Discovery call" },
  { id: "workshop", label: "Mint workshop" },
  { id: "proposal", label: "Proposal" },
  { id: "signed", label: "Signed" },
  { id: "lost", label: "Lost" },
];

export const OPEN_LEAD_STAGES = ["inbound", "discovery", "workshop", "proposal"];

// Target conversion between consecutive stages.
export const FUNNEL_TARGETS = [
  { from: "inbound", to: "discovery", target: 0.4 },
  { from: "discovery", to: "workshop", target: 0.5 },
  { from: "workshop", to: "proposal", target: 0.8 },
  { from: "proposal", to: "signed", target: 0.6 },
];

export const LEAD_SOURCES = [
  { id: "site", label: "Site inbound", targetShare: 0.35 },
  { id: "warm", label: "Founder warm intro", targetShare: 0.25 },
  { id: "linkedin", label: "LinkedIn outbound", targetShare: 0.15 },
  { id: "referral", label: "Partner / referral", targetShare: 0.15 },
  { id: "writing", label: "Speaking / writing", targetShare: 0.1 },
];

// Loss reasons and the share at which the playbook says something is broken.
export const LOSS_REASONS = [
  { id: "price", label: "Price", alertAbove: 0.3, then: "we are priced wrong" },
  { id: "timing", label: "Timing", alertAbove: null, then: null },
  { id: "scope", label: "Scope mismatch", alertAbove: null, then: null },
  { id: "trust", label: "Trust", alertAbove: 0.25, then: "we need more case studies or referrals" },
  { id: "politics", label: "Internal politics", alertAbove: null, then: null },
  { id: "no_reply", label: "No reply", alertAbove: 0.4, then: "discovery to workshop is broken" },
];

// Median first response in this market is ~42h; under 5 minutes makes
// qualification roughly 21x more likely. This is the most valuable number
// in the business — see the handoff doc.
export const FAST_RESPONSE_MINUTES = 5;
export const MARKET_MEDIAN_RESPONSE_HOURS = 42;

// --- Leads (admin only) -----------------------------------------------------

export async function addLead({ name, source, stage }) {
  await addDoc(collection(db, "leads"), {
    name,
    source,
    stage: stage || "inbound",
    createdAt: serverTimestamp(),
    firstResponseAt: null,
    lossReason: null,
  });
}

export async function updateLead(id, data) {
  await updateDoc(doc(db, "leads", id), data);
}

export async function deleteLead(id) {
  await deleteDoc(doc(db, "leads", id));
}

// First response is first — once stamped it is never moved, or the metric
// stops meaning anything.
/**
 * Stamps the first response, once.
 *
 * It used to write unconditionally, so pressing the button a second time reset
 * the clock — a lead answered three days late became zero minutes, and the
 * single most valuable number in the business quietly became decoration.
 * CLAUDE.md said "stamped once and never moved" the whole time; the code did
 * not do it.
 *
 * A transaction rather than a read-then-write, because two admins on the same
 * lead would otherwise both see null and both write.
 *
 * Returns { stamped, at } — stamped false means it already had a date, which
 * the caller should say rather than silently doing nothing.
 */
export async function markLeadFirstResponse(id) {
  const ref = doc(db, "leads", id);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return { stamped: false, at: null };
    const existing = snap.data().firstResponseAt;
    if (existing) return { stamped: false, at: existing };
    tx.update(ref, { firstResponseAt: serverTimestamp() });
    return { stamped: true, at: null };
  });
}

// --- Agreed scope (the living quotation) ------------------------------------
//
// /quote produced a scope document and then threw it away. Nothing recorded
// what was actually sold, so nothing could say how much of it had been
// delivered — "progress" was a percentage the admin typed from memory, which
// is a guess wearing a number's clothes.
//
// The scope is now stored per project, one document per agreed line. Delivery
// is a status on each line, and progress is COMPUTED from those statuses. The
// client sees the same list: what they are paying for, and what is done.

/** Four states, in order. A line only ever moves forward through them. */
// --- The three deal shapes, and what a month is actually worth --------------

/**
 * Brand Mint sells three ways. They are not variations on one thing — they
 * behave differently enough that a dashboard which knows only about retainers
 * describes the business wrongly.
 *
 *   oneoff    a build, 50/50, and then it ends. No retainer, by agreement.
 *   then      the same build, and a retainer that starts AT LAUNCH.
 *   retainer  no build at all. A monthly fee, no fixed scope, no end date.
 *
 * `retainer: false` on `oneoff` is the important one: "no retainer" there is a
 * DECISION, not a gap, and nothing should nag about it.
 */
export const DEAL_TYPES = [
  { id: "oneoff", label: "One-time project", build: true, retainer: false,
    blurb: "A build, 50% up front and 50% at launch. Nothing after." },
  { id: "then", label: "Project, then retainer", build: true, retainer: true,
    blurb: "The build, then a monthly retainer starting at launch." },
  { id: "retainer", label: "Retainer only", build: false, retainer: true,
    blurb: "No build. A monthly fee for continuing work." },
];

/** Working days in an average month. Used to turn "price and weeks" into a
 *  monthly run rate, and nowhere else. */
export const WORKING_DAYS_PER_MONTH = 21.7;

/**
 * Is this project a build, or a retainer engagement?
 *
 * `mode` is written by createEngagement() and is authoritative when present.
 * It is absent on every project created before that existed, so this falls
 * back rather than forcing a migration: scope means a build; no scope plus a
 * client who pays a retainer means a retainer.
 */
export function projectMode(project, org, scope) {
  if (project?.mode === "retainer" || project?.mode === "build") return project.mode;
  if (scope && scope.length) return "build";
  if (org && Number(org.retainer) > 0 && (org.retainerStatus === "signed" || org.retainerStatus === "proposed")) {
    return "retainer";
  }
  return "build";
}

/** Is there earning left in this build? Fully accepted means the work is done
 *  and the money is in the invoice ledger, where it is already counted. */
export function isLiveBuild(scope) {
  return !!scope && scope.length > 0 && !scope.every((l) => l.status === "accepted");
}

/**
 * What one build would earn per month IF IT WERE THE ONLY THING RUNNING.
 *
 * Useful on a single record. Deliberately NOT summed across projects to get a
 * studio total — see monthlyIncome for why.
 */
export function projectRunRate(scope) {
  if (!isLiveBuild(scope)) return 0;
  const agreed = scope.reduce((n, l) => n + (Number(l.amount) || 0), 0);
  const days = scope.reduce((n, l) => n + (Number(l.days) || 0), 0);
  if (!agreed || !days) return 0;
  return Math.round(agreed / Math.max(1, days / WORKING_DAYS_PER_MONTH));
}

/**
 * What this month is worth, split by where it comes from.
 *
 * A ten-week, six-lakh build is not zero income just because it is not a
 * retainer — it is real money arriving, and a dashboard showing ₹0 for it says
 * the studio is failing during its best quarter. That is the same failure as
 * counting a proposal as revenue, pointed the other way: one flatters, one
 * frightens, and both are lies.
 *
 * BUT THE BUILDS ARE BLENDED, NOT ADDED.
 *
 * Summing each build's own run rate was the first attempt and it was worse
 * than the bug it fixed: two concurrent builds reported ₹6.4 L/month, which
 * assumed one person delivering sixty-eight working days of work inside a
 * calendar month. A number that cannot physically happen is not a number.
 *
 * So every live build is pooled — total agreed value over total agreed days —
 * and multiplied by a month of working days. That is the studio's blended day
 * rate at its actual capacity, and it behaves correctly: taking on a second
 * build does not double the income, it lengthens the schedule.
 *
 * The two halves are returned SEPARATELY and must be displayed separately.
 * Merging them hides the only distinction that matters when deciding whether
 * to sell: retainer income arrives again next month, build income stops the
 * day the build lands. Signed retainers only — a proposal is still counted as
 * nothing (§4).
 */
export function monthlyIncome({ orgs, projects, scopeByProject, orgById }) {
  const byId = orgById || Object.fromEntries((orgs || []).map((o) => [o.id, o]));

  const retainer = (orgs || [])
    .filter((o) => o.kind === "client" && o.status === "active" && o.retainerStatus === "signed")
    .reduce((n, o) => n + (Number(o.retainer) || 0), 0);

  let value = 0;
  let days = 0;
  let liveBuilds = 0;
  for (const p of projects || []) {
    if (p.billable === false) continue;
    const org = byId[p.orgId];
    if (org?.status !== "active") continue;
    const scope = (scopeByProject || {})[p.id] || [];
    if (projectMode(p, org, scope) === "retainer") continue;
    if (!isLiveBuild(scope)) continue;
    value += scope.reduce((n, l) => n + (Number(l.amount) || 0), 0);
    days += scope.reduce((n, l) => n + (Number(l.days) || 0), 0);
    liveBuilds += 1;
  }

  const project = days > 0 ? Math.round(value / Math.max(1, days / WORKING_DAYS_PER_MONTH)) : 0;
  return { retainer, project, total: retainer + project, liveBuilds, liveBuildValue: value, liveBuildDays: days };
}

/**
 * Start an engagement in ONE step.
 *
 * This exists because onboarding a client was seven steps across three
 * screens: add the client, add the project, go to /quote, build the scope,
 * save it to the project, come back, apply a milestone template. Every one of
 * those was a place to stop halfway, and people did.
 *
 * A name, a deal type, a price and a number of weeks is genuinely all the
 * information required — everything else here is derived from those four
 * answers, using rules the studio already follows:
 *
 *   - the scope becomes ONE agreed line. Not an invented four-phase
 *     breakdown: a breakdown nobody agreed to would be fiction with a
 *     progress bar attached. Refine it on /quote when there is a real one.
 *   - invoicing is 50/50 — advance now, balance at the end date — because
 *     that is what every Brand Mint contract says.
 *   - the retainer starts PROPOSED unless explicitly marked signed, so no
 *     path through this form can quietly inflate MRR.
 *
 * Returns the ids it created so the caller can open the record.
 */
/* ── one-click state, instead of a form ───────────────────────────
   "I should be able to do it by sliding of a button or click of a button."
   These are deliberately thin: each is one field, flipped, with no other way
   to get it wrong. The rules that matter still hold — a retainer only counts
   as revenue at `signed`, and that is exactly what the toggle sets, so making
   it one click makes it MORE likely to be true, not less. */

export async function toggleRetainerSigned(org) {
  const to = org?.retainerStatus === "signed" ? "proposed" : "signed";
  await updateDoc(doc(db, "organisations", org.id), { retainerStatus: to });
  return to;
}

export async function toggleArchived(org) {
  const to = org?.status === "archived" ? "active" : "archived";
  await updateDoc(doc(db, "organisations", org.id), { status: to });
  return to;
}

/* ══════════════════════════════════════════════════════════════════
   A LEAD BECOMES A CLIENT — the link that was missing

   The report was exact: "These individual components are not being linked.
   That is the issue with you." It was right. A lead sat in the pipeline, the
   quote was a separate page, and createEngagement() built a client from a
   blank form that never looked at either — so every step re-typed what the
   system already knew, and the lead had to be closed by hand afterwards or it
   sat on the board forever.

   convertLead() is one call. It carries the name, the contact and the source
   forward, creates everything createEngagement() creates, and marks the lead
   won with a pointer to what it became. Nothing is typed twice and nothing is
   left open behind you.

   The lead is NOT deleted. `stage: "signed"` takes it off the board (the
   kanban shows OPEN_LEAD_STAGES only), so it "becomes" the client from where
   you sit — while firstResponseAt survives, which is the single most valuable
   number in the business (§6) and would be destroyed by a delete. It is also
   the only way to ever answer "what did we quote them originally".
   ══════════════════════════════════════════════════════════════════ */

export async function convertLead(leadId, opts = {}) {
  const lead = (await getDoc(doc(db, "leads", leadId))).data();
  if (!lead) throw new Error("That lead no longer exists.");
  if (lead.orgId) throw new Error("That lead has already become a client.");

  const out = await createEngagement({
    ...opts,
    name: opts.name || lead.name,
  });

  await updateDoc(doc(db, "leads", leadId), {
    stage: "signed",
    orgId: out.orgId,
    wonAt: serverTimestamp(),
  });

  /* Contact details follow the lead across, so the client is messageable from
     Updates the moment they exist rather than after another form. */
  if (lead.contactName || lead.contactPhone || lead.email) {
    await updateDoc(doc(db, "organisations", out.orgId), {
      contactName: String(lead.contactName || lead.name || "").trim(),
      contactPhone: String(lead.contactPhone || lead.phone || "").trim(),
      fromLeadId: leadId,
      source: String(lead.source || "").trim(),
    });
  } else {
    await updateDoc(doc(db, "organisations", out.orgId), {
      fromLeadId: leadId,
      source: String(lead.source || "").trim(),
    });
  }

  return { ...out, leadId };
}

export async function createEngagement({
  name, deal, price, weeks, retainer, retainerSigned, type, startAt,
}) {
  const shape = DEAL_TYPES.find((d) => d.id === deal);
  if (!shape) throw new Error("Pick a deal type.");
  const clientName = String(name || "").trim();
  if (!clientName) throw new Error("Give the client a name.");

  const money = Number(price) || 0;
  const wk = Number(weeks) || 0;
  if (shape.build && !(money > 0)) throw new Error("A project needs a price above zero.");
  if (shape.build && !(wk > 0)) throw new Error("A project needs a length in weeks.");
  const monthly = Number(retainer) || 0;
  if (shape.retainer && !(monthly > 0)) throw new Error("A retainer needs a monthly amount above zero.");

  const orgId = await createOrg({
    name: clientName,
    kind: "client",
    status: "active",
    retainer: shape.retainer ? monthly : 0,
    // Never `signed` unless the caller ticked the box. §4 is not negotiable
    // just because this form is faster.
    retainerStatus: shape.retainer ? (retainerSigned ? "signed" : "proposed") : "none",
    note: shape.blurb,
  });

  const start = startAt ? new Date(startAt) : new Date();
  const end = new Date(start.getTime() + wk * 7 * 86400000);

  const projectId = await createProject({
    orgId,
    name: shape.build ? `${clientName} build` : `${clientName} retainer`,
    type: type || null,
    dueAt: shape.build ? end : null,
    billable: true,
  });

  // `mode` separates a build from a retainer engagement. Without it a
  // retainer-only project looks exactly like a build nobody has set up yet,
  // and the dashboard nags about its missing milestones forever — which is how
  // an action list stops being believed.
  await updateProject(projectId, { mode: shape.build ? "build" : "retainer" });

  if (shape.build) {
    await saveScope(projectId, [{
      featureId: "agreed-build",
      label: "Agreed build",
      amount: money,
      days: Math.round(wk * 5),
    }]);
    await createInvoice({ orgId, label: "50% advance", amount: Math.round(money / 2), dueAt: start });
    await createInvoice({ orgId, label: "50% on launch", amount: money - Math.round(money / 2), dueAt: end });
    if (type && MILESTONE_TEMPLATES[type]) {
      await applyMilestoneTemplate(projectId, type, start.toISOString().slice(0, 10));
    }
  }

  return { orgId, projectId };
}

export const SCOPE_STATUS = [
  { id: "agreed", label: "Agreed", hint: "Signed for, not started." },
  { id: "building", label: "Building", hint: "In progress now." },
  { id: "delivered", label: "Delivered", hint: "Done and handed over for review." },
  { id: "accepted", label: "Accepted", hint: "The client has confirmed it." },
];

export const SCOPE_STATUS_IDS = SCOPE_STATUS.map((s) => s.id);

export async function getScope(projectId) {
  const snap = await getDocs(collection(db, "projects", projectId, "scope"));
  return snap.docs.map(withId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Writes the agreed scope onto a project.
 *
 * Idempotent by feature id, for the same reason intake is: re-saving after the
 * scope grows must add the new lines and leave the existing ones — including
 * their delivery status — exactly as they are. Overwriting would silently
 * reset a delivered line to agreed.
 *
 * Returns { added, skipped }.
 */
export async function saveScope(projectId, lines) {
  const existing = new Set((await getScope(projectId)).map((l) => l.id));
  const batch = writeBatch(db);
  let added = 0;
  let skipped = 0;

  lines.forEach((line, i) => {
    const id = String(line.featureId || `line-${i}`);
    if (existing.has(id)) { skipped += 1; return; }
    batch.set(doc(db, "projects", projectId, "scope", id), {
      featureId: line.featureId || null,
      label: String(line.label || "").trim(),
      amount: Number(line.amount) || 0,
      days: Number(line.days) || 0,
      status: "agreed",
      order: i,
      agreedAt: serverTimestamp(),
      changedAt: null,
    });
    added += 1;
  });

  if (added) await batch.commit();
  return { added, skipped };
}

/** Moves one line's delivery status. Admin only — the rules enforce it. */
/**
 * Change what a scope line is worth, or how long it takes.
 *
 * The price was fixed at the moment the engagement was created and there was no
 * way to change it afterwards — which is wrong for a studio that renegotiates,
 * discounts, or simply mistyped. `changedAt` records that it moved, so the
 * agreed figure and the current one are not silently the same thing.
 *
 * Both feed derived numbers: `amount` drives what the project is worth and
 * `days` drives both the weighted progress and the studio's monthly run rate.
 */
export async function updateScopeLine(projectId, lineId, { amount, days }) {
  const patch = { changedAt: serverTimestamp() };
  if (amount !== undefined && amount !== null && amount !== "") patch.amount = Number(amount) || 0;
  if (days !== undefined && days !== null && days !== "") patch.days = Number(days) || 0;
  await updateDoc(doc(db, "projects", projectId, "scope", lineId), patch);
}

export async function setScopeLineStatus(projectId, lineId, status) {
  if (!SCOPE_STATUS_IDS.includes(status)) throw new Error(`unknown scope status: ${status}`);
  await updateDoc(doc(db, "projects", projectId, "scope", lineId), {
    status,
    changedAt: serverTimestamp(),
  });
}

export async function deleteScopeLine(projectId, lineId) {
  await deleteDoc(doc(db, "projects", projectId, "scope", lineId));
}

/**
 * Progress, derived rather than typed.
 *
 * Weighted by build days, because a 10-day line and a half-day line are not
 * the same fraction of the job — counting lines would let three trivial items
 * report a project as half done.
 *
 * Returns null when there is no scope. Null renders as "not recorded"; zero
 * would draw an empty bar that reads as started-and-stalled, and a project
 * nobody has scoped has not stalled — it has not been scoped.
 */
export function scopeProgress(lines) {
  if (!lines || !lines.length) return null;
  const weight = (l) => (Number(l.days) > 0 ? Number(l.days) : 1);
  const total = lines.reduce((n, l) => n + weight(l), 0);
  if (!total) return null;
  const credit = { agreed: 0, building: 0.5, delivered: 0.9, accepted: 1 };
  const done = lines.reduce((n, l) => n + weight(l) * (credit[l.status] ?? 0), 0);
  return Math.round((done / total) * 100);
}

/** What the scope is worth, and how much of it is accepted. Money follows
 *  acceptance, not effort — a line half-built has earned nothing. */
export function scopeValue(lines) {
  const agreed = lines.reduce((n, l) => n + (Number(l.amount) || 0), 0);
  const accepted = lines
    .filter((l) => l.status === "accepted")
    .reduce((n, l) => n + (Number(l.amount) || 0), 0);
  return { agreed, accepted, outstanding: agreed - accepted };
}

// --- Organisations, projects, invoices (admin only) -------------------------
//
// These existed only as seed data until now. The admin could add milestones,
// intake and deliverables to a project that already existed, and manage leads
// — but there was no way to create the client, the project or the invoice in
// the first place. Onboarding a real client was impossible without editing
// Firestore by hand, which is not a workflow, it is a workaround.

/**
 * A new client, internal team, or archived org.
 *
 * `retainerStatus` defaults to "proposed", never "signed". Signing is a
 * separate, deliberate act — a retainer that counts as revenue the moment it
 * is typed is how a dashboard starts flattering its owner.
 */
export async function createOrg({ name, kind, status, retainer, retainerStatus, note }) {
  const ref = await addDoc(collection(db, "organisations"), {
    name: String(name || "").trim(),
    kind: kind || "client",
    status: status || "active",
    retainer: Number(retainer) || 0,
    retainerStatus: retainerStatus || "proposed",
    note: note || "",
  });
  return ref.id;
}

export async function updateOrg(orgId, data) {
  await updateDoc(doc(db, "organisations", orgId), data);
}

/**
 * A new project for an org.
 *
 * `progress` is null, not 0. Zero draws an empty bar that reads as "started,
 * nothing done"; null renders as unrecorded, which is the truth on day one.
 * `dueAt` is only set if the admin supplies one — no date is ever invented.
 */
export async function createProject({ orgId, name, type, dueAt, billable }) {
  const ref = await addDoc(collection(db, "projects"), {
    orgId,
    name: String(name || "").trim(),
    type: type || null,
    dueAt: dueAt ? new Date(dueAt) : null,
    progress: null,
    billable: billable !== false,
  });
  return ref.id;
}

/**
 * Delete a project AND everything hanging off it.
 *
 * The old version deleted only the project document. Firestore does not
 * cascade, so the milestones, intake, deliverables and scope survived as
 * orphans — invisible, unreachable, and still counted by nothing. The UI even
 * warned about it, which is not a fix.
 */
export async function deleteProject(projectId) {
  for (const sub of ["milestones", "intake", "deliverables", "scope"]) {
    const snap = await getDocs(collection(db, "projects", projectId, sub));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    if (snap.size) await batch.commit();
  }
  await deleteDoc(doc(db, "projects", projectId));
}

/**
 * Delete a client and everything that belongs to them.
 *
 * Archiving keeps the history and stops the client counting towards anything;
 * this removes them. Both exist because they answer different questions —
 * "this engagement ended" versus "this should never have been here".
 *
 * Returns a count of what it removed so the caller can say so afterwards
 * rather than claiming a silent success.
 *
 * WHAT THIS CANNOT DO: remove their Firebase Auth account. That lives outside
 * this app (§4 — the app never handles credentials), so a deleted client can
 * still sign in and will land on an empty portal until the account is deleted
 * in the Firebase Console. The caller must say so.
 */
export async function deleteClient(orgId) {
  const projects = (await getDocs(query(collection(db, "projects"), where("orgId", "==", orgId)))).docs;
  for (const p of projects) await deleteProject(p.id);

  const invoices = (await getDocs(query(collection(db, "invoices"), where("orgId", "==", orgId)))).docs;
  const users = (await getDocs(query(collection(db, "users"), where("orgId", "==", orgId)))).docs;

  const batch = writeBatch(db);
  invoices.forEach((d) => batch.delete(d.ref));
  users.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, "organisations", orgId));
  await batch.commit();

  return { projects: projects.length, invoices: invoices.length, logins: users.length };
}

/**
 * Who the invoice is FROM.
 *
 * Only the things that are already public sit here. The payee details —
 * account number, IFSC, the account holder's legal name, a GSTIN — are
 * DELIBERATELY NOT IN THIS FILE.
 *
 * This repository is public (CLAUDE.md §2). Hardcoding a bank account here
 * would publish it, permanently and in the git history, to anyone who looks —
 * which is a different thing from printing it on an invoice sent to one
 * client. So they live in Firestore on the studio's own organisation document,
 * where `firestore.rules` already restricts organisation writes to the admin
 * and lets a client read only their OWN org. No rules change was needed and
 * none should be made for this.
 *
 * The second benefit is ordinary: changing banks is a form, not a deploy.
 */
export const STUDIO = {
  name: "Brand Mint Studios",
  city: "Hyderabad, India",
  email: "hello@brandmintstudios.in",
  site: "brandmintstudios.in",
};

/** The studio's own organisation — tenant zero. Found by `kind`, not by id,
 *  so de-hardcoding `brandmint` later (§9 item 5) does not break invoicing. */
export function studioOrg(orgs) {
  return (orgs || []).find((o) => o.kind === "studio") || null;
}

/**
 * The payee block an invoice prints, or null if it has not been filled in.
 *
 * Returns null rather than a half-filled object: the invoice omits the whole
 * block when there is nothing real to print, instead of showing a labelled
 * empty line that reads as a mistake. §4 — no plausible-looking placeholder on
 * a financial document.
 */
export function studioPayee(org) {
  if (!org) return null;
  const holder = String(org.bankHolder || "").trim();
  const account = String(org.bankAccount || "").trim();
  const ifsc = String(org.bankIfsc || "").trim().toUpperCase();
  const bank = String(org.bankName || "").trim();
  if (!holder || !account || !ifsc) return null;
  return { holder, account, ifsc, bank };
}

/** Save the payee details onto the studio's own organisation document. */
export async function saveStudioPayee(orgId, { bankHolder, bankAccount, bankIfsc, bankName }) {
  await updateDoc(doc(db, "organisations", orgId), {
    bankHolder: String(bankHolder || "").trim(),
    bankAccount: String(bankAccount || "").trim(),
    bankIfsc: String(bankIfsc || "").trim().toUpperCase(),
    bankName: String(bankName || "").trim(),
  });
}

/* ══════════════════════════════════════════════════════════════════
   THE AGREEMENT, RECORDED — NOT SIGNED

   §10 puts e-signature on the do-not-build list, and it is right to: signing
   is a legal artefact, this site has no server, and Zoho Sign already does it
   properly. So nothing here captures a signature. This records that one
   happened, which is the part the studio actually needs in order to know a
   project may start.

   It lives on the organisation document, which the admin can already write and
   the client can already read, so it needs NO firestore.rules change — the
   same reason the payee details work. That is the safe order, not a shortcut:
   rules are published by hand from the Console (§2), so a UI needing new rules
   would go live denied.

   The date is request.time via serverTimestamp(), never a value the browser
   supplies. An agreement date that the interested party can set is exactly the
   kind of record §7 already refused to allow for deliverables.
   ══════════════════════════════════════════════════════════════════ */

export async function markAgreementSigned(orgId) {
  await updateDoc(doc(db, "organisations", orgId), {
    agreementSignedAt: serverTimestamp(),
  });
}

/** Clear it again. Deliberately present: a date stamped on the wrong client is
 *  worse than no date, and the only alternative would be editing Firestore by
 *  hand. Unlike lead.firstResponseAt this is NOT a once-only stamp, because it
 *  measures nothing and is not compared across clients — it is a fact about a
 *  document that either exists or does not. */
export async function clearAgreementSigned(orgId) {
  await updateDoc(doc(db, "organisations", orgId), { agreementSignedAt: null });
}

/* ══════════════════════════════════════════════════════════════════
   THE BRAND KIT

   Links, colours and font names — never files. §10 puts file uploads out of
   scope, and a brand studio's logo already lives in Figma or Drive where the
   client's own designer can reach it; copying it into Firestore would make
   this the second place it lives and the one that goes stale.

   Same organisation document, same reason: no rules change.

   brandKit() returns null unless there is at least one real value, so the
   portal omits the whole block rather than printing empty labelled rows — the
   identical rule studioPayee() follows, for the identical reason (§4: an empty
   field rendered as a field reads as a mistake, not as an absence).
   ══════════════════════════════════════════════════════════════════ */

/** Hex only, normalised, and anything that is not a colour is dropped rather
 *  than stored. A swatch is rendered as a background; a junk value there would
 *  paint nothing and look like a missing colour instead of a bad one. */
function cleanHex(v) {
  const s = String(v || "").trim().replace(/^#*/, "#");
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s) ? s.toLowerCase() : null;
}

export function parseBrandColors(input) {
  if (!input) return [];
  const list = Array.isArray(input) ? input : String(input).split(/[\s,]+/);
  return [...new Set(list.map(cleanHex).filter(Boolean))].slice(0, 8);
}

export function brandKit(org) {
  if (!org) return null;
  const colors = parseBrandColors(org.brandColors);
  const logo = String(org.brandLogoUrl || "").trim();
  const guide = String(org.brandGuidelinesUrl || "").trim();
  const fonts = String(org.brandFonts || "").trim();
  if (!colors.length && !logo && !guide && !fonts) return null;
  return { colors, logo, guide, fonts };
}

/** Who to message, and on what number. Stored on the organisation for the same
 *  reason everything else here is: the admin can already write it and the
 *  client can already read their own, so no rules change.
 *
 *  This is a CONTACT DETAIL, not a credential (§4). The distinction matters
 *  and is not subtle: a phone number is something the client hands out to be
 *  reached on. Nothing here ever asks a client for a password, an API key or a
 *  token, and no field added to this app ever will. */
export async function saveClientContact(orgId, { contactName, contactPhone }) {
  await updateDoc(doc(db, "organisations", orgId), {
    contactName: String(contactName || "").trim(),
    contactPhone: String(contactPhone || "").trim(),
  });
}

export async function saveBrandKit(orgId, { brandLogoUrl, brandGuidelinesUrl, brandFonts, brandColors }) {
  await updateDoc(doc(db, "organisations", orgId), {
    brandLogoUrl: String(brandLogoUrl || "").trim(),
    brandGuidelinesUrl: String(brandGuidelinesUrl || "").trim(),
    brandFonts: String(brandFonts || "").trim(),
    brandColors: parseBrandColors(brandColors),
  });
}

/* ══════════════════════════════════════════════════════════════════
   WHERE A CLIENT IS IN THE FLOW

   The report was "I don't understand the flow how to add leads scope and give
   a agreement sign and get paid". Every one of those steps already existed;
   what did not exist was anywhere on screen that said which one you are on.

   So this ADDS NO DATA. Every stage below is derived from records that are
   already written, which means it cannot drift out of step with reality and
   there is nothing new to keep up to date — the property §1 requires of
   anything that must survive being ignored for a fortnight.

   `next` is the whole point. A stage that only says where you are is a status;
   a stage that says what to do next is an instruction.
   ══════════════════════════════════════════════════════════════════ */

export const CLIENT_STAGES = [
  { key: "new",       label: "New client" },
  { key: "quoted",    label: "Scope agreed" },
  { key: "signed",    label: "Agreement signed" },
  { key: "deposit",   label: "Deposit received" },
  { key: "building",  label: "In build" },
  { key: "delivered", label: "Delivered" },
  { key: "settled",   label: "Settled" },
];

/**
 * @param scope  the project's scope lines when the caller has loaded them.
 *               `null` means NOT LOADED, which is not the same as "no scope"
 *               and must never be reported as an unscoped project — that is
 *               the empty-is-not-done rule (§4) applied to a lazy read.
 */
export function clientStage(org, { projects = [], invoices = [], scope = null } = {}) {
  const at = (k) => CLIENT_STAGES.findIndex((s) => s.key === k);

  const received = invoices.reduce((n, i) => n + invoiceReceived(i), 0);
  const billed = invoices.reduce((n, i) => n + (Number(i.amount) || 0), 0);
  const anyPaid = received > 0;
  const allSettled = invoices.length > 0 && received >= billed;

  const lines = Array.isArray(scope) ? scope : [];
  const hasScope = lines.length > 0;
  const moved = lines.filter((l) => l.status && l.status !== "agreed").length;
  const done = lines.filter((l) => l.status === "delivered" || l.status === "accepted").length;

  const signed = !!org?.agreementSignedAt || org?.retainerStatus === "signed";

  let key = "new";
  if (hasScope) key = "quoted";
  if (signed) key = "signed";
  if (anyPaid) key = "deposit";
  if (moved > 0) key = "building";
  if (hasScope && done === lines.length) key = "delivered";
  if (allSettled && (!hasScope || done === lines.length)) key = "settled";

  const NEXT = {
    new: projects.length
      ? "Open the project and save an agreed scope on /quote."
      : "Start an engagement — name, deal, price, weeks.",
    quoted: "Send the quote, then mark the agreement signed when it comes back.",
    signed: "Raise the deposit invoice and send it.",
    deposit: "Raise what you need from them, then move a scope line as it moves.",
    building: "Move each scope line as it moves. A line is money only at accepted.",
    delivered: "Raise the balance invoice.",
    settled: null,
  };

  return {
    key,
    index: at(key),
    total: CLIENT_STAGES.length,
    label: CLIENT_STAGES[at(key)].label,
    next: NEXT[key],
    /* Stated separately so the UI can say "not loaded" rather than draw a
       confident empty bar. */
    scopeKnown: Array.isArray(scope),
  };
}

/** A stable human reference for an invoice, derived from its own id so it
 *  never needs a counter and never changes. Not a GST serial — see STUDIO. */
export function invoiceRef(inv) {
  return "BM-" + String(inv?.id || "").slice(0, 6).toUpperCase();
}

/** An invoice. Always created `due` — an invoice is not paid until money
 *  arrives, and there is no path that creates one already settled. */
export async function createInvoice({ orgId, label, amount, dueAt }) {
  const ref = await addDoc(collection(db, "invoices"), {
    orgId,
    label: String(label || "").trim(),
    amount: Number(amount) || 0,
    status: "due",
    dueAt: dueAt ? new Date(dueAt) : null,
  });
  return ref.id;
}

/* --- Part payments --------------------------------------------------------
 *
 * `status` was binary — paid or due — and a bank transfer of ₹1,50,000 against
 * a ₹3,00,000 invoice had nowhere to go. Marking it paid overstates collected
 * cash by ₹1,50,000; leaving it due understates it by the same amount and
 * tells the client their money vanished. Both are the dashboard lying.
 *
 * So invoices gain `paidAmount`: how much has actually ARRIVED. `status` is
 * kept in step (`paid` once it is settled in full) because the client portal,
 * /api/payments and every existing invoice already depend on it.
 */

/**
 * How much has arrived against this invoice.
 *
 * THE FALLBACK IS THE WHOLE POINT. Every invoice written before `paidAmount`
 * existed has no such field, and reading a missing number as 0 would wipe
 * every rupee already collected off the Money view the moment this shipped.
 * So an invoice with no `paidAmount` is read from its status: paid means the
 * full amount arrived, which is exactly what it meant before.
 */
export function invoiceReceived(inv) {
  if (!inv) return 0;
  const amount = Number(inv.amount) || 0;
  if (inv.paidAmount === undefined || inv.paidAmount === null) {
    return inv.status === "paid" ? amount : 0;
  }
  // Never report more received than was invoiced, whatever is in the document.
  return Math.max(0, Math.min(amount, Number(inv.paidAmount) || 0));
}

export function invoiceOutstanding(inv) {
  return Math.max(0, (Number(inv?.amount) || 0) - invoiceReceived(inv));
}

/** `due` · `part` · `paid`. Three states, because two could not describe a
 *  half-paid invoice without lying in one direction or the other. */
export function invoiceState(inv) {
  const amount = Number(inv?.amount) || 0;
  const received = invoiceReceived(inv);
  if (received <= 0) return "due";
  if (amount > 0 && received >= amount) return "paid";
  return "part";
}

/**
 * Record how much has arrived IN TOTAL against an invoice.
 *
 * Total, not "add this payment". A running total is one number a person can
 * check against their bank statement; an append-only sequence of increments
 * cannot be corrected without a second concept. Typing the same figure twice
 * is therefore harmless, which is the property that matters when a form is
 * submitted twice on a bad connection.
 *
 * `status` is derived here rather than passed in, so it can never disagree
 * with the amount — the disagreement being the only way this could quietly
 * corrupt the Money view.
 */
export async function recordPayment(invoiceId, totalReceived) {
  const snap = await getDoc(doc(db, "invoices", invoiceId));
  if (!snap.exists()) throw new Error("That invoice no longer exists.");
  const amount = Number(snap.data().amount) || 0;

  const received = Number(totalReceived);
  if (!Number.isFinite(received) || received < 0) throw new Error("Enter an amount of zero or more.");
  if (received > amount) {
    throw new Error(
      `That is more than the invoice. ${formatINR(received)} against a ${formatINR(amount)} invoice — ` +
      `raise a second invoice for the extra rather than overstating this one.`
    );
  }

  await updateDoc(doc(db, "invoices", invoiceId), {
    paidAmount: received,
    status: amount > 0 && received >= amount ? "paid" : "due",
  });
  return { amount, received, outstanding: Math.max(0, amount - received) };
}

export async function updateInvoice(invoiceId, data) {
  await updateDoc(doc(db, "invoices", invoiceId), data);
}

export async function deleteInvoice(invoiceId) {
  await deleteDoc(doc(db, "invoices", invoiceId));
}

// --- Projects (admin only) --------------------------------------------------

export async function updateProject(projectId, data) {
  await updateDoc(doc(db, "projects", projectId), data);
}

/* ══════════════════════════════════════════════════════════════════
   THE WEEKLY UPDATE — THE ONE THING THIS SCREEN IS FOR

   Asked for directly: "update every client at once". One screen, every live
   project, a line each, sent together. Before this, telling six clients where
   things stood meant six separate visits to six separate drawers, which is
   why it stopped happening and why "any update?" kept arriving by WhatsApp.

   It is TWO FIELDS ON THE PROJECT DOCUMENT, not a subcollection. The admin can
   already write projects and a client can already read their own, so this
   needs NO firestore.rules change — a subcollection would have needed one, and
   rules are published by hand from the Console (§2), so the UI would have gone
   live denied.

   Only the latest update is kept. A history would need that subcollection, and
   nobody has asked to read one; the client wants to know where things are now,
   not to audit what they were told in March. The audit log already records
   that an update happened.

   `at` is serverTimestamp(), so "3 days ago" on the client's portal is counted
   from when it was actually written and not from a clock the browser supplied.
   ══════════════════════════════════════════════════════════════════ */

export async function saveProjectUpdate(projectId, text) {
  const body = String(text || "").trim().slice(0, 600);
  await updateDoc(doc(db, "projects", projectId), {
    updateText: body,
    updateAt: body ? serverTimestamp() : null,
  });
  return body;
}

/** A project worth sending an update about: it exists, it is not archived, and
 *  its client is still active. Deliberately NOT "has milestones" or "has
 *  scope" — a project nobody has set up yet is exactly the one most likely to
 *  need a message. */
export function updatableProjects(projects, orgs) {
  const active = new Set(
    (orgs || []).filter((o) => o.kind === "client" && o.status !== "archived").map((o) => o.id)
  );
  return (projects || []).filter((p) => active.has(p.orgId) && p.status !== "archived");
}

/* ══════════════════════════════════════════════════════════════════
   WHATSAPP, WITHOUT AN INTEGRATION

   "All real client contact happens on WhatsApp. The portal exists but nobody
   opens it." Both halves of that are true and neither is fixed by building
   more portal.

   So this does not integrate with anything. It builds a wa.me link — the
   documented public URL scheme — which opens WhatsApp with the message already
   typed. No API, no token, no dependency, no server, and nothing to break when
   WhatsApp changes a private interface. §4 also settles it: a WhatsApp
   Business API integration would mean holding a credential, and this product
   does not hold credentials.

   It does not SEND. It opens the compose window with the text in it and the
   studio presses send, which is also the honest behaviour: a message that went
   out without being read once is how a wrong number gets a client's update.
   ══════════════════════════════════════════════════════════════════ */

/** Digits only, with India's country code assumed for a bare 10-digit number.
 *  Returns null rather than guessing at anything else — a wa.me link built
 *  from a malformed number opens a chat with a stranger. */
export function waNumber(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

export function waLink(phone, message) {
  const n = waNumber(phone);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(String(message || "").slice(0, 1200))}`;
}

/** The message the studio actually sends. Plain, dated, and it names the one
 *  thing the client has to do — because an update that only reports progress
 *  invites "ok thanks" and an update that ends in a request gets an answer. */
export function updateMessage({ clientName, projectName, text, blockers = 0, portalUrl }) {
  const lines = [];
  lines.push(`Hi${clientName ? ` ${clientName}` : ""} — update on ${projectName || "your project"}:`);
  lines.push("");
  lines.push(String(text || "").trim());
  if (blockers > 0) {
    lines.push("");
    lines.push(
      blockers === 1
        ? "There is 1 thing open on your side — it is listed in your portal."
        : `There are ${blockers} things open on your side — they are listed in your portal.`
    );
  }
  if (portalUrl) {
    lines.push("");
    lines.push(portalUrl);
  }
  return lines.join("\n");
}

// Stamps a service-type template onto a project. `startDate` is supplied by
// the admin — nothing here guesses a schedule.
export async function applyMilestoneTemplate(projectId, typeId, startDate) {
  const template = MILESTONE_TEMPLATES[typeId];
  if (!template || !startDate) return 0;

  const batch = writeBatch(db);
  for (const step of template) {
    const dueAt = new Date(startDate);
    dueAt.setDate(dueAt.getDate() + step.offsetDays);
    batch.set(doc(collection(db, "projects", projectId, "milestones")), {
      title: step.title,
      owner: step.owner,
      status: "todo",
      dueAt,
    });
  }
  await batch.commit();
  return template.length;
}

// --- Theme -------------------------------------------------------------------
// Three states, not two: "light", "dark", and no stored choice at all, which
// means follow the operating system. A toggle that only knows light and dark
// can never hand control back to the OS.

const THEME_KEY = "bm-theme";

export function getStoredTheme() {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null; // private mode, storage disabled — fall back to the OS
  }
}

/** What the user is actually looking at right now. */
export function resolvedTheme() {
  return (
    getStoredTheme() ??
    (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light")
  );
}

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "light" || theme === "dark") {
    root.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  } else {
    delete root.dataset.theme;
    try { localStorage.removeItem(THEME_KEY); } catch { /* ignore */ }
  }
}

/**
 * Mounts the toggle into a container. Both icons are in the DOM and CSS shows
 * the right one, so switching never waits on JavaScript to redraw an icon.
 */
export function mountThemeToggle(container) {
  if (!container || container.querySelector(".bm-theme-toggle")) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "bm-theme-toggle";
  btn.innerHTML = `
    <svg class="bm-icon-moon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
            stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>
    <svg class="bm-icon-sun" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.8"/>
      <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"
            stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`;

  const label = () => {
    const next = resolvedTheme() === "dark" ? "light" : "dark";
    btn.setAttribute("aria-label", `Switch to ${next} mode`);
    btn.setAttribute("title", `Switch to ${next} mode`);
  };
  label();

  btn.addEventListener("click", () => {
    applyTheme(resolvedTheme() === "dark" ? "light" : "dark");
    label();
  });

  // If the user has expressed no preference, keep following the OS live.
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    if (!getStoredTheme()) label();
  });

  container.prepend(btn);
  return btn;
}

// --- Small shared helpers ---------------------------------------------------

export function daysSince(timestamp) {
  if (!timestamp) return null;
  const then = typeof timestamp.toDate === "function" ? timestamp.toDate() : new Date(timestamp);
  const ms = Date.now() - then.getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function toDate(timestamp) {
  if (!timestamp) return null;
  const d = typeof timestamp.toDate === "function" ? timestamp.toDate() : new Date(timestamp);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function minutesBetween(from, to) {
  const a = toDate(from);
  const b = toDate(to);
  if (!a || !b) return null;
  return (b.getTime() - a.getTime()) / 60000;
}

export function minutesSince(timestamp) {
  const d = toDate(timestamp);
  if (!d) return null;
  return (Date.now() - d.getTime()) / 60000;
}

// "4m", "3.2h", "6d" — keeps a response time readable at every scale.
export function formatDuration(minutes) {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return "—";
  if (minutes < 60) return `${Math.max(0, Math.round(minutes))}m`;
  const hours = minutes / 60;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function formatDate(timestamp) {
  if (!timestamp) return "—";
  const d = typeof timestamp.toDate === "function" ? timestamp.toDate() : new Date(timestamp);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatINR(amount) {
  if (amount === null || amount === undefined) return "—";
  const n = Number(amount);
  if (Number.isNaN(n)) return "—";
  // Round. A derived figure — an implied day rate, a share of a total — is a
  // float, and "Rs 3,846.154" is not a rupee amount anybody recognises.
  return `Rs ${Math.round(n).toLocaleString("en-IN")}`;
}

/**
 * A URL safe to put in an href.
 *
 * `escapeHtml` is not enough here and it is worth being precise about why: it
 * stops the value breaking OUT of the attribute, but `javascript:alert(1)`
 * contains no character it escapes, so it survives intact and runs on click.
 * Escaping and scheme-checking are different jobs; a link needs both.
 *
 * Returns null for anything that is not plainly http(s) or a same-site path,
 * and the caller renders no link at all. A missing preview link is a nuisance;
 * a preview link that runs code is a foothold on the page a client trusts.
 */
export function safeUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  // Relative paths and anchors are ours, and have no scheme to abuse.
  if (/^(\/|\.\/|\.\.\/|#)/.test(raw)) return raw;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return null; // no scheme and not a path — not something to link to
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[ch]);
}

/* ───────────────────────── payments ─────────────────────────
   Razorpay, through /api. The browser never sees a key secret and never
   decides an amount — both live server-side, in Vercel environment
   variables and in Firestore respectively. See api/_lib/firestore.js for
   why there is no service account anywhere in this deployment. */

/** Every payment call carries the caller's Firebase ID token. The server uses
 *  it to read Firestore *as them*, so firestore.rules stays the one boundary. */
async function authedFetch(path, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in first.");
  const token = await user.getIdToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || `request_failed_${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

/** Human wording for the machine codes the endpoints return. */
export const PAYMENT_ERRORS = {
  payments_not_configured: "Online payment is not switched on yet. Pay by transfer, or ask us for details.",
  already_paid: "This invoice is already paid. Refresh to see it update.",
  not_your_invoice: "That invoice does not belong to your account.",
  invoice_not_found: "That invoice no longer exists.",
  invoice_has_no_amount: "This invoice has no amount set. We will fix it and let you know.",
  signature_mismatch: "We could not confirm that payment. Nothing has been charged twice — contact us before retrying.",
  amount_mismatch: "The amount paid does not match the invoice. We are looking into it — do not pay again.",
  order_mismatch: "We could not match that payment to this invoice. Contact us before retrying.",
  sign_in_required: "Your session expired. Sign in again.",
  admin_only: "Admin only.",
};

export function paymentError(err) {
  const code = String((err && err.message) || "");
  if (PAYMENT_ERRORS[code]) return PAYMENT_ERRORS[code];
  if (code.startsWith("payment_")) return `The payment did not complete (${code.replace("payment_", "")}). Nothing was charged.`;
  return "Something went wrong with the payment. Nothing has been charged twice — contact us before retrying.";
}

/** Loads Razorpay Checkout on demand. Not in any page's <head>: a marketing
 *  visitor should not fetch a payment SDK to read the homepage. */
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("checkout_script_blocked"));
    document.head.appendChild(s);
  });
}

/**
 * Pays one invoice. Resolves with the verification result, or rejects.
 *
 * Deliberately resolves with `{ verified: true, settledInDatabase: false }`.
 * The payment is real and Razorpay has the money; the invoice row still says
 * due until the studio syncs, because nothing in this deployment is permitted
 * to write an invoice except the admin. Telling the client that plainly is
 * better than a green tick that the next page refresh contradicts.
 */
export async function payInvoice(invoiceId, { onDismiss } = {}) {
  const order = await authedFetch("/api/payments/create-order", {
    method: "POST",
    body: JSON.stringify({ invoiceId }),
  });

  await loadCheckout();

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: "Brand Mint Studios",
      description: order.invoice.label || "Invoice",
      prefill: { email: auth.currentUser ? auth.currentUser.email : "" },
      theme: { color: "#0b6b4f" },
      modal: {
        ondismiss: () => {
          onDismiss?.();
          reject(new Error("payment_cancelled"));
        },
      },
      handler: (response) => {
        // Verification is server-side. A handler that trusted this callback
        // would be trusting the page it is running in.
        authedFetch("/api/payments/verify", {
          method: "POST",
          body: JSON.stringify({ invoiceId, ...response }),
        })
          .then((v) => resolve({ ...v, settledInDatabase: false }))
          .catch(reject);
      },
    });
    rzp.open();
  });
}

/** Admin only. Asks Razorpay which invoices were actually paid. Writes nothing. */
export async function fetchSettledPayments(days = 60) {
  return authedFetch(`/api/payments/reconcile?days=${encodeURIComponent(days)}`);
}

/**
 * Admin only. Marks settled invoices paid, from the admin's own browser —
 * which firestore.rules already permits. This is why no server credential
 * exists: the only thing that writes an invoice is a signed-in admin.
 *
 * Returns what changed and what it skipped, because a sync that silently
 * did nothing is indistinguishable from one that had nothing to do.
 */
export async function syncPayments(days = 60) {
  const report = await fetchSettledPayments(days);
  const updated = [];
  const skipped = [];

  for (const row of report.settled) {
    const ref = doc(db, "invoices", row.invoiceId);
    const snap = await getDoc(ref);
    if (!snap.exists()) { skipped.push({ ...row, why: "invoice no longer exists" }); continue; }
    if (snap.data().status === "paid") { skipped.push({ ...row, why: "already marked paid" }); continue; }

    const expected = Number(snap.data().amount);
    if (Number.isFinite(expected) && Math.abs(expected - row.amount) > 0.5) {
      // Never overwrite an amount to make a payment fit. Flag it instead.
      skipped.push({ ...row, why: `paid ${formatINR(row.amount)} against ${formatINR(expected)} — check this` });
      continue;
    }

    await updateDoc(ref, {
      status: "paid",
      paidAt: row.at || new Date().toISOString(),
      paymentId: row.paymentId,
      paymentMethod: row.method || null,
    });
    updated.push(row);
  }

  return { updated, skipped, unsettled: report.unsettled, truncated: report.truncated, note: report.note };
}
