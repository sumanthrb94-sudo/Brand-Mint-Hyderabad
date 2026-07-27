// Brand Mint client portal — Firebase init + every read and write.
// Plain ES module, no bundler. Firebase v10.14.1 from the official CDN.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
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
  getDocs,
  writeBatch,
  serverTimestamp,
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
export async function pushRequirementsToIntake(projectId, featureIds) {
  const chosen = FEATURE_CATALOG.filter((f) => featureIds.includes(f.id));
  const batch = writeBatch(db);
  let count = 0;
  for (const feature of chosen) {
    for (const requirement of feature.requires) {
      batch.set(doc(collection(db, "projects", projectId, "intake")), {
        label: `${feature.label}: ${requirement}`,
        // Anything mentioning an account or being added as a user is access;
        // everything else is an asset the client owes us.
        group: /account|add hello@|user on|DNS|GSTIN|PAN/i.test(requirement) ? "access" : "assets",
        done: false,
        raisedAt: serverTimestamp(),
        clearedAt: null,
      });
      count++;
    }
  }
  await batch.commit();
  return count;
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
export async function markLeadFirstResponse(id) {
  await updateDoc(doc(db, "leads", id), { firstResponseAt: serverTimestamp() });
}

// --- Projects (admin only) --------------------------------------------------

export async function updateProject(projectId, data) {
  await updateDoc(doc(db, "projects", projectId), data);
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
  return `Rs ${Number(amount).toLocaleString("en-IN")}`;
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
