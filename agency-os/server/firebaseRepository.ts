import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { firebaseDb, firebaseStorage, makeNumericId } from "./firebase";

export const COLLECTIONS = {
  clients: "clients",
  clientContacts: "clientContacts",
  onboardingSubmissions: "onboardingSubmissions",
  legalAcceptances: "legalAcceptances",
  projects: "projects",
  deliverables: "deliverables",
  documents: "documents",
  invoices: "invoices",
  invoiceItems: "invoiceItems",
  storedFiles: "storedFiles",
  notifications: "notifications",
} as const;

function normalize(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, normalize(child)]));
  }
  return value;
}

export function fromSnapshot<T extends { id: number }>(snapshot: { id: string; data: () => DocumentData | undefined }): T | undefined {
  const data = snapshot.data();
  if (!data) return undefined;
  return normalize(data) as T;
}

export async function listRecords<T extends { id: number }>(collection: keyof typeof COLLECTIONS): Promise<T[]> {
  const snapshot = await firebaseDb().collection(COLLECTIONS[collection]).get();
  return snapshot.docs.map((document) => fromSnapshot<T>(document)).filter((record): record is T => Boolean(record));
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
