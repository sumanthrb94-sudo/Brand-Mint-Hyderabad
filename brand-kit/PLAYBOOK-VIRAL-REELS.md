# BrandMint Studios — Viral Reel Playbook

**Source:** Pattern analysis of 15 viral Instagram Reels (Nov 2025 sample, range: 71 → 67,600 likes)
**Target:** @brandmint.studios — Hyderabad branding/digital agency
**Goal:** Organic growth via reels engineered around proven viral mechanics

---

## 1. The 7 Repeating Viral Mechanics (across the sample)

| # | Mechanic | Observed in | Why it works |
|---|----------|-------------|--------------|
| 1 | **Hook text on screen by frame 1** (no intro, no logo bumper) | 13 of 15 reels | Stops the scroll in <0.4s. The thumb hovers, eye reads, brain commits. |
| 2 | **High-contrast caption: white fill + thick black stroke** (3–5 px) OR white fill + black pill background | lavin_creator, vindy.andrianto, tankots42, theaustinschneider | Survives every bg (bright, dark, busy). The single biggest readability win. |
| 3 | **Pattern-interrupt hook formulas:** "X is dead, Y is in" / "POV [scenario]" / "How to [outcome] without [pain]" / "X is a lie. Here's the math." | thejamesbottomley_, vindy.andrianto, tankots42, designbrandshark | Pre-loaded narrative tension. Brain *needs* the resolution. |
| 4 | **Karaoke captions with keyword highlights** (yellow/lime on the 1–2 emotional words, white on the rest) | vedsforyou, justscorlling | Eye locks onto highlight → reads sentence → re-engages every 1.5s. |
| 5 | **Talking-head reels are letterboxed 16:9 inside 9:16** with hook in top black bar, CTA in bottom black bar | andress.clp, thejamesbottomley_, justscorlling | Cinematic, premium, leaves real estate for headline + CTA without overlapping face. |
| 6 | **Comment-trigger CTA** baked into the frame: `comment "WORD" for [free thing]` | andress.clp, aura.ankitbhati, thediscipline.global, your S5 ("DM 'BUILT'") | Comments boost ranking >> likes. This is *the* growth lever. |
| 7 | **Cuts every 1.0–1.5s** (jump-cut between sentences, B-roll, or zoom-punch on same shot) | tankots42, theaustinschneider, lavin_creator, katiesteckly | Retention. Instagram's algorithm watches the 3s, 7s, 15s retention curve — fast cuts hold it. |

---

## 2. The BrandMint Caption Spec Sheet (use these exactly)

```yaml
canvas:
  resolution: 1080x1920
  fps: 30
  duration_target: 18-25s   # sweet spot for completion + replay

hook_text:                  # frames 0:00–0:03
  position: top 18% of frame OR letterbox top bar
  font_family: Inter, SF Pro Display, or Plus Jakarta Sans
  font_weight: 800-900
  font_size: 76-92 px (relative to 1080w)
  fill: "#FFFFFF"
  stroke: "#000000"
  stroke_width: 5 px
  letter_spacing: -0.02em
  line_height: 1.05
  text_transform: none (sentence case)
  max_lines: 2
  max_chars_per_line: 28

body_caption:               # auto-captioned dialogue (karaoke)
  position: 70-75% Y (lower-mid, above logo/handle)
  font_family: Inter Bold or Montserrat Black
  font_size: 56-64 px
  fill_default: "#FFFFFF"
  fill_highlight: "#D4FF3A" (BrandMint mint) OR "#FFD60A" (yellow)
  stroke: "#000000"
  stroke_width: 4 px
  highlight_count: 1-2 words per sentence (the emotional/data word)
  reveal: word-by-word (CapCut: "Typewriter" or "Word by word")
  hold_per_word: 180-240 ms

title_card_pill:            # black background hook (tankots42 style)
  bg: "#0D0D0D"
  corner_radius: 24 px
  padding: 32 px horizontal, 20 px vertical
  text_color: "#FFFFFF"
  font_weight: 700
  used_for: scene transitions, list items, big claims

cta_bar:                    # frames last 3s
  position: bottom letterbox OR bottom 12% Y
  bg: "#0D0D0D" or "#D4FF3A"
  text: "DM 'BUILT' → free 48h scope"  (or comment-trigger)
  font_size: 52 px
  font_weight: 800
```

---

## 3. Transition & Motion Spec

