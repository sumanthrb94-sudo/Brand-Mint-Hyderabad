/**
 * Everything a signed-in person gets for free, plus what they should know
 * before running a store in India, plus what's launching next.
 *
 * Read by the portal (every signed-in state) and the home page. Requests
 * made from here land in the `requests` collection so the studio sees them
 * in Admin → Leads and follows up on WhatsApp.
 *
 * Copy for PERKS and LESSONS is the studio's own delivery material. COMPLIANCE
 * is general guidance, not legal advice, and says so on the page.
 */

export const WHATSAPP = "917799934943";
export const WHATSAPP_DISPLAY = "+91 77999 34943";

/** wa.me link with a prefilled message. */
export function waLink(message) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`;
}

/** Free for anyone who signs in. Ask on WhatsApp and the studio does it. */
export const PERKS = [
  {
    id: "store-audit",
    title: "Free store audit",
    summary: "We go through your current store or your plan for one and send back what is losing you orders.",
    detail: "Checkout friction, catalogue structure, page speed, tracking gaps, mobile issues. A written list you keep whether or not you engage us.",
    ask: "I'd like the free store audit.",
  },
  {
    id: "launch-checklist",
    title: "Launch-readiness checklist",
    summary: "The 20-point pass every Brand Mint store clears before it goes live.",
    detail: "Lighthouse across all four axes, real-device mobile QA, cross-browser check, WCAG AA accessibility, end-to-end form and checkout tests, link-preview validation, DNS and SSL verification. Run it against a store you already have.",
    ask: "Please send me the launch-readiness checklist.",
  },
  {
    id: "catalogue-template",
    title: "Product catalogue template",
    summary: "The exact fields we ask every client for, before a single page is built.",
    detail: "Titles, descriptions, variants, stock units, pricing, HSN codes, weights and dimensions for courier rating, photography specs. Filling this in early is the single biggest thing that keeps a build on schedule.",
    ask: "Please send me the product catalogue template.",
  },
  {
    id: "scope-worksheet",
    title: "Scope worksheet",
    summary: "Work out what you actually need before anyone quotes you.",
    detail: "Catalogue size, payment methods, shipping model, returns policy, who owns which account. Come out of it able to compare quotes on the same basis, including ours.",
    ask: "Please send me the scope worksheet.",
  },
  {
    id: "store-review-call",
    title: "Free 30-minute store review",
    summary: "A working session on your store or the plan for one.",
    detail: "We look at what is losing you orders and you leave with the list. No pitch. Book it on WhatsApp and we send times.",
    ask: "I'd like to book the free 30-minute store review.",
  },
  {
    id: "brand-starter-kit",
    title: "Brand starter kit",
    summary: "Logo formats, a colour and type system, and templates you can use immediately.",
    detail: "Primary, wordmark, monogram and favicon exports, a documented palette and type pairing, a social card template and an email signature. Enough to look consistent while the store is being built.",
    ask: "I'd like the brand starter kit.",
  },
];

/** Plain-language explainers for the parts of Indian ecommerce that surprise first-time owners. */
export const LESSONS = [
  {
    tag: "Payments",
    title: "Razorpay and cash on delivery",
    body: "Online payments need a Razorpay account in your business name, with KYC and a settlement bank account. The transaction fee is charged to you directly, not billed through us. COD needs the opposite kind of thinking: a confirmation step to cut fake orders, and a reconciliation process for what the courier collects and remits. Most Indian stores launch with both and watch the split for the first quarter.",
  },
  {
    tag: "Tax",
    title: "GST, and where it applies",
    body: "The build price is exclusive of 18% GST, so a ₹99,000 Starter Store invoices at ₹1,16,820. Separately, your own product GST rates depend on HSN code and have to be right in the catalogue from day one. Retro-fixing tax on live orders is painful. You supply the business and GST details; we wire them into invoicing and order documents.",
  },
  {
    tag: "Logistics",
    title: "Couriers, tracking and returns",
    body: "A courier API integration turns an order into a shipment automatically and gives the customer live tracking, which removes most 'where is my order' support. Returns are the part people under-plan: you need a stated window, a condition policy, and a refund path back through Razorpay. Courier integration, tracking and refunds start at the Growth tier.",
  },
  {
    tag: "Catalogue",
    title: "Product data is the product",
    body: "Search, filters, related products and every recommendation run off structured data, not photographs. Consistent categories, real variant attributes and honest stock counts do more for conversion than a redesign. This is also the input we most often wait on. Timelines run from receipt of assets, so a prepared catalogue directly shortens the build.",
  },
  {
    tag: "Recovery",
    title: "Abandoned carts and lifecycle email",
    body: "Most people who add to cart do not check out on that visit. A recovery sequence and the ordinary lifecycle mails (confirmation, shipped, delivered) are the cheapest revenue in ecommerce because the intent already exists. Both are included from the Growth tier.",
  },
  {
    tag: "Measurement",
    title: "GA4 and Meta Pixel, set up properly",
    body: "Installing a tag is not measurement. What matters is conversion events firing on the right actions with the right values, so you can see which channel actually pays for itself rather than guessing from the platform's own reporting. Tracking and conversion setup are part of the Growth tier's quality pass.",
  },
];

/**
 * What an online store in India has to get right. General guidance the
 * studio builds into every store; the owner's CA or lawyer confirms what
 * applies to their category.
 */
export const COMPLIANCE_NOTE =
  "This is general guidance, not legal advice. We build these into every store; your CA or lawyer confirms what applies to your category and turnover.";

export const COMPLIANCE = [
  {
    title: "GST registration and invoicing",
    body: "Selling online across state lines generally needs GST registration regardless of turnover. Every invoice carries your GSTIN, the customer's if they have one, HSN codes and the right rate per product. Your store issues a tax invoice for every order, and the rates live on the catalogue from day one.",
    built: "Tax invoice PDF with GSTIN and HSN (Starter and up); GST fields on every product.",
  },
  {
    title: "Consumer Protection (E-Commerce) Rules, 2020",
    body: "Your legal name, address, contact details and a grievance officer's name and contact must be visible on the store. Complaints are acknowledged within 48 hours and resolved within a month. Return, refund, exchange and cancellation policies are stated clearly before purchase. Country of origin appears on listings for imported goods.",
    built: "Legal, contact and grievance pages; policy pages linked from checkout; country-of-origin field.",
  },
  {
    title: "Legal Metrology (Packaged Commodities)",
    body: "For pre-packaged goods sold online, the listing must show the MRP, net quantity, the manufacturer, packer or importer, country of origin, and customer-care details. This applies to the product page, not only the physical pack.",
    built: "Structured fields on the product page so nothing has to be typed into descriptions.",
  },
  {
    title: "Privacy and the DPDP Act, 2023",
    body: "Collect personal data only with notice and consent, for a stated purpose, and let people correct or delete it. A privacy policy that reflects what the store actually does, consent for marketing, and disclosure of analytics tools. Breaches have to be reported.",
    built: "Privacy policy and consent copy matched to the integrations we ship; marketing opt-in is separate from purchase.",
  },
  {
    title: "Payments, cards and refunds",
    body: "The Razorpay account is in your business name after KYC. Card details are never stored on your store (RBI tokenisation rules); the gateway handles them. Refunds go back by the original method within the window your policy states. COD collections are reconciled against courier remittances.",
    built: "Razorpay hosted checkout, refund path from the admin, COD reconciliation view (Growth and up).",
  },
  {
    title: "Category licences",
    body: "Some categories need a licence number on the store: FSSAI for food and supplements, BIS marks for certain electronics and toys, a drug licence for pharmacy, hallmarking for gold jewellery, and so on. Marketplaces and payment gateways ask for these too.",
    built: "Licence numbers and marks as first-class fields, shown where the rules want them.",
  },
  {
    title: "Policies the gateway will ask for",
    body: "Razorpay and every other gateway checks that Terms, Privacy, Shipping, Returns and Cancellation pages exist and match what the store does. Missing or copied policies are the most common reason a payments account is held.",
    built: "All five pages drafted from your answers on the call, linked from the footer and checkout.",
  },
];

/** Launching next. Pre-book a free trial from the portal. */
export const PRODUCTS = [
  {
    id: "modcon-hr",
    name: "Modcon HR",
    status: "Launching soon",
    summary: "An HR tool for small and growing Indian teams: people records, attendance and leave, documents, and payroll-ready exports, without enterprise software pricing.",
    trial: "Free trial for early sign-ups.",
  },
  {
    id: "realestate-crm",
    name: "Real Estate CRM",
    status: "Launching soon",
    summary: "A CRM built for builders, channel partners and agents: enquiries from every portal in one place, site-visit scheduling, follow-ups that don't slip, and inventory by project and unit.",
    trial: "Free trial for early sign-ups.",
  },
];
