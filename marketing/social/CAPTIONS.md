# Carousels — ready to post

Slides are in `marketing/social/out/<id>/`, numbered in posting order. Select
the whole folder in Instagram and it uploads in sequence.

Re-render after any edit to `carousels.json`:

```bash
python3 -m http.server 8000
NODE_PATH=$(npm root -g) node marketing/social/render-carousels.cjs
```

The renderer fails loudly rather than quietly: it warns if a slide's content
overflows, if a cover headline runs past the edge, or if a cover line wraps.
A warning is a blocker — those are the failures that only become visible once
the post is live. The cover headline auto-shrinks to fit, so a long line comes
out smaller rather than clipped.

**Every price on these slides is the price on the site.** ₹14,999 static, from
₹49,999 store, ₹79,999 + ₹9,999/mo for Site + CRM, GST extra throughout. If a
price changes on `shared/services.js` or `shared/tiers.js`, change
`carousels.json` and re-render the same day. A wrong price in a post is a
takedown, not an edit.

**No fabricated proof anywhere.** No revenue figures, no ROI percentages, no
"X% more sales", no client logos we have not shipped. The only numbers are
prices, `25+ projects`, `8+ years` and `Hyderabad + UK` — all of which are on
`shared/work.js` and the live site.

---

## The three rules the slides are built on

Full reasoning and sources in `marketing/social/PLAYBOOK.md`.

**1 · Slide 2 is a second cover.** An unswiped carousel gets re-served starting
from the first slide the viewer never reached, so slide 2 is the slide a large
share of people actually meet cold. It gets its own hook, its own tag and a
line stating the offer, rather than continuing a sentence from slide 1. It is
set on the cream ground so the swipe from slide 1 lands as a visual beat.

**2 · Every caption asks a question and asks for a comment.** Metricool's 2026
study (24.36M posts) found posts containing a question get **36.70% more
comments** and posts with a comment-focused CTA get **202.78% more**. The ask
is always something a person can answer in four words — a number, a trade, a
suburb — because the cost of a comment is the whole battle.

This is **not** a comment-to-DM automation funnel. Those are built for course
sellers where volume is the right variable; a meaningful share of auto-DMs to
non-followers land in the requests folder and are never seen. We answer the
comments ourselves, in the thread, within the hour. Fifteen local buyers, not
eight hundred commenters.

**3 · No AI imagery on any slide.** The generated cover plates
(`images/bg-*.png`) and the scale-hook images (`images/hook-*.png`) have been
pulled. The covers are typographic on a CSS ground, which at thumbnail size
reads louder than a dark photograph under a scrim did, and never arrives with
a grey hairline baked into the edge.

The reason is not the US survey data on AI backlash — that is real but it is
US data and nobody has measured what a Hyderabad shop owner thinks. The reason
is inferential and it transfers regardless: we sell "a real working site for a
real fixed price" to a cautious first-time buyer, and a grid of generated
storefronts invites exactly one inference — that the portfolio might be
generated too. The screenshots of shipped work are the hardest-to-fake asset
in a category full of stock mockups, and generated imagery sitting next to
them is what makes them look cheap.

An `img` on a slide is now reserved for a **real screenshot of shipped work**.
`scripts/gen-image.mjs` still generates the old plates; nothing stops anyone
re-adding them, which is why the reason is written down here.

---

## Hashtags — five, and only five

**Instagram hard-capped hashtags at five per post and Reel on 19 December 2025.**
This is enforced by the platform, not advice: over five and Instagram either
blocks publishing or strips the extras. Caption and first comment draw on the
*same* five slots, so splitting them buys nothing. Every guide recommending
11, 20 or 30 tags — including the earlier version of this file — predates the
cap and is now impossible to follow.

Instagram's stated reason: "using fewer (up to 5) more targeted hashtags,
rather than many generic ones, can improve both your content's performance and
people's experience." Read together with Mosseri's position that hashtags do
not drive reach, the honest reading is that hashtags are now a **topic
classification signal, not a distribution lever**. Do not expect tags to find
you an audience.

