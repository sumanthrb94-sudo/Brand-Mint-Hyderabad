"""
BrandMint Studios — "What we ship" — 6-service tour video.

Same v6 production language: center-aligned + symmetrical mockups +
numpy beat-synced score + logo-poster intro for IG thumbnail.

Goes further than v6: 10 beats, more varied transitions per beat,
Instagram glyph in the chrome footer.

Output: out/brandmint-services.mp4
"""
import math
import subprocess
import wave
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import cairosvg
import numpy as np

ROOT = Path(__file__).resolve().parent
FRAMES = ROOT / "frames"
CLIPS = ROOT / "clips"
OUT = ROOT / "out"
for d in (FRAMES, CLIPS, OUT):
    d.mkdir(parents=True, exist_ok=True)

W, H = 1080, 1920
FPS = 30
CX = W / 2

# Tokens
BLACK = "#000000"
INK = "#0A0E0C"
CREAM = "#F5F1EA"
WHITE_CARD = "#FFFFFF"
LINE_LIGHT = "#E5E1D5"
MUTED = "#7C7468"
MINT_1 = "#D6F5E6"
MINT_2 = "#7CF6C8"
MINT_3 = "#10B981"
MINT_4 = "#047857"
GOLD = "#C9A14A"

DISPLAY = "Plus Jakarta Sans, Inter, system-ui, sans-serif"
MONO = "JetBrains Mono, ui-monospace, monospace"
BODY = "Inter, system-ui, sans-serif"


def ease_out_cubic(t): return 1 - (1 - t) ** 3
def ease_in_out(t): return 0.5 * (1 - math.cos(math.pi * t)) if 0 <= t <= 1 else (0 if t < 0 else 1)
def clamp(x, lo=0.0, hi=1.0): return max(lo, min(hi, x))
def overshoot(t):
    c1 = 1.70158
    return 1 + (c1 + 1) * (t - 1) ** 3 + c1 * (t - 1) ** 2


DEFS = f"""
<defs>
  <linearGradient id="mark" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="{MINT_2}"/>
    <stop offset="100%" stop-color="{MINT_3}"/>
  </linearGradient>
  <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur stdDeviation="6" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
</defs>
"""


def svg_wrap(bg, inner):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
        f'width="{W}" height="{H}">'
        f'<rect width="{W}" height="{H}" fill="{bg}"/>'
        f'{DEFS}{inner}'
        f'</svg>'
    )


def ig_glyph(x, y, color, size=28):
    """Inline Instagram glyph: rounded square + camera lens + flash dot."""
    rx_corner = size * 0.28
    return f"""
    <g transform="translate({x} {y})" stroke="{color}" fill="none" stroke-width="2.4">
      <rect x="0" y="0" width="{size}" height="{size}" rx="{rx_corner}"/>
      <circle cx="{size/2}" cy="{size/2}" r="{size * 0.22}"/>
      <circle cx="{size * 0.76}" cy="{size * 0.24}" r="{size * 0.055}" fill="{color}"/>
    </g>
    """


def chrome(dark=False):
    fg = CREAM if dark else MUTED
    # IG glyph + URL block, centered together
    url_text = "brandmint.studios"
    glyph_size = 28
    # Visual width estimate: glyph + 12px gap + text width (~286px at 22pt mono with 0.06em tracking)
    text_w = 286
    block_w = glyph_size + 14 + text_w
    block_x = CX - block_w / 2
    return f"""
    <text x="{CX}" y="80" text-anchor="middle" font-family="{MONO}" font-size="22"
          letter-spacing="0.18em" fill="{fg}" opacity="0.70">BRANDMINT STUDIOS</text>
    <g opacity="0.70">
      {ig_glyph(block_x, H - 78, fg, glyph_size)}
      <text x="{block_x + glyph_size + 14}" y="{H - 56}" font-family="{MONO}"
            font-size="22" letter-spacing="0.06em" fill="{fg}">{url_text}</text>
    </g>
    """


# ============================================================
# BEAT 0 — Logo poster intro (1.2s)
# ============================================================
def beat_logo(t, dur):
    """Static logo poster — IG thumbnails frame 0 = this."""
    fade_out = clamp(1 - max(0, t - 1.0) / 0.2) if t > 1.0 else 1.0
    cx, cy = W // 2, H // 2 - 40
    mr = 200

    inner = f"""
    {chrome(dark=True)}
    <g opacity="{fade_out}">
      <g filter="url(#softGlow)">
        <circle cx="{cx}" cy="{cy}" r="{mr}" fill="url(#mark)"/>
        <path d="M{cx - mr * 0.42} {cy + mr * 0.42} V {cy - mr * 0.38} l {mr * 0.42} {mr * 0.38} l {mr * 0.42} {-mr * 0.38} V {cy + mr * 0.42}" stroke="{INK}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </g>
      <text x="{CX}" y="{cy + mr + 140}" text-anchor="middle" font-family="{DISPLAY}"
            font-size="100" font-weight="600" letter-spacing="-0.02em"
            fill="{CREAM}">BrandMint Studios.</text>
      <text x="{CX}" y="{cy + mr + 215}" text-anchor="middle" font-family="{MONO}"
            font-size="22" letter-spacing="0.22em" fill="{CREAM}"
            opacity="0.7">CUSTOM SOFTWARE &#183; CUSTOM WEBSITES</text>
    </g>
    """
    return svg_wrap(BLACK, inner)


# ============================================================
# BEAT 1 — Title card: "What we ship." (2.5s)
# ============================================================
def beat_title(t, dur):
    op_a = ease_out_cubic(clamp(t / 0.5))
    op_b = ease_out_cubic(clamp((t - 0.4) / 0.6))
    op_c = ease_out_cubic(clamp((t - 0.9) / 0.5))

    inner = f"""
    {chrome(dark=True)}
    <text x="{CX}" y="540" text-anchor="middle" font-family="{MONO}" font-size="22"
          letter-spacing="0.22em" fill="{MINT_3}" opacity="{op_a * 0.85}">— THE WORK</text>
    <text x="{CX}" y="800" text-anchor="middle" font-family="{DISPLAY}" font-size="170"
          font-weight="600" letter-spacing="-0.03em" fill="{CREAM}"
          opacity="{op_b}">What we</text>
    <text x="{CX}" y="980" text-anchor="middle" font-family="{DISPLAY}" font-size="200"
          font-weight="700" font-style="italic" letter-spacing="-0.03em" fill="{MINT_3}"
          opacity="{op_c}" filter="url(#softGlow)">ship.</text>
    <text x="{CX}" y="1180" text-anchor="middle" font-family="{BODY}" font-size="32"
          fill="{CREAM}" opacity="{op_c * 0.7}">Six services. INR-priced. Fixed-scope.</text>
    """
    return svg_wrap(BLACK, inner)


