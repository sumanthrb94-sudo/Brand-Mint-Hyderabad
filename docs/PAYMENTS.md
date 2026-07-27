# Payments — Brand Mint Studios' own invoices

Lets a client pay an invoice from `/portal` with UPI, card or netbanking, and
lets the studio reconcile it from `/studio` in one click.

**This is for Brand Mint's own invoices only.** A client store's customers must
pay into that client's own Razorpay account — see "Not this account" below.

---

## Turn it on

Two environment variables in **Vercel → Settings → Environment Variables**,
scoped to Production (and Preview if you want to test there):

| Name | Value | Notes |
|---|---|---|
| `RAZORPAY_KEY_ID` | `rzp_live_…` or `rzp_test_…` | Also returned to the browser. Public by design. |
| `RAZORPAY_KEY_SECRET` | the secret | **Server only.** Never in the repo, never in a `VITE_` var, never pasted anywhere. |

Redeploy after adding them. With neither set, every endpoint returns
`503 payments_not_configured` and the Pay button reports that the studio has
not switched online payment on yet — the site does not break.

Nothing else. No webhook, no `RAZORPAY_WEBHOOK_SECRET`, no service account.

---

## How a payment actually flows

```
client clicks Pay
  → POST /api/payments/create-order  { invoiceId }   + their Firebase ID token
      server reads the invoice FROM FIRESTORE using that token
      server creates a Razorpay order for the amount IT read
  → Razorpay Checkout opens in the browser
  → POST /api/payments/verify        { order, payment, signature, invoiceId }
      signature checked (HMAC, timing-safe)
      payment fetched from Razorpay: captured? right order? right amount?
  → "Payment confirmed. Your invoice updates when we reconcile."

admin clicks Sync payments
  → GET /api/payments/reconcile                       + admin ID token
      asks Razorpay which orders were actually paid
  → the ADMIN'S BROWSER writes status:"paid" to Firestore
```

### The amount is never the browser's

The oldest attack in online payments is the browser posting `amount: 1` for an
₹80,000 invoice. Here the browser sends an **invoice id and nothing else that
matters**; the server reads the amount from Firestore itself.

`tests/payments.test.mjs` sends `{ invoiceId, amount: 1, amountRupees: 1,
total: 1, amountPaise: 100 }` and asserts that what reached Razorpay was
8,000,000 paise. Breaking the handler so it trusts the body makes that test
fail — confirmed by mutating it.

### A signature alone proves nothing

`verify` does two checks. The signature proves Razorpay said something about
this order. It does **not** prove money was captured, or that the amount
matched — so the payment is then fetched from Razorpay and inspected. A valid
signature on an `authorized`-but-not-captured payment, or on a ₹1 payment
against an ₹80,000 invoice, is rejected. Checking only the signature is the
most common flaw in Razorpay integrations.

---

## Why there is no service account, and no webhook

`firestore.rules` is the only security boundary in this project, and a Firebase
service account key bypasses all of it, never expires, and cannot be scoped.
CLAUDE.md §3 says it must never go in an environment variable; §9 lists
"Admin SDK server-side" as a sanctioned option. **Those contradict each other.**
This design needs neither, so the contradiction did not have to be settled.

Instead the server acts with **the caller's own token**. It calls the Firestore
REST API as the signed-in user, so:

- `firestore.rules` still decides everything — the server sees exactly what
  that user may see, and one document more is impossible.
- The token is verified by Firestore itself. A forged or expired token gets a
  401 from Google, so there is no JWT-verification code here and no signing
  keys to fetch or cache.
- There is no credential to leak. Dump this whole deployment publicly and the
  worst it holds is the Razorpay key — one merchant account, rotatable in a
  click.

The consequence is that **the server cannot write.** So there is no webhook:
a webhook needs somewhere to put what it learns.

Polling Razorpay at sync time turns out to be *better* than a webhook without a
database, not worse:

- A payment made as the customer's browser closed is found on the next sync.
  The classic "paid, but the record never updated" bug cannot happen, because
  nothing depends on the browser coming back.
- A missed webhook delivery is not a lost payment. There is nothing to miss.
- Razorpay is the source of truth about Razorpay. Copying its state and then
  trusting the copy is how two systems drift.

The cost: an invoice reads `due` until the studio syncs. The client is told
this in as many words on the confirmation, so a `due` row after a successful
payment is never a surprise.

CLAUDE.md §9 also wants an audit log built *before* anything automated gets
write access. Nothing automated has write access here.

---

## What the sync reports

`Sync payments` states what it did **not** do, not just what it did:

- invoices marked paid, with amount and method
- **skipped**, each with a reason — already paid, invoice deleted, or an amount
  that does not match. A mismatched amount is never reconciled away by
  overwriting the invoice; it is flagged for a human.
- orders started but never paid — abandoned checkouts, not missing money
- the window it covered, so an empty result reads as "nothing in 60 days"
  rather than "no payments exist"
- a loud warning if the sync was truncated

---

## Not this account

`brandmintstudios.in`'s Razorpay account collects **Brand Mint's own** fees.

A client store's customers must pay into **that client's own Razorpay account**.
If their customers' money lands in your account and you remit it onward, you
are holding funds on someone else's behalf — payment aggregation, which in
India requires an RBI licence — and their turnover looks like your revenue at
tax time.

The correct pattern is the one this portal already uses everywhere else:
**the client opens the account and adds you as a team member.** You integrate
it; you never hold the money.

---

## What is not built

- **No refunds.** Issue them from the Razorpay dashboard; the next sync will
  not un-mark an invoice, so correct it by hand.
- **No partial payments.** An amount that does not match the invoice exactly is
  refused by `verify` and flagged by the sync.
- **No receipts or GST invoices.** The invoice `label` and `amount` are whatever
  the admin entered.
- **No rate limiting.** Rate limiting needs shared state, and this deployment
  has no server-side store. Every endpoint requires a valid Firebase ID token,
  so this is not open to the internet — but a signed-in client could create
  orders in a loop. Worth revisiting if that ever stops being theoretical.

---

## Reproduce the tests

```bash
node --test tests/payments.test.mjs   # 25 tests
```

No Razorpay account, no keys, no network — `fetch` is stubbed. The secret in
that file is a fixed string with no relationship to any real key.

The tests are written adversarially. One covers the happy path; the rest try to
get an invoice marked paid without paying for it.
