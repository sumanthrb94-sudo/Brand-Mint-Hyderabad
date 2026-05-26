"""
Brand Mint Studios — Thumbnail / Poster frame for v33.

Produces two PNG files for use as Reels thumbnail + IG grid tile:
  - brandmint-thumb-1080x1920.png   (vertical, full Reels frame)
  - brandmint-thumb-1080x1080.png   (square, IG grid tile)

Every brand element visible simultaneously: M monogram, BRAND MINT
wordmark, tagline, signature, atmospheric mint haze, 4 corner anchor
dots. Hand-composed — not a frame from the video — so weights and
contrasts are tuned specifically for static-image legibility.
"""
from __future__ import annotations
import math
from pathlib import Path

import cairosvg

# ---------- Palette ----------
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

# ---------- Mark ----------
def render_mark_svg(cx, cy, scale, glow_opacity=0.65):
    s = scale
    return f"""
    <circle cx="{cx}" cy="{cy}" r="{s*0.66:.1f}"
            fill="url(#markGlow)" opacity="{glow_opacity:.3f}"/>
    <circle cx="{cx}" cy="{cy}" r="{s*0.5:.1f}" fill="url(#bmDisc)"/>
    <path d="M{cx-s*0.219:.2f} {cy+s*0.187:.2f}
             V{cy-s*0.187:.2f}
             l{s*0.219:.2f} {s*0.187:.2f}
             l{s*0.219:.2f} {-s*0.187:.2f}
             v{s*0.375:.2f}"
          stroke="{INK}" stroke-width="{s*0.069:.2f}"
          stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    """

# ---------- Defs ----------
def defs_block(vig_strength=0.62):
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
    <linearGradient id="mintTextGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"  stop-color="{MINT_2}"/>
      <stop offset="60%" stop-color="{MINT_3}"/>
      <stop offset="100%" stop-color="{MINT_4}"/>
    </linearGradient>
    <radialGradient id="hazeGrad" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%"  stop-color="{MINT_3}" stop-opacity="0.55"/>
      <stop offset="60%" stop-color="{MINT_4}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="{MINT_4}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vig" cx="0.5" cy="0.5" r="0.9">
      <stop offset="0%"  stop-color="{INK}" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="{vig_strength:.3f}"/>
    </radialGradient>
  </defs>
"""

# ---------- Atmospheric haze (static, hand-placed) ----------
def haze_static(W, H):
    cx, cy = W / 2, H / 2
    placements = [
        (cx - 320, cy - 380, 360, 0.10),
        (cx + 280, cy - 240, 420, 0.08),
        (cx - 240, cy + 280, 380, 0.09),
        (cx + 320, cy + 360, 400, 0.07),
        (cx,        cy,        500, 0.06),
    ]
    return "".join(
        f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" '
        f'fill="url(#hazeGrad)" opacity="{a:.3f}"/>'
        for x, y, r, a in placements
    )

# ---------- Anchor dots at the 4 edges ----------
def edge_anchors(W, H, dot_radius=10):
    targets = [
        (W // 2,    280),         # top
        (W - 110,   H // 2),      # right
        (W // 2,    H - 280),     # bottom
        (110,       H // 2),      # left
    ]
    parts = []
    for (x, y) in targets:
        # Outer glow
        parts.append(
            f'<circle cx="{x}" cy="{y}" r="{dot_radius * 3.0:.1f}" '
            f'fill="url(#hazeGrad)" opacity="0.45"/>'
        )
        # Body
        parts.append(
            f'<circle cx="{x}" cy="{y}" r="{dot_radius:.1f}" '
            f'fill="{MINT_2}" opacity="0.95"/>'
        )
        # Specular highlight
        parts.append(
            f'<circle cx="{x + dot_radius * 0.35:.1f}" cy="{y - dot_radius * 0.35:.1f}" '
            f'r="{dot_radius * 0.30:.1f}" fill="{MINT_1}" opacity="1.0"/>'
        )
    return "".join(parts)

# ---------- VERTICAL 1080x1920 thumbnail ----------
def build_vertical():
    W, H = 1080, 1920
    mark_cx = W // 2
    mark_cy = int(H * 0.42)      # upper-mid third
    mark_scale = 360
    word_y     = int(H * 0.62)
    tag_kicker_y = int(H * 0.70)
    tag_main_y = int(H * 0.79)
    sig_y      = int(H * 0.92)
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
  {defs_block(vig_strength=0.62)}
  <rect width="{W}" height="{H}" fill="{INK}"/>

  <!-- Atmospheric haze -->
  {haze_static(W, H)}

  <!-- Edge anchor dots -->
  {edge_anchors(W, H, dot_radius=11)}

  <!-- M monogram -->
  {render_mark_svg(mark_cx, mark_cy, mark_scale, glow_opacity=0.55)}

  <!-- BRAND MINT wordmark -->
  <text x="{W//2}" y="{word_y}" font-family="{FONT_DISPLAY}" font-weight="800"
        font-size="86" letter-spacing="0.06em" fill="{PAPER}"
        text-anchor="middle">BRAND MINT</text>

  <!-- Tagline kicker -->
  <text x="{W//2}" y="{tag_kicker_y}" font-family="{FONT_MONO}" font-weight="600"
        font-size="24" letter-spacing="0.24em" fill="{PAPER}"
        text-anchor="middle" opacity="0.85">WE MINT BRANDS &#183; THAT</text>

  <!-- Compound. (mint gradient italic) -->
  <text x="{W//2}" y="{tag_main_y}" font-family="{FONT_DISPLAY}" font-weight="800"
        font-size="98" letter-spacing="0.02em" fill="url(#mintTextGrad)"
        text-anchor="middle" font-style="italic">compound.</text>

  <!-- Studio signature -->
  <text x="{W//2}" y="{sig_y}" font-family="{FONT_MONO}" font-weight="500"
        font-size="22" letter-spacing="0.32em" fill="{GHOST}"
        text-anchor="middle">STUDIOS &#8212; HYDERABAD &#183; brandmintstudios.in</text>

  <!-- Vignette -->
  <rect width="{W}" height="{H}" fill="url(#vig)"/>
</svg>"""
    return svg

