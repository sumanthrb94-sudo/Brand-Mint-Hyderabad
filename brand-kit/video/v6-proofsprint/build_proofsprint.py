"""
BrandMint Studios — "Social Proof Sprint" (Script 8) — v6 build.

7 beats, driving 4/4 percussion, animated SVG UI mockups that stand in
for stock screen-recording B-roll until real footage is dropped in.

Output: out/brandmint-proofsprint.mp4  (~1080x1920, ~27s, ~2 MB)
"""
import math
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import cairosvg

ROOT = Path(__file__).resolve().parent
FRAMES = ROOT / "frames"
CLIPS = ROOT / "clips"
OUT = ROOT / "out"
for d in (FRAMES, CLIPS, OUT):
    d.mkdir(parents=True, exist_ok=True)

# ---------- format ----------
W, H = 1080, 1920
FPS = 30

# ---------- tokens ----------
BLACK = "#000000"
INK = "#0A0E0C"
CREAM = "#F5F1EA"
PAPER_DEEP = "#E9E2D3"
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
def clamp(x, lo=0.0, hi=1.0): return max(lo, min(hi, x))


# ---------- shared defs ----------
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
  <linearGradient id="cardShine" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"  stop-color="#FFFFFF" stop-opacity="0.95"/>
    <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.80"/>
  </linearGradient>
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


# ---------- shared chrome (top brand + bottom URL on every frame) ----------
def chrome(dark=False):
    fg = CREAM if dark else MUTED
    return f"""
    <text x="60" y="80" font-family="{MONO}" font-size="22" letter-spacing="0.18em"
          fill="{fg}" opacity="0.7">BRANDMINT STUDIOS</text>
    <text x="{W-60}" y="{H-50}" text-anchor="end" font-family="{MONO}" font-size="22"
          letter-spacing="0.06em" fill="{fg}" opacity="0.7">brandmint.studios</text>
    """


