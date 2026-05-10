# Brand Mint — Build Playbook

A component-by-component breakdown of how this site was built so you can mix and recombine the pieces in future projects without losing the design quality.

---

## 0. Stack & posture

| Layer | Choice | Why |
|---|---|---|
| Markup | Hand-written HTML5, semantic landmarks (`<header>`, `<main>`, `<section>`, `<footer>`) | No build step. Vercel serves static. SEO-friendly. |
| Styles | Single `styles.css` + scoped `<style>` block for the dark "Brands We Have Built" section | Most of the page shares one design token system; the dark block is intentionally a self-contained "interlude" with its own palette |
| Scripts | One inline `<script>` for IntersectionObserver reveal + form telemetry | No frameworks. Page is ~30KB compressed. |
| Fonts | Google Fonts: Plus Jakarta Sans (display + body display), Inter (body), JetBrains Mono (numbers/IDs) | Modern startup type register. True italics. Free. |
| Hosting | Vercel auto-deploy from `claude/build-brand-mint-website-*` branch | Push → live in ~30s |
| Forms | Formspree | No backend. Fallback `mailto:` if JS off. |
| OG image | Hand-authored SVG → cairosvg → `og-image.png` (1200×630) | Renders pixel-perfect; matches site type and palette |

**Design posture:** *premium-but-accessible Indian startup studio*. Hyderabad-grounded. INR-priced. Not enterprise-stuffy, not bootcamp-cheap.

---

## 1. Design tokens (the foundation)

Defined as CSS custom properties in `:root` in `styles.css`. Every component reads from these. Changing one token changes the whole site.

```css
:root {
  /* Type */
  --display: "Plus Jakarta Sans", system-ui, sans-serif;
  --serif:   var(--display);     /* legacy alias, kept so old rules still work */
  --sans:    "Inter", system-ui, sans-serif;
  --mono:    "JetBrains Mono", ui-monospace, monospace;

  /* Palette */
  --ink:     #0a0e0c;            /* near-black, slight green */
  --paper:   #f5f1ea;            /* warm cream — page bg */
  --white:   #ffffff;
  --muted:   rgba(10, 14, 12, 0.62);
  --line:    rgba(10, 14, 12, 0.10);
  --mint-1:  #d6f5e6;            /* tint */
  --mint-2:  #7cf6c8;            /* accent */
  --mint-3:  #10b981;            /* primary */
  --mint-4:  #047857;            /* deep */
  --gold:    #c9a14a;            /* champagne accent */

  /* Sizing */
  --radius:  10px;
  --maxw:    1240px;
  --pad:     clamp(20px, 4vw, 56px);

  /* Elevation */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 12px 32px rgba(10,14,12,0.08);
  --shadow-lg: 0 32px 80px rgba(10,14,12,0.18);
}
```

**Reuse rule:** when copying a component into a new project, copy this `:root` block first. Then components drop in untouched.

---

## 2. Type system

| Role | Family | Weight | Size | Letter-spacing |
|---|---|---|---|---|
| Display (hero, section H2) | Plus Jakarta Sans | 600 | clamp(28-72px) | -0.02 to -0.03em |
| Editorial (blockquote, monogram) | Plus Jakarta Sans | 500 | 18-22px | -0.01em |
| Body | Inter | 400 | 15-18px | 0 |
| UI label/eyebrow | Inter | 600 | 11-12px | 0.18em UPPERCASE |
| Numbers / IDs | JetBrains Mono | 500 | 12-14px | 0.06em |

**Calibration trick:** I added a single block at the top of `styles.css` that bumps display headings to `font-weight: 600` because Plus Jakarta at 400 reads thin at hero sizes. Reuse this block any time you swap from a serif-display font to a sans-display:

```css
.hero-title, .section-head h2, .impact-num, .service h3,
.case-body h3, .process h3, .leader h3, .cta-text h2 {
  font-weight: 600;
}
.quote blockquote, .featured-monogram { font-weight: 500; }
```

---

## 3. Layout primitives

```css
.section  { max-width: 1240px; margin: 0 auto;
            padding: clamp(56px, 7vw, 96px) var(--pad); }
.section-head { max-width: 760px; margin-bottom: clamp(28px, 3.5vw, 48px); }
```

Every section above-the-fold component uses `.section` + `.section-head`. That gives the page consistent rhythm.

For full-bleed sections (Impact strip, Brands We Have Built), `padding: 0` on the parent and the inner uses its own padding token.

---

## 4. Component catalog

Each component below is **independent**. Copy the HTML chunk + the CSS block + nothing else, and it works.

### 4.1 Top nav (`<header class="nav">`)

- Logo on left (SVG monogram + wordmark + city eyebrow)
- 5 inline links right-aligned, last one is a CTA pill with mint background
- Sticky? No — this site lets it scroll because the page is short
- Border-bottom appears on scroll via `.scrolled` class toggled by intersection observer

**Reuse for:** any agency / SaaS marketing site. Replace logo SVG, change nav items.

