/**
 * Store Readiness Score — the one game in the portal, and it is useful.
 *
 * Ten questions, two minutes, a score out of 100, the tier that fits, and
 * the three things to fix first. Answers are saved on the person's profile
 * (profiles/{uid}.readiness) so the studio sees them before the call.
 *
 * Scoring: every option carries points (0–10). The score is the sum, so
 * max is 100. `fit` values nudge the tier recommendation: the questions
 * about operations (orders, ads, shipping, team) decide the tier, the rest
 * decide readiness.
 */

export const QUIZ = [
  {
    id: "catalogue",
    q: "How ready is your product catalogue?",
    fix: "Get the catalogue into a sheet: names, prices, variants, stock, photos. Ask us for the template — it's free.",
    options: [
      { label: "In a sheet with photos, prices and stock", points: 10 },
      { label: "Mostly there, photos still pending", points: 6 },
      { label: "In my head and on WhatsApp", points: 2 },
      { label: "Haven't started", points: 0 },
    ],
  },
  {
    id: "photos",
    q: "Product photography?",
    fix: "Shoot on a plain background in daylight, one angle per product to start. Consistency beats quality.",
    options: [
      { label: "Shot, consistent, ready to use", points: 10 },
      { label: "Some, mixed quality", points: 5 },
      { label: "Phone photos from the shop floor", points: 3 },
      { label: "None yet", points: 0 },
    ],
  },
  {
    id: "gst",
    q: "GST registration?",
    fix: "Register for GST before launch. Selling across states online generally needs it regardless of turnover.",
    options: [
      { label: "Registered, GSTIN in hand", points: 10 },
      { label: "Applied, waiting", points: 6 },
      { label: "Not yet, I know I need it", points: 2 },
      { label: "Not sure if I need it", points: 0 },
    ],
  },
  {
    id: "payments",
    q: "Online payments?",
    fix: "Open a Razorpay account in the business name and finish KYC now. It takes days, not hours.",
    options: [
      { label: "Razorpay account live, KYC done", points: 10 },
      { label: "Account created, KYC pending", points: 6 },
      { label: "Only UPI to my phone", points: 3 },
      { label: "Cash only so far", points: 0 },
    ],
  },
  {
    id: "policies",
    q: "Returns, shipping and privacy policies?",
    fix: "Write the returns window, who pays return shipping, and delivery times. Gateways check for these pages.",
    options: [
      { label: "Written and decided", points: 10 },
      { label: "Decided, not written", points: 6 },
      { label: "Case by case", points: 2 },
      { label: "Haven't thought about it", points: 0 },
    ],
  },
  {
    id: "domain",
    q: "Domain and brand?",
    fix: "Buy the .in or .com now, in your own name. Logo can follow; the domain can't.",
    options: [
      { label: "Domain owned, logo ready", points: 10 },
      { label: "Domain owned, no logo", points: 7 },
      { label: "Logo, no domain", points: 4 },
      { label: "Neither yet", points: 0 },
    ],
  },
  {
    id: "orders",
    q: "Orders a month right now, across every channel?",
    fix: null,
    options: [
      { label: "Under 50", points: 10, fit: 1 },
      { label: "50 to 300", points: 10, fit: 2 },
      { label: "300 to 1,500", points: 10, fit: 3 },
      { label: "More than 1,500", points: 10, fit: 4 },
    ],
  },
  {
    id: "shipping",
    q: "How do orders ship today?",
    fix: "Pick one courier aggregator and open the account before launch so rates and pickups are ready.",
    options: [
      { label: "Courier account with API or aggregator", points: 10, fit: 3 },
      { label: "Courier booked by hand each time", points: 6, fit: 2 },
      { label: "Local delivery or self-pickup", points: 5, fit: 1 },
      { label: "Not shipping yet", points: 2, fit: 1 },
    ],
  },
  {
    id: "marketing",
    q: "Paid marketing?",
    fix: null,
    options: [
      { label: "Running Meta or Google ads with tracking", points: 10, fit: 3 },
      { label: "Running ads, no proper tracking", points: 6, fit: 3 },
      { label: "Organic and WhatsApp only", points: 6, fit: 1 },
      { label: "Nothing yet", points: 3, fit: 1 },
    ],
  },
  {
    id: "team",
    q: "Who will run the store day to day?",
    fix: null,
    options: [
      { label: "Just me, from my phone", points: 10, fit: 1 },
      { label: "Me plus one helper", points: 10, fit: 2 },
      { label: "A small team with defined roles", points: 10, fit: 4 },
      { label: "Not decided", points: 5, fit: 1 },
    ],
  },
];

const TIER_ORDER = ["whatsapp", "starter", "growth", "commerce"];

/**
 * answers: { [questionId]: optionIndex }
 * → { score, tierId, fixes: [{ id, q, fix }], answered }
 */
export function scoreQuiz(answers = {}) {
  let score = 0;
  let answered = 0;
  const fits = [];
  const weak = [];
  for (const q of QUIZ) {
    const i = answers[q.id];
    const o = Number.isInteger(i) ? q.options[i] : null;
    if (!o) continue;
    answered += 1;
    score += o.points;
    if (o.fit) fits.push(o.fit);
    if (q.fix && o.points < 7) weak.push({ id: q.id, q: q.q, fix: q.fix, points: o.points });
  }
  // Tier: the operations answers vote; the highest of the top two wins so one
  // ambitious answer doesn't over-sell, and one modest one doesn't under-sell.
  const sorted = fits.slice().sort((a, b) => b - a);
  const level = sorted.length ? Math.max(sorted[0] - 1, sorted[1] || 1) : 1;
  const tierId = TIER_ORDER[Math.min(Math.max(level, 1), 4) - 1];
  const fixes = weak.sort((a, b) => a.points - b.points).slice(0, 3).map(({ id, q, fix }) => ({ id, q, fix }));
  return { score, tierId, fixes, answered };
}

export function scoreLabel(score) {
  if (score >= 85) return "Launch-ready";
  if (score >= 65) return "Nearly there";
  if (score >= 40) return "Getting started";
  return "Early days";
}
