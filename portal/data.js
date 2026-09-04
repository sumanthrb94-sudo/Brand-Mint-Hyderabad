/**
 * Portal data layer (Firestore).
 *
 * Deliberately thinner than admin/db.js: no cache of its own, no seeding.
 * Every read is scoped by `firestore.rules` to the client(s) this user
 * belongs to — the filtering here is for display, never for security.
 *
 * One Firestore constraint shapes this whole file: **rules filter documents,
 * they do not filter queries.** A query that isn't already provably within
 * what the rules allow is rejected outright, not silently narrowed. So every
 * read below carries its own `where("clientId", "==", clientId)`. Dropping
 * one turns into a permission-denied error, not a quiet data leak.
 *
 * Sorting is done in JS rather than with orderBy() so that no composite
 * indexes are needed — one less thing to deploy. If these collections ever
 * grow past a few hundred documents per client, add the indexes and move the
 * sorts back into the query.
 */

import { getFirebase } from "/firebase/app.js";
import { getProfile } from "/auth/session.js";

let _clientId = null;

/** The client workspace this user is viewing. */
export async function activeClientId() {
  if (_clientId) return _clientId;
  const profile = await getProfile();
  _clientId = profile?.clientIds?.[0] || null;
  return _clientId;
}

const byAsc = (key) => (a, b) => String(a[key] || "").localeCompare(String(b[key] || ""));
const byDesc = (key) => (a, b) => String(b[key] || "").localeCompare(String(a[key] || ""));
const byNum = (key) => (a, b) => (a[key] ?? 0) - (b[key] ?? 0);

async function selectScoped(name, clientId) {
  const fb = await getFirebase();
  const { collection, query, where, getDocs } = fb.sdk;
  const snap = await getDocs(
    query(collection(fb.db, name), where("clientId", "==", clientId))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/* ------------------------------------------------------------------ reads */

export async function loadWorkspace() {
  const clientId = await activeClientId();
  if (!clientId) return null;

  const fb = await getFirebase();
  const { doc, getDoc } = fb.sdk;

  const [clientSnap, projects, milestones, deliverables, invoices, messages, briefSnap] =
    await Promise.all([
      getDoc(doc(fb.db, "clients", clientId)),
      selectScoped("projects", clientId),
      selectScoped("milestones", clientId),
      selectScoped("deliverables", clientId),
      selectScoped("invoices", clientId),
      selectScoped("messages", clientId),
      getDoc(doc(fb.db, "onboardingResponses", clientId)),
    ]);

  return {
    clientId,
    client: clientSnap.exists()
      ? { id: clientSnap.id, ...clientSnap.data() }
      : { id: clientId, name: "Your workspace" },
    projects,
    milestones: milestones.sort(byNum("position")),
    // A draft deliverable is hidden by the rules, but filter too so a rules
    // change can never surprise a client with unfinished work.
    deliverables: deliverables
      .filter((d) => d.status !== "draft")
      .sort(byDesc("createdAt")),
    invoices: invoices.sort(byDesc("issueDate")),
    messages: messages.sort(byAsc("createdAt")),
    brief: briefSnap.exists() ? { id: briefSnap.id, ...briefSnap.data() } : null,
  };
}

/* ----------------------------------------------------------------- writes */

/**
 * Create-or-update the brief. Keyed by clientId so there is exactly one per
 * client and a half-finished wizard can't fork into duplicates.
 */
export async function saveBrief({ answers, step, status }) {
  const clientId = await activeClientId();
  if (!clientId) throw new Error("No workspace linked to this account.");

  const fb = await getFirebase();
  const { doc, setDoc } = fb.sdk;
  const profile = await getProfile();

  const payload = {
    clientId,
    submittedBy: profile.id,
    answers,
    step,
    status,
    updatedAt: new Date().toISOString(),
  };
  if (status === "submitted") payload.submittedAt = new Date().toISOString();

  await setDoc(doc(fb.db, "onboardingResponses", clientId), payload, { merge: true });

  // Keep the admin's funnel column honest.
  await setDoc(
    doc(fb.db, "clients", clientId),
    { onboardingStatus: status === "submitted" ? "submitted" : "in_progress" },
    { merge: true }
  );

  return payload;
}

/** Record the client's verdict on a deliverable. */
export async function reviewDeliverable(id, verdict, note) {
  const fb = await getFirebase();
  const { doc, updateDoc } = fb.sdk;
  const profile = await getProfile();

  // These five fields are exactly what the rules allow a client to touch —
  // see the deliverables `hasOnly([...])` clause in firestore.rules. Adding a
  // field here without adding it there turns into a permission error.
  await updateDoc(doc(fb.db, "deliverables", id), {
    status: verdict === "approve" ? "approved" : "revision_requested",
    revisionNote: verdict === "approve" ? null : (note || "").trim() || null,
    reviewedBy: profile.id,
    reviewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function postMessage(body, projectId = null) {
  const clientId = await activeClientId();
  const fb = await getFirebase();
  const { collection, addDoc } = fb.sdk;
  const profile = await getProfile();

  await addDoc(collection(fb.db, "messages"), {
    clientId,
    projectId,
    authorId: profile.id,
    authorName: profile.fullName || profile.email,
    authorRole: "client",
    body,
    readByAdmin: false,
    readByClient: true,
    createdAt: new Date().toISOString(),
  });
}

export async function markThreadRead(messages) {
  const unread = messages.filter((m) => m.authorRole === "admin" && !m.readByClient);
  if (!unread.length) return;

  const fb = await getFirebase();
  const { doc, writeBatch } = fb.sdk;

  // Firestore has no "update where id in (...)", so batch the writes. A batch
  // is capped at 500 operations; chunk defensively.
  for (let i = 0; i < unread.length; i += 400) {
    const batch = writeBatch(fb.db);
    for (const m of unread.slice(i, i + 400)) {
      batch.update(doc(fb.db, "messages", m.id), { readByClient: true });
    }
    await batch.commit();
  }
}

/* -------------------------------------------------------------- realtime */

/** Re-run `onChange` whenever the studio touches this client's data. */
export async function watch(onChange) {
  const clientId = await activeClientId();
  if (!clientId) return () => {};

  const fb = await getFirebase();
  const { collection, query, where, onSnapshot } = fb.sdk;
  const unsubs = [];

  for (const name of ["milestones", "deliverables", "messages", "invoices", "projects"]) {
    unsubs.push(
      onSnapshot(
        query(collection(fb.db, name), where("clientId", "==", clientId)),
        () => onChange(name),
        (err) => console.warn(`[portal] ${name} listener`, err)
      )
    );
  }

  return () => {
    for (const u of unsubs) {
      try { u(); } catch (_) {}
    }
  };
}


/* ----------------------------------------------------- perks + pre-booking */

/** Ask for a free perk or pre-book a trial. Lands in Admin → Leads. */
export async function sendRequest({ kind, item, label }) {
  const fb = await getFirebase();
  const { collection, addDoc } = fb.sdk;
  const profile = await getProfile();
  const now = new Date().toISOString();
  await addDoc(collection(fb.db, "requests"), {
    uid: profile.id,
    name: profile.fullName || "",
    email: profile.email || "",
    kind,
    item,
    label,
    status: "new",
    createdAt: now,
    updatedAt: now,
  });
}

/** The caller's own requests, so the portal can show what's already asked for. */
export async function myRequests() {
  const fb = await getFirebase();
  const { collection, query, where, getDocs } = fb.sdk;
  const profile = await getProfile();
  const snap = await getDocs(query(collection(fb.db, "requests"), where("uid", "==", profile.id)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
