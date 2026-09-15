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
