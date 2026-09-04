# 13 · E-commerce Service Catalog

Everything we sell to brands that take money online. Companion to
`03-SERVICE-CATALOG.md`, which covers e-commerce in a single bullet under
Custom Websites — this is that bullet, opened up.

**Every quote is fixed-scope after the Mint workshop. GST extra. INR.**

> **On the numbers below.** The tier structure and price floors follow the
> ladder already set in `03-SERVICE-CATALOG.md` (Starter/Studio/Atelier at
> ₹2 L / ₹3.5 L / ₹6 L). E-commerce carries more surface area than a marketing
> site — payments, catalog, logistics, tax — so the floors sit above the
> equivalent site tier. **Sanity-check against your actual delivery hours
> before quoting.** Anything marked ⚠️ needs your call.

---

## Why this is its own line

Three of the four brands on our own work page are commerce: a UK consumer-
electronics platform, a cold-pressed wellness label, and Jora Bakes. We sell
it constantly and describe it as "websites." That undersells it and invites
the wrong comparison — a client benchmarks a ₹4 L storefront against a ₹1.2 L
"website guy" because we let them think it's the same object.

A storefront is not a site with a buy button. It's a catalog model, a payment
stack, a tax position, a logistics integration, and a returns process, with a
site attached.

---

## Who we're for

| Fit | Signal |
|---|---|
| **Best** | D2C at ₹5 Cr+ revenue, replatforming or scaling past a template |
| **Best** | Established offline brand launching online with real catalog depth |
| **Good** | Funded D2C pre-launch with a real product and a real budget |
| **Good** | Gulf/UK brand wanting an India-built team at India rates |
| **Poor** | Pre-revenue, no product photography, "just need a Shopify" |
| **Poor** | Dropshippers, marketplace-only resellers, MLM |
| **Walk away** | Anyone whose first question is "how cheap" |

---

# A. Storefront Build — `From ₹2.5 L`

## What it is

A new commerce site, designed and built from scratch. Not a bought theme with
your logo dropped in.

## What's in scope (default)

**Strategy**
- Mint workshop (90 min) → positioning, category structure, merchandising logic
- Competitor teardown: 3 direct competitors, checkout flows walked end to end
- Platform recommendation with a written rationale (see §Platform choice)

**Design**
- Custom design system — tokens, type, colour, component library
- Up to 10 unique templates: home, collection, product, cart, checkout,
  account, search, about, contact, policies
- Mobile-first. In India, 70–85% of D2C traffic is mobile; we design that first
  and treat desktop as the adaptation.

**Build**
- Shopify (Liquid or Hydrogen) / Next.js + headless / WooCommerce — per the
  platform call
- Catalog import and structure (up to 200 SKUs; see Catalog Architecture for
  deeper)
- Payment gateway integration + test transactions in live mode
- Shipping rules, tax configuration, order-confirmation flows
- Analytics: GA4, Meta CAPI, server-side events where the platform allows

