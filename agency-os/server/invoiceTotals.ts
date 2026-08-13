export type InvoiceCalculationItem = { quantity: number; unitAmountPaise: number };

export function calculateInvoiceTotals(items: InvoiceCalculationItem[], gstPercent: number) {
  const subtotalPaise = items.reduce((sum, item) => sum + item.quantity * item.unitAmountPaise, 0);
  const gstPaise = Math.round(subtotalPaise * (gstPercent / 100));
  return { subtotalPaise, gstPaise, totalPaise: subtotalPaise + gstPaise };
}