# ============================================================
# Reusable: service-beat shell with eyebrow + name + price + mockup slot
# ============================================================
def service_beat(t, dur, letter, name, price_old, price_new, blurb, mockup_svg, dark=False):
    """Common composition for service beats A-F.

    Two prices: MRP (struck through) + launch price (mint, prominent),
    plus a '50% OFF' badge. Pricing parts pulse in sequence so the
    discount lands as a beat, not as ornament.
    """
    bg = "#06090A" if dark else CREAM
    fg = CREAM if dark else INK
    sub = "#a8a299" if dark else MUTED
    strike_col = "#C44747"  # red strike, brand-aligned warm warning hue

    letter_op = ease_out_cubic(clamp(t / 0.20))
    name_op = ease_out_cubic(clamp((t - 0.10) / 0.35))
    name_dy = 30 * (1 - name_op)
    blurb_op = ease_out_cubic(clamp((t - 0.65) / 0.30))
    blurb_dy = 16 * (1 - blurb_op)

    # Pricing animation: old fades up first (struck), then new + badge punch in
    old_op = ease_out_cubic(clamp((t - 0.30) / 0.30))
    new_prog = clamp((t - 0.45) / 0.25)
    new_op = ease_out_cubic(new_prog)
    new_scale = 0.85 + overshoot(new_prog) * 0.15 if new_prog > 0 else 0.85
    badge_op = ease_out_cubic(clamp((t - 0.55) / 0.30))
    badge_pulse = 1.0 + 0.05 * math.sin((t - 0.55) * 6) if t > 0.55 else 1.0

    mockup = mockup_svg(t, dur)

    # Strike line width — rough char-width estimate for the price-only string
    old_text_w = 18 * len(price_old) + 12

    pill_y_new = 480
    pill_w = 540
    # Adaptive font: shrink for longer prices (e.g. '₹37.5 K / mo')
    new_font = 44 if len(price_new) <= 8 else 36

    inner = f"""
    {chrome(dark=dark)}

    <!-- Eyebrow: letter -->
    <text x="{CX}" y="180" text-anchor="middle" font-family="{MONO}" font-size="22"
          letter-spacing="0.28em" fill="{MINT_3}" opacity="{letter_op * 0.92}">{letter} &#183; SERVICE</text>

    <!-- Name -->
    <g transform="translate(0 {name_dy})">
      <text x="{CX}" y="282" text-anchor="middle" font-family="{DISPLAY}" font-size="74"
            font-weight="600" letter-spacing="-0.025em" fill="{fg}"
            opacity="{name_op}">{name}</text>
    </g>

    <!-- 'STARTING FROM' eyebrow above the price stack -->
    <text x="{CX}" y="350" text-anchor="middle" font-family="{MONO}" font-size="18"
          letter-spacing="0.28em" fill="{sub}" opacity="{old_op * 0.85}">STARTING FROM</text>

    <!-- Old MRP (struck) — just the number, no 'From' prefix -->
    <g opacity="{old_op}">
      <text x="{CX}" y="400" text-anchor="middle" font-family="{MONO}" font-size="32"
            font-weight="500" letter-spacing="0.04em" fill="{sub}">{price_old}</text>
      <line x1="{CX - old_text_w / 2}" y1="390" x2="{CX + old_text_w / 2}" y2="390"
            stroke="{strike_col}" stroke-width="3" stroke-linecap="round"/>
    </g>

    <!-- New price pill (mint, prominent) — just the price, no prefix -->
    <g transform="translate({CX} {pill_y_new}) scale({new_scale}) translate({-CX} {-pill_y_new})"
       opacity="{new_op}">
      <rect x="{CX - pill_w / 2}" y="{pill_y_new - 42}" width="{pill_w}" height="84" rx="42"
            fill="{MINT_3}" filter="url(#softGlow)"/>
      <text x="{CX}" y="{pill_y_new + 16}" text-anchor="middle" font-family="{DISPLAY}"
            font-size="{new_font}" font-weight="700" letter-spacing="-0.01em" fill="{INK}">{price_new}</text>
    </g>

    <!-- 50% OFF · LAUNCH badge BELOW the pill -->
    <g transform="translate({CX} 555) scale({badge_pulse}) translate({-CX} -555)"
       opacity="{badge_op}">
      <rect x="{CX - 130}" y="540" width="260" height="36" rx="18"
            fill="{INK if not dark else MINT_3}" stroke="{MINT_3 if not dark else 'none'}" stroke-width="2"/>
      <text x="{CX}" y="565" text-anchor="middle" font-family="{MONO}" font-size="15"
            font-weight="700" letter-spacing="0.22em" fill="{CREAM if not dark else INK}">50% OFF &#183; LAUNCH</text>
    </g>

    <!-- Quote-flex tagline -->
    <text x="{CX}" y="610" text-anchor="middle" font-family="{MONO}" font-size="14"
          letter-spacing="0.18em" fill="{sub}" opacity="{badge_op * 0.65}">FINAL QUOTE PER SCOPE &#183; WE MATCH QUOTATIONS</text>

    <!-- Blurb -->
    <g transform="translate(0 {blurb_dy})">
      <text x="{CX}" y="650" text-anchor="middle" font-family="{BODY}" font-size="23"
            fill="{sub}" opacity="{blurb_op * 0.85}">{blurb}</text>
    </g>

    {mockup}
    """
    return svg_wrap(bg, inner)


