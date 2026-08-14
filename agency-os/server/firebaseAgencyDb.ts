import { nanoid } from "nanoid";
import { addRecord, filterRecords, findOne, getRecord, listRecords, recordTime, updateRecord } from "./firebaseRepository.js";
import { onboardingProjectDraft } from "./projectPricing.js";
import { sopTemplate } from "./projectSop.js";

export const REQUIRED_POLICY_TYPES = ["terms", "privacy", "cookies", "service_agreement"] as const;
export type RequiredPolicyType = (typeof REQUIRED_POLICY_TYPES)[number];

export type ClientRecord = { id: number; publicId: string; companyName: string; status: "lead" | "active" | "archived"; createdAt: Date; updatedAt: Date };
export type PublicInquiryRecord = { id: number; name: string; companyName: string; email: string; request: string; status: "new" | "reviewing" | "qualified" | "closed"; createdAt: Date; updatedAt: Date };
export type ClientContactRecord = { id: number; clientId: number; userId?: string; name: string; email: string; phone: string | null; isPrimary: boolean; createdAt: Date; updatedAt: Date };
export type ProjectRecord = { id: number; clientId: number; title: string; status: "discovery" | "in_progress" | "client_review" | "complete"; deadline: Date | null; assignedTo: string | null; pricingMode?: "package" | "personal"; basePricePaise?: number | null; finalPricePaise?: number | null; createdAt: Date; updatedAt: Date };
export type DeliverableRecord = { id: number; projectId: number; title: string; status: "planned" | "in_progress" | "client_review" | "complete"; assignedTo: string | null; dueAt: Date | null; createdAt: Date; updatedAt: Date };
export type ChecklistItemRecord = { id: number; projectId: number; stage: ProjectRecord["status"]; title: string; required: boolean; done: boolean; doneAt: Date | null; doneBy: string | null; createdAt: Date; updatedAt: Date };
export type DocumentRecord = { id: number; clientId: number; projectId: number | null; documentType: "contract" | "nda" | "sow"; title: string; status: "draft" | "sent" | "awaiting_signature" | "signed" | "declined"; signatureRequestedAt: Date | null; signedAt: Date | null; signatureReference: string | null; createdAt: Date; updatedAt: Date };
export type InvoiceRecord = { id: number; clientId: number; projectId: number | null; invoiceNumber: string; status: "draft" | "issued" | "paid" | "overdue" | "void"; issuedAt: Date | null; dueAt: Date; paidAt: Date | null; subtotalPaise: number; gstPaise: number; totalPaise: number; createdAt: Date; updatedAt: Date };
export type InvoiceItemRecord = { id: number; invoiceId: number; description: string; quantity: number; unitAmountPaise: number; totalAmountPaise: number; createdAt: Date; updatedAt: Date };
export type StoredFileRecord = { id: number; clientId: number; documentId: number | null; invoiceId: number | null; fileKind: "document_source" | "signed_document" | "invoice_pdf"; filename: string; contentType: string; storageKey: string; storageUrl: string; createdAt: Date; updatedAt: Date };
export type NotificationRecord = { id: number; recipientUserId?: string | null; clientId?: number | null; recipientRole: "admin" | "client"; notificationType: "public_inquiry" | "onboarding_complete" | "legal_accepted" | "invoice_paid" | "invoice_issued" | "document_ready" | "document_signed"; title: string; message: string; readAt: Date | null; createdAt: Date; updatedAt: Date };
export type LegalAcceptanceRecord = { id: number; clientId: number; clientContactId: number; policyType: RequiredPolicyType; documentVersion: string; acceptedByName: string; acceptedByEmail: string; acceptedAt: Date; createdAt: Date; updatedAt: Date };
export type OnboardingSubmissionRecord = { id: number; clientId: number; serviceTier: OnboardingInput["serviceTier"]; stage: "complete"; createdAt: Date; updatedAt: Date };

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

export function hasAcceptedAllRequiredPolicies(policyTypes: readonly string[]) {
  const accepted = new Set(policyTypes);
  return REQUIRED_POLICY_TYPES.every((policy) => accepted.has(policy));
}

/**
 * Log invoice records that are missing required fields. Helps identify the
 * origin of malformed records without cluttering logs with repeated warnings.
 */
