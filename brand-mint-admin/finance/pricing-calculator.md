# Pricing Calculator — How to Quote Any Project

The deterministic way to price an engagement. Used in tandem with `03-SERVICE-CATALOG.md`. **Don't let AI quote prices** — models under-price out of helpfulness. Use this.

## The formula (project work)

```
Quote = (Senior days × Senior rate) + (Specialist days × Specialist rate)
       + Tooling pass-through
       + Risk buffer
       + Margin
```

### Inputs

| Input | Definition | Default |
|---|---|---|
| Senior days | Founder + senior eng/design hours / 8 | calculate per project |
| Senior rate | ₹25,000 per day (₹3,125/hour effective) | fixed |
| Specialist days | Hired contractor or specialist hours / 8 | calculate |
| Specialist rate | ₹15,000 per day | fixed |
| Tooling | API / hosting / licensed assets | pass-through with 0% markup |
| Risk buffer | 15% of subtotal | always include |
| Margin | 25% of subtotal | always include |

### Worked example: Studio-tier website (₹3.5 L)

- Senior days: 8 (strategy 1, design direction 2, build oversight 3, QA 1, launch 1)
- Specialist days: 6 (designer detailed 3, engineer detailed 3)
- Tooling: ₹0 (client pays Vercel direct)
- Subtotal: (8 × 25,000) + (6 × 15,000) = 200,000 + 90,000 = **₹2,90,000**
- Risk (15%): ₹43,500
- Margin (25%): ₹83,375
- **Total: ₹4,16,875** → round to ₹4 L → discount to public ₹3.5 L

The published price floor is intentionally below the formula because:
1. Volume justifies a slight discount
2. Public pricing is anchoring; we underpromise

If a project is custom (more pages, more complexity), drop the discount. The formula floor is the floor.

## The formula (retainer work)

```
Monthly retainer = (Monthly senior hours × Senior rate)
                 + (Monthly specialist hours × Specialist rate)
                 + Tooling
                 + Margin
```

| Input | Default |
|---|---|
| Senior rate (retainer) | ₹3,000 / hour (lower than project — retainer is recurring volume) |
| Specialist rate | ₹1,500 / hour |
| Margin | 30% |

### Example: SEO Engine retainer (₹1.25 L/mo)

- Senior hours: 12 (strategy + edits + reporting)
- Specialist hours: 32 (writing + tech SEO sprint)
- Subtotal: (12 × 3,000) + (32 × 1,500) = 36,000 + 48,000 = ₹84,000
- Tooling: ₹2,000 (Ahrefs share)
- Subtotal: ₹86,000
- Margin (30%): ₹25,800
- **Monthly retainer: ₹1,11,800** → published as ₹1,25,000 (₹13K buffer)

## When to break the formula (price up)

Add 20-50% if any of these are true:

- **Foreign client (Gulf, US, UK)** — international expectation is higher; INR billing is bonus, not cost-cut. Quote at GCC market rate (~₹6 L for what we'd do for ₹3.5 L for an Indian client).
- **Hard deadline (<3 weeks)** — premium for compressed schedule
- **NDA blocks portfolio rights** — premium because you lose marketing value
- **High brand sensitivity** — high-touch comms, frequent reviews; price the founder's calendar
- **Custom brief that needs new R&D** — first-time builds carry hidden cost

## When to break the formula (price down)

Discount 10-20% only if:

- **Multi-engagement bundle** (site + brand + tool in one SOW) — 10% off the smallest line
- **6-month or 12-month retainer commitment** — 5% / 10%
- **Founder is a personal warm referral** AND project is fast — case-by-case
- **Case-study partnership** — give 15% off in exchange for hard outcome data + named credit

Never discount for:
- "We're a startup" — irrelevant; we are too
- "Other quotes were lower" — see `objection-handling.md` #3
- "This is just our first project together" — bundle discount above is the only first-project incentive
- "Can we do it for ₹X?" without a trade

## Sanity-check ratios

After calculating, verify:

| Check | Target | Why |
|---|---|---|
| Project value / total team-days | ≥ ₹25,000/day | Below this we lose money |
| Margin (calculated) | ≥ 35% | Below this is an emergency-only price |
| Founder hours / total project hours | ≥ 30% | Below this means we're not delivering senior |
| First-week deliverable / total scope | ≥ 15% | If we can't ship 15% in week 1, scope is too vague |

If any check fails, the SOW is wrong, not the price. Re-scope.

## The "walk-away" price

Every quote has a floor below which we say no. Calculate as:

```
Walk-away = (Team-days × cost rate) × 1.10
```

Cost rates (not billing rates):
- Senior: ₹12,000/day
- Specialist: ₹8,000/day

For the website example above:
- (8 × 12,000) + (6 × 8,000) = 96,000 + 48,000 = ₹1,44,000
- × 1.10 = ₹1,58,400

If the buyer can't pay above ₹1.6 L for that scope, walk away. Below this we lose money.

## INR vs USD pricing

For Gulf / overseas clients, quote in INR but **mention an approximate USD/AED equivalent** in proposal:

> Investment: ₹6,00,000 (~$7,200 USD / 26,500 AED) plus 18% GST.

Why INR primary:
- Our books are in INR
- FX risk borne by client, not us
- Signal: we're an Indian studio, proudly

Update the FX disclaimer to: "Equivalent shown at the RBI reference rate on the proposal date. Final invoiced in INR; GST as applicable per Indian law."

## Common pricing mistakes (real ones we've made)

1. **Underestimating revisions** — buffer 2 review rounds; charge for the 3rd
2. **Forgetting tooling pass-through** — Imagen API costs add up at ₹50/gen × 50 gens
3. **Skipping the risk buffer** — 15% always; the project that doesn't need it pays for the project that does
4. **Quoting hourly when buyer prefers fixed** — most founders prefer fixed; quote fixed; buffer for it
5. **Mid-project discounts** — once you discount mid-project, the entire margin is gone

## Calculator (manual, in a spreadsheet)

Build this once in Google Sheets and reuse:

| A (Input) | B (Value) | C (Notes) |
|---|---|---|
| Senior days | _ | |
| Specialist days | _ | |
| Tooling pass-through | _ | |
| Risk % | 15% | hard-coded default |
| Margin % | 25% | hard-coded default |
| **Subtotal** | `=(B1*25000)+(B2*15000)+B3` | |
| Risk | `=Subtotal*B4` | |
| Margin | `=Subtotal*B5` | |
| **Quote (raw)** | `=Subtotal+Risk+Margin` | |
| **Walk-away** | `=((B1*12000)+(B2*8000))*1.10` | |

Always show both the quote and the walk-away. The gap between them is your real negotiating room.
