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
      "dependsOn": []
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
      "dependsOn": []
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
      "dependsOn": []
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
      ]
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
      ]
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
      ]
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
      ]
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
      ]
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
      ]
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
      ]
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
      ]
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
      ]
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
      ]
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
      "dependsOn": []
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
      ]
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
      "dependsOn": []
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
      "dependsOn": []
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
      "dependsOn": []
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
      "dependsOn": []
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
      "dependsOn": []
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
      "dependsOn": []
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
      "dependsOn": []
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
      ]
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
      ]
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
      ]
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
      ]
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
      ]
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
      "dependsOn": []
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
      "dependsOn": []
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
      "dependsOn": []
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
      "dependsOn": []
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
      "dependsOn": []
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
      "dependsOn": []
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
      "dependsOn": []
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
      "dependsOn": []
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
      "dependsOn": []
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
      "dependsOn": []
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
      "dependsOn": []
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
      "dependsOn": []
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
      "dependsOn": []
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
      "dependsOn": []
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
      "dependsOn": []
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
      "dependsOn": []
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
