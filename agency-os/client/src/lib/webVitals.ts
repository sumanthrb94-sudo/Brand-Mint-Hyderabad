/**
 * Field performance, measured on real visits.
 *
 * A one-off Lighthouse run on a fast laptop tells you what the site *can* do.
 * This tells you what it actually did for the person who bounced. Both matter;
 * only this one is a fact about your customers.
 *
 * No dependency: the three metrics that count are available from
 * PerformanceObserver directly, and pulling in a library to read them would
 * itself cost a request on the page we are trying to keep fast.
 *
 * Thresholds are Google's own "good" boundaries — LCP 2.5s, CLS 0.1, INP 200ms.
 */

import { CONVERSIONS, track } from "./analytics";

type Metric = { name: "LCP" | "CLS" | "INP"; value: number; rating: string };

const GOOD = { LCP: 2500, CLS: 0.1, INP: 200 } as const;
const POOR = { LCP: 4000, CLS: 0.25, INP: 500 } as const;

const rate = (n: Metric["name"], v: number) =>
  v <= GOOD[n] ? "good" : v <= POOR[n] ? "needs-improvement" : "poor";

function report({ name, value, rating }: Metric) {
  track(CONVERSIONS.web_vitals, {
    metric: name,
    // GA4 sums and averages integers far more usefully than floats; CLS is
    // scaled so a value of 0.083 does not round away to nothing.
    value: Math.round(name === "CLS" ? value * 1000 : value),
    rating,
    path: location.pathname,
  });
}

function observe(type: string, cb: (entries: PerformanceEntryList) => void) {
  try {
    const po = new PerformanceObserver(list => cb(list.getEntries()));
    po.observe({ type, buffered: true } as PerformanceObserverInit);
    return po;
  } catch {
    return null;                       // unsupported browser: measure nothing
  }
}

export function initWebVitals(): void {
  if (typeof PerformanceObserver === "undefined") return;

  // LCP — keep the last candidate; it is only final once the page is hidden.
  let lcp = 0;
  observe("largest-contentful-paint", entries => {
    const last = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
    if (last) lcp = last.startTime;
  });

  // CLS — the largest burst of consecutive shifts, which is the scored value.
  let cls = 0, burst = 0, first = 0, prev = 0;
  observe("layout-shift", entries => {
    for (const e of entries as unknown as Array<PerformanceEntry & { value: number; hadRecentInput: boolean }>) {
      if (e.hadRecentInput) continue;
      if (burst && (e.startTime - prev > 1000 || e.startTime - first > 5000)) {
        cls = Math.max(cls, burst);
        burst = 0;
      }
      if (!burst) first = e.startTime;
      prev = e.startTime;
      burst += e.value;
    }
    cls = Math.max(cls, burst);
  });

  // INP — worst interaction latency the visitor actually felt.
  let inp = 0;
  observe("event", entries => {
    for (const e of entries as unknown as Array<PerformanceEntry & { duration: number; interactionId?: number }>) {
      if (e.interactionId && e.duration > inp) inp = e.duration;
    }
  });

  // Report once, when the page is being put away. `visibilitychange` fires on
  // mobile backgrounding where `unload` does not.
  let sent = false;
  const flush = () => {
    if (sent || document.visibilityState !== "hidden") return;
    sent = true;
    if (lcp) report({ name: "LCP", value: lcp, rating: rate("LCP", lcp) });
    if (cls) report({ name: "CLS", value: cls, rating: rate("CLS", cls) });
    if (inp) report({ name: "INP", value: inp, rating: rate("INP", inp) });
  };
  addEventListener("visibilitychange", flush);
  addEventListener("pagehide", flush);
}