function logMalformedInvoices(invoices: InvoiceRecord[]) {
  const malformed = invoices.filter((invoice) => !invoice.invoiceNumber || !Number.isFinite(invoice.totalPaise));
  malformed.forEach((invoice) => {
    const issues: string[] = [];
    if (!invoice.invoiceNumber) issues.push("missing invoiceNumber");
    if (!Number.isFinite(invoice.totalPaise)) issues.push("totalPaise is not finite");
    console.warn(`[Invoice ${invoice.id}] Record needs attention: ${issues.join(", ")} — client ${invoice.clientId}, created ${invoice.createdAt}`);
  });
}

export async function listClients() { return listRecords<ClientRecord>("clients"); }
export async function listPublicInquiries() { return listRecords<PublicInquiryRecord>("publicInquiries"); }
export async function getClient(id: number) { return getRecord<ClientRecord>("clients", id); }
export async function getProject(id: number) { return getRecord<ProjectRecord>("projects", id); }
export async function listProjects() { return listRecords<ProjectRecord>("projects"); }
export async function listInvoices() {
  const invoices = await listRecords<InvoiceRecord>("invoices");
  logMalformedInvoices(invoices);
  return invoices;
}
export async function listDocuments() { return listRecords<DocumentRecord>("documents"); }
export async function listDeliverables() { return listRecords<DeliverableRecord>("deliverables"); }
export async function listNotifications() { return listRecords<NotificationRecord>("notifications"); }
export async function getInvoice(id: number) { return getRecord<InvoiceRecord>("invoices", id); }
export async function getDocument(id: number) { return getRecord<DocumentRecord>("documents", id); }

export async function createCompletedOnboarding(input: OnboardingInput) {
  if (!hasAcceptedAllRequiredPolicies(input.acceptedPolicies)) throw new Error("All required policy documents must be accepted before onboarding can complete");
  const normalizedEmail = input.email.trim().toLowerCase();
  const client = await addRecord("clients", { publicId: nanoid(14), companyName: input.companyName.trim(), status: "lead" as const });
  const contact = await addRecord("clientContacts", { clientId: client.id, name: input.name.trim(), email: normalizedEmail, phone: input.phone?.trim() || null, isPrimary: true });
  const onboardingPublicId = nanoid(14);
  await addRecord("onboardingSubmissions", { publicId: onboardingPublicId, clientId: client.id, clientContactId: contact.id, serviceType: input.serviceType, serviceTier: input.serviceTier, selectedAddons: input.selectedAddons ?? [], preferredTimeline: input.preferredTimeline?.trim() || null, projectBrief: input.projectBrief.trim(), deliverables: input.deliverables?.trim() || null, stage: "complete", completedAt: new Date() });
  await Promise.all(input.acceptedPolicies.map((policyType) => addRecord("legalAcceptances", { clientId: client.id, clientContactId: contact.id, policyType, documentVersion: "draft-v1", acceptedByName: input.name.trim(), acceptedByEmail: normalizedEmail, acceptedAt: new Date() })));
  const project = await addRecord("projects", onboardingProjectDraft({ clientId: client.id, companyName: input.companyName, serviceTier: input.serviceTier }));
  await ensureProjectChecklist(project.id);
  return { client, contact, project, onboardingPublicId };
}

export async function createPublicInquiry(input: Pick<PublicInquiryRecord, "name" | "companyName" | "email" | "request">) {
  return addRecord("publicInquiries", {
    name: input.name.trim(),
    companyName: input.companyName.trim(),
    email: input.email.trim().toLowerCase(),
    request: input.request.trim(),
    status: "new" as const,
  });
}

export async function getClientContactForUser(userId: string) {
  return findOne<ClientContactRecord>("clientContacts", (contact) => contact.userId === userId);
}

export async function bindEligibleClientUser({ userId, email }: { userId: string; email?: string | null }) {
  if (!email) throw new Error("A matching client email is required for client portal access");
  const normalizedEmail = email.trim().toLowerCase();
  const contact = await findOne<ClientContactRecord>("clientContacts", (entry) => entry.email.toLowerCase() === normalizedEmail);
  if (!contact) throw new Error("No client onboarding record matches this account email");
  const acceptances = await getLegalAcceptancesForContact(contact.id);
  if (!hasAcceptedAllRequiredPolicies(acceptances.map((acceptance) => acceptance.policyType))) throw new Error("Required legal documents must be accepted before client portal activation");
  await updateRecord<ClientContactRecord>("clientContacts", contact.id, { userId });
  return { clientId: contact.clientId, contactId: contact.id };
}