**The cap is good news here.** With thirty slots the equilibrium was to pad
with broad national terms that dragged in impressions from people who will
never buy. With five, spending all of them locally is unambiguously correct —
the scarcity enforces the focus this account wants anyway.

**Four fixed, one swapped per post.**

```
#hyderabadbusiness #websitedesignhyderabad #hyderabadsmallbusiness #smallbusinessindia
```

Fifth slot, by topic:

| Post | Fifth tag |
|---|---|
| Before you pay anyone | `#businessowner` |
| A website ₹14,999 | `#webdesign` |
| Reply machine | `#whatsappbusiness` |
| That page isn't yours | `#instagramshop` |

Dropped from the earlier list because there is no room and they pull the wrong
people: `#ecommerceindia`, `#shoplocalhyderabad`, `#hitechcity`, `#brandmint`,
`#startupindia`, `#onlinestore`, `#d2cindia`, `#smallbusinesstips`,
`#onlinepresence`. `#brandmint` in particular was spending a scarce slot on a
term nobody searches.

Never use `#follow4follow`, `#explorepage`, `#viral` or any engagement-bait
tag. At five slots the cost of a wasted one is now enormous.

---

## Two changes worth more than the hashtags

**1. The name field.** The field under your username is indexed by Instagram
search and is the single highest-leverage permanent edit available. Set it to:

```
Brand Mint | Web Design Hyderabad
```

That matches what a shop owner actually types. It is one change, it applies to
every post ever made, and it costs nothing.

**2. Write captions for Google as well.** Since 10 July 2025 Instagram allows
public content from **professional accounts** (18+) to be indexed by Google by
default. Google queries carry local commercial intent in a way Instagram's
recommender does not — "website designer in Hyderabad price" is a Google query,
not an Explore swipe. So the first line of a caption should read like something
a person would search, and the account must be a professional account for any
of this to apply.

Two caveats worth stating plainly. The exact list of fields Instagram's own
search indexes is **not documented by Instagram** — every source describing it
is a vendor blog, possibly all descended from one ancestor. And alt text is
worth writing for accessibility and for Google, but the claim that it improves
Instagram ranking has no primary source behind it.

---

## 1 · The reply machine
`marketing/social/out/reply-machine/` — 6 slides

**Caption**

> Website for a Hyderabad shop, ₹14,999 fixed — here is what it actually saves you.
>
> You answer the same four questions every day. Price. Timing. Do you deliver.
> Where are you.
>
> That is not a business problem you can hire your way out of — it is a missing
> page. Every one of those answers is a line on a website you own, working while
> you are asleep.
>
> And here is the part nobody sees: someone searched, found your listing, looked
> for a price, found nothing, and called the next shop. No missed call. No
> message. Nothing to tell you it happened.
>
> A static website is ₹14,999, one time. An online store starts at ₹49,999.
> Fixed price, in writing, before anyone starts work — GST extra, and that is the
> whole number.
>
> So which one is it for you — the price question, the timing question, or "do
> you deliver to my area"? **Comment the question you answer most and we'll
> show you exactly where it lives on a page.** We reply to every one.
>
> HITEC City, Hyderabad. WhatsApp +91 77999 34943.
>
> #hyderabadbusiness #websitedesignhyderabad #hyderabadsmallbusiness
> #smallbusinessindia #whatsappbusiness

**Meta description** (155 chars, for the landing page this post points at)

> Answering the same four questions on WhatsApp all day? A website answers them
> for you. From ₹14,999, fixed price in writing. Hyderabad.

**Alt text, per slide** — Instagram reads this for accessibility and search.

1. Dark green slide, huge type: "REPLY MACHINE". You answer the same four questions all day; a website answers them once.
2. Cream slide, huge type: "SAME FOUR QUESTIONS EVERY DAY". Price, timing, delivery, location — answered once for ₹14,999.
3. Dark slide: a customer searched, found nothing, and called a competitor.
4. Dark slide listing four things a website answers: prices, delivery, payment methods, WhatsApp orders.
5. Dark slide: static website ₹14,999 one time, GST extra; online stores from ₹49,999.
6. Dark slide: book a 30-minute call with Brand Mint, or comment the question you answer most.

