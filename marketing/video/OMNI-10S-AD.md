# Brand Mint — 10-second Omni ad pack

**Generate clean plates. No text, no logo, no numerals in the render.**
Everything typographic is composited in post, because AI video garbles
letterforms and a garbled ₹ price in a paid ad is worse than no ad.

> ⚠️ Do **not** feed `brand-context-for-omni.md` to Omni with this. It predates
> the current business: it quotes ₹2 L–₹4 L floors (real floor is ₹14,999),
> the domain `brandmint.studio` (real is `brandmintstudios.in`), and a
> "five hundred crore influenced" figure that exists nowhere in this repo.
> Use section 5 below as the context block instead.

---

## 1 · The spot

Four beats, 2.5s each. A maker's product becomes a shipped order. No word is
spoken by the picture — the story is entirely visual, so post owns the message.

| t | Beat | What the camera does |
|---|---|---|
| 0.0–2.5 | **Hook** | Macro, shallow focus: two hands fold a kraft parcel closed on a warm cream worktop. Morning side-light, dust in the air. Small Indian studio-workshop, not an office. |
| 2.5–5.0 | **The turn** | Hands set a phone face-up beside the parcel. Screen is a soft out-of-focus mint glow — no UI, no text. Rack focus from parcel to glow. |
| 5.0–7.5 | **Scale** | Slow dolly back. One parcel has become nine, stacked and labelled-blank, ready to ship. Same light, same table. |
| 7.5–10.0 | **Landing** | Continue the pull into a slow rise; frame settles on deep ink-green negative space, upper two-thirds empty. **This is the composite plate.** |

The arc reads: *you make it → it goes online → orders come → here's who did it.*

---

## 2 · Paste-ready Omni prompt

```
A 10-second cinematic product advertisement, 9:16 vertical, shot on a 50mm
lens at T2.0, shallow depth of field, 24fps with natural motion blur.

SETTING: a small artisan workshop table in Hyderabad, India. Warm cream linen
surface, kraft-brown packaging, a few sprigs of dried botanicals. Soft morning
window light from camera left, gentle falloff, visible dust motes. Calm,
editorial, premium — not corporate, not stock.

SHOT 1 (0.0-2.5s): Extreme close-up, macro. Two hands with plain unpainted
nails fold and seal a kraft paper parcel. Fingers only, no faces. Slow,
deliberate movement. Focus on the crease of the fold.

SHOT 2 (2.5-5.0s): The hands place a smartphone face-up on the table beside
the parcel. The phone screen shows only a soft, defocused mint-green glow —
completely blank, no interface, no icons, no writing. Rack focus from the
parcel to the glow.

SHOT 3 (5.0-7.5s): Slow dolly back. Nine identical sealed parcels now sit
stacked in a neat grid on the same table, ready for dispatch. Same light,
same surface, unbranded plain packaging.

SHOT 4 (7.5-10.0s): The camera continues pulling back and rises slightly.
The frame settles into deep dark green-black negative space filling the upper
two thirds, with the parcels small and low in frame. Hold steady, static, for
the final second.

COLOR: mint green #10B981 as the only saturated accent, warm cream #F5F1EA
surfaces, deep ink green #0B1F1A shadows. Muted, filmic, low contrast in the
midtones.

MOTION: slow and controlled throughout. No whip pans, no snap zooms, no
speed ramps. One continuous calm push-pull.

CRITICAL NEGATIVE CONSTRAINTS — the render must contain absolutely NO text of
any kind: no words, no letters, no numbers, no logos, no watermarks, no
brand marks, no signage, no packaging labels, no screen interfaces, no
subtitles, no captions. Plain unmarked packaging only. No human faces. No
stock-photo smiles, no people pointing at laptops, no generic office. No
on-screen typography whatsoever.
```

**Settings:** 9:16 · 10s · 24fps · no audio (VO is added in post).
Also render a 1:1 and 16:9 pass from the same prompt for feed and in-stream.

---

## 3 · Post-production — what you composite on

Only real, substantiable claims. Every figure here traces to the repo.

| t | On-screen (Plus Jakarta Sans, mint on ink) | Source |
|---|---|---|
| 0.6–2.4 | Your product deserves a *real* store. | — |
| 3.0–5.2 | UPI · COD · GST invoices · WhatsApp | `index.html` meta description |
| 5.6–7.4 | From **₹49,999** *(JetBrains Mono for the numeral)* | `shared/services.js` → store.from |
| 7.8–10.0 | Logo lock-up + `brandmintstudios.in` | `brand-kit/logo/` |

Keep total text coverage under ~20% of frame or Meta throttles reach. Burn in
captions — most of Meta autoplays muted.

**VO (~9s, Sarvam `bulbul:v2`, `en-IN`, pace 0.9):**

> Online stores for Indian brands. U-P-I, cash on delivery, G-S-T invoices...
> from forty-nine thousand nine hundred ninety-nine rupees. Brand Mint. Hyderabad.

**Music:** single sustained warm pad, one soft mallet hit on the cut to Shot 3,
resolve on the landing frame. Nothing percussive or urgent.

---

## 4 · Image pack

**Do NOT attach as generation references** — anything with a logo in it tempts
Omni into drawing letterforms, which is the one thing this prompt forbids:
- ~~`logo-ref-01..04.png`~~ · ~~`brandmint-outro-*.png`~~

**Attach for style/palette conditioning only (optional):**
| File | Why |
|---|---|
| `../../og-image.png` (1200×630) | The house look — mint on ink, correct restraint |
| `../../brand-kit/colors/palette.svg` | Exact hexes |

**Composite in post (these are your overlay assets, not inputs):**
| File | Size | Use |
|---|---|---|
| `../../brand-kit/logo/brand-mint-primary-dark.svg` | vector | Logo lock-up on the landing frame |
| `brandmint-mark-transparent.png` | 1024² | Mark alone, for a corner bug |
| `brandmint-outro-dark.png` | 1800×1040 | Pre-built end card if you'd rather not build one |

**Missing, and it's the highest-value gap:** `work/` contains no screenshots.
A two-second cut of a real shipped store — SimplySip, Trésor Couture, GreenTeam
or FreshKart — would outperform any generated footage, because it's the actual
product. `work/README.md` has the specs: 1600×1000, JPG, under 300 KB. Shoot
those four and you can swap Shot 2's blank glow for a real store on the phone.

---

## 5 · Context block for Omni (replaces the stale one)

```
Brand Mint is a senior-led studio in HITEC City, Hyderabad that builds online
stores for Indian brands. Four fixed-price tiers, starting at ₹49,999; a
static five-page website starts at ₹14,999. Every build handles what Indian
commerce actually needs: UPI, cards, cash on delivery, GST invoices and
WhatsApp orders. Four brands shipped to date. Every engagement is led by an
operator with 8+ years — the person who pitches is the person who builds.
Fixed prices agreed before work starts, GST extra, no hourly billing.
Site: brandmintstudios.in

Tone: senior, specific, Indian. Confident without arrogance. Lead with a
number. Never use: innovative, solutions, cutting-edge, disruptive, seamless,
end-to-end, world-class, transform, empower, unlock, reimagine, scalable.

Claims permitted in this ad, and no others: "4 brands shipped", "8+ years
on every build", "from ₹49,999", "HITEC City, Hyderabad", "UPI, COD, GST
invoices, WhatsApp". Do not invent revenue figures, client counts, ROI
percentages or growth multiples.
```
