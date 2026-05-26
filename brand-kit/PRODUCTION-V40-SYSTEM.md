# PRODUCTION V40 — Brand Identity Reel System

**Single-file reference doc.** Drop into any sibling repo (Green Team, future sub-brands) to replicate the v40 brand-identity reel architecture. Everything below is what's actually wired in `brand-kit/video/v40-brand-thumb/build_thumb.py` as of commit `2e2cbc3`.

Pair this with `brand-kit/AI-VIDEO-GENERATION-BRIEF.md` (the brand voice / constraint doc). This file is the *technical* manifest; that one is the *brand-voice* manifest.

---

## 0 · DELIVERABLE SPEC

| Property | Value |
|---|---|
| Duration | **22.0s** |
| Resolution | **1080×1920** (vertical / Reels-native) |
| Frame rate | **60 fps** (1320 frames) |
| Codec | H.264 (libx264 preset slow, CRF 17) |
| Pixel format | yuv420p |
| Audio | AAC stereo 192 kbps, 0.7s tail fade |
| Container | MP4 + faststart |
| Final file size | ~5.5 MB |
| Output path | `out/brandmint-thumb-60fps.mp4` |

## 1 · STACK

```
Python 3.11+
cairosvg     # SVG → PNG per-frame
ffmpeg       # video encode + audio mux
Pillow       # (transitive via cairosvg)
numpy        # easing curves (in build pipeline only — runtime uses pure math)
```

**Render pipeline (one entry point):**
```bash
python3 build_thumb.py
```
Generates `out/frames_*/f%05d.png`, then muxes with `epic-cinematic.mp3` via ffmpeg → `out/brandmint-thumb-60fps.mp4`.

---

## 2 · CANVAS + PALETTE + FONTS

```python
W, H = 1080, 1920
FPS  = 60
TOTAL_S = 22.0
CENTER_X = W / 2 = 540
MARK_CY  = H / 2 - 60 = 900   # mark anchor (above geometric center)

INK    = "#070A09"            # background
PAPER  = "#F5F1EA"            # off-white type
MINT_1 = "#DCFCEC"            # brightest mint (highlights)
MINT_2 = "#7CF6C8"            # bright mint (gradients top)
MINT_3 = "#10B981"            # core brand mint
MINT_4 = "#047857"            # deep mint (shadows)
GHOST  = "rgba(245,241,234,0.55)"   # subtle off-white

FONT_DISPLAY = "Plus Jakarta Sans"
FONT_MONO    = "JetBrains Mono"
```

---

## 3 · AUDIO-SYNC SYSTEM

### Hit detection
The reference audio (`epic-cinematic.mp3` by NastelBom · Pixabay) was analyzed via short-time RMS envelope onsets. Six major hits detected in the first 22s with median inter-onset interval ~3.85s.

```python
AUDIO_HITS = [1.90, 5.75, 9.60, 13.45, 15.40, 18.60]   # seconds
```

### Visual phase boundaries (all locked to audio hits)

| Phase | Time | What happens |
|---|---|---|
| **THUMBNAIL HOLD** | 0.0–1.85s | First-frame brand poster (M + BRAND MINT + tagline + signature). Fades out 0.6 → 1.85. |
| **HIT 1** | 1.90s | Lattice begins spawning center-outward |
| **ARCHITECTURE spawn** | 1.95–5.75s | All 392 particles born by audio HIT 2 |
| **HIT 2** | 5.75s | Lattice fully populated |
| **ARCHITECTURE breath** | 5.75–9.60s | Lattice rotates, micro-bobs |
| **HIT 3** | 9.60s | COALESCE begins — particles flow toward M |
| **COALESCE** | 9.60–13.45s | Particles travel to proximity-matched M targets |
| **HIT 4** (climax) | 13.45s | **M LANDS** + god-ray bloom + lens flare |
| **LANDING** | 13.45–15.40s | Disc fills, stroke draws, mark settles |
| **HIT 5** | 15.40s | BRAND MINT wordmark settles |
| **NAME** | 15.40–18.60s | Wordmark + tagline kicker |
| **HIT 6** | 18.60s | *compound.* mint-gradient pulse lands |
| **SIGNATURE** | 18.60–21.40s | URL + signature line |
| **FADE OUT** | 21.40–22.00s | Audio + visual fade simultaneously |

