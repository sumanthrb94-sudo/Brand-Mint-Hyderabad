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

## Deploy

Drop the folder on Vercel, Netlify, Cloudflare Pages, or GitHub Pages — no
configuration needed.
