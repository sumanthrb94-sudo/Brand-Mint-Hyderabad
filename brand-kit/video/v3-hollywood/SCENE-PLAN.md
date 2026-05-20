# Brand Mint — "Compound" — Scene plan (shot-by-shot)

*Engineering doc for `build_hollywood.py`. Pair with `SCRIPT.md` (copy)
and `MOTION-SYSTEM.md` (animation vocabulary).*

Frame: 1080 × 1920 · 30 fps · 12.00 s · 360 frames total.
Render headroom: 1440 × 2560 (1.33×) for zoom safety.

## Shot table

| # | In   | Out  | Bg                     | Composition                          | Camera motion              | Transition in (from prev) |
|---|------|------|------------------------|--------------------------------------|----------------------------|----------------------------|
| 1 | 0.00 | 1.40 | Pure `#000` + mint radial glow center | Hero stat counter, centered | 1.00 → 1.04 push-in        | fade from black (0.5s)     |
| 2 | 1.40 | 3.20 | Same                   | Stat moves to top-third, two context lines | 1.04 → 1.02 settle    | morph (stat scales + slides up) |
| 3 | 3.20 | 4.60 | `#0B1F1A → #14352D` gradient | `3.4×` left + word right       | static                     | whip-pan (slideleft, 240ms) |
| 4 | 4.60 | 6.00 | Same gradient          | `61%` left + word right              | static                     | whip-vertical (slideup, 200ms) |
| 5 | 6.00 | 8.20 | `#000`                 | Two-line tension/promise, mint bar swipe | static                | fade-through-black (300ms)  |
| 6 | 8.20 | 10.60 | `#000` + strong mint radial glow | Monogram + wordmark + CTA pill | 1.00 → 1.03 breathe   | crossfade (400ms)          |
| 7 |10.60 |12.00 | Same                   | Hold + URL types in                  | static                     | hold (no cut)              |
| END |12.00 |12.50 | -                     | -                                    | -                          | fade to black (500ms)      |

Total = 12.50 s including the 0.5 s tail fade.

## Per-shot detail

### Shot 1 — HOOK (0.00–1.40s)

- **Frame:** Hero stat dead-center at 220pt JetBrains Mono Mint
  `#10B981`, with `feGaussianBlur stdDeviation=14` glow layer.
- **Animation:** Digit count-up. 21 keyframes between t=0.0 and t=0.7
  showing `+₹0.0 Cr → +₹42.6 Cr` with an ease-out curve
  (cubic-bezier(0.16, 1, 0.3, 1)). Then hold to t=1.4.
- **Camera:** zoompan `z = 1.00 + 0.04 * (t/1.4)`, anchored center.
- **Background:** radial mint glow center, fade in over 0.4s.
- **SFX:** sub-bass drone enters at t=0.0. Soft impact hit at t=0.7
  when the number lands.
- **Render:** built as a 42-frame PNG sequence (one per 33ms) so the
  counter animates smoothly. Frames at `frames/shot-01/frame-000.png`
  through `frame-041.png`.

### Shot 2 — CONTEXT (1.40–3.20s)

- **Frame:**
  - Top third: scaled hero stat (60% of beat-1 size).
  - Middle: *"in tracked revenue."* (italic emphasis on `tracked`,
    Plus Jakarta Sans 500 italic, 72pt).
  - Below: *"across eleven founder-led brands."* (Inter 400, 44pt).
- **Animation:** Hero stat scales from 1.0 → 0.6 and translates from
  `y=center` to `y=top-third` over 400ms with ease-in-out. The two
  lines fade up with `opacity 0→1` and `translateY +20→0` with a
  200ms stagger.
- **Camera:** static.
- **SFX:** drone holds. Soft cymbal wash at t=1.7.

### Shot 3 — PROOF 1 (3.20–4.60s)

- **Frame:** `3.4×` at 340pt JetBrains Mono Mint, left-aligned at x=80.
  `bookings.` at 92pt cream Plus Jakarta Sans 500 italic, right of it.
- **Transition in:** whip-pan slideleft (240ms). FFmpeg
  `xfade=transition=slideleft:duration=0.24`. Adds motion blur in
  pre-comp via `tblend=average` on a 3-frame window of the outgoing.
