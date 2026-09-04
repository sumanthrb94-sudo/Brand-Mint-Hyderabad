/**
 * The four store tiers — the one thing this business sells.
 *
 * Single source of truth, read by:
 *   index.html   → renders the "What we do" cards
 *   login.html   → labels the tier the visitor chose
 *   portal/      → shows the client what they picked and what's in it
 *   admin/       → tier column on leads, tier on the client record
 *
 * Copy is taken verbatim from the live brandmintstudios.in pricing page.
 * Prices are one-time, in INR, exclusive of 18% GST.
 */

export const TIERS = [
  {
    id: "whatsapp",
    tier: 1,
    name: "WhatsApp Store",
    price: 49999,
    weeks: "4 weeks",
    blurb:
      "A complete store you run from your phone. Orders, returns and customers all handled on WhatsApp — no operations software to pay for or learn.",
    groups: [
      {
        title: "Foundation",
        items: ["Database design and setup", "Deployment, domain connection and SSL"],
      },
      {
        title: "Storefront",
        items: [
          "Homepage and design system",
          "Product listing and detail pages",
          "Search, category filters and cart",
        ],
      },
      {
        title: "Checkout and the WhatsApp desk",
        items: [
          "Razorpay online payments and COD",
          "Orders arrive on your phone, on WhatsApp",
          "Returns and refunds handled by message",
          "Products, stock and order management",
        ],
      },
    ],
  },
  {
    id: "starter",
    tier: 2,
    name: "Starter Store",
    price: 99000,
    weeks: "8 weeks",
    blurb:
      "Everything in the WhatsApp Store, plus the operations layer — so the shop stops depending on you answering it.",
    includesPrevious: "WhatsApp Store",
    groups: [
      {
        title: "Customer accounts",
        items: ["Phone OTP login and signup", "Customer order history"],
      },
      {
        title: "Automation",
        items: ["Order confirmation emails to the customer", "GST tax invoice PDF"],
      },
      {
        title: "Quality",
        items: [
          "Automated smoke tests (Playwright)",
          "5-day client testing window (UAT) before launch",
        ],
      },
    ],
  },
  {
    id: "growth",
    tier: 3,
    name: "Growth Store",
    price: 200000,
    weeks: "12 weeks",
    blurb: "Everything in Starter, plus the systems that reduce daily manual work.",
    includesPrevious: "Starter Store",
    featured: true,
    groups: [
      {
        title: "Shipping and returns",
        items: ["Courier API integration", "Live tracking", "Returns and Razorpay refunds"],
      },
      {
        title: "Selling",
        items: ["Coupons and discount codes", "Abandoned-cart recovery", "Order lifecycle emails"],
      },
      {
        title: "Quality and data",
        items: [
          "Sales reporting and low-stock alerts",
          "GA4, Meta Pixel and conversion tracking",
          "Playwright suite, SEO audit and Lighthouse pass",
        ],
      },
    ],
  },
  {
    id: "commerce",
    tier: 4,
    name: "Commerce Store",
    price: 300000,
    weeks: "12+ weeks",
    blurb: "Everything in Growth, plus depth for stores with a team and volume.",
    includesPrevious: "Growth Store",
    groups: [
      {
        title: "Access and reporting",
        items: ["Staff, manager and owner roles", "Advanced reporting and data exports"],
      },
      {
        title: "Customer features",
        items: ["Product reviews and ratings", "Wishlist", "Loyalty or referral programme"],
      },
      {
        title: "Scale",
        items: ["Performance budgets enforced in CI", "60-day bug warranty"],
      },
    ],
  },
];

export const TIER_BY_ID = Object.fromEntries(TIERS.map((t) => [t.id, t]));

/**
 * Everything a tier delivers, including what it inherits from the tiers
 * below it. Returns [{ tier, own }] from the chosen tier down to tier 1,
 * so a review can show "in this tier" first and "also included" after.
 */
export function inclusionsFor(tierId) {
  const t = TIER_BY_ID[tierId];
  if (!t) return [];
  return TIERS.filter((x) => x.tier <= t.tier)
    .sort((a, b) => b.tier - a.tier)
    .map((x) => ({ tier: x, own: x.id === tierId }));
}

/** What the studio needs from the client before a build can start. */
export const NEEDS = [
  { title: "Product list and photos", body: "Names, prices, variants, stock and photos. We send a catalogue template on the call." },
  { title: "Business and GST details", body: "Legal name, address and GSTIN, so invoices and order documents are right from day one." },
  { title: "Logo and brand assets", body: "Whatever you have. If there is nothing yet, say so — we work with that too." },
  { title: "Domain and accounts", body: "Your domain if you own one, and a Razorpay account in your business name. We walk you through both." },
];

/** The questions founders ask before they commit. Home page and portal both render these. */
export const FAQ = [
  {
    q: "What happens after I sign in?",
    a: "We get your email and the store you picked, nothing else. Within one working day we call you for a 30-minute conversation: confirm the tier, walk the scope, agree a start date. No obligation, no pitch deck.",
  },
  {
    q: "When do I pay, and is GST included?",
    a: "50% when you sign the agreement, 50% before launch. Prices are exclusive of 18% GST and you get a GST invoice for every payment. There are no hourly bills or surprise extras inside a tier.",
  },
  {
    q: "Do I own the store?",
    a: "Yes. The domain, hosting and Razorpay account are set up in your business name, and the store lives on your accounts. If we part ways, you keep everything.",
  },
  {
    q: "What do you need from me?",
    a: "Your product list and photos, business and GST details, a logo if you have one. We send a catalogue template on the call. Timelines run from the day we receive your assets, so a ready catalogue is the fastest way to launch sooner.",
  },
  {
    q: "Can I start small and upgrade later?",
    a: "Yes. Every tier includes everything in the one before it, so moving up is a scoped add-on rather than a rebuild. Most founders start where their operations are today.",
  },
  {
    q: "What is the care plan, and can I cancel?",
    a: "An optional monthly plan with a defined scope: updates tested on staging, monitoring, security patches, fixes and a health report. Cancel with 30 days' notice. Your store keeps running either way.",
  },
];

/** "₹49,999" — Indian digit grouping, no decimals. */
export function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

/** Monthly care plans, added after launch. Per month, exclusive of GST. */
export const CARE_PLANS = [
  {
    id: "care",
    name: "Care",
    price: 12500,
    body: "Hosting, SSL, security updates, backups, uptime monitoring and small fixes.",
  },
  {
    id: "growth",
    name: "Growth",
    price: 25000,
    body: "Everything in Care, plus content updates, a monthly report and one small feature each month.",
  },
  {
    id: "managed",
    name: "Managed Commerce",
    price: 50000,
    body: "Everything in Growth, plus catalogue operations, campaign management and priority support.",
  },
];

/** What happens after someone picks a tier. Shown on the home page and in the portal. */
export const STEPS = [
  {
    title: "Pick a tier and sign in",
    body: "Choose the store that fits and continue with Google. That's the whole form — we get your email, you get a portal.",
  },
  {
    title: "We call you the next day",
    body: "A 30-minute call to confirm the tier, walk the scope and agree a start date. No pitch deck.",
  },
  {
    title: "Sign, pay 50%, watch it happen",
    body: "Once the agreement is signed and the deposit is in, your portal goes live: timeline, files to approve, invoices and a direct line to us.",
  },
];
