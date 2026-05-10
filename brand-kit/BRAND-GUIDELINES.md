# Brand Mint — Brand Guidelines

*Hyderabad-built studio for ambitious teams. Premium-but-accessible. Founder-to-founder voice.*

---

## 1. Story & positioning

**Brand Mint mints brands that compound.**

We are a small, senior studio in HITEC City, Hyderabad. We design and engineer custom websites, internal tools, brand systems, and the AI integrations that quietly run behind them. Every engagement is led by an 8+ year operator. No interns at the table.

**Who we serve:** founder-led companies in India and the Gulf, ₹2 Cr–₹500 Cr revenue, who want creative work that ships fast and pays back.

**What we don't do:** logo-only handoffs, deck design, anything we can't measurably tie to revenue or product velocity.

### Voice

| Do | Don't |
|---|---|
| Speak like a founder to a founder | Use agency words: synergy, holistic, bespoke craftsmanship |
| Show specific numbers (₹3.2 Cr, 28.4k sessions, +47%) | Use vague claims (industry-leading, world-class) |
| Use Indian context (HITEC City, Q3 2026, INR) | Default to US-centric framing |
| Italicise *one* emphasis word per sentence max | Bold every other phrase |
| Write at a 9th-grade reading level | Use words you'd never say aloud |

---

## 2. Logo

### Composition

The Brand Mint mark is a circle filled with a mint gradient, containing a stylised **M** drawn in a single stroke that suggests both the letter and a rising graph line.

The full lockup is: **mark + wordmark "Brand Mint" + city tag "— Hyderabad"**.

### Variants & when to use them

| Variant | When to use |
|---|---|
| `brand-mint-primary.svg` | Default — light/cream backgrounds, every web header, business cards, decks |
| `brand-mint-primary-dark.svg` | On `#0b1f1a` or darker backgrounds |
| `brand-mint-wordmark.svg` | When the mark would compete with adjacent marks (eg. partner logo strips) |
| `brand-mint-monogram.svg` | Tight square spaces — favicons, app icons, social avatars |
| `brand-mint-monogram-mono.svg` | Single-colour print, embossing, when the surface clashes with the gradient |
| `brand-mint-monogram-cream.svg` | Stitching, foil stamping, anywhere mono on dark |

### Clear space

Reserve clear space equal to the height of the **M stroke** on every side of the lockup. Nothing — text, illustrations, image edges — should encroach.

### Minimum sizes

- Primary lockup: 120px / 32mm wide minimum
- Wordmark only: 96px / 24mm
- Monogram: 16px / 5mm

### Don'ts

- ❌ Do not recolour the gradient — use a mono variant instead
- ❌ Do not stretch, skew, rotate, or outline the mark
- ❌ Do not place the mark on photography without a translucent backdrop
- ❌ Do not add drop shadows or bevels
- ❌ Do not change the wordmark font — it is set in Plus Jakarta Sans 600 italic at the same x-height as the mark

---

## 3. Colour system

### Primary palette

| Token | Hex | RGB | Use |
|---|---|---|---|
| Mint 1 | `#D6F5E6` | 214 245 230 | Soft tints, hover wash, table stripes |
| Mint 2 | `#7CF6C8` | 124 246 200 | Gradient stop, accent highlights |
| **Mint 3** | **`#10B981`** | **16 185 129** | **Primary brand colour. CTAs, the mark.** |
| Mint 4 | `#047857` | 4 120 87 | Hover state, deep accents |

### Neutrals

| Token | Hex | Use |
|---|---|---|
| Ink | `#0A0E0C` | All body text on light bg, deep surfaces |
| Paper | `#F5F1EA` | Page background — the warm cream |
| White | `#FFFFFF` | Card surfaces, contrast surfaces |
| Muted | `#0A0E0C` @ 62% | Secondary copy |
| Line | `#0A0E0C` @ 10% | Hairline dividers |

### Accent

| Token | Hex | Use |
|---|---|---|
| Gold | `#C9A14A` | Editorial accents in the dark interlude only — case study numbers, monograms |

### Dark interlude (Brands We Have Built section)

These tokens are scoped to the `.bm-clients` block. Don't use them in light contexts.

| Token | Hex |
|---|---|
| BM Ink | `#0B1F1A` |
| BM Ink 2 | `#14352D` |
| BM Ink Deep | `#06140F` |
| BM Cream | `#F5F1EA` |
| BM Emerald | `#00C897` |

### Pairing rules

- **Light pages:** Paper background → Ink text → Mint 3 CTAs → Gold reserved for one editorial flourish
- **Dark interlude:** Ink gradient → Cream text → Emerald CTAs → Gold for serial numbers / monograms
- Never use Mint 3 and Gold side-by-side at the same scale — Gold should always be quieter

### Accessibility