- **Animation:** static text.
- **SFX:** whoosh layered with a pluck synth hit on t=3.20.

### Shot 4 — PROOF 2 (4.60–6.00s)

- **Frame:** `61%` at 340pt mint mono left. `lower CPL.` at 92pt
  cream italic right.
- **Transition in:** vertical whip — `xfade=transition=slideup:
  duration=0.20`.
- **Animation:** static.
- **SFX:** same pluck recipe as shot 3.

### Shot 5 — TENSION → PROMISE (6.00–8.20s)

- **Frame A (6.00–7.20s):**  *"Most agencies leave you with a logo."*
  cream Plus Jakarta Sans 500 64pt, center-aligned. Fades up over 600ms.
- **Frame B (7.20–8.20s):** A mint `#10B981` bar wipes across the
  frame right→left over 300ms, "painting" out frame A. Behind it
  appears: *"We leave you with compounding revenue."* with mint italic
  on `compounding`.
- **Transition in:** fade through black 300ms (xfade fadeblack).
- **SFX:** drone modulates up a perfect fifth. Subtle low-pass riser
  building from t=7.0 to t=7.2 (the bar wipe is the resolve).

### Shot 6 — CTA (8.20–10.60s)

- **Frame:**
  - Monogram (gradient circle + single-stroke M) at 320×320, centered
    at y=720.
  - Wordmark "Brand Mint." below at 86pt cream.
  - CTA pill at y=1300, dimensions 720×140, radius 70, fill mint,
    label "Mint your next quarter →" in cream 48pt.
- **Animation:**
  - Monogram fades in `opacity 0→1` while scaling `0.85 → 1.00` with
    1.05 overshoot bounce — 250ms cubic ease-out.
  - Wordmark types in character-by-character (~18 chars × 25ms = 450ms)
    starting at t=8.6.
  - CTA pill slides up `y+80 → y` while `opacity 0→1` over 350ms
    starting at t=9.3.
  - CTA pill then breathes: pulse glow opacity `1.0 → 0.7 → 1.0` at
    0.3 Hz (one pulse every 3.3s — barely-perceptible).
- **Camera:** zoompan `z = 1.00 + 0.03 * sin(t/0.78)` — gentle drift.
- **SFX:** soft cymbal swell at t=8.2. Drone resolves to root note.

### Shot 7 — LOGO STAMP + URL (10.60–12.00s)

- **Frame:** Identical to shot 6 (CTA pill still visible) PLUS URL
  `brandmint.studio` at 38pt JetBrains Mono mint, 0.06em tracking,
  centered at y=1500.
- **Animation:** URL types in (~16 chars × 30ms = 480ms) starting at
  t=10.7. A 2px-wide cream cursor blinks at the end of the URL for the
  last 200ms, then everything fades out together (0.5s).
- **SFX:** Final low note holds. Fades to silence over 0.8s.

## Asset list (everything `build_hollywood.py` consumes)

- **Logo SVG:** `brand-kit/logo/brand-mint-monogram.svg`
  (used as a baked-in stroke path inside the generator so the build is
  reproducible without external files).
- **Fonts:** rendered through Plus Jakarta Sans, Inter, JetBrains Mono
  via `cairosvg`'s system-font fallback. Real fonts come from the host
  OS fontconfig — the script verifies they are available and falls back
  to display lookalikes if not.
- **Audio (royalty-free, original):** synthesised at runtime by ffmpeg
  `lavfi` filters — see `MOTION-SYSTEM.md §6 (Sound design).` Output:
  `out/score.wav`.
- **No third-party stock** consumed in the deterministic build. Canva's
  4 reference candidates (in `SCRIPT.md`) are for art-direction only.

## Build commands

```bash
cd brand-kit/video/v3-hollywood
python3 build_hollywood.py        # renders frames + audio + muxes
ffprobe -v error out/brand-mint-hollywood.mp4
```

Output: `out/brand-mint-hollywood.mp4` — 1080×1920, 12.5s, H.264 + AAC,
target ~10–14 MB.
