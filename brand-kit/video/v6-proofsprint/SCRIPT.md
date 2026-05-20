# BrandMint Studios — "Social Proof Sprint" (Script 8) — v6 build

*From `10_High_Conversion_Scripts.md`, Script 8 — "Social Proof Sprint
(30–45s Fast Cuts)". Selected because it's the only script in the set
that ships without a founder on camera, voice acting, or licensed
stock footage — all three of which the sandbox can't produce. What it
**does** need is rapid text + UI mockups + driving music, which is
exactly what this build engine produces well.*

**Selection rationale (from your matrix):**

> Scripts 3, 8 → Text/visual-first · None or minimal voice · Upbeat / Driving music

Script 8 wins over Script 3 because Script 3 is a static carousel —
this one is built for video.

---

## Stock-footage substitute

I can't fetch Pexels/Pixabay because outbound web is sandbox-blocked.
The closest equivalent the engine can produce is **animated UI
mockups** (custom CRM, analytics dashboard, browser-tab swap,
invoice-stack comparison) rendered as SVG and composited into each
beat. These read on a phone exactly the way real stock screen-
recording B-roll reads — clean SaaS surfaces with motion.

For the production version, swap the SVG mockups for actual screen
recordings of real client builds at the same beat timings — the build
script is structured so each beat's "visual" is a single function
call you can replace with a video clip.

---

## Seven beats, ~27s (extended from script's 23s for breathing room)

| # | Length | Headline                                  | Visual                                            |
|---|--------|-------------------------------------------|---------------------------------------------------|
| 1 | 3.5s   | `Built in 7 weeks.`                       | Animated CRM dashboard — sidebar + 4 stat tiles fade up |
| 2 | 3.5s   | `₹0 monthly SaaS fees.`                   | Three SaaS line-items striking through, mint ₹0 stamp |
| 3 | 3.5s   | `10,000 users. Zero crashes.`             | Line chart drawing in + uptime badge 99.97%       |
| 4 | 3.5s   | `Three tools → one platform.`             | Three browser tabs close, single dashboard opens  |
| 5 | 4.0s   | *"We finally own our tech."* — Founder, D2C wellness | Monogram tile + editorial quote |
| 6 | 3.0s   | `BrandMint Studios.`                      | Monogram + wordmark, dark ground                  |
| 7 | 5.5s   | `Custom software. Custom websites.` / `Hyderabad → Worldwide.` / `DM "BUILT" for a free scoping session.` | Stacked CTA card on dark ground |

Hard cuts between every beat (4-frame xfade, ~133ms — feels like a
true cut). Driving 4/4 percussion at 112 BPM glues them.

## Visual treatment — different from v3/v4/v5

The previous three cuts are *brand* cuts (philosophy, hooks,
restraint). This is a **digital-marketing-agency ad** cut — different
goal, different visual language:

| Lever                 | v3/v4/v5         | v6 (Script 8)                       |
|-----------------------|------------------|-------------------------------------|
| Background            | Black or cream   | Mostly cream, three dark beats      |
| Primary visual        | Type only        | Animated UI mockups behind the type |
| Tempo                 | Slow → fast      | Uniform driving (3.5s × 7)          |
| Music                 | Drone + 1 swell  | 4/4 kick + hi-hat + sub-bass + chord stab on each cut |
| Mint usage rule       | Twice (v5), or per-beat italic (v4) | Free — appears in every UI mockup as the accent |
| Voice                 | None / muted     | None (per script — visual-first)    |

This *should* feel different. It's a different lane of the brand —
the conversion-direct B2B-services ad, not the editorial anthem.

## Music — 4/4 driving (~112 BPM)

Per script: *Upbeat, driving, no voiceover.*

- Kick: 60 Hz sine, 80ms decay, every beat (535ms grid)
- Hi-hat: bandpassed noise at 8 kHz, 40ms decay, on off-beats
- Sub-bass: 55 Hz drone underneath
- Chord stab: perfect-fifth (A2 + E3), 200ms, on every beat-1 of a 4-beat bar
- Synth wash: pink noise highpassed at 6 kHz, swells once at beat 5 (the quote)

All synthesised — Meta-Reels-policy-safe.

## How to replace SVG mockups with real B-roll

Each beat's visual is rendered by a function in `build_proofsprint.py`.
Look for the comment `# SWAP:` — to swap to real footage:

```python
# Instead of returning an SVG inner, return a video clip path:
def visual_built_in_7_weeks(t, dur):
    return {"video": "/path/to/your/crm-screen-recording.mp4"}
```

Then `encode_beat_clip()` switches its ffmpeg input accordingly. (Left
as a stub in this build — the SVG path is what runs today.)

## What this script asks the brand to commit to

Read carefully — Script 8 says claims that need to be **true** before
this ad ships:

- "Built in 7 weeks" — must have a real case study at 7 weeks
- "10,000+ users. Zero crashes." — must be a real platform uptime
- "Client: 'We finally own our tech'" — must be a real quote from a
  real client who consents to attribution

The video as built renders these as *positioning claims* — replace
with verifiable case data before running paid. The vocabulary
blacklist (no *innovative*, *seamless*, *scalable*) is respected
throughout — no edits needed.
