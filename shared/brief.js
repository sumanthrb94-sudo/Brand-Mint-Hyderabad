/**
 * The client onboarding brief — one definition, two consumers.
 *
 * The portal renders these steps as a wizard; the admin renders the same keys
 * as a read-only summary. Keeping the questionnaire here means adding or
 * rewording a question never needs a database migration: answers are stored
 * as a single `jsonb` blob on `onboarding_responses.answers`, keyed by `id`.
 *
 * Changing an `id` orphans previously captured answers, so add new ids rather
 * than renaming old ones.
 */

export const BRIEF_STEPS = [
  {
    id: "business",
    title: "Your business",
    blurb: "The basics, so we're briefing off facts rather than guesses.",
    questions: [
      { id: "legalName", label: "Registered business name", type: "text", required: true },
      { id: "tradingName", label: "Name you trade under (if different)", type: "text" },
      { id: "website", label: "Current website or social handle", type: "text", placeholder: "https://" },
      { id: "industry", label: "Industry / category", type: "text", required: true },
      {
        id: "stage",
        label: "Where are you today?",
        type: "select",
        required: true,
        options: [
          "Pre-launch — nothing public yet",
          "Launched — under 1 year",
          "Established — 1 to 5 years",
          "Established — 5+ years",
          "Rebranding an existing business",
        ],
      },
      { id: "teamSize", label: "Roughly how many people work there?", type: "text" },
    ],
  },
  {
    id: "audience",
    title: "Who you're for",
    blurb: "The sharper this is, the less generic the work will be.",
    questions: [
      {
        id: "customer",
        label: "Describe your ideal customer in a sentence or two",
        type: "textarea",
        required: true,
        placeholder: "e.g. Hyderabad-based founders of D2C food brands doing ₹50L–₹2Cr a year…",
      },
      { id: "problem", label: "What problem do you solve for them?", type: "textarea", required: true },
      { id: "competitors", label: "Three competitors (names or links)", type: "textarea" },
      {
        id: "differentiator",
        label: "What do you do that they don't?",
        type: "textarea",
        required: true,
      },
    ],
  },
  {
    id: "brand",
    title: "Look and voice",
    blurb: "Taste is hard to describe — examples beat adjectives, so link freely.",
    questions: [
      {
        id: "personality",
        label: "Pick the words that should describe your brand",
        type: "multi",
        options: [
          "Premium", "Approachable", "Bold", "Minimal", "Warm", "Technical",
          "Playful", "Editorial", "Traditional", "Modern", "Understated", "Loud",
        ],
      },
      { id: "loveLinks", label: "Brands or sites you love (and why)", type: "textarea" },
      { id: "hateLinks", label: "Anything you definitely don't want", type: "textarea" },
      { id: "existingAssets", label: "Do you have existing assets we should keep?", type: "textarea",
        placeholder: "Logo, colours, fonts, photography, a name you're attached to…" },
    ],
  },
  {
    id: "scope",
    title: "What you need",
    blurb: "This sets the quote and the timeline, so be honest about must-haves.",
    questions: [
      {
        id: "deliverables",
        label: "What are we building?",
        type: "multi",
        required: true,
        options: [
          "Brand identity / logo",
          "Full brand system + guidelines",
          "Marketing website",
          "E-commerce store",
          "Web app / internal tool",
          "Packaging",
          "Social media kit",
          "Pitch or investor deck",
          "Content / copywriting",
        ],
      },
      {
        id: "deadline",
        label: "Is there a date this has to be live by?",
        type: "text",
        placeholder: "A launch, an event, a funding round — or 'no fixed date'",
      },
      {
        id: "budget",
        label: "Budget range you're working with",
        type: "select",
        options: [
          "Under ₹1,00,000",
          "₹1,00,000 – ₹3,00,000",
          "₹3,00,000 – ₹6,00,000",
          "₹6,00,000 – ₹12,00,000",
          "₹12,00,000+",
          "Not sure — advise me",
        ],
      },
      { id: "successLooksLike", label: "Six months after launch, what has to be true for this to have worked?", type: "textarea" },
    ],
  },
  {
    id: "logistics",
    title: "Working together",
    blurb: "Last one. This is so nothing stalls once we start.",
    questions: [
      { id: "decisionMaker", label: "Who signs off on the work?", type: "text", required: true },
      { id: "whatsapp", label: "Best WhatsApp number for quick approvals", type: "text" },
      {
        id: "reviewCadence",
        label: "How often do you want to see progress?",
        type: "select",
        options: ["Daily", "Twice a week", "Weekly", "At each milestone only"],
      },
      { id: "notes", label: "Anything else we should know?", type: "textarea" },
    ],
  },
];

/** Flat list of every question, for lookups. */
export const ALL_QUESTIONS = BRIEF_STEPS.flatMap((s) =>
  s.questions.map((q) => ({ ...q, stepId: s.id, stepTitle: s.title }))
);

/** Every required question the client has not answered yet. */
export function missingRequired(answers = {}) {
  return ALL_QUESTIONS.filter((q) => {
    if (!q.required) return false;
    const v = answers[q.id];
    if (Array.isArray(v)) return v.length === 0;
    return !v || !String(v).trim();
  });
}

/** 0–100, for the progress bar and the admin's completeness column. */
export function completeness(answers = {}) {
  const total = ALL_QUESTIONS.length;
  if (!total) return 0;
  const filled = ALL_QUESTIONS.filter((q) => {
    const v = answers[q.id];
    if (Array.isArray(v)) return v.length > 0;
    return v != null && String(v).trim() !== "";
  }).length;
  return Math.round((filled / total) * 100);
}

/** Render-ready pairs for the admin's read-only view. */
export function answerPairs(answers = {}) {
  return ALL_QUESTIONS.map((q) => {
    const raw = answers[q.id];
    const value = Array.isArray(raw) ? raw.join(", ") : raw == null ? "" : String(raw);
    return { id: q.id, label: q.label, step: q.stepTitle, value };
  }).filter((p) => p.value.trim() !== "");
}
