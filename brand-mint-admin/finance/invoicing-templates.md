# Invoicing Templates — GST-Compliant

How we invoice. Use Zoho Books or Razorpay invoicing — both produce GST-compliant invoices automatically. Templates below are reference for what fields the system must produce, and email copy that goes with each invoice.

## Required fields (Indian GST tax invoice)

Every invoice we issue must include:

1. Invoice number (sequential, no gaps within a financial year, format `BM/[YY-YY]/[NNNN]`)
2. Invoice date
3. Studio name: **Brand Mint Studio Private Limited**
4. Studio address (HITEC City) and GSTIN
5. Studio PAN (printed for reference)
6. Buyer's legal name, billing address, and GSTIN (mandatory if claiming input tax credit)
7. Place of supply (state of recipient)
8. HSN / SAC code:
   - **998314** — IT consulting and design services
   - **998391** — Specialized design services (brand work)
   - **998599** — Other support services (retainers)
9. Description of service (one line per SOW deliverable section)
10. Taxable value (in INR)
11. CGST 9% + SGST 9% (if intra-state — both Studio and buyer in Telangana) OR IGST 18% (if inter-state or other)
12. Total invoice value
13. Amount in words
14. Authorised signatory line

## Three invoice templates

### A. Project advance invoice (50% on signing)

```
INVOICE #BM/2026-27/0042
Date: [DD MMM YYYY]
Due: On receipt

To:
[Client legal name]
[Billing address]
GSTIN: [XX]
PAN: [optional]

Bill from:
Brand Mint Studio Pvt Ltd
HITEC City, Hyderabad, Telangana – 500081
GSTIN: 36XXXXX0000X1Z5
PAN: XXXXXXXXXX

SAC: 998314 — IT consulting and design services
Place of supply: [State of recipient]

| Description                                          | Amount (₹) |
|------------------------------------------------------|------------|
| Custom website — Studio tier — 50% advance per SOW   | 1,75,000   |
| BM-202605-Acme dated 01 May 2026                     |            |

Taxable value:                                          1,75,000
CGST @ 9%:                                                15,750   [or omit if inter-state]
SGST @ 9%:                                                15,750   [or omit if inter-state]
IGST @ 18%:                                                  —     [or 31,500 if inter-state]
─────────────────────────────────────────────────────
Total payable:                                          ₹2,06,500

Amount in words: Indian Rupees Two Lakh Six Thousand Five Hundred Only.

Payment: Bank transfer (NEFT/RTGS/IMPS)
A/c name: Brand Mint Studio Pvt Ltd
A/c number: XXXXXXXXXXXX
IFSC: HDFCXXXXXXX
UPI: brandmint@hdfcbank

Authorised signatory: [signature block]
Brand Mint Studio Pvt Ltd
```

Email body:

```
Subject: [Brand Mint] Invoice BM/2026-27/0042 — Acme website kickoff

Hi [Name],

Attached is the 50% advance invoice for the Acme website engagement
(SOW BM-202605-Acme).

Total: ₹2,06,500 (₹1,75,000 + 18% GST)
Due: on receipt
Bank details on the invoice; UPI also accepted.

Once paid, we'll open the Slack channel and book Week 0 kickoff
within 24 hours.

— [Founder name], Brand Mint
```

### B. Project balance invoice (50% on launch)

Same format as A, with description changed to:

```
| Description                                          | Amount (₹) |
|------------------------------------------------------|------------|
| Custom website — Studio tier — 50% balance per SOW   | 1,75,000   |
| BM-202605-Acme — launched [date]                     |            |
```

Email body:

```
Subject: [Brand Mint] Invoice BM/2026-27/0067 — Acme website launch

Hi [Name],

Acme.com is live. Congratulations.

Attached is the 50% balance invoice.
Total: ₹2,06,500
Due: Net-30 from invoice date.

Once paid, the 30-day post-launch warranty period begins formally.
Repo and accounts have been transferred per the handover doc shared
yesterday.

Thank you for trusting us with this. Let's compound.

— [Founder name], Brand Mint
```

