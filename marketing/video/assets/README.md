# Video asset pack

Rendered from `../overlay-pack.html`. To change any of it, edit that file and:

    python3 -m http.server 8000            # from the repo root, so /fonts/ resolves
    NODE_PATH=$(npm root -g) node marketing/video/render-assets.cjs

Served over http rather than opened as a file because the type is self-hosted
in `/fonts/` — and because JetBrains Mono has no ₹ glyph, the pack repeats the
`unicode-range: U+20B9` fallback from `styles.css`. Render it any other way and
the price becomes a tofu box.

## Upload to Omni (optional)

| File | Use |
|---|---|
| `style-board.png` | Style/colour reference. The prompts already describe the grade, so this is belt-and-braces. Never attach anything with a logo — it tempts the model into drawing letterforms, which every prompt forbids. |

## Composite in post — transparent, 1080×1920, drop straight on

Each carries a bottom scrim that fades out by 68% height, so cream type stays
legible over the bright cream-linen footage without looking like a caption box.

| File | Copy |
|---|---|
| `ov-hook.png` | Your product deserves a *real* store. |
| `ov-features.png` | UPI · Cash on delivery · GST invoices · WhatsApp orders |
| `ov-price.png` | Online stores from ₹49,999 · fixed, GST extra |
| `ov-proof.png` | 4 brands shipped · 8+ years on every build |
| `ov-cta.png` | Talk to the person who *builds* it. + URL |
| `ov-lower-third.png` | Name plate for the founder cuts (V11–V18). No scrim — it has its own panel. |

## End cards — opaque, full frame

| File | Size |
|---|---|
| `endcard-9x16.png` | 1080×1920 — Reels, Stories |
| `endcard-1x1.png` | 1080×1080 — feed |
| `endcard-16x9.png` | 1920×1080 — in-stream, YouTube |

## Still missing, and only you can make it

`work/` has no screenshots of the four shipped stores. They cannot be captured
from here — every outbound host is blocked in this sandbox. Open each on a
desktop browser at 1440px, screenshot the top of the home page, crop 16:10, save
under `work/<id>.jpg` per `work/README.md`. Two seconds of a real store beats any
generated frame, and it fills a gap on the site's own portfolio cards at the same
time.
