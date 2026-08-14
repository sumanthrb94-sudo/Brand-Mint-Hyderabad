import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Razorpay order creation and webhook verification.
 *
 * Everything here is inert until RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET and
 * RAZORPAY_WEBHOOK_SECRET are set in the environment. No key, no checkout —
 * the procedures refuse rather than pretending to collect. Amounts are passed
 * through in paise, which is also Razorpay's unit, so nothing is rescaled.
 */

const RAZORPAY_ORDERS_URL = "https://api.razorpay.com/v1/orders";

export type RazorpayOrder = { id: string; amount: number; currency: string; receipt: string; status: string };

export function razorpayKeyId() {
  return process.env.RAZORPAY_KEY_ID?.trim() || null;
}

export function razorpayConfigured() {
  return Boolean(razorpayKeyId() && process.env.RAZORPAY_KEY_SECRET?.trim());
}

/**
 * Constant-time comparison of the webhook HMAC.
 *
 * Razorpay signs the raw request body with the webhook secret, so the body has
 * to be verified exactly as received — a re-serialized JSON object will not
 * match. Returns false rather than throwing on every failure mode, so a caller
 * can treat "unverified" as one branch.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | undefined, secret = process.env.RAZORPAY_WEBHOOK_SECRET) {
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(signature, "utf8");
  // timingSafeEqual throws on a length mismatch, which would itself leak the
  // expected length, so the lengths are compared first.
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

/**
 * The invoice a payment belongs to travels in the order notes, so a webhook
 * arriving later can be reconciled without trusting anything the browser sent.
 */
export function invoiceIdFromNotes(notes: unknown): number | null {
  if (!notes || typeof notes !== "object") return null;
  const raw = (notes as Record<string, unknown>).brandMintInvoiceId;
  const parsed = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function createRazorpayOrder(input: { amountPaise: number; receipt: string; invoiceId: number }): Promise<RazorpayOrder> {
  const keyId = razorpayKeyId();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) throw new Error("Razorpay is not configured for this deployment");

  const response = await fetch(RAZORPAY_ORDERS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt,
      notes: { brandMintInvoiceId: String(input.invoiceId) },
    }),
  });

  if (!response.ok) {
    throw new Error(`Razorpay order creation failed (${response.status})`);
  }
  return (await response.json()) as RazorpayOrder;
}