---

### 4.2 Hero (asymmetric grid)

```html
<section class="hero">
  <div class="hero-text">
    <span class="eyebrow">● Built in Hyderabad · Now booking Q3 2026</span>
    <h1 class="hero-title">We mint <em>brands</em><br/>that <span class="grad">compound.</span></h1>
    <p class="hero-sub">…</p>
    <div class="hero-cta"> <a class="btn btn-primary">…</a> <a class="btn btn-ghost">…</a> </div>
    <dl class="hero-meta"> 4 columns of stat / label </dl>
  </div>
  <aside class="hero-card"> dashboard mockup </aside>
</section>
```

Key tricks:
- `grid-template-columns: 1.15fr 1fr` — text dominates, mock supports
- `<em>` and `<span class="grad">` give two emphasis modes (italic + mint gradient)
- `.hero-card` uses `transform: rotate(-1.5deg)` for the lived-in dashboard mockup feel
- `.hero-meta` is a 4-up `<dl>` with `border-top` separator — proves credibility before user scrolls

**Reuse for:** any landing page where you need to balance copy with a product visual.

---

### 4.3 Impact strip (the "stats row")

Full-bleed section, 4-column grid of stat tiles. Each tile has:
- Big number (gradient text fill from `--ink` to `--mint-3`)
- Label (uppercase eyebrow)
- One-line context

The gradient text trick:
```css
.impact-num {
  background: linear-gradient(180deg, var(--ink) 0%, var(--mint-3) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```

**Reuse for:** social proof sections, "by the numbers" blocks, KPI dashboards.

---

### 4.4 Press wall

Marquee-style row of publication names rendered in display type. Implementation is a flex row with `gap: clamp(28px, 4vw, 64px)` and `overflow-x: auto` on mobile. Each item is just text — no logos, on purpose. Reads more editorial/credible than a row of logos.

**Reuse for:** "as seen in", testimonial mast.

---

### 4.5 Services grid (3 columns, one feature card)

```html
<section class="section" id="services">
  <div class="section-head">…</div>
  <div class="services">
    <article class="service">…</article>
    <article class="service service--feature">…</article>  <!-- dark gradient -->
    <article class="service">…</article>
    …
  </div>
</section>
```

The feature card uses `linear-gradient(160deg, #0b1f1a 0%, #14352d 100%)` — same gradient now used by the Brands We Have Built section, so the two surfaces visually pair.

Each card has:
- 28×28 SVG icon in a 48×48 tinted square
- H3 title
- 2-3 line description
- `.chips` row (tech stack pills)
- `.service-price` — "From ₹X L"

**Reuse for:** services / pricing tier grids. The "feature card" pattern works anywhere you want to draw the eye to one option.

---

### 4.6 Case studies

Two-column grid with one tall featured card and stacked smaller cards. Each card:
- Top tag line: case number / year / category
- Big italic display headline
- Result chip ("+₹3.2 Cr revenue")
- "Read case →" link

The featured card has a monogram letter (single big italic Plus Jakarta `<em>`) as visual anchor.

**Reuse for:** portfolio, testimonial wall, success stories.

---

### 4.7 Process (numbered steps with split cards)

```html
<ol class="process">
  <li class="split-card"> 01 / Mint workshop … </li>
  <li class="split-card"> 02 / Architecture … </li>
  …
</ol>
```

Each `.split-card` is a 2-column grid: left column is the step number (huge display), right column is title + bullet list. Border-bottom on each step gives the timeline feel.

**Reuse for:** onboarding flows, methodology pages, "how it works" sections.

---

### 4.8 Studio / leadership

Photo grid of leaders. Each `.leader` card has:
- A square `.leader-photo` with monogram letter (no actual photo needed — the monogram IS the photo, generated from initials)
- Name + role
- Two tags (specialty, prior employer)

The monogram fallback is great for early-stage studios that don't have professional headshots yet.

**Reuse for:** team pages, advisor lists, podcast guest grids.

---

### 4.9 Testimonial blockquote

Single oversized blockquote with quote-mark glyph, attributed to founder + company. Editorial display weight.

```css
.quote blockquote {
  font-family: var(--serif);
  font-size: clamp(24px, 3vw, 38px);
  font-weight: 500;
  line-height: 1.25;
  text-wrap: balance;
}
.quote blockquote::before { content: "“"; color: var(--mint-3); }
```

`text-wrap: balance` is the unsung hero — it makes multi-line quotes break at natural pause points.

**Reuse for:** any testimonial. One excellent quote beats five mediocre ones.

---

### 4.10 FAQ (`<details>` accordion)

Native HTML `<details><summary>` — no JS. Custom-styled with a `+/−` indicator that flips via `[open]` attribute selector.

```css
.faq summary::after { content: "+"; transition: transform 0.2s; }
.faq details[open] summary::after { content: "−"; }
```

**Reuse for:** any FAQ. Native disclosure widget is accessible by default.

---

### 4.11 "Brands We Have Built" — the dark interlude

