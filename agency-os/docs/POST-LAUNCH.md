# Post-launch measurement

Everything below is implemented in code. Most of it stays dormant until you paste
an ID into Vercel, which is deliberate: a half-configured tag is worse than none,
so nothing loads without its variable set.

## What you have to do

Vercel → Project → Settings → Environment Variables. Add to **Production**
(and Preview if you want preview traffic measured, which you probably do not).

| Variable | Where it comes from | Without it |
|---|---|---|
| `VITE_GA4_ID` | analytics.google.com → Admin → Data streams → your web stream → **Measurement ID** (`G-XXXXXXXXXX`) | No analytics, no conversions, no web-vitals |
| `VITE_CLARITY_ID` | clarity.microsoft.com → new project → **Project ID**. Free, unlimited | No heatmaps, no session recordings |
| `VITE_GSC_VERIFICATION` | search.google.com/search-console → add property → **HTML tag** method → copy only the `content` value | Property stays unverified |
| `VITE_REVIEW_URL` | Google Business Profile → Ask for reviews → copy link (`https://g.page/r/…/review`) | The review ask never appears in the client portal |

Redeploy after adding them — Vite bakes these in at build time, so an existing
deployment will not pick them up.

Then, once deployed:

1. **Search Console** → submit `https://brand-mint-sdmk.vercel.app/sitemap.xml`.
2. **GA4** → Admin → Events → mark these as **key events**:
   `enquiry_submit`, `phone_click`, `whatsapp_click`, `onboarding_complete`.
   Without this they are ordinary events and will not appear as conversions.
3. **GA4** → link to Search Console (Admin → Product links) so queries and
   landing pages sit in one report.

## What is measured

Every event is defined once in `client/src/lib/analytics.ts`. Add nothing
ad hoc — an event invented in a component is one nobody ever reads.

| Event | Fires when |
|---|---|
| `page_view` | Every route change. The SPA sends these itself; GA4's automatic page view is switched off so nothing double-counts |
| `enquiry_start` | First keystroke in the enquiry form — the denominator for form completion |
| `enquiry_submit` ★ | Enquiry accepted by the server |
| `enquiry_failed` | Submission errored. **Watch this.** A silently failing form looks exactly like a form nobody used |
| `cta_click` | Any CTA aimed at the enquiry form, with `location` = the section it sat in |
| `pricing_view` | The tier section scrolled into view — strongest intent short of the form |
| `phone_click` ★ / `whatsapp_click` ★ | Tap on a `tel:` or WhatsApp link |
| `review_click` | Client tapped through to leave a review |
| `experiment_view` | An A/B variant was shown |
| `web_vitals` | LCP, CLS and INP from real visits, with `rating` and `path` |

**There is currently no `tel:` or WhatsApp link anywhere in the app.** The
handlers exist and will fire the moment you add one. Worth knowing, because your
reels drive people here and the only way to reach you is the form.

## A/B testing

`client/src/lib/experiments.ts`. One test is defined (`hero_cta`) and is not yet
used by any component — wire it with `useVariant("hero_cta")` when you want it.

Assignment is a hash of a per-browser id, so it is stable, even, and needs no
vendor and no extra request. Analysis is a comparison of conversion rate grouped
by `variant` in GA4.

Be honest about volume: at low traffic a result will not reach significance for
weeks. Run **one** test at a time, on the thing that matters most, and leave it
alone. Two at once on this traffic tells you nothing about either.

## Speed

```bash
pnpm speed           # the local build, throttled to slow 4G
pnpm speed:prod      # production
CPU=1 pnpm speed     # no CPU throttle, for a slow CI host
```

It exits non-zero when a metric is in Google's "poor" band, so it can gate a
deploy. Current local build: **LCP 2.86 s · CLS 0.000 · TTFB 10 ms**, 238 KB
transferred.

Two things were fixed by measuring rather than guessing:

- **Fonts were an `@import` at the top of `index.css`.** The browser could not
  even discover the request until it had downloaded and parsed the app
  stylesheet, putting the font CSS and then the font files in series ahead of
  first paint. They now load in parallel from `index.html` and never block
  rendering.
- **The marketing page shipped the entire admin app.** Every signed-in route is
  now lazy-loaded, which took the entry bundle from 874 KB to 747 KB.

LCP is still above the 2.5 s "good" line. The remainder is the shared vendor
bundle — React, Firebase, Radix, framer-motion. Splitting Firebase out behind
the sign-in path is the next real win and is not done.

## Consent

Do Not Track is honoured before any vendor loads, and GA4 Consent Mode v2
defaults to `ad_storage: denied`. That is a defensible default, **not legal
advice**. If you start running ads, or take EU traffic, you need a consent
banner — call `grantAdConsent()` from it.

## Reviews

`client/src/data/reviews.ts` is empty and the section does not render. Fill it
only with words a client actually wrote. The structured data is emitted strictly
alongside visible reviews, because marking up a review a visitor cannot see is
against Google's guidelines and risks a manual action.
