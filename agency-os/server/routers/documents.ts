import { z } from "zod";
import { router } from "../_core/trpc.js";
import { createDocument, createNotification, listDocuments, updateDocument } from "../firebaseAgencyDb.js";
import { adminProcedure } from "./access.js";

const documentStatus = z.enum(["draft", "sent", "awaiting_signature", "signed", "declined"]);

export const documentsRouter = router({
  list: adminProcedure.query(async () => [...await listDocuments()].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())),
  create: adminProcedure.input(z.object({ clientId: z.number().int().positive(), projectId: z.number().int().positive().nullable().optional(), title: z.string().trim().min(1).max(256), documentType: z.enum(["contract", "nda", "sow"]) })).mutation(async ({ input }) => {
    const document = await createDocument({ clientId: input.clientId, projectId: input.projectId ?? null, title: input.title, documentType: input.documentType, status: "draft", signatureRequestedAt: null, signedAt: null, signatureReference: null });
    return { success: true, documentId: document.id };
  }),
  setStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), clientId: z.number().int().positive(), status: documentStatus, signatureReference: z.string().trim().max(256).optional() })).mutation(async ({ input }) => {
    const now = new Date();
    await updateDocument(input.id, { status: input.status, signatureReference: input.signatureReference || null, signatureRequestedAt: input.status === "sent" || input.status === "awaiting_signature" ? now : undefined, signedAt: input.status === "signed" ? now : undefined });
    if (input.status === "awaiting_signature") await createNotification({ recipientRole: "client", notificationType: "document_ready", title: "Document ready for action", message: "A document is ready for your review and signature.", clientId: input.clientId });
    if (input.status === "signed") await createNotification({ recipientRole: "admin", notificationType: "document_signed", title: "Document signed", message: "A document signature status was marked as signed.", clientId: input.clientId });
    return { success: true };
  }),
});
