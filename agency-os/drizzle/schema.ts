import { boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  publicId: varchar("publicId", { length: 32 }).notNull(),
  companyName: varchar("companyName", { length: 256 }).notNull(),
  status: mysqlEnum("status", ["lead", "active", "archived"]).default("lead").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("clients_public_id_unique").on(table.publicId)]);

export const clientContacts = mysqlTable("clientContacts", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => clients.id),
  userId: int("userId").references(() => users.id),
  name: varchar("name", { length: 256 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 48 }),
  isPrimary: boolean("isPrimary").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("client_contacts_client_id_idx").on(table.clientId), index("client_contacts_email_idx").on(table.email), uniqueIndex("client_contacts_user_unique").on(table.userId)]);

export const onboardingSubmissions = mysqlTable("onboardingSubmissions", {
  id: int("id").autoincrement().primaryKey(),
  publicId: varchar("publicId", { length: 32 }).notNull(),
  clientId: int("clientId").notNull().references(() => clients.id),
  clientContactId: int("clientContactId").notNull().references(() => clientContacts.id),
  serviceType: mysqlEnum("serviceType", ["website", "internal_tool", "brand_identity", "performance_media", "ecommerce"]).notNull(),
  preferredTimeline: varchar("preferredTimeline", { length: 256 }),
  projectBrief: text("projectBrief").notNull(),
  deliverables: text("deliverables"),
  stage: mysqlEnum("stage", ["legal_pending", "complete"]).default("legal_pending").notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("onboarding_public_id_unique").on(table.publicId), index("onboarding_client_id_idx").on(table.clientId)]);

export const legalAcceptances = mysqlTable("legalAcceptances", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => clients.id),
  clientContactId: int("clientContactId").notNull().references(() => clientContacts.id),
  policyType: mysqlEnum("policyType", ["terms", "privacy", "cookies", "service_agreement"]).notNull(),
  documentVersion: varchar("documentVersion", { length: 64 }).notNull(),
  acceptedByName: varchar("acceptedByName", { length: 256 }).notNull(),
  acceptedByEmail: varchar("acceptedByEmail", { length: 320 }).notNull(),
  acceptedAt: timestamp("acceptedAt").defaultNow().notNull(),
}, (table) => [index("legal_acceptances_contact_idx").on(table.clientContactId), index("legal_acceptances_client_idx").on(table.clientId)]);

export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => clients.id),
  title: varchar("title", { length: 256 }).notNull(),
  status: mysqlEnum("status", ["discovery", "in_progress", "client_review", "complete"]).default("discovery").notNull(),
  deadline: timestamp("deadline"),
  assignedTo: varchar("assignedTo", { length: 256 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("projects_client_id_idx").on(table.clientId), index("projects_status_idx").on(table.status)]);

export const deliverables = mysqlTable("deliverables", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id),
  title: varchar("title", { length: 256 }).notNull(),
  assignedTo: varchar("assignedTo", { length: 256 }),
  status: mysqlEnum("status", ["planned", "in_progress", "client_review", "complete"]).default("planned").notNull(),
  dueAt: timestamp("dueAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("deliverables_project_id_idx").on(table.projectId)]);

export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => clients.id),
  projectId: int("projectId").references(() => projects.id),
  documentType: mysqlEnum("documentType", ["contract", "nda", "sow"]).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  status: mysqlEnum("status", ["draft", "sent", "awaiting_signature", "signed", "declined"]).default("draft").notNull(),
  signatureRequestedAt: timestamp("signatureRequestedAt"),
  signedAt: timestamp("signedAt"),
  signatureReference: varchar("signatureReference", { length: 256 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("documents_client_id_idx").on(table.clientId), index("documents_project_id_idx").on(table.projectId)]);

export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => clients.id),
  projectId: int("projectId").references(() => projects.id),
  invoiceNumber: varchar("invoiceNumber", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["draft", "issued", "paid", "overdue", "void"]).default("draft").notNull(),
  issuedAt: timestamp("issuedAt"),
  dueAt: timestamp("dueAt").notNull(),
  paidAt: timestamp("paidAt"),
  subtotalPaise: int("subtotalPaise").default(0).notNull(),
  gstPaise: int("gstPaise").default(0).notNull(),
  totalPaise: int("totalPaise").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("invoices_number_unique").on(table.invoiceNumber), index("invoices_client_id_idx").on(table.clientId), index("invoices_status_idx").on(table.status)]);

export const invoiceItems = mysqlTable("invoiceItems", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").notNull().references(() => invoices.id),
  description: varchar("description", { length: 512 }).notNull(),
  quantity: int("quantity").notNull(),
  unitAmountPaise: int("unitAmountPaise").notNull(),
  totalAmountPaise: int("totalAmountPaise").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("invoice_items_invoice_id_idx").on(table.invoiceId)]);

export const storedFiles = mysqlTable("storedFiles", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => clients.id),
  documentId: int("documentId").references(() => documents.id),
  invoiceId: int("invoiceId").references(() => invoices.id),
  fileKind: mysqlEnum("fileKind", ["document_source", "signed_document", "invoice_pdf"]).notNull(),
  filename: varchar("filename", { length: 512 }).notNull(),
  contentType: varchar("contentType", { length: 128 }).notNull(),
  storageKey: varchar("storageKey", { length: 1024 }).notNull(),
  storageUrl: varchar("storageUrl", { length: 1200 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("stored_files_client_id_idx").on(table.clientId), index("stored_files_document_id_idx").on(table.documentId), index("stored_files_invoice_id_idx").on(table.invoiceId)]);

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  recipientUserId: int("recipientUserId").references(() => users.id),
  clientId: int("clientId").references(() => clients.id),
  recipientRole: mysqlEnum("recipientRole", ["admin", "client"]).notNull(),
  notificationType: mysqlEnum("notificationType", ["onboarding_complete", "legal_accepted", "invoice_paid", "invoice_issued", "document_ready", "document_signed"]).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  message: text("message").notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("notifications_recipient_idx").on(table.recipientUserId), index("notifications_client_id_idx").on(table.clientId)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type ClientContact = typeof clientContacts.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Document = typeof documents.$inferSelect;
