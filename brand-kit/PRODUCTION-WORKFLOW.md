# Brand Mint — Video Production Workflow

*The complete playbook from blank brief to published reel.*
*Version 1.0 · 2026-05-24 · maintained on `claude/social-media-video-generation-Mj4u6`*

---

## At a glance

```
┌──────────┐   ┌───────────────┐   ┌────────────┐   ┌──────────────┐   ┌────────────┐
│ 1. BRIEF │──▶│ 2. PRE-PROD   │──▶│ 3. PROD    │──▶│ 4. POST      │──▶│ 5. SHIP    │
│ 1 hr     │   │ 1-2 days      │   │ 2-5 days   │   │ 1-2 days     │   │ 30 min     │
│ Strategy │   │ Script +      │   │ Code /     │   │ Edit +       │   │ Upload +   │
│ + goal   │   │ storyboard +  │   │ AI / shoot │   │ color + mix  │   │ caption +  │
│          │   │ assets        │   │ + assemble │   │ + VO         │   │ schedule   │
└──────────┘   └───────────────┘   └────────────┘   └──────────────┘   └────────────┘
```

**Total per reel:** 4-10 working days, depending on complexity.
**Premium reel (client work):** 7-12 days. **Studio reel (internal):** 3-5 days.

---

## Phase 1 — Brief (1 hour)

The single most important hour of the entire production. Mistakes here cost days later.

### Inputs needed
- Audience: who is this for?
- Goal: save · share · click · DM · follow?
- Track: A (real-estate marketing) or B (software/dev)?
- Pillar: which of the 6 content pillars from `INSTAGRAM-BRIEF.md`?
- Format: Reel / Carousel / Single static / Story-poll?
- Constraints: brand rules, hard avoids (see `INSTAGRAM-BRIEF.md`)
- Deadline + posting slot

### Owner
Strategy / Creative Director (currently: founder).

### Deliverable
A 1-page brief committed to `brand-kit/content/briefs/<post-slug>.md`. Template:

```markdown
# Brief — <post slug>

- Date: <ISO date>
- Pillar: <which of the 6>
- Format: <reel | carousel | static | story-poll>
- Length: <e.g., 19s reel · 8-slide carousel>
- DM keyword: <e.g., 'AUDIT' or 'POSITION'>
- Primary KPI: <save-rate | share-rate | DM volume | follower delta>

## Audience
- Primary: <e.g., Hyderabad real-estate builder marketing heads>
- Secondary: <e.g., property buyers / investors as echo>

## Hook (3 candidates)
1. <line 1>
2. <line 2>
3. <line 3>

## Single sentence summary
<one line — what's the post about>

## Hard avoids
- <e.g., no invented numbers, no founder face>
```

### Quality gate
✅ Hook is concrete (no agency jargon · no "elevate" · no "compound" without specificity)
✅ KPI is measurable
✅ Audience is one segment, not three
✅ Goal is one action, not three

---

## Phase 2 — Pre-Production (1-2 days)

### 2.1 Script

For reels, script the **on-screen text** + **VO** + **timing** on one page. Use this format (see `brand-kit/video/v16-cinematic/VO-SCRIPT.md` for a worked example):

```markdown
# Script — <post slug>

| Time | Beat | On-screen | VO (if any) | Visual notes |
|------|------|-----------|-------------|--------------|
| 0:00-0:01 | open | (silent — logo mark) | — | M-monogram draws on |
| 0:01-0:03 | hook | "POSITIONING IS / THE ONLY MARKETING / THAT COMPOUNDS." | "Positioning... is the only marketing that compounds." | Typewriter reveal + mask-wipe |
| 0:03-0:05 | pain1 | "ADS END." | "Ads end." | Drop-in, particle field |
| 0:05-0:07 | payoff1 | "POSITIONS STAY." | "Positions stay." | Whip-pan in, mint highlight |
| ... | ... | ... | ... | ... |
| 0:15-0:19 | CTA | 'COMMENT "POSITION"' | "Comment 'position' — we'll DM your category gap." | Mint bar slides up |
```

