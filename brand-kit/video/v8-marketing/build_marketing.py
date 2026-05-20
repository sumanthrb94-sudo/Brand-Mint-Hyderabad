"""
BrandMint Studios — v8 — Marketing capabilities tour.

Companion to v7 (custom-software services). This cut covers BrandMint's
paid-creative + marketing side: Video Production, Meta Ads, Google +
YouTube Ads, LinkedIn Ads, Content Strategy, Reporting & Attribution.

Hook: "Your ads aren't broken. Your creative is."
CTA:  DM "ADS" to scope your campaign.

Each service beat visualises the actual TOOL the service operates in
(video editor timeline, Ads Manager grid, SERP + YT, B2B funnel,
Kanban board, attribution dashboard).

Output: out/brandmint-marketing.mp4 (priced)
        out/brandmint-marketing-no-prices.mp4 (clean variant)
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

import os

W, H = 1080, 1920
FPS = 30
CX = W / 2

# Set BMINT_NO_PRICES=1 to render a clean variant without the price-pill
# stack on each service beat. Output goes to a different filename so
# the priced version stays intact.
SHOW_PRICES = os.environ.get("BMINT_NO_PRICES", "") != "1"
OUTPUT_NAME = "brandmint-marketing.mp4" if SHOW_PRICES else "brandmint-marketing-no-prices.mp4"

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
    <text x="{CX}" y="500" text-anchor="middle" font-family="{MONO}" font-size="22"
          letter-spacing="0.22em" fill="{MINT_3}" opacity="{op_a * 0.85}">— THE PAID-CREATIVE SIDE</text>
    <text x="{CX}" y="760" text-anchor="middle" font-family="{DISPLAY}" font-size="114"
          font-weight="600" letter-spacing="-0.03em" fill="{CREAM}"
          opacity="{op_b}">Your ads aren't</text>
    <text x="{CX}" y="900" text-anchor="middle" font-family="{DISPLAY}" font-size="140"
          font-weight="700" font-style="italic" letter-spacing="-0.03em" fill="{CREAM}"
          opacity="{op_b}">broken.</text>
    <text x="{CX}" y="1080" text-anchor="middle" font-family="{DISPLAY}" font-size="114"
          font-weight="600" letter-spacing="-0.03em" fill="{CREAM}"
          opacity="{op_c}">Your creative</text>
    <text x="{CX}" y="1220" text-anchor="middle" font-family="{DISPLAY}" font-size="160"
          font-weight="700" font-style="italic" letter-spacing="-0.03em" fill="{MINT_3}"
          opacity="{op_c}">is.</text>
    <text x="{CX}" y="1360" text-anchor="middle" font-family="{BODY}" font-size="28"
          fill="{CREAM}" opacity="{op_c * 0.6}">Six capabilities. One senior team.</text>
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

    if not SHOW_PRICES:
        # Clean variant: no price stack. Name moves down, blurb sits
        # under it, mockup stays where it is. Lots more negative space.
        inner = f"""
    {chrome(dark=dark)}
    <text x="{CX}" y="200" text-anchor="middle" font-family="{MONO}" font-size="22"
          letter-spacing="0.28em" fill="{MINT_3}" opacity="{letter_op * 0.92}">{letter} &#183; SERVICE</text>
    <g transform="translate(0 {name_dy})">
      <text x="{CX}" y="350" text-anchor="middle" font-family="{DISPLAY}" font-size="84"
            font-weight="600" letter-spacing="-0.025em" fill="{fg}"
            opacity="{name_op}">{name}</text>
    </g>
    <g transform="translate(0 {blurb_dy})">
      <text x="{CX}" y="460" text-anchor="middle" font-family="{BODY}" font-size="28"
            fill="{sub}" opacity="{blurb_op * 0.9}">{blurb}</text>
    </g>
    {mockup}
    """
        return svg_wrap(bg, inner)

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

    <!-- New price pill (no filter glow; clean uniform 360 deg border) -->
    <g transform="translate({CX} {pill_y_new}) scale({new_scale}) translate({-CX} {-pill_y_new})"
       opacity="{new_op}">
      <rect x="{CX - pill_w / 2}" y="{pill_y_new - 42}" width="{pill_w}" height="84" rx="42" ry="42"
            fill="{MINT_3}"/>
      <text x="{CX}" y="{pill_y_new + 16}" text-anchor="middle" font-family="{DISPLAY}"
            font-size="{new_font}" font-weight="700" letter-spacing="-0.01em" fill="{INK}">{price_new}</text>
    </g>

    <!-- 50% OFF · LAUNCH badge BELOW the pill -->
    <g transform="translate({CX} 555) scale({badge_pulse}) translate({-CX} -555)"
       opacity="{badge_op}">
      <rect x="{CX - 130}" y="540" width="260" height="36" rx="18" ry="18"
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
    """Video Production — editor timeline with playhead sweep + waveform."""
    op = ease_out_cubic(clamp((t - 0.50) / 0.40))
    card_x, card_y = (W - 920) // 2, 590
    card_w, card_h = 920, 1100

    playhead_prog = ease_in_out(clamp((t - 0.85) / 1.6))
    timeline_x = card_x + 100
    timeline_w = card_w - 130
    playhead_x = timeline_x + playhead_prog * timeline_w

    # 3 tracks: V2, V1, A1
    track_y_start = card_y + 220
    track_h = 80
    tracks = [("V2", "video"), ("V1", "video"), ("A1", "audio")]
    tracks_svg = ""
    for i, (lbl, kind) in enumerate(tracks):
        ty = track_y_start + i * (track_h + 16)
        tracks_svg += (
            f'<rect x="{timeline_x}" y="{ty}" width="{timeline_w}" height="{track_h}" '
            f'rx="8" fill="#F1ECE0" stroke="{LINE_LIGHT}"/>'
            f'<text x="{card_x + 40}" y="{ty + track_h//2 + 6}" font-family="{MONO}" '
            f'font-size="14" font-weight="600" fill="{MUTED}">{lbl}</text>'
        )
        if kind == "video":
            for j in range(3):
                clip_x = timeline_x + 20 + j * 230
                tracks_svg += (
                    f'<rect x="{clip_x}" y="{ty + 8}" width="200" height="{track_h - 16}" '
                    f'rx="6" fill="url(#mark)" opacity="0.75"/>'
                )
        else:
            bar_count = 60
            bar_w = (timeline_w - 40) / bar_count
            for j in range(bar_count):
                h = 6 + 22 * abs(math.sin(j * 0.5 + 1))
                bx = timeline_x + 20 + j * bar_w
                by = ty + track_h / 2 - h / 2
                color = MINT_3 if (t > 0.85 and bx < playhead_x) else MUTED
                op_bar = 1 if color == MINT_3 else 0.32
                tracks_svg += f'<rect x="{bx}" y="{by}" width="{bar_w - 1}" height="{h}" fill="{color}" opacity="{op_bar}"/>'

    # Timecode counter
    tc_seconds = playhead_prog * 18.13
    tc_secs = int(tc_seconds)
    tc_frames = int((tc_seconds % 1) * 24)
    tc_str = f"00:00:{tc_secs:02d}:{tc_frames:02d}"

    live_pulse = 1.0 + 0.08 * math.sin(t * 5) if t > 2.0 else 1.0

    return f"""
    <g opacity="{op}">
      <rect x="{card_x}" y="{card_y}" width="{card_w}" height="{card_h}" rx="22"
            fill="{WHITE_CARD}" stroke="{LINE_LIGHT}"/>
      <text x="{card_x + card_w // 2}" y="{card_y + 50}" text-anchor="middle"
            font-family="{MONO}" font-size="14" letter-spacing="0.16em"
            fill="{MUTED}">{"&#9679;"} TIMELINE &#183; CUSTOM EDIT</text>

      <text x="{card_x + 40}" y="{card_y + 110}" font-family="{MONO}" font-size="18"
            font-weight="600" fill="{INK}">Reel_03_v4.prproj</text>
      <g transform="translate({card_x + 700} {card_y + 96}) scale({live_pulse}) translate({-(card_x + 700)} {-(card_y + 96)})">
        <rect x="{card_x + 620}" y="{card_y + 80}" width="160" height="34" rx="17" ry="17" fill="{MINT_3}"/>
        <text x="{card_x + 700}" y="{card_y + 102}" text-anchor="middle" font-family="{MONO}"
              font-size="13" font-weight="700" letter-spacing="0.10em" fill="{INK}">&#9679; Reel 03 v4 LIVE</text>
      </g>

      {tracks_svg}

      <line x1="{playhead_x}" y1="{track_y_start - 14}" x2="{playhead_x}"
            y2="{track_y_start + 3 * (track_h + 16) - 16}" stroke="{MINT_4}" stroke-width="2.5"/>
      <polygon points="{playhead_x - 8},{track_y_start - 18} {playhead_x + 8},{track_y_start - 18} {playhead_x},{track_y_start - 6}" fill="{MINT_4}"/>

      <rect x="{card_x + card_w - 220}" y="{card_y + 590}" width="190" height="50" rx="10" ry="10" fill="{INK}"/>
      <text x="{card_x + card_w - 125}" y="{card_y + 624}" text-anchor="middle" font-family="{MONO}"
            font-size="22" font-weight="600" fill="{MINT_3}">{tc_str}</text>

      <text x="{card_x + 40}" y="{card_y + 740}" font-family="{MONO}" font-size="13"
            letter-spacing="0.16em" fill="{MUTED}">RENDER QUEUE</text>
      <rect x="{card_x + 40}" y="{card_y + 760}" width="{card_w - 80}" height="60" rx="12" ry="12"
            fill="{MINT_1}" stroke="{MINT_3}" stroke-opacity="0.3"/>
      <text x="{card_x + 60}" y="{card_y + 798}" font-family="{MONO}" font-size="18"
            font-weight="600" fill="{MINT_4}">&#8594; Reel_03_v4.mp4  ProRes  1080&#215;1920</text>

      <text x="{card_x + 40}" y="{card_y + 900}" font-family="{BODY}" font-size="20" fill="{INK}">Shot. Edited. <tspan font-weight="600" fill="{MINT_3}">Delivered.</tspan></text>
      <text x="{card_x + 40}" y="{card_y + 945}" font-family="{BODY}" font-size="18"
            fill="{MUTED}">Reels, ad cuts, brand films, hero loops.</text>
    </g>
    """


# ============================================================
# Mockup B — Custom Internal Tools: dashboard
# ============================================================
def mockup_tools(t, dur):
    """Meta Ads — 2x2 ad-set tiles with CPM/CTR + spend bar fill."""
    op = ease_out_cubic(clamp((t - 0.50) / 0.40))
    card_x, card_y = (W - 920) // 2, 590
    card_w, card_h = 920, 1100

    tile_ops = [ease_out_cubic(clamp((t - 0.85 - i * 0.12) / 0.35)) for i in range(4)]
    spend_prog = ease_out_cubic(clamp((t - 1.10) / 1.0))
    spend_val = int(spend_prog * 48210)
    cpm_val = 412 - int(spend_prog * (412 - 318))
    ctr_val = 1.4 + spend_prog * (2.7 - 1.4)

    # Spend bar geometry
    bar_x = card_x + 40
    bar_w = card_w - 80
    bar_y = card_y + 200

    # 4 ad-set tiles (2x2)
    panel_x = card_x + 40
    panel_y = card_y + 270
    tw = (card_w - 80 - 16) // 2
    th = 200
    ad_names = ["DEAL · spring_01", "RETARGET · cart_drop",
                "AWARENESS · ICP_03", "CREATIVE · UGC_07"]
    tiles_svg = ""
    for i, name in enumerate(ad_names):
        c, r = i % 2, i // 2
        tx = panel_x + c * (tw + 16)
        ty = panel_y + r * (th + 16)
        op_t = tile_ops[i]
        dy = (1 - op_t) * 14
        is_active = (i == 0)
        border = MINT_3 if is_active else "#1F2A24"
        bw = 2 if is_active else 1
        # Sparkline points
        spark_pts = []
        for j in range(8):
            sx = tx + 16 + j * 18
            sy = ty + 140 + 8 * math.sin(j * 0.9 + i)
            spark_pts.append(f"{sx},{sy}")
        spark = "M " + " L ".join(spark_pts)
        tiles_svg += f"""
        <g opacity="{op_t}" transform="translate(0 {dy})">
          <rect x="{tx}" y="{ty}" width="{tw}" height="{th}" rx="14" ry="14"
                fill="#08110E" stroke="{border}" stroke-width="{bw}"/>
          <rect x="{tx + 16}" y="{ty + 16}" width="60" height="60" rx="10" ry="10"
                fill="{MINT_4}" opacity="0.5"/>
          <text x="{tx + 90}" y="{ty + 38}" font-family="{MONO}" font-size="12"
                letter-spacing="0.14em" fill="#a8a299">{name}</text>
          <text x="{tx + 90}" y="{ty + 64}" font-family="{MONO}" font-size="11"
                fill="{MINT_3}">&#9679; active</text>
          <text x="{tx + 16}" y="{ty + 112}" font-family="{MONO}" font-size="11"
                letter-spacing="0.14em" fill="#a8a299">CPM</text>
          <text x="{tx + 16}" y="{ty + 134}" font-family="{MONO}" font-size="22"
                font-weight="600" fill="{CREAM}">&#8377;{cpm_val if is_active else 408 + i * 6}</text>
          <text x="{tx + tw - 100}" y="{ty + 112}" font-family="{MONO}" font-size="11"
                letter-spacing="0.14em" fill="#a8a299">CTR</text>
          <text x="{tx + tw - 100}" y="{ty + 134}" font-family="{MONO}" font-size="22"
                font-weight="600" fill="{MINT_3}">{ctr_val if is_active else 1.5 + i * 0.1:.1f}%</text>
          <path d="{spark}" fill="none" stroke="{MINT_3}" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>
        </g>
        """

    return f"""
    <g opacity="{op}">
      <rect x="{card_x}" y="{card_y}" width="{card_w}" height="{card_h}" rx="22"
            fill="#08110E" stroke="#1F2A24"/>
      <text x="{card_x + card_w // 2}" y="{card_y + 50}" text-anchor="middle"
            font-family="{MONO}" font-size="14" letter-spacing="0.16em"
            fill="#a8a299">{"&#9679;"} META ADS &#183; CAMPAIGN 04</text>

      <text x="{bar_x}" y="{bar_y - 26}" font-family="{MONO}" font-size="13"
            letter-spacing="0.14em" fill="#a8a299">TODAY&#39;S SPEND</text>
      <text x="{bar_x + bar_w}" y="{bar_y - 26}" text-anchor="end" font-family="{MONO}"
            font-size="22" font-weight="700" fill="{CREAM}">&#8377;{spend_val:,}</text>
      <rect x="{bar_x}" y="{bar_y}" width="{bar_w}" height="14" rx="7" ry="7" fill="#1F2A24"/>
      <rect x="{bar_x}" y="{bar_y}" width="{bar_w * spend_prog}" height="14" rx="7" ry="7" fill="{MINT_3}"/>

      {tiles_svg}

      <text x="{card_x + 40}" y="{card_y + card_h - 60}" font-family="{MONO}" font-size="12"
            letter-spacing="0.14em" fill="#a8a299">FB &amp; INSTAGRAM &#183; AUTO-BIDDING &#183; ADVANTAGE+</text>
      <text x="{card_x + 40}" y="{card_y + card_h - 28}" font-family="{BODY}" font-size="22"
            fill="{CREAM}">Built for <tspan font-weight="600" fill="{MINT_3}">purchase</tspan>, not impressions.</text>
    </g>
    """


# ============================================================
# Mockup C — Brand Systems: brand kit grid
# ============================================================
def mockup_brand(t, dur):
    """Google + YouTube — SERP sponsored result + YouTube TrueView card."""
    op = ease_out_cubic(clamp((t - 0.50) / 0.40))
    card_x, card_y = (W - 920) // 2, 590
    card_w, card_h = 920, 1100

    sponsored_op = ease_out_cubic(clamp((t - 0.6) / 0.4))
    qs_prog = clamp((t - 0.85) / 0.35)
    qs_scale = 0.7 + overshoot(qs_prog) * 0.3 if qs_prog > 0 else 0.7
    qs_op = ease_out_cubic(qs_prog)
    yt_op = ease_out_cubic(clamp((t - 1.0) / 0.5))
    stats_op = ease_out_cubic(clamp((t - 1.4) / 0.5))
    skip_countdown = max(1, 5 - int((t - 2.0) * 1.6)) if t > 2.0 else 5

    impr = int(min(184302, max(0, (t - 1.2) * 100000)))
    clicks = int(min(4917, max(0, (t - 1.3) * 2900)))
    cpc = min(11.2, max(0, (t - 1.4) * 6.5))

    return f"""
    <g opacity="{op}">
      <rect x="{card_x}" y="{card_y}" width="{card_w}" height="{card_h}" rx="22"
            fill="{WHITE_CARD}" stroke="{LINE_LIGHT}"/>
      <text x="{card_x + card_w // 2}" y="{card_y + 50}" text-anchor="middle"
            font-family="{MONO}" font-size="14" letter-spacing="0.16em"
            fill="{MUTED}">{"&#9679;"} SERP &#183; QS 9/10</text>

      <!-- Google search bar -->
      <rect x="{card_x + 40}" y="{card_y + 90}" width="{card_w - 80}" height="56" rx="28" ry="28"
            fill="{WHITE_CARD}" stroke="{LINE_LIGHT}"/>
      <circle cx="{card_x + 70}" cy="{card_y + 118}" r="9" fill="none" stroke="{MUTED}" stroke-width="2"/>
      <line x1="{card_x + 77}" y1="{card_y + 125}" x2="{card_x + 84}" y2="{card_y + 132}" stroke="{MUTED}" stroke-width="2"/>
      <text x="{card_x + 100}" y="{card_y + 126}" font-family="{MONO}" font-size="16"
            fill="{INK}">luxury interior designers hyderabad</text>

      <!-- Sponsored result -->
      <g opacity="{sponsored_op}">
        <rect x="{card_x + 40}" y="{card_y + 190}" width="6" height="160" rx="3" ry="3" fill="{MINT_1}"/>
        <text x="{card_x + 60}" y="{card_y + 220}" font-family="{MONO}" font-size="11"
              letter-spacing="0.16em" fill="{MUTED}">SPONSORED</text>
        <text x="{card_x + 60}" y="{card_y + 256}" font-family="{DISPLAY}" font-size="28"
              font-weight="600" fill="{MINT_4}">Hyderabad&#39;s premium interior studio &#8594;</text>
        <text x="{card_x + 60}" y="{card_y + 290}" font-family="{BODY}" font-size="16" fill="{INK}">
          Custom-designed homes, fixed-scope, signed off in 10 weeks.
        </text>
        <text x="{card_x + 60}" y="{card_y + 314}" font-family="{BODY}" font-size="16" fill="{MUTED}">
          Hyderabad-based. INR-priced. Senior team only.
        </text>
        <text x="{card_x + 60}" y="{card_y + 344}" font-family="{MONO}" font-size="14" fill="{MUTED}">
          yourbrand.in &#183; About &#183; Work &#183; Contact
        </text>
      </g>

      <!-- QS badge -->
      <g transform="translate({card_x + card_w - 130} {card_y + 220}) scale({qs_scale}) translate({-(card_x + card_w - 130)} {-(card_y + 220)})" opacity="{qs_op}">
        <rect x="{card_x + card_w - 200}" y="{card_y + 200}" width="140" height="40" rx="20" ry="20"
              fill="none" stroke="{MINT_3}" stroke-width="2"/>
        <text x="{card_x + card_w - 130}" y="{card_y + 226}" text-anchor="middle" font-family="{MONO}"
              font-size="14" font-weight="700" letter-spacing="0.10em" fill="{MINT_3}">QS 9/10</text>
      </g>

      <!-- YouTube TrueView card -->
      <g opacity="{yt_op}">
        <rect x="{card_x + 40}" y="{card_y + 400}" width="480" height="270" rx="12" ry="12" fill="{INK}"/>
        <polygon points="{card_x + 250},{card_y + 510} {card_x + 250},{card_y + 560} {card_x + 300},{card_y + 535}"
                 fill="{MINT_1}"/>
        <text x="{card_x + 60}" y="{card_y + 690}" font-family="{BODY}" font-size="16" font-weight="600"
              fill="{INK}">Your brand &#183; 1:30 ad</text>
        <!-- Skip Ad pill -->
        <rect x="{card_x + 380}" y="{card_y + 600}" width="130" height="44" rx="22" ry="22"
              fill="{INK}" opacity="0.85"/>
        <text x="{card_x + 445}" y="{card_y + 628}" text-anchor="middle" font-family="{BODY}"
              font-size="15" fill="{CREAM}">Skip in {skip_countdown}</text>
      </g>

      <!-- Right column: stats -->
      <g opacity="{stats_op}" transform="translate({card_x + 560} {card_y + 410})">
        <text x="0" y="0" font-family="{MONO}" font-size="12" letter-spacing="0.16em" fill="{MUTED}">IMPRESSIONS</text>
        <text x="0" y="42" font-family="{MONO}" font-size="32" font-weight="700" fill="{INK}">{impr:,}</text>
        <line x1="0" y1="68" x2="240" y2="68" stroke="{LINE_LIGHT}"/>

        <text x="0" y="100" font-family="{MONO}" font-size="12" letter-spacing="0.16em" fill="{MUTED}">CLICKS</text>
        <text x="0" y="142" font-family="{MONO}" font-size="32" font-weight="700" fill="{MINT_3}">{clicks:,}</text>
        <line x1="0" y1="168" x2="240" y2="168" stroke="{LINE_LIGHT}"/>

        <text x="0" y="200" font-family="{MONO}" font-size="12" letter-spacing="0.16em" fill="{MUTED}">CPC</text>
        <text x="0" y="242" font-family="{MONO}" font-size="32" font-weight="700" fill="{INK}">&#8377;{cpc:.2f}</text>
      </g>

      <text x="{card_x + 40}" y="{card_y + 980}" font-family="{BODY}" font-size="20" fill="{INK}">Search &#183; Display &#183; YouTube pre-roll.</text>
      <text x="{card_x + 40}" y="{card_y + 1020}" font-family="{BODY}" font-size="18" fill="{MUTED}">Intent meets <tspan font-weight="600" fill="{MINT_3}">attention</tspan>.</text>
    </g>
    """


# ============================================================
# Mockup D — AI Integrations: chat / agent UI
# ============================================================
def mockup_ai(t, dur):
    """LinkedIn Ads — 4-stage B2B funnel with conversion percentages."""
    op = ease_out_cubic(clamp((t - 0.50) / 0.40))
    card_x, card_y = (W - 920) // 2, 590
    card_w, card_h = 920, 1100

    stage_ops = [ease_out_cubic(clamp((t - 0.85 - i * 0.20) / 0.35)) for i in range(4)]
    cps_op = ease_out_cubic(clamp((t - 2.0) / 0.4))

    stages = [
        ("AWARENESS",     "142,800",  "100%"),
        ("CONSIDERATION", "18,250",   "12.8%"),
        ("MQL",           "5,940",    "32.5%"),
        ("SQL",           "1,890",    "31.8%"),
    ]

    funnel_x = card_x + 80
    funnel_w_top = card_w - 160
    stage_h = 130
    stage_gap = 14
    funnel_y_start = card_y + 200

    stages_svg = ""
    for i, (lbl, count, pct) in enumerate(stages):
        op_s = stage_ops[i]
        y = funnel_y_start + i * (stage_h + stage_gap)
        # Trapezoid widths: each stage narrower than previous
        w_top = funnel_w_top * (1 - i * 0.16)
        w_bot = funnel_w_top * (1 - (i + 1) * 0.16)
        x_top = funnel_x + (funnel_w_top - w_top) / 2
        x_bot = funnel_x + (funnel_w_top - w_bot) / 2
        # Color: deeper mint per stage
        fills = ["#0F1B16", "#13251D", "#173024", MINT_4]
        fill = fills[i]
        # Trapezoid as polygon
        points = f"{x_top},{y} {x_top + w_top},{y} {x_bot + w_bot},{y + stage_h} {x_bot},{y + stage_h}"
        stages_svg += f"""
        <g opacity="{op_s}">
          <polygon points="{points}" fill="{fill}" stroke="{MINT_3}" stroke-opacity="0.25"/>
          <text x="{x_top + 28}" y="{y + 42}" font-family="{MONO}" font-size="14"
                letter-spacing="0.18em" fill="#a8a299">{lbl}</text>
          <text x="{x_top + 28}" y="{y + 90}" font-family="{MONO}" font-size="36"
                font-weight="700" fill="{CREAM}">{count}</text>
          <text x="{x_top + w_top - 28}" y="{y + 80}" text-anchor="end" font-family="{MONO}"
                font-size="42" font-weight="700" fill="{MINT_3}">{pct}</text>
        </g>
        """

    return f"""
    <g opacity="{op}">
      <rect x="{card_x}" y="{card_y}" width="{card_w}" height="{card_h}" rx="22"
            fill="#08110E" stroke="#1F2A24"/>
      <text x="{card_x + card_w // 2}" y="{card_y + 50}" text-anchor="middle"
            font-family="{MONO}" font-size="14" letter-spacing="0.16em"
            fill="#a8a299">{"&#9679;"} B2B FUNNEL &#183; Q2 PIPELINE</text>

      <text x="{card_x + 40}" y="{card_y + 130}" font-family="{MONO}" font-size="12"
            letter-spacing="0.18em" fill="#a8a299">SOURCE: LINKEDIN SPONSORED CONTENT</text>

      {stages_svg}

      <!-- Cost per SQL pill -->
      <g opacity="{cps_op}">
        <rect x="{card_x + card_w - 290}" y="{card_y + card_h - 100}" width="250" height="50" rx="25" ry="25"
              fill="{MINT_3}"/>
        <text x="{card_x + card_w - 165}" y="{card_y + card_h - 68}" text-anchor="middle"
              font-family="{MONO}" font-size="18" font-weight="700" fill="{INK}">CPS &#8377;2,140</text>
      </g>

      <text x="{card_x + 40}" y="{card_y + card_h - 70}" font-family="{BODY}" font-size="18" fill="{CREAM}">Reaches <tspan font-weight="600" fill="{MINT_3}">decision-makers</tspan>,</text>
      <text x="{card_x + 40}" y="{card_y + card_h - 44}" font-family="{BODY}" font-size="18" fill="#a8a299">not job-seekers.</text>
    </g>
    """


# ============================================================
# Mockup E — Performance Media: ad creative + CTR chart
# ============================================================
def mockup_perf(t, dur):
    """Content Strategy — 3-column Kanban (Brief / Drafting / Published)."""
    op = ease_out_cubic(clamp((t - 0.50) / 0.40))
    card_x, card_y = (W - 920) // 2, 590
    card_w, card_h = 920, 1100

    col_ops = [ease_out_cubic(clamp((t - 0.85 - i * 0.15) / 0.30)) for i in range(3)]
    card_ops = [ease_out_cubic(clamp((t - 1.10 - i * 0.08) / 0.30)) for i in range(7)]

    # Highlighted traveling card progress
    travel_t = clamp((t - 1.6) / 1.3)

    cols = ["Brief", "Drafting", "Published"]
    col_w = (card_w - 80 - 16 * 2) // 3
    col_h = 720
    col_y = card_y + 160
    col_xs = [card_x + 40 + i * (col_w + 16) for i in range(3)]

    # 7 cards: 3 in Brief (0,1,2), 3 in Drafting (3,4,5), 1 in Published (6)
    card_w_inner = col_w - 24
    card_h_inner = 100
    card_layouts = [
        # (column_index, vertical_slot, title, tag)
        (0, 0, "Reel: 3-tools-to-1", "Reel"),
        (0, 1, "Blog: SaaS vs custom", "Blog"),
        (0, 2, "Story: founder day", "Story"),
        (1, 0, "Carousel: pricing", "Carousel"),
        (1, 1, "Case study: D2C", "Case Study"),
        (2, 0, "Reel: 7-week build", "Reel"),
    ]

    # Traveling card animates from col 0 to col 2
    if travel_t < 0.5:
        # Brief -> Drafting
        travel_col_x = col_xs[0] + (col_xs[1] - col_xs[0]) * (travel_t * 2)
    else:
        travel_col_x = col_xs[1] + (col_xs[2] - col_xs[1]) * ((travel_t - 0.5) * 2)
    travel_y = col_y + 60

    cols_svg = ""
    for i, name in enumerate(cols):
        op_c = col_ops[i]
        cx_ = col_xs[i]
        # Counts: Brief=3, Drafting=3 (then 2 after travel start, then 3 again with new), Published=1 (then 2)
        if i == 0:
            count = 3 - (1 if travel_t > 0.05 else 0)
        elif i == 1:
            count = 3 if travel_t < 0.5 else 2
        else:
            count = 1 + (1 if travel_t > 0.95 else 0)
        cols_svg += f"""
        <g opacity="{op_c}">
          <rect x="{cx_}" y="{col_y}" width="{col_w}" height="{col_h}" rx="14" ry="14"
                fill="{CREAM}" stroke="{LINE_LIGHT}"/>
          <text x="{cx_ + 20}" y="{col_y + 36}" font-family="{DISPLAY}" font-size="22"
                font-weight="600" fill="{INK}">{name}</text>
          <rect x="{cx_ + col_w - 60}" y="{col_y + 16}" width="40" height="32" rx="16" ry="16"
                fill="{MINT_3}"/>
          <text x="{cx_ + col_w - 40}" y="{col_y + 38}" text-anchor="middle" font-family="{MONO}"
                font-size="14" font-weight="700" fill="{INK}">{count}</text>
          <line x1="{cx_ + 16}" y1="{col_y + 60}" x2="{cx_ + col_w - 16}" y2="{col_y + 60}" stroke="{LINE_LIGHT}"/>
        </g>
        """

    cards_svg = ""
    for i, (col_i, slot, title, tag) in enumerate(card_layouts):
        # Skip the first Brief card during travel
        if i == 0 and travel_t > 0.05:
            continue
        if i == 3 and travel_t > 0.5:
            continue
        op_card = card_ops[i]
        cy_ = col_y + 80 + slot * (card_h_inner + 12)
        cx_ = col_xs[col_i] + 12
        cards_svg += f"""
        <g opacity="{op_card}">
          <rect x="{cx_}" y="{cy_}" width="{card_w_inner}" height="{card_h_inner}" rx="10" ry="10"
                fill="{WHITE_CARD}" stroke="{LINE_LIGHT}"/>
          <text x="{cx_ + 14}" y="{cy_ + 28}" font-family="{DISPLAY}" font-size="16"
                font-weight="600" fill="{INK}">{title}</text>
          <rect x="{cx_ + 14}" y="{cy_ + 46}" width="100" height="24" rx="12" ry="12"
                fill="{MINT_1}"/>
          <text x="{cx_ + 64}" y="{cy_ + 62}" text-anchor="middle" font-family="{MONO}"
                font-size="11" font-weight="600" fill="{MINT_4}">{tag}</text>
          <circle cx="{cx_ + card_w_inner - 28}" cy="{cy_ + card_h_inner - 24}" r="10" fill="{MINT_4}" opacity="0.5"/>
          <text x="{cx_ + 14}" y="{cy_ + card_h_inner - 16}" font-family="{MONO}" font-size="11" fill="{MUTED}">ICP-aligned</text>
        </g>
        """

    # Traveling card (highlighted)
    travel_card_svg = f"""
    <g opacity="{ease_out_cubic(clamp(travel_t / 0.1))}">
      <rect x="{travel_col_x + 12}" y="{travel_y}" width="{card_w_inner}" height="{card_h_inner}"
            rx="10" ry="10" fill="{WHITE_CARD}" stroke="{MINT_3}" stroke-width="2"/>
      <text x="{travel_col_x + 26}" y="{travel_y + 28}" font-family="{DISPLAY}" font-size="16"
            font-weight="600" fill="{INK}">Reel: 3-tools-to-1</text>
      <rect x="{travel_col_x + 26}" y="{travel_y + 46}" width="100" height="24" rx="12" ry="12" fill="{MINT_3}"/>
      <text x="{travel_col_x + 76}" y="{travel_y + 62}" text-anchor="middle" font-family="{MONO}"
            font-size="11" font-weight="700" fill="{INK}">Reel</text>
      <text x="{travel_col_x + 26}" y="{travel_y + card_h_inner - 16}" font-family="{MONO}" font-size="11" fill="{MINT_4}">ICP-aligned</text>
    </g>
    """

    return f"""
    <g opacity="{op}">
      <rect x="{card_x}" y="{card_y}" width="{card_w}" height="{card_h}" rx="22"
            fill="{WHITE_CARD}" stroke="{LINE_LIGHT}"/>
      <text x="{card_x + card_w // 2}" y="{card_y + 50}" text-anchor="middle"
            font-family="{MONO}" font-size="14" letter-spacing="0.16em"
            fill="{MUTED}">{"&#9679;"} KANBAN &#183; ICP-ALIGNED</text>
      <text x="{card_x + 40}" y="{card_y + 110}" font-family="{MONO}" font-size="12"
            letter-spacing="0.16em" fill="{MINT_4}">EDITORIAL CALENDAR &#183; WK 21</text>

      {cols_svg}
      {cards_svg}
      {travel_card_svg}

      <text x="{card_x + 40}" y="{card_y + card_h - 50}" font-family="{BODY}" font-size="20" fill="{INK}">30-day calendar. Briefs. <tspan font-weight="600" fill="{MINT_3}">Hooks.</tspan></text>
      <text x="{card_x + 40}" y="{card_y + card_h - 26}" font-family="{BODY}" font-size="18" fill="{MUTED}">Your team stops guessing.</text>
    </g>
    """


# ============================================================
# Mockup F — SEO & Content Engines: content calendar
# ============================================================
def mockup_seo(t, dur):
    """Reporting & Attribution — KPI strip + stacked-area channel chart."""
    op = ease_out_cubic(clamp((t - 0.50) / 0.40))
    card_x, card_y = (W - 920) // 2, 590
    card_w, card_h = 920, 1100

    kpi_ops = [ease_out_cubic(clamp((t - 0.85 - i * 0.10) / 0.30)) for i in range(4)]
    chart_prog = ease_out_cubic(clamp((t - 1.30) / 1.30))

    rev_val = chart_prog * 24.6
    roas_val = chart_prog * 6.8
    cac_val = int(chart_prog * 1840)
    conv_val = chart_prog * 4.3

    kpis = [
        ("REVENUE",  f"₹{rev_val:.1f}L", "+182%"),
        ("ROAS",     f"{roas_val:.1f}×", "+114%"),
        ("CAC",      f"₹{cac_val:,}",    "-42%"),
        ("CONV. %",  f"{conv_val:.1f}%", "+3.2pp"),
    ]
    kpi_x_start = card_x + 40
    kpi_total_w = card_w - 80
    kpi_w = (kpi_total_w - 3 * 12) // 4
    kpi_h = 130
    kpi_y = card_y + 130
    kpis_svg = ""
    for i, (lbl, val, delta) in enumerate(kpis):
        op_k = kpi_ops[i]
        kx = kpi_x_start + i * (kpi_w + 12)
        dy_k = (1 - op_k) * 12
        kpis_svg += f"""
        <g opacity="{op_k}" transform="translate(0 {dy_k})">
          <rect x="{kx}" y="{kpi_y}" width="{kpi_w}" height="{kpi_h}" rx="14" ry="14"
                fill="#0F1B16" stroke="#1F2A24"/>
          <text x="{kx + 16}" y="{kpi_y + 28}" font-family="{MONO}" font-size="11"
                letter-spacing="0.18em" fill="#a8a299">{lbl}</text>
          <text x="{kx + 16}" y="{kpi_y + 76}" font-family="{MONO}" font-size="26"
                font-weight="700" fill="{CREAM}">{val}</text>
          <text x="{kx + 16}" y="{kpi_y + 108}" font-family="{MONO}" font-size="14"
                font-weight="600" fill="{MINT_3}">{delta}</text>
        </g>
        """

    # Stacked area chart — 4 channel layers
    chart_x = card_x + 40
    chart_y = card_y + 310
    chart_w = card_w - 80
    chart_h = 380
    n_pts = 30

    # Layer heights (proportional contribution per day)
    layer_metas = [
        ("Meta",     MINT_4, 0.42),
        ("Google",   MINT_3, 0.30),
        ("LinkedIn", "#3FCC9A", 0.18),
        ("Organic",  MINT_1, 0.10),
    ]
    # Generate stable variations per layer
    rng_local = [0.85, 0.88, 0.84, 0.90, 0.94, 0.96, 0.92, 0.98,
                 1.00, 1.04, 1.02, 1.08, 1.10, 1.06, 1.14, 1.18,
                 1.20, 1.16, 1.22, 1.28, 1.26, 1.34, 1.36, 1.40,
                 1.44, 1.48, 1.52, 1.50, 1.58, 1.62]
    paths_svg = ""
    cumulative = [0.0] * n_pts
    drawn_pts = int(chart_prog * (n_pts - 1)) + 1
    for li, (name, color, share) in enumerate(layer_metas):
        upper = [cumulative[k] + rng_local[k] * share for k in range(n_pts)]
        if drawn_pts >= 2:
            # Build polygon path
            pts_up = [(chart_x + k / (n_pts - 1) * chart_w,
                       chart_y + chart_h - upper[k] * chart_h / 2.0)
                      for k in range(drawn_pts)]
            pts_dn = [(chart_x + k / (n_pts - 1) * chart_w,
                       chart_y + chart_h - cumulative[k] * chart_h / 2.0)
                      for k in range(drawn_pts - 1, -1, -1)]
            all_pts = pts_up + pts_dn
            poly = " ".join(f"{p[0]:.1f},{p[1]:.1f}" for p in all_pts)
            paths_svg += f'<polygon points="{poly}" fill="{color}" opacity="0.85"/>'
        cumulative = upper

    # Legend
    legend_svg = ""
    for li, (name, color, _) in enumerate(layer_metas):
        lx = chart_x + li * 110
        legend_svg += (
            f'<rect x="{lx}" y="{chart_y + chart_h + 32}" width="12" height="12" rx="2" ry="2" fill="{color}"/>'
            f'<text x="{lx + 18}" y="{chart_y + chart_h + 43}" font-family="{MONO}" font-size="12" fill="#a8a299">{name}</text>'
        )

    return f"""
    <g opacity="{op}">
      <rect x="{card_x}" y="{card_y}" width="{card_w}" height="{card_h}" rx="22"
            fill="#08110E" stroke="#1F2A24"/>
      <text x="{card_x + card_w // 2}" y="{card_y + 50}" text-anchor="middle"
            font-family="{MONO}" font-size="14" letter-spacing="0.16em"
            fill="#a8a299">{"&#9679;"} DASHBOARD &#183; LAST 30 DAYS</text>

      {kpis_svg}

      <text x="{chart_x}" y="{chart_y - 14}" font-family="{MONO}" font-size="12"
            letter-spacing="0.16em" fill="#a8a299">REVENUE BY CHANNEL &#183; LAST 30D</text>

      {paths_svg}

      <line x1="{chart_x}" y1="{chart_y + chart_h}" x2="{chart_x + chart_w}"
            y2="{chart_y + chart_h}" stroke="#1F2A24" stroke-width="2"/>

      {legend_svg}

      <!-- Data-driven attribution chip -->
      <rect x="{card_x + card_w - 290}" y="{card_y + card_h - 100}" width="250" height="40" rx="20" ry="20"
            fill="none" stroke="{GOLD}" stroke-width="2"/>
      <text x="{card_x + card_w - 165}" y="{card_y + card_h - 72}" text-anchor="middle"
            font-family="{MONO}" font-size="13" font-weight="700" letter-spacing="0.12em" fill="{GOLD}">ATTRIBUTION: DATA-DRIVEN</text>

      <text x="{card_x + 40}" y="{card_y + card_h - 70}" font-family="{BODY}" font-size="18" fill="{CREAM}">Dashboards, Looms, MMM.</text>
      <text x="{card_x + 40}" y="{card_y + card_h - 44}" font-family="{BODY}" font-size="18" fill="#a8a299">You know what <tspan font-weight="600" fill="{MINT_3}">actually worked.</tspan></text>
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
    op_e = ease_out_cubic(clamp((t - 1.8) / 0.5))

    return svg_wrap(BLACK, f"""
    {chrome(dark=True)}
    <text x="{CX}" y="430" text-anchor="middle" font-family="{MONO}" font-size="22"
          letter-spacing="0.28em" fill="{MINT_3}" opacity="{op_a * 0.9}">— THE FULL-STACK RETAINER</text>
    <text x="{CX}" y="640" text-anchor="middle" font-family="{DISPLAY}" font-size="84"
          font-weight="600" letter-spacing="-0.03em" fill="{CREAM}"
          opacity="{op_b}">All six. One senior team.</text>
    <text x="{CX}" y="830" text-anchor="middle" font-family="{MONO}" font-size="28"
          font-weight="500" letter-spacing="0.04em" fill="#a8a299"
          opacity="{op_c}">₹3,60,000 / mo</text>
    <line x1="{CX - 150}" y1="819" x2="{CX + 150}" y2="819"
          stroke="#C44747" stroke-width="3" stroke-linecap="round" opacity="{op_c}"/>
    <text x="{CX}" y="990" text-anchor="middle" font-family="{DISPLAY}" font-size="140"
          font-weight="700" letter-spacing="-0.03em" fill="{MINT_3}"
          opacity="{op_d}">₹1.8 L / mo</text>
    <g transform="translate({CX} 1100)" opacity="{op_e}">
      <rect x="-150" y="0" width="300" height="40" rx="20" ry="20" fill="{MINT_3}"/>
      <text x="0" y="28" text-anchor="middle" font-family="{MONO}" font-size="16"
            font-weight="700" letter-spacing="0.20em" fill="{INK}">50% OFF · LAUNCH</text>
    </g>
    <text x="{CX}" y="1240" text-anchor="middle" font-family="{BODY}" font-size="24"
          fill="{CREAM}" opacity="{op_e * 0.65}">First 10 founders this quarter. Ad spend billed separately.</text>
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

    cy = 540
    mr = 130

    return svg_wrap(BLACK, f"""
    {chrome(dark=True)}
    <text x="{CX}" y="320" text-anchor="middle" font-family="{DISPLAY}" font-size="100"
          font-weight="600" letter-spacing="-0.03em" fill="{CREAM}"
          opacity="{op_a}">Stop boosting.</text>
    <text x="{CX}" y="450" text-anchor="middle" font-family="{DISPLAY}" font-size="120"
          font-weight="700" font-style="italic" letter-spacing="-0.03em" fill="{MINT_3}"
          opacity="{op_a}">Start shipping.</text>

    <g opacity="{op_b}" filter="url(#softGlow)">
      <circle cx="{CX}" cy="{cy + 320}" r="{mr}" fill="url(#mark)"/>
      <path d="M{CX - mr * 0.42} {cy + 320 + mr * 0.42} V {cy + 320 - mr * 0.38} l {mr * 0.42} {mr * 0.38} l {mr * 0.42} {-mr * 0.38} V {cy + 320 + mr * 0.42}" stroke="{INK}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </g>
    <text x="{CX}" y="{cy + 320 + mr + 110}" text-anchor="middle" font-family="{DISPLAY}"
          font-size="72" font-weight="600" letter-spacing="-0.02em" fill="{CREAM}"
          opacity="{op_b}">BrandMint Studios.</text>
    <text x="{CX}" y="{cy + 320 + mr + 170}" text-anchor="middle" font-family="{MONO}"
          font-size="20" letter-spacing="0.22em" fill="{CREAM}"
          opacity="{op_b * 0.65}">HYDERABAD &#8594; WORLDWIDE</text>

    <g transform="translate(0 {pill_dy})" opacity="{pill_op}">
      <rect x="{CX - 410}" y="1450" width="820" height="180" rx="90" ry="90" fill="{MINT_3}"/>
      <text x="{CX}" y="1563" text-anchor="middle" font-family="{DISPLAY}" font-size="42"
            font-weight="600" fill="{INK}">DM "ADS" to scope your campaign</text>
    </g>

    <text x="{CX}" y="1730" text-anchor="middle" font-family="{BODY}" font-size="22"
          fill="{CREAM}" opacity="{op_b * 0.55}">Launch pricing · first 10 founders · ad spend billed separately.</text>
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
    Beat("00-logo",      1.2, beat_logo,                       0.00,  "fade"),
    Beat("01-title",     2.8, beat_title,                      0.40,  "fadeblack"),
    Beat("02-video",     3.8, make_service("A", "Video Production",       "₹80 K / mo",  "₹40 K / mo",
                                            "Reels, ad cuts, brand films. Shot, edited, delivered.",
                                            mockup_websites, dark=False), 0.25, "slideleft"),
    Beat("03-meta",      3.8, make_service("B", "Meta Ads",               "₹60 K / mo",  "₹30 K / mo",
                                            "Built for purchase, not impressions.",
                                            mockup_tools, dark=True),     0.20, "slideup"),
    Beat("04-google",    3.8, make_service("C", "Google + YouTube Ads",   "₹60 K / mo",  "₹30 K / mo",
                                            "Search, display, YouTube pre-roll.",
                                            mockup_brand, dark=False),    0.40, "fade"),
    Beat("05-linkedin",  3.8, make_service("D", "LinkedIn Ads",           "₹70 K / mo",  "₹35 K / mo",
                                            "Reaches decision-makers, not job-seekers.",
                                            mockup_ai, dark=True),        0.25, "slideright"),
    Beat("06-content",   3.8, make_service("E", "Content Strategy",       "₹50 K / mo",  "₹25 K / mo",
                                            "30-day calendar. Briefs. Hooks.",
                                            mockup_perf, dark=False),     0.13, "fade"),
    Beat("07-reporting", 3.8, make_service("F", "Reporting + Attribution","₹40 K / mo",  "₹20 K / mo",
                                            "Dashboards, weekly Looms, MMM.",
                                            mockup_seo, dark=True),       0.25, "slideleft"),
    Beat("08-bundle",    3.2, beat_bundle,                      0.30, "fadeblack"),
    Beat("09-cta",       5.8, beat_cta,                         0.20, "slideup"),
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
    out_mp4 = OUT / OUTPUT_NAME
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