# ============================================================
# Mockup A — Custom Websites: animated browser mockup
# ============================================================
def mockup_websites(t, dur):
    op = ease_out_cubic(clamp((t - 0.50) / 0.40))
    card_x, card_y = (W - 920) // 2, 590
    card_w, card_h = 920, 1100

    # Hero text animation
    hero_op = ease_out_cubic(clamp((t - 0.85) / 0.40))
    lighthouse_op = ease_out_cubic(clamp((t - 1.30) / 0.35))
    lighthouse_scale = 0.85 + overshoot(clamp((t - 1.30) / 0.4)) * 0.15

    return f"""
    <g opacity="{op}">
      <!-- Browser chrome -->
      <rect x="{card_x}" y="{card_y}" width="{card_w}" height="{card_h}" rx="22"
            fill="{WHITE_CARD}" stroke="{LINE_LIGHT}"/>
      <rect x="{card_x}" y="{card_y}" width="{card_w}" height="70" rx="22"
            fill="#F1ECE0"/>
      <rect x="{card_x}" y="{card_y + 35}" width="{card_w}" height="35" fill="#F1ECE0"/>
      <!-- 3 dots -->
      <circle cx="{card_x + 28}" cy="{card_y + 35}" r="8" fill="#E8C7C7"/>
      <circle cx="{card_x + 52}" cy="{card_y + 35}" r="8" fill="#E8DDB7"/>
      <circle cx="{card_x + 76}" cy="{card_y + 35}" r="8" fill="#CFE8D7"/>
      <!-- URL bar -->
      <rect x="{card_x + 110}" y="{card_y + 18}" width="700" height="34" rx="17"
            fill="{WHITE_CARD}" stroke="{LINE_LIGHT}"/>
      <text x="{card_x + 130}" y="{card_y + 42}" font-family="{MONO}" font-size="18"
            fill="{INK}">yourdomain · LIVE</text>

      <!-- Page hero -->
      <g opacity="{hero_op}">
        <text x="{card_x + 60}" y="{card_y + 220}" font-family="{DISPLAY}"
              font-size="76" font-weight="700" letter-spacing="-0.03em"
              fill="{INK}">Make</text>
        <text x="{card_x + 60}" y="{card_y + 310}" font-family="{DISPLAY}"
              font-size="76" font-weight="700" font-style="italic" letter-spacing="-0.03em"
              fill="{MINT_3}">your brand.</text>
        <text x="{card_x + 60}" y="{card_y + 380}" font-family="{BODY}" font-size="22"
              fill="{MUTED}">Senior-led. Hyderabad to global.</text>

        <!-- CTA pill -->
        <rect x="{card_x + 60}" y="{card_y + 420}" width="220" height="60" rx="30"
              fill="{INK}"/>
        <text x="{card_x + 170}" y="{card_y + 460}" text-anchor="middle"
              font-family="{DISPLAY}" font-size="22" font-weight="600"
              fill="{CREAM}">Get a build →</text>

        <!-- Mock content blocks -->
        <rect x="{card_x + 60}" y="{card_y + 560}" width="200" height="180" rx="14"
              fill="{MINT_1}"/>
        <rect x="{card_x + 280}" y="{card_y + 560}" width="200" height="180" rx="14"
              fill="#E8E2D0"/>
        <rect x="{card_x + 500}" y="{card_y + 560}" width="200" height="180" rx="14"
              fill="{MINT_1}"/>

        <!-- Footer line -->
        <rect x="{card_x + 60}" y="{card_y + 790}" width="500" height="14" rx="7"
              fill="{LINE_LIGHT}"/>
        <rect x="{card_x + 60}" y="{card_y + 820}" width="380" height="14" rx="7"
              fill="{LINE_LIGHT}"/>
      </g>

      <!-- Lighthouse 95 badge -->
      <g transform="translate({card_x + card_w - 180} {card_y + 940}) scale({lighthouse_scale})
                    translate({-(card_x + card_w - 180)} {-(card_y + 940)})"
         opacity="{lighthouse_op}">
        <circle cx="{card_x + card_w - 110}" cy="{card_y + 1000}" r="56" fill="{MINT_3}"/>
        <text x="{card_x + card_w - 110}" y="{card_y + 992}" text-anchor="middle"
              font-family="{MONO}" font-size="14" letter-spacing="0.14em"
              fill="{INK}" opacity="0.7">LH</text>
        <text x="{card_x + card_w - 110}" y="{card_y + 1020}" text-anchor="middle"
              font-family="{MONO}" font-size="32" font-weight="700"
              fill="{INK}">95</text>
      </g>
    </g>
    """


# ============================================================
# Mockup B — Custom Internal Tools: dashboard
# ============================================================
def mockup_tools(t, dur):
    op = ease_out_cubic(clamp((t - 0.50) / 0.40))
    tile_ops = [ease_out_cubic(clamp((t - 0.85 - i * 0.18) / 0.35)) for i in range(4)]

    card_x, card_y = (W - 920) // 2, 590
    card_w, card_h = 920, 1100

    # Sidebar
    items = ["Inbox", "Agents", "Logs", "Settings"]
    sb_svg = ""
    sb_w = 200
    for i, item in enumerate(items):
        active = (i == 1)
        fill = MINT_1 if active else "none"
        col = MINT_4 if active else "#bdb6a8"
        sb_svg += f"""
        <rect x="{card_x + 18}" y="{card_y + 110 + i * 64}" width="{sb_w - 36}" height="48"
              rx="10" fill="{fill}"/>
        <text x="{card_x + 38}" y="{card_y + 110 + i * 64 + 32}" font-family="{BODY}"
              font-size="20" font-weight="500" fill="{col}">{item}</text>
        """

    # Stat tiles
    tiles = [("REQUESTS · TODAY", "12,847", MINT_3),
             ("AVG LATENCY",      "184 ms", CREAM),
             ("AGENT RUNS",       "1,402",  MINT_3),
             ("ERROR RATE",       "0.04%",  CREAM)]
    tiles_svg = ""
    panel_x = card_x + sb_w + 32
    panel_w = card_w - sb_w - 64
    tw = (panel_w - 16) // 2
    th = 150
    for i, (lbl, val, col) in enumerate(tiles):
        c, r = i % 2, i // 2
        tx = panel_x + c * (tw + 16)
        ty = card_y + 110 + r * (th + 16)
        op_t = tile_ops[i]
        dy = (1 - op_t) * 16
        tiles_svg += f"""
        <g opacity="{op_t}" transform="translate(0 {dy})">
          <rect x="{tx}" y="{ty}" width="{tw}" height="{th}" rx="14"
                fill="#0F1311" stroke="#1F2A24"/>
          <text x="{tx + 20}" y="{ty + 34}" font-family="{MONO}" font-size="13"
                letter-spacing="0.16em" fill="#a8a299">{lbl}</text>
          <text x="{tx + 20}" y="{ty + 92}" font-family="{MONO}" font-size="42"
                font-weight="600" fill="{col}">{val}</text>
          <text x="{tx + 20}" y="{ty + 124}" font-family="{BODY}" font-size="14"
                fill="{MINT_3}">live</text>
        </g>
        """

    # Chart at the bottom of the panel
    chart_op = ease_out_cubic(clamp((t - 1.6) / 0.6))
    chart_y_pos = card_y + 460
    chart_w = panel_w
    chart_h = 280
    # Sample bars
    bar_heights = [0.4, 0.55, 0.62, 0.5, 0.68, 0.72, 0.6, 0.78, 0.82, 0.7, 0.88, 0.92]
    bars_svg = ""
    bar_w = (chart_w - 11 * 6) / len(bar_heights)
    for i, bh in enumerate(bar_heights):
        bh_drawn = bh * min(1, max(0, (t - 1.6 - i * 0.04) / 0.3))
        bx = panel_x + i * (bar_w + 6)
        by = chart_y_pos + chart_h - bh_drawn * chart_h
        bars_svg += f'<rect x="{bx}" y="{by}" width="{bar_w}" height="{bh_drawn * chart_h}" rx="4" fill="{MINT_3}"/>'

    return f"""
    <g opacity="{op}">
      <rect x="{card_x}" y="{card_y}" width="{card_w}" height="{card_h}" rx="22"
            fill="#08110E" stroke="#1F2A24"/>
      <text x="{card_x + card_w//2}" y="{card_y + 48}" text-anchor="middle"
            font-family="{MONO}" font-size="16" letter-spacing="0.16em"
            fill="#a8a299">{"&#9679;"} INTERNAL TOOL · CUSTOM BUILD</text>
      <line x1="{card_x + 20}" y1="{card_y + 76}" x2="{card_x + card_w - 20}"
            y2="{card_y + 76}" stroke="#1F2A24"/>
      {sb_svg}
      {tiles_svg}
      <g opacity="{chart_op}">
        <text x="{panel_x}" y="{chart_y_pos - 18}" font-family="{MONO}" font-size="13"
              letter-spacing="0.16em" fill="#a8a299">REQUESTS · LAST 12H</text>
        {bars_svg}
      </g>
    </g>
    """


