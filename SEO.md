# SEO — how the site is set up, and the two things only you can do

The live domain is **https://brandmintstudios.in**. Everything in the repo now
points there: canonicals, Open Graph URLs, `robots.txt` and `sitemap.xml`.
Before this, every one of them pointed at `brand-mint-sdmk.vercel.app`, which
told Google the Vercel URL was the real site.

## What ships in the repo

| Thing | Where | Notes |
|---|---|---|
| Title + description | `index.html` `<head>` | Title leads with the service, not the brand — nobody searches "Brand Mint" yet |
| Canonical + Open Graph | every page `<head>` | All absolute, all on `brandmintstudios.in` |
| Structured data (JSON-LD) | `index.html` | `ProfessionalService` (name, phone, HITEC City address, price range), an `OfferCatalog` of the four tiers with real prices, `WebSite`, and `FAQPage` |
| `robots.txt` | root | Allows the public pages, blocks `/admin`, `/portal`, `/login` and `?tier=` URLs |
| `sitemap.xml` | root | Home, privacy, terms and the three free PDFs, with `lastmod` |
| `noindex` | `portal.html`, `admin.html`, `login.html` | Belt and braces on top of robots.txt |
| `lang="en-IN"` | every page | Tells Google the market |

**When you change a tier price in `shared/tiers.js`, change it in the JSON-LD
block in `index.html` too.** They are separate on purpose — search engines read
static markup far more reliably than prices rendered by JavaScript.

## Two things only you can do

### 1. Verify Google Search Console (5 minutes)

Go to <https://search.google.com/search-console> and add a property.

**Use the Domain property, not the URL prefix one.** It covers `www`, the bare
domain and every subdomain in one go, and it does not break when you redeploy.

- Choose **Domain**, enter `brandmintstudios.in`
- Google gives you a TXT record. Add it at whoever you bought the domain from,
  as a TXT record on the root (`@`)
- Click Verify. DNS can take a few minutes to an hour

Then, inside Search Console:

- **Sitemaps** → submit `sitemap.xml`
- **URL Inspection** → paste `https://brandmintstudios.in/` → *Request indexing*

If you would rather use the meta-tag method, uncomment the
`google-site-verification` line in `index.html` and paste your token in.

### 2. Point one domain at the other

Decide whether `brandmintstudios.in` or `www.brandmintstudios.in` is the real
one and make Vercel 301-redirect the other to it. Two versions of the same site
in Google's index split your ranking between them. The canonicals in the repo
name the bare domain, so redirect `www` → bare unless you want the opposite.

Vercel → the project → Settings → Domains.

## Also worth doing, in order

1. **Google Business Profile.** For "ecommerce developer in Hyderabad" style
   searches, the local pack sits above the normal results. Free, and the single
   biggest local win. Use the same name, address and phone as the JSON-LD.
2. **Bing Webmaster Tools.** It imports straight from Search Console. Two clicks.
3. **Write pages worth ranking.** The home page can only rank for so much. One
   honest page per question a founder actually types — "how much does an
   ecommerce website cost in India", "Razorpay vs PayU for a new store",
   "what GST applies to online sales" — will do more than any amount of tag
   tuning. The lessons and compliance copy in `shared/resources.js` is already
   most of the writing.

## What we deliberately did not do

No keyword stuffing, no hidden text, no doorway pages per city, no fake reviews
in the structured data. Google penalises all of it, and the brand voice forbids
it anyway.
