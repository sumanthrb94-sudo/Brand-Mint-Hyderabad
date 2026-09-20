/**
 * THE ONLY FILE THAT CHANGES PER CLIENT.
 *
 * Everything else in store-template/ is identical across every WhatsApp Store
 * we ship. If you find yourself editing a second file to launch a shop, that
 * edit belongs here instead — that is the whole discipline, and it is the
 * difference between a template and a starting point.
 *
 * A launch is: copy the folder, fill this in, add products, deploy.
 *
 * NOTHING HERE IS INVENTED AT BUILD TIME. Every value is given by the client
 * on the call or in the brief (shared/brief.js in the studio repo). A phone
 * number, a GST number or a delivery promise that we made up is a liability
 * on their shopfront, not a placeholder.
 */

export const STORE = {
  // ---- identity
  name: "Demo Store",
  tagline: "Handmade in Hyderabad",
  domain: "demostore.in",

  // ---- the WhatsApp desk. THIS IS THE PRODUCT.
  // Country code + number, digits only, no + and no spaces — wa.me rejects
  // anything else and fails silently by opening a blank chat.
  whatsapp: "919999999999",
  // Shown on the order screen so the buyer knows when to expect a reply.
  replyWindow: "within 2 hours, 10am–8pm",

  // ---- money
  currency: "₹",
  // GST is charged ON TOP of listed prices when true, and treated as already
  // included when false. Getting this backwards is an invoicing error, not a
  // display error, so it is stated once here and never inferred elsewhere.
  gstExtra: true,
  gstRate: 0.18,
  gstin: "",                       // "" until the client gives it. Never guessed.

  // ---- delivery. Only promises the client actually made.
  delivery: {
    freeAbove: 1500,               // 0 disables the free-delivery line entirely
    flatFee: 79,
    codAvailable: true,
    codFee: 0,
    promise: "Dispatched in 2–3 working days",
  },

  // ---- catalogue shape
  categories: ["All", "New in", "Best sellers"],

  // ---- brand. Tokens, not scattered hex — styles.css reads only these.
  theme: {
    ink: "#0a0e0c",
    paper: "#f5f1ea",
    surface: "#ffffff",
    accent: "#10b981",
    accentDeep: "#047857",
    display: '"Plus Jakarta Sans", system-ui, sans-serif',
    text: '"Inter", system-ui, sans-serif',
  },

  // ---- source of products.
  // "local" reads data/products.json — the store is fully browsable before the
  // client's Firebase project exists, which is what lets us demo on day two of
  // a build instead of day nine.
  // "firestore" reads the live collection once it is wired.
  catalogueSource: "local",
  firestore: { projectId: "", collection: "products" },
};
