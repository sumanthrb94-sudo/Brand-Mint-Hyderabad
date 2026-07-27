# Build roadmap — from 43 services to a repeatable studio

How to actually build the catalogue, in what order, from what. Written for the
person doing the work, who is also the person selling it.

**The one number this serves: ₹1,00,000/month.** Not ten million. Everything
below is ordered by how fast it gets you there and how little of your fifteen
days it costs.

---

## The principle

**43 sellable services are assembled from about 20 real modules.** `cart-cod`,
`payments`, `coupons`, `gst-invoicing`, `returns` and `subscriptions` are six
line items on one order engine.

**29 of the 43 are already shipped somewhere in your repos.** This is an
extraction job, not a greenfield one. Every hour spent rewriting something
Tresor or FreshKart already does is an hour that buys nothing.

> Rewriting feels like progress and produces none. If the module exists,
> lift it, make it configurable, delete the copy.

---

## The build order — computed, not guessed

Ranked by revenue unlocked per day invested. This is the whole roadmap in one
table.

| Module | Days | Services it unlocks | Value gated behind it | Per day |
|---|---|---|---|---|
| **Product catalog** | 4 | 14 | ₹5,90,000 | **₹1,57,500** |
| **Dynamic website** | 5 | 15 | ₹6,30,000 | **₹1,36,000** |
| **Cart & COD** | 4 | 10 | ₹4,50,000 | **₹1,22,500** |
| Order management | 3 | 3 | ₹2,20,000 | ₹83,333 |
| Online payments | 4 | 2 | ₹2,00,000 | ₹60,000 |
| Chat support | 3 | 1 | ₹30,000 | ₹20,000 |
| *everything else* | — | 0 | — | ₹10,000 |

The top three are worth **twelve to fifteen times** anything below them, and
they are the same three, in that order, every time. Nothing else competes.

### The critical path is 13 days

```
Dynamic website (5d) → Product catalog (4d) → Cart & COD (4d)
```

Behind `cart-cod` sits: payments, coupons, GST invoicing, order management,
delivery tracking, returns, abandoned cart, loyalty, subscriptions,
multi-vendor. **Ten services, all blocked until those 13 days are done.**

Build them in that order and stop starting anything else.

---

## Phase 1 · The spine — 13 days

**Goal:** one configurable store engine that a client build clones.

### What to extract, and from where

You have read both codebases. These are the files.

| Module | Take from | Why that one |
|---|---|---|
| Content model, CMS shell | **FreshKart** `src/app`, `src/components/layout` | Next.js App Router, already on Vercel |
| Product catalog | **FreshKart** `src/lib/types.ts`, `src/app/admin/products` | Cleanest product model of the two |
| Bulk import / price ops | **FreshKart** `src/app/admin/prices`, `src/lib/produce.ts` | Only implementation that exists |
| Cart & checkout | **Tresor** `src/context/CartContext.tsx`, `CatalogContext.tsx` | Better-separated context than FreshKart's |
| Orders | **`commerce-core`** — already extracted | The state machine is done and tested |
| Serviceability / pin codes | **Tresor** `src/lib/serviceability.ts` | 131 lines, no dependencies, lift as-is |
| CSV | **Tresor** `src/lib/csv.ts` | Same |

### Steps

1. **Wire `commerce-core` into the skeleton.** `npm i github:sumanthrb94-sudo/commerce-core`. Order status, coupons, GST and money come from one place. Do not re-implement any of them.
2. **Install shadcn/ui in the skeleton.** MIT, copy-paste, you own the code. This is where it belongs — never in the portal repo.
3. **Port the catalog module** behind `brand.config.features`. It must render nothing when `catalog-basic` is off.
4. **Port cart and COD checkout.** Every status change goes through `transition()` from commerce-core. No direct assignment, ever.
5. **Port order management** — the admin queue, driven by the same state machine.
6. **Delete the copies.** If the module now lives in the skeleton, remove it from your working notes as a thing to maintain twice.

### Done when

