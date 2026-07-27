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
  { id: "inventory", name: "Inventory Manager", kind: "client", status: "active", retainer: 25000, retainerStatus: "signed" },
  { id: "greenbasket", name: "Green Basket", kind: "client", status: "active", retainer: 0, retainerStatus: "none", note: "COD-only web app + Play Store APK. Quoted Rs 95,000, Rs 15,000 received." },
  { id: "tresor", name: "Tresor Couture", kind: "client", status: "active", retainer: 0, retainerStatus: "none", note: "Zero to production, unpaid." },
  { id: "modcon", name: "Modcon HR", kind: "internal", status: "active", retainer: 0, retainerStatus: "none", note: "Free side build with an intern." },
  { id: "simplysip", name: "SimplySip", kind: "client", status: "archived", retainer: 0, retainerStatus: "none" },
];

// type/dueAt/progress are set on every project so the schema is complete and
// the portal always has something consistent to render — but only with
// facts we actually have. `type` is a plain category, not a fabricated
// business detail; dueAt stays null and progress stays 0 rather than
// inventing a schedule or a completion percentage nobody has confirmed.
const SEED_PROJECTS = [
  { id: "inventory-project", orgId: "inventory", name: "Inventory Manager", type: "web", dueAt: null, progress: 0, billable: true },
  { id: "greenbasket-project", orgId: "greenbasket", name: "Green Basket", type: "web+mobile", dueAt: null, progress: 0, billable: true },
  { id: "tresor-project", orgId: "tresor", name: "Tresor Couture", type: "web", dueAt: null, progress: 0, billable: false },
  { id: "modcon-project", orgId: "modcon", name: "Modcon HR", type: "internal", dueAt: null, progress: 0, billable: false },
  // Archived org — never billable.
  { id: "simplysip-project", orgId: "simplysip", name: "SimplySip", type: "web", dueAt: null, progress: 0, billable: false },
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

// --- Small shared helpers ---------------------------------------------------

export function daysSince(timestamp) {
  if (!timestamp) return null;
  const then = typeof timestamp.toDate === "function" ? timestamp.toDate() : new Date(timestamp);
  const ms = Date.now() - then.getTime();
  return Math.max(0, Math.floor(ms / 86400000));
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
