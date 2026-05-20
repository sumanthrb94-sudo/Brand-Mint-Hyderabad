"""
BrandMint Studios — Social Proof Sprint (Script 8) — v6 build.

Production-ready, symmetrical, center-aligned. 7 beats, 25.7s, 4/4 driving.
Audio hits land ON the visual cuts via single-stage amix anchored to a
silence track (anullsrc) for guaranteed full-duration output.
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

W, H = 1080, 1920
FPS = 30
CX = W / 2  # canvas horizontal center — every beat composition pivots around this

# Tokens
BLACK = "#000000"
INK = "#0A0E0C"
CREAM = "#F5F1EA"
WHITE_CARD = "#FFFFFF"
LINE_LIGHT = "#E5E1D5"
MUTED = "#7C7468"
MINT_1 = "#D6F5E6"
MINT_3 = "#10B981"
MINT_4 = "#047857"

DISPLAY = "Plus Jakarta Sans, Inter, system-ui, sans-serif"
MONO = "JetBrains Mono, ui-monospace, monospace"
BODY = "Inter, system-ui, sans-serif"


def ease_out_cubic(t): return 1 - (1 - t) ** 3
def clamp(x, lo=0.0, hi=1.0): return max(lo, min(hi, x))


DEFS = f"""
<defs>
  <linearGradient id="mark" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#7CF6C8"/>
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


def chrome(dark=False):
    fg = CREAM if dark else MUTED
    return f"""
    <text x="{CX}" y="80" text-anchor="middle" font-family="{MONO}" font-size="22"
          letter-spacing="0.18em" fill="{fg}" opacity="0.7">BRANDMINT STUDIOS</text>
    <text x="{CX}" y="{H-50}" text-anchor="middle" font-family="{MONO}" font-size="22"
          letter-spacing="0.06em" fill="{fg}" opacity="0.7">brandmint.studios</text>
    """


# ============================================================
# BEAT 1 — Built in 7 weeks. (CRM dashboard mockup, centered)
# ============================================================
def beat_1(t, dur):
    head_op = ease_out_cubic(clamp(t / 0.5))
    tile_ops = [ease_out_cubic(clamp((t - 0.6 - i * 0.18) / 0.45)) for i in range(4)]
    bar_progress = ease_out_cubic(clamp((t - 1.6) / 0.9))

    # CRM card: 920×900, centered horizontally
    card_w, card_h = 920, 900
    card_x = (W - card_w) // 2  # = 80
    card_y = 580
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

    # 2x2 stat tiles centered inside the right panel
    panel_x = card_x + sb_w + 32
    panel_w = card_w - sb_w - 64
    tile_w = (panel_w - 16) // 2
    tile_h = 170
    tiles_data = [
        ("CUSTOMERS",       "4,218",  "+12%"),
        ("DEALS · IN PROG", "₹84.2L", "+9%"),
        ("CONVERSION",      "23.4%",  "+4.1%"),
        ("AVG TICKET",      "₹1.9L",  "+6%"),
    ]
    tiles_svg = ""
    for i, (label, value, delta) in enumerate(tiles_data):
        col, row = i % 2, i // 2
        tx = panel_x + col * (tile_w + 16)
        ty = card_y + 110 + row * (tile_h + 16)
        op = tile_ops[i]
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

    # Pipeline bar
    bar_y = card_y + 110 + 2 * (tile_h + 16) + 24
    bar_w = panel_w
    bar_h = 16
    fill_w = bar_w * bar_progress
    pipeline_svg = f"""
    <g opacity="{ease_out_cubic(clamp((t - 1.4) / 0.5))}">
      <text x="{panel_x}" y="{bar_y - 18}" font-family="{MONO}" font-size="14"
            letter-spacing="0.16em" fill="{MUTED}">PIPELINE · Q3 → Q4</text>
      <rect x="{panel_x}" y="{bar_y}" width="{bar_w}" height="{bar_h}" rx="8"
            fill="{LINE_LIGHT}"/>
      <rect x="{panel_x}" y="{bar_y}" width="{fill_w}" height="{bar_h}" rx="8"
            fill="{MINT_3}"/>
    </g>
    """

    inner = f"""
    {chrome(dark=False)}
    <text x="{CX}" y="280" text-anchor="middle" font-family="{DISPLAY}" font-size="110"
          font-weight="600" letter-spacing="-0.03em" fill="{INK}"
          opacity="{head_op}">Built in</text>
    <text x="{CX}" y="430" text-anchor="middle" font-family="{DISPLAY}" font-size="160"
          font-weight="600" letter-spacing="-0.03em" fill="{MINT_3}"
          opacity="{head_op}">7 weeks.</text>
    <g>
      <rect x="{card_x}" y="{card_y}" width="{card_w}" height="{card_h}" rx="18"
            fill="{WHITE_CARD}" stroke="{LINE_LIGHT}"/>
      <text x="{card_x + card_w//2}" y="{card_y + 50}" text-anchor="middle"
            font-family="{MONO}" font-size="16" letter-spacing="0.16em"
            fill="{MUTED}">{"&#9679;"} CRM · CUSTOM BUILD</text>
      <line x1="{card_x + 20}" y1="{card_y + 70}" x2="{card_x + card_w - 20}"
            y2="{card_y + 70}" stroke="{LINE_LIGHT}"/>
      {sidebar_svg}
      {tiles_svg}
      {pipeline_svg}
    </g>
    """
    return svg_wrap(CREAM, inner)