### C. Monthly retainer invoice

```
INVOICE #BM/2026-27/0091
Date: 01 [Month] 2026
Due: Net-15 from invoice date

To:
[Client legal name]
[GSTIN, address]

SAC: 998599 — Other support services
Place of supply: [State]

| Description                                          | Amount (₹) |
|------------------------------------------------------|------------|
| SEO Engine retainer — [Month] 2026                   | 1,25,000   |
| Per Retainer Agreement BM-RTN-202604-Acme           |            |

Taxable value:                                          1,25,000
CGST + SGST @ 18% (or IGST):                              22,500
─────────────────────────────────────────────────────
Total payable:                                          ₹1,47,500
```

Email body:

```
Subject: [Brand Mint] [Month] retainer invoice — [Client]

Hi [Name],

[Month]'s retainer invoice attached.

Total: ₹1,47,500 (Net-15)

Last month's deliverables are summarised in the report sent on the
last working day of [previous month]. This month, we're focused on:

- [Deliverable 1]
- [Deliverable 2]
- [Deliverable 3]

— [Founder name], Brand Mint
```

## Overdue invoice — first reminder (Day 31 / Day 16 for retainer)

```
Subject: Friendly reminder — Invoice BM/2026-27/0042

Hi [Name],

Quick nudge on invoice BM/2026-27/0042 (₹2,06,500), which was due on
[date]. Probably just slipped through — no urgency yet.

Could you let me know expected payment date so I can reconcile our
books?

Thanks,
— [Name]
```

## Overdue invoice — second reminder (Day 45 / Day 30 for retainer)

```
Subject: Invoice BM/2026-27/0042 — please prioritise

Hi [Name],

Following up on invoice BM/2026-27/0042 (now [N] days overdue).
Per our MSA, overdue amounts accrue 2% interest per month from the
due date — that's ₹[X] additional as of today.

If there's a genuine payment-side delay, just tell me and we'll work
something out. If it's an oversight, please process this week.

— [Name]
```

## Overdue invoice — third reminder + work pause (Day 60)

```
Subject: Pausing work on Acme — invoice BM/2026-27/0042

Hi [Name],

Per our MSA Section 2.4, this invoice is now [N] days overdue with
interest of ₹[X] accrued. I'm pausing all active work on the Acme
engagement until the invoice clears.

Happy to resume immediately on payment. Please let me know how you'd
like to proceed.

— [Name]
```

This is a hard message but a fair one. Send it. Studios that don't pause die slow deaths to slow-paying clients.

## TDS reconciliation

Many Indian clients deduct TDS at 2% on professional/technical services. When this happens:

1. The client pays you the invoice **net of TDS** (e.g., ₹2,06,500 invoice → ₹2,02,370 received)
2. Client files Form 26Q quarterly; the TDS amount appears in your Form 26AS
3. You claim this against your annual income tax liability — refund or offset

Track every TDS deduction in a separate Zoho Books category. Reconcile every quarter against Form 26AS. Discrepancies get raised with the client immediately.

## LUT for foreign clients

Before the first foreign-currency invoice each year, file LUT (Letter of Undertaking) on the GST portal. This permits zero-rated GST on export of services. **No GST charged on foreign invoices**, but you must mention LUT reference.

Foreign invoice template addition:

```
Note: Export of services under LUT no. AD-XXXXX dated DD-MMM-YYYY.
Zero-rated supply per IGST Act § 16(1)(a).
GST: NIL
```

## Yearly book closure

Owner: CA on retainer. Founder reviews:

- Gross revenue reconciled with bank
- Total GST collected reconciled with GSTR returns
- Total TDS deducted reconciled with 26AS
- Income tax provision calculated
- Any deductible expenses (Section 80, depreciation) claimed

Annual ITR-6 filing happens by November end for the previous financial year.
