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
6. Dark slide: online stores from ₹49,999, GST extra, four to twelve-plus weeks.
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

> Ten questions to ask before you pay anyone in Hyderabad to build your
> website. Screenshot this.
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

---
---

# Batch 2 — twelve carousels, six weeks

Two a week, Tuesday to Thursday, 6–9pm IST. The order below is the posting
order: it alternates price, proof and pre-adoption rather than running four
price posts in a row, because the same shape twice in a week reads as a
campaign and a campaign gets scrolled past.

**Post `diwali-deadline` in the week of 21 September**, out of order. It is
the only post here with an expiry date on it — Diwali is **Sunday 8 November
2026** and the sign-by dates on slide 3 are counted back from it. After the
festive season it comes down, and the same slides get rebuilt for Sankranti.

The four fixed hashtags are unchanged. The fifth is listed with each post.

| Week | Tue/Wed | Thu |
|---|---|---|
| 1 | `diwali-deadline` | `inside-14999` |
| 2 | `search-your-shop` | `why-49999` |
| 3 | `open-the-work` | `not-in-the-quote` |
| 4 | `whatsapp-catalogue` | `after-you-say-yes` |
| 5 | `before-after` | `what-9999-runs` |
| 6 | `free-checklist` | `what-we-need` |

**Screenshots.** `open-the-work` and `before-after` are the two posts that get
materially better once `scripts/shoot-work.cjs` has been run on a machine that
can reach the client sites. Drop the JPEGs in `work/` and add a `photo` slide
carrying the real screenshot after each client's slide. They work as they are
— the proof in `open-the-work` is that the addresses resolve — but a real
screenshot of a real checkout is the single most valuable image this account
can post, and the only one no competitor can fake.

---

## 5 · What ₹14,999 buys · `inside-14999` — 6 slides
Fifth tag: `#webdesign`

> Website price in Hyderabad: ₹14,999, and here is the full list of what that includes.
>
> Not a range. Not "starting from". The whole thing, line by line:
>
> — Up to 5 pages, written and built with you
> — Your domain, SSL and email set up
> — WhatsApp and call buttons that work properly on a phone
> — Google Search Console verified and submitted
> — Visitor analytics from day one
>
> Live in two weeks. ₹14,999 one time, GST extra, and that is the whole number.
>
> What it is not: it does not take payments and it does not hold stock. If you
> need to sell online you need a store, that starts at ₹49,999, and we will
> tell you that on the call rather than after it.
>
> So how many pages do you actually need? **Comment the number — 3, 5, 10 —
> and we'll tell you whether ₹14,999 covers it or whether someone is selling
> you too much.**
>
> WhatsApp +91 77999 34943.
>
> #hyderabadbusiness #websitedesignhyderabad #hyderabadsmallbusiness
> #smallbusinessindia #webdesign

**Meta description** · What ₹14,999 buys, line by line: five pages, your domain, SSL, analytics, live in two weeks. Hyderabad, GST extra.

**Alt text** · 1 Dark slide "WHAT ₹14,999 BUYS". 2 Cream slide "FIVE PAGES TWO WEEKS ONE PRICE". 3 List of five inclusions. 4 What it is not — no payments, no stock. 5 ₹14,999 one time, live in two weeks. 6 WhatsApp to ask what yours would cost.

---

## 6 · ₹14,999 or ₹49,999 · `why-49999` — 6 slides
Fifth tag: `#onlinestore`

> Online store price in Hyderabad: why ₹49,999 and not ₹14,999 — the four things that change.
>
> Same studio, same care, three times the price. It is not more pages. It is
> that four things start existing, and each one has to be right every single
> time:
>
> 1. It takes money — UPI, cards, cash on delivery
> 2. It knows what is in stock, and stops selling what has gone
> 3. Every order becomes a record you can act on
> 4. A GST invoice goes out, correctly, on its own
>
> The honest version: if nobody pays you on the page, do not buy a store.
> Plenty of businesses need five good pages and a WhatsApp button, and we would
> much rather sell you that than a store you never use.
>
> Stores start at ₹49,999, four tiers, each including everything in the one
> before it — so moving up later is an add-on and never a rebuild. GST extra.
>
> Do people pay you before they arrive, or when they arrive? **Comment yes or
> no. That one answer decides which of the two you need and we'll tell you
> which, in the replies.**
>
> Every price in full at brandmintstudios.in.
>
> #hyderabadbusiness #websitedesignhyderabad #hyderabadsmallbusiness
> #smallbusinessindia #onlinestore