# ============================================================
# BEAT 2 — ₹0 monthly SaaS fees. (centered rows + centered stamp)
# ============================================================
def beat_2(t, dur):
    head_op = ease_out_cubic(clamp(t / 0.5))
    strike_progress = [ease_out_cubic(clamp((t - 0.6 - i * 0.4) / 0.4)) for i in range(3)]
    stamp_op = ease_out_cubic(clamp((t - 1.9) / 0.4))
    stamp_scale = 0.85 + 0.15 * stamp_op

    rows = [
        ("CRM platform",       "₹2,400 / mo"),
        ("Email marketing",    "₹3,600 / mo"),
        ("Project management", "₹1,800 / mo"),
    ]
    row_w = 880
    row_x = (W - row_w) // 2  # = 100
    rows_svg = ""
    for i, (label, value) in enumerate(rows):
        y = 720 + i * 100
        s = strike_progress[i]
        rows_svg += f"""
        <rect x="{row_x}" y="{y - 30}" width="{row_w}" height="70" rx="10"
              fill="{WHITE_CARD}" stroke="{LINE_LIGHT}"/>
        <text x="{row_x + 30}" y="{y + 18}" font-family="{BODY}" font-size="30"
              font-weight="500" fill="{INK}" opacity="{1 - s * 0.5}">{label}</text>
        <text x="{row_x + row_w - 30}" y="{y + 18}" text-anchor="end" font-family="{MONO}"
              font-size="30" font-weight="500" fill="{INK}"
              opacity="{1 - s * 0.5}">{value}</text>
        <line x1="{row_x + 25}" y1="{y + 5}" x2="{row_x + 25 + (row_w - 50) * s}"
              y2="{y + 5}" stroke="{MINT_3}" stroke-width="4"/>
        """

    stamp_w, stamp_h = 560, 220
    stamp_x = (W - stamp_w) // 2  # centered
    stamp_y = H - 600

    inner = f"""
    {chrome(dark=False)}
    <text x="{CX}" y="260" text-anchor="middle" font-family="{DISPLAY}" font-size="110"
          font-weight="600" letter-spacing="-0.03em" fill="{INK}"
          opacity="{head_op}">₹0 monthly</text>
    <text x="{CX}" y="390" text-anchor="middle" font-family="{DISPLAY}" font-size="110"
          font-weight="600" letter-spacing="-0.03em" fill="{INK}"
          opacity="{head_op}">SaaS fees.</text>
    {rows_svg}
    <g opacity="{stamp_op}" transform="translate({CX} {stamp_y + stamp_h//2}) scale({stamp_scale}) translate({-CX} {-(stamp_y + stamp_h//2)})">
      <rect x="{stamp_x}" y="{stamp_y}" width="{stamp_w}" height="{stamp_h}" rx="18"
            fill="{MINT_3}"/>
      <text x="{CX}" y="{stamp_y + 120}" text-anchor="middle" font-family="{MONO}"
            font-size="100" font-weight="600" fill="{INK}">₹0 / mo.</text>
      <text x="{CX}" y="{stamp_y + 185}" text-anchor="middle" font-family="{BODY}"
            font-size="22" letter-spacing="0.18em" fill="{INK}"
            opacity="0.78">YOU OWN THE CODEBASE.</text>
    </g>
    """
    return svg_wrap(CREAM, inner)