### 2.2 Storyboard

A frame-by-frame sketch in Figma (or a 9-cell grid on paper). Each cell = one beat. Annotate:
- Camera framing (wide / medium / close)
- Composition (centered / off-set / split)
- Color emphasis (mint pillar / black field / yellow accent)
- Transition in/out (fade / whip / glitch / drop)

### 2.3 Asset prep

| Asset | Source | Quality bar |
|-------|--------|-------------|
| Logo / mark | `brand-kit/logo/brand-mint-monogram.svg` (canonical, do not redraw) | Pixel-identical to source |
| Typography | Plus Jakarta Sans + JetBrains Mono (in `brand-kit/fonts/`) | Use ONLY these |
| Color palette | `BRAND-GUIDELINES.md` §3 | Mint-3 (`#10B981`) primary |
| Music | Musicbed / Artlist | Licensed only — never YouTube rips |
| SFX | Splice / freesound.org | CC0 or licensed |
| Stock footage | Artgrid / Filmsupply | 4K, ungraded |

### Owner
Creative Director + Motion Designer.

### Quality gate
✅ Script reads aloud in under target duration (×1.1 buffer for VO breath)
✅ Storyboard has 6+ frames for a 20s reel (one per beat)
✅ Every visual asset cited in script is in `brand-kit/`

---

## Phase 3 — Production (2-5 days)

Four production paths. Pick based on the brief.

### 3.A Code-rendered (our `v13`/`v14`/`v15`/`v16` system)

**When:** editorial reels, builder spotlights, manifesto posts, data carousels — anywhere you need:
- Pixel-perfect typography
- Repeatable brand application
- Fast iteration (5-10 min per render)
- Free

