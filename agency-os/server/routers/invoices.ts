import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { clients, invoiceItems, invoices, storedFiles } from "../../drizzle/schema";
import { createNotification } from "../agencyDb";
import { getDb } from "../db";
import { generateInvoicePdf } from "../invoicePdf";
import { calculateInvoiceTotals } from "../invoiceTotals";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { router } from "../_core/trpc";
import { adminProcedure } from "./access";

const itemSchema = z.object({ description: z.string().trim().min(1).max(512), quantity: z.number().int().positive(), unitAmountPaise: z.number().int().nonnegative() });

export const invoicesRouter = router({
  create: adminProcedure.input(z.object({
    clientId: z.number().int().positive(),
    projectId: z.number().int().positive().nullable().optional(),
    dueAt: z.number().int().positive(),
    gstPercent: z.number().min(0).max(100).default(0),
    items: z.array(itemSchema).min(1).max(100),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database is unavailable");
    const client = (await db.select().from(clients).where(eq(clients.id, input.clientId)).limit(1))[0];
    if (!client) throw new Error("Client not found");
    const preparedItems = input.items.map((item) => ({ ...item, totalAmountPaise: item.quantity * item.unitAmountPaise }));
    const { subtotalPaise, gstPaise, totalPaise } = calculateInvoiceTotals(input.items, input.gstPercent);
    const invoiceNumber = `BM-${new Date().getFullYear()}-${nanoid(8).toUpperCase()}`;
    await db.insert(invoices).values({ clientId: input.clientId, projectId: input.projectId ?? null, invoiceNumber, status: "issued", issuedAt: new Date(), dueAt: new Date(input.dueAt), subtotalPaise, gstPaise, totalPaise });
    const invoice = (await db.select().from(invoices).where(eq(invoices.invoiceNumber, invoiceNumber)).limit(1))[0];
    if (!invoice) throw new Error("Invoice could not be created");
    await db.insert(invoiceItems).values(preparedItems.map((item) => ({ ...item, invoiceId: invoice.id })));
    const pdf = await generateInvoicePdf({ invoiceNumber, companyName: client.companyName, issueDate: invoice.issuedAt ?? new Date(), dueDate: invoice.dueAt, items: preparedItems, subtotalPaise, gstPaise, totalPaise });
    const upload = await storagePut(`brand-mint/invoices/${invoiceNumber}.pdf`, Buffer.from(pdf), "application/pdf");
    await db.insert(storedFiles).values({ clientId: input.clientId, invoiceId: invoice.id, fileKind: "invoice_pdf", filename: `${invoiceNumber}.pdf`, contentType: "application/pdf", storageKey: upload.key, storageUrl: upload.url });
    await createNotification({ recipientRole: "client", notificationType: "invoice_issued", title: "New invoice available", message: `Invoice ${invoiceNumber} is ready for your review.`, clientId: input.clientId });
    return { success: true, invoiceId: invoice.id, invoiceNumber, pdfUrl: upload.url };
  }),
  setPaymentStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), clientId: z.number().int().positive(), status: z.enum(["issued", "paid", "overdue", "void"]) })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database is unavailable");
    await db.update(invoices).set({ status: input.status, paidAt: input.status === "paid" ? new Date() : null }).where(eq(invoices.id, input.id));
    if (input.status === "paid") {
      await createNotification({ recipientRole: "admin", notificationType: "invoice_paid", title: "Invoice payment marked paid", message: "An invoice payment status was marked as paid.", clientId: input.clientId });
      await notifyOwner({ title: "Invoice payment marked paid", content: "A Brand Mint Studios invoice was marked as paid." });
    }
    return { success: true };
  }),
});
