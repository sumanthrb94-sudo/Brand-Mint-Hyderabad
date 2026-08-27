import type { DocumentData, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { firebaseDb, firebaseStorage, makeNumericId } from "./firebase.js";

export const COLLECTIONS = {
  clients: "clients",
  publicInquiries: "publicInquiries",
  clientContacts: "clientContacts",
  onboardingSubmissions: "onboardingSubmissions",
  legalAcceptances: "legalAcceptances",
  projects: "projects",
  deliverables: "deliverables",
  checklistItems: "checklistItems",
  documents: "documents",
  invoices: "invoices",
  invoiceItems: "invoiceItems",
  storedFiles: "storedFiles",
  notifications: "notifications",
} as const;

function hasFirestoreDate(value: unknown): value is { toDate: () => Date } {
  return Boolean(value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function");
}

function normalize(value: unknown): unknown {
  if (hasFirestoreDate(value)) return value.toDate();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, normalize(child)]));
  }
  return value;
}

/**
 * Documents written by earlier revisions of this app, imported by hand, or
 * partially written by a failed request can carry a missing, string, or
 * numeric timestamp. Every caller sorts on `updatedAt`/`createdAt` and calls
 * `.getTime()` on them, so coerce to a real Date at the read boundary rather
 * than letting a single malformed document throw the whole query.
 */
export function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (hasFirestoreDate(value)) return toDate(value.toDate());
  if (typeof value === "string" || typeof value === "number") return toDate(new Date(value));
  return null;
}

export function recordTime(value: unknown): number {
  return toDate(value)?.getTime() ?? 0;
}

const EPOCH = new Date(0);

export function fromSnapshot<T extends { id: number }>(snapshot: { id: string; data: () => DocumentData | undefined }): T | undefined {
  const data = snapshot.data();
  if (!data) return undefined;
  const record = normalize(data) as Record<string, unknown>;
  const createdAt = toDate(record.createdAt);
  record.createdAt = createdAt ?? EPOCH;
  record.updatedAt = toDate(record.updatedAt) ?? createdAt ?? EPOCH;
  return record as T;
}

export async function listRecords<T extends { id: number }>(collection: keyof typeof COLLECTIONS): Promise<T[]> {
  const snapshot = await firebaseDb().collection(COLLECTIONS[collection]).get();
  return snapshot.docs
    .map((document: QueryDocumentSnapshot<DocumentData>) => fromSnapshot<T>(document))
    .filter((record: T | undefined): record is T => Boolean(record));
}

export async function getRecord<T extends { id: number }>(collection: keyof typeof COLLECTIONS, id: number): Promise<T | undefined> {
  return fromSnapshot<T>(await firebaseDb().collection(COLLECTIONS[collection]).doc(String(id)).get());
}

export async function addRecord<T extends Record<string, unknown>>(collection: keyof typeof COLLECTIONS, values: T): Promise<T & { id: number }> {
  const id = makeNumericId();
  const record = { ...values, id, createdAt: values.createdAt ?? new Date(), updatedAt: new Date() } as T & { id: number };
  await firebaseDb().collection(COLLECTIONS[collection]).doc(String(id)).set(record);
  return record;
}

export async function updateRecord<T extends Record<string, unknown>>(collection: keyof typeof COLLECTIONS, id: number, values: Partial<T>) {
  await firebaseDb().collection(COLLECTIONS[collection]).doc(String(id)).set({ ...values, updatedAt: new Date() }, { merge: true });
}

/**
 * Deletes every document in a collection, through the same Firestore handle
 * every other function here uses.
 *
 * Written because the reset procedure reached for the browser Firebase SDK
 * (`firebase/firestore`) instead: on the server there is no client app to
 * initialise, so `getFirestore()` threw and the reset silently never ran.
 */
export async function clearCollection(collection: keyof typeof COLLECTIONS): Promise<number> {
  const snapshot = await firebaseDb().collection(COLLECTIONS[collection]).get();
  const ids = snapshot.docs.map((document: QueryDocumentSnapshot<DocumentData>) => document.id);
  for (const id of ids) {
    await firebaseDb().collection(COLLECTIONS[collection]).doc(id).delete();
  }
  return ids.length;
}

export async function findOne<T extends { id: number }>(collection: keyof typeof COLLECTIONS, predicate: (record: T) => boolean): Promise<T | undefined> {
  return (await listRecords<T>(collection)).find(predicate);
}

export async function filterRecords<T extends { id: number }>(collection: keyof typeof COLLECTIONS, predicate: (record: T) => boolean): Promise<T[]> {
  return (await listRecords<T>(collection)).filter(predicate);
}

export async function storeFile(storageKey: string, contents: Buffer, contentType: string) {
  const file = firebaseStorage().file(storageKey);
  await file.save(contents, { contentType, resumable: false, metadata: { cacheControl: "private, max-age=0" } });
  return { key: storageKey, url: `/api/files/${encodeURIComponent(storageKey)}` };
}

export async function getSignedFileUrl(storageKey: string) {
  const [url] = await firebaseStorage().file(storageKey).getSignedUrl({ action: "read", expires: Date.now() + 10 * 60 * 1000 });
  return url;
}
