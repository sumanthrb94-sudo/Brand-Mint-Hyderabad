# AI VIDEO-GENERATION BRIEF
## Single-file production brief — load into Claude / GPT / Cursor in any repo

**Purpose.** This is the complete, portable brief for any AI agent to generate a Brand Mint Studios production-grade Reel from scratch. It encodes the v21-empires-beast system: MrBeast retention structure rendered in Brand Mint editorial palette, output as 1080×1920 60fps H.264.

**Use case.** Drop into a sibling repo (e.g. Green Team — also managed by brandmintstudios.in). Point an AI at this file and ask it to generate a new episode. The AI then writes a Python build script that renders an MP4 to spec, no human intermediate steps.

**Authoring entity.** All Brand Mint Studios sub-brands (incl. Green Team) inherit this system. The palette and rules are hard-coded to Brand Mint canon — sub-brands keep the same visual language.

---

## 0 · IDENTITY & POSITIONING

**Parent agency.** Brand Mint Studios — Hyderabad-based brand/marketing/dev studio. Editorial Nat-Geo-meets-Cereal-Magazine aesthetic, hybrid positioning (Track A real-estate, Track B software/dev).

**Voice.** Editorial. Restraint. Data-led. Never salesy, never hype-merchant. We rank, we research, we publish. We don't beg. Confident tone, no exclamation marks, no "amazing", no "literally", no "game-changer".

**Mandatory hybrid line in every brief:**
> "Strategy · Design · Engineering — built in tight senior pods."

---

## 1 · HARD CONSTRAINTS (NEVER VIOLATE)

| # | Rule | Reason |
|---|------|--------|
| C1 | NO founder face content. Ever. | Brief locked. Owner does not appear on-camera. |
| C2 | NO invented numbers / unverified stats | Provenance only — public records or "ask us". |
| C3 | NO named competitor callouts (positive or negative) | Liability + brand voice. |
| C4 | NO pricing in feed posts | Route to DM with keyword. |
| C5 | NO Canva audio library outside Canva | License terms. Use IG trending audio or Musicbed/Artlist. |
| C6 | NO emoji in captions unless explicitly requested | Editorial register. |
| C7 | NO "amazing", "literally", "game-changer", "synergy", "leverage" | Voice. |
| C8 | NO faces of real people unless they are public-record subjects with sourced quotes | Liability. |
| C9 | Brand Mint M monogram must come from canonical SVG (`brand-kit/logo/brand-mint-monogram.svg`), never redrawn in code | Brand consistency. |
| C10 | All text must respect SAFE_TEXT_W = 960px (left/right 60px margin per SPACING-GUIDELINES) | No edge clipping on mobile. |

**If a brief violates any constraint, refuse and ask for revision.**

---

## 2 · VISUAL SYSTEM — HARD-CODED VALUES

### Palette (use these hex codes exactly, no substitution)

```
BEAST_BLACK   = "#070A09"   # ink, primary type
BEAST_WHITE   = "#F5F1EA"   # paper, off-white background
BEAST_YELLOW  = "#7CF6C8"   # mint-2 — accent blocks, builder cards
BEAST_RED     = "#10B981"   # mint-3 — primary brand mint, annotations, arrows
BEAST_GREEN   = "#047857"   # mint-4 — deep accent, winner reveal
```

**Note on naming:** the variables retain MrBeast-style names (`BEAST_RED`, `BEAST_YELLOW`) for memorability, but the actual hex codes are 100% Brand Mint palette. Do NOT swap in literal MrBeast red/yellow.

### Type

| Token | Family | Size range | Use |
|-------|--------|------------|-----|
| FONT_DISPLAY | Plus Jakarta Sans ExtraBold | 64–180pt | Headlines, hooks, ranks |
| FONT_BODY | Plus Jakarta Sans Bold | 28–48pt | Subheads, builder names |
| FONT_MONO | JetBrains Mono Bold | 16–24pt | Kickers, timestamps, eyebrows |

Fonts live at `/usr/local/share/fonts/brandmint/`. If not present, fall back to system bold sans + system mono — never serif for beast-style.

### Canvas

```
W = 1080            # Reels-native vertical
H = 1920
FPS = 60            # smooth motion, MrBeast tier
SAFE_TEXT_W = 960   # left/right 60px margin
SAFE_TOP = 240      # below Reels UI overlay
SAFE_BOTTOM = 480   # above caption + Like/Comment bar
```

### Stroke rules

