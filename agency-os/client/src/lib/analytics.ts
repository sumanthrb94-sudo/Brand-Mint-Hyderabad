/**
 * One place that owns every third-party measurement tag and every event.
 *
 * Nothing here loads unless its ID is configured, so a deployment with no
 * environment variables ships no tags, sets no cookies, and logs no errors —
 * which is the state this site was in before, except it was accidental.
 *
 * Configure per environment (Vercel → Settings → Environment Variables):
 *
 *   VITE_GA4_ID        G-XXXXXXXXXX     Google Analytics 4
 *   VITE_CLARITY_ID    xxxxxxxxxx       Microsoft Clarity (heatmaps, free)
 *
 * Consent: Do Not Track is honoured, and GA4 Consent Mode v2 defaults to
 * ad_storage denied. That is a sane default, not legal advice — if you start
 * running ads or serving the EU, add a consent banner and call
 * `grantAdConsent()` from it.
 */

type Params = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

const GA4_ID = import.meta.env.VITE_GA4_ID as string | undefined;
const CLARITY_ID = import.meta.env.VITE_CLARITY_ID as string | undefined;

/** Respect the browser's own signal before any vendor gets loaded. */
function trackingAllowed(): boolean {
  if (typeof navigator === "undefined") return false;
  const dnt = navigator.doNotTrack ?? (window as { doNotTrack?: string }).doNotTrack;
  return dnt !== "1" && dnt !== "yes";
}

let started = false;

export function initAnalytics(): void {
  if (started || typeof window === "undefined" || !trackingAllowed()) return;
  started = true;
  if (GA4_ID) loadGa4(GA4_ID);
  if (CLARITY_ID) loadClarity(CLARITY_ID);
}

function loadGa4(id: string): void {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "granted",
  });
  window.gtag("js", new Date());
  // The SPA sends its own page_view on navigation; a second automatic one
  // would double-count every route change.
  window.gtag("config", id, { send_page_view: false });

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
}

function loadClarity(id: string): void {
  (function (c: Window, l: Document, a: string, r: string, i: string) {
    c.clarity = c.clarity || function (...args: unknown[]) {
      ((c.clarity as unknown as { q?: unknown[] }).q ||= []).push(args);
    };
    const t = l.createElement(r) as HTMLScriptElement;
    t.async = true;
    t.src = `https://www.clarity.ms/tag/${encodeURIComponent(i)}`;
    l.head.appendChild(t);
  })(window, document, "clarity", "script", id);
}

export function grantAdConsent(): void {
  window.gtag?.("consent", "update", {
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
  });
}

/** A route change. Called by the router, not by each page. */
export function trackPageView(path: string, title?: string): void {
  window.gtag?.("event", "page_view", {
    page_path: path,
    page_title: title ?? document.title,
    page_location: window.location.href,
  });
}

/**
 * A conversion or a meaningful interaction.
 *
 * Keep the name list short and stable — a metric you invent per component is a
 * metric nobody ever reads. See CONVERSIONS below.
 */
export function track(name: ConversionEvent, params: Params = {}): void {
  window.gtag?.("event", name, params);
  // Clarity tags the session so a recording can be filtered by what happened.
  window.clarity?.("event", name);
}

/** Every event this site emits. Mark the starred ones as key events in GA4. */
export const CONVERSIONS = {
  enquiry_start: "enquiry_start",           // first keystroke in the enquiry form
  enquiry_submit: "enquiry_submit",         // ★ the money event
  enquiry_failed: "enquiry_failed",         // submission errored — watch this
  phone_click: "phone_click",               // ★ tel: tap
  whatsapp_click: "whatsapp_click",         // ★
  cta_click: "cta_click",                   // any primary CTA, params.location
  pricing_view: "pricing_view",             // pricing section scrolled into view
  onboarding_start: "onboarding_start",
  onboarding_complete: "onboarding_complete", // ★
  sign_in: "sign_in",
  review_click: "review_click",         // client tapped through to leave a review
  experiment_view: "experiment_view",       // an A/B variant was shown
  web_vitals: "web_vitals",                 // field performance
} as const;

export type ConversionEvent = (typeof CONVERSIONS)[keyof typeof CONVERSIONS];

export const analyticsConfigured = Boolean(GA4_ID || CLARITY_ID);

/**
 * Interaction tracking by delegation.
 *
 * One listener on the document rather than a handler wired into every button.
 * The CTAs are inline JSX one-liners spread across the marketing page; touching
 * each of them to add an onClick would be a large diff with a real chance of
 * breaking layout, and it would silently miss any CTA added later. A delegated
 * listener covers every present and future link that matches.
 */
export function initInteractionTracking(): void {
  if (typeof document === "undefined") return;

  document.addEventListener(
    "click",
    event => {
      const el = (event.target as HTMLElement | null)?.closest("a,button");
      if (!el) return;
      const href = el.getAttribute("href") ?? "";

      if (href.startsWith("tel:")) return track(CONVERSIONS.phone_click, { number: href.slice(4) });
      if (/wa\.me|api\.whatsapp\.com/.test(href)) return track(CONVERSIONS.whatsapp_click);

      // A primary CTA is one that aims at the enquiry form, wherever it sits.
      if (href === "#enquiry" || href.endsWith("#enquiry")) {
        const section = el.closest("section,header,nav")?.id || "hero";
        track(CONVERSIONS.cta_click, { location: section, label: el.textContent?.trim().slice(0, 40) });
      }
    },
    { capture: true, passive: true },
  );

  // Reaching the pricing tiers is the strongest intent signal short of the form.
  const tiers = document.getElementById("tiers");
  if (tiers && typeof IntersectionObserver !== "undefined") {
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          track(CONVERSIONS.pricing_view);
          io.disconnect();                     // once per page load, not per scroll
        }
      },
      { threshold: 0.25 },
    );
    io.observe(tiers);
  }
}
