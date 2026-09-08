# Free email on any domain — phone walkthrough

Cloudflare Email Routing. Free, unlimited addresses, forwards into a Gmail you
already have. Works for **any** domain — do it once for
`brandmintstudios.in`, then repeat Parts A–E for each client domain.

**Time:** 20 minutes, plus waiting for nameservers.
**You need:** the GoDaddy login, a Gmail account, and a browser on the phone.

> **Do Parts A–D in order.** Part C moves *all* DNS, not just mail. Done out of
> order it takes the website down.

---

## Part A · Save what exists today (GoDaddy) — 3 min

1. Browser → `godaddy.com` → sign in
2. **My Products** → **Domains** → tap the domain
3. Tap **DNS** (or *Manage DNS*)
4. **Screenshot every record.** Scroll and keep screenshotting until you have
   the whole list.

The ones that matter: the **A record on `@`** and the **CNAME on `www`** —
those point the website at Vercel. Lose them and the site dies.

---

## Part B · Add the domain to Cloudflare — 5 min

1. Browser → `dash.cloudflare.com` → sign up (free)
2. **Add a domain** → type the domain → **Continue**
3. Pick the **Free** plan → Continue
4. Cloudflare scans your GoDaddy DNS and lists what it found
5. **Compare that list against your screenshots.** Anything missing, tap
   **Add record** and type it in. Do not skip this.
6. Any record pointing at Vercel: tap the **orange cloud so it turns grey**
   (*DNS only*). Proxying needs its own SSL settings — one change at a time.
7. Continue. Cloudflare shows **two nameservers**, like
   `dana.ns.cloudflare.com`
8. **Screenshot those two.**

---

## Part C · Point GoDaddy at Cloudflare — 2 min

1. Back to GoDaddy → the domain
2. Find **Nameservers** → **Change**
3. Choose **I'll use my own nameservers** (or *Custom*)
4. Delete GoDaddy's, enter the two from your screenshot
5. **Save**, and accept the warning

---

## Part D · Wait, then check — 10 min to a few hours

Cloudflare emails you when the domain goes **Active**. Usually under an hour.

When it does: **open the website and confirm it still loads.** If it doesn't,
a record from Part A is missing — add it in Cloudflare → DNS.

---

## Part E · Turn on email — 5 min

1. Cloudflare → the domain → **Email** → **Email Routing**
2. **Get started**
3. **Destination address** → your Gmail → Cloudflare sends it a verification
   mail → open Gmail, tap **Verify**
4. Create the addresses you want, each pointing at that Gmail:

   ```
   hello@      → your Gmail
   privacy@    → your Gmail
   billing@    → your Gmail
   yourname@   → your Gmail
   ```

5. Cloudflare offers to **add the MX records automatically** — accept
6. **Enable** Email Routing

Send a test from another account. It should land in Gmail within seconds.

**Optional:** turn on **catch-all** so anything@ your domain reaches you.
Handy, but it also collects spam.

---

## Part F · Reply *as* the domain (Gmail) — 8 min, once per address

> **The Gmail app cannot do this.** Adding a send-as address is web-only. Use
> Chrome with desktop mode.

**First, an App Password:**

1. `myaccount.google.com` → **Security**
2. **2-Step Verification** must be ON (turn it on if not)
3. Search **App passwords** → create one → **copy the 16 characters**

**Then:**

4. Chrome → `gmail.com` → **⋮** → tick **Desktop site**
5. Gear icon → **See all settings** → **Accounts and Import**
6. **Add another email address**
7. Name: `Brand Mint` · Email: `hello@brandmintstudios.in` ·
   **untick "Treat as an alias"**
8. SMTP server: `smtp.gmail.com` · Port: `587` · Username: your full Gmail ·
   Password: the App Password · **Secured connection using TLS**
9. Google emails a confirmation code — it arrives via the forwarding you set
   up in Part E. Enter it.
10. Back in Accounts, set it as **default** if you want it on every reply

Now you send and receive on your own domain, free, with Gmail behind it.

---

## Repeating for client domains

Cloudflare's free plan takes many domains. For each one: **Parts A–E**.
Part F only if you want to *send* from that domain too.

| Domain | A–E done | Send-as |
|---|---|---|
| brandmintstudios.in | ☐ | ☐ |
| simplysip.in | ☐ | ☐ |
| tresorcouture.in | ☐ | ☐ |
| thegreenteam.in | ☐ | ☐ |

**Only do this for a domain you control.** For client domains, get it in
writing first — you are moving their DNS, and if you get it wrong their site
goes down.

---

## If something breaks

| Symptom | Fix |
|---|---|
| Website down after Part C | A record from Part A is missing. Cloudflare → DNS → add it. |
| Cloudflare stuck on "Pending" | Nameservers not saved at GoDaddy. Redo Part C. |
| Test mail never arrives | Destination not verified (Part E step 3), or Email Routing not enabled. |
| Gmail rejects the App Password | 2-Step Verification is off, or you typed the account password instead. |
| Google's confirmation code never comes | Part E isn't working yet — fix forwarding first. |

## One trap for later

A domain may have **exactly one** `v=spf1` TXT record. When you add Resend for
sending, merge it into the existing one rather than adding a second:

    v=spf1 include:_spf.google.com include:<Resend's> ~all

Two SPF records behave the same as none.
