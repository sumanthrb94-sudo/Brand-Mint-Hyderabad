# Payment Tracker — {{CLIENT_NAME}}

Internal. Never send this.

> **The app already tracks this, and it is the source of truth.** `/studio` →
> Money lists every invoice ever raised, and *Record payment* takes the **total
> received** so a part payment is a real number rather than a guess. Keeping a
> second running total here is how the two end up disagreeing, and then neither
> can be trusted against a bank statement.
>
> Use this sheet for what the app deliberately does not hold: the chase
> sequence below, and the notes at the bottom — who promised what, and when.
> Those are a record of a conversation, not of money.

| # | Milestone | Amount | Invoice sent | Due | Cleared | Days late |
|---|---|---|---|---|---|---|
| 1 | Deposit 50% | ₹{{N}} | | | | |
| 2 | Completion 50% | ₹{{N}} | | | | |
| CR-1 | {{Change}} | ₹{{N}} | | | | |

## Gates

☐ **Deposit cleared** — no work before this
☐ **Final cleared** — no DNS switch before this

## Chase sequence

Automate it. Never write these emotionally, never chase over WhatsApp at night.

| Day | Action |
|---|---|
| 0 | Invoice sent |
| 3 | Reminder — friendly, one line, invoice reattached |
| 7 | Reminder — note that 1.5%/month interest now applies |
| 10 | Email the Approver: work pauses on day 14 unless payment is received |
| 14 | Work pauses. Written notice. Timeline extends by the length of the pause |
| 21 | Formal notice referencing the SOW clause |

## Notes
{{Anything unusual — a promise made, a date given, who said what.}}
