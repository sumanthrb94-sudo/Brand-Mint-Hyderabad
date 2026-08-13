import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { documents, invoices, storedFiles } from "../../drizzle/schema";
import { getClientContactForUser } from "../agencyDb";
import { getDb } from "../db";
import { storagePut } from "../storage";
import { protectedProcedure, router } from "../_core/trpc";
import { adminProcedure } from "./access";

const fileKind = z.enum(["document_source", "signed_document", "invoice_pdf"]);

export const filesRouter = router({
  upload: adminProcedure.input(z.object({
    clientId: z.number().int().positive(),
    documentId: z.number().int().positive().nullable().optional(),
    invoiceId: z.number().int().positive().nullable().optional(),
    fileKind,
    filename: z.string().trim().min(1).max(512),
    contentType: z.enum(["application/pdf"]),
    base64Data: z.string().min(1).max(16_000_000),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database is unavailable");
    if (input.documentId) {
      const document = (await db.select().from(documents).where(and(eq(documents.id, input.documentId), eq(documents.clientId, input.clientId))).limit(1))[0];
      if (!document) throw new Error("Document does not belong to this client");
    }
    if (input.invoiceId) {
      const invoice = (await db.select().from(invoices).where(and(eq(invoices.id, input.invoiceId), eq(invoices.clientId, input.clientId))).limit(1))[0];
      if (!invoice) throw new Error("Invoice does not belong to this client");
    }
    const buffer = Buffer.from(input.base64Data, "base64");
    const upload = await storagePut(`brand-mint/client-files/${input.clientId}/${input.filename}`, buffer, input.contentType);
    await db.insert(storedFiles).values({ clientId: input.clientId, documentId: input.documentId ?? null, invoiceId: input.invoiceId ?? null, fileKind: input.fileKind, filename: input.filename, contentType: input.contentType, storageKey: upload.key, storageUrl: upload.url });
    return { success: true, url: upload.url };
  }),
  download: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database is unavailable");
    const file = (await db.select().from(storedFiles).where(eq(storedFiles.id, input.id)).limit(1))[0];
    if (!file) throw new Error("File not found");
    if (ctx.user.role !== "admin") {
      const contact = await getClientContactForUser(ctx.user.id);
      if (!contact || contact.clientId !== file.clientId) throw new Error("You do not have access to this file");
    }
    return { filename: file.filename, url: file.storageUrl };
  }),
});
