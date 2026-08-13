import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  clientContacts,
  clients,
  legalAcceptances,
  onboardingSubmissions,
  type ClientContact,
} from "../drizzle/schema";
import { getDb } from "./db";

export const REQUIRED_POLICY_TYPES = ["terms", "privacy", "cookies", "service_agreement"] as const;
export type RequiredPolicyType = (typeof REQUIRED_POLICY_TYPES)[number];

export type OnboardingInput = {
  name: string;
  companyName: string;
  email: string;
  phone?: string;
  serviceType: "ecommerce";
  serviceTier: "starter_store" | "growth_store" | "commerce_store";
  selectedAddons?: ("android_app" | "additional_payment_gateway" | "extra_design_revision")[];
  preferredTimeline?: string;
  projectBrief: string;
  deliverables?: string;
  acceptedPolicies: RequiredPolicyType[];
};

function uniqueRequiredPolicyTypes(input: RequiredPolicyType[]) {
  return Array.from(new Set(input)).filter((policy): policy is RequiredPolicyType => REQUIRED_POLICY_TYPES.includes(policy));
}

export function hasAcceptedAllRequiredPolicies(policyTypes: readonly string[]) {
  const accepted = new Set(policyTypes);
  return REQUIRED_POLICY_TYPES.every((policy) => accepted.has(policy));
}

export async function createCompletedOnboarding(input: OnboardingInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");

  const acceptedPolicies = uniqueRequiredPolicyTypes(input.acceptedPolicies);
  if (!hasAcceptedAllRequiredPolicies(acceptedPolicies)) throw new Error("All required policy documents must be accepted before onboarding can complete");

  const clientPublicId = nanoid(14);
  const onboardingPublicId = nanoid(14);
  const normalizedEmail = input.email.trim().toLowerCase();

  await db.insert(clients).values({ publicId: clientPublicId, companyName: input.companyName.trim(), status: "lead" });
  const client = (await db.select().from(clients).where(eq(clients.publicId, clientPublicId)).limit(1))[0];
  if (!client) throw new Error("Client record could not be created");

  await db.insert(clientContacts).values({ clientId: client.id, name: input.name.trim(), email: normalizedEmail, phone: input.phone?.trim() || null, isPrimary: true });
  const contact = (await db.select().from(clientContacts).where(and(eq(clientContacts.clientId, client.id), eq(clientContacts.email, normalizedEmail))).limit(1))[0];
  if (!contact) throw new Error("Client contact could not be created");

  await db.insert(onboardingSubmissions).values({
    publicId: onboardingPublicId,
    clientId: client.id,
    clientContactId: contact.id,
    serviceType: input.serviceType,
    serviceTier: input.serviceTier,
    selectedAddons: input.selectedAddons?.length ? JSON.stringify(input.selectedAddons) : null,
    preferredTimeline: input.preferredTimeline?.trim() || null,
    projectBrief: input.projectBrief.trim(),
    deliverables: input.deliverables?.trim() || null,
    stage: "complete",
    completedAt: new Date(),
  });

  await db.insert(legalAcceptances).values(acceptedPolicies.map((policyType) => ({
    clientId: client.id,
    clientContactId: contact.id,
    policyType,
    documentVersion: "draft-v1",
    acceptedByName: input.name.trim(),
    acceptedByEmail: normalizedEmail,
  })));

  return { client, contact, onboardingPublicId };
}

export async function getClientContactForUser(userId: number): Promise<ClientContact | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(clientContacts).where(eq(clientContacts.userId, userId)).limit(1))[0];
}

export async function bindEligibleClientUser({ userId, email }: { userId: number; email?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  if (!email) throw new Error("A matching client email is required for client portal access");
  const normalizedEmail = email.trim().toLowerCase();
  const contact = (await db.select().from(clientContacts).where(eq(clientContacts.email, normalizedEmail)).limit(1))[0];
  if (!contact) throw new Error("No client onboarding record matches this account email");

  const acceptances = await db.select({ policyType: legalAcceptances.policyType }).from(legalAcceptances).where(eq(legalAcceptances.clientContactId, contact.id));
  if (!hasAcceptedAllRequiredPolicies(acceptances.map((acceptance) => acceptance.policyType))) throw new Error("Required legal documents must be accepted before client portal activation");

  await db.update(clientContacts).set({ userId }).where(eq(clientContacts.id, contact.id));
  return { clientId: contact.clientId, contactId: contact.id };
}

export async function getLegalAcceptancesForContact(contactId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(legalAcceptances).where(eq(legalAcceptances.clientContactId, contactId));
}

export async function createNotification(input: {
  recipientRole: "admin" | "client";
  notificationType: "onboarding_complete" | "legal_accepted" | "invoice_paid" | "invoice_issued" | "document_ready" | "document_signed";
  title: string;
  message: string;
  clientId?: number;
  recipientUserId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const { notifications } = await import("../drizzle/schema");
  await db.insert(notifications).values({
    recipientRole: input.recipientRole,
    notificationType: input.notificationType,
    title: input.title,
    message: input.message,
    clientId: input.clientId ?? null,
    recipientUserId: input.recipientUserId ?? null,
  });
}
