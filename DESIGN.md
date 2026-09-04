# DESIGN.md — the public site

Durable design decisions for `index.html`, `login.html`, the legal pages and
`styles.css`. The portal and admin have their own stylesheets and are working
tools, not marketing; they follow the same tokens but not the same rhythm.

## Product lane

Brand Mint sells four fixed-price online stores to Indian founders. The home
page has one job: make a visitor pick a tier and sign in with Google. Every
design decision serves that: price is the most prominent number on the page,
the tier CTA is the only link inside a card, and nothing on the page asks for
anything other than that click.

Voice: founder to founder. Specific numbers, Indian context, one italic word
per headline, no agency vocabulary.

## Colour roles (from `brand-kit/BRAND-GUIDELINES.md`)

| Role | Token | Value |
|---|---|---|
| Page | `--paper` | `#F5F1EA` warm cream, never white |
| Cards | `--surface` | `#FFFFFF` |
| Text | `--ink` / `--ink-2` / `--muted` / `--faint` | `#0A0E0C` and three steps down, all ≥ 4.5:1 on paper |
| Primary action | `--mint` `#10B981` | the only saturated fill on the light page |
| Emphasis, links | `--mint-deep` `#047857` | italic headline word, tier CTA, links |
| Dark interlude | `--bm-ink` → `--bm-ink-2` → `--bm-ink-deep` | "How it works", featured tier, closing CTA |
| On dark | `--cream`, `--cream-mute`, `--emerald` | text, secondary text, labels |
| Gold | `--gold` `#C9A14A` | step numbers in the dark interlude only |

Rule: Mint and Gold never sit side by side at the same scale.

## Type

| Role | Face | Weight | Size |
|---|---|---|---|
| H1 | Plus Jakarta Sans | 600 | clamp(38px, 5.6vw, 68px), -0.03em |
| H2 | Plus Jakarta Sans | 600 | clamp(28px, 3.8vw, 46px), -0.02em |
| H3 | Plus Jakarta Sans | 600 | 18–22px, -0.015em |
| Body | Inter | 400 | 14–19px |
| Eyebrow | Inter | 600 | 11–11.5px, 0.18em, uppercase |
| Numerals | JetBrains Mono | 500–600 | tabular, always `.num` |

`<em>` inside a heading is italic, weight 500, mint-deep. One per headline.

## Rhythm

Spacing scale `--s-1` … `--s-9` (4, 8, 12, 16, 24, 32, 48, 64, 96). Sections
pad `clamp(56px, 8vw, 104px)`. Radii: 10 (controls), 16 (cards), 22 (the one
big dark CTA block). Shadows: one soft, one deep for the dark surfaces.

## Cards, and where they are not

Cards are only for the four tiers: they group a price with what it buys and
carry the action. Care plans are rows on hairlines. Steps are columns on a
hairline. Nothing is nested inside a card.

## Responsive intent

- ≥ 1000px: four tiers in one row, featured tier dark.
- 720–999px: tiers 2×2, care rows, steps wrap.
- < 720px: tier inclusions fold under "What's included" (featured tier open);
  care rows stack name/price over the description; buttons stretch.

## States and access

Skip link, visible `:focus-visible` on everything, reduced-motion kills every
transition, no horizontal scroll at 375px, colour never the only signal.

## Motion

All vanilla, CSP-safe, and additive: nothing is hidden unless `html.js` is
present, and `prefers-reduced-motion` renders everything static.

- The logo's M draws itself once on load (stroke-dashoffset, 0.9s).
- Hero children enter staggered (`data-enter`, 70ms apart).
- Sections and grid children reveal on scroll (`data-reveal`,
  `data-reveal-group` staggers children by `--i`), via IntersectionObserver.
- The nav gains a shadow once the hero has scrolled past.
- Tier cards lift 2px on hover; the CTA arrow nudges 3px.
- FAQ answers fade up on open.

One easing everywhere: `cubic-bezier(0.2, 0.7, 0.2, 1)`. Durations 150ms
for state, 600–700ms for entrances. No parallax, no loops, no scroll-jacking.

## Conversion patterns

- One dominant action: "See the four stores" in the hero, then a tier button
  in every card (featured tier filled), and a sticky bottom bar on phones.
- Trust strip of India-specific facts under the hero, not badges.
- "Not sure which one?" guide under the tiers to cut choice paralysis.
- FAQ that answers the six objections before the call (shared with the portal).
- No fabricated testimonials or numbers; the brand voice forbids it.

## The portal's first screen

A person who signed in but has not been called sees the full services
review: their tier in detail plus everything it inherits, one-click switch
to another tier, what we need from them, the three steps, care plans, FAQ.
All of it renders from `shared/tiers.js`, so it never drifts from the site.
