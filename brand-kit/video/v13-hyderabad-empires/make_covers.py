"""
BrandMint Studios — v13 IG Reel COVER thumbnails.

Instagram displays a Reel cover in three places, each with a different
crop, so a cover that works has to be safe in ALL of them:

  1. Feed preview      9:16 full frame, play-button at Y=800-1100
  2. Profile grid      1:1 centred crop (Y≈420 → Y≈1500 visible)
  3. Reels tab         9:16 full frame, but caption text overlays Y=1500+

That means the HERO element must live in Y=540 → Y=1380 (the centre
840px of a 9:16 frame), and every cover should also work as a 1:1 crop.

This script renders three cover variants so you can A/B-test which
performs best on the grid:

  cover-question.jpg   "Can you rank the 8 biggest builders of Hyderabad?"
                       Curiosity-gap hook · highest click-through for
                       awareness/listicle reels.

  cover-eight.jpg      Huge "8" numeral · "EIGHT EMPIRES BY MSF"
                       Pattern-interrupt cover · strongest stop-scroll on
                       the Explore feed.

  cover-rank1.jpg      "#1 · MY HOME GROUP · 87 MSF"
                       Name-recognition cover · highest local relevance
                       (Hyderabadis recognise My Home immediately).

Run:    python3 make_covers.py
Out:    out/covers/cover-{name}.jpg
"""

from __future__ import annotations

from pathlib import Path

import cairosvg
from PIL import Image

# ------------------------------------------------------------ palette ---

W, H = 1080, 1920

INK = "#070a09"
INK_2 = "#10171a"
PAPER = "#f5f1ea"
PAPER_DIM = "#a3b2ac"
MINT = "#10b981"
MINT_2 = "#7cf6c8"
MINT_4 = "#047857"

FONT_DISPLAY = "DejaVu Sans, Inter, system-ui, sans-serif"
FONT_SERIF = "DejaVu Serif, Georgia, serif"
FONT_MONO = "DejaVu Sans Mono, Menlo, monospace"

BAR_H = 110

HERE = Path(__file__).parent
OUT = HERE / "out" / "covers"
OUT.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------- shared chrome ---

def background() -> str:
    """Warm-black ground + radial mint glow + slim letterbox bars + grain."""
    return f"""
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="{INK_2}"/>
          <stop offset="50%" stop-color="{INK}"/>
          <stop offset="100%" stop-color="{INK}"/>
        </linearGradient>
        <radialGradient id="glow" cx="0.5" cy="0.45" r="0.95">
          <stop offset="0%" stop-color="{MINT}" stop-opacity="0.13"/>
          <stop offset="55%" stop-color="{MINT_4}" stop-opacity="0.04"/>
          <stop offset="100%" stop-color="{INK}" stop-opacity="0"/>
        </radialGradient>
        <pattern id="grain" x="0" y="0" width="3" height="3"
                 patternUnits="userSpaceOnUse">
          <rect width="3" height="3" fill="{INK}"/>
          <circle cx="1.5" cy="1.5" r="0.4" fill="{PAPER}" opacity="0.04"/>
        </pattern>
      </defs>
      <rect width="{W}" height="{H}" fill="url(#bg)"/>
      <rect width="{W}" height="{H}" fill="url(#glow)"/>
      <rect width="{W}" height="{H}" fill="url(#grain)" opacity="0.6"/>
      <rect x="0" y="0" width="{W}" height="{BAR_H}" fill="#000"/>
      <rect x="0" y="{H - BAR_H}" width="{W}" height="{BAR_H}" fill="#000"/>
      <line x1="0" y1="{BAR_H}" x2="{W}" y2="{BAR_H}"
            stroke="{MINT}" stroke-opacity="0.25" stroke-width="1"/>
      <line x1="0" y1="{H - BAR_H}" x2="{W}" y2="{H - BAR_H}"
            stroke="{MINT}" stroke-opacity="0.25" stroke-width="1"/>
    """

