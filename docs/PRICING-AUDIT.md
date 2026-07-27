# Pricing audit — are our prices justified, and how do we scale?

**Owner: Sumanth.** This is your document — edit any number you disagree with.
Everything here is either a fact from the live site, a fact from the service
catalog, or arithmetic on those two. Where a figure is my estimate it says so.

Method: every published price divided by its own published delivery timeline
gives the day rate that price implies. If that rate is below what a day of work
costs to deliver, the service loses money no matter how many we sell.

- **Standard rate: ₹10,000/day** — the bottom of the band your own published
  prices imply.
- **Floor rate: ₹8,000/day** — below this an engagement loses money after
  sales, support and admin time. Enforced in code by `checkPrice()`.

---

## 1 · Service-by-service verdict

| Service | Published | Timeline | Implied rate | Verdict |
|---|---|---|---|---|
| Custom websites — Starter | ₹2,00,000 | 3–5 wk | ₹8,000–13,333 | **thin** |
| Custom websites — Studio | ₹3,50,000 | 3–5 wk | ₹14,000–23,333 | healthy |
| Custom websites — Atelier | ₹6,00,000 | 5–6 wk | ₹20,000–24,000 | healthy |
| Custom internal tools | ₹4,00,000 | 4–6 wk | ₹13,333–20,000 | healthy |
| Brand systems | ₹1,50,000 | 2–3 wk | ₹10,000–15,000 | healthy |
| AI integrations | ₹2,00,000 | 3–4 wk | ₹10,000–13,333 | healthy |
| Performance media | ₹1,00,000/mo | retainer | — | see §5 |
| SEO & content | ₹75,000/mo | retainer | — | see §5 |

**Seven of eight are sound.** The prices on the site are defensible; nobody set
them by this method but they hold up to it.

**The exception is the ₹2 L website Starter tier.** At the slow end of its own
3–5 week window it pays ₹8,000/day — exactly at the floor, nothing spare. Any
project that runs one week long on that tier loses money. Two options: raise
the Starter floor to ₹2.5 L, or hold the line that Starter is 1–3 pages and
becomes Studio the moment it is not.

---

## 2 · The ₹50,000 e-commerce problem

This is the finding that matters.

| | |
|---|---|
| Stated start price | **₹50,000** |
| What a COD store actually is | **24 build days** |
| Same scope at the standard rate | ₹2,40,000 |
| **What ₹50,000 pays per day** | **₹2,083** |
| Shortfall per store | **₹1,90,000** |

₹2,083/day against a ₹8,000 floor. Every ₹50,000 store sold today loses money,
and volume makes it worse rather than better.

### What ₹50,000 would require

| To pay | Build must be | Reduction needed |
|---|---|---|
| ₹10,000/day | 5.0 days | 79% less work |
| ₹8,000/day (floor) | 6.3 days | 74% less work |
| ₹6,000/day (still a loss) | 8.3 days | 65% less work |

### What reuse actually does

| Modules reused | Days | Pays | Viable? |
|---|---|---|---|
| 0% (today) | 24.0 | ₹2,083/day | no |
| 30% | 16.8 | ₹2,976/day | no |
| 50% | 12.0 | ₹4,167/day | no |
| 65% | 8.4 | ₹5,952/day | no |
| **80%** | **4.8** | **₹10,417/day** | **yes** |

**₹50,000 is not a price. It is a target that requires 80% reuse to exist.**
Below that threshold it is a loss, and the threshold is a cliff rather than a
slope — 65% reuse still loses money.

That is the honest answer to "is ₹50k justified": **not yet.** It becomes
justified the day the skeleton can stand a store up in five days, and not
before. Quote it now and you are financing the client.

---

## 3 · The gate — what stops this being signed

Previously nothing did. A scope could be perfectly specified and still be a
loss, because nobody ran the division before signing. Green Basket
(~₹4,500/day) and a ₹50,000 e-commerce price are the same mistake twice.

Run this before every signature:

```bash
npm run quote commerce-cod -- --price 50000
```

```
  MARGIN CHECK — run this before you sign

  Agreed price                        ₹50,000
  List price for this scope         ₹2,40,000
  Lowest sellable price             ₹1,92,000   floor ₹8,000/day
  You are paid                         ₹2,083 /day
  Verdict                          BELOW FLOOR — DO NOT SIGN

  Either raise the price to ₹1,92,000, or cut the build from 24 to
  6.3 days (74% less work — which is what the skeleton is for).
```

Three verdicts:

