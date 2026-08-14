import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc.js";
import { getEligibleClientScope } from "../clientScope.js";
import { createNotification, getClientInvoices, getInvoice, updateClient, updateInvoice } from "../firebaseAgencyDb.js";
import { createRazorpayOrder, razorpayConfigured, razorpayKeyId } from "../razorpay.js";

/**
 * Client-initiated payment for an invoice the client actually owns.
 *
 * This creates the Razorpay order only. Marking the invoice paid is never done
 * here, because the browser is not a trustworthy source of "payment
 * succeeded" — that transition belongs to the signed webhook in
 * api/razorpay-webhook.ts.
 */
export const paymentsRouter = router({
  status: protectedProcedure.query(() => ({ configured: razorpayConfigured(), keyId: razorpayKeyId() })),

  checkout: protectedProcedure.input(z.object({ invoiceId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    if (!razorpayConfigured()) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Online payment is not enabled for this deployment yet" });
    }

    const contact = await getEligibleClientScope(ctx.user);

    const invoice = await getInvoice(input.invoiceId);
    // Ownership is re-derived from the caller's own client scope; the invoice
    // id in the request never widens what they can reach.
    const owned = invoice && (await getClientInvoices(contact.clientId)).some((entry) => entry.id === invoice.id);
    if (!invoice || !owned) throw new TRPCError({ code: "FORBIDDEN", message: "That invoice does not belong to this account" });

    if (invoice.status === "paid") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This invoice is already paid" });
    if (invoice.status === "void") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This invoice has been cancelled" });

    const order = await createRazorpayOrder({ amountPaise: invoice.totalPaise, receipt: invoice.invoiceNumber, invoiceId: invoice.id });
    return { orderId: order.id, amountPaise: invoice.totalPaise, currency: "INR", keyId: razorpayKeyId(), invoiceNumber: invoice.invoiceNumber };
  }),
});

/**
 * Applies a verified `payment.captured` event. Called only after the webhook
 * handler has checked the signature.
 *
 * Idempotent: Razorpay retries a webhook until it gets a 2xx, so the same
 * capture arrives more than once and must not double-notify or re-promote.
 */
export async function applyCapturedPayment(invoiceId: number) {
  const invoice = await getInvoice(invoiceId);
  if (!invoice) return { applied: false, reason: "unknown-invoice" as const };
  if (invoice.status === "paid") return { applied: false, reason: "already-paid" as const };

  await updateInvoice(invoice.id, { status: "paid", paidAt: new Date() });
  await updateClient(invoice.clientId, { status: "active" });
  await createNotification({
    recipientRole: "admin",
    notificationType: "invoice_paid",
    title: "Invoice paid online",
    message: `Invoice ${invoice.invoiceNumber} was paid through Razorpay.`,
    clientId: invoice.clientId,
  });
  return { applied: true, invoiceNumber: invoice.invoiceNumber, clientId: invoice.clientId };
}
