# The road to ₹1,00,000/month

One goal. Not ten million — break-even. Everything below is ordered by
return per hour spent, and says plainly who does it.

Last updated after the Inventory Manager pacing was corrected.

---

## The one number that matters

**₹1,00,000/month is ten billable days at ₹10,000/day. You have about fifteen.**

Break-even is not a capacity problem and never was. At the effective rate the
current engagements are running at (~₹2,130/day) it would take 47 days a month,
which does not exist. At your own published rate it takes ten.

| Day rate | Days/month needed for ₹1 L |
|---|---|
| ₹2,130 — blended rate today | 47 — impossible |
| ₹6,000 | 16.7 — impossible |
| ₹10,000 | **10.0 — fits** |
| ₹12,500 | 8.0 — fits |

---

## Where the money stands

| | Cash/month | Capacity | Notes |
|---|---|---|---|
| Inventory Manager | ₹12,500 | ~3.8 d/mo | + Claude Max in kind. Recurring, no sales cost. |
| Green Basket | — | done soon | **₹80,000 outstanding**, already built |
| Tresor Couture | ₹0 | — | unpaid |
| Modcon HR | ₹0 | — | internal, free |
| **Total cash MRR** | **₹12,500** | | gap to break-even: **₹87,500** |

Free capacity after Inventory Manager: **~11.3 days/month.**
At ₹10,000/day that is ₹1,13,000 of headroom. Break-even fits with room spare.

### Inventory Manager is a base load, not a leak

Paced your way — Shopify next month, the commerce platform over ~2 months of
real work, stretched across ~12 months — it draws about **25% of capacity for
guaranteed recurring income with zero acquisition cost.** That is a sound
foundation. An earlier version of this plan said re-scope it; that was based on
a 94-day estimate of mine, not your 45. Your number wins — you know the scope.

The discipline that keeps it sound is the boundary, not the price: when the
platform work is done, the retainer covers maintenance. New platform features
get quoted with `npm run quote` and sent as a scope document.

---

## The shape of a break-even month

| Line | Cash | Days |
|---|---|---|
| Inventory Manager | ₹12,500 | 3.8 |
| 2 retainers @ ₹25,000 | ₹50,000 | ~3 |
| 4 project days @ ₹10,000 | ₹40,000 | 4 |
| **Total** | **₹1,02,500** | **~10.8 of 15** |

Two more retainers and four billable days a month. That is the whole gap.

---

## Actions

### Do these first — highest return, least effort

| # | Action | Who | Worth |
|---|---|---|---|
| 1 | **Collect Green Basket's ₹80,000.** Built, earned, uncollected. | You | 0.8 months of break-even, zero new work |
| 2 | **Delete the service account key** `090ec9570b523f4c…` in Firebase Console → Project Settings → Service Accounts → Keys | You | Closes a root-credential exposure |
| 3 | **Publish the `catalog` Firestore rule** — `match /catalog/{id} { allow read, write: if isAdmin(); }` | You | Unblocks `/quote` |

Do not ship Green Basket's APK before the balance clears. It is the deliverable
with leverage, and your own terms say 50% advance — 15% was taken.

### Then — make the portal actually usable

| # | Action | Who |
|---|---|---|
| 4 | Create one client login: Firebase Console → Add user (`greenbasket@brandmintstudios.in`, set password there), copy UID, then `/studio` → Client Access | You |
| 5 | Sign in as that client in a private window, open `/tenancy-check`, confirm it says **Isolated** | You |
| 6 | Add Green Basket's real milestones and intake items on `/studio` so the portal stops showing empty panels | You |

Until 4 and 5 are done, tenant isolation is designed and reviewed but unproven,
and no client has ever logged in.

### Then — the two repos

| # | Action | Who |
|---|---|---|
| 7 | Create empty repos `commerce-core` and `commerce-skeleton` on GitHub (no README) | You |
| 8 | Push both — they are committed and tested locally | Me, once 7 is done |
| 9 | Point Vercel at `commerce-skeleton`; daily CI runs itself | You |

---

## Resolved since the last plan

- **Marketing claims removed and live.** All 19 unsubstantiated strings gone
  from `www.brandmintstudios.in`, verified against the deployed HTML. The press
  strip naming Forbes, Economic Times, YourStory, Inc42, The Ken, Awwwards and
  CSSDA was the highest-risk item and is off. All six services and price floors
  survived.
- **MRR now tells the truth.** `/studio` counts cash only. Inventory Manager
  shows ₹12,500 with "+ ₹12,500/mo in kind, not counted" beside it. The gauge
  answers "can I cover this month", which a subscription cannot.
- **Day rate corrected to ₹10,000**, derived from Brand Mint's own published
  prices divided by its own published timelines, which imply ₹10,000–20,000/day.
  The earlier ₹8,500 came from the "₹50k dynamic site" figure and sat below the
  floor implied by every advertised service.
- **`commerce-core` extracted** — the order state machine, coupon engine, GST
  validation and money formatting that Tresor and FreshKart had each built
  separately and incompatibly. 24 tests.
- **`commerce-skeleton` built** — feature registry, pricing, and the intake
  form as a command. 22 tests, daily CI.

---

## Open questions only you can answer

1. **The ₹50k tier.** The site says "Custom websites — from ₹2 L"; you quoted
   ₹50k for a dynamic site. If ₹50k is a real product it needs its own name and
   scope on the site. If it was a one-off concession it should not become the
   default. Right now the quote tool prices a real site build at ₹1,45,000 and
   the website says ₹2 L — close enough not to embarrass you, but not the same.
2. **What Tresor Couture is.** Currently unpaid with no retainer. Either it
   converts to something with a number on it or it is a portfolio piece — both
   are fine, but it should be labelled.
3. **Which two retainers.** The gap is two clients at ₹25,000. That is the only
   sales target that matters this quarter.