# ============================================================
# BEAT 3 — 10,247 users. 0 crashes. (centered stacked, chart centered)
# ============================================================
def beat_3(t, dur):
    head_op = ease_out_cubic(clamp(t / 0.4))
    chart_progress = ease_out_cubic(clamp((t - 0.5) / 1.2))
    counter_progress = ease_out_cubic(clamp((t - 1.6) / 0.7))
    counter_val = int(10247 * counter_progress)

    chart_w, chart_h = 880, 460
    chart_x = (W - chart_w) // 2  # = 100
    chart_y = 1020

    pts = [(0.0, 0.85), (0.10, 0.78), (0.22, 0.72), (0.35, 0.65),
           (0.45, 0.55), (0.58, 0.42), (0.68, 0.38), (0.78, 0.22),
           (0.88, 0.18), (1.0, 0.10)]
    drawn = []
    for nx, ny in pts:
        if nx <= chart_progress:
            drawn.append((chart_x + nx * chart_w, chart_y + ny * chart_h))
    if drawn and chart_progress < 1.0:
        for i, (nx, ny) in enumerate(pts):
            if nx > chart_progress:
                if i > 0:
                    pnx, pny = pts[i - 1]
                    seg = (chart_progress - pnx) / max(0.001, nx - pnx)
                    drawn.append((chart_x + chart_progress * chart_w,
                                  chart_y + (pny + (ny - pny) * seg) * chart_h))
                break
    path_d = ""
    if drawn:
        path_d = f"M {drawn[0][0]} {drawn[0][1]}"
        for px, py in drawn[1:]:
            path_d += f" L {px} {py}"
    dot = ""
    if drawn:
        dx, dy = drawn[-1]
        dot = f'<circle cx="{dx}" cy="{dy}" r="10" fill="{MINT_3}" filter="url(#softGlow)"/>'

    inner = f"""
    {chrome(dark=True)}
    <text x="{CX}" y="240" text-anchor="middle" font-family="{MONO}" font-size="20"
          letter-spacing="0.18em" fill="{MINT_3}"
          opacity="{head_op * 0.9}">— PLATFORM HEALTH · LIVE</text>

    <!-- Stacked, centered counters -->
    <text x="{CX}" y="420" text-anchor="middle" font-family="{MONO}" font-size="170"
          font-weight="600" letter-spacing="-0.02em" fill="{CREAM}"
          opacity="{head_op}">{counter_val:,}</text>
    <text x="{CX}" y="490" text-anchor="middle" font-family="{DISPLAY}" font-size="44"
          font-weight="500" font-style="italic" fill="{CREAM}"
          opacity="{head_op * 0.85}">users.</text>

    <text x="{CX}" y="730" text-anchor="middle" font-family="{MONO}" font-size="220"
          font-weight="600" letter-spacing="-0.02em" fill="{MINT_3}"
          opacity="{head_op}" filter="url(#softGlow)">0</text>
    <text x="{CX}" y="810" text-anchor="middle" font-family="{DISPLAY}" font-size="56"
          font-weight="500" font-style="italic" fill="{CREAM}"
          opacity="{head_op * 0.92}">crashes.</text>

    <!-- chart card, centered -->
    <rect x="{chart_x - 20}" y="{chart_y - 60}" width="{chart_w + 40}" height="{chart_h + 80}"
          rx="18" fill="#0F1311" stroke="#1F2A24"/>
    <text x="{chart_x + chart_w//2}" y="{chart_y - 24}" text-anchor="middle"
          font-family="{MONO}" font-size="16" letter-spacing="0.16em"
          fill="{MUTED}">CPU LOAD · 30D · CUSTOM BUILD vs SaaS</text>

    <line x1="{chart_x}" y1="{chart_y + chart_h}" x2="{chart_x + chart_w}"
          y2="{chart_y + chart_h}" stroke="#2A3530" stroke-width="2"/>
    <line x1="{chart_x}" y1="{chart_y}" x2="{chart_x}" y2="{chart_y + chart_h}"
          stroke="#2A3530" stroke-width="2"/>

    <line x1="{chart_x}" y1="{chart_y + chart_h * 0.78}" x2="{chart_x + chart_w}"
          y2="{chart_y + chart_h * 0.78}" stroke="#5A6660" stroke-width="2"
          stroke-dasharray="8 8" opacity="0.7"/>
    <text x="{chart_x + chart_w - 8}" y="{chart_y + chart_h * 0.78 - 12}" text-anchor="end"
          font-family="{MONO}" font-size="14" letter-spacing="0.12em"
          fill="#7A8680" opacity="0.7">SaaS baseline</text>

    <path d="{path_d}" fill="none" stroke="{MINT_3}" stroke-width="4"
          stroke-linecap="round" stroke-linejoin="round" filter="url(#softGlow)"/>
    {dot}

    <!-- Uptime badge centered above the chart -->
    <g transform="translate({CX - 110} {chart_y - 100})" opacity="{head_op}">
      <rect x="0" y="0" width="220" height="60" rx="30" fill="{MINT_3}"/>
      <text x="110" y="40" text-anchor="middle" font-family="{MONO}" font-size="22"
            font-weight="600" fill="{INK}">UPTIME 99.97%</text>
    </g>
    """
    return svg_wrap("#06090A", inner)


