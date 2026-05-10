# 10 · Legal & Compliance Checklist (India)

**Disclaimer:** this is operational guidance, not legal advice. Run all of it past a qualified Indian Chartered Accountant and a startup-friendly lawyer before signing anything. Templates in `contracts/` are starting points; have them reviewed before first use.

## Entity setup

### Choose your structure

| Structure | When | Annual compliance cost |
|---|---|---|
| **Pvt Ltd** (recommended) | If raising or planning to · expecting Gulf clients · 3+ founders | ₹40K–₹1 L/year |
| **LLP** | 1-2 founders · low compliance preference · not raising | ₹20K–₹40K/year |
| **OPC (One Person Company)** | Solo founder testing the waters | ₹25K–₹50K/year |
| **Sole Proprietorship** | Pre-revenue · short-term | ₹0–₹10K/year |

For Brand Mint at this stage: **start as Pvt Ltd**. The Gulf market expects an incorporated entity on the contract; OPCs and LLPs raise eyebrows.

### Registration steps (Pvt Ltd, India)

1. Get Digital Signature Certificate (DSC) for directors
2. Apply for DIN (Director Identification Number)
3. Reserve company name on MCA portal (RUN service)
4. File SPICe+ form with MOA + AOA
5. Get Certificate of Incorporation
6. Open company current account (HDFC, ICICI, or Razorpay X recommended for digital-first)
7. Apply for PAN, TAN automatically with SPICe+

Time: **15-25 working days end-to-end**. Cost: ~₹15K including govt fees.

## GST registration

- **Threshold for mandatory registration:** ₹20 L revenue (₹40 L for goods, but services = ₹20 L)
- **Practical advice:** register from day 1 if any client invoices >₹50K. Clients prefer GST-compliant vendors and you can claim input tax credit on tools.
- **Rate for our services:** 18% GST on creative + IT services
- **State of registration:** Telangana (where the studio is based)

### GST invoice — mandatory fields

```
Invoice number (sequential, no gaps)
Date
Buyer name + GSTIN + billing address
Studio name + GSTIN + studio address
Description of service (HSN code 998314 for IT consulting / 998391 for design)
Amount (taxable value)
CGST 9% + SGST 9% (intra-state) OR IGST 18% (inter-state)
Total
Place of supply
Authorised signature
```

Use Zoho Books or Razorpay invoicing — they handle this automatically.

## Other tax registrations

| Item | When | Why |
|---|---|---|
| Professional Tax (Telangana) | Once revenue exists | Mandatory in Telangana |
| Shops & Establishment Act | Once you have a physical office | Mandatory |
| Provident Fund (PF) | When you have 20+ employees | Skip until then |
| ESIC | Salary brackets <₹21K | Skip if hiring senior only |

## Startup India + MSME

Both are free, both unlock benefits:

- **Startup India recognition** — tax holiday on profit (3 of first 7 years), self-certification on labour laws, easier IP filing
- **MSME / Udyam registration** — payment-protection laws (clients must pay within 45 days), priority sector lending, lower interest

Apply within month 1 of incorporation. Both are online, single-page forms.

## Banking & FEMA (foreign clients)

For Gulf / overseas clients:

- Use a current account that supports inward remittance (HDFC, ICICI, Razorpay X, Wise Business)
- Each inward USD/AED transfer needs a **FIRC (Foreign Inward Remittance Certificate)** — your bank issues it
- Categorise inflows under SOFTEX returns (for software) or under "consultancy" code with RBI
- Keep a trail of invoice → SWIFT/wire → FIRC → bank credit for every transaction

LUT (Letter of Undertaking) under GST — file annually, allows zero-rated GST on exports of services. Do this before the first overseas invoice.

## Contracts you need (templates in `contracts/`)

| Doc | When to use | Notes |
|---|---|---|
| **MSA (Master Services Agreement)** | First contract with any new client | Long-form; covers IP, indemnity, term |
| **NDA (mutual)** | When discussions get specific (between discovery and proposal) | Always mutual, never one-way |
| **Proposal / SOW** | Per project | References the MSA; project-specific |
| **Retainer agreement** | Monthly engagements | Auto-renew with 30-day notice |
| **IP assignment** | When deliverables transfer to client | Usually inside MSA, sometimes separate |
| **Employment contract** | Per hire | Includes IP assignment, non-compete (carefully) |
| **Contractor agreement** | For freelancers/consultants | IP assignment + confidentiality + tax (TDS) |

## IP — who owns what

Default position in our contracts:

- **Client owns** the final deliverables (logo, site, tool) on full payment
- **Brand Mint owns** the methodology, internal templates, the brand-mint repo, AI prompts, our process docs
- **Brand Mint retains** the right to display the work in our portfolio + case studies, unless explicitly NDA-bound (charge a premium for full NDA)
- **Pre-existing components** (e.g. our shadcn fork, our internal libraries) remain Brand Mint's; client gets a perpetual license to use within their product

## TDS (Tax Deducted at Source)

When clients pay us, they may deduct TDS — typically 2% on professional/technical services, 10% on royalties.

- Issue Form 16A claim to client; deposit shown in your Form 26AS
- Reconcile every quarter
- Claim refund if total TDS > tax liability

When you pay vendors/freelancers, you deduct TDS (10% on professional services > ₹30K/year). File quarterly TDS returns (Form 26Q). Penalty for non-filing is high — automate via your CA.

## Insurance to consider

| Type | Premium estimate | Why |
|---|---|---|
| Professional Indemnity | ₹15-40K/year for ₹50 L cover | Covers errors/omissions in deliverables |
| Cyber liability | ₹20-50K/year | If you handle client data |
| Office contents | ₹5-10K/year | If you have a physical office with gear |
| Director's & Officers' (D&O) | ₹40K-1 L/year | Once you raise outside capital |

Skip life/health from company side initially — directors handle personally.

## Annual compliance calendar

| Month | Filing |
|---|---|
| April | LUT renewal for GST (for export of services) |
| May | TDS Q4 + ITR-6 prep begins |
| July | Form 26Q for Q1 |
| September | DIR-3 KYC for directors |
| October | TDS Q2 |
| November | ITR-6 due (companies) |
| January | TDS Q3 |
| March | Closing books, audit prep |

## CA / lawyer recommendations

Hire two professionals immediately:

1. **CA on retainer** — ~₹15-25K/month. Files GST monthly, TDS quarterly, books, ITR. Worth every rupee.
2. **Lawyer on hourly** — ~₹3-8K/hour. Reviews MSA + retainer + employment contracts once. Then on-call for disputes.

Vetted-by-startups options: search Lawyered, Vakilsearch, IndiaFilings — but ask for individual partner names and meet them, not the brand.

## What can sink you (top risks)

1. **Not registering for GST when crossing threshold** — back-tax + penalty + interest. Painful.
2. **Skipping FIRC + LUT** for foreign clients — IT department flags as undisclosed income.
3. **Verbal scope changes** with clients — disputes will go your way only if it's in writing.
4. **Over-reliance on one client** — if one client is >40% of revenue, prepare a contingency.
5. **Not paying salaries / contractors on time** — instant trust collapse, hard to repair.
