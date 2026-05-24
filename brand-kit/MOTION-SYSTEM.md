# Brand Mint — Motion System v1.0

*The adaptive design system for everything that moves: ads, Reels,
case-study films, product walkthroughs, landing-page hero loops. This
sits alongside `BRAND-GUIDELINES.md` (the still-image kit) and extends
it into time.*

> One thing every Brand Mint cut shares: a number, a moment of
> restraint, and a single decision the viewer can make at the end.

---

## 1 · Format matrix

The system targets four contexts. Aspect ratio + length + soundscape
shift, but tokens never do.

| Context           | Ratio | Length     | Sound       | Primary use            |
|-------------------|-------|------------|-------------|------------------------|
| **Reel / Story / TikTok** | 9:16  | 6–15 s     | Original synth pad (Meta-policy safe). No licensed music. | Paid + organic social on IG, FB, LinkedIn vertical, TikTok |
| **Site hero loop**| 16:9 or 1:1 | 6–12 s loop, silent | Silent (autoplay-muted by browser) | brandmintstudios.in above-the-fold |
| **Case-study film** | 16:9  | 60–120 s   | Licensed track OK (YouTube/Vimeo/site) + restrained VO  | Long-form proof; sales follow-up |
| **OG / link preview** | 1.91:1 still | n/a — single still card | n/a | Slack, WhatsApp, iMessage previews |

The two existing cuts in `brand-kit/video/` (`brand-mint-reel.mp4` 9:16
15s, `brand-mint-cinematic.mp4` 9:16 28s) are previous-version Reel
cuts. The v3 12s cut (`brand-kit/video/v3-hollywood/`) is the
production reference for the **Reel** context.

## 2 · The Four Acts (story arc)

Every Brand Mint cut, regardless of length, contains these four acts.
The ratio shifts with length; the order never does.

| Act       | What it does                              | Reel (12s) | Case film (90s) |
|-----------|-------------------------------------------|------------|------------------|
| **Hook**  | A single number that promises the proof.  | 0–1.4s     | 0–4s             |
| **Proof** | Two staccato stats stacked.               | 1.4–6s     | 4–35s            |
| **Tension/Promise** | The counter-line that turns "another agency" into "this agency". | 6–8.2s | 35–60s |
| **CTA**   | One ask. One mark. One URL. Nothing else. | 8.2–12s    | 60–90s           |

The Reel compresses Acts 1–2 into 6 seconds because the Meta algorithm
makes its first hold-vs-drop decision at 3 s. The case film breathes.

## 3 · Approved transition library

Use **only** these. Each is named for the editing decision it expresses.

| Token            | When to use                                | FFmpeg recipe |
|------------------|--------------------------------------------|----------------|
| `cut`            | Inside a single act, between proof beats   | `xfade=transition=fade:duration=0.08` (8-frame cross) |
| `whip-h`         | Between two equivalent proofs              | `xfade=transition=slideleft:duration=0.24` + tblend motion-blur |
| `whip-v`         | Vertical sibling of `whip-h` — alternate to avoid monotony | `xfade=transition=slideup:duration=0.20` |
| `fade-black`     | Between acts (proof → tension)             | `xfade=transition=fadeblack:duration=0.30` |
| `wipe-mint`      | Inside the Tension act — mint bar paints over the negative line with the positive | Custom: 3px mint rect with `geq` width animation |
| `crossfade`      | Settling into the CTA act                  | `xfade=transition=fade:duration=0.40` |
| `iris-out`       | End-of-film stamp (logo close)             | `xfade=transition=circleclose:duration=0.40` |

Banned: any "creative" template transition — page-curl, cube-spin,
star-wipe, glitch-pixelize. They scream "free template" instantly.

## 4 · Approved camera moves

| Token         | Description                                   | Use case                                  |
|---------------|-----------------------------------------------|-------------------------------------------|
| `push-in`     | 1.00 → 1.04 scale over shot, ease-out         | Stat reveals; opening hook                 |
| `pull-back`   | 1.04 → 1.00 scale over shot                   | Reaction beats; "let it breathe"           |
| `breathe`     | `z = 1.00 + 0.03 * sin(t/0.78)` — barely visible | CTA shots; logo stamp                   |
| `settle`      | Hold static after a transition for ≥ 600ms    | Tension act; the line that needs to land   |

Banned: handheld shake (we are not a vlogger), rotating zooms,
parallax pretending to be a depth photo.

## 5 · Approved text animations

| Token                | What                                             | Timing                        |
|----------------------|--------------------------------------------------|--------------------------------|
| `count-up`           | Number tweens from 0 to value (JetBrains Mono)   | 700ms, ease-out cubic         |
| `fade-up`            | `opacity 0→1` + `y +20→0`                        | 400ms, ease-out               |
| `stagger-fade-up`    | Lines `fade-up` one after another                | 200ms inter-line               |
| `typewriter`         | Character-by-character reveal                    | 25–30ms per char              |
| `wipe-mask`          | Mint bar wipes across, text appears in its wake  | 300ms total                   |
| `scale-overshoot`    | `0.85 → 1.05 → 1.00`, cubic-bezier(0.34, 1.56, 0.64, 1) — the "Apple" bounce | 250ms |