# ============================================================
# BEAT 4 — Three tools → one platform. (centered headline, tabs, dashboard)
# ============================================================
def beat_4(t, dur):
    head_op = ease_out_cubic(clamp(t / 0.4))
    if t < 0.5:
        tab_ops = [0, 0, 0]
        dashboard_op = 0
    elif t < 1.2:
        tab_ops = [ease_out_cubic(clamp((t - 0.5 - i * 0.1) / 0.25)) for i in range(3)]
        dashboard_op = 0
    elif t < 1.8:
        tab_ops = [max(0, 1 - ease_out_cubic(clamp((t - 1.2 - i * 0.12) / 0.18))) for i in range(3)]
        dashboard_op = ease_out_cubic(clamp((t - 1.4) / 0.4))
    else:
        tab_ops = [0, 0, 0]
        dashboard_op = 1.0

    tab_w, tab_h = 290, 80
    tabs_total_w = 3 * tab_w + 2 * 20
    tabs_start_x = (W - tabs_total_w) // 2  # centered
    tab_y = 760
    tab_labels = ["crm.salesplatform.io", "billing.invoicepro.app", "tasks.projecthub.com"]
    tabs_svg = ""
    for i, label in enumerate(tab_labels):
        tx = tabs_start_x + i * (tab_w + 20)
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

    dash_w, dash_h = 920, 560
    dash_x = (W - dash_w) // 2
    dash_y = 880
    mod_w = (dash_w - 96) // 3
    mod_y = dash_y + 110
    modules = [("CRM", "4,218", "customers · live"),
               ("BILLING", "₹14.2L", "in flight"),
               ("TASKS", "142", "open")]
    modules_svg = ""
    for i, (lbl, val, sub) in enumerate(modules):
        mx = dash_x + 32 + i * (mod_w + 16)
        modules_svg += f"""
        <rect x="{mx}" y="{mod_y}" width="{mod_w}" height="200" rx="14"
              fill="{MINT_1}" stroke="{MINT_3}" stroke-opacity="0.3"/>
        <text x="{mx + 20}" y="{mod_y + 40}" font-family="{MONO}" font-size="14"
              letter-spacing="0.16em" fill="{MINT_4}">{lbl}</text>
        <text x="{mx + 20}" y="{mod_y + 110}" font-family="{MONO}" font-size="44"
              font-weight="600" fill="{INK}">{val}</text>
        <text x="{mx + 20}" y="{mod_y + 160}" font-family="{BODY}" font-size="16"
              fill="{INK}" opacity="0.62">{sub}</text>
        """

    dashboard_svg = f"""
    <g opacity="{dashboard_op}">
      <rect x="{dash_x}" y="{dash_y}" width="{dash_w}" height="{dash_h}" rx="18"
            fill="{WHITE_CARD}" stroke="{LINE_LIGHT}"/>
      <text x="{dash_x + dash_w//2}" y="{dash_y + 48}" text-anchor="middle"
            font-family="{DISPLAY}" font-size="26" font-weight="600"
            fill="{INK}">Operations · one platform</text>
      <line x1="{dash_x + 16}" y1="{dash_y + 76}" x2="{dash_x + dash_w - 16}"
            y2="{dash_y + 76}" stroke="{LINE_LIGHT}"/>
      {modules_svg}
      <text x="{dash_x + dash_w//2}" y="{mod_y + 240}" text-anchor="middle"
            font-family="{MONO}" font-size="14" letter-spacing="0.14em"
            fill="{MUTED}">API · ONE DB · LIVE SYNC</text>
      <line x1="{dash_x + 32}" y1="{mod_y + 264}" x2="{dash_x + dash_w - 32}"
            y2="{mod_y + 264}" stroke="{MINT_3}" stroke-width="2"
            stroke-dasharray="6 6"/>
      <text x="{dash_x + dash_w//2}" y="{mod_y + 320}" text-anchor="middle"
            font-family="{BODY}" font-size="20" fill="{INK}"
            opacity="0.7">No CSV exports. No webhook hacks.</text>
      <text x="{dash_x + dash_w//2}" y="{mod_y + 360}" text-anchor="middle"
            font-family="{BODY}" font-size="22" font-weight="600"
            fill="{INK}">Your tools talk natively.</text>
    </g>
    """

    inner = f"""
    {chrome(dark=False)}
    <text x="{CX}" y="290" text-anchor="middle" font-family="{DISPLAY}" font-size="110"
          font-weight="600" letter-spacing="-0.03em" fill="{INK}"
          opacity="{head_op}">Three tools</text>
    <text x="{CX}" y="420" text-anchor="middle" font-family="{DISPLAY}" font-size="110"
          font-weight="600" letter-spacing="-0.03em" fill="{MINT_3}"
          font-style="italic" opacity="{head_op}">→ one platform.</text>
    {tabs_svg}
    {dashboard_svg}
    """
    return svg_wrap(CREAM, inner)


