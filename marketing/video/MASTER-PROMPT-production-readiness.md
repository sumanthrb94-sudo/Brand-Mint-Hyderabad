# Brand Mint — Master Video Prompt
### Netflix-style 10-second documentary / UGC ad · "Production Readiness"

> **How to use in Gemini Omni / Veo:**
> 1. Attach your **saved avatar** as the *character / identity reference* (face-lock ON, likeness 100%).
> 2. Paste the **MASTER PROMPT** below into the prompt field.
> 3. Set duration **10s**, resolution **4K / 2160p**, frame rate **24fps** (cinematic), aspect ratio **16:9** (master) — re-render **9:16** and **1:1** with the vertical/square variants in §7.
> 4. Add the **brand overlays** in §5 in post (or via Omni text layers) — keep AI-burned text minimal so logos stay crisp.

---

## 1 · MASTER PROMPT (paste this)

```
Netflix-style documentary cinematography, photoreal, ultra-HD. A confident
founder-presenter [USE ATTACHED AVATAR — exact likeness, face-locked] stands in
a minimal premium design studio in HITEC City, Hyderabad. Cinematic 10-second
single-subject hero shot for a creative studio brand film.

SUBJECT & SKIN: hyper-realistic skin with natural texture, visible pores, subtle
subsurface scattering, no plastic smoothing, no beauty filter. Natural micro-
expressions, calm authoritative gaze, a slight knowing half-smile. Wardrobe:
tailored charcoal or off-white minimalist outfit, no loud logos. 4K crispness on
the eyes and skin, tack-sharp focus on the face.

ENVIRONMENT: dark, moody, editorial studio — deep emerald-ink walls (#0B1F1A),
warm cream accents (#F5F1EA). Out-of-focus monitors in the background showing
soft mint-green dashboards and a tilted website mockup (bokeh, not readable).
Subtle volumetric haze. A single brand-mint gradient light glow behind subject.

CAMERA: cinema prime lens 35mm, shallow depth of field (T1.8), slow controlled
push-in dolly toward the subject over the full 10 seconds, almost imperceptible
parallax. Locked, gimbal-smooth, no shake. Rack focus settles on the eyes by
second 2. Shot on ARRI Alexa look, 4K, 24fps, 2.39 cinematic latitude.

LIGHTING: three-point cinematic. Soft key from camera-left at 5600K through a
large diffusion silk, gentle falloff. Low warm fill camera-right (3200K, cream
bounce). Crisp emerald-mint RIM/kicker light (#10B981) separating hair and
shoulder from the dark background. One practical mint glow behind subject as a
hero accent. High-contrast, low-key, premium Netflix-doc mood. Catchlights
visible in both eyes.

COLOR GRADE: Netflix documentary LUT — teal-emerald shadows, warm cream
highlights, rich blacks, filmic contrast, fine 35mm grain, no crushed detail.
Cohesive with brand palette: mint #10B981 / #7CF6C8, ink #0A0E0C, paper #F5F1EA,
one gold #C9A14A editorial accent only.

MOTION/BEATS (10s): 0–2s subject in profile, head turns to camera as rack focus
lands; 2–6s slow push-in, subject delivers a calm line to camera; 6–8.5s
micro-nod, confident beat; 8.5–10s settles into a held hero frame leaving clean
negative space upper-left for the logo lock-up.

MOOD: premium, senior, founder-to-founder, "production-ready," quietly powerful.
Cinematic, aspirational, not salesy.
```

**Negative prompt:**
```
plastic skin, waxy face, over-smoothed, beauty filter, AI shine, extra fingers,
warped hands, distorted face, text artifacts, gibberish letters, watermark,
logo distortion, oversaturated, HDR halos, lens dirt, motion blur on face,
jitter, low-res, cartoon, 3D render look, stock-photo smile, busy background.
```

---

## 2 · The spoken line (optional VO / lip-sync)

Pick one (founder-to-founder voice, one italic emphasis):

- *"We don't hand you files. We hand you brands that **compound**."*
- *"Production-ready, from first frame to final **pixel**."*
- *"Built in Hyderabad. Made to **ship**."*

Tone: calm, low, deliberate. Indian-English, warm. ~2.5 seconds, lands by 6s.

---

## 3 · Brand Identity Kit (bake into the film)