# ============================================================
# Mockup C — Brand Systems: brand kit grid
# ============================================================
def mockup_brand(t, dur):
    op = ease_out_cubic(clamp((t - 0.50) / 0.40))
    item_ops = [ease_out_cubic(clamp((t - 0.85 - i * 0.10) / 0.35)) for i in range(6)]

    card_x, card_y = (W - 920) // 2, 590
    card_w, card_h = 920, 1100

    # 6 tile grid (3x2) — palette / type / mark / wordmark / motion / voice
    tw = (card_w - 80 - 16 * 2) // 3
    th = 280
    tiles = [
        ("PALETTE",  "color"),
        ("TYPE",     "Aa"),
        ("MARK",     "mono"),
        ("WORDMARK", "wordmark"),
        ("MOTION",   "motion"),
        ("VOICE",    "voice"),
    ]

    tile_svgs = ""
    for i, (lbl, kind) in enumerate(tiles):
        c, r = i % 3, i // 3
        tx = card_x + 40 + c * (tw + 16)
        ty = card_y + 100 + r * (th + 16)
        op_t = item_ops[i]
        dy = (1 - op_t) * 16

        content = ""
        if kind == "color":
            content = f"""
            <rect x="{tx + 24}" y="{ty + 56}" width="60" height="60" rx="30" fill="{MINT_3}"/>
            <rect x="{tx + 92}" y="{ty + 56}" width="60" height="60" rx="30" fill="{INK}"/>
            <rect x="{tx + 160}" y="{ty + 56}" width="60" height="60" rx="30" fill="{CREAM}" stroke="{LINE_LIGHT}"/>
            <rect x="{tx + 24}" y="{ty + 130}" width="60" height="60" rx="30" fill="{MINT_1}"/>
            <rect x="{tx + 92}" y="{ty + 130}" width="60" height="60" rx="30" fill="{GOLD}"/>
            """
        elif kind == "Aa":
            content = f"""
            <text x="{tx + tw // 2}" y="{ty + 200}" text-anchor="middle"
                  font-family="{DISPLAY}" font-size="160" font-weight="700"
                  fill="{INK}">Aa</text>
            """
        elif kind == "mono":
            mx, my = tx + tw // 2, ty + 165
            mr = 60
            content = f"""
            <circle cx="{mx}" cy="{my}" r="{mr}" fill="url(#mark)"/>
            <path d="M{mx - mr * 0.42} {my + mr * 0.42} V {my - mr * 0.38} l {mr * 0.42} {mr * 0.38} l {mr * 0.42} {-mr * 0.38} V {my + mr * 0.42}" stroke="{INK}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            """
        elif kind == "wordmark":
            content = f"""
            <text x="{tx + tw // 2}" y="{ty + 180}" text-anchor="middle"
                  font-family="{DISPLAY}" font-size="36" font-weight="600"
                  letter-spacing="-0.02em" fill="{INK}">BrandMint.</text>
            <text x="{tx + tw // 2}" y="{ty + 220}" text-anchor="middle"
                  font-family="{MONO}" font-size="12" letter-spacing="0.22em"
                  fill="{MUTED}">SINCE 2024</text>
            """
        elif kind == "motion":
            # 4 dots in a row with motion blur trails
            content = ""
            for j in range(5):
                content += f'<circle cx="{tx + 30 + j * 36}" cy="{ty + 165}" r="{14 - j * 1.5}" fill="{MINT_3}" opacity="{1.0 - j * 0.16}"/>'
        elif kind == "voice":
            content = f"""
            <text x="{tx + 24}" y="{ty + 140}" font-family="{DISPLAY}" font-size="28"
                  font-style="italic" fill="{INK}">"Senior.</text>
            <text x="{tx + 24}" y="{ty + 175}" font-family="{DISPLAY}" font-size="28"
                  font-style="italic" fill="{INK}">Specific.</text>
            <text x="{tx + 24}" y="{ty + 210}" font-family="{DISPLAY}" font-size="28"
                  font-style="italic" fill="{MINT_3}">Indian."</text>
            """

        tile_svgs += f"""
        <g opacity="{op_t}" transform="translate(0 {dy})">
          <rect x="{tx}" y="{ty}" width="{tw}" height="{th}" rx="16"
                fill="{WHITE_CARD}" stroke="{LINE_LIGHT}"/>
          <text x="{tx + 20}" y="{ty + 36}" font-family="{MONO}" font-size="13"
                letter-spacing="0.16em" fill="{MUTED}">{lbl}</text>
          {content}
        </g>
        """

    return f"""
    <g opacity="{op}">
      <rect x="{card_x}" y="{card_y}" width="{card_w}" height="{card_h}" rx="22"
            fill="{WHITE_CARD}" stroke="{LINE_LIGHT}"/>
      <text x="{card_x + card_w // 2}" y="{card_y + 60}" text-anchor="middle"
            font-family="{MONO}" font-size="16" letter-spacing="0.16em"
            fill="{MUTED}">{"&#9679;"} BRAND KIT · CUSTOM SYSTEM</text>
      {tile_svgs}
    </g>
    """


