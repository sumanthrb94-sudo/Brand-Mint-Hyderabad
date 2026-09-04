/**
 * Brand Mint — shared session core (Firebase Auth).
 *
 * ONE auth instance, ONE session, used by every surface:
 *   /admin.html   → requires profiles/{uid}.role === 'admin'
 *   /portal.html  → role 'client'; with no membership yet it shows the lead state
 *   /index.html   → optional, just drives nav state
 *
 * Callers: admin/app.js, admin/auth.js, portal/app.js, login.html.
 *
 * The role lives in the `profiles` collection, never in a custom claim we let
 * the client set and never in a field the client can write. `firestore.rules`
 * is what actually enforces it; this module only decides which screen to show.
 *
 * Public API:
 *   getClient()                  → { app, auth, db, sdk }
 *   peekSession() / peekProfile()→ sync, localStorage-only, for first paint
 *   getSession() / getUser()     → async, authoritative
 *   getProfile({ force })        → { id, email, fullName, role, clientIds }
 *   signInWithGoogle(next)       → popup, redirect fallback
 *   signInWithEmail(email, next) → email sign-in link
 *   signOut(redirectTo)
 *   onChange(fn)                 → returns unsubscribe
 *   requireRole(role, opts)      → page gate; resolves with the profile
 */

import { getFirebase, isConfigured } from "/firebase/app.js";
import { firebaseConfig } from "/firebase/config.js";

/**
 * Our own first-paint hint. We cache it rather than reading Firebase's
 * internal localStorage key, because that key's shape is an implementation
 * detail. It is a DISPLAY hint only — forging it shows you a nav link and
 * an empty dashboard, because every read is checked server-side by rules.
 */
const PROFILE_KEY = "bm.auth.profile.v1";
const EMAIL_LINK_KEY = "bm.auth.emailForSignIn";

let _profile = null;
let _profilePromise = null;
let _authReady = null;
const _listeners = new Set();

export { isConfigured };
export const PROJECT_ID = firebaseConfig.projectId;

/* ------------------------------------------------------------------ client */

export async function getClient() {
  const fb = await getFirebase();
  if (!_authReady) _authReady = watchAuth(fb);
  return fb;
}

/** Resolves once Firebase has restored (or ruled out) a persisted session. */
function watchAuth(fb) {
  const { onAuthStateChanged } = fb.sdk;
  return new Promise((resolve) => {
    let settled = false;
    onAuthStateChanged(fb.auth, (user) => {
      // Identity changed — the cached role is no longer trustworthy.
      _profile = null;
      _profilePromise = null;
      if (!user) clearCachedProfile();

      if (!settled) {
        settled = true;
        resolve(user);
      }
      const event = user ? "SIGNED_IN" : "SIGNED_OUT";
      for (const fn of _listeners) {
        try { fn(event, user); } catch (e) { console.error("[auth] listener", e); }
      }
    });
  });
}

export function onChange(fn) {
  _listeners.add(fn);
  getClient();
  return () => _listeners.delete(fn);
}

/* -------------------------------------------------------------- fast peek */

/**
 * Synchronous read of our cached hint. Enough to decide "show a spinner" vs
 * "bounce to /login" before the SDK has loaded. Never an authorisation
 * decision — the server does that.
 */
export function peekSession() {
  const p = peekProfile();
  return p ? { user: { id: p.id, email: p.email } } : null;
}

export function peekProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function cacheProfile(profile) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch {}
}

function clearCachedProfile() {
  try { localStorage.removeItem(PROFILE_KEY); } catch {}
}

/* ------------------------------------------------------------- session/user */

export async function getSession() {
  const user = await getUser();
  return user ? { user } : null;
}

/** Fresh ID token for the signed-in user, or null. Used to sign analytics writes. */
export async function getIdToken() {
  const user = await getUser();
  return user ? user.getIdToken() : null;
}

export async function getUser() {
  const fb = await getClient();
  if (fb.auth.currentUser) return fb.auth.currentUser;
  return _authReady; // resolves with the restored user, or null
}

/**
 * Resolve the signed-in user's profile: role plus the client ids they can
 * see. Cached per page load; pass { force: true } after changing memberships.
 */
