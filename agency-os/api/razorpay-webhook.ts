import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCapturedPayment } from "../server/routers/payments.js";
import { invoiceIdFromNotes, verifyWebhookSignature } from "../server/razorpay.js";

// Razorpay signs the raw bytes, so the body must not be parsed before the
// signature is checked — a re-serialized object will not produce the same HMAC.
export const config = { api: { bodyParser: false } };

function readRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

export default async function razorpayWebhook(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const rawBody = await readRawBody(req);
  const signature = req.headers["x-razorpay-signature"];

  if (!verifyWebhookSignature(rawBody, Array.isArray(signature) ? signature[0] : signature)) {
    // Anything unsigned or mis-signed is refused outright. Nothing about the
    // payload is inspected before this point.
    console.warn("[Razorpay] rejected a webhook with an invalid signature");
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  let event: { event?: string; payload?: { payment?: { entity?: { notes?: unknown } } } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    res.status(400).json({ error: "Malformed payload" });
    return;
  }

  if (event.event !== "payment.captured") {
    // Acknowledged so Razorpay stops retrying an event this endpoint does not
    // act on.
    res.status(200).json({ ignored: event.event ?? null });
    return;
  }

  const invoiceId = invoiceIdFromNotes(event.payload?.payment?.entity?.notes);
  if (!invoiceId) {
    console.warn("[Razorpay] payment.captured carried no brandMintInvoiceId");
    res.status(200).json({ ignored: "no-invoice-reference" });
    return;
  }

  try {
    const result = await applyCapturedPayment(invoiceId);
    res.status(200).json(result);
  } catch (error) {
    // A 5xx makes Razorpay retry, which is what should happen if the write
    // failed for a transient reason.
    console.error("[Razorpay] failed to apply a captured payment", error);
    res.status(500).json({ error: "Could not record the payment" });
  }
}
