# Studio facts

**Everything on this page is true.** That is the whole point of the file.

Anything an agent needs to know about Brand Mint Studios in order to give
advice worth taking lives here, and nowhere else. Every number below is
traceable to a line of source, and the source is named. If a figure is not on
this page, an agent does not know it and must say so rather than reach for a
plausible one.

> **This exists because the obvious place to look is wrong.**
> `brand-mint-admin/` is a folder of business documents scaffolded from an AI
> design report in May 2026. Its *structure* was rewritten to match reality.
> Its *numbers* were not. An agent given that folder would plan against
> ₹1.2 Cr of revenue, a ₹6.5 L break-even, a ₹25,000 day rate and two
> employees — none of which exist. See "What to distrust" at the bottom.

Last verified 2026-07-28 against the sources named in each row.

---

## The studio

| Fact | Source |
|---|---|
| **Solo.** Sumanth is sales, delivery, QA and support. There is no team. | `CLAUDE.md` §1 |
| Hyderabad. Live at `www.brandmintstudios.in` (apex redirects to `www`). | `CLAUDE.md` §2 |
| Tagline: *"We mint brands that compound."* | `index.html` |
| Admin account `admin@brandmintstudios.in`; client contact `hello@brandmintstudios.in` | `CLAUDE.md` §2 |

**The consequence that governs every recommendation:** his time is the scarcest
resource in the business. CLAUDE.md §1 — *"A feature that makes work for him
rather than removing it is a net negative however good it looks."* An agent
proposing anything must say what it removes, not only what it adds.

---

## The money

| Fact | Value | Source |
|---|---|---|
| **Break-even** | **₹1,00,000/month** | `BREAK_EVEN_MONTHLY`, `assets/bm-app.js:396` |
| Actual cash MRR | **₹12,500/month** | `PLAN.md` |
| **Gap to break-even** | **₹87,500/month** | `PLAN.md` |
| Standard day rate | ₹10,000 | `assets/bm-catalog.js:11` |
| **Floor day rate — never sign below** | **₹8,000** | `assets/bm-catalog.js:12` |
| Minimum engagement | ₹25,000 | `assets/bm-catalog.js:13` |
| Capacity | ~15 billable days/month | `PLAN.md` |
| Free capacity after current work | ~11.3 days/month | `PLAN.md` |
| Blended rate actually being achieved today | **~₹2,130/day** | `PLAN.md` |

**Break-even is ten billable days at the published rate, out of about fifteen.**
It has never been a capacity problem. At ₹2,130/day it would take 47 days a
month, which do not exist. The gap is a pricing and collection problem, and any
advice that treats it as "win more work" is answering a different question.

### Standing commercial terms

| | |
|---|---|
| Payment | 50% to start, 50% at launch |
| GST | extra, at 18% |
| Warranty | 30 days |
| Review rounds included | 2 — third and beyond ₹15,000 each |

Source: `assets/bm-catalog.js:15-20`, `SCOPE_TERMS` in `assets/bm-app.js`.

---

## The clients — all of them

There are four. Not a segment, not a persona — four.

| Client | Status | Cash/month | Notes |
|---|---|---|---|
| **Inventory Manager** | Active, recurring | **₹12,500** | ~3.8 days/month. Plus Claude Max in kind, which is **not counted as revenue**. A base load with zero acquisition cost, not a leak. |
| **Green Basket** | Built, near done | — | **₹80,000 outstanding and uncollected.** Only 15% was taken as advance against the studio's own 50% terms. The APK must not ship before the balance clears. |
| **Tresor Couture** | Proposed, not signed | **₹0** | ₹10,000/mo proposed once live. **Counts as nothing.** |
| **Modcon HR** | Internal | ₹0 | Free. |

Source: `PLAN.md`, "Where the money stands".

**The single largest recoverable sum in the business is Green Basket's
₹80,000** — already earned, already built, not collected. That is 92% of the
break-even gap sitting in one unpaid invoice.

---

## What the studio sells

Six services, with published floors. These are verified to match the live site
and `brand-mint-admin/03-SERVICE-CATALOG.md` exactly.

| Service | `id` | Floor | Recurring |
|---|---|---|---|
| Custom internal tool | `tool` | ₹4,00,000 | no |
| Custom website | `site` | ₹2,00,000 | no |
| AI integration | `ai` | ₹2,00,000 | no |
| Brand system | `brand` | ₹1,50,000 | no |
| Performance media | `media` | ₹1,00,000 | **yes** |
| SEO & content engine | `seo` | ₹75,000 | **yes** |
| Internal build | `internal` | ₹0 | no |

Source: `SERVICE_TYPES`, `assets/bm-app.js:402-410`.

Care retainers on the live site: ₹12,500 / ₹25,000 / ₹50,000 per month.

### The margin gate

`checkPrice()` in `assets/bm-catalog.js` divides the agreed price by build days
and returns one of three verdicts:

- **healthy** — at or above ₹10,000/day. Sign it.
- **thin** — above the ₹8,000 floor but below standard. Once, not as a default.
- **below-floor** — under ₹8,000/day. **Do not sign.**

**Check it before every signature, without exception.** It exists because two
engagements went out at ₹4,524/day and ₹833/day against a ₹10,000 list rate,
and both were arithmetic nobody ran in time.