export async function getLegalAcceptancesForContact(contactId: number) {
  return filterRecords<LegalAcceptanceRecord>("legalAcceptances", (acceptance) => acceptance.clientContactId === contactId);
}

export async function createNotification(input: Omit<NotificationRecord, "id" | "readAt" | "createdAt" | "updatedAt">) {
  return addRecord("notifications", { ...input, readAt: null });
}

export async function createProject(input: Omit<ProjectRecord, "id" | "createdAt" | "updatedAt">) { return addRecord("projects", input); }
export async function createDeliverable(input: Omit<DeliverableRecord, "id" | "createdAt" | "updatedAt">) { return addRecord("deliverables", input); }
export async function createDocument(input: Omit<DocumentRecord, "id" | "createdAt" | "updatedAt">) { return addRecord("documents", input); }
export async function createInvoice(input: Omit<InvoiceRecord, "id" | "createdAt" | "updatedAt">) { return addRecord("invoices", input); }
export async function createInvoiceItem(input: Omit<InvoiceItemRecord, "id" | "createdAt" | "updatedAt">) { return addRecord("invoiceItems", input); }
export async function createStoredFile(input: Omit<StoredFileRecord, "id" | "createdAt" | "updatedAt">) { return addRecord("storedFiles", input); }
export async function getStoredFile(id: number) { return getRecord<StoredFileRecord>("storedFiles", id); }
export async function updateClient(id: number, values: Partial<ClientRecord>) { return updateRecord<ClientRecord>("clients", id, values); }
export async function updateProject(id: number, values: Partial<ProjectRecord>) { return updateRecord<ProjectRecord>("projects", id, values); }
export async function updateDocument(id: number, values: Partial<DocumentRecord>) { return updateRecord<DocumentRecord>("documents", id, values); }
export async function updateInvoice(id: number, values: Partial<InvoiceRecord>) { return updateRecord<InvoiceRecord>("invoices", id, values); }
export async function getClientFiles(clientId: number) { return filterRecords<StoredFileRecord>("storedFiles", (file) => file.clientId === clientId); }
export async function getClientProjects(clientId: number) { return filterRecords<ProjectRecord>("projects", (project) => project.clientId === clientId); }
export async function ensureOnboardingProject(clientId: number) {
  const existing = await getClientProjects(clientId);
  if (existing.length) return existing[0]!;
  const [client, submissions] = await Promise.all([
    getClient(clientId),
    filterRecords<OnboardingSubmissionRecord>("onboardingSubmissions", (submission) => submission.clientId === clientId && submission.stage === "complete"),
  ]);
  const newest = submissions.sort((a, b) => recordTime(b.createdAt) - recordTime(a.createdAt))[0];
  if (!client || !newest) return null;
  return addRecord("projects", onboardingProjectDraft({ clientId, companyName: client.companyName, serviceTier: newest.serviceTier }));
}
export async function getClientInvoices(clientId: number) {
  const invoices = await filterRecords<InvoiceRecord>("invoices", (invoice) => invoice.clientId === clientId);
  logMalformedInvoices(invoices);
  return invoices;
}
export async function getClientDocuments(clientId: number) { return filterRecords<DocumentRecord>("documents", (document) => document.clientId === clientId); }
export async function getDeliverablesForProject(projectId: number) { return filterRecords<DeliverableRecord>("deliverables", (deliverable) => deliverable.projectId === projectId); }
export async function getChecklistForProject(projectId: number) { return filterRecords<ChecklistItemRecord>("checklistItems", (item) => item.projectId === projectId); }
export async function updateChecklistItem(id: number, values: Partial<ChecklistItemRecord>) { return updateRecord<ChecklistItemRecord>("checklistItems", id, values); }
export async function createChecklistItem(input: Omit<ChecklistItemRecord, "id" | "createdAt" | "updatedAt">) { return addRecord("checklistItems", input); }

/**
 * Writes the standing SOP onto a project. Called when a project is created and
 * again lazily on first read, so projects that predate the checklist pick it up
 * without a migration — the same approach ensureOnboardingProject takes.
 */
export async function ensureProjectChecklist(projectId: number) {
  const existing = await getChecklistForProject(projectId);
  if (existing.length) return existing;
  const created = await Promise.all(sopTemplate().map((item) => addRecord("checklistItems", { projectId, stage: item.stage, title: item.title, required: item.required, done: false, doneAt: null, doneBy: null })));
  return created as ChecklistItemRecord[];
}
