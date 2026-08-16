/**
 * A/B tests small enough to be worth having.
 *
 * No vendor, no flicker, no extra request. A visitor is assigned once, stored,
 * and the assignment is derived from a hash so the split is stable and even
 * without a server round trip. Exposure is reported to GA4 as a normal event,
 * so the analysis is a comparison of conversion rate by `variant` — which is
 * all an A/B test ever actually is.
 *
 * Honest caveat: with low traffic a result will not reach significance for a
 * long time. Run one test at a time, on the thing that matters most, and leave
 * it running for weeks rather than days. Two tests at once on this volume tells
 * you nothing about either.
 */

import { CONVERSIONS, track } from "./analytics";

const STORAGE_KEY = "bm_vid";

/** Stable per-browser id. Not a fingerprint; it is random and local. */
export function visitorId(): string {
  if (typeof localStorage === "undefined") return "anon";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = (crypto.randomUUID?.() ?? String(Math.random()).slice(2)).replace(/-/g, "");
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

/** FNV-1a — small, fast, and evenly distributed enough for a bucket split. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export const EXPERIMENTS = {
  /** Which promise the homepage hero leads with. */
  hero_cta: ["fixed_date", "see_scope"],
} as const;

export type ExperimentName = keyof typeof EXPERIMENTS;
export type VariantOf<K extends ExperimentName> = (typeof EXPERIMENTS)[K][number];

const seen = new Set<string>();

/**
 * Assign this visitor a variant and report the exposure exactly once per load.
 * Deterministic: the same visitor always sees the same variant, so the page
 * does not change under them between sessions.
 */
export function useVariant<K extends ExperimentName>(name: K): VariantOf<K> {
  const variants = EXPERIMENTS[name] as readonly string[];
  const variant = variants[hash(`${name}:${visitorId()}`) % variants.length] as VariantOf<K>;

  if (!seen.has(name)) {
    seen.add(name);
    track(CONVERSIONS.experiment_view, { experiment: name, variant });
  }
  return variant;
}
