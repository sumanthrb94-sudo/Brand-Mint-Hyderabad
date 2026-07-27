// GENERATED FILE — DO NOT EDIT BY HAND.
// Source: commerce-skeleton/src/config/features.ts
// Regenerate: node tools/gen-catalog.mjs
//
// One source of truth for what we sell and what it costs. The quote CLI and
// this portal read the same numbers, so a price shown to a client here can
// never disagree with one computed on the command line.

export const CATALOG = {
  "generatedFrom": "commerce-skeleton/src/config/features.ts",
  "dayRate": 10000,
  "floorDayRate": 8000,
  "minimumEngagement": 25000,
  "terms": {
    "warrantyDays": 30,
    "reviewRoundsIncluded": 2,
    "extraReviewRound": 15000,
    "paymentSchedule": "50% to start, 50% at launch",
    "gst": "GST extra at 18%",
    "gstRate": 0.18
  },
  "scaleMultiplier": {
    "small": 0.8,
    "standard": 1,
    "large": 1.4,
    "enterprise": 2
  },
  "scaleLabels": {
    "small": "Small — under 25 products, one admin",
    "standard": "Standard — up to 200 products, small team",
    "large": "Large — up to 2,000 products, multiple admins",
    "enterprise": "Enterprise — unbounded catalog, roles and audit"
  },
  "categoryLabels": {
    "foundation": "Foundation",
    "catalog": "Catalog",
    "commerce": "Commerce",
    "fulfilment": "Fulfilment",
    "support": "Support",
    "content": "Content & media",
    "growth": "Growth",
    "platform": "Business platforms"
  },
  "presets": {
    "static-brochure": {
      "label": "Static brochure site",
      "featureIds": [
        "static-site",
        "deployment",
        "seo-schema",
        "image-system"
      ],
      "scale": "small"
    },
    "dynamic-site": {
      "label": "Dynamic website",
      "featureIds": [
        "dynamic-site",
        "deployment",
        "seo-schema",
        "image-system",
        "analytics"
      ],
      "scale": "standard"
    },
    "catalog-only": {
      "label": "Catalog site (browse, no checkout)",
      "featureIds": [
        "dynamic-site",
        "deployment",
        "catalog-basic",
        "image-system",
        "seo-schema",
        "analytics"
      ],
      "scale": "standard"
    },
    "commerce-cod": {
      "label": "Store — cash on delivery",
      "featureIds": [
        "dynamic-site",
        "deployment",
        "catalog-basic",
        "inventory",
        "cart-cod",
        "order-management",
        "notifications",
        "image-system",
        "analytics"
      ],
      "scale": "standard"
    },
    "commerce-full": {
      "label": "Store — online payments, returns, invoicing",
      "featureIds": [
        "dynamic-site",
        "deployment",
        "catalog-basic",
        "catalog-bulk",
        "inventory",
        "cart-cod",
        "payments",
        "coupons",
        "gst-invoicing",
        "order-management",
        "delivery-tracking",
        "returns-refunds",
        "notifications",
        "image-system",
        "analytics",
        "seo-schema"
      ],
      "scale": "large"
    },
    "commerce-platform": {
      "label": "Commerce platform — everything, with support and growth",
      "featureIds": [
        "dynamic-site",
        "deployment",
        "catalog-basic",
        "catalog-bulk",
        "inventory",
        "cart-cod",
        "payments",
        "coupons",
        "gst-invoicing",
        "order-management",
        "delivery-tracking",
        "returns-refunds",
        "chat-support",
        "auto-replies",
        "notifications",
        "image-system",
        "video-system",
        "instagram",
        "analytics",
        "seo-schema"
      ],
      "scale": "enterprise"
    }
  },
  "features": [
    {
      "id": "static-site",
      "label": "Static marketing site",
      "category": "foundation",
      "summary": "Brochure site — pages, copy, images, contact form. No database.",
      "buildDays": 3,
      "monthlyDays": 0,
      "needsServer": false,
      "readiness": "ready",
      "evidence": [],
      "delivers": [],
      "requires": [
        "Copy for each page, or a brief for us to write it",
        "Logo and brand assets",
        "Domain registrar access — add hello@brandmintstudios.in as a user"
      ],
      "modules": [
        "pages",
        "contact-form",
        "seo"
      ],
      "thirdPartyCost": [],
      "dependsOn": [],
      "stack": "Astro or Next static export · Vercel",
      "howToBuild": "Build from a content collection, one component per section, no database. Deploy to Vercel with cleanUrls. Trap: do not add a CMS 'just in case' — the moment content needs editing it is the dynamic tier and should be priced as one."
    },
    {
      "id": "dynamic-site",
      "label": "Dynamic website",
      "category": "foundation",
      "summary": "Content-managed site — you edit pages, posts and images yourself.",
      "buildDays": 5,
      "monthlyDays": 0,
      "needsServer": true,
      "readiness": "ready",
      "evidence": [],
      "delivers": [],
      "requires": [
        "Content structure: what you want to be able to edit",
        "Who administers the site"
      ],
      "modules": [
        "pages",
        "cms",
        "auth",
        "admin-shell"
      ],
      "thirdPartyCost": [],
      "dependsOn": [],
      "stack": "Next.js App Router · Firestore · shadcn/ui",
      "howToBuild": "Content lives in Firestore collections; the admin shell sits behind auth; public pages render server-side and revalidate. Agree who edits what BEFORE designing the schema — retrofitting an editable field is a rewrite of the form, the rules and the migration."
    },
    {
      "id": "deployment",
      "label": "Deployment & domain setup",
      "category": "foundation",
      "summary": "Live on your domain with HTTPS, previews and rollback.",
      "buildDays": 1,
      "monthlyDays": 0,
      "needsServer": false,
      "readiness": "ready",
      "evidence": [],
      "delivers": [],
      "requires": [
        "Domain registrar access — add hello@brandmintstudios.in as a user on your own account",
        "Confirmation of the exact domain to use"
      ],
      "modules": [
        "vercel-config",
        "dns",
        "preview-envs"
      ],
      "thirdPartyCost": [
        "Vercel (free tier usually sufficient)",
        "Domain registration ~₹1,000/yr"
      ],
      "dependsOn": [],
      "stack": "Vercel · your registrar's DNS",
      "howToBuild": "Create the project, point DNS, add the domain, promote by hand so a push never goes live on its own. Trap: add the live host to Firebase authorized domains or sign-in fails with auth/unauthorized-domain and looks like a code bug."
    },
    {
      "id": "catalog-basic",
      "label": "Product catalog",
      "category": "catalog",
      "summary": "Browsable products with categories, search and detail pages.",
      "buildDays": 4,
      "monthlyDays": 0,
      "needsServer": true,
      "readiness": "ready",
      "evidence": [],
      "delivers": [],
      "requires": [
        "Product list: name, category, price, unit",
        "Product photographs",
        "Category structure"
      ],
      "modules": [
        "catalog",
        "search",
        "product-detail"
      ],
      "thirdPartyCost": [],
      "dependsOn": [
        "dynamic-site"
      ],
      "stack": "Firestore · Next server components",
      "howToBuild": "Take the product model from FreshKart src/lib/types.ts. Server-render list and detail, client-side search index under ~500 SKUs, Typesense above that. Trap: capture unit price onto the order line at order time — a later price change must never rewrite history."
    },
    {
      "id": "catalog-bulk",
      "label": "Bulk catalog (100+ SKUs)",
      "category": "catalog",
      "summary": "Import, bulk edit and price-update tooling for a large catalog.",
      "buildDays": 3,
      "monthlyDays": 0,
      "needsServer": true,
      "readiness": "ready",
      "evidence": [],
      "delivers": [],
      "requires": [
        "Catalog as a spreadsheet — one row per SKU",
        "Who maintains prices, and how often they change"
      ],
      "modules": [
        "csv-import",
        "bulk-edit",
        "price-history"
      ],
      "thirdPartyCost": [],
      "dependsOn": [
        "catalog-basic"
      ],
      "stack": "papaparse · Firestore batch writes",
      "howToBuild": "CSV in, dry-run diff shown before anything commits, then a batched write with a price-history row per change. Lift the shape from FreshKart admin/prices. Trap: never import without a preview — one bad column silently reprices the whole catalogue."
    },
    {
      "id": "inventory",
      "label": "Inventory & stock",
      "category": "catalog",
      "summary": "Stock counts, out-of-stock handling, low-stock alerts.",
      "buildDays": 2,
      "monthlyDays": 0,
      "needsServer": true,
      "readiness": "ready",
      "evidence": [],
      "delivers": [],
      "requires": [
        "Opening stock per SKU",
        "Low-stock threshold you want alerting on"
      ],
      "modules": [
        "stock",
        "low-stock-alerts"
      ],
      "thirdPartyCost": [],
      "dependsOn": [
        "catalog-basic"
      ],
      "stack": "Firestore transactions",
      "howToBuild": "A stock field per SKU, decremented inside the same transaction that writes the order. Trap: read-then-write loses the last unit under concurrency — it must be a transaction, not two operations."
    },
    {
      "id": "cart-cod",
      "label": "Cart & cash on delivery",
      "category": "commerce",
      "summary": "Add to cart, checkout, COD orders. No payment gateway needed.",
      "buildDays": 4,
      "monthlyDays": 0,
      "needsServer": true,
      "readiness": "ready",
      "evidence": [],
      "delivers": [],
      "requires": [
        "Delivery pin codes you serve",
        "COD order value limits, if any",
        "Delivery fee rules"
      ],
      "modules": [
        "cart",
        "checkout-cod",
        "orders"
      ],
      "thirdPartyCost": [],
      "dependsOn": [
        "catalog-basic"
      ],
      "stack": "React context · commerce-core",
      "howToBuild": "Lift Tresor's CartContext, persist to localStorage for recovery, and drive every status change through commerce-core's transition(). Trap: recompute the total server-side at checkout. A cart total posted from the browser is a number the customer chose."
    },
    {
      "id": "payments",
      "label": "Online payments (Razorpay)",
      "category": "commerce",
      "summary": "Cards, UPI and netbanking, with webhook reconciliation.",
      "buildDays": 4,
      "monthlyDays": 0,
      "needsServer": true,
      "readiness": "ready",
      "evidence": [],
      "delivers": [],
      "requires": [
        "Razorpay account — add hello@brandmintstudios.in as a team member on your own account",
        "Business PAN and GSTIN for Razorpay KYC",
        "Settlement bank account verified inside Razorpay"
      ],
      "modules": [
        "checkout-online",
        "payment-webhook",
        "reconciliation"
      ],
      "thirdPartyCost": [
        "Razorpay ~2% + GST per transaction"
      ],
      "dependsOn": [
        "cart-cod"
      ],
      "stack": "Razorpay Orders API · checkout.js · Vercel /api",
      "howToBuild": "Create the order server-side, open checkout with that id, then reconcile in a webhook — verifying the signature with HMAC-SHA256. Port Tresor api/payments/*. Trap: reconcile on the webhook, never the redirect; customers close the tab and the money still arrives."
    },
    {
      "id": "coupons",
      "label": "Coupons & offers",
      "category": "commerce",
      "summary": "Discount codes with limits, expiry and category rules.",
      "buildDays": 1.5,
      "monthlyDays": 0,
      "needsServer": true,
      "readiness": "ready",
      "evidence": [],
      "delivers": [],
      "requires": [
        "The offers you want to run at launch"
      ],
      "modules": [
        "coupons",
        "offers-panel"
      ],
      "thirdPartyCost": [],
      "dependsOn": [
        "cart-cod"
      ],
      "stack": "commerce-core/coupons",
      "howToBuild": "Already built and tested — wire the admin CRUD and apply it server-side at checkout. Trap: validate on the server. A discount computed in the browser is a discount the customer sets."
    },
    {
      "id": "gst-invoicing",
      "label": "GST invoicing",
      "category": "commerce",
      "summary": "Compliant tax invoices with sequential numbering and PDF download.",
      "buildDays": 3,
      "monthlyDays": 0,
      "needsServer": true,
      "readiness": "ready",
      "evidence": [],
      "delivers": [],
      "requires": [
        "GSTIN, registered legal name and address",
        "HSN/SAC codes for what you sell",
        "Invoice series prefix"
      ],
      "modules": [
        "invoice",
        "invoice-pdf",
        "gst-split"
      ],
      "thirdPartyCost": [],
      "dependsOn": [
        "cart-cod"
      ],
      "stack": "commerce-core/gst · serverless PDF",
      "howToBuild": "splitGst decides CGST+SGST vs IGST from the state codes; a Firestore transaction issues the sequential number; a serverless function renders the PDF. Trap: invoice numbers must never skip or repeat — that is a filing problem, not a bug."
    },
    {
      "id": "order-management",
      "label": "Order management",
      "category": "fulfilment",
      "summary": "Admin console to move orders through the pipeline.",
      "buildDays": 3,
      "monthlyDays": 0,
      "needsServer": true,
      "readiness": "ready",
      "evidence": [],
      "delivers": [],
      "requires": [
        "Your fulfilment stages, in order",
        "Who processes orders"
      ],
      "modules": [
        "admin-orders",
        "order-state-machine",
        "status-history"
      ],
      "thirdPartyCost": [],
      "dependsOn": [
        "cart-cod"
      ],
      "stack": "commerce-core state machine · admin queue",
      "howToBuild": "One admin screen over transition(). Every move is validated, every move is logged. Trap: never assign order.status directly — that is exactly how a cancelled order got marked shipped in one app and not the other."
    },
    {
      "id": "delivery-tracking",
      "label": "Delivery & tracking",
      "category": "fulfilment",
      "summary": "Courier integration and a customer-facing tracking page.",
      "buildDays": 3,
      "monthlyDays": 0,
      "needsServer": true,
      "readiness": "ready",
      "evidence": [],
      "delivers": [],
      "requires": [
        "Courier or aggregator you use — add hello@brandmintstudios.in as a user",
        "Pickup address and cut-off times"
      ],
      "modules": [
        "tracking",
        "courier-webhook",
        "awb-capture"
      ],
      "thirdPartyCost": [
        "Courier aggregator, per shipment"
      ],
      "dependsOn": [
        "order-management"
      ],
      "stack": "one aggregator (Shiprocket / Delhivery) · webhook",
      "howToBuild": "Push the shipment, store the AWB on the order, take status back by webhook, show a customer tracking page. Trap: integrate ONE aggregator. Two doubles the surface and halves the reliability."
    },
    {
      "id": "returns-refunds",
      "label": "Returns & refunds",
      "category": "fulfilment",
      "summary": "Customer return requests, your approval queue, refund back to source.",
      "buildDays": 4,
      "monthlyDays": 0,
      "needsServer": true,
      "readiness": "ready",
      "evidence": [],
      "delivers": [],
      "requires": [
        "Your written returns policy and window",
        "Who approves a return",
        "Restocking rules, if any"
      ],
      "modules": [
        "returns",
        "return-approval",
        "refund-handler"
      ],
      "thirdPartyCost": [],
      "dependsOn": [
        "order-management"
      ],
      "stack": "FreshKart returns.ts · Razorpay refunds API",
      "howToBuild": "Customer raises a request against a delivered order, it lands in an approval queue, approval triggers the refund. Trap: refunds must be idempotent — a double-click must not refund twice."
    },
    {
      "id": "chat-support",
      "label": "Chat support",
      "category": "support",
      "summary": "In-site chat with an inbox and office-hours handling.",
      "buildDays": 3,
      "monthlyDays": 1,
      "needsServer": true,
      "readiness": "ready",
      "evidence": [],
      "delivers": [],
      "requires": [
        "Who answers, and during which hours",
        "Chat provider account, if you have a preference — add hello@brandmintstudios.in as a user on your own account"
      ],
      "modules": [
        "chat-widget",
        "chat-inbox",
        "availability"
      ],
      "thirdPartyCost": [
        "Chat provider, if a hosted one is chosen"
      ],
      "dependsOn": [],
      "stack": "Firestore conversations · admin inbox (or Crisp)",
      "howToBuild": "Widget writes to a conversation collection, admin inbox reads it live, availability rules handle out-of-hours. Hosted is fine if they have a preference. Trap: set office hours in the product or you have silently promised 24/7."
    },
    {
      "id": "auto-replies",
      "label": "Automated replies",
      "category": "support",
      "summary": "Answers common questions automatically, escalates the rest.",
      "buildDays": 3,
      "monthlyDays": 0.5,
      "needsServer": true,
      "readiness": "ready",
      "evidence": [],
      "delivers": [],
      "requires": [
        "Your top questions and the answers you want given",
        "What must always reach a human"
      ],
      "modules": [
        "intent-match",
        "reply-templates",
        "escalation",
        "reply-audit"
      ],
      "thirdPartyCost": [
        "LLM API usage, metered"
      ],
      "dependsOn": [
        "chat-support"
      ],
      "stack": "intent match · LLM fallback · escalation",
      "howToBuild": "Match the top questions first and only fall through to an LLM when nothing matches — cheaper, faster, and far more predictable. Trap: log every automated reply. Without an audit trail you cannot answer 'what did it tell my customer'."
    },
    {
      "id": "notifications",
      "label": "Email & SMS notifications",
      "category": "support",
      "summary": "Order, shipping and payment notifications to customers.",
      "buildDays": 2,
      "monthlyDays": 0,
      "needsServer": true,
      "readiness": "ready",
      "evidence": [],
      "delivers": [],
      "requires": [
        "Sending domain — add hello@brandmintstudios.in to your DNS or email provider",
        "Approved message wording"
      ],
      "modules": [
        "templates",
        "dispatch-queue",
        "delivery-log"
      ],
      "thirdPartyCost": [
        "Email sending ~₹0.10/mail",
        "SMS ~₹0.20/message"
      ],
      "dependsOn": [],
      "stack": "Resend (email) · MSG91 (SMS India) · queue",
      "howToBuild": "Templates in code, a dispatch queue in Firestore, a serverless worker sending and recording delivery. Trap: Indian SMS needs DLT registration and pre-approved templates — start that paperwork in week one, it is not a code task."
    },
    {
      "id": "image-system",
      "label": "Image system",
      "category": "content",
      "summary": "Automatic compression, modern formats and consistent crops.",
      "buildDays": 2,
      "monthlyDays": 0,
      "needsServer": false,
      "readiness": "ready",
      "evidence": [],
      "delivers": [],
      "requires": [
        "Source images at highest available resolution",
        "Crop ratio and background preference"
      ],
      "modules": [
        "image-pipeline",
        "responsive-srcset"
      ],
      "thirdPartyCost": [],
      "dependsOn": [],
      "stack": "sharp / next-image · AVIF + WebP",
      "howToBuild": "One pipeline: source at max resolution, generate responsive sizes, serve modern formats with a blur placeholder. Trap: get originals at the highest resolution available up front. You cannot un-compress what the client sent from WhatsApp."
    },
    {
      "id": "video-system",
      "label": "Video system",
      "category": "content",
      "summary": "Generated product and brand video, hosted and embedded.",
      "buildDays": 4,
      "monthlyDays": 1,
      "needsServer": true,
      "readiness": "ready",
      "evidence": [],
      "delivers": [],
      "requires": [
        "Higgsfield account — add hello@brandmintstudios.in as a user on your own account",
        "Brand assets and any script or shot direction",
        "Written confirmation you hold rights to all source material"
      ],
      "modules": [
        "render-pipeline",
        "asset-store",
        "player"
      ],
      "thirdPartyCost": [
        "Higgsfield or equivalent, per render"
      ],
      "dependsOn": [],
      "stack": "Remotion or ffmpeg · serverless render",
      "howToBuild": "Compose programmatically, render on a queue, host and embed. Trap: Remotion is free at your size but needs a paid company licence above three people — plan for it before it is a surprise invoice."
    },
    {
      "id": "instagram",
      "label": "Instagram integration",
      "category": "growth",
      "summary": "Feed on site, scheduled posting, comment and DM auto-reply.",
      "buildDays": 4,
      "monthlyDays": 1,
      "needsServer": true,
      "readiness": "ready",
      "evidence": [],
      "delivers": [],
      "requires": [
        "Instagram Business account linked to a Facebook Page",
        "Add hello@brandmintstudios.in as a user in Meta Business Suite — never send login details",
        "Confirmation you accept Meta's automated-messaging policies"
      ],
      "modules": [
        "meta-graph-client",
        "token-refresh",
        "scheduler",
        "reply-automation"
      ],
      "thirdPartyCost": [],
      "dependsOn": [],
      "stack": "Meta Graph API · token refresh job",
      "howToBuild": "Business account linked to a Page, long-lived token with a scheduled refresh, then feed embed, scheduler and reply automation. Trap: tokens expire. A refresh job you never wrote is an integration that dies in sixty days."
    },
    {
      "id": "analytics",
      "label": "Analytics",
      "category": "growth",
      "summary": "Traffic and conversion reporting, privacy-friendly.",
      "buildDays": 1,
      "monthlyDays": 0,
      "needsServer": false,
      "readiness": "ready",
      "evidence": [],
      "delivers": [],
      "requires": [
        "Which events matter to you"
      ],
      "modules": [
        "events",
        "dashboard"
      ],
      "thirdPartyCost": [],
      "dependsOn": [],
      "stack": "Vercel Analytics or Plausible",
      "howToBuild": "Instrument the five events that matter, not everything. Trap: decide those five with the client first, or you will build a dashboard nobody opens."
    },
    {
      "id": "seo-schema",
      "label": "SEO & structured data",
      "category": "growth",
      "summary": "Schema markup, sitemaps and per-page metadata.",
      "buildDays": 1.5,
      "monthlyDays": 0,
      "needsServer": false,
      "readiness": "ready",
      "evidence": [],
      "delivers": [],
      "requires": [
        "Target keywords, if you have them"
      ],
      "modules": [
        "schema",
        "sitemap",
        "meta"
      ],
      "thirdPartyCost": [],
      "dependsOn": [],
      "stack": "JSON-LD · Next metadata API · sitemap",
      "howToBuild": "Structured data per page type, generated sitemap, per-page metadata. Trap: schema that does not match visible page content is a manual action from Google, not a ranking boost."
    },
    {
      "id": "whatsapp-notifications",
      "label": "WhatsApp order notifications",
      "category": "support",
      "summary": "Order and shipping updates on WhatsApp",
      "buildDays": 3,
      "monthlyDays": 0,
      "needsServer": true,
      "readiness": "next",
      "evidence": [],
      "delivers": [
        "Order and shipping updates on WhatsApp",
        "Delivery receipts",
        "Opt-out handling"
      ],
      "requires": [
        "WhatsApp Business account — add hello@brandmintstudios.in as a user in Meta Business Suite",
        "Approved message templates (Meta reviews these)"
      ],
      "modules": [
        "whatsapp"
      ],
      "thirdPartyCost": [
        "WhatsApp Business API, per conversation"
      ],
      "dependsOn": [],
      "stack": "Meta WhatsApp Business API via a BSP",
      "howToBuild": "Register templates with Meta, send through the BSP, handle delivery receipts and opt-outs. Trap: template approval takes days and rejections are common — submit before you need them, and never send outside an approved template."
    },
    {
      "id": "abandoned-cart",
      "label": "Abandoned cart recovery",
      "category": "commerce",
      "summary": "Detects abandoned carts",
      "buildDays": 2.5,
      "monthlyDays": 0,
      "needsServer": true,
      "readiness": "next",
      "evidence": [],
      "delivers": [
        "Detects abandoned carts",
        "Timed recovery messages",
        "Recovered-revenue reporting"
      ],
      "requires": [
        "How long before a cart counts as abandoned",
        "Approved message wording"
      ],
      "modules": [
        "abandoned-cart"
      ],
      "thirdPartyCost": [],
      "dependsOn": [
        "cart-cod"
      ],
      "stack": "cart events · scheduled recovery",
      "howToBuild": "Mark carts idle after an agreed window, send a recovery message, attribute recovered revenue so the feature can prove itself. Trap: one message, not a sequence. Three is spam and gets the sending domain flagged."
    },
    {
      "id": "loyalty",
      "label": "Loyalty & rewards",
      "category": "commerce",
      "summary": "Points on purchase",
      "buildDays": 4,
      "monthlyDays": 0,
      "needsServer": true,
      "readiness": "next",
      "evidence": [],
      "delivers": [
        "Points on purchase",
        "Redemption at checkout",
        "Tiers and balances"
      ],
      "requires": [
        "Earn and burn rules",
        "Expiry policy"
      ],
      "modules": [
        "loyalty"
      ],
      "thirdPartyCost": [],
      "dependsOn": [
        "cart-cod"
      ],
      "stack": "points ledger · redemption at checkout",
      "howToBuild": "An append-only ledger — never a mutable balance field — with redemption applied server-side. Trap: an append-only ledger is what lets you answer 'why do I have these points', which is the only support question this feature generates."
    },
    {
      "id": "subscriptions",
      "label": "Subscriptions & repeat orders",
      "category": "commerce",
      "summary": "Recurring order schedules",
      "buildDays": 5,
      "monthlyDays": 0,
      "needsServer": true,
      "readiness": "next",
      "evidence": [],
      "delivers": [
        "Recurring order schedules",
        "Mandate handling",
        "Pause, skip and cancel"
      ],
      "requires": [
        "Delivery frequencies you support",
        "Recurring payments (eMandate) switched on in Razorpay — request it from their support. Access comes with the payments feature."
      ],
      "modules": [
        "subscriptions"
      ],
      "thirdPartyCost": [
        "Razorpay recurring mandate fees"
      ],
      "dependsOn": [
        "payments"
      ],
      "stack": "Razorpay eMandate · scheduler",
      "howToBuild": "Plans, a mandate per customer, a scheduler creating orders, plus pause, skip and cancel. Trap: build pause and skip on day one. Without them the only self-service option is cancel."
    },
    {
      "id": "pos",
      "label": "Point of sale / counter billing",
      "category": "commerce",
      "summary": "Counter billing screen",
      "buildDays": 5,
      "monthlyDays": 0,
      "needsServer": true,
      "readiness": "ready",
      "evidence": [
        "FreshKart (admin/pos)"
      ],
      "delivers": [
        "Counter billing screen",
        "Offline-tolerant cart",
        "Shared stock with the online store"
      ],
      "requires": [
        "Counter hardware and printer model",
        "Who operates the till"
      ],
      "modules": [
        "pos"
      ],
      "thirdPartyCost": [],
      "dependsOn": [
        "catalog-basic"
      ],
      "stack": "offline-first queue · thermal receipt printing",
      "howToBuild": "Counter screen with an offline-tolerant queue sharing stock with the online store. Extract from FreshKart admin/pos. Trap: the till must keep working when the internet does not — queue locally and sync."
    },
    {
      "id": "multi-vendor",
      "label": "Multi-vendor marketplace",
      "category": "commerce",
      "summary": "Vendor onboarding and storefronts",
      "buildDays": 15,
      "monthlyDays": 0,
      "needsServer": true,
      "readiness": "next",
      "evidence": [
        "B2Bmandi"
      ],
      "delivers": [
        "Vendor onboarding and storefronts",
        "Split orders per vendor",
        "Commission and payout reporting"
      ],
      "requires": [
        "Commission model",
        "Who approves a vendor",
        "Payout schedule"
      ],
      "modules": [
        "marketplace"
      ],
      "thirdPartyCost": [],
      "dependsOn": [
        "payments",
        "order-management"
      ],
      "stack": "vendor accounts · order splitting · commission ledger",
      "howToBuild": "Vendors onboard to their own storefront, orders split per vendor, commission accrues to a ledger, payouts run on a schedule. Trap: settle the commission model in writing before building. Changing it later rewrites the ledger and every historical payout."
    },
    {
      "id": "crm",
      "label": "CRM / pipeline",
      "category": "platform",
      "summary": "Contacts and companies",
      "buildDays": 10,
      "monthlyDays": 0,
      "needsServer": true,
      "readiness": "ready",
      "evidence": [
        "REAL-ESTATE-CRM",
        "MODEX"
      ],
      "delivers": [
        "Contacts and companies",
        "Pipeline stages with drag-and-drop",
        "Activity log and reminders"
      ],
      "requires": [
        "Your pipeline stages, in order",
        "What counts as a qualified lead"
      ],
      "modules": [
        "crm"
      ],
      "thirdPartyCost": [],
      "dependsOn": [],
      "stack": "Next.js · Firestore · shared admin shell",
      "howToBuild": "Contacts, a drag-and-drop pipeline, an activity log. Extract from REAL-ESTATE-CRM. Trap: model their pipeline stages, not a generic one. A CRM that does not match how they sell will not be opened twice."
    },
    {
      "id": "hrms",
      "label": "HR / attendance / payroll inputs",
      "category": "platform",
      "summary": "Employee records",
      "buildDays": 12,
      "monthlyDays": 0,
      "needsServer": true,
      "readiness": "ready",
      "evidence": [
        "Modcon-HR"
      ],
      "delivers": [
        "Employee records",
        "Attendance and leave",
        "Payroll input export"
      ],
      "requires": [
        "Leave policy",
        "Attendance method (app, biometric, manual)",
        "Payroll provider you export to"
      ],
      "modules": [
        "hrms"
      ],
      "thirdPartyCost": [],
      "dependsOn": [],
      "stack": "Next.js · Firestore · payroll export",
      "howToBuild": "Employee records, attendance, leave, and an export their payroll provider actually accepts. Extract from Modcon-HR. Trap: confirm the payroll export format on day one — it is the only deliverable that must be byte-correct."
    },
    {
      "id": "approvals",
      "label": "Approvals & workflow engine",
      "category": "platform",
      "summary": "Multi-step approval chains",
      "buildDays": 8,
      "monthlyDays": 0,
      "needsServer": true,
      "readiness": "next",
      "evidence": [],
      "delivers": [
        "Multi-step approval chains",
        "Role-based routing",
        "Full audit trail"
      ],
      "requires": [
        "Who approves what, and in what order",
        "Escalation rules"
      ],
      "modules": [
        "approvals"
      ],
      "thirdPartyCost": [],
      "dependsOn": [],
      "stack": "state machine · role routing · audit trail",
      "howToBuild": "Chains defined as data, not code, so a rule change is configuration. Trap: build escalation from the start. Approvals that stall with no timeout become the reason people go back to email."
    },
    {
      "id": "reporting",
      "label": "Reporting dashboard",
      "category": "platform",
      "summary": "The numbers you actually review",
      "buildDays": 5,
      "monthlyDays": 0,
      "needsServer": true,
      "readiness": "ready",
      "evidence": [
        "FreshKart (admin/reports)",
        "InventoryManager"
      ],
      "delivers": [
        "The numbers you actually review",
        "Scheduled exports",
        "Date-range comparison"
      ],
      "requires": [
        "Which five numbers you review weekly"
      ],
      "modules": [
        "reporting"
      ],
      "thirdPartyCost": [],
      "dependsOn": [],
      "stack": "Firestore aggregation · scheduled exports",
      "howToBuild": "Pre-aggregate the numbers they review weekly; do not compute them per page load. Extract from FreshKart admin/reports. Trap: ask which five numbers they check on a Monday and build exactly those."
    },
    {
      "id": "rag-docs",
      "label": "Ask-your-documents (RAG)",
      "category": "growth",
      "summary": "Answers grounded in your own documents",
      "buildDays": 10,
      "monthlyDays": 0,
      "needsServer": true,
      "readiness": "next",
      "evidence": [],
      "delivers": [
        "Answers grounded in your own documents",
        "Citations back to the source",
        "Eval suite over the top questions"
      ],
      "requires": [
        "The document set, and who owns it",
        "Who may ask questions of it"
      ],
      "modules": [
        "rag"
      ],
      "thirdPartyCost": [
        "LLM API usage, metered",
        "Vector store hosting"
      ],
      "dependsOn": [],
      "stack": "embeddings · pgvector or Firestore vector · promptfoo",
      "howToBuild": "Ingest, chunk, embed, retrieve, answer WITH citations back to the source. Build the eval suite alongside, not after. Trap: an answer without a citation cannot be checked, and an unverifiable answer is worse than no answer."
    },
    {
      "id": "doc-extraction",
      "label": "Invoice & document extraction",
      "category": "growth",
      "summary": "Structured data out of invoices, POs and bills",
      "buildDays": 8,
      "monthlyDays": 0,
      "needsServer": true,
      "readiness": "next",
      "evidence": [],
      "delivers": [
        "Structured data out of invoices, POs and bills",
        "Human review queue for low confidence",
        "Export to your accounting tool"
      ],
      "requires": [
        "50 sample documents",
        "The fields you need extracted",
        "Accuracy you will accept"
      ],
      "modules": [
        "extraction"
      ],
      "thirdPartyCost": [
        "LLM API usage, per document"
      ],
      "dependsOn": [],
      "stack": "LLM structured output · confidence routing",
      "howToBuild": "Extract to a strict schema, route anything low-confidence to a human queue, export to their accounting tool. Trap: get 50 real sample documents before quoting. Invoice layouts vary far more than anyone expects."
    },
    {
      "id": "lead-qualifier",
      "label": "Lead qualification agent",
      "category": "growth",
      "summary": "Qualifies inbound enquiries against your rubric",
      "buildDays": 5,
      "monthlyDays": 0,
      "needsServer": true,
      "readiness": "next",
      "evidence": [],
      "delivers": [
        "Qualifies inbound enquiries against your rubric",
        "Books straight into your calendar",
        "Escalates anything it is unsure about"
      ],
      "requires": [
        "Your qualification rubric",
        "Calendar access — add hello@brandmintstudios.in as a user"
      ],
      "modules": [
        "lead-qualifier"
      ],
      "thirdPartyCost": [
        "LLM API usage, metered"
      ],
      "dependsOn": [],
      "stack": "LLM rubric · calendar API",
      "howToBuild": "Intake form, LLM scores against the written rubric, qualified leads book straight into the calendar, everything uncertain escalates. Trap: write the rubric down first — you cannot automate a judgement nobody has articulated."
    },
    {
      "id": "voice-agent",
      "label": "Voice agent — inbound calls",
      "category": "growth",
      "summary": "Answers the phone",
      "buildDays": 8,
      "monthlyDays": 0,
      "needsServer": true,
      "readiness": "later",
      "evidence": [],
      "delivers": [
        "Answers the phone",
        "Books, reschedules and answers FAQs",
        "Hands off to a human on request",
        "Call transcripts and recordings"
      ],
      "requires": [
        "Phone number and telephony provider — add hello@brandmintstudios.in as a user",
        "What it may and may not say",
        "Who it hands off to, and when",
        "Written consent to record calls, per Indian law"
      ],
      "modules": [
        "voice-agent"
      ],
      "thirdPartyCost": [
        "Telephony per minute",
        "Speech-to-text and text-to-speech per minute",
        "LLM per call"
      ],
      "dependsOn": [],
      "stack": "Exotel/Twilio · STT · LLM · TTS",
      "howToBuild": "Telephony in, speech to text, an LLM turn, speech back, with a clean handoff to a human. Sell a paid discovery day FIRST. Trap: latency is the product — over roughly a second of silence and callers hang up. Recording consent is a legal requirement, not a setting."
    },
    {
      "id": "internal-copilot",
      "label": "Internal copilot over your tools",
      "category": "growth",
      "summary": "Answers questions across your own systems",
      "buildDays": 15,
      "monthlyDays": 0,
      "needsServer": true,
      "readiness": "later",
      "evidence": [],
      "delivers": [
        "Answers questions across your own systems",
        "Drafts routine replies",
        "Audit log of everything it did"
      ],
      "requires": [
        "Which systems it may read",
        "What it may never do without a human"
      ],
      "modules": [
        "copilot"
      ],
      "thirdPartyCost": [
        "LLM API usage, metered"
      ],
      "dependsOn": [],
      "stack": "tool registry · planner · audit log",
      "howToBuild": "Register the tools it may call, plan, execute, and log everything. Discovery day first. Trap: define what it may NEVER do without a human before you define what it can do."
    },
    {
      "id": "brand-system",
      "label": "Brand system + working brand book",
      "category": "content",
      "summary": "Mark, wordmark, monogram, favicon",
      "buildDays": 20,
      "monthlyDays": 0,
      "needsServer": false,
      "readiness": "ready",
      "evidence": [
        "The Green Team",
        "Tresor Couture",
        "BRANDMINT"
      ],
      "delivers": [
        "Mark, wordmark, monogram, favicon",
        "Type and colour system",
        "Voice and tone guide",
        "Brand book as a working site, not a PDF"
      ],
      "requires": [
        "Competitor set you admire",
        "Who signs off the direction"
      ],
      "modules": [
        "brand"
      ],
      "thirdPartyCost": [],
      "dependsOn": [],
      "stack": "Figma · design tokens · a brand book site",
      "howToBuild": "Three directions, narrow to one, then export tokens and ship the brand book as a working site rather than a PDF. Trap: agree who signs off the direction before you present. Design by committee doubles every round."
    },
    {
      "id": "reel-pack",
      "label": "Short-form video pack",
      "category": "content",
      "summary": "4 short-form videos per month",
      "buildDays": 2.5,
      "monthlyDays": 2.5,
      "needsServer": false,
      "readiness": "next",
      "evidence": [],
      "delivers": [
        "4 short-form videos per month",
        "Captions and sound design",
        "Sized for Reels, Shorts and TikTok"
      ],
      "requires": [
        "Source footage or product access",
        "Written confirmation you hold rights to all material"
      ],
      "modules": [
        "video"
      ],
      "thirdPartyCost": [],
      "dependsOn": [],
      "stack": "ffmpeg / Remotion · caption layer",
      "howToBuild": "Edit pipeline, caption layer synced to speech, export at each platform's aspect ratio. Trap: sell a COUNT — four reels — never 'social media'. This is the easiest service to over-deliver and the hardest to bound."
    },
    {
      "id": "motion-graphics",
      "label": "Motion graphics & animation",
      "category": "content",
      "summary": "Animated logo sting",
      "buildDays": 4,
      "monthlyDays": 0,
      "needsServer": false,
      "readiness": "next",
      "evidence": [],
      "delivers": [
        "Animated logo sting",
        "Scroll and hover motion for the site",
        "Reusable motion tokens"
      ],
      "requires": [
        "Brand assets in vector format",
        "Reference motion you like"
      ],
      "modules": [
        "motion"
      ],
      "thirdPartyCost": [],
      "dependsOn": [],
      "stack": "Motion (framer-motion) · MIT",
      "howToBuild": "Define motion tokens once — duration, easing, distance — then apply them; do not hand-tune each animation. Trap: honour prefers-reduced-motion or the site is unusable for some visitors and fails accessibility."
    },
    {
      "id": "migration",
      "label": "Platform migration",
      "category": "foundation",
      "summary": "Content, catalogue and customers moved",
      "buildDays": 6,
      "monthlyDays": 0,
      "needsServer": true,
      "readiness": "next",
      "evidence": [],
      "delivers": [
        "Content, catalogue and customers moved",
        "Redirects so SEO survives",
        "Parallel run before cutover"
      ],
      "requires": [
        "Access to the current platform — add hello@brandmintstudios.in as a user",
        "A full export of current data"
      ],
      "modules": [
        "migration"
      ],
      "thirdPartyCost": [],
      "dependsOn": [],
      "stack": "export → transform → import → redirects",
      "howToBuild": "Export everything, transform to the new model, import, then run both in parallel before cutting over. Trap: the redirect map is the deliverable. Lose it and you lose their search rankings, which is the one damage you cannot undo."
    },
    {
      "id": "performance-rescue",
      "label": "Performance rescue",
      "category": "foundation",
      "summary": "Lighthouse 90+ on all four axes",
      "buildDays": 3,
      "monthlyDays": 0,
      "needsServer": false,
      "readiness": "ready",
      "evidence": [],
      "delivers": [
        "Lighthouse 90+ on all four axes",
        "Before and after report",
        "The fixes, explained"
      ],
      "requires": [
        "Repository access — add hello@brandmintstudios.in as a collaborator"
      ],
      "modules": [
        "perf"
      ],
      "thirdPartyCost": [],
      "dependsOn": [],
      "stack": "Lighthouse · sharp · bundle analysis",
      "howToBuild": "Measure, fix images first (almost always the biggest win), then bundle splitting and caching, then measure again. Trap: capture the before numbers. Without them you cannot prove the work, and unprovable work does not get referred."
    },
    {
      "id": "accessibility-audit",
      "label": "Accessibility audit & fixes",
      "category": "foundation",
      "summary": "WCAG AA pass",
      "buildDays": 3,
      "monthlyDays": 0,
      "needsServer": false,
      "readiness": "ready",
      "evidence": [],
      "delivers": [
        "WCAG AA pass",
        "Measured contrast on every interactive element",
        "Keyboard and screen-reader pass"
      ],
      "requires": [
        "Repository access — add hello@brandmintstudios.in as a collaborator"
      ],
      "modules": [
        "a11y"
      ],
      "thirdPartyCost": [],
      "dependsOn": [],
      "stack": "axe-core · manual keyboard pass · computed contrast",
      "howToBuild": "Automated scan, then a manual keyboard and screen-reader pass, then COMPUTE every interactive contrast ratio. Trap: automation finds roughly a third of real issues, and contrast must be calculated — two invisible buttons shipped on this very site by being eyeballed."
    },
    {
      "id": "security-audit",
      "label": "Security & access-rules audit",
      "category": "foundation",
      "summary": "Every rule tested against the emulator",
      "buildDays": 4,
      "monthlyDays": 0,
      "needsServer": false,
      "readiness": "ready",
      "evidence": [
        "Brand Mint portal — 21 rules tests"
      ],
      "delivers": [
        "Every rule tested against the emulator",
        "Tenant isolation proven, not assumed",
        "A written report of what was found"
      ],
      "requires": [
        "Repository access — add hello@brandmintstudios.in as a collaborator"
      ],
      "modules": [
        "security"
      ],
      "thirdPartyCost": [],
      "dependsOn": [],
      "stack": "Firebase emulator · rules unit tests · probe suite",
      "howToBuild": "Write tests against the real rules in the emulator, prove tenant isolation, probe anonymously for what should be denied, and hand over a written report. Trap: an audit without tests is an opinion. This portal has 21 passing rules tests — that is what makes the service demonstrable rather than describable."
    }
  ]
};