- Ink on Paper: 14.6:1 — AAA
- Mint 3 on Paper: 3.4:1 — pass AA only at 18px+
- White on Mint 3: 3.0:1 — buttons must be ≥16px and bold

---

## 4. Typography

### Type stack

```
Display:  "Plus Jakarta Sans", system-ui, sans-serif
Body:     "Inter", system-ui, sans-serif
Numerals: "JetBrains Mono", ui-monospace, monospace
```

### Roles & sizing

| Role | Family | Weight | Size | Tracking |
|---|---|---|---|---|
| Hero (H1) | Plus Jakarta Sans | 600 | clamp(38px, 5.2vw, 72px) | -0.03em |
| Section (H2) | Plus Jakarta Sans | 600 | clamp(28px, 4vw, 48px) | -0.02em |
| Card title (H3) | Plus Jakarta Sans | 600 | 22px | -0.015em |
| Editorial blockquote | Plus Jakarta Sans | 500 | clamp(24px, 3vw, 38px) | -0.01em |
| Body | Inter | 400 | 15-18px | 0 |
| Eyebrow / label | Inter | 600 | 11-12px | 0.18em UPPER |
| Numerals / IDs | JetBrains Mono | 500 | 12-14px | 0.06em |

### Italic emphasis

Use `<em>` to italicise **one** word per headline. This is the brand's signature emphasis. Never italicise more than one phrase in a single block.

> We mint *brands* that compound.

### Numerals

All quantitative claims — INR amounts, percentages, KPIs, dates — set in **JetBrains Mono**. Signals "engineered".

> +₹42.6 Cr · 28.4k sessions · Q3 2026

### Don'ts

- ❌ Do not substitute another grotesque for Plus Jakarta — Inter, GT America, etc all have different x-heights and letterforms that break the visual rhythm
- ❌ Do not use Plus Jakarta below 14px — it loses character; switch to Inter
- ❌ Do not centre body copy — left-align everything except headline grids
- ❌ Do not exceed 56ch line length

---

## 5. Iconography

- **Stroke icons only** — 1.6px stroke at 24×24 viewbox, 1.4px at 32×32
- Round caps and joins
- No fills, no two-colour icons
- Source: hand-drawn for hero illustrations; Lucide or Phosphor (regular weight) acceptable for utility
- Mint 3 on Paper, Cream on Ink

---

## 6. Photography & imagery

Brand Mint is a young studio. Until the founder photoshoot ships:

- **Use monogram tiles** in place of headshots. Cream "M / S / A" on emerald squares is on-brand and intentional.
- **Use product mockups** of dashboards/sites we've shipped, NOT stock images of "people pointing at laptops."
- **Use one screenshot** per case study, lightly tilted (`rotate(-1.5deg)` works on the web).

If photography is unavoidable: high-contrast, warm-light, India-grounded scenes (HITEC City skyline, founder offices). No stock.

---

## 7. Voice samples

### ✅ On-brand

> We mint brands that compound. Custom websites and internal tools, engineered in HITEC City for founders who'd rather ship than slide-deck.

> Last quarter: +₹42.6 Cr in tracked revenue across 11 founder-led brands.

> Studio in HITEC City. Booking Q3 2026. INR-priced. GST extra.

### ❌ Off-brand

> Brand Mint is a holistic, world-class digital agency offering bespoke end-to-end solutions for forward-thinking enterprises. *(too generic, no specifics, jargon)*

> Crafting tomorrow's brands today. *(empty, sounds like every other agency)*

> Reach out to discuss your unique business needs! *(no context, no numbers)*

---

## 8. Application examples

### Email signature

```
Sumanth | Brand Mint
Studio in HITEC City, Hyderabad
brandmint.studio · +91 …
```

Plus Jakarta Sans 600 for the name + studio, Inter 400 for the rest, mint-3 underline on the URL only.

### LinkedIn post

- Lead with one specific number
- Italicise one word
- 3-line max preview
- Sign off "— Brand Mint, Hyderabad"

### Business card

- 88×55mm
- Front: monogram top-left, name + role centre-baseline
- Back: full lockup centred on Paper, gold thin rule above the city tag
- Plus Jakarta 600 / Inter 400 / JetBrains Mono for the phone

---

## 9. Naming conventions

- Use **Brand Mint** as two words, both capitalised. Never "BrandMint", "Brandmint", or "BM" externally.
- Internal shorthand "BM" is fine in code (`--bm-ink`, `bm-clients`)
- Domain: `brandmint.studio`
- Handle: `@brandmintstudio`

---

## 10. Versioning

This is **v1.0** of the identity. Changes go through a single owner (currently the founder). When updating: bump the version in this file, append a one-line changelog at the bottom, and ping every active retainer client with the new asset URLs.

### Changelog

- **2026-05-10 — v1.0** — initial kit alongside site launch
