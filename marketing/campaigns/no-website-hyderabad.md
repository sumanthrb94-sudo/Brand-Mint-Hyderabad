# Awareness campaign — Hyderabad businesses with no website

The list comes from `scripts/find-prospects.mjs`: businesses with a Google
listing, a phone number, and no website. Two kinds, and they get different
openings — the CSV's `currentPresence` column says which.

- **none** — no web presence at all.
- **social only** — running the business out of an Instagram bio, a Justdial
  page or a Google Business site. Usually the better prospect: they already
  tried, so they don't need convincing that being findable matters.

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

## Channel, in order

**1. Phone call — the list is built for this.**
A call to a listed business number is ordinary B2B. Nobody's platform can ban
you for it, and the CSV gives you a genuinely warm opener: name, trade, area,
star rating, review count.

> "Hi, is that <name>? I was looking at dental clinics in Kukatpally and yours
> came up with 60-odd reviews and no website. Are you sending people to
> WhatsApp for prices at the moment?"

Then stop talking. If the answer is yes, they have just described the problem
themselves and you are not selling any more.

**2. WhatsApp — only after they reply.**
The moment they message you, `api/wa-hook.js` takes over: Gemini answers with
the real prices, books a call when they name a time, and files it in Admin.
That system is built and working. It needs them to message first.

**3. Meta ads — the one place cold is fine.**
Upload the CSV as a custom audience, build a lookalike, run the awareness
creative below. Paid reach is the sanctioned way to reach people who have not
contacted you.

> **Do not bulk-message this list on WhatsApp.** The studio number runs on an
> unofficial client (Evolution/Baileys). Messaging a hundred people who never
> contacted you is the single most reliable way to lose that number, and the
> ban attaches to the number rather than the session. It took three days to
> get 7799934943 connected.

---

## Call opener — no web presence at all

> Hi, is that <name>? I found you on Google — <trade> in <area>, <reviews>
> reviews, which is a lot. Quick question: when someone searches and finds
> your listing, where do they go to see your prices?
>
> *(let them answer)*
>
> Right — so they call or WhatsApp you, and you answer the same questions
> every day. We build a small site that answers them for you: prices, hours,
> photos, a WhatsApp button. ₹14,999, live in two weeks, fixed price in
> writing before we start. Worth twenty minutes?

## Call opener — social only

> Hi, is that <name>? I saw you're running <business> off Instagram — the
> page looks good. One thing worth knowing: that account isn't yours. If Meta
> locks it tomorrow, your photos, your prices and your customers go with it,
> and there is nobody to appeal to.
>
> We build the thing you own — your domain, your site, your WhatsApp button —
> and you keep posting on Instagram exactly as you do. ₹14,999, two weeks,
> price fixed in writing. Can I send you two we've built?

## WhatsApp — only after they reply

Keep it short, no pitch. They are on a phone, mid-something.

> Thanks for messaging. Here are two we built, both live — simplysip.in and
> thegreenteam.in. A site like that is ₹14,999, about two weeks, and the
> price is fixed in writing before anything starts. What does your business
> do?

## Meta ad — awareness, cold is fine here

**Primary text**

> Your shop is on Google Maps. A customer found it, looked for your prices,
> found nothing, and called someone else.
>
> You never saw it happen. That is the problem with not having a website —
> it costs you quietly.
>
> A proper one is ₹14,999 and takes two weeks. Hyderabad studio, fixed price
> in writing before we start, and the domain is in your name from day one.

**Headline** — Found on Google. Lost at the next click.
**Description** — Websites from ₹14,999. HITEC City, Hyderabad.
**CTA** — Send WhatsApp message

---

## Rules for anything sent under this campaign

- Never claim to have visited, bought from or been referred to them.
- Every price exactly as it is on the site: ₹14,999 static, from ₹49,999 store,
  GST extra. No opening discount — the whole pitch is that the price is fixed.
- One follow-up if there is no reply. Then stop, and mark the row dead.
- If they ask to be left alone, remove the row. That is not optional, and in
  practice a person who is annoyed enough to say it will tell other people.

---

## The two messages, written out

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
> in {area}.
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
> I found you on Google and saw the business runs off Instagram. {reviews}
> reviews is a real reputation.
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
> Want me to send two we've built? If not, just say stop and I won't message
> again.

Drop the `{reviews}` sentence entirely when the count is under 10 — praising
three reviews reads as a script, which is the one thing that stops this
working.

### The posture, once they reply

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

api/wa-hook.js enforces the hard end of this in code rather than in the
prompt: a message matching stop, not interested, remove me, wrong number,
nahi chahiye, mat bhejo, vaddu and the rest is recorded for the studio to see
and never answered, and the whole thread is checked so a refusal three days
ago still holds today. The patterns are deliberately narrow — "I want to stop
paying for Shopify" is a hot lead, and a bare match on "stop" would have
ghosted them.

### Sending rules

- One at a time. Never two in the same minute, never a batch.
- Five minutes between sends, varied — an exact five-minute rhythm is itself
  a machine signature.
- 10:00–20:00 IST only. The person woken at 2am is the person who reports you.
- Stop at 40–60 in a day. The daily total matters less than the burst, but it
  still matters.
- The moment someone replies, stop the queue and talk to them. A live
  conversation is worth more than the next thirty messages.
- "stop", "don't message", "not interested" — remove the row and never send
  again. No follow-up, no "just one more thing".
- One follow-up only if there is no reply at all, after three days. Then done.