# ---------- beat 1: BUILT IN 7 WEEKS — animated CRM dashboard mockup ----------
def beat_1(t, dur):
    """Animated UI mockup of a custom CRM. Sidebar + 4 stat tiles fade up with stagger."""
    # Headline fade up over 0.5s
    head_op = ease_out_cubic(clamp(t / 0.5))
    # 4 tiles fade up with stagger (0.6, 0.85, 1.10, 1.35)
    tile_ops = [ease_out_cubic(clamp((t - 0.6 - i * 0.25) / 0.45)) for i in range(4)]
    # Pipeline bar grows
    bar_progress = ease_out_cubic(clamp((t - 1.6) / 0.9))

    # CRM mockup geometry (centered inside a 920x900 card)
    card_x, card_y = 80, 480
    card_w, card_h = 920, 980
    # Sidebar
    sb_w = 200
    sidebar_items = ["Customers", "Pipeline", "Reports", "Settings", "Tools"]

    sidebar_svg = ""
    for i, item in enumerate(sidebar_items):
        active = (i == 1)
        fill = MINT_1 if active else "transparent"
        text_color = MINT_4 if active else MUTED
        sidebar_svg += f"""
        <rect x="{card_x + 16}" y="{card_y + 90 + i * 60}" width="{sb_w - 32}" height="46"
              rx="10" fill="{fill}"/>
        <text x="{card_x + 36}" y="{card_y + 90 + i * 60 + 30}" font-family="{BODY}"
              font-size="20" font-weight="500" fill="{text_color}">{item}</text>
        """

    # Stat tiles (2x2)
    tile_w, tile_h = 320, 170
    tiles_data = [
        ("CUSTOMERS",        "4,218", "+12%"),
        ("DEALS · IN PROG",  "₹84.2L", "+9%"),
        ("CONVERSION",       "23.4%", "+4.1%"),
        ("AVG TICKET",       "₹1.9L", "+6%"),
    ]
    tiles_svg = ""
    for i, (label, value, delta) in enumerate(tiles_data):
        col, row = i % 2, i // 2
        tx = card_x + sb_w + 32 + col * (tile_w + 16)
        ty = card_y + 110 + row * (tile_h + 16)
        op = tile_ops[i]
        # Subtle slide-up: dy = (1-op) * 16
        dy = (1 - op) * 16
        tiles_svg += f"""
        <g opacity="{op}" transform="translate(0 {dy})">
          <rect x="{tx}" y="{ty}" width="{tile_w}" height="{tile_h}" rx="14"
                fill="{WHITE_CARD}" stroke="{LINE_LIGHT}"/>
          <text x="{tx + 22}" y="{ty + 36}" font-family="{MONO}" font-size="14"
                letter-spacing="0.18em" fill="{MUTED}">{label}</text>
          <text x="{tx + 22}" y="{ty + 95}" font-family="{MONO}" font-size="40"
                font-weight="600" fill="{INK}">{value}</text>
          <text x="{tx + 22}" y="{ty + 138}" font-family="{BODY}" font-size="18"
                font-weight="500" fill="{MINT_3}">{delta} this quarter</text>
        </g>
        """

    # Pipeline progress bar
    bar_y = card_y + 110 + 2 * (tile_h + 16) + 24
    bar_x = card_x + sb_w + 32
    bar_w = card_w - sb_w - 64
    bar_h = 16
    fill_w = bar_w * bar_progress
    pipeline_svg = f"""
    <g opacity="{ease_out_cubic(clamp((t - 1.4) / 0.5))}">
      <text x="{bar_x}" y="{bar_y - 18}" font-family="{MONO}" font-size="14"
            letter-spacing="0.16em" fill="{MUTED}">PIPELINE · Q3 → Q4</text>
      <rect x="{bar_x}" y="{bar_y}" width="{bar_w}" height="{bar_h}" rx="8"
            fill="{LINE_LIGHT}"/>
      <rect x="{bar_x}" y="{bar_y}" width="{fill_w}" height="{bar_h}" rx="8"
            fill="{MINT_3}"/>
    </g>
    """

    inner = f"""
    {chrome(dark=False)}
    <text x="60" y="320" font-family="{DISPLAY}" font-size="120" font-weight="600"
          letter-spacing="-0.03em" fill="{INK}" opacity="{head_op}">Built in</text>
    <text x="60" y="440" font-family="{DISPLAY}" font-size="160" font-weight="600"
          letter-spacing="-0.03em" fill="{MINT_3}" opacity="{head_op}">7 weeks.</text>
    <g>
      <rect x="{card_x}" y="{card_y}" width="{card_w}" height="{card_h}" rx="18"
            fill="{WHITE_CARD}" stroke="{LINE_LIGHT}"/>
      <text x="{card_x + 24}" y="{card_y + 50}" font-family="{MONO}" font-size="16"
            letter-spacing="0.16em" fill="{MUTED}">{"&#9679;"} CRM · CUSTOM BUILD</text>
      <line x1="{card_x + 20}" y1="{card_y + 70}" x2="{card_x + card_w - 20}"
            y2="{card_y + 70}" stroke="{LINE_LIGHT}"/>
      {sidebar_svg}
      {tiles_svg}
      {pipeline_svg}
    </g>
    """
    return svg_wrap(CREAM, inner)


# ---------- beat 2: ₹0 MONTHLY SAAS FEES — strike-through stack vs mint stamp ----------
def beat_2(t, dur):
    head_op = ease_out_cubic(clamp(t / 0.5))
    # Three SaaS lines strike-through one at a time (0.6, 1.0, 1.4)
    strike_progress = [ease_out_cubic(clamp((t - 0.6 - i * 0.4) / 0.4)) for i in range(3)]
    stamp_op = ease_out_cubic(clamp((t - 1.9) / 0.4))
    stamp_scale = 0.85 + 0.15 * stamp_op

    rows = [
        ("CRM platform",         "₹2,400 / mo"),
        ("Email marketing",      "₹3,600 / mo"),
        ("Project management",   "₹1,800 / mo"),
    ]
    rows_svg = ""
    for i, (label, value) in enumerate(rows):
        y = 700 + i * 110
        s = strike_progress[i]
        # Strike-through line grows from left
        rows_svg += f"""
        <rect x="100" y="{y - 30}" width="880" height="70" rx="10"
              fill="{WHITE_CARD}" stroke="{LINE_LIGHT}"/>
        <text x="130" y="{y + 18}" font-family="{BODY}" font-size="30" font-weight="500"
              fill="{INK}" opacity="{1 - s * 0.5}">{label}</text>
        <text x="950" y="{y + 18}" text-anchor="end" font-family="{MONO}" font-size="30"
              font-weight="500" fill="{INK}" opacity="{1 - s * 0.5}">{value}</text>
        <line x1="{130 - 5}" y1="{y + 5}" x2="{130 - 5 + 820 * s}" y2="{y + 5}"
              stroke="{MINT_3}" stroke-width="4"/>
        """

    inner = f"""
    {chrome(dark=False)}
    <text x="60" y="280" font-family="{DISPLAY}" font-size="120" font-weight="600"
          letter-spacing="-0.03em" fill="{INK}" opacity="{head_op}">₹0 monthly</text>
    <text x="60" y="400" font-family="{DISPLAY}" font-size="120" font-weight="600"
          letter-spacing="-0.03em" fill="{INK}" opacity="{head_op}">SaaS fees.</text>

    {rows_svg}

    <g opacity="{stamp_op}" transform="translate({W//2 - 280} {H - 600}) scale({stamp_scale}) translate({-(W//2 - 280)} {-(H - 600)})">
      <rect x="{W//2 - 280}" y="{H - 600}" width="560" height="220" rx="18"
            fill="{MINT_3}"/>
      <text x="{W//2}" y="{H - 480}" text-anchor="middle" font-family="{MONO}"
            font-size="100" font-weight="600" fill="{INK}">₹0 / mo.</text>
      <text x="{W//2}" y="{H - 415}" text-anchor="middle" font-family="{BODY}"
            font-size="22" letter-spacing="0.18em" fill="{INK}" opacity="0.78">YOU OWN THE CODEBASE.</text>
    </g>
    """
    return svg_wrap(CREAM, inner)