### Audio mux command
```bash
ffmpeg -y -framerate 60 -i frames/f%05d.png -i epic-cinematic.mp3 \
  -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  -af "afade=t=out:st=21.3:d=0.7" \
  -t 22.0 -shortest -movflags +faststart \
  out/brandmint-thumb-60fps.mp4
```

---

## 4 · PARTICLE SYSTEM

### Counts
```python
N_LATTICE_COLS = 14
N_LATTICE_ROWS = 28
N_PARTICLES    = 392     # = 14 × 28 — every lattice slot filled, no orphans
N_LEAD         = 0       # no anchor dots in v40
N_STREAM       = 0       # no diagonal stream particles
```

### Lattice geometry
- **Square grid** (no hex offset → perfect mirror symmetry about CENTER_X)
- Spacing: **64 × 50 px**
- Spans ~896 × 1400 px centered on (CENTER_X, MARK_CY)
- z-jitter: `random.uniform(-0.20, 0.20)` for each slot

### Particle birth schedule
Particles spawn in order of distance from MARK_CY (closer = earlier). This creates an expanding radial wavefront, not row-by-row:
```python
birth_for_slot[slot_i] = 1.95 + u * 3.80   # u sorted by distance, 0→1
```

### Proximity-matched M coalesce
Greedy nearest-neighbor assignment computed once at init:
```python
for slot_i in range(392):
    # find closest unclaimed M_TARGETS[m_i]
    # assign particle ↔ M target as a 1:1 pair
```
Each lattice slot is paired with its **closest** unclaimed M target. Result: when COALESCE fires, particles travel the shortest path to the M; lattice depletes uniformly.

### Particle properties (per particle)
```python
@dataclass
class P:
    x, y, z: float          # 3D position (z projects to scale + alpha)
    vx, vy, vz: float       # velocity for spring dynamics
    tx, ty: float           # M target (set at init via greedy match)
    born_t: float           # t when particle becomes visible
    seed: float             # 0..1 deterministic noise input
    role: str               # "core" only in v40
```

### Particle render
- **Body**: filled circle, radius `r = 8.5 * proj_scale * bloom`
- **Outer glow halo**: only if `glow_radius > 0.5`, uses `particleGlow` radial gradient
- **Specular highlight**: small offset bright dot (toward upper-right key light)
  - **SUPPRESSED** when:
    - `t >= 9.5` (COALESCE start) for core particles
    - distance to M target < 80 px (proximity guard)
- **Color tier by z**:
  - `z > 0.2`: fill MINT_2, hl MINT_1 (closest, brightest)
  - `-0.2 < z < 0.2`: fill MINT_3, hl MINT_2 (mid)
  - `z < -0.2`: fill MINT_4, hl MINT_3 (deepest)

### Squash & stretch on birth
```python
if 0 <= age < 0.45:
    bloom     = 1.0 + (1 - age/0.45) * 1.6      # scale pop
    stretch_y = 1.0 + (1 - age/0.30) * 0.35     # Y-stretch settle
    # body renders as ellipse during stretch, circle after
```

---

## 5 · MOTION GRAPHICS LAYERS

All composited per-frame in this stacking order (back → front):

