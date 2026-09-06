/**
 * The service ladder — every category Brand Mint sells, cheapest first.
 *
 * The home page renders this list. Each category either points at a detail
 * section further down the page (the store tiers), a page of its own
 * (Site + CRM), or straight at sign-in.
 *
 * `from` is what the category STARTS at. A category with sub-tiers says so
 * and links to them rather than repeating them here — the four store tiers
 * live in shared/tiers.js and nowhere else.
 *
 * Any id used as a CTA must also be allowed in firestore.rules, in the
 * `tier in [...]` list on the leads collection. Otherwise the sign-in
 * records a lead the rules reject.
 */

export const SERVICES = [
  {
    id: "website",
    name: "Static Website",
    from: 14999,
    unit: "one-time",
    note: "GST extra",
    blurb:
      "A fast, honest website that says who you are and how to reach you. Up to five pages, your domain, your content, live in two weeks.",
    points: [
      "Up to 5 pages, written and built with you",
      "Your domain, SSL and email set up",
      "WhatsApp and call buttons that work on a phone",
      "Google Search Console verified and submitted",
      "Visitor analytics from day one",
    ],
    cta: { label: "Start with a website", href: "/login?tier=website" },
  },
  {
    id: "store",
    name: "Online Store",
    from: 49999,
    unit: "one-time",
    note: "four tiers, GST extra",
    blurb:
      "Sell online properly: UPI, cards, cash on delivery, GST invoices and WhatsApp orders. Four fixed-price tiers, each including everything in the one before it.",
    points: [
      "WhatsApp Store — run it all from your phone",
      "Starter Store — accounts, order emails, GST invoices",
      "Growth Store — courier API, tracking, cart recovery",
      "Commerce Store — staff roles, reviews, loyalty",
    ],
    cta: { label: "See the four tiers", href: "#stores" },
    tiersBelow: true,
  },
  {
    id: "platform",
    name: "Site + CRM",
    from: 79999,
    unit: "once",
    note: "then maintenance only",
    highlight: "Built and integrated once. Yours forever.",
    blurb:
      "A website with a lead CRM behind it, built and connected one time. After that you only pay maintenance — the software is yours. Real estate first; the same engine fits any business that chases leads.",
    points: [
      "Website plus your own admin dashboard",
      "Lead CRM with stages, owners and follow-ups",
      "WhatsApp Business API, both directions",
      "Chat agent that hands over to a human",
      "Facebook and Instagram leads imported",
      "Visitor analytics and click heat maps",
    ],
    cta: { label: "See Site + CRM", href: "/platform" },
    featured: true,
  },
  {
    id: "crm",
    name: "Custom CRM",
    from: 49999,
    unit: "setup",
    note: "+ ₹4,999/month",
    status: "Launching soon",
    blurb:
      "The CRM on its own, shaped to how your business actually works, without us rebuilding your website. Your stages, your fields, your team's logins.",
    points: [
      "Your pipeline, your stage names, your fields",
      "WhatsApp desk and call logging",
      "Roles for owners, managers and field staff",
      "Reports the person paying for it will read",
    ],
    cta: { label: "Talk to us about it", href: "/login?tier=crm" },
  },
  {
    id: "hr",
    name: "Modcon HR",
    from: 4999,
    unit: "per month",
    note: "up to 50 people",
    status: "Launching soon",
    blurb:
      "An HR tool for small and growing Indian teams: people records, attendance and leave, documents, and payroll-ready exports — without enterprise software pricing.",
    points: [
      "People records and documents in one place",
      "Attendance, leave and holiday calendar",
      "Applied → interview → offer → onboarding",
      "Payroll-ready exports each month",
    ],
    cta: { label: "Pre-book a free trial", href: "/login?tier=hr" },
  },
];

export const SERVICE_BY_ID = Object.fromEntries(SERVICES.map((s) => [s.id, s]));

/** "₹14,999" — Indian digit grouping, no decimals. */
export function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