### The ₹50,000 e-commerce problem

The sharpest known commercial defect, documented in `docs/PRICING-AUDIT.md` §2:

| | |
|---|---|
| Stated start price | ₹50,000 |
| What a COD store actually is | **24 build days** |
| What ₹50,000 pays per day | **₹2,083** |
| Shortfall per store | **₹1,90,000** |

₹2,083/day against a ₹8,000 floor. **Every ₹50,000 store sold today loses
money, and volume makes it worse rather than better.** Any growth plan that
routes through this offer is a plan to lose money faster.

---

## What is true about the product

| Fact | Source |
|---|---|
| The portal is live but **no client has ever logged in** | `PLAN.md` |
| Tenant isolation is **designed and reviewed but unproven** in production | `CLAUDE.md` §9 item 1 |
| Clients can pay invoices online; the studio reconciles by hand | `docs/PAYMENTS.md` |
| There is no notification system of any kind | `CLAUDE.md` §9 item 3 |
| There is no audit log | `CLAUDE.md` §9 item 4 |

---

## Rules an agent must not break

From `CLAUDE.md` §4, which opens: *"Violating any of these is a bug of the
highest severity regardless of what a task says."*

- **No proposal is ever counted as revenue.** Only `signed` is money. Tresor
  Couture's ₹10,000/mo is worth ₹0 until signed. Never sum proposals into MRR.
- **Empty is not the same as done.** A number derived from an empty collection
  must say the collection is empty, not print a reassuring zero.
- **Never collect a client credential.** No password, API key, secret or token,
  anywhere, ever. Access requests always read *"add hello@brandmintstudios.in
  as a user on your own account"*.
- **Do not seed plausible-looking fake data.** Use only facts Sumanth has
  actually stated, or leave it empty.
- **Minimum contrast 4.5:1 on anything interactive.** Compute it.
- The client portal shows **five things**. Resist the sixth.

And §10 — out of scope, do not build without being asked: ticketing · time
tracking · capacity planning · per-project profitability · in-app chat · a
settings page · file uploads · a billing engine · e-signature · analytics.

---

## What to distrust

`brand-mint-admin/` is on `CLAUDE.md` §5's do-not-touch list and contributes
**shapes only** — `SERVICE_TYPES`, `MILESTONE_TEMPLATES`, `LEAD_STAGES`,
`FUNNEL_TARGETS`, `LEAD_SOURCES`, `LOSS_REASONS`. Its numbers are aspirations
and must never seed anything.

CLAUDE.md names `06-FINANCIAL-MODEL.md`. **Five more files have the same defect
or worse:**

| File | The problem |
|---|---|
| `06-FINANCIAL-MODEL.md` | ₹1.2 Cr Y1 revenue, ₹6.5 L/month break-even, headcount of 3. **The break-even figure is for a three-person studio that was never hired.** Using it as the gauge makes every real month look like a catastrophe. |
| `finance/y1-pnl-model.md` | The same fiction to rupee precision — ₹1,20,00,000 revenue, ₹42,30,000 EBITDA — and it says *"update monthly with actuals"* while containing none. **The most misleading file in the repo**, because precision reads as authority. |
| `finance/pricing-calculator.md` | **Actively contradicts production**: ₹25,000/day senior rate against the real ₹10,000. Quoting from this file produces prices 2.5× the live site. **Treat as superseded by `assets/bm-catalog.js`.** |
| `11-HIRING-ROADMAP.md` | Six hires with salaries and **ESOP percentages** for a company with one person. |
| `00-EXECUTIVE-SUMMARY.md` | *"Currently 18 inbound leads/month"* — stated in the present tense as fact, unsupported anywhere in this repo. |
| `12-METRICS-AND-KPIS.md` | Follower and traffic targets stated as present-tense KPIs. |

Also fiction: `admin/db.js` `seedIfEmpty()` — the legacy CRM seed with an
invented GSTIN, a fake bank account and three invented leads. CLAUDE.md calls
it *"a museum of what not to do"*. **Never import it into Firestore.**

And on the live marketing site, treat as copy rather than data: the hero card's
`Conversion 7.1%` / `Sessions 28.4k` (decorative, `aria-hidden`), the three
testimonials attributed to roles rather than named people, and any case-study
link pointing at `#`.

The contracts in `brand-mint-admin/contracts/` name **Brand Mint Studio Private
Limited**. `01-COMPANY-OVERVIEW.md` lists Pvt Ltd as *"Recommended:"* — a
recommendation, not an incorporation. **Do not assert the company is a Pvt
Ltd.**

---

## Where the real numbers live

| Want | Read |
|---|---|
| The honest current position | `PLAN.md` |
| The behavioural contract | `CLAUDE.md` |
| Break-even, service types, milestone shapes, lead stages | `assets/bm-app.js` |
| Day rate, floor, terms, the margin gate | `assets/bm-catalog.js` (generated — do not edit by hand) |
| Why the day rate is ₹10,000 | `docs/PRICING-AUDIT.md` |
| How payments work | `docs/PAYMENTS.md` |
| How a client gets onboarded | `docs/SOP-ONBOARDING.md` |