**How:**
1. Branch off existing build script (e.g. `build_cinematic.py`)
2. Edit the `BEATS` list (the script's storyboard in code form)
3. Update palette only if needed (default to brand mint)
4. Run `python3 build_<reel>.py`
5. Output goes to `out/<name>-<bpm>bpm.mp4`

**Files:**
- `brand-kit/video/v16-cinematic/build_cinematic.py` — Hollywood-tier reference
- `brand-kit/video/v13-hyderabad-empires/build_*.py` — editorial reference

**Owner:** Engineer / motion designer with Python knowledge.

### 3.B AI-generated (Higgsfield + Runway + Kling)

**When:** brand-reveal moments, cinematic b-roll, hero shots, product close-ups — where code can't produce the look.

**How:**
1. **Higgsfield** ($30-50/mo) — upload a still image, pick a camera move preset (dolly zoom / parallax / crash zoom / orbit). Export as 5-10s MP4. **Best for:** brand reveal moments, logo treatments, stylized product hero shots.
2. **Runway Gen-3 Alpha** ($35-95/mo) — text→video or image→video. **Best for:** AI b-roll for cutaways (e.g. "Hyderabad skyline at dusk, cinematic, anamorphic, 2k").
3. **Kling 2.0** ($10-20/mo) — short cinematic clips with physically-grounded motion. **Best for:** product / hand / object shots where physics matters.
4. **Sora** (ChatGPT Pro $200/mo) — highest quality, when accessible.

**Output:** drop the AI clips into `brand-kit/video/v_<name>/_assets/ai/` for the editor to compose with.

**Owner:** Creative Director picks the look; AE/Premiere editor composites.

### 3.C Live shoot

**When:** client-led, founder testimonials, product launches, locations. **Avoid for cold-start brand content** (brief bans founder face).

**Gear minimum for cinema-grade output:**
- Camera: Sony FX3 (rent ₹3-5K/day) or iPhone 15 Pro (free, very capable)
- Lens: 35mm + 85mm primes
- Lighting: 2× Aputure 60d + softbox + reflector
- Audio: Rode Wireless Pro or Lavalier — never camera mic
- Tripod + monitor

**Hyderabad rental:** Photoquip, Imagic, Lensbug — ₹3K-10K/day full kit.

**Owner:** Producer + DOP.

### 3.D Hybrid (most production reels)

Default mix: **code-rendered base** (text + brand frames) + **AI cutaways** (Higgsfield brand-reveal, Runway b-roll) + **stock footage** (Artgrid hero shots) + **live elements** (if applicable).

Assemble in After Effects or Premiere.

### Quality gate (all paths)
✅ Every text line fits within `SAFE_TEXT_W = 920` (`SPACING-GUIDELINES.md`)
✅ Mark uses canonical `brand-mint-monogram.svg` (don't redraw)
✅ Music has license proof (Musicbed receipt / Artlist track ID)
✅ AI clips have prompt + tool noted in `_assets/manifest.md`

---

## Phase 4 — Post-Production (1-2 days)

### 4.1 Edit

Cut to the music. **Beats first, dialogue second, visuals third.** Tools:
- **DaVinci Resolve** (free) — best for color + edit + Fusion motion graphics
- **CapCut Desktop** (free) — fastest for Reel-style cuts, auto-captions
- **Premiere Pro** ($23/mo) — industry default if hiring freelancers

**Cuts every 1.0-1.8s** for high-retention reels (per `PLAYBOOK-VIRAL-REELS.md` §1 mechanic #7).

### 4.2 Color grade

For code-rendered reels: skip (palette is already brand-locked).
For AI/shot footage: use DaVinci Resolve.
- Target: warm-black background `#070A09` ground · mint `#10B981` accents
- LUT: build a "Brand Mint" LUT once (.cube file) and apply to all footage
- Match grade across clips before final export

### 4.3 Sound design

Layer the audio in this order (top to bottom = quietest to loudest in mix):
1. **Background music bed** — at -18 dB during VO, -10 dB without
2. **Sub thumps** — on every beat-change cut (-12 dB)
3. **Whoosh transitions** — on whip-pans and scene breaks (-9 dB)
4. **Voice-over** — at -6 dB peak (always the loudest single element)
5. **Bell / impact accents** — on brand reveals (-9 dB)

### 4.4 Voice-over

Decision tree:
- **Skip VO entirely** (default for editorial/Pentagram-tier reels) → strongest brand move at cold-start
- **AI placeholder** (ElevenLabs Sarah, $22/mo) → for client review only, never ship
- **Real human** (Fiverr ₹500-3K, or local studio ₹2-5K/hr) → for any reel that will run paid

If using VO, post-process:
- High-pass 80 Hz · gentle boost 3-5 kHz · de-ess at 7 kHz
- Compress at 3:1 ratio with -18 dB threshold
- Final pass through Auphonic.com (free for short clips) for auto-loudness

### 4.5 Captions

Burn-in captions for accessibility + sound-off viewing. CapCut auto-captions are 90% accurate — manually fix the brand words (BrandMint, mint, Hyderabad, builder names).

Style: white fill + 4px black stroke, position 70-80% Y, font-size 56-64px, font Inter Bold.

### 4.6 Master export

Final spec for Instagram Reels:
```
Resolution:    1080 × 1920 (9:16)
Codec:         H.264 high profile L4.0
Bitrate:       ≥10 Mbps
Frame rate:    30 fps (60fps allowed but IG normalizes)
Audio:         AAC stereo 192 kbps
Loudness:      -14 LUFS integrated
Color:         Rec.709
Container:     .mp4 with +faststart
```

### Quality gate
✅ Master plays correctly on iPhone Safari + Android Chrome
✅ Text never overlaps IG UI overlays (top 250px / bottom 340px)
✅ Audio levels match Instagram (-14 LUFS)
✅ Watch from start to end without pause — does it land?

---

## Phase 5 — Ship (30 min)

### 5.1 Review

- **Internal review:** play once at full volume on phone (not desktop). Identify the one moment that feels weakest. Fix it.
- **Client review** (if applicable): upload to **Frame.io** ($15/mo per seat). Client adds time-coded comments. Address each.

### 5.2 Caption + meta

Copy the caption from `brand-kit/content/posts-ready/<post-slug>/caption.txt`. Verify:
- First line mirrors the hook (so IG feed preview shows the hook)
- DM keyword in CAPS in caption
- 15-20 hashtags at the end after `.\n.\n.\n` breathing dots

### 5.3 Cover frame

For Reels: pick a hero frame (mid-brand-reveal usually best). Save as 1080×1920 JPG. In IG: when uploading the Reel, tap "Cover" → "Add from camera roll" → pick the JPG.

### 5.4 Schedule

Use the time recommendation from `meta.txt`. Post manually at the recommended slot, or use **Meta Business Suite** (free) to schedule.

### 5.5 Engage

Within 30 min of posting:
- Reply to every comment for the first hour (algo signal)
- DM the answer for everyone who uses the DM keyword
- Pin the strongest comment

---

## The tool stack — full reference

### Software (monthly cost)

| Category | Tool | Cost (₹) | Cost ($) | Critical? |
|----------|------|---------|----------|-----------|
| Music license | **Musicbed** | ₹2,500 | $30 | YES — single biggest "premium" lift |
| AI camera moves | **Higgsfield** | ₹2,500-4,000 | $30-50 | High-leverage from month 2 |
| AI video | **Runway Gen-3** | ₹3,000-8,000 | $35-95 | Month 2+ |
| AI video (premium) | **Sora** (ChatGPT Pro) | ₹17,000 | $200 | Month 6+ |
| AI voice (drafts) | **ElevenLabs Creator** | ₹1,800 | $22 | Optional |
| Stock footage | **Artgrid** | ₹2,000 | $25 | Month 2+ |
| SFX library | **Splice Sounds** | ₹850 | $10 | Month 2+ |
| Editing | **Adobe Creative Cloud** | ₹4,700 | $55 | Month 2+ if hiring AE designer |
| Color grading | **DaVinci Resolve** | ₹0 | $0 | Always (free) |
| Editing (free) | **CapCut Desktop** | ₹0 | $0 | Always (free) |
| Client review | **Frame.io** | ₹1,300/seat | $15 | Month 3+ when serving clients |
| Project mgmt | **Notion** | ₹0-700 | $0-8 | Always |

**Cold-start budget (Month 1):** ₹2,500-5,000/mo (Musicbed + optional ElevenLabs)
**Production tier (Month 3):** ₹10,000-15,000/mo
**Studio tier (Month 6+):** ₹30,000-60,000/mo

### Hardware (one-time)

| For | Item | Cost (₹) |
|-----|------|---------|
| Voice-over recording | Shure SM7B + Cloudlifter + Focusrite Scarlett 2i2 | ₹65-75K |
| OR | Rode PodMic USB | ₹15-20K |
| Acoustic treatment | DIY foam + closet booth | ₹5-10K |
| Camera (if shooting) | iPhone 15 Pro (already have) or Sony FX3 rental ₹3-5K/day | varies |
| Lighting | 2× Aputure 60d + softbox + reflector | ₹60-90K (or rent ₹2K/day) |

### People (when to hire)

| Role | Hire when | Cost (₹/mo) | What they unlock |
|------|-----------|-------------|------------------|
| Part-time motion designer (AE) | Month 1 | ₹15-25K retainer | Polish on top of our code renders. Biggest single ROI. |
| Strategist + copywriter (you for now) | Month 3 | ₹30-60K | Hook + script + caption ownership |
| Producer | Month 6 | ₹40-80K | Frees creative time |
| Art Director | Year 2 | ₹80K-1.5L | Owns visual systems across clients |

---

## Templates

### Brief template
Saved at `brand-kit/content/_templates/brief.md` — copy + fill.

### Script template
Saved at `brand-kit/content/_templates/script.md` — copy + fill.

### Storyboard template
Figma file: TBD (create a 9-frame template + duplicate per post).

### Asset manifest
For each video, maintain `brand-kit/video/v_<name>/_assets/manifest.md`:

```markdown
# v_<name> — Asset Manifest

## AI clips
- `brand_reveal.mp4` — Higgsfield · prompt: "M monogram zooming in, mint gradient, slow dolly"
- `skyline.mp4` — Runway Gen-3 · prompt: "Hyderabad skyline at dusk, anamorphic, 2k, cinematic"

## Stock
- `kitchen-pan.mp4` — Artgrid · clip ID #AG-23847

## Music
- `posts-stay.wav` — Musicbed · "Quiet Engines" by [artist] · License: BM-2026-04

## Fonts
- Plus Jakarta Sans (in brand-kit/fonts/)
- JetBrains Mono (in brand-kit/fonts/)
```

---

## Quality checklist (run before every ship)

### Brand
- [ ] Logo uses `brand-mint-monogram.svg` (don't redraw)
- [ ] Fonts are Plus Jakarta Sans + JetBrains Mono only
- [ ] Mint accent is `#10B981` (mint-3) — not a custom green
- [ ] No founder face content
- [ ] No invented numbers / unverified stats
- [ ] No competitor callouts (named or implied)

### Composition
- [ ] All text fits inside SAFE_TEXT_W = 920px (no edge bleed)
- [ ] Top 250px and bottom 340px clear of critical text (IG UI safe zone)
- [ ] Vertical position of hero text ~50% of frame
- [ ] Cuts every 1.0-1.8s

### Motion
- [ ] No hard binary on/off animations (use ease curves)
- [ ] Camera moves are subtle (Ken Burns 1.00 → 1.04 max)
- [ ] Transitions between beats have continuity (no black flashes unless intentional)

### Audio
- [ ] Master at -14 LUFS
- [ ] VO at -6 dB peak (if VO present)
- [ ] Music ducks under VO when applicable
- [ ] No clipping on whoosh / impact sounds

### Delivery
- [ ] Caption.txt is copy-paste-ready (hashtags at end after `.\n.\n.\n`)
- [ ] DM keyword is in caps in caption
- [ ] Cover frame is selected and 1080×1920
- [ ] Best-time-to-post is honored (per `INSTAGRAM-BRIEF.md`)

---

## File-system reference

```
brand-kit/
├── BRAND-GUIDELINES.md         # The brand identity rules
├── INSTAGRAM-BRIEF.md          # The IG content brief (audience, pillars, voice)
├── PLAYBOOK-VIRAL-REELS.md     # 7 viral mechanics + hook formulas
├── SPACING-GUIDELINES.md       # Canvas safe areas + fit_to_width rules
├── PRODUCTION-WORKFLOW.md      # ← This document
├── content/
│   ├── INSTAGRAM-BRIEF.md      # (same as above, also linked here)
│   ├── 30-posts/               # Per-post specs (md)
│   └── posts-ready/            # Per-post ready-to-ship (cover, caption, meta)
├── fonts/                      # Brand fonts (Plus Jakarta + JetBrains + Inter)
├── logo/                       # Canonical brand marks (svg)
└── video/
    ├── v13-hyderabad-empires/  # Empires series (EP01-04)
    ├── v14-awareness/          # Awareness reel (no founder, viral mechanics)
    ├── v15-positioning/        # Agency-manifesto reel
    └── v16-cinematic/          # Hollywood-tier (60fps, whip-pans, glitch)
```

---

## Where to start (today)

1. Pick a single reel from the 30-post plan to ship this week
2. Fill the brief template (1 hr)
3. Adapt one of v13-v16 build scripts (the code is the storyboard) — 30 min
4. Render + iterate on the hook (the cheapest revision is hook copy) — 30 min
5. Skip VO (cold-start move)
6. Caption-paste, schedule, post
7. Reply to comments for the first hour

**That's the whole loop.**

---

*This document is versioned with the repo. Update it as the workflow evolves.*
