# Carousels — ready to post

Slides are in `marketing/social/out/<id>/`, numbered in posting order. Select
the whole folder in Instagram and it uploads in sequence.

Re-render after any edit to `carousels.json`:

```bash
python3 -m http.server 8000
NODE_PATH=$(npm root -g) node marketing/social/render-carousels.cjs
```

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
> HITEC City, Hyderabad. WhatsApp +91 77999 34943 and ask what yours would cost.
> If a cheaper option is the honest answer, we will say so.
>
> #hyderabadbusiness #websitedesignhyderabad #hyderabadsmallbusiness
> #smallbusinessindia #whatsappbusiness

**Meta description** (155 chars, for the landing page this post points at)

> Answering the same four questions on WhatsApp all day? A website answers them
> for you. From ₹14,999, fixed price in writing. Hyderabad.

**Alt text, per slide** — Instagram reads this for accessibility and search.

1. Dark slide: "You're not running a business. You're running a reply machine."
2. Dark slide asking "Price?" with the other three questions shops answer daily.
3. Dark slide: a customer searched, found nothing, and called a competitor.
4. Dark slide listing four things a website answers: prices, delivery, payment methods, WhatsApp orders.
5. Dark slide: static website ₹14,999 one time, GST extra; online stores from ₹49,999.
6. Dark slide: book a 30-minute call with Brand Mint, HITEC City Hyderabad.

---

## 2 · Own it or rent it
`marketing/social/out/own-it/` — 6 slides

**Caption**

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
> Every price in full at brandmintstudios.in — no form, no discovery call to find
> out what it costs.
>
> #hyderabadbusiness #websitedesignhyderabad #hyderabadsmallbusiness
> #smallbusinessindia #instagramshop

**Meta description**

> Running your shop off Instagram? That page isn't yours. Own your domain,
> hosting and orders. Online stores from ₹49,999. Hyderabad.

**Alt text, per slide**

1. Dark slide: "That page isn't yours."
2. Dark slide: if the account goes, the photos, prices and customer conversations go with it.
3. Dark slide listing what you own with Brand Mint: domain, hosting, payment account, customer records.
4. Dark slide: keep posting on Instagram exactly as you do now.
5. Dark slide: online stores from ₹49,999, GST extra, four to twelve weeks.
6. Dark slide: see the four store tiers at brandmintstudios.in.

---

## 3 · Why the price is fixed
`marketing/social/out/fixed-price/` — 6 slides

**Caption**

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
> WhatsApp +91 77999 34943 and ask what yours would cost. Straight answer on the
> first message.
>
> #hyderabadbusiness #websitedesignhyderabad #hyderabadsmallbusiness
> #smallbusinessindia #webdesign

**Meta description**

> Fixed price, in writing, before anyone starts. Websites from ₹14,999, stores
> from ₹49,999, GST extra. A senior operator on every build. Hyderabad.

**Alt text, per slide**

1. Dark slide: "Your price. In writing."
2. Dark slide: the usual story — started at one number, ended at three.
3. Dark slide listing four terms: signed scope and price, 50/50 payment, GST invoices, no hourly billing.
4. Dark slide: the person on the call is the person building it, 8+ years on every build.
5. Dark slide: Site + CRM ₹79,999 setup then ₹9,999 a month, GST extra.
6. Dark slide: WhatsApp +91 77999 34943 to ask what yours would cost.

---

## Posting notes

- **One a week, same day, same time.** Three carousels is three weeks. Posting
  all three in one day spends the whole set on the same impression.
- **Slide 1 is the entire post.** Nobody swipes past a weak cover, so the
  strongest line goes there and nowhere else.
- **Reply to every comment within the hour** — on a local account that reach is
  worth more than the post itself.
- **The caption's first line is what shows before "more".** Each of these opens
  on the problem, not on the studio's name, for exactly that reason.
- **Point the link in bio at `/pricing`**, not the home page. These posts all
  promise a number; send people to where the numbers are.

---

## 4 · Before you pay anyone
`marketing/social/out/before-you-pay/` — 7 slides

The scale-hook format, borrowed from the prompt-pack carousels that run on
Explore. **The mechanic is what transfers, not the content.** Those posts get
shares roughly equal to likes because slide five hands over the exact AI
prompt — the image only buys the first second, the giveaway does the rest.
Their audience is designers, so the giveaway is a prompt. This audience is
shop owners, so the giveaway is the ten questions that protect them from a bad
build. A prompt pack here would buy followers who will never purchase.

The checklist is deliberately answerable by any studio, including competitors.
A giveaway that only we pass is an advert wearing a checklist's clothes, and
people can tell.

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

1. A giant man kneeling in an old Hyderabad street beside a small shopfront. "Before you pay anyone for a website."
2. Dark slide: the problem is never the code, it is what was never agreed in writing.
3. Dark slide, four ownership questions: domain, hosting, payment account, data export.
4. Dark slide, four cost questions: fixed or hourly, signed agreement, GST, mid-project changes.
5. Dark slide: "Who do I call when it breaks at 9pm?"
6. A giant man sitting on Charminar. Ten questions, no wrong answers, only honest ones.
7. Dark slide: Brand Mint answers all ten in writing. Prices and WhatsApp number.

**Why this one is the lead post.** It is the only carousel in the set that is
useful to someone who never hires us, which is exactly why it gets saved and
sent to a friend opening a shop. Post it first.

### On the scale-hook images

`images/hook-shop.png`, `hook-charminar.png`, `hook-hitec.png` — generated,
4:5, regenerate with `node scripts/gen-image.mjs --hooks`.

Hyderabad landmarks on purpose: a giant man on the Arc de Triomphe says nothing
to a boutique in Kukatpally, and Charminar and the autos say "this is for you"
before a word is read. The figure is generic and is never presented as a
client, a customer or studio staff.

These are obviously impossible images, so nobody reads them as documentary —
but if one is ever used where it could be mistaken for a photograph of real
work, label it. The same rule as the presenter avatars.