# ============================================================
# BEAT 5 — Quote (centered)
# ============================================================
def beat_5(t, dur):
    head_op = ease_out_cubic(clamp(t / 0.5))
    quote_op = ease_out_cubic(clamp((t - 0.4) / 0.8))
    attrib_op = ease_out_cubic(clamp((t - 1.2) / 0.6))

    inner = f"""
    {chrome(dark=True)}
    <text x="{CX}" y="240" text-anchor="middle" font-family="{MONO}" font-size="20"
          letter-spacing="0.18em" fill="{MINT_3}"
          opacity="{head_op * 0.85}">— CLIENT</text>

    <text x="{CX}" y="540" text-anchor="middle" font-family="{DISPLAY}" font-size="180"
          font-weight="700" fill="{MINT_3}" opacity="0.16">&#8220;</text>

    <g opacity="{quote_op}" font-family="{DISPLAY}" font-weight="500"
       letter-spacing="-0.015em" fill="{CREAM}">
      <text x="{CX}" y="820" text-anchor="middle" font-size="84">We finally</text>
      <text x="{CX}" y="940" text-anchor="middle" font-size="84" font-style="italic"
            fill="{MINT_3}">own our tech.</text>
    </g>

    <g opacity="{attrib_op}" transform="translate({CX - 165} 1180)">
      <rect width="110" height="110" rx="16" fill="{MINT_3}"/>
      <text x="55" y="78" text-anchor="middle" font-family="{DISPLAY}" font-size="60"
            font-weight="600" fill="{INK}">A</text>
      <text x="146" y="50" font-family="{DISPLAY}" font-size="34" font-weight="600"
            fill="{CREAM}">Arjun R.</text>
      <text x="146" y="90" font-family="{BODY}" font-size="22" fill="{CREAM}"
            opacity="0.7">Founder · D2C wellness</text>
    </g>
    """
    return svg_wrap("#06090A", inner)