- `brand.config.ts` with `features: ["dynamic-site","deployment","catalog-basic","cart-cod","order-management"]` produces a working store with nothing else touched.
- Turning `catalog-basic` off removes the catalogue from the UI **and** from the quote, with no error.
- `npm test` in the skeleton passes, including the margin gate.
- You can stand up a new store from `brand.config.ts` alone in **under 5 days**.

### The traps

- **Do not port the UI verbatim.** Tresor is Vite, FreshKart is Next. Port the *logic*; rebuild the surface on shadcn once.
- **Do not port `business.ts` as-is.** It carries the placeholder GSTIN `36ABCDE1234F1Z5`. The validators are already in `commerce-core/gst`; the identity belongs to the host app.
- **Do not port `localStorage` persistence** out of FreshKart's coupons. Storage is the app's job.
- **Feature flags are not comments.** A module behind a flag that still runs is not behind a flag.

### What this unlocks

**₹50,000 becomes a real product** — but only at 70% reuse:

| Reuse | Days | ₹50,000 pays | |
|---|---|---|---|
| 50% | 8.5 | ₹5,882/day | ✗ below floor |
| **70%** | **5.1** | **₹9,804/day** | ✓ |
| 80% | 3.4 | ₹14,706/day | ✓ |
| 85% | 2.6 | ₹19,608/day | ✓ |

70% is the number to hit. Below it, keep quoting ₹2.4 L and do not discount.

---

## Phase 2 · Commerce complete — 13 days

Once the spine holds, these are each 1.5–4 days and sell for ₹15,000–40,000.

| Module | Days | From |
|---|---|---|
| Online payments | 4 | Tresor `api/payments/{create-order,verify,webhook}.ts` — the only real webhook implementation you have |
| GST invoicing | 3 | Tresor `src/lib/invoice.ts` + `commerce-core/gst` |
| Returns & refunds | 4 | FreshKart `src/lib/returns.ts` (283 lines, only implementation) |
| Coupons | 1.5 | **already in `commerce-core`** — wire it up |
| Delivery & tracking | 3 | New. Pick one aggregator, not three |
| Inventory | 2 | FreshKart stock handling |

**Done when** a `commerce-full` build is configuration, not coding.

**Trap:** payments and refunds need serverless functions and a webhook secret.
`/api` on Vercel, `RAZORPAY_WEBHOOK_SECRET` as an env var. **Verify the
signature, never log the raw body, never put the secret in the browser.**

---

## Phase 3 · Business platforms — highest margin

CRM, HRMS, reporting, approvals. ₹13,333–20,000/day — the best rates you sell.

| Module | Days | From |
|---|---|---|
| Admin shell, roles, RBAC | 4 | Extract once, reuse across all four |
| Reporting | 5 | FreshKart `src/app/admin/reports`, `src/lib/reports.ts` |
| CRM | 10 | REAL-ESTATE-CRM, MODEX |
| HRMS | 12 | Modcon-HR |

**These share one admin shell.** Build the shell once in Phase 3 and CRM,
HRMS, approvals and reporting each drop from ~12 days to ~6.

**Trap:** resist per-client customisation of the shell. Configuration yes,
forks no. A forked shell is four codebases within a year.

---

## Phase 4 · Comms & AI — where the recurring revenue is

| Module | Days | Sells for | Recurring |
|---|---|---|---|
| Notifications (email/SMS) | 2 | ₹20,000 | — |
| WhatsApp orders | 3 | ₹30,000 | — |
| Chat support | 3 | ₹30,000 | **₹10,000/mo** |
| Automated replies | 3 | ₹30,000 | **₹5,000/mo** |
| Lead qualifier | 5 | ₹50,000 | — |
| RAG over documents | 10 | ₹1,00,000 | — |
| Document extraction | 8 | ₹80,000 | — |

**The monthly fees are the point.** A chat agent at ₹30,000 once is a project.
At ₹30,000 + ₹10,000/month it is a retainer, and retainers are what reach
₹1,00,000 on eight days.

**Trap — the one that matters most:** an AI feature with no eval suite is a
liability you have agreed to maintain forever. Build the evals with the
feature or do not sell it. Both `later` services on the menu are `later`
precisely because their eval surface is open-ended.