# ---------- beat 3: 10K USERS · ZERO CRASHES — analytics chart drawing ----------
def beat_3(t, dur):
    head_op = ease_out_cubic(clamp(t / 0.4))
    # Chart draws from left to right over 1.2s starting t=0.5
    chart_progress = ease_out_cubic(clamp((t - 0.5) / 1.2))
    counter_progress = ease_out_cubic(clamp((t - 1.6) / 0.7))
    counter_val = int(10247 * counter_progress)

    # Chart geometry — pushed slightly lower to clear the stacked counters
    chart_x, chart_y = 100, 920
    chart_w, chart_h = 880, 500
    # Sample points (normalized 0-1)
    pts = [(0.0, 0.85), (0.10, 0.78), (0.22, 0.72), (0.35, 0.65),
           (0.45, 0.55), (0.58, 0.42), (0.68, 0.38), (0.78, 0.22),
           (0.88, 0.18), (1.0, 0.10)]
    # Convert to absolute and clip to chart_progress
    drawn_pts = []
    for nx, ny in pts:
        if nx <= chart_progress:
            x = chart_x + nx * chart_w
            y = chart_y + ny * chart_h
            drawn_pts.append((x, y))
    # If progress falls between two points, interpolate the last segment
    if drawn_pts and chart_progress < 1.0:
        # Find next point beyond progress
        for i, (nx, ny) in enumerate(pts):
            if nx > chart_progress:
                if i > 0:
                    prev_nx, prev_ny = pts[i - 1]
                    seg = (chart_progress - prev_nx) / max(0.001, nx - prev_nx)
                    interp_x = chart_x + chart_progress * chart_w
                    interp_y = chart_y + (prev_ny + (ny - prev_ny) * seg) * chart_h
                    drawn_pts.append((interp_x, interp_y))
                break

    path_d = ""
    if drawn_pts:
        path_d = f"M {drawn_pts[0][0]} {drawn_pts[0][1]}"
        for px, py in drawn_pts[1:]:
            path_d += f" L {px} {py}"

    # Highlight dot at the end of the line
    dot = ""
    if drawn_pts:
        dx, dy = drawn_pts[-1]
        dot = f'<circle cx="{dx}" cy="{dy}" r="10" fill="{MINT_3}" filter="url(#softGlow)"/>'

    inner = f"""
    {chrome(dark=True)}
    <text x="60" y="240" font-family="{MONO}" font-size="20" letter-spacing="0.18em"
          fill="{MINT_3}" opacity="{head_op * 0.9}">— PLATFORM HEALTH · LIVE</text>

    <!-- Row 1: users counter (stacked vertically with crashes — fixes overlap) -->
    <text x="60" y="380" font-family="{MONO}" font-size="170" font-weight="600"
          letter-spacing="-0.02em" fill="{CREAM}" opacity="{head_op}">{counter_val:,}</text>
    <text x="60" y="440" font-family="{DISPLAY}" font-size="44" font-weight="500"
          font-style="italic" fill="{CREAM}" opacity="{head_op * 0.85}">users.</text>

    <!-- Row 2: crashes counter, below users -->
    <text x="60" y="620" font-family="{MONO}" font-size="220" font-weight="600"
          letter-spacing="-0.02em" fill="{MINT_3}" opacity="{head_op}" filter="url(#softGlow)">0</text>
    <text x="240" y="615" font-family="{DISPLAY}" font-size="64" font-weight="500"
          font-style="italic" fill="{CREAM}" opacity="{head_op * 0.92}">crashes.</text>

    <!-- chart card -->
    <rect x="{chart_x - 20}" y="{chart_y - 60}" width="{chart_w + 40}" height="{chart_h + 80}"
          rx="18" fill="#0F1311" stroke="#1F2A24"/>
    <text x="{chart_x}" y="{chart_y - 24}" font-family="{MONO}" font-size="16"
          letter-spacing="0.16em" fill="{MUTED}">CPU LOAD · 30D · CUSTOM BUILD vs SaaS</text>

    <!-- axes -->
    <line x1="{chart_x}" y1="{chart_y + chart_h}" x2="{chart_x + chart_w}"
          y2="{chart_y + chart_h}" stroke="#2A3530" stroke-width="2"/>
    <line x1="{chart_x}" y1="{chart_y}" x2="{chart_x}" y2="{chart_y + chart_h}"
          stroke="#2A3530" stroke-width="2"/>

    <!-- saas baseline (dashed flat) -->
    <line x1="{chart_x}" y1="{chart_y + chart_h * 0.78}" x2="{chart_x + chart_w}"
          y2="{chart_y + chart_h * 0.78}" stroke="#5A6660" stroke-width="2"
          stroke-dasharray="8 8" opacity="0.7"/>
    <text x="{chart_x + chart_w - 8}" y="{chart_y + chart_h * 0.78 - 12}" text-anchor="end"
          font-family="{MONO}" font-size="14" letter-spacing="0.12em"
          fill="#7A8680" opacity="0.7">SaaS baseline</text>

    <!-- custom build line (animated) -->
    <path d="{path_d}" fill="none" stroke="{MINT_3}" stroke-width="4"
          stroke-linecap="round" stroke-linejoin="round" filter="url(#softGlow)"/>
    {dot}

    <!-- uptime badge -->
    <g transform="translate({W - 280} {chart_y - 80})" opacity="{head_op}">
      <rect x="0" y="0" width="220" height="60" rx="30" fill="{MINT_3}"/>
      <text x="110" y="40" text-anchor="middle" font-family="{MONO}" font-size="22"
            font-weight="600" fill="{INK}">UPTIME 99.97%</text>
    </g>
    """
    return svg_wrap("#06090A", inner)


