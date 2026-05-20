# Brand Mint — "Compound" — 12s Reel script

*Hook-led, proof-stacked, single CTA. Built for Meta Reels / Stories /
LinkedIn / X. Vertical 1080×1920. Original audio (Meta Reels policy bans
licensed music — synthesised pad ships in the cut; swap for a licensed
track only on YouTube/site placements.)*

---

## Concept

> **The number is the story.** We open on the receipt and back-fill the
> context. No setup, no "we are an agency that…" — the proof lands first,
> then a beat of restraint, then the ask.

This is the "Stripe trailer" structure: a single quantitative claim,
a beat for the viewer to register it, a tension-release counter-line,
and a CTA that breathes.

## Voice tokens this script obeys

- One italic emphasis word per headline (signature pattern)
- Every quantitative claim in JetBrains Mono (`+₹42.6 Cr`, `3.4×`, `61%`)
- Senior · Specific · Indian — Hyderabad-grounded, INR-priced
- Blacklist enforced (no *innovative*, *seamless*, *scalable*, *synergy*…)
- 9th-grade reading level
- ≤ 56 characters per line

## Timing

12.0 s total, 30 fps, 360 frames. Anchored to a 4-beat structure of
~3 s each (1 stat ⇒ 1 proof ⇒ 1 tension ⇒ 1 CTA). Beat lengths are
deliberately uneven for "human" pacing — not metronomic.

| Beat | In   | Out  | Length | On screen                                              | Audio                          |
|------|------|------|--------|--------------------------------------------------------|--------------------------------|
| 1    | 0.00 | 1.40 | 1.40   | `+₹42.6 Cr`  (digits count up 0 → 42.6 in 0.7s)        | Sub-bass enters, soft impact   |
| 2    | 1.40 | 3.20 | 1.80   | *in tracked revenue.* / across eleven founder-led brands. | Drone holds, soft pad swells |
| 3    | 3.20 | 4.60 | 1.40   | `3.4×` bookings.                                       | Whoosh + staccato pluck        |
| 4    | 4.60 | 6.00 | 1.40   | `61%` lower CPL.                                       | Whoosh + staccato pluck        |
| 5    | 6.00 | 8.20 | 2.20   | Most agencies leave a logo. / We leave *compounding revenue.* | Drone modulates, riser     |
| 6    | 8.20 | 10.60| 2.40   | Brand Mint. / `Mint your next quarter →`               | Cymbal swell, drone resolves   |
| 7    |10.60 |12.00 | 1.40   | Monogram glow + `brandmint.studio`                     | Final low note, fade out       |

## Copy (all on-screen text, frame-accurate)

### Beat 1 — HOOK (0.0–1.4s)

```
+₹42.6 Cr
```

*Set in JetBrains Mono ~220pt, Mint #10B981, soft 14px Gaussian glow.
Number counts up from `+₹0.0 Cr` to `+₹42.6 Cr` in 0.7s using an ease-out
curve, then holds for 0.7s.*

### Beat 2 — CONTEXT (1.4–3.2s)

Hero number scales down to 60% and slides up to the top third. Two
context lines fade up underneath with a 200ms stagger:

```
in tracked revenue.
across eleven founder-led brands.
```

*Plus Jakarta Sans 500 italic on the first line (italic emphasis on
"tracked"), Inter 400 on the second. Cream `#F5F1EA`.*

### Beat 3 — PROOF 1 (3.2–4.6s)

Whip-pan transition (240ms motion blur right → left), background
shifts to BM Ink gradient `#0B1F1A → #14352D`:

```
3.4× bookings.
```

*Number left-aligned at 340pt JetBrains Mono Mint. The word "bookings."
beside it in Plus Jakarta 500 cream 92pt. Italic emphasis on "bookings".*

### Beat 4 — PROOF 2 (4.6–6.0s)

Vertical whip (200ms motion blur top → bottom):

```
61% lower CPL.
```

*Same composition rule. Number left at 340pt mint mono. "lower CPL." at
92pt cream display.*

### Beat 5 — TENSION → PROMISE (6.0–8.2s)

Fade through black for 300ms. Pure black ground. First line fades up
slowly (700ms):

```
Most agencies leave you with a logo.
```

*1.2s hold.* Then a mint bar wipes across the frame right → left, and
behind it appears:

```
We leave you with compounding revenue.
```

*Italic emphasis on "compounding". Mint `#10B981` colour on that word
only — the rest cream.*