export async function getProfile({ force = false } = {}) {
  if (_profile && !force) return _profile;
  if (_profilePromise && !force) return _profilePromise;

  _profilePromise = (async () => {
    const fb = await getClient();
    const user = await getUser();
    if (!user) {
      _profile = null;
      clearCachedProfile();
      return null;
    }

    const { doc, getDoc, setDoc, collection, query, where, getDocs } = fb.sdk;

    // The profile document is created on first sign-in by the user
    // themselves. Rules pin the role to 'client' on create, so this cannot
    // be used to self-promote — an admin is made by editing the document in
    // the Firebase console (see SETUP-FIREBASE.md).
    const profileRef = doc(fb.db, "profiles", user.uid);
    let snap = await getDoc(profileRef);

    if (!snap.exists()) {
      try {
        await setDoc(profileRef, {
          email: user.email || "",
          fullName: user.displayName || (user.email ? user.email.split("@")[0] : ""),
          avatarUrl: user.photoURL || "",
          role: "client",
          createdAt: new Date().toISOString(),
        });
        snap = await getDoc(profileRef);
      } catch (e) {
        console.warn("[auth] could not create profile", e);
      }
    }

    // Convert any invite left for this address into a real membership. This
    // replaces the Postgres signup trigger; the equivalent guard lives in
    // firestore.rules, which only permits the write when a matching invite
    // exists AND the email is verified.
    await claimPendingInvites(fb, user);

    const memberships = await getDocs(
      query(collection(fb.db, "clientUsers"), where("uid", "==", user.uid))
    );

    const data = snap.exists() ? snap.data() : null;

    _profile = {
      id: user.uid,
      email: data?.email || user.email || "",
      fullName:
        data?.fullName || user.displayName || (user.email ? user.email.split("@")[0] : ""),
      avatarUrl: data?.avatarUrl || user.photoURL || "",
      // Least privilege when the document is missing or unreadable — never
      // assume admin.
      role: data?.role === "admin" ? "admin" : "client",
      clientIds: memberships.docs.map((d) => d.data().clientId),
      selectedTier: data?.selectedTier || null,
      consent: data?.consent || null,
      readiness: data?.readiness || null,
      profileMissing: !data,
    };
    cacheProfile(_profile);
    return _profile;
  })();

  return _profilePromise;
}

/**
 * Look for invites addressed to this user's verified email and turn each into
 * a membership. Safe to call on every load: the document id is deterministic,
 * so re-claiming is a no-op.
 */
async function claimPendingInvites(fb, user) {
  if (!user.email || !user.emailVerified) return;
  const { collection, query, where, getDocs, doc, setDoc, updateDoc } = fb.sdk;

  // Query with the address EXACTLY as the ID token carries it. The rule
  // compares `resource.data.email == request.auth.token.email`, and a list
  // query is only allowed when its constraint provably matches the rule — so
  // lowercasing here would make the two disagree and the read would be
  // denied. Firebase normalises Google and email-link addresses to lowercase,
  // and the admin writes invites lowercased, so these line up; if they ever
  // didn't, the failure is "no invite found", never "wrong invite claimed".
  const email = user.email;

  try {
    const pending = await getDocs(
      query(collection(fb.db, "invites"), where("email", "==", email))
    );
    for (const inviteDoc of pending.docs) {
      const { clientId } = inviteDoc.data();
      if (!clientId) continue;
      await setDoc(
        doc(fb.db, "clientUsers", `${user.uid}_${clientId}`),
        {
          uid: user.uid,
          clientId,
          email,
          role: "owner",
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );
      if (!inviteDoc.data().acceptedAt) {
        try {
          await updateDoc(inviteDoc.ref, { acceptedAt: new Date().toISOString() });
        } catch (e) {
          // Non-fatal: the membership is what grants access.
          console.warn("[auth] could not stamp invite accepted", e);
        }
      }
    }
  } catch (e) {
    // A user with no invite simply has nothing to read here.
    console.warn("[auth] invite claim skipped", e?.code || e);
  }
}

/* ------------------------------------------------------------- signup ---- */

/**
 * Record what a visitor agreed to and what they picked. Called right after
 * Google sign-in. Writes to their own profile (which rules let them update)
 * and drops a lead so the studio sees them in the admin the same minute.
 *
 * Idempotent per (uid, tier): re-signing in with the same tier updates the
 * profile but does not create a second lead.
 */
export async function recordSignup({ tier = null, newsletter = false } = {}) {
  const fb = await getClient();
  const user = await getUser();
  if (!user) return;
  const { doc, setDoc, getDoc, collection, query, where, getDocs, addDoc } = fb.sdk;
  const now = new Date().toISOString();

  await setDoc(
    doc(fb.db, "profiles", user.uid),
    {
      email: user.email || "",
      fullName: user.displayName || "",
      avatarUrl: user.photoURL || "",
      consent: { privacy: true, terms: true, newsletter: !!newsletter, at: now },
      ...(tier ? { selectedTier: tier, selectedTierAt: now } : {}),
      updatedAt: now,
    },
    { merge: true }
  );

  if (!tier) return;

  // One lead per person per tier. The uid is what lets the admin convert
  // this lead straight into a client membership without an invite.
  const existing = await getDocs(
    query(collection(fb.db, "leads"), where("uid", "==", user.uid), where("tier", "==", tier))
  ).catch(() => null);
  if (existing && !existing.empty) return;

  await addDoc(collection(fb.db, "leads"), {
    uid: user.uid,
    name: user.displayName || user.email || "",
    email: user.email || "",
    phone: user.phoneNumber || "",
    tier,
    message: `Picked ${tier} on the site and signed in with Google.`,
    source: "Site — tier sign-in",
    status: "new",
    score: 70,
    newsletter: !!newsletter,
    createdAt: now,
    updatedAt: now,
  });

  _profile = null; // selectedTier changed; force a re-read next time
  _profilePromise = null;
}

/* --------------------------------------------------------------- sign in/out */

function absolute(path) {
  return new URL(path || "/", window.location.origin).toString();
}

export async function signInWithGoogle(next = "/portal") {
  const fb = await getClient();
  const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = fb.sdk;

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    sessionStorage.setItem("bm.auth.next", next || "/portal");
  } catch {}

  try {
    await signInWithPopup(fb.auth, provider);
  } catch (e) {
    // Popup blocked, or an in-app browser that can't open one. Redirect
    // instead; the page reloads and the session is picked up on return.
    if (
      e?.code === "auth/popup-blocked" ||
      e?.code === "auth/operation-not-supported-in-this-environment" ||
      e?.code === "auth/cancelled-popup-request"
    ) {
      await signInWithRedirect(fb.auth, provider);
      return;
    }
    throw e;
  }
}