```yaml
transitions:
  primary: hard cut (no fade, no dissolve)
  beat_change: whip-pan (left-to-right, 6 frames at 30fps)
  reveal: zoom-punch (scale 1.0 → 1.08 → 1.0 over 4 frames on the emphasis word)
  scene_break: black-frame flash (2 frames pure black)
  text_in:
    - typewriter (letter-by-letter, 30-50 ms per char) for hook
    - scale-bounce (0 → 1.1 → 1.0, ease-out, 350 ms) for title cards
    - slide-up + fade (24 px, 250 ms, ease-out) for body captions

cuts_per_second:
  talking_head: 1 cut every 1.2-1.8s
  motion_graphics: 1 cut every 0.8-1.2s
  storytelling/narrative: 1 cut every 2.0-2.5s

zoom_punches:
  trigger: emphasis word, money figure, year, % stat
  scale: 1.00 → 1.06 → 1.00
  duration: 6 frames (200 ms at 30fps)
```

---

## 4. Hook Formulas (steal these — they're proven)

1. **"X is dead. Y is in."** → `Logos are dead. Brand systems are in.`
2. **"POV: [scenario in 2026]"** → `POV: your competitor's website loads in 0.6s. Yours doesn't load.`
3. **"How to [outcome] without [pain]"** → `How to launch a brand in 48h without a 6-month design sprint.`
4. **"[Big number] is a lie. Here's the math."** → `'Just post consistently' is a lie. Here's the math.`
5. **"The X pillars of a $Y/mo [thing]"** → `The 5 pillars of a Hyderabad startup that doesn't get ignored.`
6. **"Most [founders/brands] don't know this"** → `Most Hyderabad founders don't know their site is invisible to Google.`
7. **"I [shocking action]. Here's what happened."** → `I rebuilt a Hyderabad startup's brand in 48h. Here's what happened.`
8. **"Rate my [thing] /10"** → `Rate this Hyderabad startup's brand /10.`
9. **"Your X looks like [absurd comparison]"** → `Your brand looks like 47 different brands had a fight.`
10. **"Comment 'WORD' and I'll send you [free thing]"** → `Comment 'BUILT' and I'll audit your brand in 48h, free.`

---

## 5. BrandMint Shot List Templates

### Template A — Motion Graphics Reel (designbrandshark style, no face needed)

```
0:00–0:02   Big bold headline appears (typewriter): "4X ROAS is a lie."
0:02–0:03   Italic kicker fades in: "Here's the math."
0:03–0:08   3 quick stat reveals (zoom-punch each):
            • "₹1L spent"  → "₹4L revenue" → "₹3L is just discount + refunds"
0:08–0:15   Solution slide: "We measure CAC payback, not ROAS theatre."
0:15–0:20   Brand portfolio flicker (5 logos, 0.3s each, with whip-pan between)
0:20–0:25   CTA card: "DM 'AUDIT' for a free brand teardown."
```

### Template B — Talking Head + Captions (lavin_creator style)

```
0:00       Hook caption on screen + you walk into frame mid-sentence
0:00–0:03  Hook: "Most Hyderabad startups have a Linktree, not a website."
0:03–0:10  Pain points (3 jump-cuts, captions update each cut):
           • "Linktrees don't rank on Google"
           • "Linktrees can't run ads"
           • "Linktrees scream 'side project'"
0:10–0:18  Solution: show brandmintstudios.in on phone screen, narrate value
0:18–0:22  Social proof: 2 client logos flash with metrics
0:22–0:25  CTA: "Comment 'WEBSITE' — I'll send you our 48h site brief."
```

### Template C — News-Style Viral (justscorlling style)

```
Letterboxed 16:9 in 9:16 canvas. Top + bottom black bars.
0:00–0:02  Top headline appears with yellow highlights:
           "While everyone copies global agencies, this Hyderabad studio
           ships brands in 48 hours."
0:02–0:15  B-roll: design process, client work, before/after
0:15–0:20  Stat callout: "47 brands shipped. 0 missed deadlines."
0:20–0:25  Bottom bar CTA: "DM 'BUILT' for a free scope."
```

---

## 6. Audio Strategy

```yaml
audio_picks:
  - Trending Bollywood instrumental (check Reels "trending audio" tab daily)
  - Lo-fi tech beat (low-energy talking head)
  - Cinematic riser into drop (for reveal-style reels)
  - Original audio (you talking) — required if you want comments/saves to count maximally

rules:
  - Use trending audio with <50k uses (still climbing, not saturated)
  - Cut your hook to land on the FIRST beat drop
  - Voice ducking: -8 dB on music when you speak
  - Final master: -14 LUFS (Instagram normalizes to this)
```

---

## 7. Posting & Distribution Checklist