# ============================================================
# BEAT 6 — Logo (already centered)
# ============================================================
def beat_6(t, dur):
    op = ease_out_cubic(clamp(t / 0.4))
    scale = 0.95 + 0.05 * op
    cy = H / 2 - 60
    mr = 180

    inner = f"""
    {chrome(dark=True)}
    <g transform="translate({CX} {cy}) scale({scale}) translate({-CX} {-cy})"
       opacity="{op}" filter="url(#softGlow)">
      <circle cx="{CX}" cy="{cy}" r="{mr}" fill="url(#mark)"/>
      <path d="M{CX - mr * 0.42} {cy + mr * 0.42}
               V {cy - mr * 0.38}
               l {mr * 0.42} {mr * 0.38}
               l {mr * 0.42} {-mr * 0.38}
               V {cy + mr * 0.42}"
            stroke="{INK}" stroke-width="20" stroke-linecap="round"
            stroke-linejoin="round" fill="none"/>
    </g>
    <text x="{CX}" y="{cy + mr + 140}" text-anchor="middle" font-family="{DISPLAY}"
          font-size="96" font-weight="600" letter-spacing="-0.02em" fill="{CREAM}"
          opacity="{op}">BrandMint Studios.</text>
    <text x="{CX}" y="{cy + mr + 220}" text-anchor="middle" font-family="{MONO}"
          font-size="22" letter-spacing="0.22em" fill="{CREAM}"
          opacity="{op * 0.65}">HYDERABAD &#8594; WORLDWIDE</text>
    """
    return svg_wrap(BLACK, inner)


# ============================================================
# BEAT 7 — CTA (centered)
# ============================================================
def beat_7(t, dur):
    head_op = ease_out_cubic(clamp(t / 0.4))
    pill_op = ease_out_cubic(clamp((t - 1.2) / 0.5))
    pill_dy = (1 - pill_op) * 60

    pill_w = 760
    pill_x = (W - pill_w) // 2

    inner = f"""
    {chrome(dark=True)}
    <g font-family="{DISPLAY}" font-weight="600" letter-spacing="-0.025em" fill="{CREAM}">
      <text x="{CX}" y="540" text-anchor="middle" font-size="84"
            opacity="{head_op}">Custom software.</text>
      <text x="{CX}" y="660" text-anchor="middle" font-size="84"
            opacity="{head_op}">Custom websites.</text>
    </g>
    <text x="{CX}" y="800" text-anchor="middle" font-family="{MONO}" font-size="28"
          letter-spacing="0.18em" fill="{MINT_3}"
          opacity="{head_op * 0.85}">HYDERABAD &#8594; WORLDWIDE</text>

    <g transform="translate(0 {pill_dy})" opacity="{pill_op}" filter="url(#softGlow)">
      <rect x="{pill_x}" y="1100" width="{pill_w}" height="160" rx="80" fill="{MINT_3}"/>
      <text x="{CX}" y="1200" text-anchor="middle" font-family="{DISPLAY}" font-size="42"
            font-weight="600" fill="{INK}">DM "BUILT" to scope your build</text>
    </g>

    <text x="{CX}" y="1380" text-anchor="middle" font-family="{BODY}" font-size="24"
          fill="{CREAM}" opacity="{head_op * 0.6}">Free 20-min scoping call · no pitch · just architecture.</text>
    """
    return svg_wrap(BLACK, inner)


