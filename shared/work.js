/**
 * The portfolio.
 *
 * A `domain` that is a platform subdomain (something.vercel.app) is rendered
 * as "Open the live app" rather than printed raw — the host is not the brand. This is the most valuable content on the site — a stranger
 * deciding whether to trust you with ₹2,00,000 believes work, not adjectives.
 *
 * ⚠️ FIELDS TO CONFIRM. Only `name`, `domain` and `url` are known facts.
 * `kind`, `summary` and `result` are yours to fill — and `result` must be a
 * number you can defend if the client is ever asked. An empty field renders
 * as nothing rather than as a guess, so a half-filled entry still looks
 * deliberate. Never write a metric here that isn't real.
 *
 * `quote` and `quoteFrom` work the same way: empty renders as nothing. A
 * quote goes in here only once the named person actually said it — paste
 * their own words, in WhatsApp or wherever they sent it, not a paraphrase.
 * `quoteFrom` is who said it and their role (e.g. "Priya, founder") — never
 * a title you're guessing at.
 *
 * IMAGES: drop a screenshot at /work/<id>.jpg (1600×1000, under 300 KB).
 * Missing images fall back to a typographic card automatically.
 */

export const WORK = [
  {
    id: "simplysip",
    name: "SimplySip",
    domain: "simplysip.in",
    url: "https://simplysip.in",
    kind: "Online store",
    summary:
      "Sold through WhatsApp DMs. Now customers check out themselves — UPI, cards or cash on delivery — and every order arrives priced and recorded.",
    result: "",
    quote: "",
    quoteFrom: "",
  },
  {
    id: "tresorcouture",
    name: "Trésor Couture",
    domain: "tresorcouture.in",
    url: "https://tresorcouture.in",
    kind: "Online store",
    summary:
      "Sold to whoever walked in. Now the label reaches past the shop floor, with its own checkout and a GST invoice on every order.",
    result: "",
    quote: "",
    quoteFrom: "",
  },
  {
    id: "greenteam",
    name: "GreenTeam",
    domain: "thegreenteam.in",
    url: "https://thegreenteam.in",
    kind: "Website",
    summary:
      "The pitch used to be a PDF catalogue, sent on request. Now the site does that part before the call, not after it.",
    result: "",
    quote: "",
    quoteFrom: "",
  },
  {
    id: "freshkart",
    name: "FreshKart",
    domain: "fresh-kart-six.vercel.app",
    url: "https://fresh-kart-six.vercel.app/",
    kind: "B2B ordering platform",
    summary:
      "Wholesale orders came in by phone, one at a time. Now buyers place their own, priced correctly, without anyone picking up.",
    result: "",
    quote: "",
    quoteFrom: "",
  },
];

/** In development. Shown as what's being built, never as delivered work. */
export const BUILDING = [
  { id: "modcon-hr", name: "Modcon HR", kind: "HR tool", status: "In development" },
  { id: "realestate-crm", name: "Real Estate CRM", kind: "Sales CRM", status: "Upcoming" },
  { id: "lehart", name: "Lehart", kind: "Online store", status: "In development" },
];

/**
 * The numbers under the hero. Every one must be true and defensible.
 * `value` shows as-is; keep them few and keep them real.
 */
export const PROOF = [
  // No project count here on purpose. The real figure moves as fast as work
  // ships, most of it under names not yet public — a number frozen in this
  // file goes stale or gets rounded up the moment someone doesn't want to
  // recount it, and either failure mode is worse than not showing one.
  { value: "8+ yrs", label: "senior operator on every build" },
  { value: "Hyderabad + UK", label: "India and the United Kingdom" },
];
