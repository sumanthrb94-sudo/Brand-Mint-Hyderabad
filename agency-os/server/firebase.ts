import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import type { Request } from "express";

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

function readServiceAccount() {
  const value = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!value) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is required for Firebase-backed operations");
  try {
    return JSON.parse(value);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must be valid JSON");
  }
}

function firebaseApp() {
  if (getApps().length) return getApps()[0]!;
  return initializeApp({
    credential: cert(readServiceAccount()),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
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

export async function resolveFirebaseUser(token: DecodedIdToken): Promise<FirebaseAgencyUser> {
  const db = firebaseDb();
  const userRef = db.collection("users").doc(token.uid);
  const existing = await userRef.get();
  const now = new Date();
  const role: FirebaseAgencyUser["role"] = isConfiguredAdmin(token.email)
    ? "admin"
    : existing.data()?.role === "admin"
      ? "admin"
      : "user";
  const user: FirebaseAgencyUser = {
    id: token.uid,
    openId: token.uid,
    name: token.name ?? existing.data()?.name ?? null,
    email: token.email ?? existing.data()?.email ?? null,
    loginMethod: "firebase",
    role,
    createdAt: existing.data()?.createdAt?.toDate?.() ?? now,
    updatedAt: now,
    lastSignedIn: now,
  };
  await userRef.set(user, { merge: true });
  return user;
}

export async function authenticateFirebaseRequest(req: Request): Promise<FirebaseAgencyUser | null> {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!token) return null;
  const decoded = await getAuth(firebaseApp()).verifyIdToken(token);
  return resolveFirebaseUser(decoded);
}

export function makeNumericId() {
  return Number(`${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`);
}
