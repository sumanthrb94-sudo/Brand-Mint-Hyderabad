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
    summary: "",
    result: "",
  },
  {
    id: "tresorcouture",
    name: "Trésor Couture",
    domain: "tresorcouture.in",
    url: "https://tresorcouture.in",
    kind: "Online store",
    summary: "",
    result: "",
  },
  {
    id: "greenteam",
    name: "GreenTeam",
    domain: "thegreenteam.in",
    url: "https://thegreenteam.in",
    kind: "Website",
    summary: "",
    result: "",
  },
  {
    id: "freshkart",
    name: "FreshKart",
    domain: "fresh-kart-six.vercel.app",
    url: "https://fresh-kart-six.vercel.app/",
    kind: "B2B ordering platform",
    summary: "",
    result: "",
  },
];

/** In development. Shown as what's being built, never as delivered work. */
export const BUILDING = [
  { id: "modcon-hr", name: "Modcon HR", kind: "HR tool", status: "In development" },
  { id: "realestate-crm", name: "Real Estate CRM", kind: "Sales CRM", status: "Upcoming" },
];

/**
 * The numbers under the hero. Every one must be true and defensible.
 * `value` shows as-is; keep them few and keep them real.
 */
export const PROOF = [
  { value: String(WORK.length), label: "brands shipped" },
  { value: "8+ yrs", label: "senior operator on every build" },
  { value: "Hyderabad", label: "HITEC City, in person" },
];
