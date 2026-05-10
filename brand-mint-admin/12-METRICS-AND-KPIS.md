# 12 · Metrics & KPIs

What we measure, how often, and what action follows from each number. The dashboard.

## The 5 numbers we obsess over

These get reviewed every Monday in 30 minutes. If any moves >20% week-over-week, the founder schedules a 1:1 deep-dive within 48 hours.

| # | Metric | Target Y1 | Source |
|---|---|---|---|
| 1 | Cash on hand | ≥3 months of fixed costs (₹20 L by M9) | Bank dashboard |
| 2 | Pipeline value (weighted) | ≥3× monthly target revenue | Sales tracker |
| 3 | MRR (retainers) | Growing every month | Zoho Books |
| 4 | Open AR (unpaid invoices) | <10% of monthly revenue, <30 days overdue | Zoho Books |
| 5 | Burn rate (3-mo rolling avg) | <100% of revenue | Bank reconciliation |

## Weekly dashboard (Monday standup, 30 min)

```
┌─ Week of: [date] ───────────────────────────────────────┐
│                                                          │
│  Cash on hand:        ₹___ L      Δ vs last week: +/- %  │
│  Pipeline (weighted): ₹___ L      Δ vs last week: +/- %  │
│  MRR:                 ₹___ K      Δ vs last week: +/- %  │
│  AR open / overdue:   ₹___ K  /  ₹___ K                  │
│  Burn rate (3mo avg): ₹___ L                              │
│                                                          │
│  Active engagements:  __                                 │
│  This week's launches: __                                │
│  This week's signed:  __                                 │
│                                                          │
│  Top 3 risks this week:                                  │
│   1. ...                                                 │
│   2. ...                                                 │
│   3. ...                                                 │
└──────────────────────────────────────────────────────────┘
```

Builds in Notion, Coda, or a Google Sheet. Owner: studio manager once hired; founder until then.

## Monthly review (last Friday, 90 min)

Add to weekly dashboard:

- **Revenue this month** (project + retainer)
- **New retainers signed** count
- **Project margin** (revenue minus direct costs per project)
- **Lead-source mix** (% from each of the 5 sources in `04-SALES-PLAYBOOK.md`)
- **NPS-like score** from 3 most recent client check-ins
- **Studio capacity utilisation** (booked weeks / available weeks)

## Quarterly review (90 min, end of quarter)

Add:

- **Win/loss analysis** — pipeline that closed (won) and lost, categorised by reason
- **Customer concentration** — top 3 clients as % of revenue (target: <50% combined)
- **Time allocation** — founder hours into sales / delivery / ops / writing
- **ICP drift** — are we still serving Tier 1 clients, or quietly drifting downmarket?
- **Comp ratio** — total comp as % of revenue (target: <50%)

## Project-level KPIs (every engagement)

Tracked per project; reviewed at handover and again 90 days post-launch.

| Metric | Target | Why |
|---|---|---|
| On-time delivery | 90%+ | Reputation compounds on this |
| Scope-creep cost as % of project | <15% | Healthy creep is fine; chronic creep means bad SOWs |
| Direct margin | >55% gross | Below this, we lose money fast |
| Client NPS at handover | ≥9/10 | Retainer conversion correlates with this |
| Case-study eligibility | 80%+ of projects | Even if not all get published |
| Lighthouse score (web projects) | 90+ on all 4 axes | Quality bar |
| Retainer conversion (post-project) | 30%+ | Drives Y2 revenue |

## Marketing / content KPIs

| Metric | Target Y1 | Why |
|---|---|---|
| LinkedIn (founder) followers | 5,000 by EOY | Foundation for warm pipeline |
| LinkedIn engagement rate | >5% | Vanity if engagement is low |
| Site monthly uniques | 8,000 by EOY | Inbound depends on this |
| Inbound → discovery call rate | 40%+ | Conversion of contact form fills |
| Newsletter subscribers | 1,500 by EOY | Owned audience > rented |
| Branded search volume | Growing month-over-month | Brand strength signal |

## Sales-funnel KPIs (mirrors `04-SALES-PLAYBOOK.md`)

| Stage | Target conversion |
|---|---|
| Inbound → Qualified | 40% |
| Qualified → Workshop | 50% |
| Workshop → Proposal | 80% |
| Proposal → Signed | 60% |
| Overall: Inbound → Signed | ~10% |

If conversion at any stage drops >10pp below target for 2 consecutive months, the playbook for that stage gets rewritten.

## People KPIs (once we have hires)

| Metric | Target |
|---|---|
| Hiring time-to-fill (per role) | <8 weeks |
| Trial → conversion rate | >70% (we screen well) |
| 12-month retention | >85% |
| Internal NPS (anonymous quarterly) | ≥8/10 |
| Bench time (engineer/designer not on a project) | <10% of capacity |

## What NOT to measure

These are common metrics that mislead at our stage. Don't put them on the dashboard.

- **Hours worked.** Output, not hours.
- **Billable utilisation %.** Encourages padded timesheets and discourages thinking time.
- **Vanity follower counts** without engagement context.
- **Number of proposals sent.** Quality > quantity.
- **Average deal size.** Mix shifts; medians lie.

## Tooling

| Need | Tool |
|---|---|
| Numbers dashboard | Notion / Coda / Google Sheets |
| CRM / pipeline | Linear or Notion (avoid Salesforce until Y3+) |
| Books / invoicing | Zoho Books or QuickBooks India |
| Bank | HDFC + Razorpay X (real-time view) |
| Analytics (site) | Plausible (privacy-friendly, ₹500/mo) |
| Analytics (LinkedIn) | Native + Shield Analytics |

## Reporting cadence to clients

For retainer engagements:
- **Weekly Loom** — 5 min progress update
- **Monthly written report** — what we did, what's next, what we're stuck on
- **Quarterly business review (QBR)** — 60-min meeting, comparative metrics, strategy reset

For project engagements:
- **Daily Loom** weeks 1-2, weekly thereafter
- **Final report** at handover with pre/post numbers (where measurable)

## Founder's personal KPIs (yes, you measure yourself too)

| Metric | Target |
|---|---|
| Hours on sales (Stages 1-4) per week | 8-12 hours |
| Hours on delivery (active client work) per week | ≤25 hours by M6 |
| Hours on writing / content per week | 4-6 hours |
| 1-on-1s with active clients per week | Each retainer client × 1 |
| Reading hours per week | 4+ |

If founder delivery hours exceed 30 for 2 consecutive months → trigger a hire conversation.

## Antipatterns to watch for

1. **Revenue up but margin down** — pricing power eroding
2. **Pipeline up but conversion down** — qualifying poorly
3. **NPS up but retention down** — clients love the work but don't renew (probably a "not enough need" problem, not a quality problem)
4. **Followers up but inbound flat** — content reaching wrong audience
5. **Founder hours up despite hires** — bad delegation, founder is the bottleneck