# ============================================================
# Mockup D — AI Integrations: chat / agent UI
# ============================================================
def mockup_ai(t, dur):
    op = ease_out_cubic(clamp((t - 0.50) / 0.40))

    card_x, card_y = (W - 920) // 2, 590
    card_w, card_h = 920, 1100

    # Conversation entries fade in one by one
    msg_ops = [ease_out_cubic(clamp((t - 0.85 - i * 0.30) / 0.35)) for i in range(4)]

    # Typing indicator on the last (agent) reply if not fully shown
    typing_op = 0
    if msg_ops[3] < 1.0 and msg_ops[3] > 0:
        typing_op = 1.0 if math.floor((t - 1.95) * 6) % 2 == 0 else 0.5

    return f"""
    <g opacity="{op}">
      <rect x="{card_x}" y="{card_y}" width="{card_w}" height="{card_h}" rx="22"
            fill="#08110E" stroke="#1F2A24"/>
      <text x="{card_x + card_w // 2}" y="{card_y + 60}" text-anchor="middle"
            font-family="{MONO}" font-size="16" letter-spacing="0.16em"
            fill="#a8a299">{"&#9679;"} AGENT · CUSTOM · CLAUDE</text>

      <!-- Message 1: user -->
      <g opacity="{msg_ops[0]}">
        <rect x="{card_x + card_w - 460}" y="{card_y + 110}" width="380" height="76"
              rx="20" fill="{MINT_3}"/>
        <text x="{card_x + card_w - 60}" y="{card_y + 156}" text-anchor="end"
              font-family="{BODY}" font-size="22" fill="{INK}">Triage today's inbox.</text>
      </g>

      <!-- Message 2: agent -->
      <g opacity="{msg_ops[1]}">
        <rect x="{card_x + 60}" y="{card_y + 210}" width="500" height="110"
              rx="20" fill="#0F1311" stroke="#1F2A24"/>
        <text x="{card_x + 80}" y="{card_y + 245}" font-family="{BODY}" font-size="20"
              fill="{CREAM}">Found 47 unread. Classified:</text>
        <text x="{card_x + 80}" y="{card_y + 278}" font-family="{MONO}" font-size="18"
              fill="{MINT_3}">→ 8 leads · 12 ops · 27 noise</text>
        <text x="{card_x + 80}" y="{card_y + 306}" font-family="{BODY}" font-size="18"
              fill="#a8a299">Drafting replies to the 8 leads now.</text>
      </g>

      <!-- Message 3: tool call -->
      <g opacity="{msg_ops[2]}">
        <rect x="{card_x + 60}" y="{card_y + 350}" width="500" height="100"
              rx="20" fill="#0F1311" stroke="{MINT_4}" stroke-dasharray="6 6"/>
        <text x="{card_x + 80}" y="{card_y + 385}" font-family="{MONO}" font-size="14"
              letter-spacing="0.16em" fill="{MINT_3}">TOOL · gmail.send_draft</text>
        <text x="{card_x + 80}" y="{card_y + 416}" font-family="{MONO}" font-size="18"
              fill="{CREAM}">to: arjun@d2cwellness.in</text>
        <text x="{card_x + 80}" y="{card_y + 440}" font-family="{MONO}" font-size="16"
              fill="#a8a299">subject: Re: discovery call</text>
      </g>

      <!-- Message 4: agent reply (with typing) -->
      <g opacity="{msg_ops[3]}">
        <rect x="{card_x + 60}" y="{card_y + 480}" width="500" height="76"
              rx="20" fill="#0F1311" stroke="#1F2A24"/>
        <text x="{card_x + 80}" y="{card_y + 525}" font-family="{BODY}" font-size="20"
              fill="{CREAM}">Done. 8 drafts ready for review.</text>
        <circle cx="{card_x + 470}" cy="{card_y + 525}" r="4" fill="{MINT_3}" opacity="{typing_op}"/>
        <circle cx="{card_x + 482}" cy="{card_y + 525}" r="4" fill="{MINT_3}" opacity="{typing_op * 0.7}"/>
        <circle cx="{card_x + 494}" cy="{card_y + 525}" r="4" fill="{MINT_3}" opacity="{typing_op * 0.4}"/>
      </g>

      <!-- Stats footer -->
      <text x="{card_x + 60}" y="{card_y + 970}" font-family="{MONO}" font-size="13"
            letter-spacing="0.16em" fill="#a8a299">EVAL COVERAGE</text>
      <rect x="{card_x + 60}" y="{card_y + 990}" width="{card_w - 120}" height="14" rx="7"
            fill="#1F2A24"/>
      <rect x="{card_x + 60}" y="{card_y + 990}" width="{(card_w - 120) * min(1, (t - 1.0) / 1.0) if t > 1.0 else 0}" height="14" rx="7" fill="{MINT_3}"/>
      <text x="{card_x + card_w - 60}" y="{card_y + 1040}" text-anchor="end"
            font-family="{MONO}" font-size="18" font-weight="600" fill="{MINT_3}">20 / 20 prompts</text>
    </g>
    """


# ============================================================
# Mockup E — Performance Media: ad creative + CTR chart
# ============================================================
def mockup_perf(t, dur):
    op = ease_out_cubic(clamp((t - 0.50) / 0.40))

    card_x, card_y = (W - 920) // 2, 590
    card_w, card_h = 920, 1100

    # Stat counters
    counter_a_op = ease_out_cubic(clamp((t - 0.85) / 0.4))
    counter_a_val = clamp((t - 0.85) / 0.6) * 3.4
    counter_b_op = ease_out_cubic(clamp((t - 1.10) / 0.4))
    counter_b_val = clamp((t - 1.10) / 0.6) * 61

    # Animated line chart drawing
    chart_prog = ease_out_cubic(clamp((t - 1.40) / 1.0))
    chart_x = card_x + 60
    chart_y_pos = card_y + 400
    chart_w = card_w - 120
    chart_h = 280
    # CTR curve
    pts = [(0.0, 0.7), (0.12, 0.65), (0.22, 0.55), (0.34, 0.5),
           (0.48, 0.4), (0.6, 0.32), (0.72, 0.25), (0.84, 0.18), (1.0, 0.10)]
    drawn = []
    for nx, ny in pts:
        if nx <= chart_prog:
            drawn.append((chart_x + nx * chart_w, chart_y_pos + ny * chart_h))
    path_d = ""
    if drawn:
        path_d = f"M {drawn[0][0]} {drawn[0][1]}"
        for px, py in drawn[1:]:
            path_d += f" L {px} {py}"

    return f"""
    <g opacity="{op}">
      <rect x="{card_x}" y="{card_y}" width="{card_w}" height="{card_h}" rx="22"
            fill="{WHITE_CARD}" stroke="{LINE_LIGHT}"/>
      <text x="{card_x + card_w // 2}" y="{card_y + 60}" text-anchor="middle"
            font-family="{MONO}" font-size="16" letter-spacing="0.16em"
            fill="{MUTED}">{"&#9679;"} CAMPAIGN · LAST 30D</text>

      <!-- Two stat blocks at the top -->
      <g opacity="{counter_a_op}">
        <text x="{card_x + 60}" y="{card_y + 170}" font-family="{MONO}" font-size="14"
              letter-spacing="0.16em" fill="{MUTED}">CTR LIFT</text>
        <text x="{card_x + 60}" y="{card_y + 260}" font-family="{MONO}" font-size="100"
              font-weight="700" fill="{MINT_3}">{counter_a_val:.1f}&#215;</text>
      </g>
      <g opacity="{counter_b_op}">
        <text x="{card_x + card_w // 2 + 50}" y="{card_y + 170}" font-family="{MONO}"
              font-size="14" letter-spacing="0.16em" fill="{MUTED}">CPL DROP</text>
        <text x="{card_x + card_w // 2 + 50}" y="{card_y + 260}" font-family="{MONO}"
              font-size="100" font-weight="700" fill="{INK}">{int(counter_b_val)}%</text>
      </g>

      <!-- Animated line chart -->
      <text x="{chart_x}" y="{chart_y_pos - 24}" font-family="{MONO}" font-size="13"
            letter-spacing="0.16em" fill="{MUTED}">CPL · DAY 1 → DAY 30</text>
      <line x1="{chart_x}" y1="{chart_y_pos + chart_h}" x2="{chart_x + chart_w}"
            y2="{chart_y_pos + chart_h}" stroke="{LINE_LIGHT}"/>
      <path d="{path_d}" fill="none" stroke="{MINT_3}" stroke-width="4"
            stroke-linecap="round" stroke-linejoin="round" filter="url(#softGlow)"/>

      <!-- Channels -->
      <g transform="translate({card_x + 60} {card_y + 760})">
        <text x="0" y="0" font-family="{MONO}" font-size="13"
              letter-spacing="0.16em" fill="{MUTED}">CHANNELS</text>
        <rect x="0" y="20" width="160" height="50" rx="25" fill="{MINT_1}"/>
        <text x="80" y="52" text-anchor="middle" font-family="{BODY}" font-size="18"
              font-weight="600" fill="{MINT_4}">Meta</text>
        <rect x="172" y="20" width="160" height="50" rx="25" fill="{MINT_1}"/>
        <text x="252" y="52" text-anchor="middle" font-family="{BODY}" font-size="18"
              font-weight="600" fill="{MINT_4}">Google</text>
        <rect x="344" y="20" width="160" height="50" rx="25" fill="{MINT_1}"/>
        <text x="424" y="52" text-anchor="middle" font-family="{BODY}" font-size="18"
              font-weight="600" fill="{MINT_4}">LinkedIn</text>
      </g>
    </g>
    """