def chrome() -> str:
    return f"""
      <text x="64" y="68" font-family="{FONT_MONO}" font-size="20"
            font-weight="700" letter-spacing="0.22em" fill="{PAPER}"
            opacity="0.78">@brandmint.studios</text>
      <text x="{W - 64}" y="68" font-family="{FONT_MONO}" font-size="20"
            font-weight="700" letter-spacing="0.22em" fill="{MINT}"
            text-anchor="end" opacity="0.85">EPISODE 01</text>
      <text x="{W//2}" y="{H - 40}" font-family="{FONT_MONO}" font-size="16"
            font-weight="700" letter-spacing="0.36em" fill="{PAPER_DIM}"
            text-anchor="middle">HYDERABAD'S EMPIRES · A SERIES</text>
    """

# ---------------------------------------------------- cover renderers ---

def cover_question() -> str:
    """Curiosity-gap question cover. Stop-scroll for awareness."""
    cx = W // 2
    return f"""<?xml version="1.0" encoding="UTF-8"?>
      <svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"
           viewBox="0 0 {W} {H}">
        {background()}

        <text x="{cx}" y="500" font-family="{FONT_MONO}" font-size="24"
              font-weight="700" fill="{MINT}" text-anchor="middle"
              letter-spacing="0.36em">HYDERABAD'S EMPIRES</text>
        <line x1="{cx - 70}" y1="530" x2="{cx + 70}" y2="530"
              stroke="{MINT}" stroke-width="2"/>

        <text x="{cx}" y="730" font-family="{FONT_SERIF}" font-size="108"
              font-weight="700" fill="{PAPER}" text-anchor="middle"
              font-style="italic">Can you rank</text>
        <text x="{cx}" y="850" font-family="{FONT_SERIF}" font-size="108"
              font-weight="700" fill="{PAPER}" text-anchor="middle"
              font-style="italic">Hyderabad's</text>
        <text x="{cx}" y="1000" font-family="{FONT_DISPLAY}" font-size="142"
              font-weight="900" fill="{MINT}" text-anchor="middle"
              letter-spacing="-0.01em">8 BIGGEST</text>
        <text x="{cx}" y="1120" font-family="{FONT_SERIF}" font-size="108"
              font-weight="700" fill="{PAPER}" text-anchor="middle"
              font-style="italic">builders?</text>

        <line x1="{cx - 60}" y1="1230" x2="{cx + 60}" y2="1230"
              stroke="{MINT}" stroke-width="2"/>
        <text x="{cx}" y="1300" font-family="{FONT_MONO}" font-size="22"
              font-weight="700" fill="{PAPER_DIM}" text-anchor="middle"
              letter-spacing="0.36em">RANKED  ·  BY SALES  ·  BY STORY</text>

        {chrome()}
      </svg>
    """

def cover_eight() -> str:
    """Pattern-interrupt cover — huge numeral '8' as the hero.
    Drops the subtitle entirely; the eyebrow + the numeral + the
    msf footnote carry the meaning."""
    cx = W // 2
    return f"""<?xml version="1.0" encoding="UTF-8"?>
      <svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"
           viewBox="0 0 {W} {H}">
        {background()}

        <text x="{cx}" y="500" font-family="{FONT_MONO}" font-size="26"
              font-weight="700" fill="{MINT}" text-anchor="middle"
              letter-spacing="0.36em">HYDERABAD'S EMPIRES</text>
        <line x1="{cx - 80}" y1="535" x2="{cx + 80}" y2="535"
              stroke="{MINT}" stroke-width="2"/>

        <!-- huge numeral, baseline tuned so glyph is centred Y≈900 -->
        <text x="{cx}" y="1150" font-family="{FONT_SERIF}" font-size="780"
              font-weight="700" fill="{MINT}" text-anchor="middle"
              letter-spacing="-0.04em">8</text>

        <text x="{cx}" y="1260" font-family="{FONT_MONO}" font-size="22"
              font-weight="700" fill="{PAPER_DIM}" text-anchor="middle"
              letter-spacing="0.36em">RANKED  ·  BY SALES  ·  BY STORY</text>

        <line x1="{cx - 50}" y1="1310" x2="{cx + 50}" y2="1310"
              stroke="{MINT}" stroke-width="2"/>

        <text x="{cx}" y="1380" font-family="{FONT_SERIF}" font-size="42"
              font-weight="700" fill="{PAPER}" text-anchor="middle"
              font-style="italic">~ 500 years of skyline, one city.</text>

        {chrome()}
      </svg>
    """