- Display headlines get **8px black stroke** on white/yellow backgrounds. This is the BEAST signature.
- Body text gets **2–4px stroke** only when contrast is borderline.
- All strokes use `stroke-linejoin="round"`.

---

## 3 · TECH STACK (REQUIRED)

```
Python 3.9+
cairosvg     # SVG → PNG per-frame
ffmpeg       # H.264 mux
Pillow       # frame composition fallback
numpy        # easing curves + audio synth
```

**Render pipeline:**
1. Each frame is generated as SVG string with all elements positioned for time `t` (0.0–1.0).
2. `cairosvg.svg2png()` writes PNG to `frames/f00000.png`.
3. ffmpeg muxes `frames/f%05d.png` + audio WAV → MP4 H.264 (CRF 18, yuv420p, faststart).

**Output naming:** `brandmint-<slug>-<bpm>bpm.mp4` (e.g. `brandmint-ep01-beast-120bpm.mp4`).

---

## 4 · THE BEAST STRUCTURE (v21 canonical)

Total length: **15–17 seconds @ 120 BPM** (~30–34 beats). Every beat boundary triggers a white-flash frame + camera shake to maintain retention.

### Beat sheet (countdown episode)

| Beat | Duration | Content |
|------|----------|---------|
| HOOK | 4 beats (2.0s) | One bold question on yellow block. Hand-drawn red arrow points at it. "CAN YOU RANK HYDERABAD'S TOP 8 BUILDERS?" |
| STAKES | 3 beats (1.5s) | Why the viewer should care. Stat chip. "ONLY 1 BUILT 47M SQFT." |
| METHOD | 3 beats (1.5s) | How we ranked. "BY SALES · BY STORY · BY PUBLIC RECORD." |
| COUNTDOWN | 12 beats (6.0s) | 7 builder cards reveal in sequence, ranks 8→2. Each ~0.85s on screen. Yellow rotated card with rank + name + tagline. Red circle annotation on key word. |
| WINNER | 5 beats (2.5s) | #1 reveal. Big white flash. Green deep block. WINNER NAME at 180pt with 8px stroke. |
| CTA | 4 beats (2.0s) | "COMMENT '[KEYWORD]' FOR FULL LIST." Brand Mint M monogram bottom-right. Pulse animation. |

### Beat sheet (spotlight episode — no countdown)

| Beat | Duration | Content |
|------|----------|---------|
| HOOK | 4 beats (2.0s) | The premise question. |
| AWARD | 3 beats (1.5s) | The proof point ("WON CRISIL A+ IN 2024"). |
| FOUNDERS | 3 beats (1.5s) | Names + year founded. NO faces. |
| PROJECT | 4 beats (2.0s) | Flagship project + key stat. |
| PHILOSOPHY | 4 beats (2.0s) | Their belief in their own words (sourced quote, quoted clearly). |
| BRAND | 2 beats (1.0s) | Brand Mint card: "RESEARCHED BY @brandmint.studios". |
| CTA | 4 beats (2.0s) | DM keyword for full research doc. |

---

## 5 · RETENTION MECHANICS (NON-NEGOTIABLE)

Every Reel MUST contain all 8:

1. **Frame-1 hook.** Big text visible before viewer can scroll. No fade-in for the first headline — it's there at t=0.
2. **White flash on beat boundaries.** 1–2 frames pure white at every major cut.
3. **Camera shake.** 4–8px x/y offset on impact beats (winner reveal, stat chip slam).
4. **Hand-drawn red arrows.** Sketchy bezier (not vector-perfect). Point at the most important word on screen.
5. **Red circle annotations.** Multi-stroke imperfect circle around key stats/words. Looks hand-drawn.
6. **Stat chips.** Yellow rotated pill (-3° to -6°) with black border, mono font for the number, sans for the unit. Slams in with scale + back-out easing.
7. **Stroked headline text.** 8px black stroke on every display word. Yellow fill on black bg, black fill on yellow bg.
8. **Velocity escalation.** First 4 beats ~500ms each, middle beats ~300ms, final reveal ~200ms. Pace accelerates toward the climax.

---

## 6 · COPY PATTERNS

### Hook patterns (pick one per video)

- **The Ranking Hook.** "CAN YOU RANK [CITY]'S [N] BIGGEST [CATEGORY]?"
- **The Belief Hook.** "[ENTITY] BELIEVES [POSITION]. HERE'S WHY THEY'RE RIGHT."
- **The Stake Hook.** "ONLY [N] OF [TOTAL] BUILT [METRIC]. GUESS WHO."
- **The Cost Hook.** "WE SPENT [TIME/MONEY] ON [RESEARCH]. HERE'S WHAT WE FOUND."

