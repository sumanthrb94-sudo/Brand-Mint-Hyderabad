# Email — Resend setup

The site collects an email at sign-in and sends the free toolkit. Both live
in `/api`, which runs on Vercel as serverless functions. **The Resend API key
is a secret and must only ever exist as a Vercel environment variable** — it
can never go in `shared/` or any file the browser downloads.

Until you do the steps below, nothing breaks: the endpoints answer `200` with
`skipped`, sign-in still works, and the booking form still tells you it
couldn't send. Everything just stops short of an email.

## 1. Resend account (5 minutes, free tier)

1. Sign up at <https://resend.com>. The free tier is 3,000 emails a month and
   100 a day, which is plenty until the list is in the thousands.
2. **Domains → Add Domain → `brandmintstudios.in`.** Resend gives you three
   DNS records (an MX and two TXT — SPF and DKIM). Add them at your registrar,
   then click Verify. Without this your mail lands in spam or not at all.
3. **Audiences → create one**, call it "Brand Mint". Copy its ID.
4. **API Keys → Create**, permission **Sending access**. Copy the key. It is
   shown once.

## 2. Vercel environment variables

Vercel → the `brand-mint-sdmk` project → Settings → Environment Variables.
Add these for **Production** (and Preview if you want to test there):

| Name | Value | Needed for |
|---|---|---|
| `RESEND_API_KEY` | the key from step 1.4 | anything sending |
| `RESEND_FROM` | `Brand Mint <hello@brandmintstudios.in>` | anything sending |
| `RESEND_AUDIENCE_ID` | the ID from step 1.3 | the mailing list |
| `BOOKING_TO` | where call requests go, e.g. `mintstudios823@gmail.com` | the booking form |

`RESEND_FROM` must be on the domain you verified in step 1.2. Redeploy after
adding them — env vars are read at request time, but a redeploy is the
simplest way to be sure.

## 3. Check it

- Sign in with a fresh Google account → you should get the toolkit email, and
  the contact should appear under Audiences in Resend.
- Fill in the booking form on the home page → you get a "Call request" email
  with a WhatsApp button; they get a confirmation.
- Vercel → the project → Logs shows `[subscribe]` and `[book]` lines if
  anything failed.

## What sends what

| Endpoint | When | Who gets mail |
|---|---|---|
| `/api/subscribe` | after Google sign-in | the visitor: the free toolkit + a link to their portal |
| `/api/book` | booking form submitted | you: the request, with reply-to set to them. Them: a confirmation |

## Consent, and why it is built this way

The newsletter tick on the sign-in page is the consent record. Ticked, the
contact goes into the audience normally. Unticked, they still go in but
flagged `unsubscribed`, so you can email them about **their own project** and
Resend will never include them in a campaign. That distinction is the whole
point — do not "fix" it by dropping the flag.

Under the DPDP Act you need consent for marketing, a way to withdraw it, and
honesty about what you collect. Resend's unsubscribe handles withdrawal;
`privacy.html` has to keep matching what actually happens here.

## Campaigns

Resend's dashboard sends broadcasts to an audience — no code needed. Write it
there, pick the audience, send. Keep it to things a founder running a store
actually wants: the lessons from `shared/resources.js` are already written and
are the obvious first six emails.