| Layer | Function | When active | Purpose |
|---|---|---|---|
| Background ink | `<rect fill="#070A09">` | always | base black |
| Atmospheric haze | `render_atmosphere(t)` | always; fades during reveal | 5 large soft mint-fog circles drifting slowly |
| Multi-beam god-ray | `render_god_ray(t, cx, cy)` | 12.5–16.0s, peak 13.45 | 4 angled mint shafts (±8°/±22°) + wide central beam |
| Particles | `render_particles(t)` | always | the 392 dots + their highlights |
| M monogram | `render_mark(...)` | 12.0+ | disc + stroke + outer glow |
| Shockwave rings | `render_shockwave(t, cx, cy)` | 0.7s after each audio hit | 2 concentric mint rings scaling outward |
| Lens-flare streaks | `render_lens_flare(t)` | 0.4s after each audio hit | horizontal mint band sweeping across canvas |
| Vignette | `<rect fill="url(#vig)">` | always | radial darkening, breathes per phase |
| Hook overlays | `render_hook(t)` | 1.9–11.3s | 3 animated subtitle hooks (with bubble gap) |
| Phase chyrons | `render_chyron(t)` | 1.5–11.3s | `01` / `02` / `03` upper-left with mint underline |
| Brand-reveal text | `render_shot_text(t)` | 14.0+ | BRAND MINT / tagline / signature |
| Thumbnail overlay | `render_thumbnail_overlay(t)` | 0.0–1.9s | first-frame poster, fades out |
| Final fade | `<rect fill="ink" opacity={fade}>` | 21.4–22.0s | dissolve to black |

### Camera moves
`camera_state(t)` returns `(scale, tx, ty)` per frame. Subtle pushes/pulls tied to phases:
- 0–1.9s: gentle push-in 2%
- 1.9–5.75s: pull-back to 0.96 (lattice spawns into wider frame)
- 5.75–9.60s: drift 0.96 → 0.98 (architecture breath)
- 9.60–13.45s: push-in toward 1.05 (climax build)
- 13.45–18.60s: ease back to 1.0
- Beyond: hold

### Vignette breathes
```python
def vignette_strength(t):
    if t < 1.9:   return 0.70   # tight on the void/thumbnail
    if t < 5.75:  return 0.40   # widest while lattice spawns
    if t < 9.60:  return 0.42
    if t < 13.45: return 0.50   # narrowing as coalesce builds
    if t < 15.40: return 0.65   # tighter on landing
    if t < 18.60: return 0.55   # neutral on name
    return 0.72                  # tightens for sign-off
```

---

## 6 · TEXT OVERLAY SYSTEM

### Hook overlays (3 lines, eye-level)
All anchored at `HOOK_Y = 900` (vertical center of canvas).

| # | Window | Copy | Treatment |
|---|---|---|---|
| 1 | 1.90–5.40 | `BRANDS DON'T COMPOUND BY ACCIDENT.` | mono caps, letter-spacing 0.30→0.10em settle |
| 2 | 5.75–9.40 | `THEY'RE  architected.` | display italic, mint gradient on emphasis, scale-punch |
| 3 | 9.60–11.30 | `ONE PRINCIPLE AT A TIME.` | display caps, letter-spacing settle + mint accent dot |

### Bubble-gap clearance
`hook_gap_bbox(t)` returns `(x0, y0, x1, y1, alpha)` for the active hook. In `render_particles`, any particle inside that bbox has its alpha multiplied by:
```python
inside_factor = 1 - smoothstep(0.92, 1.05, edge_norm)
a *= (1 - inside_factor * gap_alpha)
```
Result: lattice opens a clean rectangle behind every hook (deep inside = invisible, near edges = soft fade).

**Hook 2 bbox is asymmetric** (text is right-biased):
- Left edge: CENTER_X − 400 (covers "THEY'RE")
- Right edge: CENTER_X + 620 (covers "architected." + descender)

Hooks 1 & 3 use symmetric ±520 / ±480.

### Phase chyrons (upper-left)
```python
windows = [("01", 1.50, 5.40),
           ("02", 5.55, 9.40),
           ("03", 9.45, 11.30)]
```
Each: "PHASE" mono label + large numeral + mint underline rule that **draws across** as it enters (animated stroke-dasharray equivalent via line element width animation).

### Brand-reveal text (after the M lands)
- **BRAND MINT** wordmark — settles on HIT 5 (15.40s); letter-spacing 0.45→0.06em
- **WE MINT BRANDS · THAT** mono kicker — fades in after HIT 5
- **compound.** display italic mint gradient — pulses on HIT 6 (18.60s)
- **STUDIOS — HYDERABAD · brandmintstudios.in** mono signature — fades in 19.5s with blinking-cursor `|`