---

## 2 · Own it or rent it
`marketing/social/out/own-it/` — 7 slides

**Caption**

> Online store for a Hyderabad shop that currently sells on Instagram — from ₹49,999.
>
> Your shop runs off Instagram. The page looks good. The orders come in.
>
> One thing worth knowing: that page is not yours. If the account goes tomorrow,
> your photos go, your prices go, and every customer conversation goes with them.
> There is nobody to appeal to.
>
> We build the part you own. Domain in your name. Hosting in your name. The
> payment account in your business's name. Every order and customer record yours
> to export whenever you like.
>
> And you lose nothing — keep posting on Instagram exactly as you do now. The
> site is the thing underneath it that cannot be taken away.
>
> Online stores from ₹49,999, GST extra. Four tiers, each including everything in
> the one before it, so moving up later is an add-on and never a rebuild.
>
> Which tier does a shop like yours actually need? **Comment what you sell —
> boutique, bakery, gym, wholesale — and we'll tell you the honest answer in the
> replies, including if the ₹14,999 static site is enough.**
>
> Every price in full at brandmintstudios.in — no form, no discovery call to find
> out what it costs.
>
> #hyderabadbusiness #websitedesignhyderabad #hyderabadsmallbusiness
> #smallbusinessindia #instagramshop

**Meta description**

> Running your shop off Instagram? That page isn't yours. Own your domain,
> hosting and orders. Online stores from ₹49,999. Hyderabad.

**Alt text, per slide**

1. Dark green slide, huge type: "THAT PAGE ISN'T YOURS."
2. Cream slide, huge type: "GONE IN ONE MORNING". A domain in your own name cannot be taken away.
3. Dark slide: the account goes and the business goes with it — no warning, no appeal.
4. Dark slide listing what you own with Brand Mint: domain, hosting, payment account, customer records.
5. Dark slide: keep posting on Instagram exactly as you do now.
6. Dark slide: online stores from ₹49,999, GST extra, four to twelve weeks.
7. Dark slide: see the four store tiers at brandmintstudios.in, or comment your trade.

---

## 3 · Why the price is fixed
`marketing/social/out/fixed-price/` — 7 slides

**Caption**

> Website design price in Hyderabad, stated in public: ₹14,999 static, from ₹49,999 for a store.
>
> It started at one number and ended at three. Everyone who has paid for a
> website has a version of that story.
>
> So here is how this one works. Scope and price go in an agreement you sign
> before work begins. 50% to start, 50% before launch. A GST invoice for every
> payment. No hourly billing, and no extras inside a tier.
>
> The person on the call is the person building it — 8+ years on every build, no
> account manager in between, and nobody quietly hands it to an intern.
>
> Static website ₹14,999. Online stores from ₹49,999. Site + CRM ₹79,999 setup
> and ₹9,999 a month, which covers hosting, support and keeping the WhatsApp and
> Meta connections alive. GST extra on all of it.
>
> 25+ projects delivered, Hyderabad and the UK.
>
> What did the last quote you got actually cover? **Post it in the comments — no
> names, just the number and what it included — and we'll tell you what's
> missing from it.** If a cheaper option is the honest one, we'll say that too.
>
> WhatsApp +91 77999 34943.
>
> #hyderabadbusiness #websitedesignhyderabad #hyderabadsmallbusiness
> #smallbusinessindia #webdesign

**Meta description**

> Fixed price, in writing, before anyone starts. Websites from ₹14,999, stores
> from ₹49,999, GST extra. A senior operator on every build. Hyderabad.

**Alt text, per slide**