# ---------- beat 4: 3 TOOLS → 1 PLATFORM — browser tabs swap ----------
def beat_4(t, dur):
    head_op = ease_out_cubic(clamp(t / 0.4))
    # Tabs phase: 0.5-1.2s tabs visible, 1.2-1.8s close one by one, 1.8-2.5 single dashboard fades in
    if t < 0.5:
        tab_ops = [0, 0, 0]
        dashboard_op = 0
    elif t < 1.2:
        tab_ops = [
            ease_out_cubic(clamp((t - 0.5) / 0.25)),
            ease_out_cubic(clamp((t - 0.6) / 0.25)),
            ease_out_cubic(clamp((t - 0.7) / 0.25)),
        ]
        dashboard_op = 0
    elif t < 1.8:
        # Tabs close — strike-through then fade
        tab_ops = [
            max(0, 1 - ease_out_cubic(clamp((t - 1.2) / 0.18))),
            max(0, 1 - ease_out_cubic(clamp((t - 1.32) / 0.18))),
            max(0, 1 - ease_out_cubic(clamp((t - 1.44) / 0.18))),
        ]
        dashboard_op = ease_out_cubic(clamp((t - 1.4) / 0.4))
    else:
        tab_ops = [0, 0, 0]
        dashboard_op = 1.0

    # Three "browser tabs" — top of screen
    tab_w, tab_h = 290, 80
    tab_y = 720
    tab_labels = ["crm.salesplatform.io", "billing.invoicepro.app", "tasks.projecthub.com"]
    tabs_svg = ""
    for i, label in enumerate(tab_labels):
        tx = 80 + i * (tab_w + 20)
        op = tab_ops[i]
        tabs_svg += f"""
        <g opacity="{op}">
          <rect x="{tx}" y="{tab_y}" width="{tab_w}" height="{tab_h}" rx="12"
                fill="{WHITE_CARD}" stroke="{LINE_LIGHT}"/>
          <circle cx="{tx + 26}" cy="{tab_y + 40}" r="7" fill="{MUTED}" opacity="0.4"/>
          <text x="{tx + 46}" y="{tab_y + 47}" font-family="{MONO}" font-size="16"
                fill="{INK}" opacity="0.78">{label}</text>
        </g>
        """

    # Single unified dashboard card — fades in below
    dash_x, dash_y = 80, 850
    dash_w, dash_h = 920, 560
    dashboard_svg = f"""
    <g opacity="{dashboard_op}">
      <rect x="{dash_x}" y="{dash_y}" width="{dash_w}" height="{dash_h}" rx="18"
            fill="{WHITE_CARD}" stroke="{LINE_LIGHT}"/>
      <circle cx="{dash_x + 32}" cy="{dash_y + 40}" r="10" fill="url(#mark)"/>
      <text x="{dash_x + 56}" y="{dash_y + 48}" font-family="{DISPLAY}"
            font-size="26" font-weight="600" fill="{INK}">Operations · one platform</text>
      <text x="{dash_x + dash_w - 24}" y="{dash_y + 48}" text-anchor="end"
            font-family="{MONO}" font-size="16" letter-spacing="0.14em"
            fill="{MINT_3}">CUSTOM BUILD</text>
      <line x1="{dash_x + 16}" y1="{dash_y + 76}" x2="{dash_x + dash_w - 16}"
            y2="{dash_y + 76}" stroke="{LINE_LIGHT}"/>

      <!-- Three modules consolidated -->
      <g>
        <rect x="{dash_x + 32}" y="{dash_y + 110}" width="{(dash_w - 96) / 3}" height="200"
              rx="14" fill="{MINT_1}" stroke="{MINT_3}" stroke-opacity="0.3"/>
        <text x="{dash_x + 52}" y="{dash_y + 150}" font-family="{MONO}" font-size="14"
              letter-spacing="0.16em" fill="{MINT_4}">CRM</text>
        <text x="{dash_x + 52}" y="{dash_y + 220}" font-family="{MONO}" font-size="44"
              font-weight="600" fill="{INK}">4,218</text>
        <text x="{dash_x + 52}" y="{dash_y + 270}" font-family="{BODY}" font-size="16"
              fill="{INK}" opacity="0.62">customers · live</text>
      </g>
      <g>
        <rect x="{dash_x + 64 + (dash_w - 96) / 3}" y="{dash_y + 110}"
              width="{(dash_w - 96) / 3}" height="200" rx="14"
              fill="{MINT_1}" stroke="{MINT_3}" stroke-opacity="0.3"/>
        <text x="{dash_x + 84 + (dash_w - 96) / 3}" y="{dash_y + 150}"
              font-family="{MONO}" font-size="14" letter-spacing="0.16em" fill="{MINT_4}">BILLING</text>
        <text x="{dash_x + 84 + (dash_w - 96) / 3}" y="{dash_y + 220}"
              font-family="{MONO}" font-size="44" font-weight="600" fill="{INK}">₹14.2L</text>
        <text x="{dash_x + 84 + (dash_w - 96) / 3}" y="{dash_y + 270}"
              font-family="{BODY}" font-size="16" fill="{INK}" opacity="0.62">in flight</text>
      </g>
      <g>
        <rect x="{dash_x + 96 + 2 * (dash_w - 96) / 3}" y="{dash_y + 110}"
              width="{(dash_w - 96) / 3}" height="200" rx="14"
              fill="{MINT_1}" stroke="{MINT_3}" stroke-opacity="0.3"/>
        <text x="{dash_x + 116 + 2 * (dash_w - 96) / 3}" y="{dash_y + 150}"
              font-family="{MONO}" font-size="14" letter-spacing="0.16em" fill="{MINT_4}">TASKS</text>
        <text x="{dash_x + 116 + 2 * (dash_w - 96) / 3}" y="{dash_y + 220}"
              font-family="{MONO}" font-size="44" font-weight="600" fill="{INK}">142</text>
        <text x="{dash_x + 116 + 2 * (dash_w - 96) / 3}" y="{dash_y + 270}"
              font-family="{BODY}" font-size="16" fill="{INK}" opacity="0.62">open</text>
      </g>

      <!-- API connection line -->
      <text x="{dash_x + 32}" y="{dash_y + 360}" font-family="{MONO}" font-size="14"
            letter-spacing="0.14em" fill="{MUTED}">API · ONE DB · LIVE SYNC</text>
      <line x1="{dash_x + 32}" y1="{dash_y + 384}" x2="{dash_x + dash_w - 32}"
            y2="{dash_y + 384}" stroke="{MINT_3}" stroke-width="2"
            stroke-dasharray="6 6"/>
      <text x="{dash_x + 32}" y="{dash_y + 460}" font-family="{BODY}" font-size="22"
            fill="{INK}" opacity="0.78">No CSV exports. No webhook hacks.</text>
      <text x="{dash_x + 32}" y="{dash_y + 500}" font-family="{BODY}" font-size="22"
            font-weight="600" fill="{INK}">Your tools talk natively.</text>
    </g>
    """

    inner = f"""
    {chrome(dark=False)}
    <text x="60" y="290" font-family="{DISPLAY}" font-size="120" font-weight="600"
          letter-spacing="-0.03em" fill="{INK}" opacity="{head_op}">Three tools</text>
    <text x="60" y="410" font-family="{DISPLAY}" font-size="120" font-weight="600"
          letter-spacing="-0.03em" fill="{INK}" opacity="{head_op}">→ <tspan
          font-style="italic" fill="{MINT_3}">one platform.</tspan></text>

    {tabs_svg}
    {dashboard_svg}
    """
    # Note: tspan-with-middle-anchor bug doesn't apply when text-anchor is default (start).
    return svg_wrap(CREAM, inner)