# ---------- SQUARE 1080x1080 thumbnail ----------
def build_square():
    W, H = 1080, 1080
    mark_cx = W // 2
    mark_cy = int(H * 0.40)
    mark_scale = 320
    word_y     = int(H * 0.65)
    tag_main_y = int(H * 0.80)
    sig_y      = int(H * 0.93)
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
  {defs_block(vig_strength=0.60)}
  <rect width="{W}" height="{H}" fill="{INK}"/>

  <!-- Atmospheric haze (denser, smaller canvas) -->
  <circle cx="{W//2 - 220}" cy="{H//2 - 220}" r="280" fill="url(#hazeGrad)" opacity="0.10"/>
  <circle cx="{W//2 + 200}" cy="{H//2 - 160}" r="300" fill="url(#hazeGrad)" opacity="0.08"/>
  <circle cx="{W//2 - 180}" cy="{H//2 + 200}" r="260" fill="url(#hazeGrad)" opacity="0.09"/>
  <circle cx="{W//2 + 240}" cy="{H//2 + 240}" r="320" fill="url(#hazeGrad)" opacity="0.07"/>

  <!-- 4 edge anchor dots inside square frame -->
  <g>
    <circle cx="{W//2}" cy="120" r="30" fill="url(#hazeGrad)" opacity="0.5"/>
    <circle cx="{W//2}" cy="120" r="10" fill="{MINT_2}"/>
    <circle cx="{W//2 + 4}" cy="116" r="3" fill="{MINT_1}"/>

    <circle cx="{W - 100}" cy="{H//2}" r="30" fill="url(#hazeGrad)" opacity="0.5"/>
    <circle cx="{W - 100}" cy="{H//2}" r="10" fill="{MINT_2}"/>
    <circle cx="{W - 100 + 4}" cy="{H//2 - 4}" r="3" fill="{MINT_1}"/>

    <circle cx="{W//2}" cy="{H - 120}" r="30" fill="url(#hazeGrad)" opacity="0.5"/>
    <circle cx="{W//2}" cy="{H - 120}" r="10" fill="{MINT_2}"/>
    <circle cx="{W//2 + 4}" cy="{H - 124}" r="3" fill="{MINT_1}"/>

    <circle cx="100" cy="{H//2}" r="30" fill="url(#hazeGrad)" opacity="0.5"/>
    <circle cx="100" cy="{H//2}" r="10" fill="{MINT_2}"/>
    <circle cx="104" cy="{H//2 - 4}" r="3" fill="{MINT_1}"/>
  </g>

  <!-- M monogram -->
  {render_mark_svg(mark_cx, mark_cy, mark_scale, glow_opacity=0.55)}

  <!-- BRAND MINT wordmark -->
  <text x="{W//2}" y="{word_y}" font-family="{FONT_DISPLAY}" font-weight="800"
        font-size="68" letter-spacing="0.06em" fill="{PAPER}"
        text-anchor="middle">BRAND MINT</text>

  <!-- Compound. -->
  <text x="{W//2}" y="{tag_main_y}" font-family="{FONT_DISPLAY}" font-weight="800"
        font-size="68" letter-spacing="0.02em" fill="url(#mintTextGrad)"
        text-anchor="middle" font-style="italic">compound.</text>

  <!-- Signature -->
  <text x="{W//2}" y="{sig_y}" font-family="{FONT_MONO}" font-weight="500"
        font-size="18" letter-spacing="0.32em" fill="{GHOST}"
        text-anchor="middle">brandmintstudios.in</text>

  <!-- Vignette -->
  <rect width="{W}" height="{H}" fill="url(#vig)"/>
</svg>"""
    return svg


def main():
    # Vertical 1080x1920
    out_v = OUT_DIR / "brandmint-thumb-1080x1920.png"
    cairosvg.svg2png(bytestring=build_vertical().encode("utf-8"),
                     write_to=str(out_v), output_width=1080, output_height=1920)
    print(f"  wrote {out_v} ({out_v.stat().st_size//1024} KB)")

    # Square 1080x1080
    out_s = OUT_DIR / "brandmint-thumb-1080x1080.png"
    cairosvg.svg2png(bytestring=build_square().encode("utf-8"),
                     write_to=str(out_s), output_width=1080, output_height=1080)
    print(f"  wrote {out_s} ({out_s.stat().st_size//1024} KB)")


if __name__ == "__main__":
    main()