1. Dark green slide, huge type: "A WEBSITE ₹14,999". One time, GST extra, in writing before anyone starts.
2. Cream slide, huge type: "ONE NUMBER THEN THREE". Scope and price signed before a rupee moves.
3. Dark slide: the usual story — started at one number, ended at three.
4. Dark slide listing four terms: signed scope and price, 50/50 payment, GST invoices, no hourly billing.
5. Dark slide: the person on the call is the person building it, 8+ years on every build.
6. Dark slide: Site + CRM ₹79,999 setup then ₹9,999 a month, GST extra.
7. Dark slide: WhatsApp +91 77999 34943, or post your last quote in the comments.

---

## 4 · Before you pay anyone
`marketing/social/out/before-you-pay/` — 8 slides

**Caption**

> Ten questions to ask before you pay anyone to build your website. Screenshot
> this.
>
> WHO OWNS WHAT
> 1. Is the domain registered in my business name?
> 2. Is the hosting account mine, or theirs?
> 3. Is the payment account in my name?
> 4. Can I export my orders and customers whenever I want?
>
> WHAT IT COSTS
> 5. Is the price fixed, or hourly?
> 6. Is it in a signed agreement before work starts?
> 7. Is GST included or extra?
> 8. What happens if I want a change midway?
> 9. What is not included that I will be asked to pay for later?
> 10. Who do I call when it breaks at 9pm?
>
> Number ten is the one that catches people. If the answer is an account
> manager, a ticket form, or silence — you already know.
>
> So: which one would your current developer fail? **Comment the number, 1 to
> 10, and we'll tell you exactly what to ask next.** One digit is all it takes
> and we answer every one.
>
> Ask any studio in Hyderabad these ten. Ask us. We answer all of them in
> writing before a rupee moves: static site ₹14,999, stores from ₹49,999, GST
> extra, price and scope fixed before anyone starts.
>
> brandmintstudios.in · WhatsApp +91 77999 34943
>
> #hyderabadbusiness #websitedesignhyderabad #hyderabadsmallbusiness
> #smallbusinessindia #businessowner

**Meta description**

> Ten questions to ask before paying for a website: who owns the domain, is the
> price fixed, who answers at 9pm. A Hyderabad studio's checklist.

**Alt text, per slide**

1. Dark green slide, huge type: "10 QUESTIONS". Ask these before you pay anyone to build your website.
2. Cream slide, huge type: "WOULD YOURS PASS ALL TEN?" Any honest Hyderabad studio answers all ten.
3. Dark slide: the problem is never the code, it is what was never agreed in writing.
4. Dark slide, four ownership questions: domain, hosting, payment account, data export.
5. Dark slide, four cost questions: fixed or hourly, signed agreement, GST, mid-project changes.
6. Dark slide: "Who do I call when it breaks at 9pm?"
7. Cream slide, huge type: "NO WRONG ANSWERS. ONLY HONEST". Screenshot it and ask any studio.
8. Dark slide: Brand Mint answers all ten in writing. Comment which number yours would fail.

**Why this one is the lead post.** It is the only carousel in the set that is
useful to someone who never hires us, which is exactly why it gets saved and
sent to a friend opening a shop. Post it first — and its comment CTA is the
cheapest in the set, because the answer is a single digit.

---

## Posting notes

- **Two a week**, Tuesday to Thursday, **6–9pm IST**. That evening window is
  the only slot where Buffer's 9.6M-post study and Metricool's 24.36M-post
  study independently agree, and neither publishes a best-versus-worst effect
  size — so post in it and give timing no further thought.
- **Never let a calendar week pass with zero posts.** The zero-post week is
  the only penalty Buffer's fixed-effects model actually measures.
- **Slide 1 is the post. Slide 2 is the post for everyone who didn't swipe.**
  Both carry a hook that works with nothing before it.
- **Reply to every comment within the hour.** The captions now ask for a
  comment; an unanswered one is worse than never having asked.
- **The caption's first line is what shows before "more"** — and it is now
  also a Google result. Each opens on a phrase a person would type into a
  search box, with "Hyderabad" in it.
- **Point the link in bio at `/pricing`**, not the home page. These posts all
  promise a number; send people to where the numbers are. Put UTMs on it —
  `shared/analytics.js` reads them into the `events` collection, which is the
  only attribution this account will ever get.
