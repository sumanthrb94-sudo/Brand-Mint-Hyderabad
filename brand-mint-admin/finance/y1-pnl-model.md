# Year 1 P&L Model — Numbered

The full Y1 financial model, line by line, with assumptions documented. Reference for `06-FINANCIAL-MODEL.md`. Update monthly with actuals.

## Top-line summary

| Line | Plan |
|---|---|
| Revenue | ₹1,20,00,000 |
| Direct costs | ₹19,40,000 |
| Gross profit | ₹1,00,60,000 |
| Gross margin | 84% |
| Operating costs | ₹58,30,000 |
| **EBITDA** | **₹42,30,000** |
| **EBITDA margin** | **35%** |

## Revenue build

### Project revenue (₹70 L)

| Service | Engagements | Avg ticket | Subtotal |
|---|---|---|---|
| Custom websites | 8 | ₹3,50,000 | ₹28,00,000 |
| Custom internal tools | 5 | ₹6,00,000 | ₹30,00,000 |
| Brand systems | 3 | ₹2,00,000 | ₹6,00,000 |
| AI integrations | 2 | ₹3,00,000 | ₹6,00,000 |
| **Project subtotal** | **18** | | **₹70,00,000** |

### Retainer revenue (₹50 L)

| Type | Active retainers | Avg months | Avg fee | Subtotal |
|---|---|---|---|---|
| Performance Media | 4 | 6 | ₹1,50,000 | ₹36,00,000 |
| SEO / Content | 2 | 7 | ₹1,00,000 | ₹14,00,000 |
| **Retainer subtotal** | **6 EOY** | | | **₹50,00,000** |

### Quarterly ramp

| Quarter | Project signings | Active retainers EOQ | Quarterly revenue |
|---|---|---|---|
| Q1 (M1-3) | 3 | 0 | ₹14,00,000 |
| Q2 (M4-6) | 4 | 2 | ₹26,00,000 |
| Q3 (M7-9) | 5 | 4 | ₹35,00,000 |
| Q4 (M10-12) | 6 | 6 | ₹45,00,000 |
| **Total** | **18** | **6** | **₹1,20,00,000** |

## Direct costs (cost of services delivered)

### Contractor / freelance support (₹12 L)

Until Hire #1 lands at M4, founder is delivery. Estimated 4 hires of freelance support across the year (designer help, copywriting, illustration):

| Quarter | Freelance days | Daily rate | Subtotal |
|---|---|---|---|
| Q1 | 8 days | ₹12,000 | ₹96,000 |
| Q2 | 12 | ₹12,000 | ₹1,44,000 |
| Q3 | 18 | ₹12,000 | ₹2,16,000 |
| Q4 | 28 | ₹12,000 | ₹3,36,000 |
| Add post-hire spillover | | | ₹4,00,000 |
| **Subtotal** | | | **₹11,92,000** |

### LLM API usage (project pass-through where applicable, ₹2 L net cost)

For AI integration projects: API usage during build that's not yet client-billable. Net studio cost ~₹2 L.

### Hosting / tools billed-per-project (₹1.5 L)

Vercel Pro shared, Supabase team plan, third-party APIs not yet on client's account during build.

### Stock photography / licensed assets (₹1 L)

Iconography subscriptions, Unsplash+, Adobe Stock when needed.

### Travel pass-through (₹2.5 L)

Travel-on-us above ₹5 L engagement (per `03-SERVICE-CATALOG.md`).

### Direct costs total: ₹19,42,000

## Gross profit: ₹1,00,58,000

Gross margin: ₹100,58,000 / ₹1,20,00,000 = **83.8%** ≈ 84%.

## Operating expenses (₹58.3 L)

### Salaries and founder draw (₹40.5 L)