# ---------- beat 5: CLIENT QUOTE ----------
def beat_5(t, dur):
    head_op = ease_out_cubic(clamp(t / 0.5))
    quote_op = ease_out_cubic(clamp((t - 0.4) / 0.8))
    attrib_op = ease_out_cubic(clamp((t - 1.2) / 0.6))

    inner = f"""
    {chrome(dark=True)}
    <text x="60" y="240" font-family="{MONO}" font-size="20" letter-spacing="0.18em"
          fill="{MINT_3}" opacity="{head_op * 0.85}">— CLIENT</text>

    <text x="60" y="540" font-family="{DISPLAY}" font-size="160" font-weight="700"
          fill="{MINT_3}" opacity="0.18">&#8220;</text>

    <g opacity="{quote_op}" font-family="{DISPLAY}" font-weight="500" letter-spacing="-0.015em" fill="{CREAM}">
      <text x="60" y="780" font-size="76">We finally</text>
      <text x="60" y="880" font-size="76" font-style="italic" fill="{MINT_3}">own our tech.</text>
    </g>

    <g opacity="{attrib_op}" transform="translate(60, 1080)">
      <rect width="110" height="110" rx="16" fill="{MINT_3}"/>
      <text x="55" y="78" text-anchor="middle" font-family="{DISPLAY}" font-size="60"
            font-weight="600" fill="{INK}">A</text>
      <text x="146" y="50" font-family="{DISPLAY}" font-size="34" font-weight="600"
            fill="{CREAM}">Arjun R.</text>
      <text x="146" y="90" font-family="{BODY}" font-size="24" fill="{CREAM}"
            opacity="0.7">Founder · D2C wellness</text>
    </g>
    """
    return svg_wrap("#06090A", inner)