### CTA template (always last beat)

```
COMMENT '[KEYWORD]' —
WE'LL DM THE FULL [DELIVERABLE].

FOLLOW @brandmint.studios
EDITORIAL [VERTICAL] · TUE + THU
```

Keyword is **ALL CAPS, ONE WORD**. Examples: EMPIRES, HERITAGE, NEW, MODCON, GREEN.

### Banned phrases

`amazing · literally · game-changer · synergy · leverage · 10x · disrupting · unlock · unleash · revolutionary · cutting-edge · seamless · world-class · best-in-class · industry-leading`

If a draft contains any, rewrite.

---

## 7 · CONTENT BRIEF — FILL IN BEFORE GENERATING

The receiving AI must collect these inputs from the user before writing any code:

```yaml
episode:
  slug: ""              # e.g. "ep05-green-teaser"
  bpm: 120              # default 120; range 100-140
  length_s: 15.5        # 15-17s typical
  format: "countdown" | "spotlight"

content:
  hook: ""              # single question, ALL CAPS
  stakes: ""            # one sentence + one stat
  method: ""            # 3 short clauses, " · " separated
  list:                 # for countdown format
    - rank: 8
      name: ""
      sub: ""           # tagline / year / location
    # ... rank 7, 6, 5, ...
  winner:
    name: ""
    proof: ""           # one-line credential

cta:
  keyword: ""           # ALL CAPS single word
  deliverable: ""       # "full research doc", "playbook", "13-titan list"
  vertical: ""          # "REAL ESTATE" / "BRANDING" / etc.

provenance:
  sources:              # public records URLs, RERA IDs, etc.
    - ""
  notes: ""             # constraints, locked claims
```

**If any field is empty or unverified, the AI MUST refuse to render and ask the user.**

---

## 8 · OUTPUT SPEC

| File | Path | Format |
|------|------|--------|
| Build script | `build_<slug>.py` | Python, imports `_lib.py` patterns inline if standalone |
| Frames | `out/frames_<slug>/f%05d.png` | PNG 1080×1920 |
| Audio | `out/_audio_<slug>.wav` | 48kHz stereo, ducked beat synth |
| Silent video | `out/brandmint-<slug>-silent.mp4` | H.264 video-only |
| Final video | `out/brandmint-<slug>-<bpm>bpm.mp4` | H.264 + AAC, faststart, CRF 18 |
| Caption | `posts-ready/post-<slug>/caption.txt` | Plain text, hashtags last |
| Meta | `posts-ready/post-<slug>/meta.txt` | Pillar, format, file path, DM keyword, post slot |

**ffmpeg mux command:**

```bash
ffmpeg -y -framerate 60 -i "frames/f%05d.png" \
  -i "_audio.wav" \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  -movflags +faststart \
  -shortest \
  "brandmint-<slug>-<bpm>bpm.mp4"
```

---

## 9 · CANONICAL EXAMPLE — EP01 BEAST

This is verbatim what was rendered for the v21-empires-beast series. Use as the gold-standard reference.

```yaml
episode:
  slug: "ep01-beast"
  bpm: 120
  length_s: 15.5
  format: countdown

content:
  hook: "CAN YOU RANK HYDERABAD'S TOP 8 BUILDERS?"
  stakes: "ONE OF THEM CONTROLS 47M SQFT. THE REST? NOT EVEN CLOSE."
  method: "BY SALES · BY STORY · BY PUBLIC RECORD"
  list:
    - {rank: 8, name: "SUMADHURA INFRACON", sub: "1995 · Nalgonda → Hyd"}
    - {rank: 7, name: "RAJAPUSHPA",          sub: "2006 · Kokapet"}
    - {rank: 6, name: "PHOENIX GROUP",       sub: "2004 · Jubilee Hills"}
    - {rank: 5, name: "LODHA",               sub: "1980 · Mumbai → Hyd"}
    - {rank: 4, name: "VASAVI GROUP",        sub: "1996 · Hyderabad"}
    - {rank: 3, name: "APARNA",              sub: "1996 · S. Sridhar Reddy"}
    - {rank: 2, name: "MY HOME",             sub: "1981 · Dr. Rameswar Rao"}
  winner:
    name: "PRESTIGE GROUP"
    proof: "1986 · 47M SQFT · LISTED"

cta:
  keyword: "EMPIRES"
  deliverable: "full 13-titan research doc"
  vertical: "REAL ESTATE"

provenance:
  sources:
    - "RERA Telangana registration database"
    - "BSE Prestige Estates filings 2023"
  notes: "All founding years + cities cross-checked against company About pages."
```