export async function signInWithEmail(email, next = "/portal") {
  const fb = await getClient();
  const { sendSignInLinkToEmail } = fb.sdk;
  const clean = (email || "").trim();

  await sendSignInLinkToEmail(fb.auth, clean, {
    url: absolute(`/login?next=${encodeURIComponent(next || "/portal")}`),
    handleCodeInApp: true,
  });
  // The link is opened on whatever device the mail is read on, so the address
  // has to be remembered locally to complete sign-in without re-asking.
  try { localStorage.setItem(EMAIL_LINK_KEY, clean); } catch {}
}

/**
 * Completes an email-link sign-in if the current URL is one. Returns true if
 * a sign-in happened. Called by login.html on load.
 */
export async function completeEmailLinkSignIn() {
  const fb = await getClient();
  const { isSignInWithEmailLink, signInWithEmailLink } = fb.sdk;
  if (!isSignInWithEmailLink(fb.auth, window.location.href)) return false;

  let email = null;
  try { email = localStorage.getItem(EMAIL_LINK_KEY); } catch {}
  if (!email) {
    email = window.prompt("Confirm the email address this link was sent to:");
  }
  if (!email) return false;

  await signInWithEmailLink(fb.auth, email, window.location.href);
  try { localStorage.removeItem(EMAIL_LINK_KEY); } catch {}
  return true;
}

export async function signOut(redirectTo = "/") {
  try {
    const fb = await getClient();
    await fb.sdk.signOut(fb.auth);
  } catch (e) {
    console.warn("[auth] signOut", e);
  }
  _profile = null;
  _profilePromise = null;
  clearCachedProfile();
  // Clear retired fake-session keys so an old browser cannot resurrect them.
  for (const k of ["bm.demo.session", "bm.admin.v1.session", "bm.admin.v1.passhash"]) {
    try { localStorage.removeItem(k); } catch {}
  }
  if (redirectTo) window.location.replace(redirectTo);
}

/* -------------------------------------------------------------------- gate */

/**
 * Page guard. Resolves with the profile when the user is allowed, and
 * redirects (never resolving) when they are not.
 */
export async function requireRole(
  role,
  { signIn = "/login", denied = "/login?denied=1", timeoutMs = 15000 } = {}
) {
  // If the SDK can't load or Firestore is unreachable the lookup never
  // settles, and the caller would sit on its boot screen indefinitely.
  const profile = await Promise.race([
    getProfile(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timed out verifying your session.")), timeoutMs)
    ),
  ]);

  if (!profile) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`${signIn}${signIn.includes("?") ? "&" : "?"}next=${next}`);
    return new Promise(() => {});
  }

  if (profile.role !== role) {
    window.location.replace(denied);
    return new Promise(() => {});
  }

  // A client with no membership yet is a LEAD — they picked a tier and signed
  // in, and we haven't converted them. The portal renders that state itself.
  return profile;
}

/** Strip the auth params Firebase leaves behind after a redirect or email link. */
export function cleanAuthParamsFromUrl() {
  try {
    const url = new URL(window.location.href);
    let dirty = false;
    for (const key of [
      "apiKey", "oobCode", "mode", "lang", "continueUrl",
      "code", "type", "error", "error_description", "next",
    ]) {
      if (url.searchParams.has(key)) { url.searchParams.delete(key); dirty = true; }
    }
    if (url.hash && /access_token|id_token|error/.test(url.hash)) {
      url.hash = "";
      dirty = true;
    }
    if (dirty) window.history.replaceState({}, "", url.toString());
  } catch {}
}