Banned: typewriter without sound (creepy), bounce on body copy, any
text-on-path effect.

## 6 · Sound design

**Reels & Stories — original audio only (Meta policy).** All cuts ship
with the same synthesised pad recipe:

```
Sub-bass:   sine 55 Hz   (drone bed)
Low-mid:    sine 82.4 Hz (E2, perfect fourth above bass)
Mid:        sine 110 Hz  (A2, perfect fifth above)
Air:        anoisesrc color=brown amplitude=0.04  (broadband texture)
Mix:        amix:duration=longest, lowpass f=1800, afade in/out 2.5s
```

Hit layer (whip-pans + impact moments):

```
Impact:     sine 65 Hz with fade out 80ms (felt more than heard)
Pluck:      sine 880 Hz + sine 1320 Hz (perfect fifth), 40ms attack, 220ms release
Whoosh:     anoisesrc with bandpass 200-4000 Hz, sweep down via lowpass
```

**Case-study films & YouTube hosts** — licensed music allowed. House
playlist (royalty-free fallback): Pixabay → Ambient → "cinematic"
or "documentary corporate" tags. Approved BPM range: 70–95.

## 7 · Tokens reference (copied from `brand-kit/BRAND-GUIDELINES.md`)

Do not redefine. Always import from these.

```
PAPER       #F5F1EA
PAPER_DEEP  #E9E2D3
INK         #0A0E0C
WHITE       #FFFFFF
MUTED       rgba(10,14,12,0.62)
LINE        rgba(10,14,12,0.10)

MINT_1      #D6F5E6
MINT_2      #7CF6C8
MINT_3      #10B981   ← primary, every CTA, every emphasis
MINT_4      #047857

GOLD        #C9A14A    only for serial numbers, never with mint at the same scale

BM_INK      #0B1F1A
BM_INK_2    #14352D
BM_INK_DEEP #06140F
BM_EMERALD  #00C897
BM_CREAM    #F5F1EA

DISPLAY   "Plus Jakarta Sans", system-ui, sans-serif    weight 600
EDITORIAL "Plus Jakarta Sans"                          weight 500 italic
BODY      "Inter", system-ui, sans-serif                weight 400
NUMERALS  "JetBrains Mono", ui-monospace, monospace    weight 500
```

## 8 · Cinema bars (the optional "film tell")

A 3 px mint hairline at the top and bottom of the frame, with two
tiny labels: brand at bottom-left, URL at bottom-right. Use **only**
on cinematic cuts (Reels with the "story" tone) — never on product
demos or feature explainers, where they feel pretentious.

```
<rect x=0 y=0 width=W height=3 fill=#10B981 opacity=0.85/>
<rect x=0 y=H-3 width=W height=3 fill=#10B981 opacity=0.85/>
```

## 9 · Conversion levers (Meta Reels)

This is a checklist enforced before any cut ships as an ad.

- [ ] **Vertical 1080×1920**, fullscreen, no borders or letterboxing
      (cinema-bars don't count — they sit inside the live area).
- [ ] **Has audio.** Original or royalty-free only. **Never licensed.**
- [ ] **Hook lands ≤ 3 s.** First on-screen claim is a number or a
      promise verb.
- [ ] **Tension-release at ~80% mark.** The line that should be
      remembered lands at minute 9.6 of a 12 s cut (or second 72 of a
      90 s case film) — the algorithm's highest-retention slot.
- [ ] **Single CTA.** One button copy, one URL, one brand mark.
- [ ] **Captions baked in.** ~85% of plays are muted.
- [ ] **No banned vocabulary** anywhere in the cut.
- [ ] **One italic word per headline.** Signature pattern.

## 10 · A/B testing playbook (per cut)

Every paid-cut ships with **four hook variants** that share an
identical Acts 2–4. Test by swapping only the first 1.4 s.

| Variant axis | Test                                          | Stop rule |
|--------------|-----------------------------------------------|------------|
| Stat-first   | `+₹42.6 Cr` (control)                          | ≥ 50 conversions/cell |
| Curiosity    | `Eleven days.`                                 | … |
| Antagonist   | `Your last agency lied.`                       | high stop-rate ceiling — kill on negative sentiment |
| Scarcity     | `Booking Q3 2026 →`                            | reads CTR + LQS (lead quality score) |

Run ₹500/day per cell for 7 days minimum (Meta requires ~50
conversions for statistical confidence). Halt cells exceeding 2×
control's CPL after 30 conversions.

## 11 · Versioning

This is **v1.0** of the Motion System. Iterations append:

- 2026-05-20 — v1.0 — initial system, derived from the
  "Compound" 12 s Reel build.

## 12 · How future cuts adopt this

1. Read this doc and `BRAND-GUIDELINES.md`.
2. Copy `brand-kit/video/v3-hollywood/` as a starting scaffold.
3. Rewrite only `SCRIPT.md` and the per-shot calls inside the
   builder. **Do not** change tokens, transition library, or the Four
   Acts arc — those are the brand.
4. Ship a cut, then update §11 with a one-line changelog.

The kit gets better the more cuts inherit it.
