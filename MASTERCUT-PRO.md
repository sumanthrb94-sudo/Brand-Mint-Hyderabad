# 🎬 MasterCut Pro — Brand Mint Reel Pipeline

End-to-end recipe for the Brand Mint talking-head reels: **Gemini Omni prompt → 3D subtitle layering → broadcast-ready vertical reel**, with the brand mark covering the AI watermark and a clean outro card.

This is the exact pipeline used to cut Episodes 9 and 11. Drop a raw Omni clip in, get a finished reel out.

---

## What it does (the "awesome layering")

1. **Subject matte** — `rembg` (u2net_human_seg) cuts the founder out of every frame.
2. **3D subtitle layers** — a green **crown phrase** sits ~50% above the head and ~50% *behind* it (true depth), with a white **front rail** + one **mint hero word** at chest level. Synced to the actual speech beats.
3. **Color grade** — lifted greens, warm shadows, gentle filmic curve.
4. **Steady** — no zoom, no shake (locked-off).
5. **Watermark cover** — the Brand Mint **M logo** sits bottom-right, directly over (and fully hiding) the Gemini sparkle.
6. **Outro card** — a clean branded end-card, safe margins, no edge crop.

---

## Quick start

```bash
cd marketing/video/mastercut-pro/scripts
./run.sh path/to/raw_omni_clip.mp4
# → produces ./final.mp4
```

### Requirements
- `ffmpeg`
- `python3` + `pip install rembg pillow numpy`
- `node` + `npm i playwright` + `npx playwright install chromium`

> The default `run.sh` points `NODE_PATH` / `PLAYWRIGHT_BROWSERS_PATH` at the Claude-web environment paths. On your own machine, just have `node` and `playwright` on PATH and they'll be picked up.

---

## Files

| File | Role |
|---|---|
| `scripts/matte.py` | Subject cutout per frame (rembg u2net_human_seg) |
| `scripts/caption-template.html` | The 3D caption layout — **edit text/timing here** |
| `scripts/render-caps.cjs` | Renders back/front caption layers (Playwright) |
| `scripts/composite.py` | Matte + 3D layers + grade (no zoom) |
| `scripts/outro.html` | Brand outro end-card |
| `scripts/run.sh` | One-command runner (frames → matte → layers → composite → encode) |

---

## Tuning per clip (the only thing that changes shot to shot)

Open `caption-template.html`:

- **Text** — `#beh1/2/3` (crown phrases) and `#fro1/2/3` (front rails, wrap the hero word in `<span class="hero">`).
- **Beat timing** — the `render(t)` function; match the `t0/t1` numbers to your VO's speech beats (detect with the `audio.wav` step or by ear).
- **50% embed** — if the founder is framed higher/lower, nudge each `#behN { top: ... }` so the crown's vertical center lands on the hairline. Rule of thumb: measure head-top Y from a matte, set the word's vertical center there.
- **Watermark cover** — `#bug` is pinned bottom-right at `right:80px; bottom:92px` with a 90px badge; that covers the Gemini sparkle at ~x552–628 / y1108–1184. If the watermark moves, move the bug.

---

## The Omni prompt series

Reusable, locked talking-head prompt. Swap only the spoken line + the subtitle split.

**Locked prompt skeleton** (see `../episode-09/10/11-omni-brief.md` for full filled-in versions):

> Generate a photorealistic, cinematic vertical 9:16 talking-head video at 1080×1920, 24fps, 8–10 seconds — the same confident, warm Indian founder in his early 30s, neat hair, clean tidy face, genuine beautiful expressions (warm smile that reaches the eyes, subtle brow lifts, alive micro-expressions); plain charcoal/forest-green tee, modern design-studio interior softly out of focus; **head-and-shoulders, centered, generous negative space above the hair and around the head** (required for the text); 50mm look, eye level, **locked-off and perfectly steady — no push, no zoom, no drift**; he says: "[YOUR LINE]"; flattering soft window key, healthy glowing skin, deep greens, filmic; warm closing smile, half-second silent hold. Clean audio, no music. **ABSOLUTELY NO on-screen text, captions, watermarks, logos, or graphics — completely clean plate.**

**3-beat subtitle formula:** each line = a short **crown phrase** (behind head) + a **front rail** ending on one **mint hero word**.

| Ep | Topic | Heroes |
|---|---|---|
| 08 | Web + app development | seen → paid → yours |
| 09 | Website + identity | impression → remember → forget you |
| 10 | Get found | decoration → seen → found |
| 11 | Marketing | waste → right people → you |

---

## Reuse in another repo / Claude session

Point Claude Code at this folder and say *"run MasterCut Pro on this clip."* Everything it needs — prompt skeleton, tuning rules, and scripts — is in here. No activation, no install step beyond the three tools above.
