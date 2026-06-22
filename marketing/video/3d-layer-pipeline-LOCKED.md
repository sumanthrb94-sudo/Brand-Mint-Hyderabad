# Brand Mint — 3D-Layer Reel Pipeline (LOCKED)

The repeatable process for turning a Gemini Omni talking-head clip into a vertical
9:16 reel with mint-green words embedded **behind** the subject (true 3D compositing),
a white payoff rail at neck level, an emotional zoom, and the brand end card.

This is locked. Do not re-derive it per episode — feed a new clip + transcript and run it.

---

## 0. The one hard input requirement (framing) — READ FIRST

The 3D effect is real occlusion: words sit behind the person and the silhouette
covers their lower-inner part. That only works if the shot **gives the words somewhere
to live.** So the Omni prompt must frame the subject:

- **Head-and-shoulders up to roughly knees-to-face** — i.e. the subject occupies the
  vertical centre, with **clear negative space above the hair, on both sides of the head,
  and below the chin** (neck/upper chest open).
- Centered, eye-level, locked-off (an almost imperceptible slow push-in is fine).
- Plain wardrobe, softly out-of-focus studio background.
- **No on-screen text or captions** — everything is added in post.

If the subject is framed too tight (face fills the frame) or too wide (full body, tiny head),
the crown words have no room to flank/embed and the layout breaks. This is a **shooting spec,
not an edit bug.** Bake it into every Omni brief.

---

## 1. Assets / tooling (already provisioned)

- **Matte:** HyperFrames `remove-background` (u2net_human_seg) → `frames_fg/` + `frames_bg/`.
- **Transcript:** hand-verified `transcript.json` (Whisper is blocked offline; supply words+times).
- **Render:** HTML caption layers → Playwright (chromium, `--no-sandbox`) → per-frame PNGs.
- **Composite/zoom/encode:** PIL `alpha_composite` + ffmpeg (static build).

## 2. Steps

1. **Separate audio**, extract frames at 24fps, matte to fg/bg.
2. **Reframe** fg/bg to 1080×1920 (centre crop of the subject).
3. **Measure the subject silhouette** from the mattes (mean head L/R boundary per y-row).
4. **Author caption HTML** (1080×1920), two layers gated by `?layer=back|front`:
   - **Crown (green `#27E6A2`, BEHIND):** sentence-opening words, big bold type, two
     well-spaced rows (no collision). Placed by the **mask solver** (step 5).
   - **Rail (white `#FBF8F1` + mint key word, FRONT):** rest of the sentence, neck level,
     phrase-grouped with commas, sequential reveal.
5. **Solve crown positions empirically** (`solve.py`): for each word, slide its inner edge
   against the real per-frame mattes and pick the x that lands the target embed
   (**~30%**, bottom-biased so *top stays visible, lower-inner embeds*). Guard rails:
   never < ~one full letter behind, never > ~45% (stays readable). Writes `crownx.js`.
6. **Render** both layers for all frames (Playwright).
7. **Composite** per frame: `bg → crown(back) → subject(fg) → rail(front) → logo`.
8. **Emotional zoom** on the composited frames (push-in ~2s then slow pull-out), anchored
   high (cy≈140) so the crop never clips the top crown; logo lifted clear of the bottom crop.
9. **Encode** body (24fps + source audio), build the 9:16 brand outro, concat, deliver.

## 3. Locked design rules (the "look")

- Continuous sentence framed as **one unit**, split into words; some behind, some in front.
- Reading flow **top-left → top-right → lower**, neck-level white payoff.
- Crown words **embed ~30%** behind the subject (verified against masks), bottom deeper than top.
- Mint palette only; emotional zoom in sync with layers; silent voice-over (no SFX); brand end card.
- **Self-audit every frame** (face/logo/offscreen/collision + per-word occlusion) before delivery.

## 4. Carousel companion (static posts)

Square **1080×1080** (so the IG grid shows each slide whole — no edge crop), strict safe margins,
auto-fit headlines. Depth = ghost keyword plane → blurred echo plane → extruded headline → mint
word popped forward. Eyebrow + index + footer lockup + carousel dots; final slide = Follow CTA.

---

_Pipeline locked. New episode = new clip + transcript → run steps 1–9._