# ---------- beat 6: LOGO STAMP ----------
def beat_6(t, dur):
    op = ease_out_cubic(clamp(t / 0.4))
    scale = 0.95 + 0.05 * op
    cx, cy = W / 2, H / 2 - 60
    mr = 180

    inner = f"""
    {chrome(dark=True)}
    <g transform="translate({cx} {cy}) scale({scale}) translate({-cx} {-cy})" opacity="{op}" filter="url(#softGlow)">
      <circle cx="{cx}" cy="{cy}" r="{mr}" fill="url(#mark)"/>
      <path d="M{cx - mr * 0.42} {cy + mr * 0.42}
               V {cy - mr * 0.38}
               l {mr * 0.42} {mr * 0.38}
               l {mr * 0.42} {-mr * 0.38}
               V {cy + mr * 0.42}"
            stroke="{INK}" stroke-width="20" stroke-linecap="round"
            stroke-linejoin="round" fill="none"/>
    </g>
    <text x="{W//2}" y="{cy + mr + 140}" text-anchor="middle" font-family="{DISPLAY}"
          font-size="96" font-weight="600" letter-spacing="-0.02em" fill="{CREAM}"
          opacity="{op}">BrandMint Studios.</text>
    <text x="{W//2}" y="{cy + mr + 220}" text-anchor="middle" font-family="{MONO}"
          font-size="22" letter-spacing="0.22em" fill="{CREAM}" opacity="{op * 0.65}">
      HYDERABAD &#8594; WORLDWIDE
    </text>
    """
    return svg_wrap(BLACK, inner)


