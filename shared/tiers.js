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
 *
 * ⚠️ The Growth Store's inclusions were cut off in the screenshot this was
 * built from — only the "Shipping and returns" group heading was visible.
 * The bullets under it are drafted to match the pattern of the other tiers.
 * Replace them with the live copy.
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
      // ⚠️ Drafted — see the note at the top of this file.
      {
        title: "Shipping and returns",
        items: [
          "Courier integration with live tracking (Shiprocket / Delhivery)",
          "Pincode serviceability check on the product page",
          "Self-serve returns and exchange requests",
        ],
      },
      {
        title: "Marketing automation",
        items: [
          "Abandoned-cart recovery on WhatsApp and email",
          "Back-in-stock and order-update notifications",
          "Discount codes and campaign landing pages",
        ],
      },
      {
        title: "Insight",
        items: ["Sales and inventory dashboard", "Google Analytics and Meta pixel, server-side"],
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

/** "₹49,999" — Indian digit grouping, no decimals. */
export function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

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
