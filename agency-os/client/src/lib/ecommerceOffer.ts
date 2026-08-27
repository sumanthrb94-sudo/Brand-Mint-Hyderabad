/**
 * The confirmed Brand Mint ecommerce offer.
 *
 * Single source of truth so the public homepage and the signed-in member area
 * can never drift on price, timeline, or what a tier includes. Changing a
 * price here changes it everywhere it is quoted.
 */

export type Tier = {
  name: string;
  price: string;
  timing: string;
  tone: "standard" | "featured";
  intro: string;
  groups: string[][];
};

export const tiers: Tier[] = [
  /*
   * THE ENTRY TIER, AND THE POINT OF IT.
   *
   * The expensive part of an ecommerce build is never the shop — it is the
   * operations software behind it: accounts, OTP, transactional email, an
   * invoice generator. This tier leaves that out and puts a person on
   * WhatsApp in its place. Orders, returns and questions arrive as messages
   * and are answered by hand.
   *
   * That omission is what makes ₹49,999 an HONEST price rather than a
   * discounted one. It is not a cheaper Starter Store; it is a smaller
   * product, and the difference is stated rather than hidden.
   */
  { name: "WhatsApp Store", price: "₹49,999", timing: "4 weeks", tone: "standard", intro: "A complete store you run from your phone. Orders, returns and customers all handled on WhatsApp — no operations software to pay for or learn.", groups: [["Foundation", "Database design and setup", "Deployment, domain connection and SSL"], ["Storefront", "Homepage and design system", "Product listing and detail pages", "Search, category filters and cart"], ["Checkout and the WhatsApp desk", "Razorpay online payments and COD", "Orders arrive on your phone, on WhatsApp", "Returns and refunds handled by message", "Products, stock and order management"]] },
  /*
   * Starter is now the DELTA over the WhatsApp Store, not a restatement of
   * it. Listing the shared items again in both would guarantee that one day
   * they stop matching — the same reason the static site's TIERS uses an
   * `inherits` chain instead of duplicated lists.
   */
  { name: "Starter Store", price: "₹99,000", timing: "8 weeks", tone: "standard", intro: "Everything in the WhatsApp Store, plus the operations layer — so the shop stops depending on you answering it.", groups: [["Customer accounts", "Phone OTP login and signup", "Customer order history"], ["Automation", "Order confirmation emails to the customer", "GST tax invoice PDF"], ["Quality", "Automated smoke tests (Playwright)", "5-day client testing window (UAT) before launch"]] },
  { name: "Growth Store", price: "₹2,00,000", timing: "12 weeks", tone: "featured", intro: "Everything in Starter, plus the systems that reduce daily manual work.", groups: [["Shipping and returns", "Courier API integration", "Live tracking", "Returns and Razorpay refunds"], ["Selling", "Coupons and discount codes", "Abandoned-cart recovery", "Order lifecycle emails"], ["Quality and data", "Sales reporting and low-stock alerts", "GA4, Meta Pixel and conversion tracking", "Playwright suite, SEO audit and Lighthouse pass"]] },
  { name: "Commerce Store", price: "₹3,00,000", timing: "12+ weeks", tone: "standard", intro: "Everything in Growth, plus depth for stores with a team and volume.", groups: [["Access and reporting", "Staff, manager and owner roles", "Advanced reporting and data exports"], ["Customer features", "Product reviews and ratings", "Wishlist", "Loyalty or referral programme"], ["Scale", "Performance budgets enforced in CI", "60-day bug warranty"]] },
];

export const carePlans: [string, string, string][] = [
  ["Care", "₹12,500/mo", "Hosting, SSL, security updates, backups, uptime monitoring and small fixes."],
  ["Growth", "₹25,000/mo", "Everything in Care, plus content updates, a monthly report and one small feature each month."],
  ["Managed Commerce", "₹50,000/mo", "Everything in Growth, plus catalogue operations, campaign management and priority support."],
];

/**
 * Free resources offered to a signed-in visitor before any engagement exists.
 *
 * Each one is drawn from delivery material Brand Mint already runs internally
 * (the kickoff and handover checklists, the brand kit, and the client-inputs
 * list published on the homepage), so nothing here promises work that is not
 * already part of how a store gets built.
 */