| Person | Role | Start | Monthly | 12-mo cost |
|---|---|---|---|---|
| Founder | Studio Director | M1 | ₹2,00,000 (draw) | ₹24,00,000 |
| Senior Designer (Hire #1) | Design | M4 | ₹1,50,000 | ₹13,50,000 |
| Senior Engineer (Hire #2) | Build | M6 (skip in Y1 model: assume contractor only) | – | – |
| **Subtotal** | | | | **₹37,50,000** |

(Engineer hire pushed to M9 in conservative Y1 → assume only ₹3 L for the last 2 months.)

| Adjustment | Amount |
|---|---|
| Conservative engineer ramp | ₹3,00,000 |
| **Total people cost** | **₹40,50,000** |

### Tools & subscriptions (₹3.6 L)

| Item | Monthly | 12-mo |
|---|---|---|
| Google Workspace 3 seats | ₹400 | ₹4,800 |
| Vercel + Cloudflare baseline | ₹2,000 | ₹24,000 |
| Figma 2 seats | ₹2,500 | ₹30,000 |
| Linear / Notion / Loom / Slack stack | ₹4,000 | ₹48,000 |
| Anthropic / OpenAI / Gemini APIs | ₹15,000 | ₹1,80,000 |
| Zoho Books + payment fees | ₹1,500 | ₹18,000 |
| Plausible / observability | ₹1,200 | ₹14,400 |
| Misc / ramp | ₹3,000 | ₹36,000 |
| **Subtotal** | | **₹3,55,200** |

### Studio + ops (₹11.8 L)

| Item | 12-mo |
|---|---|
| WeWork 2 seats | ₹4,80,000 |
| Internet / utilities / amortised gear | ₹96,000 |
| Travel (Mumbai/Bengaluru/Dubai) | ₹6,00,000 |

### Marketing (₹4.5 L)

| Item | 12-mo |
|---|---|
| LinkedIn / retargeting (light) | ₹2,00,000 |
| Conferences / sponsorships | ₹1,00,000 |
| Photo / case study production | ₹1,50,000 |

### Compliance / legal / contingency (₹6.1 L)

| Item | 12-mo |
|---|---|
| CA retainer | ₹1,20,000 |
| Lawyer ad-hoc | ₹50,000 |
| Insurance (PI + cyber) | ₹40,000 |
| Buffer / unforeseen | ₹4,00,000 |

### Operating cost subtotal

| Category | Amount |
|---|---|
| People | ₹40,50,000 |
| Tools | ₹3,55,000 |
| Studio + ops | ₹11,80,000 |
| Marketing | ₹4,50,000 |
| Compliance / buffer | ₹6,10,000 |
| **Operating costs total** | **~₹66,45,000** |

(Note: this is more than the executive summary's ₹58 L because we left a ₹4 L buffer + ₹4 L conservative engineer ramp not in the original sketch. The ₹42 L EBITDA in `06-FINANCIAL-MODEL.md` assumes leaner reality. **Use ₹66 L as the conservative number; ₹58 L as the optimistic.**)

### Conservative EBITDA: ₹100.5 L − ₹66.5 L = **₹34 L (28% margin)**

## Cash flow timing

Revenue and cash diverge because:
- 50% advance hits on signature
- 50% balance hits Net-30 from launch invoice
- Retainers invoice 1st of month, paid Net-15

| Quarter | Revenue earned | Cash collected (lag) |
|---|---|---|
| Q1 | ₹14,00,000 | ₹10,50,000 |
| Q2 | ₹26,00,000 | ₹22,00,000 |
| Q3 | ₹35,00,000 | ₹31,00,000 |
| Q4 | ₹45,00,000 | ₹38,00,000 |
| Q1 Y2 (catch-up) | – | ₹18,50,000 |
| **Y1 cash** | | **₹1,20,00,000** (eventually) |

Cash runway implication: maintain ₹15 L+ working capital buffer to cover the lag during Q1-Q3.

## Sensitivity analysis

What if revenue lands 30% below plan (₹84 L)?

| Line | 70% scenario |
|---|---|
| Revenue | ₹84,00,000 |
| Gross profit (84% margin holds) | ₹70,56,000 |
| Operating costs (semi-fixed) | ₹60,00,000 (cut ₹6.5 L by deferring engineer hire) |
| **EBITDA** | **₹10,56,000 (12.5%)** |

Still profitable. Survival isn't at risk until revenue drops below ₹65 L AND we don't cut costs.

What if revenue lands 30% above plan (₹156 L)?

| Line | 130% scenario |
|---|---|
| Revenue | ₹1,56,00,000 |
| Gross profit | ₹1,30,80,000 |
| Operating costs (some scaling — add 1 contractor) | ₹72,00,000 |
| **EBITDA** | **₹58,80,000 (38%)** |

Don't trust the optimistic number until October data comes in.

## Update cadence

- **Monthly** — actuals vs plan, by line item, last working day of month
- **Quarterly** — full re-forecast for the next 4 quarters
- **Annually** — full Y2 model in November/December for January start

Owner: founder until producer (Hire #3) takes it on.
