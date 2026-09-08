# Email — Resend setup

## Step 0 — email at your own domain, for ₹0

Two different problems, and only one of them costs money:

| | What it is | Cost |
|---|---|---|
| **Sending** from `hello@brandmintstudios.in` | The site's transactional and marketing mail | Free — Resend needs DNS records, **not a mailbox** |
| **Receiving** at `hello@brandmintstudios.in` | Somewhere replies land that you can read | This is the bit Google Workspace charges ₹136/user/month for |

You do not need a paid mailbox for either. Do this:

**1. Move the domain's DNS from GoDaddy to Cloudflare** (free).

This is the only step that can take the website down if rushed, because it
moves *all* DNS — not just mail. Do it in this order and nothing breaks:

1. **Write down what exists today.** GoDaddy → My Products → your domain →
   **DNS** → Manage Zones. Screenshot the whole record list. The ones that
   matter most are whatever points the site at Vercel (an `A` record on `@`
   and usually a `CNAME` on `www`) and any `TXT` verification records.
2. **Add the site at Cloudflare.** <https://dash.cloudflare.com> → Add a site →
   `brandmintstudios.in` → Free plan. Cloudflare scans your existing DNS and
   imports what it finds.
3. **Compare the two lists, record by record.** Cloudflare's scan is good but
   not perfect. Anything on your GoDaddy screenshot that is missing here, add
   it by hand. **Do not skip this** — a missing record is a dead website.
4. **Set the Vercel records to "DNS only"** (grey cloud, not orange). Proxying
   a Vercel site through Cloudflare works but needs its own SSL settings, and
   you should not change two things at once. Get email working first.
5. **Only now, switch the nameservers.** GoDaddy → your domain →
   **Nameservers** → Change → *I'll use my own nameservers* → paste the two
   Cloudflare gives you. Propagation is usually minutes, occasionally hours.
6. Wait until Cloudflare shows the domain as **Active**, then load
   `https://brandmintstudios.in` and confirm the site still works.

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

**If you would rather not move nameservers at all:** ImprovMX has a free
forwarding tier that works by adding two `MX` records and one `TXT` record at
GoDaddy, leaving DNS exactly where it is. Less to go wrong on day one; you
give a third party sight of forwarded mail, and you do not get Cloudflare's
CDN later. GoDaddy also sells its own mailbox product — that is the monthly
rent you said you did not want to pay.

**A thing that does not exist:** GitHub has no email hosting. It can send
notifications *to* you, and Actions can send mail through someone else's SMTP,
but there is no GitHub mailbox for your domain. Nothing on the
awesome-selfhosted list changes that either — see the section below.

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