# ============================================================
# Mockup F — SEO & Content Engines: content calendar
# ============================================================
def mockup_seo(t, dur):
    op = ease_out_cubic(clamp((t - 0.50) / 0.40))

    card_x, card_y = (W - 920) // 2, 590
    card_w, card_h = 920, 1100

    cells_ops = [ease_out_cubic(clamp((t - 0.85 - i * 0.04) / 0.35)) for i in range(16)]

    cell_w = (card_w - 80 - 3 * 16) // 4
    cell_h = 100

    # Week headers
    week_headers = ""
    for i in range(4):
        wx = card_x + 40 + i * (cell_w + 16) + cell_w // 2
        week_headers += (
            f'<text x="{wx}" y="{card_y + 130}" text-anchor="middle" '
            f'font-family="{MONO}" font-size="13" letter-spacing="0.16em" '
            f'fill="#a8a299">W{i + 1}</text>'
        )

    # 4x4 calendar cells
    cells = ""
    for r in range(4):
        for c in range(4):
            idx = r * 4 + c
            cx = card_x + 40 + c * (cell_w + 16)
            cy = card_y + 160 + r * (cell_h + 12)
            cells += (
                f'<g opacity="{cells_ops[idx]}">'
                f'<rect x="{cx}" y="{cy}" width="{cell_w}" height="{cell_h}" rx="12" '
                f'fill="#0F1311" stroke="#1F2A24"/>'
                f'<text x="{cx + 16}" y="{cy + 30}" font-family="{MONO}" font-size="14" '
                f'font-weight="600" fill="{MINT_3}">PUB</text>'
                f'<text x="{cx + 16}" y="{cy + 70}" font-family="{BODY}" font-size="14" '
                f'fill="#a8a299">Article {idx + 1}</text>'
                f'</g>'
            )

    # Keyword chips
    chips = ""
    keywords = ["custom crm india", "saas vs custom", "founder ops", "hyderabad dev"]
    for i, kw in enumerate(keywords):
        cx = card_x + 60 + i * 200
        chips += (
            f'<rect x="{cx}" y="{card_y + 920}" width="180" height="44" rx="22" '
            f'fill="{MINT_4}" opacity="0.45"/>'
            f'<text x="{cx + 90}" y="{card_y + 949}" text-anchor="middle" '
            f'font-family="{MONO}" font-size="14" letter-spacing="0.08em" '
            f'fill="{CREAM}">{kw}</text>'
        )

    sessions_val = int(min(312, (t - 1.4) * 250)) if t > 1.4 else 0

    return f"""
    <g opacity="{op}">
      <rect x="{card_x}" y="{card_y}" width="{card_w}" height="{card_h}" rx="22"
            fill="#08110E" stroke="#1F2A24"/>
      <text x="{card_x + card_w // 2}" y="{card_y + 60}" text-anchor="middle"
            font-family="{MONO}" font-size="16" letter-spacing="0.16em"
            fill="#a8a299">{"&#9679;"} CONTENT CALENDAR · Q4</text>
      {week_headers}
      {cells}
      <text x="{card_x + 60}" y="{card_y + 760}" font-family="{MONO}" font-size="13"
            letter-spacing="0.16em" fill="#a8a299">ORGANIC SESSIONS</text>
      <text x="{card_x + 60}" y="{card_y + 830}" font-family="{MONO}" font-size="60"
            font-weight="700" fill="{MINT_3}">+{sessions_val}%</text>
      <text x="{card_x + 60}" y="{card_y + 870}" font-family="{BODY}" font-size="18"
            fill="#a8a299">vs same quarter last year</text>
      {chips}
    </g>
    """


# ============================================================
# BEAT 8 — Bundle (centered card)
# ============================================================
def beat_bundle(t, dur):
    op_a = ease_out_cubic(clamp(t / 0.4))
    op_b = ease_out_cubic(clamp((t - 0.5) / 0.5))
    op_c = ease_out_cubic(clamp((t - 0.9) / 0.5))
    op_d = ease_out_cubic(clamp((t - 1.3) / 0.5))

    return svg_wrap(BLACK, f"""
    {chrome(dark=True)}
    <text x="{CX}" y="450" text-anchor="middle" font-family="{MONO}" font-size="22"
          letter-spacing="0.28em" fill="{MINT_3}" opacity="{op_a * 0.9}">— BUNDLE</text>
    <text x="{CX}" y="660" text-anchor="middle" font-family="{DISPLAY}" font-size="110"
          font-weight="600" letter-spacing="-0.03em" fill="{CREAM}"
          opacity="{op_b}">Bundle two</text>
    <text x="{CX}" y="790" text-anchor="middle" font-family="{DISPLAY}" font-size="110"
          font-weight="600" letter-spacing="-0.03em" fill="{CREAM}"
          opacity="{op_c}">services.</text>
    <text x="{CX}" y="990" text-anchor="middle" font-family="{DISPLAY}" font-size="170"
          font-weight="700" font-style="italic" letter-spacing="-0.03em" fill="{MINT_3}"
          opacity="{op_d}" filter="url(#softGlow)">10% off.</text>
    <text x="{CX}" y="1180" text-anchor="middle" font-family="{BODY}" font-size="28"
          fill="{CREAM}" opacity="{op_d * 0.65}">Discount applies to the smaller line item.</text>
    """)