**Meta description** · Why a store is ₹49,999 and a website ₹14,999: payments, stock, orders and GST invoices. Four fixed tiers. Hyderabad.

**Alt text** · 1 Dark slide "₹14,999 OR ₹49,999". 2 Cream slide "IT IS NOT MORE PAGES". 3 List of the four things a store adds. 4 If nobody pays you on the page, don't buy a store. 5 Stores from ₹49,999, four tiers. 6 Both prices are on the site.

---

## 7 · Not in the quote · `not-in-the-quote` — 7 slides
Fifth tag: `#businessowner`

> Hidden website costs in Hyderabad: eight charges that turn up after you sign.
>
> None of these are scams. They are real costs that a quote can quietly leave
> out — which means the number you compared was never the number you pay.
>
> THINGS THAT RUN OUT
> — Domain renewal, every year, forever
> — Hosting, and whose account it actually sits in
> — SSL certificate renewal
> — Email hosting, per mailbox, per month
>
> THINGS BILLED PER UNIT
> — Per extra page, after the first few
> — Per product uploaded to the catalogue
> — Content and photography, if you don't supply it
> — Handover: being given your own accounts
>
> What we do instead: scope and price in a signed agreement before anyone
> starts. No hourly billing, no extras inside a tier, a GST invoice for every
> payment. Domain, SSL and email setup are inside the ₹14,999 — renewals are
> yours, in your name, which is the entire point of them being yours.
>
> Which of the eight caught you? **Comment the one that turned up on your last
> invoice.** If you have a live quote sitting in front of you, send it over on
> WhatsApp — no names — and we'll mark what's missing from it.
>
> WhatsApp +91 77999 34943.
>
> #hyderabadbusiness #websitedesignhyderabad #hyderabadsmallbusiness
> #smallbusinessindia #businessowner

**Meta description** · Eight website charges that turn up after you sign: domain renewal, hosting, SSL, per-page fees, handover. Hyderabad.

**Alt text** · 1 Dark slide "NOT IN THE QUOTE". 2 Cream slide "THE BILL COMES LATER". 3 Four recurring charges. 4 Four per-unit charges. 5 What we do instead — the number is the number. 6 ₹14,999, renewals in your name. 7 Send us a quote to read.

---

## 8 · ₹9,999 a month · `what-9999-runs` — 6 slides
Fifth tag: `#whatsappbusiness`

> Site + CRM in Hyderabad: ₹79,999 setup, then ₹9,999 a month — what the monthly actually pays for.
>
> There is a monthly because the thing keeps running. WhatsApp and Meta
> connections break when tokens expire and somebody has to fix them. A
> one-time fee for a living system is how you end up with a dead one.
>
> The ₹9,999 covers:
> — Hosting, and the site staying up
> — Security updates and patches
> — Support from a person, not a ticket form
> — The WhatsApp and Meta connections kept alive
>
> What is yours regardless: the domain, the website, the data, and the WhatsApp
> and ad accounts all sit in your business's name. Export your leads whenever
> you like. Meta bills its own message fees to your card, not ours — so you
> keep the account if you ever leave us.
>
> Six weeks to live. 12-month minimum on the monthly. GST extra on both.
>
> Honest question: would you rather pay once and risk it quietly dying?
> **Comment your answer.** Plenty of people say yes and for some businesses
> that genuinely is the right call — we'll tell you which one you are.
>
> The whole page is public at brandmintstudios.in/platform.
>
> #hyderabadbusiness #websitedesignhyderabad #hyderabadsmallbusiness
> #smallbusinessindia #whatsappbusiness

**Meta description** · Site + CRM ₹79,999 setup then ₹9,999/month: hosting, security, support and the WhatsApp and Meta connections. Hyderabad.

**Alt text** · 1 Dark slide "₹9,999 A MONTH". 2 Cream slide "TOKENS EXPIRE". 3 Four things the monthly covers. 4 The accounts are in your name. 5 ₹79,999 setup then ₹9,999/mo. 6 The whole page is public.

---

## 9 · Open the work · `open-the-work` — 7 slides
Fifth tag: `#webdesign`

> Web design studio in Hyderabad — four live sites you can open right now, not mockups.
>
> Anyone can show you a mockup. These are addresses. Put them in your browser.
>
> simplysip.in — sold through WhatsApp DMs. Now customers check out themselves:
> UPI, cards or cash on delivery, and every order arrives priced and recorded.
>
> tresorcouture.in — sold to whoever walked in. Now the label reaches past the
> shop floor, with its own checkout and a GST invoice on every order.
>
> thegreenteam.in — the pitch used to be a PDF catalogue, sent on request. Now
> the site does that part before the call, not after it.
>
> FreshKart — wholesale orders came in by phone, one at a time. Now buyers
> place their own, priced correctly, without anyone picking up.
>
> 25+ projects delivered, Hyderabad and the UK.
>
> Which of the four is closest to your business? **Comment the name and we'll
> tell you what that build cost, how long it took, and what we would do
> differently for you.**
>
> #hyderabadbusiness #websitedesignhyderabad #hyderabadsmallbusiness
> #smallbusinessindia #webdesign

