# Awareness campaign — Hyderabad businesses with no website

WhatsApp only. No calls, no ads, no email. One message per business, sent from
the studio number by `api/wa-outreach.js`.

The list comes from the Google Places API — businesses with a listing, a
**mobile** number, and no website. Two kinds, and they get different messages:

- **none** — no web presence at all.
- **social only** — running the business out of an Instagram bio, a Justdial
  page or a Google Business site. Usually the better prospect: they already
  tried, so they don't need convincing that being findable matters.

Landlines are dropped on sight. An 040 number is a real business that will
never see a WhatsApp message.

---

## The angle

Not "you need a website." Every one of them has been told that by six people
and ignored all six.

The angle is **what it is costing them right now, this week**, in terms they
already feel:

1. A customer searched, found the listing, found no site, and called a
   competitor who had one. That happened this month and they never knew.
2. Their photos, prices and hours live on a platform they don't own and can't
   export. The account goes, the business goes with it.
3. They answer the same four questions on WhatsApp all day — price, timing,
   location, do you deliver — because there is nowhere to point people.

Number three is the one that lands, because it is a thing they are annoyed
about *today* rather than a thing they might lose *someday*.

---

## What is actually running

```
api/wa-outreach.js?find=1     Places API -> queue of businesses with no site
api/wa-outreach.js?tick=1     sends at most ONE message, if the guards allow
api/wa-outreach.js            the dashboard: queue, sent today, log, pause
```

A cron on the Evolution VM calls `&tick=1` every two minutes. The pacing lives
in the endpoint, not in the cron, so a missed minute or a double call changes
nothing. Each tick checks, in order:

| Guard | Default |
|---|---|
| paused | off |
| inside the window | 10:00–19:00 IST, Mon–Sat |
| time since the last send | 5 min + up to 3 min of jitter |
| sent today | 40 |
| the number is a mobile | required |
| no conversation already exists with them | required |

The last one is the important one. If a thread exists, we either opened it
before or they wrote to us first — and both mean don't send. It is also what
makes "stop" permanent: `api/wa-hook.js` records the refusal in the thread,
and the thread's existence is what blocks any further outbound.

**There is no follow-up.** If they don't reply, that is the answer.

---

## The two messages

Economics they can check rather than a statistic worth inventing: the
comparison is one lost customer against the price of the thing, and both
numbers are theirs, not ours.

Every message ends with a way to stop. That line is not politeness — a person
who cannot make you stop reports you, and a report is what actually ends a
WhatsApp number. It is cheaper than any pacing rule.

### A — no web presence at all

> Hi {name} — I'm Sumanth from Brand Mint, a small web studio in HITEC City.
>
> I was looking at {category}s in {area} and yours came up on Google with no
> website. You've got {reviews} reviews, which is more than most {category}s
> around {area}.
>
> Here's the thing that costs you and you never see it: someone searches,
> finds your listing, looks for your prices or timings, finds nothing, and
> calls the next one on the list. You don't get a missed call. You don't get
> anything.
>
> If that happens to even one customer a month, over a year it costs more
> than the website does once. A proper one is ₹14,999 — fixed price in
> writing before we start, live in two weeks, domain in your name.
>
> Want me to send two we've built so you can see? If not, just say stop and I
> won't message again.

### B — running on Instagram or Justdial

> Hi {name} — I'm Sumanth from Brand Mint, a small web studio in HITEC City.
>
> I found you on Google while looking at {category}s in {area}, and saw the
> business runs off Instagram. You've got {reviews} reviews, which is more
> than most {category}s around {area}.
>
> Worth knowing: that page isn't yours. A boutique I know ran off Instagram
> for two years, woke up to a locked account, and lost the photos, the prices
> and every customer conversation in one morning. There was nobody to appeal
> to.
>
> A site of your own is ₹14,999 — one time, domain in your name, live in two
> weeks. Less than one lost month of orders, and you keep posting on
> Instagram exactly as you do now.
>
> Want me to send two we've built so you can see? If not, just say stop and I
> won't message again.

The `{reviews}` sentence is dropped entirely below ten — praising three
reviews reads as a script, which is the one thing that stops this working.
The opening line rotates between three phrasings, because a hundred
byte-identical messages is a fingerprint.

---

## The posture, once they reply

From here `api/wa-hook.js` takes over: Gemini answers with the real prices,
books a call when they name a time, and files it in Admin → Leads.

Concierge, not salesperson. The tone that works here is somebody happy to be
of no use today.

- **Match their length.** A paragraph answering "ok" reads as a machine that
  did not notice.
- **Never two messages in a row.** If they have not replied, there is nothing
  to add. No "just following up", no "did you see this".
- **Any irritation ends it.** Sharp tone, sarcasm, "why are you messaging me" —
  apologise in under ten words, say they will not be messaged again, stop. No
  last pitch. The apology is the whole message.
- **"Who is this?" gets a straight answer**, not a pitch. We found the business
  on Google, we build websites, they can tell us to stop whenever they like.
- **Never tell them their business needs anything.** It is their business.
- **When in doubt, they are not interested.**

`api/wa-hook.js` enforces the hard end of this in code rather than in the
prompt: a message matching stop, not interested, remove me, wrong number,
nahi chahiye, mat bhejo, vaddu and the rest is recorded for the studio to see
and never answered, and the whole thread is checked so a refusal three days
ago still holds today. The patterns are deliberately narrow — "I want to stop
paying for Shopify" is a hot lead, and a bare match on "stop" would have
ghosted them.

---

## Standing rules

- Never claim to have visited, bought from or been referred to them.
- Every price exactly as it is on the site: ₹14,999 static, from ₹49,999 store,
  GST extra. No opening discount — the whole pitch is that the price is fixed.
- The moment someone replies, the queue is beside the point. A live
  conversation is worth more than the next thirty messages.
- If they ask to be left alone, that is the end of it. `&drop=<phone>` makes it
  permanent by hand; the webhook does it automatically.

---

## The risk, stated plainly

The studio number runs on Evolution/Baileys, an unofficial WhatsApp client.
Messaging people who never contacted you is against WhatsApp's terms however
slowly it is done, and enough "block" or "report spam" taps will end the
number — the ban attaches to the number, not the session, and it took three
days to get 7799934943 connected.

Everything above is built to keep that from happening: one at a time, a real
reason for the message, an opt-out in every message, no follow-ups, and a hard
stop the moment anyone objects. It lowers the odds. It does not remove them.

If the number matters more than the campaign, the supported path is the
WhatsApp Business API through a BSP, where outbound to non-contacts is a paid,
template-approved, opt-in product. That is what `shared/platform.js` sells to
clients, and it is the version that cannot get a number banned.