# ---------- beat 7: CTA ----------
def beat_7(t, dur):
    head_op = ease_out_cubic(clamp(t / 0.4))
    pill_op = ease_out_cubic(clamp((t - 1.2) / 0.5))
    pill_dy = (1 - pill_op) * 60

    inner = f"""
    {chrome(dark=True)}
    <g font-family="{DISPLAY}" font-weight="600" letter-spacing="-0.025em" fill="{CREAM}">
      <text x="{W//2}" y="540" text-anchor="middle" font-size="84"
            opacity="{head_op}">Custom software.</text>
      <text x="{W//2}" y="660" text-anchor="middle" font-size="84"
            opacity="{head_op}">Custom websites.</text>
    </g>
    <text x="{W//2}" y="800" text-anchor="middle" font-family="{MONO}" font-size="28"
          letter-spacing="0.18em" fill="{MINT_3}" opacity="{head_op * 0.85}">
      HYDERABAD &#8594; WORLDWIDE
    </text>

    <g transform="translate({W//2 - 380} {1100 + pill_dy})" opacity="{pill_op}" filter="url(#softGlow)">
      <rect width="760" height="160" rx="80" fill="{MINT_3}"/>
      <text x="380" y="100" text-anchor="middle" font-family="{DISPLAY}" font-size="42"
            font-weight="600" fill="{INK}">DM "BUILT" to scope your build</text>
    </g>

    <text x="{W//2}" y="1380" text-anchor="middle" font-family="{BODY}" font-size="24"
          fill="{CREAM}" opacity="{head_op * 0.6}">Free 20-min scoping call · no pitch · just architecture.</text>
    """
    return svg_wrap(BLACK, inner)


# ---------- beat table ----------
@dataclass
class Beat:
    id: str
    duration: float
    render: Callable[[float, float], str]


BEATS = [
    Beat("01-built-7w",    3.5, beat_1),
    Beat("02-zero-saas",   3.5, beat_2),
    Beat("03-10k-zero",    3.5, beat_3),
    Beat("04-3to1",        3.5, beat_4),
    Beat("05-quote",       4.0, beat_5),
    Beat("06-logo",        3.0, beat_6),
    Beat("07-cta",         5.5, beat_7),
]
XFADE = 0.13  # very short — feels like a hard cut


# ---------- pipeline ----------
def render_beat(beat: Beat):
    bd = FRAMES / beat.id
    bd.mkdir(parents=True, exist_ok=True)
    n = int(round(beat.duration * FPS))
    for i in range(n):
        t = i / FPS
        svg = beat.render(t, beat.duration)
        cairosvg.svg2png(
            bytestring=svg.encode("utf-8"),
            write_to=str(bd / f"f-{i:04d}.png"),
            output_width=W,
            output_height=H,
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
        "-pix_fmt", "yuv420p",
        "-r", str(FPS),
        str(out),
    ], check=True, capture_output=True)
    return out