# ============================================================
# BEAT 9 — CTA (logo + DM + URL + IG glyph)
# ============================================================
def beat_cta(t, dur):
    op_a = ease_out_cubic(clamp(t / 0.4))
    op_b = ease_out_cubic(clamp((t - 0.5) / 0.4))
    pill_t = clamp((t - 1.2) / 0.5)
    pill_op = ease_out_cubic(pill_t)
    pill_dy = (1 - pill_op) * 60

    cy = 700
    mr = 150

    return svg_wrap(BLACK, f"""
    {chrome(dark=True)}
    <g opacity="{op_a}" filter="url(#softGlow)">
      <circle cx="{CX}" cy="{cy}" r="{mr}" fill="url(#mark)"/>
      <path d="M{CX - mr * 0.42} {cy + mr * 0.42} V {cy - mr * 0.38} l {mr * 0.42} {mr * 0.38} l {mr * 0.42} {-mr * 0.38} V {cy + mr * 0.42}" stroke="{INK}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </g>
    <text x="{CX}" y="{cy + mr + 130}" text-anchor="middle" font-family="{DISPLAY}"
          font-size="86" font-weight="600" letter-spacing="-0.02em" fill="{CREAM}"
          opacity="{op_b}">BrandMint Studios.</text>
    <text x="{CX}" y="{cy + mr + 200}" text-anchor="middle" font-family="{MONO}"
          font-size="22" letter-spacing="0.22em" fill="{CREAM}"
          opacity="{op_b * 0.65}">HYDERABAD &#8594; WORLDWIDE</text>

    <g transform="translate(0 {pill_dy})" opacity="{pill_op}" filter="url(#softGlow)">
      <rect x="{CX - 380}" y="1280" width="760" height="160" rx="80" fill="{MINT_3}"/>
      <text x="{CX}" y="1380" text-anchor="middle" font-family="{DISPLAY}" font-size="42"
            font-weight="600" fill="{INK}">DM "BUILT" to scope your build</text>
    </g>

    <text x="{CX}" y="1560" text-anchor="middle" font-family="{BODY}" font-size="24"
          fill="{CREAM}" opacity="{op_b * 0.55}">Free 20-min architecture call · no pitch · just architecture.</text>
    """)


# ============================================================
# Beats table
# ============================================================
@dataclass
class Beat:
    id: str
    duration: float
    render: Callable[[float, float], str]
    xfade_dur: float = 0.13
    xfade_type: str = "fade"


def make_service(letter, name, price_old, price_new, blurb, mockup, dark=False):
    def _render(t, dur):
        return service_beat(t, dur, letter, name, price_old, price_new, blurb, mockup, dark)
    return _render


BEATS = [
    Beat("00-logo",      1.2, beat_logo,                        0.00,  "fade"),
    Beat("01-title",     2.6, beat_title,                       0.40,  "fade"),
    Beat("02-sites",     3.8, make_service("A", "Custom Websites",      "₹2 L",       "₹1 L",
                                            "Designed from zero. Lighthouse 95+.",
                                            mockup_websites, dark=False), 0.25, "slideleft"),
    Beat("03-tools",     3.8, make_service("B", "Custom Internal Tools","₹4 L",       "₹2 L",
                                            "Dashboards, CRMs, agents. You own the repo.",
                                            mockup_tools, dark=True),     0.25, "slideup"),
    Beat("04-brand",     3.8, make_service("C", "Brand Systems",         "₹1.5 L",    "₹75 K",
                                            "Marks, type, motion, voice. Shipped as a working site.",
                                            mockup_brand, dark=False),    0.25, "slideleft"),
    Beat("05-ai",        3.8, make_service("D", "AI Integrations",       "₹2 L",       "₹1 L",
                                            "Claude or Gemini. Auth, observability, eval included.",
                                            mockup_ai, dark=True),        0.30, "fadeblack"),
    Beat("06-perf",      3.8, make_service("E", "Performance Media",     "₹1 L / mo",  "₹50 K / mo",
                                            "Meta, Google, LinkedIn. Built and managed by us.",
                                            mockup_perf, dark=False),     0.25, "slideright"),
    Beat("07-seo",       3.8, make_service("F", "SEO + Content Engines", "₹75 K / mo", "₹37.5 K / mo",
                                            "Keyword strategy → article → technical fix sprints.",
                                            mockup_seo, dark=True),       0.25, "slideup"),
    Beat("08-bundle",    3.2, beat_bundle,                       0.30, "fadeblack"),
    Beat("09-cta",       5.8, beat_cta,                          0.40, "fade"),
]


# ============================================================
# Pipeline
# ============================================================
def render_beat(beat):
    bd = FRAMES / beat.id
    bd.mkdir(parents=True, exist_ok=True)
    n = int(round(beat.duration * FPS))
    for i in range(n):
        svg = beat.render(i / FPS, beat.duration)
        cairosvg.svg2png(
            bytestring=svg.encode("utf-8"),
            write_to=str(bd / f"f-{i:04d}.png"),
            output_width=W, output_height=H,
        )
    return bd, n


def encode_beat(beat, bd, n):
    out = CLIPS / f"{beat.id}.mp4"
    subprocess.run([
        "ffmpeg", "-y",
        "-framerate", str(FPS),
        "-i", str(bd / "f-%04d.png"),
        "-frames:v", str(n),
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p", "-r", str(FPS),
        str(out),
    ], check=True, capture_output=True)
    return out