This is its own design system, scoped via `<style>` with `--bm-*` tokens:

```css
.bm-clients {
  --bm-emerald:    #00c897;
  --bm-emerald-deep: #008f6b;
  --bm-gold:       #c9a14a;
  --bm-ink:        #0b1f1a;       /* matches .service--feature */
  --bm-ink-2:      #14352d;
  --bm-ink-deep:   #06140f;       /* for inner cards */
  --bm-cream:      #f5f1ea;
  background: linear-gradient(160deg, #0b1f1a 0%, #14352d 100%);
}
```

Three components inside it:
1. **Featured cards** — 3-up grid, deep-ink card with emerald number, italic gold monogram, quote, KPI meta row, hover-reveal arrow
2. **Roster grid** — 4×N grid of name + category tiles, all on `--bm-ink-deep`
3. **CTA strip** — bottom band with a single emerald pill button

Why scoped? Because dark blocks need their own color logic (lines, mist, hover states) that would conflict with the global tokens. Scoping keeps the rest of the site clean.

**Reuse for:** any "interlude" block — dark testimonials, pricing, before-and-after. Just rename `--bm-*` to your prefix.

---

### 4.12 CTA strip ("Start a project")

Full-width banner with:
- Display headline left
- Two CTAs right
- Mint accent border-top, paper background

Last touchpoint before the form. One job: get the click.

---

### 4.13 Contact form

Two-column form with floating labels:
- Name, email, company, role
- Project type (4-up radio chips)
- Budget (4-up radio chips with INR bands)
- Message textarea
- Submit + reassurance microcopy

Floating-label CSS uses `:placeholder-shown` + sibling selector — no JS:

```css
.field input:not(:placeholder-shown) + label,
.field input:focus + label { transform: translateY(-22px) scale(0.85); }
```

Posts to Formspree. Falls back to `mailto:` if `noscript`.

**Reuse for:** any lead form. The radio-chip pattern is great when you want segmentation data without intimidating the user with a dropdown.

---

### 4.14 Footer

Three-column: identity / sitemap / contact + legal. Wordmark in display, links in body, fine print in mono.

---

## 5. The "polish layer" — what makes this look premium

The components above are 80% of the value. The remaining 20% is polish. These are the small details that separate a "good" site from a "premium" one:

1. **`text-wrap: balance`** on every multi-line headline and blockquote. Prevents orphan words.
2. **Letter-spacing tightening** at large sizes (-0.025em to -0.04em). Sans display fonts always look better with tighter tracking when scaled up.
3. **Italic emphasis** via `<em>` inside H1/H2. Adds rhythm without color noise.
4. **Gradient text fills** — used sparingly, twice on the page (`<span class="grad">` in hero, `.impact-num`). Adds dimensionality.
5. **Monogram fallbacks** for photos — turn missing assets into a design feature.
6. **One full-bleed dark interlude** — breaks up cream-paper monotony. Gives the eye somewhere to rest.
7. **`<details>` for FAQ** — native, accessible, no JS, custom-styled with `[open]` selector.
8. **Compact vertical rhythm** — every section uses `clamp(56px, 7vw, 96px)` padding. Page reads in 1-2 viewports on a laptop instead of 4.
9. **One single CTA color** (mint-3) used for every primary button. Anything else as ghost/outline. Predictable click targets.
10. **JetBrains Mono on numbers** — instantly signals "engineered" vs "marketing fluff".

---

## 6. How to recombine for a new project

Suggested 60-minute starting workflow:

1. **Copy `:root` tokens** from `styles.css`. Adjust palette only — keep the type and sizing.
2. **Pick 5-7 components** from the catalog above. Recommended starter set: Hero (4.2) + Services (4.5) + Case studies (4.6) + Testimonial (4.9) + FAQ (4.10) + CTA strip (4.12) + Contact (4.13).
3. **Drop in the polish layer** (section 5) — these are global rules, not per-component.
4. **Swap copy + palette** to new brand. Don't touch sizes/spacing.
5. **Build the OG image last** — copy `og-image.svg`, change two text nodes, re-render to PNG.

---

## 7. File structure

```
/
├── index.html              # All markup. Scoped <style> for the dark interlude only.
├── styles.css              # Global tokens + component CSS for everything except .bm-clients
├── og-image.svg            # Source for the social card
├── og-image.png            # 1200x630 PNG rendered from the SVG
├── favicon.svg
└── BUILD-PLAYBOOK.md       # This file
```

Single-file site. No build step. Vercel serves it directly. Total weight under 60KB on first paint.

---

## 8. What to keep / what to swap per project

**Keep:** the `:root` token structure, the `--display` calibration block, the section / section-head primitives, `text-wrap: balance` everywhere, the OG SVG approach.

**Swap per project:** color tokens, copy, the hero card visual, section composition (pick which of the 14 components you need), the dark interlude palette.

**Never skip:** mobile testing. The hero `clamp()` sizes and the services grid are the two places that break first if you don't `@media (max-width: 720px)` test them.