def build_score(total: float) -> Path:
    """Driving 4/4 at 112 BPM. Beat = 60/112 = 0.5357s. Bar = 4 beats = 2.1428s."""
    bpm = 112
    beat_sec = 60.0 / bpm

    # Sub-bass drone
    drone = OUT / "_drone.wav"
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"sine=frequency=55:duration={total}",
        "-af", f"volume=0.30,lowpass=f=400,afade=t=in:st=0:d=0.6,afade=t=out:st={total - 0.8}:d=0.8",
        "-ac", "2", "-ar", "48000",
        str(drone),
    ], check=True, capture_output=True)

    # Kick — short percussive sine
    kick = OUT / "_kick.wav"
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "sine=frequency=60:duration=0.12",
        "-af", "afade=t=in:st=0:d=0.002,afade=t=out:st=0.025:d=0.095,volume=0.7",
        "-ac", "2", "-ar", "48000",
        str(kick),
    ], check=True, capture_output=True)

    # Hi-hat — short bandpassed noise
    hat = OUT / "_hat.wav"
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "anoisesrc=duration=0.06:color=white:amplitude=0.6",
        "-af", "highpass=f=6000,afade=t=in:st=0:d=0.002,afade=t=out:st=0.02:d=0.04,volume=0.32",
        "-ac", "2", "-ar", "48000",
        str(hat),
    ], check=True, capture_output=True)

    # Chord stab — perfect-fifth (A2 + E3), short
    stab = OUT / "_stab.wav"
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "sine=frequency=110:duration=0.28",
        "-f", "lavfi", "-i", "sine=frequency=164.8:duration=0.28",
        "-filter_complex",
            "[0]volume=0.45[a];[1]volume=0.35[b];"
            "[a][b]amix=inputs=2,afade=t=in:st=0:d=0.005,afade=t=out:st=0.06:d=0.22,"
            "lowpass=f=2200,volume=0.42",
        "-ac", "2", "-ar", "48000",
        str(stab),
    ], check=True, capture_output=True)

    # Compute beat positions across `total` seconds
    inputs = ["-i", str(drone)]
    sched = []  # (stem_path, when)
    t = 0.0
    bar_i = 0
    while t < total:
        # On every beat: kick
        sched.append((kick, t))
        # On every off-beat (t + beat_sec/2): hi-hat
        sched.append((hat, t + beat_sec / 2))
        # On every bar (every 4 beats): chord stab
        if bar_i % 4 == 0:
            sched.append((stab, t))
        t += beat_sec
        bar_i += 1

    for stem, when in sched:
        inputs += ["-itsoffset", f"{max(0, when):.3f}", "-i", str(stem)]

    n_inputs = 1 + len(sched)
    mix_inputs = "".join(f"[{i}]" for i in range(n_inputs))

    out_score = OUT / "score.wav"
    subprocess.run([
        "ffmpeg", "-y",
        *inputs,
        "-filter_complex",
            f"{mix_inputs}amix=inputs={n_inputs}:duration=first:normalize=0,"
            "alimiter=limit=0.93,"
            f"afade=t=out:st={total - 0.8}:d=0.8",
        "-ac", "2", "-ar", "48000",
        "-t", f"{total}",
        str(out_score),
    ], check=True, capture_output=True)
    for p in (drone, kick, hat, stab):
        p.unlink()
    return out_score


def mux(clips, score):
    out_mp4 = OUT / "brandmint-proofsprint.mp4"
    inputs = []
    for c in clips:
        inputs += ["-i", str(c)]
    chain = [f"[{i}:v]format=yuv420p,fps={FPS},setsar=1[v{i}]" for i in range(len(clips))]
    last = "[v0]"
    cum = BEATS[0].duration
    xfade_parts = []
    for i in range(1, len(clips)):
        offset = cum - XFADE
        out_label = f"[x{i}]" if i < len(clips) - 1 else "[vmix]"
        xfade_parts.append(
            f"{last}[v{i}]xfade=transition=fade:duration={XFADE}:offset={offset:.3f}{out_label}"
        )
        last = out_label
        cum += BEATS[i].duration - XFADE
    final = f"{last}fade=t=in:st=0:d=0.4,fade=t=out:st={cum - 0.6}:d=0.6[vout]"
    filtergraph = ";".join(chain + xfade_parts + [final])
    print(f"[mux] composition duration: {cum:.2f}s")
    subprocess.run([
        "ffmpeg", "-y",
        *inputs,
        "-i", str(score),
        "-filter_complex", filtergraph,
        "-map", "[vout]",
        "-map", f"{len(clips)}:a",
        "-c:v", "libx264", "-preset", "medium", "-crf", "22",
        "-tune", "stillimage",
        "-maxrate", "5M", "-bufsize", "10M",
        "-pix_fmt", "yuv420p",
        "-r", str(FPS),
        "-c:a", "aac", "-b:a", "160k", "-ar", "48000",
        "-movflags", "+faststart",
        "-shortest",
        str(out_mp4),
    ], check=True, capture_output=True)
    size_mb = out_mp4.stat().st_size / 1024 / 1024
    print(f"[done] {out_mp4} ({size_mb:.2f} MB, ~{cum:.2f}s)")
    return out_mp4


def main():
    # Clean
    for d in (FRAMES, CLIPS):
        for child in list(d.iterdir()) if d.exists() else []:
            if child.is_file():
                child.unlink()
            elif child.is_dir():
                for f in child.iterdir():
                    f.unlink()
                child.rmdir()

    clips = []
    for b in BEATS:
        bd, n = render_beat(b)
        print(f"[render] {b.id}: {n} frames")
        clip = encode_beat(b, bd, n)
        clips.append(clip)

    total = sum(b.duration for b in BEATS) - XFADE * (len(BEATS) - 1)
    print(f"[score] for {total:.2f}s")
    score = build_score(total + 0.4)
    mux(clips, score)


if __name__ == "__main__":
    main()