# ============================================================
# Beats
# ============================================================
@dataclass
class Beat:
    id: str
    duration: float
    render: Callable[[float, float], str]


BEATS = [
    Beat("01-built-7w",   3.5, beat_1),
    Beat("02-zero-saas",  3.5, beat_2),
    Beat("03-10k-zero",   3.5, beat_3),
    Beat("04-3to1",       3.5, beat_4),
    Beat("05-quote",      4.0, beat_5),
    Beat("06-logo",       3.0, beat_6),
    Beat("07-cta",        5.5, beat_7),
]
XFADE = 0.13


# ============================================================
# Pipeline
# ============================================================
def render_beat(beat):
    bd = FRAMES / beat.id
    bd.mkdir(parents=True, exist_ok=True)
    n = int(round(beat.duration * FPS))
    for i in range(n):
        t = i / FPS
        svg = beat.render(t, beat.duration)
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
        "-pix_fmt", "yuv420p",
        "-r", str(FPS),
        str(out),
    ], check=True, capture_output=True)
    return out


def build_score(total):
    """Direct numpy audio synthesis — bypasses ffmpeg amix entirely.

    Drone bed + per-beat hit (kick + chord stab) + CTA cymbal swell.
    Each hit is placed at the exact sample index for its beat boundary.
    """
    import numpy as np
    sr = 48000
    n_samples = int(round(total * sr))

    beat_starts = [0.0]
    cum = BEATS[0].duration
    for i in range(1, len(BEATS)):
        beat_starts.append(cum)
        cum += BEATS[i].duration - XFADE

    # --- Stems (mono float arrays, will be duplicated to stereo at the end) ---
    def adsr(n, attack_n, release_n):
        env = np.ones(n)
        if attack_n:
            env[:attack_n] = np.linspace(0, 1, attack_n)
        if release_n:
            env[-release_n:] = np.linspace(1, 0, release_n) ** 2  # exp decay
        return env

    # Drone bed — quiet so hits punch through
    t_axis = np.arange(n_samples) / sr
    drone = (0.18 * np.sin(2 * np.pi * 55 * t_axis)
             + 0.10 * np.sin(2 * np.pi * 82.4 * t_axis)
             + 0.08 * np.sin(2 * np.pi * 110 * t_axis))
    # Fade-in/out
    fade_n = int(0.8 * sr)
    drone[:fade_n] *= np.linspace(0, 1, fade_n)
    drone[-fade_n:] *= np.linspace(1, 0, fade_n)

    # Kick stem: 60Hz sine, 200ms with sharp attack + decay
    kick_dur = 0.20
    kick_n = int(kick_dur * sr)
    kt = np.arange(kick_n) / sr
    kick = 0.85 * np.sin(2 * np.pi * 60 * kt)
    kick *= adsr(kick_n, int(0.003 * sr), int(0.18 * sr))

    # Stab stem: perfect-fifth chord (A2 + E3 + A3), 400ms with quick attack
    stab_dur = 0.40
    stab_n = int(stab_dur * sr)
    st_t = np.arange(stab_n) / sr
    stab = (0.45 * np.sin(2 * np.pi * 110 * st_t)
            + 0.35 * np.sin(2 * np.pi * 164.8 * st_t)
            + 0.22 * np.sin(2 * np.pi * 220 * st_t))
    stab *= adsr(stab_n, int(0.005 * sr), int(0.36 * sr))

    # Riser: filtered noise crescendo, 300ms preceding each cut
    riser_dur = 0.30
    riser_n = int(riser_dur * sr)
    rng = np.random.default_rng(seed=42)
    riser_noise = rng.standard_normal(riser_n) * 0.45
    # Crude bandpass via difference equation
    from scipy.signal import butter, lfilter  # noqa: E402
    try:
        b, a = butter(2, [400 / (sr / 2), 3500 / (sr / 2)], btype="band")
        riser_noise = lfilter(b, a, riser_noise)
    except Exception:
        pass
    # Exp swell envelope
    riser_env = np.linspace(0, 1, riser_n) ** 1.8
    riser = riser_noise * riser_env

    # Cymbal swell: filtered pink noise, 2s, slow swell-and-release for CTA
    cym_dur = 2.5
    cym_n = int(cym_dur * sr)
    cym_noise = rng.standard_normal(cym_n) * 0.35
    try:
        b, a = butter(2, [3500 / (sr / 2), 11000 / (sr / 2)], btype="band")
        cym_noise = lfilter(b, a, cym_noise)
    except Exception:
        pass
    swell_env = np.concatenate([
        np.linspace(0, 1, int(1.6 * sr)) ** 1.4,
        np.linspace(1, 0, cym_n - int(1.6 * sr)) ** 0.7,
    ])
    cymbal = cym_noise * swell_env

    # --- Compose: place each stem at its sample index ---
    out = drone.copy()

    def add_stem(stem, when_seconds):
        idx = int(round(when_seconds * sr))
        if idx < 0:
            stem = stem[-idx:]
            idx = 0
        end = min(n_samples, idx + len(stem))
        n_use = end - idx
        if n_use > 0:
            out[idx:end] += stem[:n_use]

    # Per-beat: kick (5ms early) + stab AT the boundary + riser INTO it
    for i, bt in enumerate(beat_starts):
        if i > 0:
            add_stem(riser, bt - 0.30)
        add_stem(kick, max(0, bt - 0.005))
        add_stem(stab, bt)
    # Cymbal swell on CTA beat
    add_stem(cymbal, beat_starts[-1] - 0.10)

    # Soft limit / normalize
    peak = np.max(np.abs(out))
    if peak > 0.95:
        out = out * (0.95 / peak)

    # Final fade-out tail
    fade_tail_n = int(0.6 * sr)
    out[-fade_tail_n:] *= np.linspace(1, 0, fade_tail_n)

    # Stereo
    stereo = np.column_stack([out, out])

    # Write WAV (16-bit PCM)
    stereo_int16 = (stereo * 32767).astype(np.int16)
    out_score = OUT / "score.wav"
    import wave
    with wave.open(str(out_score), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(stereo_int16.tobytes())

    print(f"[score] beat-sync hits at: {[round(b, 2) for b in beat_starts]}")
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
        "ffmpeg", "-y", *inputs,
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
    print(f"[done] {out_mp4} ({out_mp4.stat().st_size / 1024 / 1024:.2f} MB, ~{cum:.2f}s)")
    return out_mp4


def main():
    for d in (FRAMES, CLIPS):
        for c in list(d.iterdir()) if d.exists() else []:
            if c.is_file():
                c.unlink()
            else:
                for f in c.iterdir():
                    f.unlink()
                c.rmdir()
    clips = []
    for b in BEATS:
        bd, n = render_beat(b)
        print(f"[render] {b.id}: {n} frames")
        clips.append(encode_beat(b, bd, n))
    total = sum(b.duration for b in BEATS) - XFADE * (len(BEATS) - 1)
    print(f"[score] for {total:.2f}s")
    score = build_score(total + 0.4)
    mux(clips, score)


if __name__ == "__main__":
    main()
