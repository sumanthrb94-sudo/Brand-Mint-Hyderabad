import { describe, expect, it } from "vitest";
import { calculateInvoiceTotals } from "./invoiceTotals";

describe("invoice totals", () => {
  it("calculates line-item subtotal, GST and invoice total on the server", () => {
    expect(calculateInvoiceTotals([
      { quantity: 2, unitAmountPaise: 250000 },
      { quantity: 1, unitAmountPaise: 100000 },
    ], 18)).toEqual({ subtotalPaise: 600000, gstPaise: 108000, totalPaise: 708000 });
  });
});
