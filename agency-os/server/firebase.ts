import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import type { IncomingHttpHeaders } from "node:http";

export type FirebaseAgencyUser = {
  id: string;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: "firebase";
  role: "admin" | "user";
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

type FirebaseServiceAccount = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
  [key: string]: unknown;
};

function readServiceAccount(): FirebaseServiceAccount {
  const value = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!value) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is required for Firebase-backed operations");
  try {
    const serviceAccount = JSON.parse(value) as FirebaseServiceAccount;
    if (typeof serviceAccount.private_key !== "string") {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must include a private_key string");
    }
    serviceAccount.private_key = normalizeFirebasePrivateKey(serviceAccount.private_key);
    return serviceAccount;
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must be valid JSON");
  }
}

/**
 * Vercel environment values are frequently stored with literal `\\n` escape
 * sequences or wrapped quotes. Firebase Admin needs actual PEM line breaks.
 */
export function normalizeFirebasePrivateKey(value: string) {
  return value
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();
}

function firebaseApp() {
  if (getApps().length) return getApps()[0]!;
  const serviceAccount = readServiceAccount();
  const sharedOptions = { storageBucket: process.env.FIREBASE_STORAGE_BUCKET };

  try {
    return initializeApp({
      ...sharedOptions,
      credential: cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key,
      } satisfies ServiceAccount),
    });
  } catch (error) {
    if (!serviceAccount.project_id) throw error;

    // Firebase ID tokens are verified against Firebase's public signing keys
    // and the explicitly configured project ID. This preserves secure sign-in
    // while a malformed Admin private key prevents Firestore/Storage writes.
    console.error("[Firebase Admin] Invalid service-account credential; using token-verification-only fallback", error);
    return initializeApp({ ...sharedOptions, projectId: serviceAccount.project_id });
  }
}

export function firebaseDb() {
  return getFirestore(firebaseApp());
}

export function firebaseStorage() {
  return getStorage(firebaseApp()).bucket(process.env.FIREBASE_STORAGE_BUCKET);
}

/**
 * The studio owner. Admin is granted from FIREBASE_ADMIN_EMAILS when that is
 * set, and falls back to this address when it is blank or missing — a
 * mis-set variable must never leave the deployment with no owner, and must
 * never be the reason an unrelated account is treated as one.
 */
export const OWNER_EMAIL = "sumanthbolla97@gmail.com";

export function adminAllowlist(raw: string | undefined = process.env.FIREBASE_ADMIN_EMAILS): string[] {
  const configured = (raw ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    // An entry with no "@" cannot match a Google account, so it can only be
    // misconfiguration — including the literal "undefined" that results from
    // assigning an absent value straight into process.env.
    .filter((entry) => entry.includes("@"));
  return configured.length ? configured : [OWNER_EMAIL];
}

/**
 * Admin is an exact, case-insensitive match against the allowlist on a
 * verified email. Google is the only sign-in provider, so a real session
 * always carries email_verified; an explicit false is refused rather than
 * trusted.
 */
export function isConfiguredAdmin(email?: string | null, emailVerified?: boolean) {
  if (!email || emailVerified === false) return false;
  return adminAllowlist().includes(email.trim().toLowerCase());
}

export function firebaseUserFromToken(token: DecodedIdToken): FirebaseAgencyUser {
  const now = new Date();
  const isAdmin = isConfiguredAdmin(token.email, token.email_verified);

  // Every resolution is recorded, not only the admin ones — a log that speaks
  // up solely for admins cannot distinguish "a client signed in" from "nobody
  // signed in", which is exactly the question worth answering when accounts
  // appear to be getting the wrong screen. uid is included because that is what
  // the browser session is keyed on.
  console.info(`[Auth] ${token.email ?? "no-email"} uid=${token.uid} → ${isAdmin ? "ADMIN" : "user"}`);
  if (isAdmin) {
    const allowlist = adminAllowlist();
    if (allowlist.length > 1) {
      console.warn(`[Auth] FIREBASE_ADMIN_EMAILS grants admin to ${allowlist.length} accounts: ${allowlist.join(", ")}`);
    }
  }

  return {
    id: token.uid,
    openId: token.uid,
    name: token.name ?? null,
    email: token.email ?? null,
    loginMethod: "firebase",
    role: isAdmin ? "admin" : "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

export async function resolveFirebaseUser(token: DecodedIdToken): Promise<FirebaseAgencyUser> {
  const fallback = firebaseUserFromToken(token);

  try {
    const db = firebaseDb();
    const userRef = db.collection("users").doc(token.uid);
    const existing = await userRef.get();
    const now = new Date();
  // The Firebase email allowlist is the single source of truth for the CEO
  // role. A previously persisted admin record must not grant access after an
  // email is removed from the allowlist.
    const user: FirebaseAgencyUser = {
      ...fallback,
      name: token.name ?? existing.data()?.name ?? null,
      email: token.email ?? existing.data()?.email ?? null,
      createdAt: existing.data()?.createdAt?.toDate?.() ?? now,
      updatedAt: now,
      lastSignedIn: now,
    };
    await userRef.set(user, { merge: true });
    return user;
  } catch (error) {
    // A verified Firebase ID token is still authoritative for the signed-in
    // identity and CEO allowlist. Profile persistence must never turn it into
    // a client-side redirect loop when Firestore is temporarily unavailable.
    console.error("[Firebase Profile Sync] Using verified-token fallback", error);
    return fallback;
  }
}

export async function authenticateFirebaseRequest(req: { headers: IncomingHttpHeaders }): Promise<FirebaseAgencyUser | null> {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!token) return null;
  const decoded = await getAuth(firebaseApp()).verifyIdToken(token);
  return resolveFirebaseUser(decoded);
}

// Seeded randomly per process so two concurrent lambdas do not march in
// lockstep, then incremented so records written inside one process in the same
// millisecond can never share an id.
let idSequence = Math.floor(Math.random() * 1000);

/**
 * addRecord uses this as the Firestore document id and writes with set(), so a
 * duplicate silently overwrites the earlier record rather than failing. A purely
 * random suffix collided on roughly 0.6% of four-record bursts — and the four
 * legal acceptances of a single onboarding are written in exactly one burst, via
 * Promise.all. Losing one of those permanently blocks that client's portal,
 * because access requires all four to be present.
 *
 * Three digits is the most that fits: Date.now() is 13 digits and 17 would
 * exceed Number.MAX_SAFE_INTEGER.
 */
export function makeNumericId() {
  idSequence = (idSequence + 1) % 1000;
  return Number(`${Date.now()}${idSequence.toString().padStart(3, "0")}`);
}
