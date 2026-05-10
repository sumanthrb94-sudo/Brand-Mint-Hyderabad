# COMPONENTS — Copy-Paste Recipes

Companion to `BUILD-PLAYBOOK.md`. The playbook tells you **why** the site looks the way it does. This file gives you the **HTML + CSS** to reproduce each component in any future project.

Every component below is **independent** — copy the HTML, copy the CSS block, paste into a new project that has the design tokens (Section 0), and it works.

---

## 0. Tokens — paste FIRST in any new project

Before any component renders correctly, your `:root` needs these. Drop into `styles.css`:

```css
:root {
  /* Type */
  --display: "Plus Jakarta Sans", system-ui, sans-serif;
  --serif:   var(--display);
  --sans:    "Inter", system-ui, sans-serif;
  --mono:    "JetBrains Mono", ui-monospace, monospace;

  /* Palette */
  --ink:    #0a0e0c;
  --paper:  #f5f1ea;
  --white:  #ffffff;
  --muted:  rgba(10,14,12,0.62);
  --line:   rgba(10,14,12,0.10);
  --mint-1: #d6f5e6;
  --mint-2: #7cf6c8;
  --mint-3: #10b981;
  --mint-4: #047857;
  --gold:   #c9a14a;

  /* Sizing */
  --radius: 10px;
  --maxw:   1240px;
  --pad:    clamp(20px, 4vw, 56px);

  /* Elevation */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 12px 32px rgba(10,14,12,0.08);
  --shadow-lg: 0 32px 80px rgba(10,14,12,0.18);
}

* { box-sizing: border-box; }

body {
  background: var(--paper);
  color: var(--ink);
  font-family: var(--sans);
  font-size: 17px;
  line-height: 1.55;
  margin: 0;
}

/* The display-weight calibration — keeps headlines at the right
   visual weight when using a sans display font like Plus Jakarta */
.hero-title, .section-head h2, .impact-num, .service h3,
.case-body h3, .process h3, .leader h3, .cta-text h2,
.metrics dd, .hero-meta strong {
  font-weight: 600;
}
.quote blockquote, .featured-monogram { font-weight: 500; }
```

Don't forget the Google Fonts link in `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link
  href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
  rel="stylesheet">
```

---

## 1. Section + Section-head primitives

Wrap every page section in this. Gives consistent rhythm everywhere.

### HTML

```html
<section class="section" id="services">
  <header class="section-head">
    <span class="eyebrow">● Services · pick what matches the problem</span>
    <h2>What we build</h2>
    <p class="lede">
      Sites, internal tools, brand systems, AI integrations.
      Senior-only delivery, INR-priced.
    </p>
  </header>

  <!-- section content goes here -->
</section>
```

### CSS

```css
.section {
  max-width: var(--maxw);
  margin: 0 auto;
  padding: clamp(56px, 7vw, 96px) var(--pad);
}
.section-head {
  max-width: 760px;
  margin-bottom: clamp(28px, 3.5vw, 48px);
}
.section-head h2 {
  font-family: var(--display);
  font-size: clamp(28px, 4vw, 48px);
  line-height: 1.06;
  letter-spacing: -0.02em;
  margin: 0 0 14px;
}
.lede {
  font-size: clamp(16px, 1.3vw, 19px);
  color: var(--muted);
  margin: 0;
  text-wrap: balance;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink);
  background: rgba(16,185,129,0.08);
  padding: 6px 12px;
  border-radius: 999px;
  margin-bottom: 14px;
}
```

---

## 2. Hero (asymmetric grid)

Two-column hero: text + visual. Adjust the visual to your project.

### HTML

```html
<section class="hero">
  <div class="hero-text">
    <span class="eyebrow">● Built in [City] · Now booking [Quarter Year]</span>
    <h1 class="hero-title">
      We mint <em>brands</em><br>
      that <span class="grad">compound.</span>
    </h1>
    <p class="hero-sub">
      Custom websites and internal tools, engineered for founders who'd
      rather ship than slide-deck.
    </p>
    <div class="hero-cta">
      <a href="#contact" class="btn btn-primary">Start a project →</a>
      <a href="#work" class="btn btn-ghost">See the work</a>
    </div>
    <dl class="hero-meta">
      <div><dt>Engagements / yr</dt><dd><strong>40+</strong></dd></div>
      <div><dt>Avg ship time</dt><dd><strong>5 wks</strong></dd></div>
      <div><dt>Revenue tracked</dt><dd><strong>₹42 Cr+</strong></dd></div>
      <div><dt>Studio</dt><dd><strong>HITEC City</strong></dd></div>
    </dl>
  </div>

  <aside class="hero-card">
    <!-- product mockup, dashboard screenshot, anything visual -->
  </aside>