def cover_rank1() -> str:
    """Name-recognition cover — #1 Prestige Group · National Champion."""
    cx = W // 2
    return f"""<?xml version="1.0" encoding="UTF-8"?>
      <svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"
           viewBox="0 0 {W} {H}">
        {background()}

        <text x="{cx}" y="430" font-family="{FONT_MONO}" font-size="24"
              font-weight="700" fill="{MINT}" text-anchor="middle"
              letter-spacing="0.36em">HYDERABAD'S EMPIRES  ·  2026</text>
        <line x1="{cx - 70}" y1="460" x2="{cx + 70}" y2="460"
              stroke="{MINT}" stroke-width="2"/>

        <text x="{cx}" y="540" font-family="{FONT_MONO}" font-size="22"
              font-weight="700" fill="{PAPER_DIM}" text-anchor="middle"
              letter-spacing="0.36em">RANK</text>
        <text x="{cx}" y="780" font-family="{FONT_SERIF}" font-size="260"
              font-weight="700" fill="{MINT}" text-anchor="middle"
              letter-spacing="-0.02em">#1</text>

        <text x="{cx}" y="940" font-family="{FONT_DISPLAY}" font-size="116"
              font-weight="900" fill="{PAPER}" text-anchor="middle"
              letter-spacing="-0.01em">PRESTIGE</text>
        <text x="{cx}" y="1070" font-family="{FONT_DISPLAY}" font-size="116"
              font-weight="900" fill="{PAPER}" text-anchor="middle"
              letter-spacing="-0.01em">GROUP</text>

        <text x="{cx}" y="1180" font-family="{FONT_SERIF}" font-size="44"
              font-weight="700" fill="{MINT_2}" text-anchor="middle"
              font-style="italic">The National Champion</text>

        <text x="{cx}" y="1290" font-family="{FONT_MONO}" font-size="20"
              font-weight="700" fill="{PAPER_DIM}" text-anchor="middle"
              letter-spacing="0.26em">FOUNDED 1986  ·  200+ PROJECTS  ·  INDIA'S #1</text>

        <line x1="{cx - 50}" y1="1360" x2="{cx + 50}" y2="1360"
              stroke="{MINT}" stroke-width="2"/>
        <text x="{cx}" y="1420" font-family="{FONT_SERIF}" font-size="32"
              font-weight="700" fill="{PAPER}" text-anchor="middle"
              font-style="italic">See the full ranking →</text>

        {chrome()}
      </svg>
    """

# ----------------------------------------------------------- driver ---

COVERS = {
    "question": cover_question,
    "eight":    cover_eight,
    "rank1":    cover_rank1,
}

def render_cover(name: str, svg: str) -> Path:
    png_path = OUT / f"cover-{name}.png"
    jpg_path = OUT / f"cover-{name}.jpg"
    cairosvg.svg2png(bytestring=svg.encode(), output_width=W,
                     output_height=H, write_to=str(png_path))
    # Convert to JPG (IG prefers JPG covers; smaller upload + faster preview)
    img = Image.open(png_path).convert("RGB")
    img.save(jpg_path, "JPEG", quality=92, optimize=True, progressive=True)
    print(f"  ✓ {jpg_path.relative_to(HERE.parent.parent)}  "
          f"({jpg_path.stat().st_size // 1024} KB)")
    return jpg_path

def main() -> None:
    print(f"\nv13 · cover thumbnails · 1080×1920")
    for name, fn in COVERS.items():
        render_cover(name, fn())
    print()

if __name__ == "__main__":
    main()