**Meta description** · Four live sites built by Brand Mint — open them yourself. Online stores, a website and a B2B ordering platform. Hyderabad.

**Alt text** · 1 Dark slide "OPEN THE WORK". 2 Cream slide "LIVE SITES NOT SCREENSHOTS". 3 SimplySip. 4 Trésor Couture. 5 GreenTeam. 6 FreshKart. 7 Open them, then talk to us.

---

## 10 · What changed · `before-after` — 7 slides
Fifth tag: `#onlinestore`

> Before and after — four builds by a Hyderabad web studio, and what actually changed.
>
> You will not find a revenue figure or a percentage anywhere in this post. We
> do not publish numbers we cannot show you. What you will find is what the
> owner used to do, and what they do now.
>
> SimplySip — before, every sale negotiated in a WhatsApp DM. After, customers
> check out themselves: UPI, cards or cash on delivery, every order priced and
> recorded.
>
> Trésor Couture — before, sold to whoever walked in. After, the label reaches
> past the shop floor, with its own checkout and a GST invoice on every order.
>
> GreenTeam — before, a PDF catalogue sent on request. After, the site does
> that part first, so the call starts further along.
>
> FreshKart — before, wholesale orders by phone, one at a time. After, buyers
> place their own, priced correctly, without anyone answering.
>
> All four are live and you can open all four.
>
> What would "after" look like for you? **Comment what you sell and what takes
> the most time right now.** We'll tell you honestly whether a site would
> actually fix it — sometimes the answer is that it wouldn't.
>
> #hyderabadbusiness #websitedesignhyderabad #hyderabadsmallbusiness
> #smallbusinessindia #onlinestore

**Meta description** · What changed for four businesses after launch — from WhatsApp DMs to self-checkout, from PDF catalogues to a live site.

**Alt text** · 1 Dark slide "BEFORE AFTER". 2 Cream slide "NO FAKE METRICS HERE". 3 SimplySip before and after. 4 Trésor Couture before and after. 5 GreenTeam before and after. 6 FreshKart before and after. 7 All four are live.

---

## 11 · After you say yes · `after-you-say-yes` — 7 slides
Fifth tag: `#businessowner`

> How a website build actually runs in Hyderabad — three steps, nothing due until you sign.
>
> 1. Book a call. Thirty minutes on WhatsApp or a phone call. We confirm what
> you need, what it costs and when it can start. No pitch deck, no discovery
> fee.
>
> 2. A fixed price, in writing. You get the scope and the price in an agreement
> before anyone starts work. Nothing is due until you sign it — and you leave
> that call with the number whether or not you go ahead.
>
> 3. Sign, pay 50%, watch it happen. Your portal goes live: timeline, files to
> approve, invoices and a direct line to us, all in one place. You are never
> wondering what week it is.
>
> How long it actually takes: static website two weeks, WhatsApp Store four
> weeks, Site + CRM six weeks to live, larger stores eight to twelve-plus.
>
> 50% to start, 50% before launch. A GST invoice for every payment. No hourly
> billing and no extras inside a tier.
>
> What's stopping you starting? **Comment it — budget, timing, not sure what
> you need, been burned before.** We answer every one, including the ones where
> the honest answer is "don't hire us yet".
>
> WhatsApp +91 77999 34943.
>
> #hyderabadbusiness #websitedesignhyderabad #hyderabadsmallbusiness
> #smallbusinessindia #businessowner

**Meta description** · How a Brand Mint build runs: a 30-minute call, a fixed price in writing, 50% to start. Two to twelve-plus weeks. Hyderabad.

**Alt text** · 1 Dark slide "AFTER YOU SAY YES". 2 Cream slide "NO DISCOVERY FEE". 3 The three steps. 4 What the client portal is. 5 Real timings for each build. 6 50/50 payment and GST invoices. 7 Book the 30 minutes.

---

## 12 · What we need from you · `what-we-need` — 7 slides
Fifth tag: `#onlinestore`

