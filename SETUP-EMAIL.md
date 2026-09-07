# Email — Resend setup

## Step 0 — email at your own domain, for ₹0

Two different problems, and only one of them costs money:

| | What it is | Cost |
|---|---|---|
| **Sending** from `hello@brandmintstudios.in` | The site's transactional and marketing mail | Free — Resend needs DNS records, **not a mailbox** |
| **Receiving** at `hello@brandmintstudios.in` | Somewhere replies land that you can read | This is the bit Google Workspace charges ₹136/user/month for |

You do not need a paid mailbox for either. Do this:

**1. Move the domain's DNS to Cloudflare** (free). Add the site at
<https://dash.cloudflare.com>, and change the nameservers at your registrar to
the two Cloudflare gives you. Nothing about the website changes — Vercel keeps
serving it, Cloudflare only answers DNS.

**2. Cloudflare → Email → Email Routing.** Free, unlimited addresses. Create:

    hello@brandmintstudios.in     →  your Gmail
    privacy@brandmintstudios.in   →  your Gmail
    billing@brandmintstudios.in   →  your Gmail

Cloudflare adds the MX records itself. Mail to those addresses now lands in
your existing Gmail inbox.

**3. Reply *as* the domain, from Gmail.** Gmail → Settings → Accounts and
Import → "Send mail as" → Add another email address → `hello@brandmintstudios.in`.
Untick "treat as an alias". For the SMTP server use `smtp.gmail.com`, port 587,
your Gmail address, and an **App Password** (Google Account → Security → 2-Step
Verification → App passwords). Google emails a verification code, which
Cloudflare forwards to you. Enter it and you're done.

You now send and receive on your own domain, for nothing, forever, with
Gmail's deliverability behind it.

**Alternative if you would rather not move DNS:** ImprovMX has a free
forwarding tier, and Zoho Mail has long had a free plan for one domain with
real webmail. Check the current terms before relying on either — free tiers
move.

### On self-hosting a mail server

You sent the awesome-selfhosted list, so to be straight with you: **do not
self-host email for the domain your leads arrive on.** Mailcow, Stalwart,
Mail-in-a-Box and docker-mailserver are good software and that is not the
problem. The problem is everything around them:

- Most VPS providers block outbound port 25, and every residential ISP does
- A fresh IP has no sending reputation, so Gmail and Outlook bin your mail
  for weeks while you warm it up
- You need SPF, DKIM, DMARC **and** a matching reverse-DNS record, correct
- When it breaks at 2am you don't get a bounce, you get silence — and the
  enquiry you never knew about was worth ₹2,00,000

Self-hosting is the right call for things where failure is visible and
recoverable. Email fails invisibly. Cloudflare routing is free, is zero
maintenance, and you keep full ownership of the domain — which was the point.

If you ever do want to self-host, do it for *receiving* only and relay
outbound through a reputable SMTP. Never the other way round.

### One SPF record only

A domain may have exactly **one** `v=spf1` TXT record. Gmail send-as and
Resend both want to be in it, so merge the includes rather than adding a
second record:

    v=spf1 include:_spf.google.com include:<what Resend gives you> ~all

Two SPF records is the same as none — every check fails.

---


The site collects an email at sign-in and sends the free toolkit. Both live
in `/api`, which runs on Vercel as serverless functions. **The Resend API key
is a secret and must only ever exist as a Vercel environment variable** — it
can never go in `shared/` or any file the browser downloads.

Until you do the steps below, nothing breaks: the endpoints answer `200` with
`skipped`, sign-in still works, and the booking form still tells you it
couldn't send. Everything just stops short of an email.

## 1. Resend account (5 minutes, free tier)

1. Sign up at <https://resend.com>. The free tier is 3,000 emails a month and
   100 a day, which is plenty until the list is in the thousands. You can sign
   up with your Gmail — Resend never needs a mailbox on your domain.
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

`RESEND_FROM` must be on the domain you verified in step 1.2. It does **not**
need to be a real mailbox — but make it one you actually receive (step 0), so
that when someone hits reply on the toolkit email it reaches you. Redeploy after
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
