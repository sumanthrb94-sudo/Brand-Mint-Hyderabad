import { nanoid } from "nanoid";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc.js";
import { createStoredFile, getClientContactForUser, getDocument, getInvoice, getStoredFile } from "../firebaseAgencyDb.js";
import { getSignedFileUrl, storeFile } from "../firebaseRepository.js";
import { adminProcedure } from "./access.js";

const fileKind = z.enum(["document_source", "signed_document", "invoice_pdf"]);

export const filesRouter = router({
  upload: adminProcedure.input(z.object({ clientId: z.number().int().positive(), documentId: z.number().int().positive().nullable().optional(), invoiceId: z.number().int().positive().nullable().optional(), fileKind, filename: z.string().trim().min(1).max(512), contentType: z.literal("application/pdf"), base64Data: z.string().min(1).max(16_000_000) })).mutation(async ({ input }) => {
    if (input.documentId) {
      const document = await getDocument(input.documentId);
      if (!document || document.clientId !== input.clientId) throw new Error("Document does not belong to this client");
    }
    if (input.invoiceId) {
      const invoice = await getInvoice(input.invoiceId);
      if (!invoice || invoice.clientId !== input.clientId) throw new Error("Invoice does not belong to this client");
    }
    const safeFilename = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const upload = await storeFile(`brand-mint/client-files/${input.clientId}/${nanoid(10)}-${safeFilename}`, Buffer.from(input.base64Data, "base64"), input.contentType);
    await createStoredFile({ clientId: input.clientId, documentId: input.documentId ?? null, invoiceId: input.invoiceId ?? null, fileKind: input.fileKind, filename: input.filename, contentType: input.contentType, storageKey: upload.key, storageUrl: upload.url });
    return { success: true, url: upload.url };
  }),
  download: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const file = await getStoredFile(input.id);
    if (!file) throw new Error("File not found");
    if (ctx.user.role !== "admin") {
      const contact = await getClientContactForUser(ctx.user.id);
      if (!contact || contact.clientId !== file.clientId) throw new Error("You do not have access to this file");
    }
    return { filename: file.filename, url: await getSignedFileUrl(file.storageKey) };
  }),
});