> Starting an online store in Hyderabad — the four things we need from you before we build.
>
> A build almost never runs late because of code. It runs late waiting for
> product photos. So here is the whole list, up front:
>
> 1. Product list and photos — names, prices, variants, stock
> 2. Business and GST details — legal name, address, GSTIN
> 3. Logo and brand assets — whatever you have
> 4. Your domain if you own one, and a Razorpay account in your business name
>
> If you have none of it, that is a normal answer. No logo, no domain, no
> catalogue, no GST yet — we work with that, and we walk you through the
> accounts on the call. Nobody is expected to arrive prepared.
>
> The one that matters most is the catalogue. We send a template on the call,
> and filling it in early is the single biggest thing that keeps a build on
> schedule — more than any decision we make.
>
> Which of the four don't you have? **Comment it.** We'll tell you whether it
> actually blocks anything, and in most cases it doesn't — people are usually
> worrying about the wrong one.
>
> WhatsApp +91 77999 34943 and ask for the catalogue template. It's free.
>
> #hyderabadbusiness #websitedesignhyderabad #hyderabadsmallbusiness
> #smallbusinessindia #onlinestore

**Meta description** · The four things we need before building your store: catalogue, GST details, brand assets, domain and Razorpay. Hyderabad.

**Alt text** · 1 Dark slide "WHAT WE NEED FROM YOU". 2 Cream slide "FOUR THINGS THAT'S ALL". 3 Catalogue and GST details. 4 Brand assets, domain and Razorpay. 5 If you have none of it, that's normal. 6 Fill in the catalogue template early. 7 Ask for the template now.

---

## 13 · Search your own shop · `search-your-shop` — 7 slides
Fifth tag: `#localbusiness`

> Search your own shop on Google right now and see what a Hyderabad customer sees.
>
> Thirty seconds. Open Google and type:
>
> — your shop name plus your area
> — what you sell plus "near me"
> — what you sell plus your suburb
> — your shop name plus "price"
>
> Most people find a map pin and nothing else. Maybe an Instagram page. No
> prices, no timings, no way to know whether you deliver. So they go back and
> tap the next result.
>
> Here is the part you never hear about: there is no missed call for this.
> Nobody messages to say they couldn't find your price. You only ever see the
> customers who got through, never the ones who didn't.
>
> What fixes it is a page with the answers on it — prices, timings, delivery, a
> WhatsApp button that works. Five pages, your own domain, ₹14,999 one time,
> GST extra.
>
> What came up when you searched? **Comment what you found — a map pin, an old
> Justdial listing, somebody else's shop, nothing at all.** We'll tell you the
> one thing to fix first, free, in the replies.
>
> brandmintstudios.in
>
> #hyderabadbusiness #websitedesignhyderabad #hyderabadsmallbusiness
> #smallbusinessindia #localbusiness

**Meta description** · Search your own shop on Google. A map pin and no prices is costing you customers you never hear about. Hyderabad, from ₹14,999.

**Alt text** · 1 Dark slide "SEARCH YOUR OWN SHOP". 2 Cream slide "TRY IT BEFORE YOU SWIPE ON". 3 Four searches to type. 4 Most people find a map pin and nothing else. 5 There is no missed call for this. 6 What fixes it — a page with the answers. 7 Comment what came up.

---

## 14 · The catalogue isn't a shop · `whatsapp-catalogue` — 7 slides
Fifth tag: `#whatsappbusiness`

> Selling on WhatsApp in Hyderabad? Here is where a catalogue stops being enough.
>
> Nobody is telling you to stop selling on WhatsApp. It works. The question is
> what happens on the days you cannot answer it.
>
> Four things a WhatsApp catalogue will never do:
> — Take the money while you're asleep
> — Stop selling something you've run out of
> — Send a GST invoice on its own
> — Tell you what people looked at and didn't buy
>
> The real cost is that you are the checkout. Every sale waits for you to
> reply. That's fine at ten orders a week and it is the whole problem at fifty.
>
> And nothing has to change. The WhatsApp Store tier is built so you run the
> entire thing from WhatsApp — orders, returns and refunds included — with a
> real checkout sitting behind it. ₹49,999, four weeks, GST extra.
>
> How many orders a week are you at right now? **Comment a rough number.**
> Under ten and we will probably tell you to wait. That answer is free and we
> give it more often than you'd think.
>
> WhatsApp +91 77999 34943.
>
> #hyderabadbusiness #websitedesignhyderabad #hyderabadsmallbusiness
> #smallbusinessindia #whatsappbusiness

**Meta description** · A WhatsApp catalogue can't take money, track stock or invoice. WhatsApp Store ₹49,999, four weeks, run from your phone. Hyderabad.