| Token | Hex | Role in the film |
|---|---|---|
| **Mint 3** | `#10B981` | Primary brand colour — rim light, logo, CTA, lower-third underline |
| Mint 2 | `#7CF6C8` | Gradient highlight, glow accents |
| Mint 1 | `#D6F5E6` | Soft tint washes |
| Mint 4 | `#047857` | Deep accent / hover |
| Ink | `#0A0E0C` | Text on light, deep surfaces |
| BM Ink | `#0B1F1A` | Studio walls / dark interlude base |
| Paper | `#F5F1EA` | Cream text + end-card background |
| Gold | `#C9A14A` | ONE editorial accent only (serial numbers, fine rule) — never beside mint at equal weight |

**Type stack** (use for ALL on-screen text):
- **Display / titles:** `Plus Jakarta Sans` — 600/700, tracking −0.02em
- **Body / lower-thirds:** `Inter` — 400/600
- **Numerals, timecodes, @handle, IDs:** `JetBrains Mono` — 500, tracking 0.06em
- Signature move: italicise **one** word per headline. Never centre body copy.

---

## 4 · Logo placement rules

- **Lock-up:** mark + wordmark "Brand Mint" + city tag "— Hyderabad".
- **Mark:** mint-gradient circle with the single-stroke **M** (doubles as a rising graph line).
- **On dark footage** → use `brand-mint-primary-dark.svg` (cream wordmark). **On light/cream end card** → `brand-mint-primary.svg`.
- **Clear space:** keep margin = height of the **M-stroke** on all sides. Nothing touches it.
- **Min size on screen:** primary lock-up ≥ 120px wide @1080p (≥ 240px @4K). Monogram for the corner bug ≥ 64px.
- **Corner bug:** static `brand-mint-monogram.svg` bottom-right, 40–60% opacity, from 0:02 onward.
- **DON'T:** recolour the gradient (use a mono variant), stretch, skew, rotate, outline, drop-shadow, or place the mark on busy footage without a translucent backdrop.

---

## 5 · On-screen text & motion graphics (add in post)

**0:02 — Lower-third** (fade in, bottom-left, safe-area inset):
```
BRAND MINT                      ← Plus Jakarta Sans 600, paper #F5F1EA
Digital studio · HITEC City, Hyderabad   ← Inter 400, 70% opacity
```
with a 4px mint `#10B981` underline that wipes in left→right (0.4s).

**0:06 — Kinetic headline** (upper-left negative space):
```
We mint brands that *compound*.   ← "compound" italic + mint #10B981
```

**8.5–10s — End card / logo lock-up** (cut or cross-dissolve to a Paper `#F5F1EA` card):
```
[ brand-mint-primary.svg centred ]
brandmint.studio        ← JetBrains Mono 500, ink, mint underline on URL only
Booking Q3 2026 · INR-priced
```
Gold `#C9A14A` thin rule above the city tag. Corner monogram bug stays.

**Safe areas:** keep all text within 90% title-safe. Lower-third sits above the bottom 12%. For 9:16, stack text centre and lift the lock-up to the upper third.

---

## 6 · Format & delivery specs

| | Master | Vertical (Reels/Shorts) | Square (feed) |
|---|---|---|---|
| Aspect | 16:9 | 9:16 | 1:1 |
| Resolution | 3840×2160 (4K) | 2160×3840 | 2160×2160 |
| FPS | 24 | 24/30 | 24 |
| Duration | 10s | 10s | 10s |
| Codec | H.264/H.265, ≥ 40 Mbps | same | same |
| Audio | 48kHz stereo, −14 LUFS | same | same |

---

## 7 · Aspect-ratio prompt tweaks

- **9:16 (Reels/Shorts):** append → `vertical 9:16 composition, subject centred, head-room at top, extra negative space lower third for stacked captions, push-in tighter.`
- **1:1 (feed):** append → `square 1:1 composition, centred medium close-up, symmetrical negative space, logo bug top-right.`

---

## 8 · Documentary / UGC reference note

Your uploaded `gemini_generated_video` is the **style reference** for pacing and avatar likeness. In Omni: attach the avatar as character ref, attach the reference clip as **style/motion reference**, then run the MASTER PROMPT. Keep cuts minimal — this is a single hero shot, not a montage. The full visual identity (logos, swatches, type, placement) is in the accompanying **`brand-mint-identity-kit.pdf`**.