### Beat 6 — CTA (8.2–10.6s)

Mint radial glow swells from center. The monogram fades in scaling
0.85 → 1.00 with overshoot (250ms). Wordmark types in below:

```
Brand Mint.
```

After a 300ms breath, the CTA pill slides up from the lower third with
a subtle pulse glow loop (0.3 Hz):

```
Mint your next quarter →
```

*Pill is Mint `#10B981`, cream label, 96pt Plus Jakarta Sans 600.*

### Beat 7 — LOGO STAMP + URL (10.6–12.0s)

CTA pill stays. Below it, the URL types in monospace:

```
brandmint.studio
```

*JetBrains Mono 32pt, mint, 0.06em tracking, blinking cursor for the
last 200ms then fade out together with the rest of the frame.*

---

## Voiceover

**None.** Original audio bed only (synthesised pad — see
`brand-kit/video/v3-hollywood/build_hollywood.py`). 85% of vertical-video
viewing is muted on mobile; a VO would only land in 15% of plays and
double the production cost.

**Captions are the on-screen text** — no separate caption track needed.
For accessibility, an `.srt` track can be exported alongside; copy is
identical to the on-screen text above.

---

## Why this script will convert (Meta Reels conversion framework)

Meta's own [Reels ads best-practices](https://help.instagram.com/546362593027755)
prescribes: *vertical, original or royalty-free audio, no licensed music,
no watermarks, no GIFs.* This script obeys all five.

Beyond compliance, the structure is engineered for Reels-specific drop
patterns:

| Decision Meta's algorithm makes | When | What this cut does |
|---|---|---|
| Is this watchable? *(3-sec hold)* | 0–3s | Beat 1 + Beat 2 land the proof and context inside the 3-sec window. Hook rate target: **≥ 30%** (3-sec views ÷ impressions). |
| Should I keep showing this? *(hold rate)* | 6–9s | The tension-release at Beat 5 ("most agencies leave a logo… we leave compounding revenue") is the swing — the most memorable line lands at the 80% mark of the cut, which is statistically the highest-retention slot. Hold rate target: **≥ 10%** (15-sec views ÷ impressions). |
| Did this convert? *(CTR)* | 10–12s | Single visible CTA, single brand mark, single URL. No competing actions. Target CTR for cold Reels in the India services niche: **≥ 1.4%**. |

### Hook variants to A/B test on this same cut

Beat 1 is the highest-leverage swing. Hold the rest of the video
identical and rotate the opening 1.4-second card across these four
hooks. Run ₹500/day per cell for 7 days.

| Cell | Hook copy on Beat 1                       | Hypothesis                                              |
|------|-------------------------------------------|---------------------------------------------------------|
| A    | `+₹42.6 Cr`  *(this cut — control)*       | Stat-first; aspirational; broad pull                    |
| B    | `Eleven days.`                             | Curiosity-first; "eleven what?" forces hold             |
| C    | `Your last agency lied.`                   | Antagonist-first; high stop rate, higher unsubscribe risk |
| D    | `Booking Q3 2026 →`                        | Scarcity-first; pre-qualified clicks; lower volume      |

Predicted winner: **A** for cost-per-lead; **C** for raw CTR; **D** for
qualified-lead conversion. Run all four — the winner is account-specific.

### CTA variants to A/B test

Hold the cut identical for the first 8.2 s, swap only Beat 6's pill copy.

| Cell | CTA pill                          | Bias                          |
|------|-----------------------------------|-------------------------------|
| 1    | `Mint your next quarter →`        | Brand-voice (current cut)     |
| 2    | `Book a 20-min call →`            | Friction-low                  |
| 3    | `See the build →`                  | Curiosity; routes to case page |

Predicted winner for cold traffic: **Cell 2**; for warm traffic: **Cell 1**.

---

## Reference frames (Canva-generated)

`generate-design` returned four cinematic 9:16 reference candidates
against this brief. Browse them in Canva to pick a still-frame layout:

- <https://www.canva.com/d/8AbYpoVDaUYb2PP>
- <https://www.canva.com/d/_GNhYNpNOuR_Zk1>
- <https://www.canva.com/d/ZUrDYaJS8_WN64u>
- <https://www.canva.com/d/Q2h-LE8JU2HAJCi>

These were generated from Canva's premium template library matched to
the brand tokens above. Use whichever feels closest to the Stripe x Mubi
direction; the cut's own frames stay deterministic (built from
`build_hollywood.py`).