export const perks: { title: string; summary: string; detail: string }[] = [
  {
    title: "Store launch-readiness checklist",
    summary: "The 20-point pass every Brand Mint store clears before it goes live.",
    detail: "Lighthouse across all four axes, real-device mobile QA, cross-browser check, a WCAG AA accessibility pass, end-to-end form and checkout tests, link-preview validation, and DNS/SSL verification. Run it against a store you already have.",
  },
  {
    title: "Product data and catalogue template",
    summary: "The exact fields we ask every client for, before a single page is built.",
    detail: "Titles, descriptions, variants, stock units, pricing, HSN codes, weights and dimensions for courier rating, and photography specs. Filling this in early is the single biggest thing that keeps a build on schedule.",
  },
  {
    title: "Scope worksheet",
    summary: "Work out what you actually need before anyone quotes you.",
    detail: "Walks through catalogue size, payment methods, shipping model, returns policy, and who owns which account. Come out of it able to compare quotes on the same basis — including ours.",
  },
  {
    title: "Free 30-minute store review",
    summary: "A working session on your current store or your plan for one.",
    detail: "We go through what is losing you orders — checkout friction, catalogue structure, page speed, or tracking gaps — and you leave with the list whether or not you engage us.",
  },
  {
    title: "Brand starter kit",
    summary: "Logo formats, a colour and type system, and templates you can use immediately.",
    detail: "Primary, wordmark, monogram and favicon exports, a documented palette and type pairing, a social card template and an email signature. Enough to look consistent while the store is being built.",
  },
];

/**
 * Plain-language explainers for the parts of Indian ecommerce that most often
 * surprise a first-time store owner. Each maps to something inside a tier
 * above, so the education and the offer stay consistent.
 */
export const lessons: { title: string; body: string; tag: string }[] = [
  {
    tag: "Payments",
    title: "Razorpay and cash on delivery",
    body: "Online payments need a Razorpay account in your business name, with KYC and a settlement bank account — the transaction fee is charged to you directly, not billed through us. COD needs the opposite kind of thinking: a confirmation step to cut fake orders, and a reconciliation process for what the courier collects and remits. Most Indian stores launch with both and watch the split for the first quarter.",
  },
  {
    tag: "Tax",
    title: "GST, and where it applies",
    body: "The build price is exclusive of 18% GST, so a ₹99,000 Starter Store invoices at ₹1,16,820. Separately, your own product GST rates depend on HSN code and have to be right in the catalogue from day one — retro-fixing tax on live orders is painful. You supply the business and GST details; we wire them into invoicing and order documents.",
  },
  {
    tag: "Logistics",
    title: "Couriers, tracking and returns",
    body: "A courier API integration turns an order into a shipment automatically and gives the customer live tracking, which removes most 'where is my order' support. Returns are the part people under-plan: you need a stated window, a condition policy, and a refund path back through Razorpay. Courier integration, tracking and refunds start at the Growth tier.",
  },
  {
    tag: "Catalogue",
    title: "Product data is the product",
    body: "Search, filters, related products and every recommendation run off structured data, not photographs. Consistent categories, real variant attributes and honest stock counts do more for conversion than a redesign. This is also the input we most often wait on — timelines run from receipt of assets, so a prepared catalogue directly shortens the build.",
  },
  {
    tag: "Recovery",
    title: "Abandoned carts and lifecycle email",
    body: "Most people who add to cart do not check out on that visit. A recovery sequence and the ordinary lifecycle mails — confirmation, shipped, delivered — are the cheapest revenue in ecommerce because the intent already exists. Both are included from the Growth tier.",
  },
  {
    tag: "Measurement",
    title: "GA4 and Meta Pixel, set up properly",
    body: "Installing a tag is not measurement. What matters is conversion events firing on the right actions with the right values, so you can see which channel actually pays for itself rather than guessing from the platform's own reporting. Tracking and conversion setup are part of the Growth tier's quality pass.",
  },
];
