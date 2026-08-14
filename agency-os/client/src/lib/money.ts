/**
 * Rupee formatting that never renders NaN.
 *
 * Invoice documents written by earlier revisions can be missing totalPaise
 * entirely, and `formatRupees(undefined)` put a literal "₹NaN" on the CEO
 * dashboard. An amount that is not a finite number is not zero and must not be
 * shown as a number at all.
 */
export function formatInr(paise?: number | null, fallback = "—") {
  if (typeof paise !== "number" || !Number.isFinite(paise)) return fallback;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
}

export function isAmountPresent(paise?: number | null): paise is number {
  return typeof paise === "number" && Number.isFinite(paise);
}
