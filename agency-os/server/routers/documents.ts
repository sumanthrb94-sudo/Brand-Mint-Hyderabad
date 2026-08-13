import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { documents } from "../../drizzle/schema";
import { createNotification } from "../agencyDb";
import { getDb } from "../db";
import { router } from "../_core/trpc";
import { adminProcedure } from "./access";

const documentStatus = z.enum(["draft", "sent", "awaiting_signature", "signed", "declined"]);

export const documentsRouter = router({
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database is unavailable");
    return db.select().from(documents).orderBy(desc(documents.updatedAt));
  }),
  create: adminProcedure.input(z.object({
    clientId: z.number().int().positive(),
    projectId: z.number().int().positive().nullable().optional(),
    title: z.string().trim().min(1).max(256),
    documentType: z.enum(["contract", "nda", "sow"]),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database is unavailable");
    await db.insert(documents).values({ clientId: input.clientId, projectId: input.projectId ?? null, title: input.title, documentType: input.documentType });
    return { success: true };
  }),
  setStatus: adminProcedure.input(z.object({
    id: z.number().int().positive(),
    clientId: z.number().int().positive(),
    status: documentStatus,
    signatureReference: z.string().trim().max(256).optional(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database is unavailable");
    const now = new Date();
    await db.update(documents).set({
      status: input.status,
      signatureReference: input.signatureReference || null,
      signatureRequestedAt: input.status === "sent" || input.status === "awaiting_signature" ? now : undefined,
      signedAt: input.status === "signed" ? now : undefined,
    }).where(eq(documents.id, input.id));
    if (input.status === "awaiting_signature") {
      await createNotification({ recipientRole: "client", notificationType: "document_ready", title: "Document ready for action", message: "A document is ready for your review and signature.", clientId: input.clientId });
    }
    if (input.status === "signed") {
      await createNotification({ recipientRole: "admin", notificationType: "document_signed", title: "Document signed", message: "A document signature status has been marked as signed.", clientId: input.clientId });
    }
    return { success: true };
  }),
});
