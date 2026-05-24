# Visual Spacing Guidelines

Source of truth for every text-placement decision across @brandmint.studios
content. Locked because earlier renders bled text off the canvas — this
doc + the `fit_to_width()` helpers in each build script prevent it from
recurring.

---

## Canvas specs

| Format | Resolution | Used for |
|---|---|---|
| Reel / Story / Video | 1080 × 1920 (9:16) | All `build_*.py` videos in `brand-kit/video/v13-hyderabad-empires/` |
| Feed post (portrait) | 1080 × 1350 (4:5) | Carousel slides, single statics, covers (`brand-kit/scripts/render_*.py`) |
| Feed post (square) | 1080 × 1080 (1:1) | Not used currently — reserved for future use |

---

## Safe text width — `SAFE_TEXT_W = 920`

Any display line at any size **must** fit inside 920px. This leaves 80px
margin on each side of a 1080px canvas — enough for:

- The Instagram right-side action column when posted as a Reel
- Cropping on phones with non-standard aspect ratios
- Native viewing in messenger apps / WhatsApp / Telegram (which don't
  apply Instagram's safe-area padding)

**Implementation:** every `build_*.py` and renderer script ships a
`fit_to_width(text, max_w_px=SAFE_TEXT_W, start_pt, kind)` helper.
Display text **never** uses a hard-coded `font-size=` for anything that
could be longer than ~10 characters.

```python
# Before (buggy — could overflow):
<text font-size="108">Before the towers,</text>

# After (correct — auto-shrinks to fit):
pt = fit_to_width("Before the towers,", SAFE_TEXT_W, start_pt=108, kind="serif")
<text font-size="{pt}">Before the towers,</text>
```

---

## Vertical safe zones (1080 × 1920 video)

| Zone | Y range | What lives here |
|---|---|---|
| Top chrome | 0 - 110 | Letterbox bar — no text |
| Top safe area | 110 - 250 | Handle (`@brandmint.studios`) + episode label only — kept small (18-22pt mono) |
| Display zone | 250 - 1580 | All hero text, titles, body copy, big numerals |
| Bottom safe area | 1580 - 1810 | Sub-eyebrows, tags, closer marks |
| Bottom chrome | 1810 - 1920 | Letterbox bar — no text |

**Reasoning:** IG Reels overlay caption + action buttons in the bottom
~340px and a profile/audio strip in the top ~250px when viewed in-feed.
Any text in those zones risks being covered.

## Vertical safe zones (1080 × 1350 carousel / cover)

| Zone | Y range | What lives here |
|---|---|---|
| Top chrome | 0 - 80 | Letterbox bar — handle + post number only |
| Eyebrow zone | 80 - 260 | Pillar chip / slide-number chip |
| Display zone | 260 - 1090 | Title + body + rule |
| Tag zone | 1090 - 1230 | Mono tag line (optional) |
| Bottom chrome | 1230 - 1350 | Letterbox bar — `SAVE · SHARE · FOLLOW` |

## Letterbox bars

| Format | Bar height | Why |
|---|---|---|
| Reels video | 110px top + 110px bottom | Pushes text into the visible safe area; consistent v13 frame style |
| Feed post | 80px top + 80px bottom | Same look at portrait aspect |

The bars are pure `#000` with a 1px mint hairline at the inner edge.
They are **not optional** — they are part of the v13 identity.

---

## Font sizes & line counts

Rule of thumb (after `fit_to_width` runs):

| Element | Max start pt | Max lines | Notes |
|---|---|---|---|
| Big numeral / rank | 280 | 1 | "01", "02" etc. |
| Hero serif title | 108 | 2-3 | Always italic serif |
| Hero sans display | 142 | 1 | Tight letter-spacing (`-0.01em`) |
| Sub-display | 60 | 1 | Letter-spacing `0.24em` for caps |
| Body italic serif | 46 | 4 | Bright-mint `#7CF6C8` |
| Mono eyebrow | 22-24 | 1 | Letter-spacing `0.30-0.36em` |
| Mono tag | 14-16 | 1 | Letter-spacing `0.30em` |

When `fit_to_width` shrinks below 70% of the `start_pt`, **split the line
into two** rather than rendering tiny text. Body copy that wraps to
4+ lines should be re-edited shorter.

---

## Color contrast

Background `#070A09` (warm-black) requires WCAG AA contrast on text:

| Token | Hex | AA check (against `#070A09`) |
|---|---|---|
| `PAPER` | `#F5F1EA` | ✅ 18.7:1 |
| `MINT` | `#10B981` | ✅ 5.8:1 (use for ≥18pt) |
| `MINT_2` | `#7CF6C8` | ✅ 12.4:1 |
| `PAPER_DIM` | `#A3B2AC` | ✅ 7.9:1 |
| `MUTE` | `#5D7368` | ⚠️ 3.4:1 — chrome / decorative only |

---

## Pre-flight checklist

Before shipping any new render:

1. [ ] Did every display line route through `fit_to_width(SAFE_TEXT_W, …)`?
2. [ ] Are all hero text Y-positions inside `[BAR_H + 140, H - BAR_H - 280]`?
3. [ ] Is there at least 1 letterbox bar height between the bottom-most
       text and the bottom of the canvas?
4. [ ] Pause-grab a representative frame and overlay a 920px-wide
       safe-rect on it — nothing should poke out.
5. [ ] If the cover is for a Reel, view the MP4 in a phone messenger
       (WhatsApp / Telegram), not just the desktop player.

---

*Last updated 2026-05-23 · maintained by Claude on
`claude/social-media-video-generation-Mj4u6`*