---

## Phase 5 · Content — sell before you build

Image pipeline (2d), motion (4d), reel packs (2.5d/month). Low build cost,
and reel packs are **₹25,000/month recurring**.

**Trap:** video is the easiest service to over-deliver and the hardest to
bound. Sell a **count** — "4 reels" — never "social media".

**Licence trap:** Remotion is free at your size but requires a paid company
licence above three people. n8n and Dify cannot be resold as a service. Build
client deliverables on MIT foundations; keep the fair-code tools internal.

---

## How this works with one person

Honest arithmetic, because the plan has to survive it.

**Phase 1 is 13 days.** You have ~11 free days a month after Inventory
Manager. So the spine takes **five to six weeks of part-time work**, during
which you are still delivering Green Basket and the Shopify launch.

That is the real timeline. Not two weeks.

### What actually creates leverage

| | What it does | What it does not do |
|---|---|---|
| **The skeleton** | Turns a 17-day store into 5 days | — |
| **Claude Max** | Builds the skeleton faster; writes the tests | Add a 16th billable day |
| **Chat / auto-reply agents** | Cut the interruptions that fragment your 15 days | Deliver client work |
| **n8n / Dify** | Automate *your* ops — invoicing, follow-ups, reporting | Get resold (licence) |
| **RAG over your own repos** | Answer "how did I do this in FreshKart" in seconds | Replace knowing your codebase |

**The leverage is reuse, not hours.** No tool adds capacity to deliver. The
skeleton multiplies what one day of delivery is worth, which is the only lever
that breaks a linear ceiling.

### The rule that protects all of it

**Never build a module for one client.** If it is not going in the skeleton,
it is a fork, and forks are how a solo studio ends up maintaining five
codebases and shipping none.

---

## 90 days to ₹1,00,000

| Weeks | Do | Result |
|---|---|---|
| **1–2** | Collect Green Basket's ₹80,000. Sign Tresor at ₹10,000/mo at handover. | ₹22,500 cash MRR · 0.8 months of break-even banked |
| **1–6** | Phase 1, part-time. Ship Shopify for Inventory Manager alongside. | Store engine at 70% reuse |
| **4–8** | Sell **two Growth retainers** at ₹25,000. Lead with rescue audits — 3–4 days, repo access only, and you can *demonstrate* the security audit with 21 passing tests. | **₹72,500 MRR** |
| **8–12** | Phase 2. Publish the ₹75,000 template store. Sell two more retainers. | **₹1,00,000+ · break-even** |

**The sales target is four Growth retainers.** Not forty-three services. The
catalogue is what you sell to *get* the retainer; the retainer is the business.

### Why rescue audits are the wedge

Performance, accessibility and security audits are 3–4 days, need nothing from
the client but repo access, have no onboarding and almost no scope-creep
surface — and they sell to people who **already have a site**. Shortest path
from a cold lead to an invoice you have, and the natural opener for
*"want us to keep it healthy?"* — which is the retainer conversation.

---

## The weekly rhythm

Monday, thirty minutes:

1. `/studio` — signed MRR against ₹1,00,000. Cash only.
2. Any lead without a first response? Reply now. Median in this market is 42 hours.
3. Delivery health — anything waiting on a client for more than 3 days? The portal already chased them; follow up on the red ones only.
4. One question: **did I build anything this week that only one client will ever use?** If yes, that was a fork. Fix it or accept it deliberately.

Before every signature, without exception:

```bash
npm run quote <preset> -- --price <what they agreed>
```

If it says **BELOW FLOOR — DO NOT SIGN**, do not sign. That gate exists
because Green Basket went out at ₹4,524/day and Inventory Manager at ₹833/day,
and both were arithmetic nobody ran in time.

---

## Reproduce every number here

```bash
cd commerce-skeleton
npm run quote                                  # all 43, with prices
npm run quote commerce-cod -- --price 50000    # the margin gate
npm test                                       # 27 tests
```

`buildDays` in `src/config/features.ts` are estimates derived from module sizes
in your own repos. They are the only judgement in this document — everything
else is arithmetic on them. Change one and every number recalculates.
