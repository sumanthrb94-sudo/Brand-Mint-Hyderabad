# Brand Mint

Marketing site for **Brand Mint**, a digital media & marketing studio that
builds custom websites and bespoke internal tools.

## Stack

- Static HTML / CSS / JS — no build step
- Google Fonts (Instrument Serif, Inter, JetBrains Mono)
- Custom inline SVG illustrations and a hand-rolled mint design system

## Run locally

Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Files

- `index.html` — page markup (hero, services, work, process, testimonials, about, FAQ, contact, footer)
- `styles.css` — design tokens, components, responsive layout, reveal animation
- `script.js` — sticky nav, mobile menu, scroll-reveal, hero parallax, contact form
- `favicon.svg` — brand mark
- `og-image.png` / `og-image.svg` — 1200×630 social-share card (PNG used by WhatsApp/Facebook/iMessage; SVG kept as the editable source)
- `vercel.json` — clean URLs, security headers, cache rules

## Deploy to Vercel

The repo is already configured for Vercel via `vercel.json` — no build step.

**Option A — Vercel dashboard (recommended)**

1. Go to https://vercel.com/new
2. Import the `sumanthrb94-sudo/Brand-Mint.` repo
3. Framework preset: **Other** · Root directory: `./` · Build command: leave empty · Output directory: `./`
4. Deploy. You'll get a URL like `https://brand-mint.vercel.app`.

**Option B — Vercel CLI**

```bash
npm i -g vercel
vercel login
vercel --prod
```

### After deploy: fix the link preview

Open `index.html` and replace every occurrence of `https://brand-mint.vercel.app`
with your actual deployed URL (or your custom domain). These tags drive what
WhatsApp, iMessage, Facebook, Slack, and Twitter render when the link is shared:

- `<link rel="canonical">`
- `<meta property="og:url">`
- `<meta property="og:image">`
- `<meta name="twitter:image">`

Then re-deploy. Tip: WhatsApp aggressively caches link previews — to force a
refresh, tweak the URL (e.g. `?v=2`) before resharing, or run the URL through
[Facebook's Sharing Debugger](https://developers.facebook.com/tools/debug/)
which scrapes fresh metadata and clears the cache for the URL.

> Why "Google AI Studio" appears in WhatsApp previews: link unfurling reads the
> Open Graph tags of whatever page is at the URL you share. If you share a
> Google AI Studio preview/share URL, WhatsApp shows Google AI Studio's tags —
> not Brand Mint's. Share your Vercel/custom domain URL and you'll see the
> Brand Mint card instead.

## Updating the OG image

The PNG is generated from `og-image.svg` (the editable source). To regenerate:

```bash
pip install --user cairosvg
python3 -c "import cairosvg; cairosvg.svg2png(url='og-image.svg', write_to='og-image.png', output_width=1200, output_height=630)"
```