**Rendered output:** `brand-kit/video/v21-empires-beast/out/brandmint-ep01-beast-120bpm.mp4` (15.5s, 1.7MB, 60fps, 1080×1920).

---

## 10 · PRODUCTION-READINESS CHECKLIST

Run before shipping any rendered MP4:

- [ ] Frame 1 contains the headline (no fade-in delay on the hook word).
- [ ] No text crosses the 60px safe margin (left/right).
- [ ] No text crosses SAFE_TOP (240) or SAFE_BOTTOM (480) — Reels UI does not overlap copy.
- [ ] White flash present at every major cut (visible 1–2 frames).
- [ ] At least one red circle annotation and one hand-drawn arrow in the video.
- [ ] All stat chips contain only numbers verifiable in `provenance.sources`.
- [ ] No banned phrases in any frame text or caption.
- [ ] No founder face. No competitor name. No pricing.
- [ ] Brand Mint M monogram in final CTA frame, sourced from canonical SVG.
- [ ] File renders to <3MB at CRF 18 (Reels upload limit comfort).
- [ ] Audio peaks at -3dB, no clipping.
- [ ] Caption file < 2200 chars, hashtags ≤ 30.

---

## 11 · COMMON FAILURE MODES (LEARN FROM THESE)

| Defect | Fix |
|--------|-----|
| Builder name overflows card | Use `fit_to_width(name, max_w_px=card_w-60, start_pt=44, floor_pt=22)` |
| f-string SyntaxError with `\"` inside `{}` | Use single quotes for the inner string: `f"{stroke_text('"WORD', ...)}"` |
| CTA text overlaps reveal text | Make reveal element slide OFF canvas (translate-Y to -900) before CTA fades in, with alpha killswitch |
| Mark animation overlaps particles | Serial timing — particles 0–35%, mark 40–78%. Never parallel. |
| Arrow loops under chip label | Source arrow from above-right, point down: `red_arrow(cx+430, y-80, cx+280, y+50, stroke_w=12)` |
| MP4 output filename wrong | Verify `out_path = f"brandmint-{slug}-{bpm}bpm.mp4"` matches expected naming |
| Logo M doesn't match brand | Load `brand-kit/logo/brand-mint-monogram.svg` via SVG embedding, never code custom paths |
| AI VO sounds robotic | Don't use AI VO. Brand Mint reels are voiceless. Music + on-screen type only. |

---

## 12 · HOW THE RECEIVING AI SHOULD WORK

When loaded into Claude/GPT/Cursor in another repo:

1. **Read this entire file first.** Do not skim.
2. **Ask the user for the content brief (section 7).** Refuse to render until every field is filled and sourced.
3. **Run constraint validation (section 1).** If any rule is violated, refuse and explain which one.
4. **Write `build_<slug>.py`** following the structure of v21-empires-beast/build_ep01.py — single file, all primitives inline or via shared `_lib.py`.
5. **Render frames + mux MP4** to the path in section 8.
6. **Run the checklist (section 10).** If any item fails, fix and re-render.
7. **Write caption + meta** files per section 8 format.
8. **Commit + push** to the user's designated branch with message format: `v<n>-<slug>: ship <format> episode`.

---

## 13 · TLDR FOR THE AI

You are generating a 15-second vertical Reel for Brand Mint Studios (or one of its sub-brands managed by brandmintstudios.in).

**Style:** MrBeast retention mechanics (big text, flashes, arrows, circles, fast cuts) rendered in Brand Mint editorial palette (mints + ink + paper).

**Length:** 15–17s @ 120 BPM, 60fps, 1080×1920, H.264.

**Structure:** HOOK → STAKES → METHOD → COUNTDOWN (or spotlight beats) → WINNER → CTA.

**Tech:** Python + cairosvg + ffmpeg. One build script per episode.

**Never violate:** No founder face. No invented numbers. No competitor names. No pricing in feed. No emoji. No banned voice phrases.

**Output:** MP4 + caption.txt + meta.txt + commit + push.

When in doubt, refuse and ask. The brand's editorial register is the moat — protect it.

---

**END BRIEF.**
*Brand Mint Studios · v21 production system · hard-coded canon for all sub-brands managed by brandmintstudios.in*