**Quality**
- Lighthouse 90+ on mobile for home, collection and product templates
  (commerce carries third-party scripts a brochure site doesn't — 95+ is a
  headless-only promise, and we won't pretend otherwise)
- WCAG AA pass
- Cross-browser + real-device QA (iOS Safari, Chrome Android)
- 30-day post-launch warranty

## What's *not* in scope

- Product photography and retouching — art-directed by us, produced as add-on
- Copywriting beyond 10 product descriptions — ₹25 K/page or supply your own
- Ongoing merchandising after launch — that's the Care Plan
- Ad account setup and spend — separate line
- Platform subscription, app, and gateway fees — client pays direct
- Migrating historical order and customer data — see Replatform

## Tiers

| Tier | SKUs | Templates | Integrations | Price floor |
|---|---|---|---|---|
| **Launch** | up to 50 | 6 | Payments + shipping | **₹2.5 L** |
| **Growth** | up to 200 | 10 | + reviews, email, analytics | **₹4.5 L** |
| **Scale** | up to 1,000 | 12+ | + ERP/OMS, subscriptions, multi-currency | **₹8 L+** |

## Timeline

- **Launch** — 4 weeks
- **Growth** — 5–6 weeks
- **Scale** — 8–10 weeks

Week 1 workshop + IA + catalog model. Week 2 design. Weeks 3–4 build. Final
week: data, QA, payment testing in production, launch.

## SOP

1. Proposal within 48 hrs of discovery
2. 50% advance, 50% at launch
3. Daily Loom for the first 10 days; Friday demo 4 PM IST
4. 2 review rounds included; 3rd+ at ₹15 K/round
5. Client owns the store, the repo, and every account from day 1

---

# B. Replatform & Migration — `From ₹3.5 L`

## What it is

Moving an existing store to a better platform without losing revenue, rankings
or order history. The most common inbound we get from ₹5 Cr+ brands, and the
one most often quoted badly.

## What's in scope

- **Audit**: current stack, revenue by channel, top 50 URLs by traffic and
  revenue, integration inventory
- **Data migration**: products, variants, collections, customers, historical
  orders, reviews
- **URL mapping + 301s** for every indexed URL — the single biggest cause of
  post-migration revenue loss
- Redirect verification against Search Console's actual indexed set, not a
  sitemap guess
- Re-integration of the existing stack: gateway, shipping, ERP, email, reviews
- **Parallel run**: the new store is live on a staging domain, order-tested,
  before DNS moves
- Rollback plan, written, before cutover
- Post-launch monitoring: 14 days of daily rank + revenue checks

## What's *not* in scope

- Redesign. This is a *move*. Bundle Storefront Build if they want both.
- Recovering rankings lost before we arrived
- Data that the old platform genuinely won't export

## Tiers

| Tier | SKUs | Order history | Price floor |
|---|---|---|---|
| **Lift** | up to 200 | 12 months | **₹3.5 L** |
| **Lift+** | up to 1,000 | Full | **₹6 L** |
| **Complex** | 1,000+, multi-store or multi-currency | Full | **₹10 L+** |

## Timeline

6–8 weeks Lift/Lift+. 10–14 weeks Complex. Never cut over in the client's peak
season — that's a hard rule, not a preference.

---

# C. Catalog & Merchandising Architecture — `From ₹75 K`

## What it is

How the products are modelled. Sold standalone to brands whose store works but
whose catalog is fighting them: 400 SKUs and no filters, variants modelled as
separate products, collections built by hand every season.

Unglamorous, and it's usually where the conversion is hiding.

## What's in scope

- Product data model: products vs variants vs options vs metafields
- Taxonomy and collection strategy (manual vs automated rules)
- Filter and faceted-search design
- Naming, SKU and barcode conventions
- Merchandising rules: sort order, badges, bundles, cross-sells, out-of-stock
  behaviour
- Bulk data cleanup and re-import
- Search configuration and synonym mapping
- A written spec the client's team can maintain without us

## Tiers

| Tier | SKUs | Price floor |
|---|---|---|
| **Model** | up to 200 | **₹75 K** |
| **Model+** | up to 1,000, incl. cleanup + re-import | **₹1.75 L** |
| **Deep** | 1,000+, multi-warehouse or multi-market | **₹3 L+** |

## Timeline

1–3 weeks depending on tier.

---

# D. Checkout, Payments & Tax — `From ₹1 L`

## What it is

The last 40 metres, where Indian e-commerce actually breaks. Sold inside a
build or standalone as a rescue.

## What's in scope

**Payments**
- Gateway selection and integration: Razorpay, Cashfree, PayU, Stripe
  (international), PayPal
- UPI as a first-class method, not an afterthought — it is the default for
  most Indian buyers
- Cards, netbanking, wallets, EMI, Buy-Now-Pay-Later where it fits
- Saved cards / tokenisation per RBI rules
- Retry logic and failure-recovery messaging

**Cash on Delivery** ⚠️
- COD is 30–60% of orders for most Indian D2C brands, and its RTO (return to
  origin) rate is the quiet margin killer
- COD gating by pincode, cart value, and customer history
- OTP or WhatsApp confirmation for COD orders
- Partial prepaid / COD-fee nudges to shift the mix

**Checkout**
- Address forms built for Indian addresses (pincode autofill, landmark field)
- Guest checkout, express pay, one-page flow where the platform allows
- Abandoned-cart recovery: email + WhatsApp

**Tax & compliance**
- GST configuration: HSN codes, inter- vs intra-state, correct rate per
  category
- Tax-inclusive vs exclusive display, set per market
- Invoice format meeting Indian statutory requirements
- Policy pages: shipping, returns, refunds, privacy, terms

## Tiers

| Tier | Scope | Price floor |
|---|---|---|
| **Checkout** | Gateway + COD + tax config | **₹1 L** |
| **Checkout+** | + abandoned-cart recovery, express pay, EMI/BNPL | **₹1.75 L** |
| **Custom** | Headless / custom checkout (Shopify Plus or bespoke) | **₹4 L+** |

## Timeline

1–2 weeks standalone.

---

# E. Logistics & Post-Purchase — `From ₹1 L`

## What it is

Everything after "order placed." Brands underinvest here and then wonder why
their support inbox is 80% "where is my order."

## What's in scope

- Courier aggregator integration: Shiprocket, Delhivery, Blue Dart, Pickrr
- Serviceability and pincode checks *on the product page*, before the cart
- Rate rules: weight slabs, zones, free-shipping thresholds
- Branded tracking page — not the courier's
- Order status notifications over WhatsApp (the channel Indian buyers actually
  read) plus email
- Returns and exchange flow, with a self-serve portal
- RTO reduction: address validation, COD confirmation, delivery-window nudges
- NDR (non-delivery report) handling workflow

## Tiers

| Tier | Scope | Price floor |
|---|---|---|
| **Ship** | Aggregator + rates + tracking page | **₹1 L** |
| **Ship+** | + returns portal, WhatsApp notifications, RTO tooling | **₹2 L** |
| **Ops** | + multi-warehouse, ERP/OMS integration | **₹4 L+** |

---

# F. Subscriptions & Retention — `From ₹2 L`

## What it is

Recurring revenue mechanics. Relevant to consumables — wellness, coffee, pet,
supplements, personal care. Half our D2C inbound is one of those.

## What's in scope

- Subscription platform setup (Shopify: Recharge / Loop / Appstle; or custom)
- Plan design: cadence, discount ladder, commitment vs flexible ⚠️ *pricing
  strategy is a joint call with the client, not ours alone*
- **Mandate handling under RBI e-mandate rules** — the reason Indian
  subscription commerce is harder than the US playbook suggests. UPI Autopay
  and card mandates have caps and pre-debit notification requirements.
- Customer portal: skip, swap, pause, reschedule, cancel
- Dunning: retry logic and failed-payment recovery
- Churn instrumentation and cohort reporting
- Win-back flows

## Tiers

| Tier | Scope | Price floor |
|---|---|---|
| **Recurring** | App setup, plans, portal, dunning | **₹2 L** |
| **Recurring+** | + custom portal, cohort analytics, win-back automation | **₹3.5 L** |
| **Custom** | Bespoke subscription engine | **₹7 L+** |

---

# G. Headless & Custom Commerce — `From ₹10 L`

## What it is

The top of the range. For brands where a themed platform is now the
constraint: heavy traffic, unusual merchandising, multi-market, or a product
configurator that no app supports.

## Stack

- Next.js on Vercel, or Shopify Hydrogen
- Commerce backend: Shopify Storefront API, Medusa, or custom
- Firebase / Postgres for anything the commerce backend doesn't own
- Search: Algolia or Typesense
- CDN and image pipeline: Cloudflare or Vercel

## What's in scope

- Architecture review + system diagram artefact
- Storefront build against the commerce API
- Custom checkout where the platform permits it
- Preview/staging environments and CI
- Performance budget, enforced in CI — not checked once at launch
- Observability and error tracking
- Documentation and handover; client owns repo and infra from day 1

## Tiers

| Tier | Scope | Price floor |
|---|---|---|
| **Headless** | Single market, standard checkout | **₹10 L** |
| **Headless+** | Multi-market, custom checkout | **₹16 L** |
| **Platform** | Bespoke commerce backend | **₹25 L+** |

## Timeline

10–14 weeks Headless. 16–20 weeks Platform.

**Sell this honestly.** Most brands under ₹20 Cr do not need headless, and
saying so is why they'll trust the rest of the quote. If Shopify with a good
theme architecture solves it, recommend that and take the smaller fee.

---

# H. Conversion Rate Optimisation — `From ₹1 L/mo`

## What it is

A retainer that makes an existing store convert better. Research, hypotheses,
tests, shipped changes. Not a redesign.

## What's in scope

- Baseline audit: funnel, heatmaps, session replay, checkout drop-off
- Research: on-site polls, customer interviews, support-ticket mining
- Prioritised test backlog scored ICE or PIE
- 2–4 tests per month, built and shipped by us
- Statistical readout per test — including the losers, written up honestly
- Monthly report + quarterly strategy review

## What's *not* in scope

- Traffic. CRO on 2,000 sessions/month is theatre — we need ~20,000/month or
  more for a test to reach significance in a sane timeframe. Below that, sell
  them a fixed-scope UX fix sprint instead. ⚠️ *Hold this line; it's the most
  common way CRO retainers turn into unhappy clients.*

## Tiers

| Tier | Tests/mo | Retainer |
|---|---|---|
| **Optimise** | 2 | **₹1 L/mo** |
| **Optimise+** | 4 | **₹1.75 L/mo** |

Minimum 3-month commitment; realistically 6 before the compounding shows.

---

# I. D2C Growth Retainer — `From ₹1.75 L/mo`

## What it is

Performance Media (§D in `03-SERVICE-CATALOG.md`), specialised for commerce.
Priced above the generic retainer because commerce creative volume and feed
management are real work.

## What's in scope, beyond the standard retainer

- Product feed management: Meta catalog, Google Merchant Center
- Dynamic product ads and Advantage+ shopping campaigns
- Server-side tracking: Meta CAPI, GA4 measurement protocol
- Creative built for commerce: 12 statics + 2 videos/month, UGC-style included
- Landing-page and PDP testing coordinated with the CRO backlog
- Weekly report against **contribution margin**, not just ROAS — ROAS ignores
  COGS, shipping and RTO, and flatters the numbers

## Tiers

| Tier | Channels | Creatives/mo | Retainer |
|---|---|---|---|
| **Scale** | Meta or Google | 12 | **₹1.75 L/mo** |
| **Scale+** | Meta + Google | 18 | **₹2.75 L/mo** |
| **Full-funnel** | + affiliate, influencer coordination | 24 | **₹4 L/mo** |

Ad spend not included; client pays platforms direct. Minimum 3 months.

---

# J. Marketplace & Channel Expansion — `From ₹1.5 L`

## What it is

Selling everywhere the customer already is. Usually the second conversation
after the storefront is live.

## What's in scope

- Amazon and Flipkart: catalog setup, A+ content, listing optimisation
- Quick commerce (Blinkit, Zepto, Instamart) listing preparation ⚠️ *onboarding
  is relationship-gated; we prepare the catalog, we don't guarantee approval —
  say this explicitly in the SOW*
- **ONDC** onboarding via a seller app
- WhatsApp commerce: catalog, Business API, order flows
- Instagram and Facebook Shops
- Inventory sync across channels (Unicommerce, Easyecom, or platform-native)
- Channel-level margin model — marketplace fees change what's worth selling

## Tiers

| Tier | Channels | Price floor |
|---|---|---|
| **Channel** | 1 marketplace, full setup | **₹1.5 L** |
| **Channel+** | 3 channels + inventory sync | **₹3 L** |
| **Omni** | 5+ incl. quick commerce and ONDC | **₹5 L+** |

---

# K. Commerce Care Plan — `From ₹40 K/mo`

## What it is

The retainer that keeps a live store healthy. Every storefront client should
be offered this at handover — it's the highest-margin line here and the one
that turns a project into a relationship.

## What's in scope

- Platform, theme and app updates, tested on staging first
- Uptime and Core Web Vitals monitoring
- Security patching and dependency updates
- Monthly merchandising: new collections, seasonal banners, sale setup
- Up to 20 product uploads per month
- Bug fixes and small changes (up to a defined hours bank)
- Monthly health report
- Priority response: 1 business day; 4 hours for anything blocking checkout

## Tiers

| Tier | Hours bank | Response | Retainer |
|---|---|---|---|
| **Care** | 4 hrs/mo | 1 business day | **₹40 K/mo** |
| **Care+** | 10 hrs/mo | 4 hrs (checkout-blocking) | **₹75 K/mo** |
| **Care Pro** | 20 hrs/mo + on-call for sale events | 2 hrs | **₹1.5 L/mo** |

Sale-event support (BFCM, festive, brand-day) is quoted separately if it falls
outside the hours bank.

---

# Platform choice — how we decide

Written down so the recommendation is consistent, and so we can defend it.

| Situation | Recommend | Why |
|---|---|---|
| Under ₹10 Cr, standard catalog, wants to self-manage | **Shopify** | Fastest to launch, best app ecosystem, client's team can run it |
| Needs deep India logistics + COD tooling | **Shopify + Indian app stack** | The apps exist; building it is waste |
| Content-heavy, SEO is the main channel | **Next.js + headless Shopify** | Full control of rendering and routing |
| ₹20 Cr+, custom merchandising, heavy traffic | **Hydrogen or custom** | Theme layer is now the constraint |
| Already deep in WordPress, small catalog, tight budget | **WooCommerce** | Migration cost outweighs the gain |
| B2B, quotes, credit terms, tiered pricing | **Custom or Shopify Plus B2B** | Standard D2C flows don't model this |

**Bias to boring.** We make more money on the second engagement than on
over-engineering the first. A brand that outgrows Shopify in three years and
comes back for headless is worth more than one that got sold headless on day
one and resented the invoice.

---

# India-specific realities to scope every time

Miss these and the project runs over. All five are standard scope questions in
the Mint workshop.

1. **COD and RTO.** Ask their current COD share and RTO rate. Above 25% RTO,
   COD gating is not optional and must be in scope.
2. **GST correctness.** Wrong HSN codes or rates are the client's legal
   exposure. We configure what they tell us and put the confirmation in
   writing.
3. **UPI first.** If UPI isn't a prominent, tested option, checkout is broken
   for the majority of Indian buyers.
4. **WhatsApp is the notification channel.** Email open rates in Indian D2C
   don't compare. Budget for it.
5. **Mobile network reality.** Test on throttled 4G, not office wifi. Image
   pipeline and third-party script budget are launch blockers, not polish.

---

# Bundles

Standard 10% bundle discount applies to the smaller line item when 2+ services
are in one SOW (per `03-SERVICE-CATALOG.md`). Don't exceed 10%.

| Bundle | Contents | Indicative |
|---|---|---|
| **Launch Kit** | Storefront (Launch) + Brand Mark + Checkout | ₹2.5 L + ₹1.5 L + ₹1 L → **₹4.75 L** |
| **Growth Kit** | Storefront (Growth) + Catalog (Model) + Checkout+ | ₹4.5 L + ₹75 K + ₹1.75 L → **₹6.75 L** |
| **Scale Kit** | Replatform (Lift+) + Catalog (Model+) + Subscriptions | ₹6 L + ₹1.75 L + ₹2 L → **₹9.4 L** |
| **Always-on** | Care+ + CRO (Optimise) + Growth (Scale) | ₹75 K + ₹1 L + ₹1.75 L/mo → **₹3.4 L/mo** |

Every storefront proposal should carry the Care Plan as a line item, not a
footnote.

---

# Add-ons

| Add-on | Price |
|---|---|
| Product photography direction (per shoot day, production billed at cost) | ₹35 K |
| Product copywriting | ₹2 K/SKU, min 25 |
| Landing page (campaign) | ₹60 K |
| Extra review round | ₹15 K |
| Additional 100 SKUs on a build | ₹40 K |
| Multi-currency / multi-market setup | ₹1.25 L |
| Multi-language storefront | ₹1.75 L |
| Sale-event readiness sprint (BFCM, festive) | ₹75 K |
| Email/WhatsApp flow build (5 core flows) | ₹1.25 L |
| Loyalty programme setup | ₹1 L |
| Post-launch analytics + dashboard | ₹75 K |

---

# What we don't do

Refer out; take goodwill or a 10% kickback.

- **Warehousing and 3PL operations** — we integrate, we don't operate
- **Customer support staffing** — we build the tooling, someone else answers
- **Native mobile apps** — refer; a good PWA covers most of it
- **Marketplace account management as an ongoing service** — one-off setup only
- **Influencer contracting and payouts** — coordination only
- **Product sourcing, manufacturing, packaging design** — not our lane
- **GST filing and accounting** — refer to a CA; we configure, they file

---

# What we need from the client before day 1

Put this in the proposal. Every delay we've had on commerce projects traces to
one of these arriving late.

- [ ] Product data: names, descriptions, prices, weights, HSN codes, variants
- [ ] Product photography, or a booked shoot date
- [ ] Brand assets, or a Brand System engagement
- [ ] Payment gateway account with KYC **complete** (allow 3–7 working days)
- [ ] Courier aggregator account
- [ ] Domain and DNS access
- [ ] GST number and the rate per product category, confirmed in writing
- [ ] A single named decision-maker who can approve

---

# Payment terms

- Projects: 50% advance, 50% at launch. Over ₹8 L: 40/30/30 against milestones.
- Retainers: monthly in advance, 3-month minimum, 30-day notice.
- Replatform: 50/50, with the second tranche due at **cutover**, not at
  staging sign-off.
- All prices GST extra.
- Fixed scope after the Mint workshop. Anything beyond it is a change order,
  quoted before work starts. No exceptions — this is where commerce projects
  bleed.
