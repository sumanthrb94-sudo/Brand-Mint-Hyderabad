// Delivery runbooks — Commerce and Fulfilment.
//
// One entry per catalog feature id. The facts here are taken from
// assets/bm-catalog.js (summary, requires, thirdPartyCost, modules, stack,
// howToBuild, dependsOn), from this repo's working Razorpay integration
// (docs/PAYMENTS.md, api/payments/*, api/_lib/razorpay.js), and from
// commerce-core (order-status.ts, coupons.ts, gst.ts, money.ts, types.ts).
//
// Two rules run through every payment-shaped runbook and are not negotiable:
//
//   1. We never receive a client's key, password or token. They generate it in
//      their own dashboard and put it in the environment themselves, and they
//      add hello@brandmintstudios.in as a team member so we can see without
//      holding anything.
//   2. A client store's customers pay into the CLIENT's own gateway account.
//      Money that lands in ours and is remitted onward is payment aggregation,
//      which in India requires an RBI licence — and their turnover becomes our
//      revenue at tax time.

export const RUNBOOKS = {
  "cart-cod": {
    summary:
      "Add to cart, checkout and COD order creation on a store that already has a catalog; the work is persistence, server-side totals and the order state machine, not the cart UI.",
    prerequisites: [
      "catalog-basic is live — products, prices and stock read through the store adapter in src/store/index.js.",
      "A server-side store is selected in brand.config storage. A localStorage-only store cannot recompute a total the customer did not choose.",
      "commerce-core is imported, so order status and money arithmetic have exactly one home.",
    ],
    fromClient: [
      "The delivery pin codes they serve, and what should happen to a pin code outside them.",
      "COD order value limits, if any, and whether COD simply disappears above the cap.",
      "Delivery fee rules — the flat fee and the free-above threshold.",
    ],
    steps: [
      {
        do: "Lift Tresor's cart context into src/modules/cart/useCart.js and persist the lines to localStorage.",
        where: "repo",
        detail:
          "Persistence is recovery only. The persisted cart is never an input to pricing.",
      },
      {
        do: "Compute every total through cartTotals() in src/contracts.js and orderTotal() in commerce-core/money, never inside a component.",
        where: "repo",
      },
      {
        do: "Put deliveryFee and freeDeliveryAbove in brand.config commerce rather than as literals in the checkout screen.",
        where: "repo",
      },
      {
        do: "Make the checkout request carry productId and qty only — no unit prices, no discount, no total.",
        where: "repo",
      },
      {
        do: "In the checkout API, re-read every product price and stock level from the database, recompute the total there, and write the order at status PENDING, paymentStatus UNPAID, paymentMethod COD.",
        where: "repo",
      },
      {
        do: "Validate the delivery pin code against the served list server-side before the order is written, and echo the rejected pin code back.",
        where: "repo",
      },
      {
        do: "Decrement stock in the same transaction that creates the order, and refuse the order if any line no longer has stock.",
        where: "repo",
      },
    ],
    verify: [
      "Edit the checkout request in devtools to halve a line price, send it, and confirm the stored order total matches the catalog price and not the posted one.",
      "A new order reads status PENDING and paymentStatus UNPAID in the store, and appears in the admin orders queue.",
      "Replay the checkout call with curl using an out-of-area pin code and confirm the API refuses it, not just the form.",
      "Order the last unit twice concurrently and confirm one order succeeds and one is refused, with stock never negative.",
    ],
    traps: [
      "A cart total posted from the browser is a number the customer chose. Recompute server-side at checkout, every time, including delivery fee and any discount.",
      "A COD order is not revenue. paymentStatus stays UNPAID until DELIVERED, and paymentEffect() in commerce-core is the only thing allowed to flip it.",
      "Decrementing stock when an item enters the cart leaves phantom holds behind every abandoned cart. Decrement at order creation.",
      "A cart persisted by an older build can hold lines with missing fields, and one missing lineTotal produces NaN in the total. Sanitise on read.",
      "An empty orders list must render as 'no orders yet', not as a clean, on-track dashboard.",
    ],
    handover: [
      "Customers can add to cart, check out with cash on delivery, and see an order reference.",
      "Every order appears in the client's admin queue at PENDING, with the delivery address and pin code.",
      "Delivery fee, free-above threshold and the served pin codes live in one config file, so a change is one edit and a redeploy.",
    ],
  },

  payments: {
    summary:
      "Wiring the client's own Razorpay account into checkout — server-created order, Checkout, verify, and a webhook that reconciles — where the security work is the deliverable and the Pay button is the easy part.",
    prerequisites: [
      "cart-cod is live and the order total is already recomputed server-side. Payments on a browser-supplied total is a hole with a gateway attached.",
      "A serverless surface exists on the store's own Vercel project for /api routes.",
      "Razorpay KYC is complete on the client's account: business PAN, GSTIN, and a verified settlement bank account.",
    ],
    fromClient: [
      "Their own Razorpay account. Their customers' money must settle into it and never into Brand Mint's — holding and remitting someone else's money is payment aggregation and needs an RBI licence in India.",
      "Ask them to add hello@brandmintstudios.in as a team member on their own Razorpay account, so you can read the dashboard without holding a key.",
      "They generate the API key pair themselves in Razorpay Dashboard, Account and Settings, API Keys — and they paste the secret into the environment themselves. Never ask for it in a message.",
      "Written acceptance of Razorpay's per-transaction cost, around 2% plus GST, before launch.",
    ],
    steps: [
      {
        do: "Have the client set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel, Settings, Environment Variables, scoped to Production and Preview, then redeploy.",
        where: "client",
        detail:
          "Do it on a screen share if they need help. The secret goes from their screen into the env var and nowhere else — not to you, not to chat, not to the repo.",
      },
      {
        do: "Port api/payments/create-order.js from this repo: accept an order id and nothing that decides how much money moves, then read the lines and compute the amount server-side.",
        where: "repo",
        detail:
          "tests/payments.test.mjs posts amount 1 against an 80,000 invoice and asserts 8,000,000 paise reached Razorpay. Keep a test of that shape.",
      },
      {
        do: "Convert rupees to paise in exactly one function — createOrder() in api/_lib/razorpay.js does Math.round(amountRupees * 100) and nothing else may.",
        where: "repo",
      },
      {
        do: "Open Razorpay Checkout in the browser with the returned order id and RAZORPAY_KEY_ID only.",
        where: "repo",
        detail: "The key id identifies; it does not authorise. The secret never leaves the server.",
      },
      {
        do: "Port api/payments/verify.js: HMAC-SHA256 of order_id + '|' + payment_id compared with crypto.timingSafeEqual, then fetch the payment from Razorpay and require status captured, a matching order_id, and an amount equal to the expected paise.",
        where: "repo",
      },
      {
        do: "Add the webhook modelled on tresor-couture/api/payments/webhook.ts: export config with api.bodyParser false, read the raw stream, HMAC the raw bytes against RAZORPAY_WEBHOOK_SECRET, compare with the X-Razorpay-Signature header.",
        where: "repo",
      },
      {
        do: "Register the webhook URL for the payment.captured event in Razorpay Dashboard, Settings, Webhooks, with the client choosing the webhook secret and entering the same value in both places themselves.",
        where: "client",
      },
      {
        do: "Record a captured payment with no matching order into a payment_events collection flagged unreconciled, and acknowledge with 200 so Razorpay stops retrying.",
        where: "repo",
        detail: "An orphan payment is money that arrived. Dropping it silently is the worst possible outcome.",
      },
      {
        do: "Move the order PENDING to CONFIRMED through commerce-core's transition() when payment is confirmed, and set paymentStatus PAID only from the provider's own confirmation.",
        where: "repo",
      },
    ],
    verify: [
      "With rzp_test keys, pay a 1 rupee test order and confirm the order reaches CONFIRMED with paymentStatus PAID, and that Razorpay shows one captured payment against the same order id.",
      "Call verify with a genuine signature for a payment that is authorized but not captured, and confirm it is refused — this repo answers HTTP 402.",
      "Post the webhook body with one byte changed and confirm signature_mismatch, which proves the HMAC is over the raw bytes and not a re-serialised object.",
      "Close the tab the instant Checkout succeeds and confirm the webhook alone still settles the order.",
      "Confirm RAZORPAY_KEY_SECRET appears nowhere in the repo or the client bundle, and that no log line contains a raw webhook body.",
    ],
    traps: [
      "Vercel parses JSON bodies by default and re-serialising changes the bytes, so an HMAC over req.body fails for legitimate webhooks and passes for none. Disable the body parser and hash the raw stream.",
      "Rupees versus paise is a factor of 100 in whichever direction hurts most. Convert once, in the Razorpay helper.",
      "Marking an order paid on the signature alone is the single most common flaw in Razorpay integrations. A signature only proves Razorpay said something about that order id; fetch the payment and check captured, order and amount.",
      "Reconciling only on the browser redirect loses every payment where the customer closed the tab. The webhook is the source of settlement; the redirect is a courtesy to the UI.",
      "Never log the raw webhook body or any part of the secret. An error dump is how a key reaches a log aggregator.",
      "Never route a client store's payments through Brand Mint's Razorpay account, not even 'temporarily for testing'. Test against their own account in test mode, with the test keys they set themselves.",
    ],
    handover: [
      "Customers pay by card, UPI or netbanking, and settlement lands in the client's own bank account from their own Razorpay account.",
      "The client sees every payment and settlement in their own dashboard; you can read it as a team member without holding a credential.",
      "Orders move to CONFIRMED on their own, including when the customer's browser never came back.",
    ],
  },

  coupons: {
    summary:
      "The discount engine is already built and tested in commerce-core/coupons; the delivery work is admin CRUD, applying it server-side at checkout, and a usage counter that cannot be raced.",
    prerequisites: [
      "cart-cod is live with server-side totals, because a discount is only as safe as the subtotal it is applied to.",
      "commerce-core is imported and applyCoupon() and findCoupon() are used as written, not re-implemented in the checkout handler.",
    ],
    fromClient: [
      "The offers they want at launch: code, percent or flat, the cap on a percent discount, minimum subtotal, validity dates and usage limit.",
      "Which categories or products each offer applies to or excludes.",
      "Whether a coupon may combine with anything else — the engine applies exactly one, so a 'yes' is a scope change.",
    ],
    steps: [
      {
        do: "Store coupons in a coupons collection matching the Coupon interface in commerce-core/src/coupons.ts, field for field.",
        where: "repo",
      },
      {
        do: "Build the admin offers panel with create, edit, activate and deactivate, and show usageCount as read-only.",
        where: "repo",
        detail: "An editable usage counter makes a usage limit meaningless.",
      },
      {
        do: "Apply coupons only in the checkout API: findCoupon() then applyCoupon() against the subtotal the server computed.",
        where: "repo",
      },
      {
        do: "Surface the reason string from a failed CouponResult verbatim in the cart, so the customer reads 'Add 400 rupees more to qualify' rather than a generic rejection.",
        where: "repo",
      },
      {
        do: "Increment usageCount inside the same transaction that writes the order, never at the moment the code is applied.",
        where: "repo",
      },
      {
        do: "Persist couponCode and the resolved discount on the order so an invoice or refund can reproduce it years later.",
        where: "repo",
      },
      {
        do: "Use generateCouponCode() for generated codes.",
        where: "repo",
        detail: "It omits 0, O, 1, I and L so a code survives being read aloud over the phone.",
      },
    ],
    verify: [
      "Apply a coupon, then replay the checkout POST with the discount field doubled, and confirm the stored order discount equals what applyCoupon returned server-side.",
      "A flat coupon larger than the cart yields a discount equal to the subtotal and a total of zero, never a negative total.",
      "A coupon with usageLimit 1 is refused on the second order, tested from two browsers rather than two tabs.",
      "An expired coupon reports 'Coupon has expired' and a not-yet-valid one reports 'Coupon is not valid yet'.",
    ],
    traps: [
      "A discount computed in the browser is a discount the customer sets. Validate and compute at the server and treat the browser's figure as display only.",
      "Incrementing usage when the code is applied rather than when the order is written lets abandoned carts burn a limited offer.",
      "Two simultaneous redemptions of a coupon on its last use both succeed unless the increment is a transactional read-modify-write.",
      "Do not seed demo coupons with invented usage counts. FreshKart's DEMO_COUPONS were deliberately left out of commerce-core for exactly that reason.",
    ],
    handover: [
      "The client creates, dates, caps and limits offers themselves from the admin panel, with no code change.",
      "Every order records the code used and the rupee discount applied.",
      "Customers get a specific, actionable reason whenever a code does not apply.",
    ],
  },

  "gst-invoicing": {
    summary:
      "Sequential, compliant tax invoices issued under the client's own registration; the hard parts are the number series and the CGST-plus-SGST versus IGST decision, not the PDF.",
    prerequisites: [
      "cart-cod is live and every order carries a delivery address with a two-digit GST state code, per Address.stateCode in commerce-core types.",
      "commerce-core/gst is imported: splitGst(), legalChecks() and isInvoiceReady().",
      "The database supports transactions. Sequential numbering is a transaction, not a counter read and then written.",
    ],
    fromClient: [
      "Their GSTIN, registered legal name and registered address, entered by them into the admin settings screen.",
      "The HSN or SAC code and the GST rate for everything they sell, stated by their CA in writing. Rates follow the HSN and are not yours to guess.",
      "The invoice series prefix and the number the series must start from.",
      "Whether catalogue prices are tax-inclusive or tax-exclusive — splitGst's priceIsInclusive flag depends on the answer, and the wrong answer misstates every invoice.",
    ],
    steps: [
      {
        do: "Add a business profile document holding legalName, gstin, pan, stateCode and stateName, and run legalChecks() over it on every save.",
        where: "repo",
        detail:
          "The checks cross-verify that the GSTIN embeds the PAN at characters 3 to 12 and opens with the place-of-supply state code, so a typo is caught before it reaches a customer.",
      },
      {
        do: "Gate all invoicing on isInvoiceReady() so nothing can be issued against an incomplete or placeholder registration.",
        where: "repo",
        detail:
          "PLACEHOLDER_IDENTIFIERS blocks 36ABCDE1234F1Z5 and ABCDE1234F, both of which appear in the legacy CRM seed.",
      },
      {
        do: "Store the client-supplied HSN and rate on each product, and snapshot both onto the order line at order time.",
        where: "repo",
      },
      {
        do: "Issue the invoice number inside a transaction that reads and increments one counter document, and write the number onto the invoice in that same transaction.",
        where: "repo",
      },
      {
        do: "Compute tax with splitGst(amount, rate, sellerStateCode, buyerStateCode, priceIsInclusive) per line and sum the lines, never once over the invoice total.",
        where: "repo",
      },
      {
        do: "Render the PDF in a serverless function from the stored invoice document only, never from live catalog or profile data.",
        where: "repo",
      },
      {
        do: "Make issued invoices immutable. A correction is a credit note referencing the original, not an edit and not a delete.",
        where: "repo",
      },
    ],
    verify: [
      "Run two checkouts concurrently and read the series: consecutive invoice numbers, no gap and no repeat.",
      "An order delivered inside the seller's own state shows CGST and SGST with IGST zero; an order to another state shows IGST only.",
      "Saving a GSTIN whose embedded PAN differs from the configured PAN is refused, with the mismatch named in the message.",
      "Change a product price, then reprint an old invoice and confirm the original figures, HSN and rate are unchanged.",
    ],
    traps: [
      "Invoice numbers that skip or repeat are a filing problem, not a bug report. A counter read then written outside a transaction will eventually do both.",
      "Do not apply a single GST rate across the catalogue. The 18% in CATALOG.terms is Brand Mint's own rate on its own services; the client's product rates follow their HSN codes and come from their CA.",
      "Tax-inclusive prices need the taxable value extracted, not tax added on top. Passing priceIsInclusive false against inclusive prices overstates every total.",
      "splitGst falls back to intra-state when the buyer's state is unknown. Make the state code a required checkout field rather than leaning on that fallback.",
      "Never let a placeholder GSTIN reach a real invoice; isInvoiceReady() exists precisely to stop that and must gate the button, not just warn near it.",
    ],
    handover: [
      "Every order produces a downloadable tax invoice with a sequential number under the client's own series.",
      "The client maintains their registration details in one validated screen.",
      "Intra-state and inter-state supplies split correctly with nobody deciding per order.",
    ],
  },

  "abandoned-cart": {
    summary:
      "Detecting carts that go idle, sending exactly one recovery message, and attributing recovered revenue so the feature can be judged on evidence rather than belief.",
    prerequisites: [
      "cart-cod is live and carts are stored server-side against a customer identity. An anonymous localStorage cart cannot be recovered.",
      "A scheduled job surface exists, and a sending channel — email or WhatsApp — is already configured on the client's own account.",
      "Consent to contact is captured at the moment the contact detail is given, and recorded on the cart.",
    ],
    fromClient: [
      "How long a cart must sit idle before it counts as abandoned.",
      "The exact message wording, approved in writing, and the channel it goes out on.",
      "Whether the message may carry a discount, and if so which coupon code and with what limit.",
    ],
    steps: [
      {
        do: "Write the cart server-side on change with updatedAt, the customer id and the consent flag, but only once a contact detail exists.",
        where: "repo",
      },
      {
        do: "Add a scheduled route that selects carts older than the agreed window with no matching order, and marks them abandoned.",
        where: "Vercel",
        detail: "Vercel, Settings, Cron Jobs, pointing at an /api route on the store's own project.",
      },
      {
        do: "Send exactly one message per abandoned cart and stamp recoveryMessageSentAt in the same write, so a re-run cannot resend.",
        where: "repo",
      },
      {
        do: "Include a link that restores the cart and carries a recovery source, and stamp that source onto any order it produces.",
        where: "repo",
      },
      {
        do: "Suppress the message entirely if the customer has since ordered, emptied the cart, or withdrawn consent.",
        where: "repo",
      },
      {
        do: "Report recovered revenue in the admin dashboard as orders carrying the recovery source, shown against messages sent.",
        where: "repo",
      },
      {
        do: "Render no qualifying carts as 'no carts abandoned in this window', never as a zero that reads like a result.",
        where: "repo",
      },
    ],
    verify: [
      "On preview, set the window to a few minutes, leave a cart, and confirm one message and one recoveryMessageSentAt stamp; run the job again and confirm nothing is sent.",
      "Complete a purchase through the recovery link and confirm the order carries the recovery source and appears under recovered revenue.",
      "Empty the cart before the job runs and confirm no message goes out.",
      "Withdraw consent and confirm the cart is skipped even though it still qualifies on age.",
    ],
    traps: [
      "One message, not a sequence. Three is spam, and a flagged sending domain costs the client every transactional email they send, including order confirmations.",
      "A scheduled job without an idempotency stamp messages the same customer on every tick.",
      "Attributing all later revenue from a messaged customer to this feature flatters it. Count only orders that came through the recovery link.",
      "Zero recovered revenue from zero messages sent is an empty collection, not a verdict. Say which it is on the dashboard.",
    ],
    handover: [
      "Idle carts are detected and recovered without anyone watching for them.",
      "The client sees messages sent and revenue actually recovered, side by side, and can judge whether to keep the feature.",
      "The window, the wording and the channel are all changeable without touching logic.",
    ],
  },

  loyalty: {
    summary:
      "An append-only points ledger with redemption applied server-side at checkout; the ledger is the feature, because it is the only thing that answers 'why do I have these points'.",
    prerequisites: [
      "cart-cod is live with server-side totals and every order attributable to an identified customer.",
      "There is a server-side write path for the ledger. A balance the browser can write is currency the customer can mint.",
      "The earn and burn rules are agreed before build, because changing them later reprices history.",
    ],
    fromClient: [
      "Earn and burn rules — points per rupee spent, rupees per point on redemption, and any excluded categories.",
      "Expiry policy, including what happens to points on a cancelled or returned order.",
      "Whether points accrue on a discounted order and on delivery fees.",
    ],
    steps: [
      {
        do: "Model points as an append-only ledger collection: customerId, delta, reason, orderId, createdAt, expiresAt. Never a mutable balance field.",
        where: "repo",
      },
      {
        do: "Derive the balance by summing unexpired entries server-side, and cache it only as a denormalised field that is recomputed and rewritten, never incremented.",
        where: "repo",
      },
      {
        do: "Award points in the same transaction that moves an order to DELIVERED, not at order creation.",
        where: "repo",
        detail: "Awarding at PENDING pays out for orders that are later cancelled.",
      },
      {
        do: "Apply redemption in the checkout API: read the balance, clamp the redemption to the cart, and write the negative entry inside the order transaction.",
        where: "repo",
      },
      {
        do: "Write a compensating negative entry referencing the original when an order becomes CANCELLED or RETURNED. Never delete an entry.",
        where: "repo",
      },
      {
        do: "Expire points with a scheduled job that appends an expiry entry rather than editing or removing history.",
        where: "Vercel",
      },
      {
        do: "Show the customer their ledger, not just a number — date, reason, delta and running balance.",
        where: "repo",
      },
    ],
    verify: [
      "Place and deliver an order, then read the ledger: one positive entry carrying the order id and the rule that produced it.",
      "Attempt to redeem more points than the balance by editing the request, and confirm the server refuses and the ledger is unchanged.",
      "Return a delivered order and confirm a compensating negative entry appears, the balance drops, and the original entry is still there.",
      "Redeem the same balance from two devices at once and confirm exactly one redemption succeeds.",
    ],
    traps: [
      "A mutable balance field cannot answer 'why do I have these points', which is the only support question this feature ever generates. Append-only, always.",
      "Awarding at order creation instead of delivery pays points for orders that never happened.",
      "A redemption computed in the browser is free money. Balance check, clamp and ledger write all belong in one server-side transaction.",
      "Expiring points by deleting rows destroys the audit trail exactly when a customer disputes it. Append an expiry entry instead.",
    ],
    handover: [
      "Customers earn points on delivered orders and redeem them at checkout.",
      "The client sees the full outstanding liability, and any customer's history, without opening the database.",
      "Every point that ever appeared or disappeared has a dated reason attached to it.",
    ],
  },

  subscriptions: {
    summary:
      "Plans, one Razorpay eMandate per customer on the client's own account, a scheduler that creates the recurring orders, and self-service pause, skip and cancel from day one.",
    prerequisites: [
      "payments is live on the client's own Razorpay account, since subscriptions depends on it.",
      "Recurring payments (eMandate) is switched on for their account — they request it from Razorpay support themselves; the access comes with the payments feature.",
      "A scheduled job surface exists for the recurring charge, and the payment webhook already settles one-off orders correctly.",
    ],
    fromClient: [
      "The delivery frequencies they actually support — their list, not a default set.",
      "Which products are subscribable and at what price relative to a one-off purchase.",
      "Their policy on a failed mandate charge: how many retries, over how long, and then what.",
      "Written acceptance of Razorpay's recurring mandate fees, which are separate from the standard per-transaction cost.",
    ],
    steps: [
      {
        do: "Have the client request recurring payments on their own Razorpay account, from their own dashboard, before any build starts.",
        where: "client",
      },
      {
        do: "Model plans and subscriptions server-side: planId, customerId, frequency, nextChargeAt, and status active, paused or cancelled.",
        where: "repo",
      },
      {
        do: "Register the mandate through Razorpay's own subscription flow and store only the returned subscription id.",
        where: "repo",
        detail: "Card and bank details stay at Razorpay and never touch the store's database.",
      },
      {
        do: "Build pause, skip-next and cancel into the customer account screen in the same release as the first charge.",
        where: "repo",
      },
      {
        do: "Add the scheduled job that, for each subscription due, creates an order at PENDING and charges against the mandate.",
        where: "Vercel",
      },
      {
        do: "Key the job's idempotency on subscription id plus due date, so a retry or a redeploy cannot charge twice.",
        where: "repo",
      },
      {
        do: "Settle the resulting order from the payment webhook exactly as one-off orders are settled, never from the scheduler's own return value.",
        where: "repo",
      },
      {
        do: "On a failed charge, mark the subscription paymentFailed, notify the customer, retry per the client's stated policy, and surface it in the admin queue. Never cancel silently.",
        where: "repo",
      },
    ],
    verify: [
      "With rzp_test keys, register a mandate, then search the database for card or account digits and find none — only the subscription id.",
      "Force the scheduler to run twice for the same due date and confirm one order and one charge.",
      "Pause a subscription and confirm the next run creates nothing; resume and confirm the following run does.",
      "Skip once and confirm nextChargeAt advances by exactly one interval and no order was created.",
      "Confirm the customer can see the next charge date and amount before it is taken.",
    ],
    traps: [
      "Without pause and skip the only self-service option is cancel, and customers will use it. Build all three together.",
      "A scheduler keyed on 'now' rather than a stored nextChargeAt double-charges on any retry or redeploy.",
      "Treating a scheduler-initiated charge as settled without the webhook repeats the redirect-reconciliation bug in a place nobody is looking at.",
      "A mandate that fails silently is indistinguishable from churn. Put failures in front of the client.",
      "The mandate belongs to the client's Razorpay account. Never register recurring authority against Brand Mint's account for a client's customers.",
    ],
    handover: [
      "Customers subscribe, and orders and charges recur without anyone touching them.",
      "Customers pause, skip and cancel themselves, so the client is not the pause button.",
      "The client sees due, failed and cancelled subscriptions in one admin view.",
    ],
  },

  pos: {
    summary:
      "A counter billing screen that shares stock with the online store and keeps taking money when the internet does not.",
    prerequisites: [
      "catalog-basic is live with stock, since the till reads the same catalogue.",
      "The counter hardware is confirmed and on site — the till device and the exact thermal printer model, not a similar one.",
      "The offline queue design is settled before any UI: what the till does with a sale it cannot yet sync, and how that sale is identified.",
    ],
    fromClient: [
      "The counter hardware and the printer model, and whether the printer speaks ESC/POS over USB, Bluetooth or network.",
      "Who operates the till, and whether each operator gets their own login.",
      "Whether counter sales share the same GST invoice series as online orders.",
    ],
    steps: [
      {
        do: "Extract the counter screen from FreshKart's POS at src/app/admin/pos/page.tsx and its AdminPosScreen component.",
        where: "repo",
      },
      {
        do: "Write every sale to a local queue first and sync afterwards, so the screen never blocks on the network.",
        where: "repo",
      },
      {
        do: "Give each queued sale a client-generated id and make the sync idempotent on it.",
        where: "repo",
      },
      {
        do: "Show queue depth and last-sync time permanently on the till screen.",
        where: "repo",
        detail:
          "An operator who cannot see that forty sales are unsynced will close the shop with them unsynced.",
      },
      {
        do: "Reconcile stock on sync and flag oversells for a human instead of letting stock go negative in silence.",
        where: "repo",
      },
      {
        do: "Print through the confirmed printer model and test on the machine that will sit on the counter.",
        where: "local",
      },
      {
        do: "Give the till its own login so every counter sale is attributable to an operator.",
        where: "repo",
      },
    ],
    verify: [
      "Turn off wi-fi on the till, ring up three sales, print all three receipts, restore the network, and confirm exactly three orders appear once each.",
      "Re-run the sync immediately and confirm no duplicates are created.",
      "Sell the last unit at the counter and confirm the online store shows it out of stock after sync.",
      "Print a receipt on the client's actual printer, not a PDF preview, and confirm the width and cut are right.",
    ],
    traps: [
      "The till must keep working when the internet does not. A screen that writes straight to the cloud stops the shop.",
      "A sync keyed on anything but a stable client-generated id duplicates sales the first time the network flaps mid-request.",
      "Two channels selling one stock pool will oversell. Decide in advance whether the counter or the website wins, and flag the conflict rather than hiding it.",
      "'A thermal printer' is not a specification. Models differ in width, cut behaviour and command set; test the one on the counter.",
    ],
    handover: [
      "Staff bill at the counter, print a receipt, and keep selling through an outage.",
      "Counter and online sales share one stock figure and one orders list.",
      "The client can see which operator rang up which sale.",
    ],
  },

  "multi-vendor": {
    summary:
      "Vendor accounts with their own storefronts, orders split per vendor, an append-only commission ledger and scheduled payouts — the commercial and regulatory model has to be settled in writing before any of it is built.",
    prerequisites: [
      "payments and order-management are both live, since multi-vendor depends on both.",
      "The commission model is agreed and signed. Changing it later rewrites the ledger and every historical payout statement.",
      "The money-flow question is answered: whether the marketplace operator is the merchant of record, or each vendor settles into their own account. That is a regulatory decision, not a technical one.",
    ],
    fromClient: [
      "The commission model in writing: percentage or flat, per category or global, and whether it is taken before or after discounts and delivery.",
      "Who approves a vendor, and what a vendor must supply to be approved. Bank details live with the payout provider, never in this database.",
      "The payout schedule and the minimum payout threshold.",
    ],
    steps: [
      {
        do: "Get the commission model signed before writing a line of code.",
        where: "client",
      },
      {
        do: "Have the client confirm with their CA or with Razorpay whether they are the merchant of record; if vendors are paid out of the marketplace's account, that is a Razorpay Route style arrangement on the client's own account, not a bank transfer script you write.",
        where: "client",
      },
      {
        do: "Model vendors, vendor storefronts and product ownership, with each product belonging to exactly one vendor.",
        where: "repo",
      },
      {
        do: "Split a customer order into one sub-order per vendor at creation, each running the commerce-core state machine independently.",
        where: "repo",
      },
      {
        do: "Accrue commission to an append-only ledger when a sub-order reaches DELIVERED, snapshotting the rate that applied at that moment.",
        where: "repo",
      },
      {
        do: "Reverse an accrual with a compensating entry on RETURNED, never by editing the original entry.",
        where: "repo",
      },
      {
        do: "Generate per-vendor payout statements per cycle from the ledger, for a human to release.",
        where: "repo",
      },
      {
        do: "Give vendors a read-only view scoped to their own vendor id, enforced in the security rules and not by a query filter.",
        where: "repo",
      },
    ],
    verify: [
      "Place one order across two vendors and confirm two sub-orders appear, each with its own status, and that cancelling one leaves the other untouched.",
      "Sign in as one vendor and try to read another vendor's order by editing the id in the URL; the read must be denied by the rules, not merely absent from the screen.",
      "Change the commission rate, reprint an old payout statement, and confirm it still shows the rate that applied then.",
      "Return a delivered sub-order and confirm its commission nets to zero across the original and compensating entries.",
    ],
    traps: [
      "Never route vendor money through Brand Mint's account, and check the licensing position before routing it through the client's. Holding funds on someone else's behalf and remitting them onward is payment aggregation and needs an RBI licence in India.",
      "A commission rate read live at statement time silently rewrites history. Snapshot the rate on the ledger entry.",
      "A single order status cannot express 'one vendor shipped, one cancelled'. Split into sub-orders at creation, not at fulfilment.",
      "Vendor isolation enforced by a query filter is not isolation. Anyone with a console can change a query; only rules stop them.",
      "Fifteen build days is the estimate for the mechanism, not for renegotiating the commercial model mid-build.",
    ],
    handover: [
      "Vendors onboard, list products and manage their own orders in their own storefront.",
      "The client sees commission accrued and owed per vendor, and releases payouts on a schedule.",
      "Every rupee of commission has a dated ledger entry with the rate that produced it.",
    ],
  },

  "order-management": {
    summary:
      "One admin queue built over commerce-core's transition(), where the buttons on a row are whatever the state machine says is legal from that row's status, and every accepted move is logged.",
    prerequisites: [
      "cart-cod is live, so orders exist to manage.",
      "commerce-core is imported: ORDER_STATUSES, canTransition(), transition(), nextStatuses(), paymentEffect() and buyerMayCancel() from order-status.ts.",
      "It is decided who processes orders day to day and whether they get their own login.",
    ],
    fromClient: [
      "Their fulfilment stages, in order, mapped onto PENDING, CONFIRMED, PACKED, SHIPPED, DELIVERED, CANCELLED and RETURNED. A stage the machine lacks is a change to the machine, never a free-text status.",
      "Who processes orders, and who is allowed to cancel one.",
      "What a cancellation after PACKED costs them, since the machine permits it but buyerMayCancel() deliberately does not offer it to the customer.",
    ],
    steps: [
      {
        do: "Build the queue from commerce-skeleton's src/modules/admin/AdminOrders.jsx, which computes each row's buttons from legalMoves() instead of a hardcoded list.",
        where: "repo",
      },
      {
        do: "Route every status change through transition() and show its rejection reason to the operator verbatim.",
        where: "repo",
        detail:
          "The reasons are written to be read: 'Cannot go PACKED -> DELIVERED. Allowed from PACKED: SHIPPED, CANCELLED'.",
      },
      {
        do: "Enforce the same machine in the API. The admin screen is a convenience; the server and the rules are the boundary.",
        where: "repo",
      },
      {
        do: "Append a status-history entry on every accepted move — from, to, who and when — and never overwrite one.",
        where: "repo",
      },
      {
        do: "Call paymentEffect() after every accepted transition and write only what it returns.",
        where: "repo",
        detail:
          "It returns PAID only for a COD order reaching DELIVERED, and REFUNDED when a PAID order becomes CANCELLED or RETURNED. It never returns PAID for an online order — only the payment provider may assert that.",
      },
      {
        do: "Stamp deliveredAt the first time an order reaches DELIVERED, because the returns window is measured from it.",
        where: "repo",
      },
      {
        do: "Expose buyerMayCancel() to the customer, so cancel is a button at PENDING and CONFIRMED and a support request after that.",
        where: "repo",
      },
      {
        do: "Render an empty queue as 'no orders yet', never as a clear, green, on-track state.",
        where: "repo",
      },
    ],
    verify: [
      "Confirm a CANCELLED order offers no forward moves in the UI, and that a direct API call attempting CANCELLED to SHIPPED is refused with a reason.",
      "Move an order PENDING, CONFIRMED, PACKED, SHIPPED, DELIVERED and confirm five history entries with distinct timestamps and an operator on each.",
      "Deliver a COD order and confirm paymentStatus becomes PAID; deliver an online order already PAID and confirm nothing about payment changes.",
      "Cancel a PAID order and confirm paymentStatus becomes REFUNDED and that this is flagged for a human rather than treated as a refund actually issued.",
      "Attempt SHIPPED to CANCELLED and confirm it is refused, with RETURNED offered instead.",
    ],
    traps: [
      "Never assign order.status directly. That is exactly how a cancelled order got marked shipped in one app and not the other, and why the same bug had to be fixed twice.",
      "SHIPPED does not go backwards. Once it is with the courier, undoing it is a RETURNED, not a CANCELLED, and a 'revert' button quietly breaks that.",
      "Marking an order shipped must not mark it paid. Payment is a separate axis and paymentEffect() is the only thing allowed to move it.",
      "A free-text status field added 'just for now' to fit one client's extra stage disables every check the machine provides.",
      "CANCELLED and RETURNED are terminal. An order that must move again needs a corrected record with a note, not a status edit.",
    ],
    handover: [
      "The client moves orders through their pipeline from one screen, with only the legal moves offered.",
      "Every order carries a full, dated history of who moved it and when.",
      "Illegal moves are impossible rather than merely discouraged, in the UI and in the API.",
    ],
  },

  "delivery-tracking": {
    summary:
      "One courier aggregator: push the shipment, store the AWB on the order, take status back by webhook, and give the customer a tracking page that does not leak.",
    prerequisites: [
      "order-management is live, so orders reach PACKED before anything ships.",
      "Exactly one aggregator is chosen — Shiprocket or Delhivery, not both.",
      "Pickup address and daily cut-off times are agreed, because a manifest missed by ten minutes is a day lost.",
    ],
    fromClient: [
      "Their own account with the chosen aggregator, with hello@brandmintstudios.in added as a user on it. You never hold their courier credentials.",
      "Pickup address and cut-off times.",
      "Acceptance of the aggregator's per-shipment cost.",
      "Default package weight and dimensions per product, or one fallback that applies to everything.",
    ],
    steps: [
      {
        do: "Have the client open the aggregator account themselves and add hello@brandmintstudios.in as a user; any API credential is generated in their dashboard and entered into the environment variables by them.",
        where: "client",
      },
      {
        do: "Create the shipment when an order transitions to PACKED, and not before.",
        where: "repo",
      },
      {
        do: "Store the AWB, the courier name and the label URL on the order in the same write that records the shipment.",
        where: "repo",
      },
      {
        do: "Register the aggregator's status webhook and authenticate it the way that aggregator specifies — read their documentation rather than assuming the endpoint can be open.",
        where: "repo",
        detail:
          "If they sign the body, hash the raw bytes and disable the platform's body parser, exactly as with the payment webhook.",
      },
      {
        do: "Map aggregator statuses onto the commerce-core machine explicitly and move the order with transition(), never by assignment.",
        where: "repo",
        detail: "Only the aggregator's own delivered event should drive SHIPPED to DELIVERED.",
      },
      {
        do: "Build the customer tracking page to require the order number plus one other detail the customer knows, such as the delivery phone number.",
        where: "repo",
      },
      {
        do: "Show the last known status with the time it was last updated, so a stale feed reads as stale rather than as 'in transit'.",
        where: "repo",
      },
    ],
    verify: [
      "Ship a real test order and confirm the AWB stored on the order matches the AWB in the aggregator's dashboard.",
      "Confirm the customer tracking page shows the courier's own scan events with timestamps, not a fabricated progress bar.",
      "Replay the aggregator's delivered webhook and confirm the order reaches DELIVERED through transition() and that deliveredAt is stamped.",
      "Request the tracking page with a valid order number and no second detail, and confirm no name, phone number or address is returned.",
    ],
    traps: [
      "Integrate one aggregator. Two doubles the integration surface, halves the reliability, and adds a second status vocabulary to map.",
      "A tracking page keyed on an order number alone leaks names, phone numbers and addresses to anyone willing to count upwards.",
      "Aggregator statuses are not the state machine. Map them one by one and log anything unmapped instead of defaulting to a status.",
      "A webhook that never arrives leaves an order SHIPPED forever. Add a job that flags shipments with no update for longer than the client's stated expectation.",
      "Creating the shipment at CONFIRMED rather than PACKED books couriers for parcels nobody has packed.",
    ],
    handover: [
      "Orders ship with one click from the admin queue, and the label and AWB are on the order.",
      "Customers track their own parcel and stop asking where it is.",
      "Delivery status flows back on its own, so DELIVERED is the courier's word rather than a guess.",
    ],
  },

  "returns-refunds": {
    summary:
      "A customer return request against a delivered order, an approval queue for the client, and a refund to source that cannot fire twice.",
    prerequisites: [
      "order-management is live and deliveredAt is stamped, because the return window is measured from it.",
      "payments is live if refunds go back to card or UPI. A COD refund is a bank transfer the client makes by hand and the system only records.",
      "The written returns policy is agreed before build. The window and the conditions are business rules, not defaults you choose.",
    ],
    fromClient: [
      "Their written returns policy and the window, in days from delivery.",
      "Who approves a return, and whether approval requires photographic evidence.",
      "Restocking rules: which returned lines go back into stock and which do not.",
      "Who pays return shipping.",
    ],
    steps: [
      {
        do: "Model the request on FreshKart's shape in src/lib/returns.ts — REQUESTED, APPROVED, REJECTED, PICKED_UP, REFUNDED, COMPLETED — with per-line return quantities.",
        where: "repo",
      },
      {
        do: "Accept a request only against an order at DELIVERED and only within the client's stated window from deliveredAt, checked server-side.",
        where: "repo",
      },
      {
        do: "Compute the refund server-side from the unit prices captured on the order lines and the returned quantities, never from anything the customer posts.",
        where: "repo",
        detail:
          "Order lines snapshot unitPrice for exactly this reason: a later price change must not change an old refund.",
      },
      {
        do: "Put every request into an approval queue. Nothing refunds automatically.",
        where: "repo",
      },
      {
        do: "On approval, issue the refund through the client's own Razorpay account against the original payment id, and record the returned refund id on the request.",
        where: "repo",
      },
      {
        do: "Make the refund idempotent: check for an existing refund id and send an idempotency key before calling the provider.",
        where: "repo",
      },
      {
        do: "Move the order to RETURNED through transition() and let paymentEffect() set REFUNDED. Never write REFUNDED by hand.",
        where: "repo",
      },
      {
        do: "Restock only the lines the client's rules say to restock, inside the same transaction that records the refund.",
        where: "repo",
      },
    ],
    verify: [
      "Double-click Approve on a return and confirm exactly one refund appears in the client's Razorpay dashboard.",
      "Call the API directly to raise a return against a PENDING, SHIPPED and CANCELLED order and confirm all three are refused.",
      "Refund a partial return and confirm the amount equals the sum of the returned lines at their captured prices, after a catalog price change.",
      "Confirm the order lands at RETURNED with paymentStatus REFUNDED, and that RETURNED offers no further moves.",
    ],
    traps: [
      "Refunds must be idempotent. A double-click, a retry or a replayed webhook must not refund twice; money leaving an account has no undo.",
      "Recomputing a refund from current catalog prices refunds the wrong amount after any price change. Use the prices captured on the order line.",
      "RETURNED is terminal in the state machine. An order recorded as returned in error needs a corrected record and a note, not a status edit.",
      "A COD order was never charged through the gateway, so there is nothing to refund to source. Record the manual transfer, do not call the refund API, and do not let it read as settled before the money actually moves.",
      "The refund is issued from the client's own Razorpay account. Brand Mint never refunds a client's customer out of its own account.",
    ],
    handover: [
      "Customers raise returns themselves against delivered orders, within the client's own window.",
      "The client approves or rejects from one queue, with the refund amount already computed.",
      "Every refund carries the provider's refund id, and the order and payment status both reflect it.",
    ],
  },
};

export default RUNBOOKS;