**Alt text** · 1 Dark slide "YOUR CATALOGUE ISN'T A SHOP". 2 Cream slide "IT WORKS UNTIL IT DOESN'T". 3 Four things a catalogue can't do. 4 You are the checkout. 5 WhatsApp stays. 6 WhatsApp Store ₹49,999, four weeks. 7 Comment how many orders a week.

---

## 15 · Diwali is 8 November · `diwali-deadline` — 7 slides
Fifth tag: `#diwali2026`

**Post this first, in the week of 21 September. It expires.**

> Want to be selling online by Diwali in Hyderabad? Here are the real sign-by dates.
>
> Diwali is Sunday 8 November 2026. Counting back from it:
>
> — Static website, two weeks — sign by 25 October
> — WhatsApp Store, four weeks — sign by 11 October
> — Site + CRM, six weeks — sign by 27 September
> — Larger store, eight weeks — sign by 13 September
>
> That last one has already gone, and we would rather say so now than take a
> deposit in October and rush it. The build takes as long as it takes. This
> isn't urgency, it's arithmetic.
>
> If you have left it late, two weeks still fits. A static website with your
> prices, your timings and a WhatsApp button will do more for a festive season
> than no page at all — ₹14,999, GST extra.
>
> What are you hoping to sell this Diwali? **Comment it and we'll tell you
> which of those four dates is yours** — or that you should aim at Sankranti
> instead and do it properly.
>
> WhatsApp +91 77999 34943 this week and we'll tell you honestly if it still
> fits.
>
> #hyderabadbusiness #websitedesignhyderabad #hyderabadsmallbusiness
> #smallbusinessindia #diwali2026

**Meta description** · Diwali is 8 November 2026. Sign by 11 October for a WhatsApp Store, 25 October for a website. Fixed prices, Hyderabad.

**Alt text** · 1 Dark slide "DIWALI 8 NOV". 2 Cream slide "START BY 11 OCTOBER". 3 The four sign-by dates. 4 It is not urgency, it is arithmetic. 5 Two weeks still fits. 6 WhatsApp Store ₹49,999, sign by 11 October. 7 Ask if your date still works.

---

## 16 · The launch checklist · `free-checklist` — 7 slides
Fifth tag: `#smallbusinesstips`

> Free launch checklist from a Hyderabad web studio — the 20-point pass every store clears before launch.
>
> It's a PDF. No email, no form, no sign-up. Message us the word CHECKLIST on
> WhatsApp and it comes back.
>
> WHAT IT CHECKS
> — Lighthouse across all four axes
> — Real-device mobile QA, not a browser resize
> — Cross-browser check
> — WCAG AA accessibility
> — End-to-end form and checkout tests
> — Link-preview validation
> — DNS and SSL verification
> — Analytics firing before launch, not after
>
> Run it against a site you already have. If you're talking to another studio,
> hand it to them — a studio that objects to a QA checklist has just told you
> something useful.
>
> Two more on the same terms. A product catalogue template: the exact fields we
> ask every client for. And a scope worksheet, so you can compare quotes on the
> same basis — including ours.
>
> Which of the three do you want? **Comment CHECKLIST, CATALOGUE or SCOPE and
> we'll send it.** Free, no sign-up, and we won't follow up unless you ask.
>
> WhatsApp +91 77999 34943.
>
> #hyderabadbusiness #websitedesignhyderabad #hyderabadsmallbusiness
> #smallbusinessindia #smallbusinesstips

**Meta description** · Free 20-point launch checklist: Lighthouse, mobile QA, WCAG AA, checkout tests, DNS and SSL. No email required. Hyderabad.

**Alt text** · 1 Dark slide "THE 20 POINT CHECK". 2 Cream slide "NO FORM NO EMAIL NO CATCH". 3 Four performance and accessibility checks. 4 Four checks that break quietly. 5 Use it against us too. 6 The catalogue template and scope worksheet. 7 Message the word CHECKLIST.

---

## One experiment per batch, and only one

Carousels cannot be A/B tested — Trial Reels have no carousel equivalent, so
the only comparison available is sequential, posting variants weeks apart,
which is badly confounded. Change one thing per batch or learn nothing.

**This batch's experiment: the same body slides with two different slide 1s,
two weeks apart.** `inside-14999` and `why-49999` are close enough in content
to serve — one leads on a number, one leads on a comparison. Compare them on
**sends and profile visits**, not likes.

Everything else — the eight numbers to watch, the UTM scheme on the bio link,
what to ignore — is in `marketing/social/PLAYBOOK.md`.
