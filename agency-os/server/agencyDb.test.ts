import { describe, expect, it } from "vitest";
import { hasAcceptedAllRequiredPolicies, REQUIRED_POLICY_TYPES } from "./agencyDb";
import { generateInvoicePdf } from "./invoicePdf";

describe("required legal acceptance", () => {
  it("permits activation only after all required policy types are present", () => {
    expect(hasAcceptedAllRequiredPolicies(REQUIRED_POLICY_TYPES)).toBe(true);
    expect(hasAcceptedAllRequiredPolicies(["terms", "privacy", "cookies"])).toBe(false);
  });

  it("does not treat duplicate acceptance of one policy as complete acceptance", () => {
    expect(hasAcceptedAllRequiredPolicies(["terms", "terms", "privacy", "cookies"])).toBe(false);
  });
});

describe("invoice PDF generation", () => {
  it("creates a non-empty PDF byte stream for an itemised invoice", async () => {
    const bytes = await generateInvoicePdf({
      invoiceNumber: "BM-2026-TEST",
      companyName: "Test Client",
      issueDate: new Date("2026-08-13T00:00:00.000Z"),
      dueDate: new Date("2026-08-20T00:00:00.000Z"),
      items: [{ description: "Service", quantity: 1, unitAmountPaise: 990000, totalAmountPaise: 990000 }],
      subtotalPaise: 990000,
      gstPaise: 178200,
      totalPaise: 1168200,
    });

    expect(bytes.byteLength).toBeGreaterThan(100);
    expect(Array.from(bytes.slice(0, 4))).toEqual([37, 80, 68, 70]);
  });
});