| Verdict | Meaning | Action |
|---|---|---|
| **healthy** | at or above ₹10,000/day | sign |
| **thin** | between ₹8,000 and ₹10,000/day | acceptable once, never as a default |
| **below-floor** | under ₹8,000/day | **do not sign** — raise the price or cut the scope |

### What else already protects the price

| Guard | What it stops |
|---|---|
| Dependency resolution | Quoting a checkout without the catalogue and site beneath it. Quote `cart-cod` and all three are priced. |
| Unpriced feature blocks the total | The scope document refuses to print a number while any selected feature has no price. |
| Discount capped at 10% | The catalog's own limit, enforced so it cannot be exceeded in a hurry. |
| Minimum engagement ₹25,000 | No job is worth the admin below this. |
| `needsServer` flag | Serverless cost is visible at quote time, not discovered mid-build. |
| Regression test on Green Basket | `checkPrice(95000, …)` is asserted to be refused, so that specific mistake cannot recur silently. |

---

## 4 · How we scale — the honest comparison

Assume 15 billable days a month.

| Model | Builds/mo | Revenue/mo | Sales needed for break-even |
|---|---|---|---|
| Template store @ ₹50,000 (5 days) | 3.0 | ₹1,50,000 | **2.0 sales/mo** |
| Template store @ ₹75,000 (5 days) | 3.0 | **₹2,25,000** | **1.3 sales/mo** |
| Custom store @ ₹2,40,000 (24 days) | 0.6 | ₹1,50,000 | **0.4 sales/mo** |

Two things fall out of this that are not obvious:

**Template at ₹50,000 and custom at ₹2,40,000 earn the same money** — and the
template needs **five times the sales effort** to do it. Volume is not free;
every sale costs discovery, a proposal, onboarding and support.

**₹75,000 is the better template price.** Identical work, 50% more revenue, and
break-even needs 1.3 sales a month instead of 2. If the product is genuinely
five days of work, ₹75,000 pays ₹15,000/day — above your best current service.
There is no reason to price it at ₹50,000 except habit.

### The ladder this implies

| Product | Price | Days | What differs |
|---|---|---|---|
| **Template store** | ₹75,000 | 5 | Skeleton + config. Your theme, their content. No custom design. |
| **Custom store** | ₹2,40,000 | 24 | Custom design, custom flows, integrations |
| **Commerce platform** | ₹11,60,000 | 116 | Everything, multi-role, audit |

The gap between rung one and rung two is **design, not features**. That is the
line to sell on, and it is easy to explain: same engine, your own look costs
more.

---

## 5 · Retainers are the actual answer

Both scaling models above consume 10 of 15 days to reach break-even, leaving
almost nothing for sales — which is how the pipeline empties, which is the
position you are in now.

Four retainers at ₹25,000 reach the same ₹1,00,000 on about **6 days a month**,
leaving 9 days free. That free capacity is what buys the next client.

Project work is what you sell to get to a retainer. The retainer is the
business.

**Caveat, and it is the one that matters:** a retainer only costs ~1.5 days a
month if its scope is written down. Inventory Manager is a retainer without a
written boundary, and it is currently carrying a full commerce platform for
₹12,500/month. Retainer template §5.1 already says a retainer is a defined
scope of deliverables, not an hourly bucket. Use it.

---

## 6 · Decisions only you can make

1. **Is ₹50,000 a real product?** If yes, it cannot be sold until the skeleton
   reaches 80% reuse — and it should be ₹75,000. If it was a one-off
   concession, it must not become the default.
2. **Does the Starter tier stay at ₹2 L?** It pays exactly the floor at the
   slow end. Raise it, or hold the 1–3 page boundary hard.
3. **Do we publish the template tier?** Right now the site's cheapest entry is
   ₹1.5 L. A ₹75,000 productised store would widen the funnel considerably —
   but only once it can be delivered in five days.
4. **Which two retainers?** Still the only sales target that reaches break-even
   without consuming the capacity needed to find the next client.

---

## Appendix — reproduce any number here

```bash
cd commerce-skeleton
npm run quote                              # every feature and preset
npm run quote commerce-cod                 # a full scope
npm run quote commerce-cod -- --price 50000   # the margin check
npm test                                   # 27 tests including the gate
```

`buildDays` in `src/config/features.ts` are my estimates, derived from module
sizes in the Tresor and FreshKart codebases. They are the only judgement in the
model — everything else is a published fact or arithmetic. Change any of them
and every price and verdict in this document recalculates.
