"""
Brand Mint Studios — Static thumbnail for v42 ad video.

Generates two PNG files:
  - brandmint-ad-thumb-1080x1920.png  (Reels cover)
  - brandmint-ad-thumb-1080x1080.png  (IG grid tile)

Use as custom cover when uploading the ad MP4. Composition mirrors
the v42 ad's CTA scene: M monogram + BRAND MINT + compound. tagline
+ URL + "Start a project ->" mint pill.
"""
from __future__ import annotations
import math
from pathlib import Path
import cairosvg

INK    = "#070A09"
PAPER  = "#F5F1EA"
MINT_1 = "#DCFCEC"
MINT_2 = "#7CF6C8"
MINT_3 = "#10B981"
MINT_4 = "#047857"
GHOST  = "rgba(245,241,234,0.55)"

FONT_DISPLAY = "Plus Jakarta Sans"
FONT_MONO    = "JetBrains Mono"

HERE = Path(__file__).resolve().parent
OUT_DIR = HERE / "out"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def defs_block(vig=0.55):
    return f"""
  <defs>
    <linearGradient id="bmDisc" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"  stop-color="{MINT_2}"/>
      <stop offset="100%" stop-color="{MINT_3}"/>
    </linearGradient>
    <radialGradient id="markGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%"  stop-color="{MINT_2}" stop-opacity="0.85"/>
      <stop offset="55%" stop-color="{MINT_3}" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="{MINT_3}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="mintAdGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="{MINT_1}"/>
      <stop offset="50%"  stop-color="{MINT_2}"/>
      <stop offset="100%" stop-color="{MINT_3}"/>
    </linearGradient>
    <radialGradient id="vig" cx="0.5" cy="0.5" r="0.9">
      <stop offset="0%"  stop-color="{INK}" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="{vig:.2f}"/>
    </radialGradient>
  </defs>
"""


def render_mark(cx, cy, s, glow_a=0.55):
    return f"""
    <circle cx="{cx}" cy="{cy}" r="{s*0.66:.1f}"
            fill="url(#markGlow)" opacity="{glow_a:.3f}"/>
    <circle cx="{cx}" cy="{cy}" r="{s*0.5:.1f}" fill="url(#bmDisc)"/>
    <path d="M{cx-s*0.219:.2f} {cy+s*0.187:.2f}
             V{cy-s*0.187:.2f}
             l{s*0.219:.2f} {s*0.187:.2f}
             l{s*0.219:.2f} {-s*0.187:.2f}
             v{s*0.375:.2f}"
          stroke="{INK}" stroke-width="{s*0.069:.2f}"
          stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    """


def cta_pill(cx, cy, w=440, h=76):
    return f"""
    <rect x="{cx - w/2:.1f}" y="{cy - h/2:.1f}" width="{w}" height="{h}"
          rx="{h/2:.1f}" fill="{MINT_3}"/>
    <text x="{cx}" y="{cy + 12:.1f}" font-family="{FONT_DISPLAY}"
          font-weight="700" font-size="34" letter-spacing="0.04em"
          fill="{INK}" text-anchor="middle">Start a project &#8594;</text>
    """


def build_vertical():
    W, H = 1080, 1920
    cx = W // 2
    mark_s = 300
    mark_cy = int(H * 0.32)
    word_y  = int(H * 0.50)
    kicker_y = int(H * 0.56)
    tag_y    = int(H * 0.66)
    url_y    = int(H * 0.74)
    cta_y    = int(H * 0.86)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
  {defs_block(0.55)}
  <rect width="{W}" height="{H}" fill="{INK}"/>

  {render_mark(cx, mark_cy, mark_s)}

  <text x="{cx}" y="{word_y}" font-family="{FONT_DISPLAY}" font-weight="800"
        font-size="96" letter-spacing="0.06em" fill="{PAPER}"
        text-anchor="middle">BRAND MINT</text>

  <text x="{cx}" y="{kicker_y}" font-family="{FONT_MONO}" font-weight="600"
        font-size="22" letter-spacing="0.32em" fill="{MINT_2}"
        text-anchor="middle">STUDIOS &#183; HYDERABAD</text>

  <text x="{cx}" y="{tag_y}" font-family="{FONT_MONO}" font-weight="600"
        font-size="26" letter-spacing="0.22em" fill="{PAPER}"
        text-anchor="middle">WE MINT BRANDS THAT</text>

  <text x="{cx}" y="{tag_y + 110}" font-family="{FONT_DISPLAY}" font-weight="800"
        font-size="104" letter-spacing="0.02em" fill="url(#mintAdGrad)"
        text-anchor="middle" font-style="italic">compound.</text>

  <text x="{cx}" y="{url_y + 110}" font-family="{FONT_MONO}" font-weight="500"
        font-size="22" letter-spacing="0.32em" fill="{GHOST}"
        text-anchor="middle">brandmintstudios.in</text>

  {cta_pill(cx, cta_y)}

  <rect width="{W}" height="{H}" fill="url(#vig)"/>
</svg>"""


def build_square():
    W, H = 1080, 1080
    cx = W // 2
    mark_s = 200
    mark_cy = int(H * 0.28)
    word_y  = int(H * 0.52)
    tag_y   = int(H * 0.66)
    url_y   = int(H * 0.83)
    cta_y   = int(H * 0.92)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
  {defs_block(0.50)}
  <rect width="{W}" height="{H}" fill="{INK}"/>

  {render_mark(cx, mark_cy, mark_s)}

  <text x="{cx}" y="{word_y}" font-family="{FONT_DISPLAY}" font-weight="800"
        font-size="76" letter-spacing="0.06em" fill="{PAPER}"
        text-anchor="middle">BRAND MINT</text>

  <text x="{cx}" y="{word_y + 50}" font-family="{FONT_MONO}" font-weight="600"
        font-size="18" letter-spacing="0.32em" fill="{MINT_2}"
        text-anchor="middle">STUDIOS &#183; HYDERABAD</text>

  <text x="{cx}" y="{tag_y}" font-family="{FONT_DISPLAY}" font-weight="800"
        font-size="76" letter-spacing="0.02em" fill="url(#mintAdGrad)"
        text-anchor="middle" font-style="italic">compound.</text>

  <text x="{cx}" y="{url_y}" font-family="{FONT_MONO}" font-weight="500"
        font-size="18" letter-spacing="0.32em" fill="{GHOST}"
        text-anchor="middle">brandmintstudios.in</text>

  <rect width="{W}" height="{H}" fill="url(#vig)"/>
</svg>"""


def main():
    v = OUT_DIR / "brandmint-ad-thumb-1080x1920.png"
    s = OUT_DIR / "brandmint-ad-thumb-1080x1080.png"
    cairosvg.svg2png(bytestring=build_vertical().encode("utf-8"),
                     write_to=str(v), output_width=1080, output_height=1920)
    cairosvg.svg2png(bytestring=build_square().encode("utf-8"),
                     write_to=str(s), output_width=1080, output_height=1080)
    print(f"  wrote {v.name} ({v.stat().st_size // 1024} KB)")
    print(f"  wrote {s.name} ({s.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
