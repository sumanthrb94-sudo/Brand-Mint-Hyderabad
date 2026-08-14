# Razorpay Setup — Brand Mint Agency OS

Online payment is built and tested but **collects nothing until the three
variables below are set**. With no keys, `payments.checkout` refuses with
`PRECONDITION_FAILED` and the portal hides the Pay button — it never pretends
to take money.

## Vercel variables

Apply to both **Production** and **Preview**, then redeploy.

| Variable | Where it comes from |
| --- | --- |
| `RAZORPAY_KEY_ID` | Razorpay Dashboard → Account & Settings → API Keys. Starts `rzp_live_` or `rzp_test_`. |
| `RAZORPAY_KEY_SECRET` | Shown once when the key is generated. Never committed, never sent to the browser. |
| `RAZORPAY_WEBHOOK_SECRET` | You choose it when creating the webhook below. |

## Webhook

1. Razorpay Dashboard → Settings → Webhooks → **Add New Webhook**
2. URL: `https://brandmintstudios.in/api/razorpay-webhook`
3. Secret: the same value as `RAZORPAY_WEBHOOK_SECRET`
4. Active events: **`payment.captured`** only

Nothing else needs subscribing. Other events are acknowledged with 200 and
ignored, so Razorpay stops retrying them.

## How a payment actually completes

The browser never decides that an invoice is paid. The flow is:

1. The client opens their portal and presses **Pay now** on an unpaid invoice.
2. `payments.checkout` re-derives which client the signed-in account is, checks
   the invoice belongs to *that* client, and creates a Razorpay order. The
   invoice id travels in the order `notes`.
3. Razorpay's checkout window opens against that order.
4. Razorpay calls `/api/razorpay-webhook`. The handler verifies the HMAC over
   the **raw** request body before reading any of it, then marks the invoice
   paid, promotes the client to `active`, and notifies the CEO.

Because step 4 is the only writer, a closed browser tab, a refreshed page, or a
forged client-side callback cannot mark an invoice paid.

Razorpay retries a webhook until it receives a 2xx, so the same capture arrives
more than once. Applying a capture is idempotent: a second delivery returns
`already-paid` and does not re-notify or double-count.

## Testing without real money

Use `rzp_test_` keys and Razorpay's test cards. The journey simulation covers
the whole path with the Orders API stubbed and never calls out:

```bash
pnpm vitest run server/journey.simulation.test.ts
```

## Still not covered

- **COD.** The public copy offers cash on delivery, but there is no COD order
  flow — that is a storefront feature for the stores we build, not something
  Agency OS currently models for its own invoices.
- **Refunds.** Razorpay refunds are named in the Growth tier scope. Issuing one
  is currently a manual action in the Razorpay dashboard; nothing writes it back
  to the invoice record.
- **Partial payments and the 50/50 advance.** Invoices are all-or-nothing today.
  The delivery terms describe half on signature and half on completion, which
  means two invoices rather than one part-paid invoice.
