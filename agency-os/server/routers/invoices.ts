import { nanoid } from "nanoid";
import { z } from "zod";
import { router } from "../_core/trpc.js";
import { createInvoice, createInvoiceItem, createNotification, createStoredFile, getClient, updateClient, updateInvoice } from "../firebaseAgencyDb.js";
import { generateInvoicePdf } from "../invoicePdf.js";
import { calculateInvoiceTotals } from "../invoiceTotals.js";
import { storeFile } from "../firebaseRepository.js";
import { adminProcedure } from "./access.js";

const itemSchema = z.object({ description: z.string().trim().min(1).max(512), quantity: z.number().int().positive(), unitAmountPaise: z.number().int().nonnegative() });

export const invoicesRouter = router({
  create: adminProcedure.input(z.object({ clientId: z.number().int().positive(), projectId: z.number().int().positive().nullable().optional(), dueAt: z.number().int().positive(), gstPercent: z.number().min(0).max(100).default(0), items: z.array(itemSchema).min(1).max(100) })).mutation(async ({ input }) => {
    const client = await getClient(input.clientId);
    if (!client) throw new Error("Client not found");
    const preparedItems = input.items.map((item) => ({ ...item, totalAmountPaise: item.quantity * item.unitAmountPaise }));
    const { subtotalPaise, gstPaise, totalPaise } = calculateInvoiceTotals(input.items, input.gstPercent);
    const invoiceNumber = `BM-${new Date().getFullYear()}-${nanoid(8).toUpperCase()}`;
    const invoice = await createInvoice({ clientId: input.clientId, projectId: input.projectId ?? null, invoiceNumber, status: "issued", issuedAt: new Date(), dueAt: new Date(input.dueAt), paidAt: null, subtotalPaise, gstPaise, totalPaise });
    await Promise.all(preparedItems.map((item) => createInvoiceItem({ ...item, invoiceId: invoice.id })));
    const pdf = await generateInvoicePdf({ invoiceNumber, companyName: client.companyName, issueDate: invoice.issuedAt ?? new Date(), dueDate: invoice.dueAt, items: preparedItems, subtotalPaise, gstPaise, totalPaise });
    const upload = await storeFile(`brand-mint/invoices/${invoiceNumber}.pdf`, Buffer.from(pdf), "application/pdf");
    await createStoredFile({ clientId: input.clientId, documentId: null, invoiceId: invoice.id, fileKind: "invoice_pdf", filename: `${invoiceNumber}.pdf`, contentType: "application/pdf", storageKey: upload.key, storageUrl: upload.url });
    await createNotification({ recipientRole: "client", notificationType: "invoice_issued", title: "New invoice available", message: `Invoice ${invoiceNumber} is ready for your review.`, clientId: input.clientId });
    return { success: true, invoiceId: invoice.id, invoiceNumber, pdfUrl: upload.url };
  }),
  setPaymentStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), clientId: z.number().int().positive(), status: z.enum(["issued", "paid", "overdue", "void"]) })).mutation(async ({ input }) => {
    await updateInvoice(input.id, { status: input.status, paidAt: input.status === "paid" ? new Date() : null });
    if (input.status === "paid") {
      // Onboarding writes every client as a "lead" and nothing else ever moved
      // them on, so the CEO's "Active clients" tile was pinned at zero however
      // much work was in flight. A paid invoice is the point the relationship
      // is real, so it is what promotes the record.
      await updateClient(input.clientId, { status: "active" });
      await createNotification({ recipientRole: "admin", notificationType: "invoice_paid", title: "Invoice payment marked paid", message: "An invoice payment status was marked as paid.", clientId: input.clientId });
    }
    return { success: true };
  }),
});