### First-frame thumbnail (`render_thumbnail_overlay`)
Full brand poster composition (M monogram + BRAND MINT + tagline + signature) at t=0. Fades out 0.6 → 1.85s as the lattice spawns. **The first PNG frame is the social-media meta thumbnail.**

---

## 7 · CONTENT BRIEF (what to swap for a new sub-brand)

Every editable element in one place — change these and the system re-renders for any sub-brand under the same parent agency.

```yaml
# Audio
audio_path: "epic-cinematic.mp3"        # any 22s+ cinematic track with detectable hits

# Brand
brand_name: "BRAND MINT"
tagline_kicker: "WE MINT BRANDS · THAT"
tagline_main: "compound."                # italic, mint gradient
signature: "STUDIOS — HYDERABAD · brandmintstudios.in"

# Hooks (editorial — 3 lines, 1 per audio hit)
hook_1: "BRANDS DON'T COMPOUND BY ACCIDENT."
hook_2_left: "THEY'RE"
hook_2_right: "architected."             # mint gradient
hook_3: "ONE PRINCIPLE AT A TIME."

# Palette (override for sub-brand)
ink:    "#070A09"
paper:  "#F5F1EA"
mint_1: "#DCFCEC"
mint_2: "#7CF6C8"
mint_3: "#10B981"
mint_4: "#047857"

# Audio hit timestamps (re-analyze if changing music)
audio_hits: [1.90, 5.75, 9.60, 13.45, 15.40, 18.60]
```

---

## 8 · PRODUCTION-READINESS CHECKLIST

Run before shipping any rendered MP4:

- [ ] First frame (t=0) is a clean branded composition (will be the meta thumbnail)
- [ ] Audio file length ≥ TOTAL_S; 0.7s tail fade applied
- [ ] All audio hits visually mapped (lattice spawn, M lock, wordmark settle, *compound.* pulse) — eyeball + ear check
- [ ] No specular pinpricks visible in locked M (verify a frame at t=12.5s)
- [ ] Lattice fully populated, no orphan corners (verify a frame at t=7.0s)
- [ ] Hook text never collides with bubbles (verify frames at t=3.5, 7.5, 10.5)
- [ ] BRAND MINT wordmark + *compound.* + signature all visible in final frame (t=20s)
- [ ] Final fade ends fully black before t=22.0s
- [ ] File size < 8 MB (Reels comfort)
- [ ] Audio peaks at -3 dB, no clipping

---

## 9 · FILE TREE

What a sub-brand repo needs:
```
brand-kit/video/<version>/
├── build_<slug>.py             # the main render script
├── epic-cinematic.mp3          # audio source (committed for reproducibility)
└── out/
    ├── .gitignore              # excludes _audio_*.wav and *-silent.mp4
    └── brandmint-<slug>-60fps.mp4
```

`build_<slug>.py` is self-contained — all rendering, motion graphics primitives, text layout, particle physics, audio mux. Drop in, edit the YAML-ish block at the top (palette + copy), run `python3 build_*.py`, MP4 lands in `out/`.

---

## 10 · WHAT V40 DELIVERS (in one paragraph)

A 22-second vertical brand-identity ident. Opens with a held thumbnail composition (brand name visible from frame 0). At audio HIT 1, the thumbnail dissolves and 392 mint dots spawn into a 14×28 lattice from the center outward. Three editorial subtitle hooks ("Brands don't compound by accident." → "They're architected." → "One principle at a time.") play at eye level, each locked to a separate audio hit, with the lattice opening a clean rectangle behind each line. At HIT 3, the lattice particles flow on proximity-matched paths into the M monogram outline. At HIT 4 the M lands — disc fills, stroke draws, multi-beam god-ray blooms behind, lens-flare streak sweeps the frame. The mark rises, BRAND MINT wordmark settles on HIT 5, *compound.* mint-gradient pulse lands on HIT 6, signature line appears, fade to ink. Every visible visual change is locked to a specific audio onset; the first frame is a complete brand-poster composition; the M outline is pixel-clean (no inner highlights); the lattice is mirror-symmetric (no orphan corners); subtitle text never collides with bubbles.

That's the system. Replicate it.

---

*Brand Mint Studios · production system reference · v40 · commit 2e2cbc3*
