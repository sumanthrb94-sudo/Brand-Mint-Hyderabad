import { cert, getApps, initializeApp } from "firebase-admin/app";
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
  private_key?: unknown;
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
      credential: cert(serviceAccount),
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

function isConfiguredAdmin(email?: string | null) {
  const configuredEmails = (process.env.FIREBASE_ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(email && configuredEmails.includes(email.toLowerCase()));
}

export function firebaseUserFromToken(token: DecodedIdToken): FirebaseAgencyUser {
  const now = new Date();
  return {
    id: token.uid,
    openId: token.uid,
    name: token.name ?? null,
    email: token.email ?? null,
    loginMethod: "firebase",
    role: isConfiguredAdmin(token.email) ? "admin" : "user",
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

export function makeNumericId() {
  return Number(`${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`);
}