export const FEATURES = CATALOG.features;
export const FEATURES_BY_ID = Object.fromEntries(FEATURES.map((f) => [f.id, f]));
export const DAY_RATE = CATALOG.dayRate;
export const FLOOR_DAY_RATE = CATALOG.floorDayRate;
export const CATEGORY_LABELS = CATALOG.categoryLabels;
export const PRESETS = CATALOG.presets;
export const TERMS = CATALOG.terms;
export const SCALE_MULTIPLIER = CATALOG.scaleMultiplier;
export const SCALE_LABELS = CATALOG.scaleLabels;

const roundPrice = (n) => Math.round(n / 500) * 500;

/** Pull in everything a selection depends on. Same rule as the CLI. */
export function withDependencies(ids) {
  const out = new Set();
  const visit = (id) => {
    if (out.has(id)) return;
    const f = FEATURES_BY_ID[id];
    if (!f) return;
    out.add(id);
    (f.dependsOn || []).forEach(visit);
  };
  ids.forEach(visit);
  return [...out];
}

/** Price a selection. Mirrors quote() in the skeleton. */
export function quote(ids, scale = "standard") {
  const all = withDependencies(ids);
  const implied = all.filter((id) => !ids.includes(id));
  const mult = SCALE_MULTIPLIER[scale] ?? 1;
  const lines = all.map((id) => {
    const f = FEATURES_BY_ID[id];
    const days = f.buildDays * mult;
    return { feature: f, days, amount: roundPrice(days * DAY_RATE), implied: implied.includes(id) };
  });
  const buildDays = lines.reduce((s, l) => s + l.days, 0);
  const oneOff = lines.reduce((s, l) => s + l.amount, 0);
  const monthlyDays = lines.reduce((s, l) => s + (l.feature.monthlyDays || 0) * mult, 0);
  return {
    lines, impliedIds: implied, scale,
    buildDays: Math.round(buildDays * 10) / 10,
    oneOff,
    gst: Math.round(oneOff * TERMS.gstRate),
    monthly: roundPrice(monthlyDays * DAY_RATE),
    monthlyDays: Math.round(monthlyDays * 10) / 10,
    needsServer: lines.some((l) => l.feature.needsServer),
    thirdPartyCosts: [...new Set(lines.flatMap((l) => l.feature.thirdPartyCost))],
    clientRequirements: lines.flatMap((l) =>
      l.feature.requires.map((requirement) => ({ feature: l.feature.label, requirement }))
    ),
    buildModules: [...new Set(lines.flatMap((l) => l.feature.modules))],
  };
}

/** The margin gate. Never sign below the floor. */
export function checkPrice(agreedPrice, q) {
  const impliedDayRate = q.buildDays > 0 ? agreedPrice / q.buildDays : Infinity;
  const verdict = impliedDayRate >= DAY_RATE ? "healthy"
    : impliedDayRate >= FLOOR_DAY_RATE ? "thin" : "below-floor";
  return {
    agreedPrice, impliedDayRate, verdict,
    floorPrice: roundPrice(q.buildDays * FLOOR_DAY_RATE),
    listPrice: q.oneOff,
    daysNeededAtFloor: agreedPrice / FLOOR_DAY_RATE,
    sellable: verdict !== "below-floor",
  };
}