def build_score(total):
    """numpy direct-synthesis score. Hits at every beat START (after xfade ends)."""
    sr = 48000
    n_samples = int(round(total * sr))

    # Beat boundaries (where the new beat is fully visible)
    beat_starts = [0.0]
    cum = BEATS[0].duration
    for i in range(1, len(BEATS)):
        beat_starts.append(cum)
        cum += BEATS[i].duration - BEATS[i].xfade_dur

    def adsr(n, atk_n, rel_n):
        env = np.ones(n)
        if atk_n:
            env[:atk_n] = np.linspace(0, 1, atk_n)
        if rel_n:
            env[-rel_n:] = np.linspace(1, 0, rel_n) ** 2
        return env

    # Drone bed
    t_axis = np.arange(n_samples) / sr
    drone = (0.18 * np.sin(2 * np.pi * 55 * t_axis)
             + 0.10 * np.sin(2 * np.pi * 82.4 * t_axis)
             + 0.08 * np.sin(2 * np.pi * 110 * t_axis))
    fade_n = int(0.8 * sr)
    drone[:fade_n] *= np.linspace(0, 1, fade_n)
    drone[-fade_n:] *= np.linspace(1, 0, fade_n)

    # Kick
    kick_n = int(0.20 * sr)
    kick = 0.85 * np.sin(2 * np.pi * 60 * np.arange(kick_n) / sr)
    kick *= adsr(kick_n, int(0.003 * sr), int(0.18 * sr))

    # Stab
    stab_n = int(0.40 * sr)
    st = np.arange(stab_n) / sr
    stab = (0.45 * np.sin(2 * np.pi * 110 * st)
            + 0.35 * np.sin(2 * np.pi * 164.8 * st)
            + 0.22 * np.sin(2 * np.pi * 220 * st))
    stab *= adsr(stab_n, int(0.005 * sr), int(0.36 * sr))

    # Riser (white noise band-passed)
    riser_n = int(0.30 * sr)
    rng = np.random.default_rng(seed=11)
    riser = rng.standard_normal(riser_n) * 0.45
    try:
        from scipy.signal import butter, lfilter
        b, a = butter(2, [400 / (sr / 2), 3500 / (sr / 2)], btype="band")
        riser = lfilter(b, a, riser)
    except Exception:
        pass
    riser *= np.linspace(0, 1, riser_n) ** 1.8

    # Cymbal (pink noise band-passed, slow swell)
    cym_n = int(2.5 * sr)
    cym = rng.standard_normal(cym_n) * 0.35
    try:
        from scipy.signal import butter, lfilter
        b, a = butter(2, [3500 / (sr / 2), 11000 / (sr / 2)], btype="band")
        cym = lfilter(b, a, cym)
    except Exception:
        pass
    cym_env = np.concatenate([
        np.linspace(0, 1, int(1.6 * sr)) ** 1.4,
        np.linspace(1, 0, cym_n - int(1.6 * sr)) ** 0.7,
    ])
    cymbal = cym * cym_env

    # Soft "chime" for the title reveal (high sine, fast attack)
    chime_n = int(0.6 * sr)
    chime = 0.35 * np.sin(2 * np.pi * 880 * np.arange(chime_n) / sr)
    chime += 0.18 * np.sin(2 * np.pi * 1320 * np.arange(chime_n) / sr)
    chime *= adsr(chime_n, int(0.005 * sr), int(0.55 * sr))

    out = drone.copy()

    def add_stem(stem, when):
        idx = int(round(when * sr))
        if idx < 0:
            stem = stem[-idx:]
            idx = 0
        end = min(n_samples, idx + len(stem))
        if end > idx:
            out[idx:end] += stem[:end - idx]

    # Per-beat scheduling
    for i, bt in enumerate(beat_starts):
        # Skip the very first beat (the logo poster intro) — it stays silent
        if i == 0:
            continue
        # Riser into the cut
        add_stem(riser, bt - 0.30)
        # Kick (5ms early) + chord stab
        add_stem(kick, max(0, bt - 0.005))
        add_stem(stab, bt)
        # Add a soft chime on the title reveal (beat 1)
        if i == 1:
            add_stem(chime, bt)

    # Cymbal swell on CTA beat
    add_stem(cymbal, beat_starts[-1] - 0.10)

    # Normalise to 0.95 peak
    peak = float(np.max(np.abs(out)))
    if peak > 0.95:
        out *= 0.95 / peak

    # Tail fade-out
    tail = int(0.6 * sr)
    out[-tail:] *= np.linspace(1, 0, tail)

    # Write 16-bit PCM stereo
    stereo = np.column_stack([out, out])
    int16 = (stereo * 32767).astype(np.int16)
    out_path = OUT / "score.wav"
    with wave.open(str(out_path), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(int16.tobytes())

    print(f"[score] beat-sync hits at: {[round(b, 2) for b in beat_starts]}")
    return out_path


def mux(clips, score):
    out_mp4 = OUT / "brandmint-services.mp4"
    inputs = []
    for c in clips:
        inputs += ["-i", str(c)]
    chain = [f"[{i}:v]format=yuv420p,fps={FPS},setsar=1[v{i}]" for i in range(len(clips))]
    last = "[v0]"
    cum = BEATS[0].duration
    xfade_parts = []
    for i in range(1, len(clips)):
        dur = BEATS[i].xfade_dur
        xf = BEATS[i].xfade_type
        offset = cum - dur
        out_label = f"[x{i}]" if i < len(clips) - 1 else "[vmix]"
        xfade_parts.append(
            f"{last}[v{i}]xfade=transition={xf}:duration={dur}:offset={offset:.3f}{out_label}"
        )
        last = out_label
        cum += BEATS[i].duration - dur
    final = f"{last}fade=t=out:st={cum - 0.6}:d=0.6[vout]"
    filtergraph = ";".join(chain + xfade_parts + [final])
    print(f"[mux] composition duration: {cum:.2f}s")
    subprocess.run([
        "ffmpeg", "-y", *inputs,
        "-i", str(score),
        "-filter_complex", filtergraph,
        "-map", "[vout]",
        "-map", f"{len(clips)}:a",
        "-c:v", "libx264", "-preset", "medium", "-crf", "22",
        "-tune", "stillimage",
        "-maxrate", "5M", "-bufsize", "10M",
        "-pix_fmt", "yuv420p", "-r", str(FPS),
        "-c:a", "aac", "-b:a", "160k", "-ar", "48000",
        "-movflags", "+faststart",
        "-shortest",
        str(out_mp4),
    ], check=True, capture_output=True)
    print(f"[done] {out_mp4} ({out_mp4.stat().st_size / 1024 / 1024:.2f} MB, ~{cum:.2f}s)")
    return out_mp4


def main():
    for d in (FRAMES, CLIPS):
        for c in list(d.iterdir()) if d.exists() else []:
            if c.is_file():
                c.unlink()
            elif c.is_dir():
                for f in c.iterdir():
                    f.unlink()
                c.rmdir()
    clips = []
    for b in BEATS:
        bd, n = render_beat(b)
        print(f"[render] {b.id}: {n} frames ({b.duration}s)")
        clips.append(encode_beat(b, bd, n))
    total = sum(b.duration for b in BEATS) - sum(b.xfade_dur for b in BEATS[1:])
    print(f"[score] for {total:.2f}s")
    score = build_score(total + 0.3)
    mux(clips, score)


if __name__ == "__main__":
    main()
