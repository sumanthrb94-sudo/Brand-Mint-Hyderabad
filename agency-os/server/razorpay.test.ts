import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { invoiceIdFromNotes, razorpayConfigured, verifyWebhookSignature } from "./razorpay";

const SECRET = "whsec_test_value";
const sign = (body: string, secret = SECRET) => createHmac("sha256", secret).update(body, "utf8").digest("hex");

const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { notes: { brandMintInvoiceId: "1786720000123" } } } } });

afterEach(() => {
  delete process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_SECRET;
});

describe("webhook signature verification", () => {
  it("accepts a body signed with the configured secret", () => {
    expect(verifyWebhookSignature(body, sign(body), SECRET)).toBe(true);
  });

  it("refuses a body that was altered after signing", () => {
    const tampered = body.replace("1786720000123", "1786720000999");
    expect(verifyWebhookSignature(tampered, sign(body), SECRET)).toBe(false);
  });

  it("refuses a signature produced with a different secret", () => {
    expect(verifyWebhookSignature(body, sign(body, "whsec_attacker"), SECRET)).toBe(false);
  });

  it("refuses a missing signature, a missing secret, and a truncated signature", () => {
    expect(verifyWebhookSignature(body, undefined, SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, sign(body), undefined)).toBe(false);
    expect(verifyWebhookSignature(body, "", SECRET)).toBe(false);
    // A length mismatch must return false rather than throwing out of
    // timingSafeEqual.
    expect(verifyWebhookSignature(body, sign(body).slice(0, 32), SECRET)).toBe(false);
  });

  it("is sensitive to whitespace, so a re-serialized body cannot pass", () => {
    const reserialized = JSON.stringify(JSON.parse(body), null, 2);
    expect(verifyWebhookSignature(reserialized, sign(body), SECRET)).toBe(false);
  });
});

describe("invoice reference in order notes", () => {
  it("reads the invoice id whether it arrives as a string or a number", () => {
    expect(invoiceIdFromNotes({ brandMintInvoiceId: "42" })).toBe(42);
    expect(invoiceIdFromNotes({ brandMintInvoiceId: 42 })).toBe(42);
  });

  it("rejects anything that is not a positive integer id", () => {
    for (const notes of [null, undefined, "42", {}, { brandMintInvoiceId: "" }, { brandMintInvoiceId: "abc" }, { brandMintInvoiceId: -1 }, { brandMintInvoiceId: 0 }, { brandMintInvoiceId: 1.5 }]) {
      expect(invoiceIdFromNotes(notes)).toBeNull();
    }
  });
});

describe("configuration gate", () => {
  it("reports unconfigured until both key halves are present", () => {
    expect(razorpayConfigured()).toBe(false);
    process.env.RAZORPAY_KEY_ID = "rzp_test_abc";
    expect(razorpayConfigured()).toBe(false);
    process.env.RAZORPAY_KEY_SECRET = "secret";
    expect(razorpayConfigured()).toBe(true);
  });

  it("treats a blank value as unconfigured", () => {
    process.env.RAZORPAY_KEY_ID = "   ";
    process.env.RAZORPAY_KEY_SECRET = "secret";
    expect(razorpayConfigured()).toBe(false);
  });
});