```yaml
caption_first_line:
  - Mirror the hook (algorithm reads it)
  - End with a question OR a comment-trigger

caption_structure:
  L1: Hook restated (so it shows in feed preview)
  L2: blank
  L3-5: 2-3 sentences expanding the hook
  L6: blank
  L7: CTA — "Comment 'WORD' for X" or "DM us"
  L8: blank
  L9: 3-5 hashtags only (Instagram now penalizes 30-tag spam)

hashtags_hyderabad_agency:
  #hyderabadstartup #brandingagency #hyderabadbusiness
  #digitalmarketingindia #branddesign

posting_time_hyderabad:
  weekdays: 8:30-10:00 AM IST  OR  7:30-9:30 PM IST
  weekends: 11:00 AM IST

cadence: 4-5 reels/week minimum. Algorithm rewards velocity for the first 90 days.

cover_frame:
  - Pick a frame with the hook text fully visible
  - Add a custom cover in Canva: 1080x1920, hook text large, brand color block
  - Cover must read as a thumbnail (test at 100×178 px)
```

---

## 8. Editing Stack (recommended)

```yaml
primary: CapCut (mobile or desktop) — free, has karaoke captions, auto-beat-sync
backup: Premiere Pro + Captions panel + Essential Graphics templates
template_engine: Canva for static frames (export PNG, drop into CapCut as overlay)

capcut_workflow:
  1. Import vertical 1080x1920 footage
  2. Auto Captions → English (India) → review accuracy
  3. Style: "Bold White Stroke" preset
  4. Edit text → highlight 1-2 keywords per line in #D4FF3A
  5. Add hook text on track above captions (frames 0:00–0:03)
  6. Beat sync: tap-tap-tap to song beats → CapCut places markers
  7. Snap each cut to a beat marker
  8. Export 1080p, 30fps, H.264
```

---

## 9. Failure Modes to Avoid

```yaml
do_not:
  - Overlap hook text with auto-captions (keep 200+ px vertical gap)
  - Use thin fonts under 700 weight (illegible on mobile)
  - Skip the stroke/outline on light backgrounds
  - Make the first second silent or logo-only (autoplay-mute kills it)
  - Use horizontal aspect ratio without letterboxing
  - Post without a custom cover (the random auto-frame kills your grid)
  - Use trending audio that's already past 500k uses
  - Write captions in ALL CAPS for body text (only OK for 1-2 word hooks)
```

---

## 10. Weekly Content System for BrandMint

```yaml
mon: Talking Head — "X is dead, Y is in" hook, addresses Hyderabad-specific pain
tue: Motion Graphics — stat/myth-buster (designbrandshark template)
wed: Behind-the-scenes — 48h sprint timelapse, B-roll, on-screen captions
thu: Client carousel teaser (reel that drives to a carousel post)
fri: News-style — "This Hyderabad studio just..." (justscorlling template)
sat: Off / repurpose Reel to LinkedIn
sun: Story dump — polls, Q&A, drive DMs

monthly: 1 long-form "behind the brand" reel (45-60s) for saves & shares
```

---

## 11. Source Reels Studied (for reference)

| # | Handle | Niche | Likes | Pattern extracted |
|---|--------|-------|-------|-------------------|
| 1 | hritikchawlaa | Mindset | 71 | Mid-frame white caption, mountain B-roll |
| 2 | storefrontmediaco | Product reveal | 181 | Bold hook over product shot |
| 3 | tankots42 / wisprflow | SaaS | 682 | Black pill hook, top placement |
| 4 | theaustinschneider | Agency | 281 | Numbered list overlay, double caption layer |
| 5 | andress.clp | Sales course | 29 | Letterbox + comment-trigger CTA |
| 6 | vedsforyou | Brand story | 29 | Karaoke captions w/ yellow highlights |
| 7 | vai.bhaaavv | Storytelling | 397 | Fake REC UI, dramatic captions |
| 8 | wtfabhinxv | Editor/POV | 4,111 | "Rate my edit /10" engagement bait |
| 9 | lavin_creator | AI tech | 3,065 | White + thick black stroke, top hook |
| 10 | katiesteckly | Creator econ | 1,264 | Italic serif story caption |
| 11 | thejamesbottomley_ | Real estate | 114 | "X is dead, Y is in" hook formula |
| 12 | designbrandshark | Branding | n/a | Pure motion graphics, no face |
| 13 | vindy.andrianto | POV/AI | 31 | "POV [2026 scenario]" formula |
| 14 | chill.aht | Reposter | 4,677 | Outlier — raw native content |
| 15 | justscorlling | News/sports | 67,600 | News-style w/ yellow keyword highlights |

---

## 12. Hand-off Note for Claude Code

When this file is fed to Claude Code, the agent should:

1. Generate **5 ready-to-shoot reel scripts** (using formulas #1, #2, #4, #5, #10 above) tailored to BrandMint's actual service offering on brandmintstudios.in.
2. Build a **CapCut-importable text style preset JSON** matching the caption spec in §2.
3. Output a **batch of 10 cover-image Canva templates** (1080×1920) with hook text slots.
4. Generate a **30-day content calendar** in markdown table format following the §10 weekly system.

End of playbook.