</section>
```

### CSS

```css
.hero {
  max-width: var(--maxw);
  margin: 0 auto;
  padding: clamp(28px, 4vw, 56px) var(--pad) clamp(24px, 3.5vw, 48px);
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: clamp(28px, 4vw, 56px);
  align-items: center;
}

.hero-title {
  font-family: var(--display);
  font-size: clamp(38px, 5.2vw, 72px);
  line-height: 1.02;
  letter-spacing: -0.03em;
  margin: 16px 0 14px;
  text-wrap: balance;
}
.hero-title em {
  font-style: italic;
}
.hero-title .grad {
  background: linear-gradient(90deg, var(--mint-3), var(--mint-4));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-style: italic;
}

.hero-sub {
  font-size: clamp(15px, 1.3vw, 18px);
  color: var(--muted);
  max-width: 56ch;
  margin: 0 0 22px;
}

.hero-cta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.hero-meta {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid var(--line);
}
.hero-meta dt {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.hero-meta dd {
  margin: 4px 0 0;
}
.hero-meta strong {
  font-family: var(--display);
  font-size: clamp(20px, 2vw, 28px);
}

@media (max-width: 880px) {
  .hero { grid-template-columns: 1fr; }
  .hero-meta { grid-template-columns: repeat(2, 1fr); gap: 16px; }
}
```

---

## 3. Buttons (primary + ghost)

```html
<a href="#" class="btn btn-primary">Start a project →</a>
<a href="#" class="btn btn-ghost">See the work</a>
```

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 14px 22px;
  border-radius: var(--radius);
  font-family: var(--sans);
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  border: 1px solid transparent;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.2s, border-color 0.2s;
}
.btn:hover { transform: translateY(-1px); }
.btn:active { transform: translateY(0); }

.btn-primary {
  background: var(--mint-3);
  color: var(--white);
  border-color: var(--mint-3);
}
.btn-primary:hover { background: var(--mint-4); border-color: var(--mint-4); }

.btn-ghost {
  background: transparent;
  color: var(--ink);
  border-color: var(--line);
}
.btn-ghost:hover { border-color: var(--ink); background: rgba(10,14,12,0.03); }
```

---

## 4. Service card (default + feature variant)

```html
<div class="services">
  <article class="service">
    <div class="service-icon" aria-hidden="true">
      <!-- 28x28 SVG icon -->
    </div>
    <h3>Custom websites</h3>
    <p>Marketing sites, e-commerce, editorial platforms — designed from scratch.</p>
    <ul class="chips">
      <li>Next.js / Astro</li>
      <li>Headless CMS</li>
      <li>Lighthouse 95+</li>
    </ul>
    <span class="service-price">From <strong>₹2 L</strong></span>
  </article>

  <article class="service service--feature">
    <!-- same shape, dark gradient background -->
  </article>
</div>
```

```css
.services {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
@media (max-width: 880px) {
  .services { grid-template-columns: 1fr; }
}

.service {
  background: var(--white);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: transform 0.25s, border-color 0.25s, box-shadow 0.25s;
}
.service:hover {
  transform: translateY(-3px);
  border-color: rgba(16,185,129,0.4);
  box-shadow: var(--shadow-md);
}
.service-icon {
  width: 48px; height: 48px;
  border-radius: var(--radius);
  background: var(--mint-1);
  display: grid;
  place-items: center;
  color: var(--mint-4);
  border: 1px solid rgba(16,185,129,0.2);
}
.service h3 {
  font-family: var(--display);
  font-size: 22px;
  letter-spacing: -0.015em;
  margin: 4px 0 0;
}
.service p {
  color: var(--muted);
  margin: 0;
}
.chips {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0;
  margin: 8px 0 0;
}
.chips li {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--muted);
}
.service-price {
  margin-top: auto;
  padding-top: 12px;
  font-size: 13px;
  color: var(--muted);
  border-top: 1px solid var(--line);
}
.service-price strong {
  font-family: var(--display);
  font-size: 18px;
  color: var(--ink);
}

/* Feature variant */
.service--feature {
  background: linear-gradient(160deg, #0b1f1a 0%, #14352d 100%);
  color: var(--paper);
  border-color: transparent;
}
.service--feature .service-icon {
  background: rgba(124,246,200,0.15);
  color: var(--mint-2);
  border-color: rgba(124,246,200,0.2);
}
.service--feature p { color: rgba(214,245,230,0.75); }
.service--feature .chips li {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.12);
  color: rgba(214,245,230,0.9);
}
.service--feature .service-price strong { color: var(--paper); }
```

---

## 5. Impact strip (4 stat tiles, gradient numbers)

```html
<section class="impact">
  <header class="impact-head">
    <span class="eyebrow">● Impact</span>
    <h2>Numbers compound. So should your brand.</h2>
  </header>
  <ul class="impact-grid">
    <li><span class="impact-num">+₹42.6 Cr</span><span class="impact-label">Tracked revenue lift</span><span class="impact-ctx">across 11 founder-led brands</span></li>
    <li><span class="impact-num">28.4k</span><span class="impact-label">Sessions / month</span><span class="impact-ctx">organic + paid combined</span></li>
    <li><span class="impact-num">5 wks</span><span class="impact-label">Average ship time</span><span class="impact-ctx">kickoff to live URL</span></li>
    <li><span class="impact-num">9.4</span><span class="impact-label">Client NPS at handover</span><span class="impact-ctx">past 12 months</span></li>
  </ul>
</section>
```

```css
.impact {
  max-width: var(--maxw);
  margin: 0 auto;
  padding: clamp(40px, 5vw, 72px) var(--pad) clamp(28px, 3.5vw, 48px);
}
.impact-head h2 {
  font-family: var(--display);
  font-size: clamp(24px, 3.2vw, 36px);
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin: 12px 0 0;
}
.impact-grid {
  list-style: none;
  padding: 0; margin: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--line);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
}
@media (max-width: 880px) {
  .impact-grid { grid-template-columns: repeat(2, 1fr); }
}
.impact-grid li {
  background: var(--white);
  padding: clamp(22px, 2.5vw, 32px) clamp(18px, 2vw, 26px);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.impact-num {
  font-family: var(--display);
  font-size: clamp(38px, 5vw, 64px);
  line-height: 0.98;
  letter-spacing: -0.04em;
  background: linear-gradient(180deg, var(--ink) 0%, var(--mint-3) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.impact-label {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.impact-ctx { font-size: 13px; color: var(--muted); }
```

---

## 6. Testimonial blockquote (one quote, oversized)

```html
<section class="quote section">
  <blockquote>
    They shipped in six weeks what our last agency promised in six months.
  </blockquote>
  <cite>— Vikram, Founder · Acme SaaS</cite>
</section>
```

```css
.quote blockquote {
  font-family: var(--display);
  font-style: italic;
  font-size: clamp(24px, 3vw, 38px);
  line-height: 1.25;
  letter-spacing: -0.01em;
  margin: 0 0 16px;
  text-wrap: balance;
  position: relative;
  padding-left: 36px;
}
.quote blockquote::before {
  content: "“";
  position: absolute;
  left: 0; top: -10px;
  font-size: 60px;
  color: var(--mint-3);
  line-height: 1;
}
.quote cite {
  font-style: normal;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--muted);
}
```

---

## 7. FAQ accordion (zero JS, native `<details>`)

```html
<section class="faq section">
  <header class="section-head">
    <span class="eyebrow">● Frequently asked</span>
    <h2>Honest answers, no fluff.</h2>
  </header>
  <details>
    <summary>What does a typical engagement cost?</summary>
    <p>Sites from <strong>₹2 lakh</strong>. Tools from <strong>₹4 lakh</strong>. Retainers from <strong>₹75 K / month</strong>. Every quote is fixed-scope after the Mint workshop. GST extra.</p>
  </details>
  <details>
    <summary>Are you hiring? Can I refer someone?</summary>
    <p>Always — see <a href="/careers">brandmint.studio/careers</a>.</p>
  </details>
</section>
```

```css
.faq details {
  border-top: 1px solid var(--line);
  padding: 18px 0;
}
.faq details:last-child { border-bottom: 1px solid var(--line); }
.faq summary {
  font-family: var(--display);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.faq summary::-webkit-details-marker { display: none; }
.faq summary::after {
  content: "+";
  font-size: 22px;
  color: var(--mint-3);
  transition: transform 0.2s;
}
.faq details[open] summary::after { content: "−"; }
.faq details p {
  margin: 12px 0 0;
  color: var(--muted);
}
```

---

## 8. CTA strip (last call-to-action before form)

```html
<section class="cta">
  <div class="cta-text">
    <h2>Ready to <em>compound?</em></h2>
    <p>30-min discovery. INR-priced. No deck-ware.</p>
  </div>
  <div class="cta-actions">
    <a href="#contact" class="btn btn-primary">Start a project →</a>
    <a href="mailto:hello@brandmint.studio" class="btn btn-ghost">hello@brandmint.studio</a>
  </div>
</section>
```

```css
.cta {
  max-width: var(--maxw);
  margin: 0 auto;
  padding: clamp(36px, 5vw, 64px) var(--pad);
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 24px;
  align-items: center;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
.cta-text h2 {
  font-family: var(--display);
  font-size: clamp(28px, 4vw, 48px);
  letter-spacing: -0.02em;
  margin: 0 0 8px;
  text-wrap: balance;
}
.cta-text h2 em { font-style: italic; color: var(--mint-3); }
.cta-text p { color: var(--muted); margin: 0; }
.cta-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  flex-wrap: wrap;
}
@media (max-width: 720px) {
  .cta { grid-template-columns: 1fr; }
  .cta-actions { justify-content: flex-start; }
}
```

---

## 9. Dark interlude (the "Brands We Have Built" pattern)

A scoped dark section with its own palette. Use sparingly — once per page maximum. Token namespace `--bm-*` so it doesn't pollute global tokens.

```html
<section class="bm-clients">
  <h2 class="bm-clients__title">Brands we have built.</h2>
  <p class="bm-clients__lede">A small selection. Names recognisable.</p>
  <ul class="bm-clients__featured">
    <li class="bm-card"><!-- card body --></li>
    <li class="bm-card"><!-- card body --></li>
    <li class="bm-card"><!-- card body --></li>
  </ul>
</section>
```

```css
.bm-clients {
  --bm-emerald: #00c897;
  --bm-gold:    #c9a14a;
  --bm-ink:     #0b1f1a;       /* matches .service--feature */
  --bm-ink-2:   #14352d;
  --bm-ink-deep:#06140f;
  --bm-cream:   #f5f1ea;
  --bm-mist:    rgba(245,241,234,0.55);
  --bm-line:    rgba(245,241,234,0.08);

  background: linear-gradient(160deg, var(--bm-ink) 0%, var(--bm-ink-2) 100%);
  color: var(--bm-cream);
  padding: 72px 24px 88px;
}
.bm-clients__title {
  font-family: var(--display);
  font-weight: 600;
  font-size: clamp(30px, 4.4vw, 52px);
  letter-spacing: -0.02em;
  margin: 0 0 20px;
}
.bm-clients__lede { color: var(--bm-mist); margin: 0 0 48px; }
.bm-clients__featured {
  list-style: none; padding: 0; margin: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}
.bm-card {
  background: linear-gradient(165deg, var(--bm-ink-deep) 0%, #081913 100%);
  border: 1px solid var(--bm-line);
  border-radius: 4px;
  padding: 28px 24px;
}
```

---

## 10. Top nav (logo + links)

```html
<header class="nav">
  <a href="#top" class="logo">
    <svg class="logo-mark" width="32" height="32" viewBox="0 0 32 32">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#7CF6C8"/>
          <stop offset="100%" stop-color="#10B981"/>
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill="url(#lg)"/>
      <path d="M9 22V10l7 6 7-6v12" stroke="#0b1f1a" stroke-width="2.4"
            stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>
    <span class="logo-word">Brand Mint</span>
    <span class="logo-loc">— Hyderabad</span>
  </a>
  <nav class="nav-links">
    <a href="#services">Services</a>
    <a href="#work">Work</a>
    <a href="#process">Process</a>
    <a href="#studio">Studio</a>
    <a href="#contact" class="nav-cta">Start a project</a>
  </nav>
</header>
```

```css
.nav {
  max-width: var(--maxw);
  margin: 0 auto;
  padding: 16px var(--pad);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--ink);
}
.logo-word {
  font-family: var(--display);
  font-weight: 600;
  font-size: 19px;
  letter-spacing: -0.01em;
}
.logo-loc {
  font-style: italic;
  font-size: 14px;
  color: var(--muted);
}
.nav-links {
  display: flex;
  gap: 28px;
  align-items: center;
}
.nav-links a {
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  color: var(--ink);
}
.nav-links a:hover { color: var(--mint-4); }
.nav-cta {
  background: var(--mint-3);
  color: var(--white) !important;
  padding: 10px 18px;
  border-radius: 999px;
  font-weight: 600;
}
@media (max-width: 720px) {
  .nav-links a:not(.nav-cta) { display: none; }
}
```

---

## 11. Footer

```html
<footer class="footer">
  <div class="footer-grid">
    <div>
      <strong>Brand Mint</strong>
      <p>Studio in HITEC City, Hyderabad. INR-priced, IST hours.</p>
    </div>
    <div>
      <h4>Studio</h4>
      <a href="#services">Services</a>
      <a href="#work">Work</a>
      <a href="#process">Process</a>
    </div>
    <div>
      <h4>Contact</h4>
      <a href="mailto:hello@brandmint.studio">hello@brandmint.studio</a>
      <a href="tel:+919999999999">+91 ••••• •••••</a>
    </div>
  </div>
  <p class="footer-fine">© 2026 Brand Mint Studio Pvt Ltd · GSTIN 36XXXXX0000X1Z5</p>
</footer>
```

```css
.footer {
  max-width: var(--maxw);
  margin: 0 auto;
  padding: 60px var(--pad) 32px;
  border-top: 1px solid var(--line);
}
.footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 32px;
}
.footer h4 {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 0 0 12px;
}
.footer a {
  display: block;
  color: var(--ink);
  text-decoration: none;
  margin-bottom: 8px;
}
.footer-fine {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid var(--line);
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--muted);
}
@media (max-width: 720px) {
  .footer-grid { grid-template-columns: 1fr; }
}
```

---

## How to combine

A typical landing page uses these in this order:

1. **Top nav** (#10)
2. **Hero** (#2)
3. **Impact strip** (#5) — 1 row of credibility before content
4. **Services** (#4) — 3-up grid; one card uses `.service--feature`
5. **Quote** (#6) — single oversized testimonial
6. **Dark interlude** (#9) — case studies or "brands we built"
7. **FAQ** (#7) — handle objections before the form
8. **CTA strip** (#8)
9. **Footer** (#11)

Drop them in this sequence with `.section` wrappers and the page reads as a complete funnel. Add or remove components based on the project — none of them depend on the others.

## Mobile rule

Every component above has a `@media (max-width: 720px)` or `880px` breakpoint that collapses to single-column. Test at 375px width before claiming any component is done. Mobile is where craft slips first.
