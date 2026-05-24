"""
BrandMint Studios — v20 BRAND-BEAST · MrBeast structure, Brand Mint palette.

Same layout, motion, timing, and audio as v19 — but every BEAST color
(yellow/red/blue/green) swapped for Brand Mint's actual palette
(mint-2/mint-3/mint-4 on warm-black ground with cream typography).

This is the A/B partner to v19: does the high-retention MrBeast STRUCTURE
still drive engagement when wrapped in the on-brand color system, or
does the energy depend on the high-contrast yellow/red?

Run: python3 build_brandbeast.py
"""

from __future__ import annotations

import math
import os
import random
import shutil
import subprocess
import wave
from dataclasses import dataclass, field
from pathlib import Path
from typing import List

import cairosvg
import numpy as np
from PIL import ImageFont

# ----- canvas + bpm -------------------------------------------------------

W, H, FPS = 1080, 1920, 60
BPM = int(os.environ.get("BPM", "130"))
BEAT_SEC = 60.0 / BPM
def beats(n: float) -> float: return n * BEAT_SEC

# ----- Brand Mint palette (BEAST tokens remapped) -------------------------
# Per BRAND-GUIDELINES.md §3. The BEAST_* names are kept so we don't have
# to rewrite every reference, but the values are the canonical mint stack.

BEAST_BLACK = "#070A09"         # INK — warm-black ground
BEAST_WHITE = "#F5F1EA"         # PAPER — cream display text
BEAST_YELLOW = "#7CF6C8"        # MINT_2 — bright mint highlight (was the yellow)
BEAST_RED = "#10B981"           # MINT_3 — primary mint (arrows + emphasis)
BEAST_BLUE = "#047857"          # MINT_4 — deep mint accent
BEAST_GREEN = "#047857"         # MINT_4 — money chip bg
BEAST_PINK = "#10B981"          # MINT_3 — fallback

# Pure white still used selectively for max-contrast stroke punches
PURE_WHITE = "#FFFFFF"

# Brand Mint canonical (still referenced by mark draw)
MINT = "#10B981"
MINT_2 = "#7CF6C8"
INK_2 = "#070A09"

# Typography (stays Brand Mint's)
FONT_DISPLAY = "Plus Jakarta Sans, system-ui, sans-serif"
FONT_MONO = "JetBrains Mono, ui-monospace, monospace"
_DEJAVU_BOLD = "/usr/local/share/fonts/brandmint/PlusJakartaSans-ExtraBold.ttf"
_DEJAVU_MONO = "/usr/local/share/fonts/brandmint/JetBrainsMono-Bold.ttf"

HERE = Path(__file__).parent
FRAMES = HERE / "frames"
OUT = HERE / "out"
FRAMES.mkdir(exist_ok=True)
OUT.mkdir(exist_ok=True)

SAFE_TEXT_W = 960     # slightly wider safe zone for BEAST mega-text

_LOGO_SVG_PATH = Path(__file__).resolve().parent.parent.parent / "logo" / "brand-mint-monogram.svg"
_LOGO_SVG_SRC = _LOGO_SVG_PATH.read_text() if _LOGO_SVG_PATH.exists() else None

# ----- fonts --------------------------------------------------------------

_font_cache: dict = {}
def _font(pt: int, kind: str = "bold"):
    key = (pt, kind)
    if key not in _font_cache:
        path = {"bold": _DEJAVU_BOLD, "mono": _DEJAVU_MONO}[kind]
        _font_cache[key] = ImageFont.truetype(path, pt)
    return _font_cache[key]

def measure(text: str, pt: int, kind: str = "bold") -> float:
    if not text:
        return 0.0
    l, _, r, _ = _font(pt, kind).getbbox(text)
    return float(r - l)

def fit_to_width(text: str, max_w_px: float, start_pt: int,
                 floor_pt: int = 36, kind: str = "bold",
                 step: int = 2) -> int:
    for pt in range(start_pt, floor_pt - 1, -step):
        if measure(text, pt, kind) <= max_w_px:
            return pt
    return floor_pt

def esc(s: str) -> str:
    return (s.replace("&", "&amp;").replace("<", "&lt;")
             .replace(">", "&gt;").replace('"', "&quot;"))

# ----- easing -------------------------------------------------------------

def lerp(a, b, t): return a + (b - a) * t

def clamp01(t: float) -> float:
    return 0.0 if t < 0 else 1.0 if t > 1 else t

def ease_out_cubic(t: float) -> float:
    t = clamp01(t)
    return 1 - (1 - t) ** 3

def ease_out_quint(t: float) -> float:
    t = clamp01(t)
    return 1 - (1 - t) ** 5

def ease_in_cubic(t: float) -> float:
    t = clamp01(t)
    return t ** 3

def back_out(t: float) -> float:
    t = clamp01(t)
    s = 2.2  # more overshoot for BEAST feel
    return 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2

def smoothstep(edge0: float, edge1: float, x: float) -> float:
    t = clamp01((x - edge0) / (edge1 - edge0)) if edge1 > edge0 else 0.0
    return t * t * (3 - 2 * t)

# ----- BEAST helpers ------------------------------------------------------

def stroke_text(text: str, x: float, y: float, pt: int,
                fill: str = BEAST_YELLOW,
                stroke: str = BEAST_BLACK,
                stroke_w: int = 8,
                weight: int = 900,
                anchor: str = "middle",
                letter_spacing: str = "-0.02em",
                opacity: float = 1.0,
                kind_font: str = FONT_DISPLAY) -> str:
    """BEAST-style text: bright fill + thick black stroke."""
    return (
        f'<text x="{x:.1f}" y="{y:.1f}" font-family="{kind_font}" '
        f'font-size="{pt}" font-weight="{weight}" fill="{fill}" '
        f'stroke="{stroke}" stroke-width="{stroke_w}" '
        f'paint-order="stroke fill" stroke-linejoin="round" '
        f'text-anchor="{anchor}" letter-spacing="{letter_spacing}" '
        f'opacity="{opacity:.3f}">'
        f"{esc(text)}</text>"
    )

def color_block(x: float, y: float, w: float, h: float,
                fill: str, rotate_deg: float = -2.0,
                stroke: str = BEAST_BLACK, stroke_w: int = 6,
                opacity: float = 1.0) -> str:
    """Skewed/rotated color block — MrBeast loves these."""
    cx_block = x + w / 2
    cy_block = y + h / 2
    return (
        f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" '
        f'fill="{fill}" stroke="{stroke}" stroke-width="{stroke_w}" '
        f'opacity="{opacity:.3f}" '
        f'transform="rotate({rotate_deg} {cx_block:.1f} {cy_block:.1f})"/>'
    )

def red_arrow(x1: float, y1: float, x2: float, y2: float,
              opacity: float = 1.0, stroke_w: int = 10) -> str:
    """Hand-drawn-feeling curved red arrow with arrowhead."""
    mx = (x1 + x2) / 2
    my = (y1 + y2) / 2
    # Control point offset perpendicular for curve
    dx = x2 - x1
    dy = y2 - y1
    L = math.hypot(dx, dy) or 1
    nx = -dy / L
    ny = dx / L
    curve = min(120, L * 0.3)
    cpx = mx + nx * curve
    cpy = my + ny * curve
    # Arrowhead
    angle = math.atan2(y2 - cpy, x2 - cpx)
    head = 30
    h1x = x2 - head * math.cos(angle - 0.5)
    h1y = y2 - head * math.sin(angle - 0.5)
    h2x = x2 - head * math.cos(angle + 0.5)
    h2y = y2 - head * math.sin(angle + 0.5)
    return (
        f'<g opacity="{opacity:.3f}">'
        f'<path d="M {x1:.1f} {y1:.1f} Q {cpx:.1f} {cpy:.1f} {x2:.1f} {y2:.1f}" '
        f'stroke="{BEAST_RED}" stroke-width="{stroke_w}" fill="none" '
        f'stroke-linecap="round"/>'
        f'<path d="M {x2:.1f} {y2:.1f} L {h1x:.1f} {h1y:.1f} M {x2:.1f} {y2:.1f} L {h2x:.1f} {h2y:.1f}" '
        f'stroke="{BEAST_RED}" stroke-width="{stroke_w}" fill="none" '
        f'stroke-linecap="round"/>'
        f'</g>'
    )

def red_circle_annotation(cx: float, cy: float, r: float,
                          draw_t: float = 1.0, opacity: float = 1.0,
                          stroke_w: int = 10) -> str:
    """Hand-drawn red circle around a key element."""
    # Draw via stroke-dasharray for a draw-on effect
    circumference = 2 * math.pi * r
    dash_offset = circumference * (1 - clamp01(draw_t))
    return (
        f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" '
        f'fill="none" stroke="{BEAST_RED}" stroke-width="{stroke_w}" '
        f'stroke-dasharray="{circumference:.1f}" '
        f'stroke-dashoffset="{dash_offset:.1f}" '
        f'stroke-linecap="round" opacity="{opacity:.3f}"/>'
    )

def stat_chip(x: float, y: float, label: str, value: str,
              bg: str = BEAST_GREEN, opacity: float = 1.0) -> str:
    """A '$1,000,000'-style stat callout chip."""
    val_pt = 96
    val_w = measure(value, val_pt) + 80
    val_h = 130
    lab_pt = 24
    lab_w = measure(label, lab_pt, kind="mono") + 40
    return (
        f'<g opacity="{opacity:.3f}">'
        f'<rect x="{x - val_w/2:.1f}" y="{y:.1f}" width="{val_w:.1f}" height="{val_h}" '
        f'fill="{bg}" stroke="{BEAST_BLACK}" stroke-width="6" rx="12"/>'
        f'{stroke_text(value, x, y + 96, val_pt, fill=BEAST_WHITE, stroke=BEAST_BLACK, stroke_w=6)}'
        f'<rect x="{x - lab_w/2:.1f}" y="{y + val_h + 4:.1f}" width="{lab_w:.1f}" height="44" '
        f'fill="{BEAST_BLACK}" rx="6"/>'
        f'<text x="{x:.1f}" y="{y + val_h + 34:.1f}" font-family="{FONT_MONO}" '
        f'font-size="{lab_pt}" font-weight="700" fill="{BEAST_WHITE}" '
        f'text-anchor="middle" letter-spacing="0.20em">{esc(label)}</text>'
        f'</g>'
    )

def shake_xy(t: float, magnitude: float, seed: int = 0) -> tuple:
    """Camera shake offset. Use during impact moments."""
    if magnitude <= 0:
        return (0.0, 0.0)
    rng = random.Random(int(t * 1000) + seed)
    return (
        (rng.random() - 0.5) * 2 * magnitude,
        (rng.random() - 0.5) * 2 * magnitude,
    )

def flash_frame(t: float, peak_at: float, width: float = 0.04,
                color: str = BEAST_WHITE) -> str:
    """White/colored full-frame flash centered at peak_at, falling
    off in `width` seconds either side. Use at every beat boundary."""
    if abs(t - peak_at) > width:
        return ""
    intensity = 1.0 - (abs(t - peak_at) / width)
    intensity = intensity ** 1.5
    return (
        f'<rect width="{W}" height="{H}" fill="{color}" '
        f'opacity="{intensity * 0.85:.3f}"/>'
    )

def draw_mark(cx: float, cy: float, scale: float, opacity: float = 1.0) -> str:
    """Brand Mint mark, used only at the end frame."""
    size = int(320 * scale)
    if size <= 4 or _LOGO_SVG_SRC is None:
        return ""
    uniq = f"{int(scale * 10000)}"
    svg = _LOGO_SVG_SRC
    svg = svg.replace('id="bmGrad"', f'id="bmGrad-{uniq}"')
    svg = svg.replace('url(#bmGrad)', f'url(#bmGrad-{uniq})')
    svg = svg.replace('width="64" height="64"',
                      f'width="{size}" height="{size}"')
    if svg.startswith("<?xml"):
        svg = svg.split("?>", 1)[1].lstrip()
    return (
        f'<g transform="translate({cx - size/2:.1f} {cy - size/2:.1f})" '
        f'opacity="{opacity:.3f}">{svg}</g>'
    )

# ----- beat schedule ------------------------------------------------------

@dataclass
class Beat:
    kind: str
    duration: float

# ~15s, 6 beats, fast pacing (CEO Bible: 1.5-3s cuts)
BEATS: List[Beat] = [
    Beat(kind="hook",    duration=beats(4.0)),    # 0:00-0:02
    Beat(kind="stakes",  duration=beats(4.0)),    # 0:02-0:04
    Beat(kind="method",  duration=beats(6.0)),    # 0:04-0:07 (4-7s)
    Beat(kind="winner",  duration=beats(6.0)),    # 0:07-0:10
    Beat(kind="recap",   duration=beats(6.0)),    # 0:10-0:13
    Beat(kind="cta",     duration=beats(4.0)),    # 0:13-0:15
]
# Beat to seconds at BPM=130: beats=60/130=0.462s. 4 beats = 1.85s. 6 beats = 2.77s.
# Total ≈ 4+4+6+6+6+4 = 30 beats × 0.462 = 13.85s. Adjust BPM target.
# At BPM=120: 30 beats × 0.5 = 15s. Use BPM=120.

TOTAL_S = sum(b.duration for b in BEATS)
TOTAL_F = int(round(TOTAL_S * FPS))

def beat_at(t_sec: float):
    cursor = 0.0
    for i, b in enumerate(BEATS):
        if t_sec < cursor + b.duration:
            local = (t_sec - cursor) / b.duration if b.duration > 0 else 1.0
            return i, max(0.0, min(1.0, local)), b, cursor
        cursor += b.duration
    return len(BEATS) - 1, 1.0, BEATS[-1], cursor - BEATS[-1].duration

# ===== SCENE BUILDERS =====================================================

def build_hook(b: Beat, local: float, t_sec: float) -> str:
    """0:00-0:02 — 5-line vertical stack. '13' is its own line at mega
    size with red circle annotation. Clean layout, no overlap."""
    cx = W // 2

    # Per-line cascade entrances
    l1_t = smoothstep(0.05, 0.18, local)
    l2_t = smoothstep(0.12, 0.26, local)
    l3_t = smoothstep(0.20, 0.38, local)  # the "13" — the focal moment
    l4_t = smoothstep(0.32, 0.46, local)
    l5_t = smoothstep(0.40, 0.55, local)
    kicker_t = smoothstep(0.55, 0.75, local)

    # Punch on the "13" at local 0.30-0.45
    num_punch = 1.0 + 0.16 * max(0, 1 - abs(local - 0.30) * 7)

    pt1 = fit_to_width("I RANKED",       SAFE_TEXT_W, 90,  floor_pt=72)
    pt2 = fit_to_width("HYDERABAD'S",    SAFE_TEXT_W, 96,  floor_pt=72)
    pt3 = int(fit_to_width("13",          SAFE_TEXT_W, 260, floor_pt=200) * num_punch)
    pt4 = fit_to_width("BIGGEST",        SAFE_TEXT_W, 96,  floor_pt=72)
    pt5 = fit_to_width("BUILDERS.",      SAFE_TEXT_W, 124, floor_pt=96)

    # Red circle around "13"
    circle_t = smoothstep(0.34, 0.58, local)

    return f"""
      <rect width="{W}" height="{H}" fill="{BEAST_BLACK}"/>

      <!-- Line 1: I RANKED -->
      <g opacity="{l1_t:.3f}" transform="translate(0 {lerp(20, 0, l1_t):.1f})">
        {stroke_text("I RANKED", cx, int(H * 0.14), pt1, fill=BEAST_WHITE)}
      </g>

      <!-- Line 2: HYDERABAD'S -->
      <g opacity="{l2_t:.3f}" transform="translate(0 {lerp(20, 0, l2_t):.1f})">
        {stroke_text("HYDERABAD'S", cx, int(H * 0.25), pt2, fill=BEAST_WHITE)}
      </g>

      <!-- Line 3: 13 (MEGA + red circle) -->
      <g opacity="{l3_t:.3f}" transform="translate(0 {lerp(40, 0, l3_t):.1f})">
        {stroke_text("13", cx, int(H * 0.50), pt3, fill=BEAST_YELLOW, stroke_w=12)}
      </g>
      <g opacity="{circle_t:.3f}">
        {red_circle_annotation(cx, int(H * 0.43), r=180, draw_t=circle_t, stroke_w=14)}
      </g>

      <!-- Line 4: BIGGEST -->
      <g opacity="{l4_t:.3f}" transform="translate(0 {lerp(20, 0, l4_t):.1f})">
        {stroke_text("BIGGEST", cx, int(H * 0.62), pt4, fill=BEAST_WHITE)}
      </g>

      <!-- Line 5: BUILDERS. -->
      <g opacity="{l5_t:.3f}" transform="translate(0 {lerp(20, 0, l5_t):.1f})">
        {stroke_text("BUILDERS.", cx, int(H * 0.74), pt5, fill=BEAST_WHITE)}
      </g>

      <!-- bottom mono kicker -->
      <text x="{cx}" y="{int(H * 0.88)}" font-family="{FONT_MONO}"
            font-size="26" font-weight="700" fill="{BEAST_YELLOW}"
            text-anchor="middle" letter-spacing="0.30em"
            opacity="{kicker_t:.3f}">
        IN 60 SECONDS.
      </text>
    """

def build_stakes(b: Beat, local: float, t_sec: float) -> str:
    """0:02-0:04 — '₹2,40,000 CRORES' giant green money chip."""
    cx = W // 2
    # Bg yellow block tilted
    block_t = back_out(clamp01(local / 0.22))

    # Chip slides up from bottom
    chip_t = back_out(clamp01((local - 0.10) / 0.30))
    chip_y = lerp(H + 200, int(H * 0.40), chip_t)

    # Label text
    label_a = smoothstep(0.40, 0.65, local)

    sx, sy = shake_xy(t_sec, magnitude=8 * max(0, 1 - abs(local - 0.32) * 10))

    return f"""
      <rect width="{W}" height="{H}" fill="{BEAST_BLACK}"/>

      <!-- huge tilted yellow block as background -->
      {color_block(60, 360, W - 120, 760, fill=BEAST_YELLOW,
                   rotate_deg=-3.0, opacity=block_alpha_safe(block_t))}

      <g transform="translate({sx:.1f} {sy:.1f})">
        <!-- title above the chip -->
        {stroke_text("WORTH", cx, int(H * 0.25), 96,
                     fill=BEAST_BLACK, stroke=BEAST_YELLOW, stroke_w=10)}

        {stat_chip(cx, chip_y - 100, label="COMBINED MARKET CAP",
                   value="₹ 2,40,000 CR", bg=BEAST_GREEN,
                   opacity=chip_t)}

        <!-- arrow pointing to chip -->
        <g opacity="{label_a:.3f}">
          {red_arrow(cx + 380, chip_y + 200, cx + 80, chip_y + 60,
                     stroke_w=12)}
        </g>
      </g>

      <text x="{cx}" y="{int(H * 0.85)}" font-family="{FONT_MONO}"
            font-size="24" font-weight="700" fill="{BEAST_WHITE}"
            text-anchor="middle" letter-spacing="0.24em"
            opacity="{smoothstep(0.50, 0.75, local):.3f}">
        SOURCE · PUBLIC RECORDS
      </text>
    """

def build_method(b: Beat, local: float, t_sec: float) -> str:
    """0:04-0:07 — '4 EPISODES. ZERO INTERVIEWS.' three bold stats."""
    cx = W // 2

    # Three stats cascade in
    s1_t = smoothstep(0.05, 0.25, local)
    s2_t = smoothstep(0.20, 0.40, local)
    s3_t = smoothstep(0.35, 0.55, local)

    return f"""
      <rect width="{W}" height="{H}" fill="{BEAST_BLACK}"/>

      <!-- diagonal red stripes for energy -->
      <g opacity="0.18">
        {color_block(-200, 600, 1500, 80, fill=BEAST_RED, rotate_deg=-10, stroke_w=0)}
        {color_block(-200, 850, 1500, 80, fill=BEAST_BLUE, rotate_deg=-10, stroke_w=0)}
        {color_block(-200, 1100, 1500, 80, fill=BEAST_YELLOW, rotate_deg=-10, stroke_w=0)}
      </g>

      <!-- big "THE METHOD" header -->
      <g opacity="{s1_t:.3f}">
        {stroke_text("THE METHOD.", cx, int(H * 0.18), 96,
                     fill=BEAST_YELLOW, stroke=BEAST_BLACK, stroke_w=8)}
      </g>

      <!-- 3 stat rows -->
      <g opacity="{s1_t:.3f}" transform="translate(0 {lerp(40, 0, s1_t):.1f})">
        {stroke_text("4 EPISODES.", cx, int(H * 0.36), 140, fill=BEAST_WHITE, stroke_w=10)}
      </g>

      <g opacity="{s2_t:.3f}" transform="translate(0 {lerp(40, 0, s2_t):.1f})">
        {stroke_text("60 SECONDS", cx, int(H * 0.52), 132,
                     fill=BEAST_YELLOW, stroke_w=10)}
        {stroke_text("TOTAL.", cx, int(H * 0.62), 132, fill=BEAST_YELLOW, stroke_w=10)}
      </g>

      <g opacity="{s3_t:.3f}" transform="translate(0 {lerp(40, 0, s3_t):.1f})">
        {stroke_text("ZERO INTERVIEWS.", cx, int(H * 0.78), 112,
                     fill=BEAST_RED, stroke_w=10)}
      </g>
    """

def build_winner(b: Beat, local: float, t_sec: float) -> str:
    """0:07-0:10 — '#1 IS PRESTIGE GROUP' the big reveal."""
    cx = W // 2

    # Tension build: '#1 IS...' appears first
    tension_t = smoothstep(0.05, 0.18, local)
    # The reveal hits at local=0.35
    reveal_t = back_out(clamp01((local - 0.35) / 0.18))
    reveal_alpha = clamp01((local - 0.32) / 0.10)

    # Camera shake on the reveal
    shake_mag = 14 * max(0, 1 - abs(local - 0.36) * 6)
    sx, sy = shake_xy(t_sec, magnitude=shake_mag)

    # Red circle annotation appears after the reveal
    circle_t = smoothstep(0.50, 0.75, local)

    return f"""
      <rect width="{W}" height="{H}" fill="{BEAST_BLACK}"/>

      <g transform="translate({sx:.1f} {sy:.1f})">
        <g opacity="{tension_t:.3f}">
          {stroke_text("#1 IS...", cx, int(H * 0.28), 156, fill=BEAST_WHITE, stroke_w=10)}
        </g>

        <g opacity="{reveal_alpha:.3f}"
           transform="scale({reveal_t:.3f})"
           transform-origin="{cx} {int(H * 0.55)}">

          <!-- yellow block behind the name -->
          {color_block(80, int(H * 0.46), W - 160, 280, fill=BEAST_YELLOW, rotate_deg=-2)}

          {stroke_text("PRESTIGE", cx, int(H * 0.55), 156,
                       fill=BEAST_BLACK, stroke=BEAST_WHITE, stroke_w=8)}
          {stroke_text("GROUP.", cx, int(H * 0.68), 132,
                       fill=BEAST_BLACK, stroke=BEAST_WHITE, stroke_w=8)}
        </g>

        <!-- stat chip below -->
        <g opacity="{circle_t:.3f}">
          {stat_chip(cx, int(H * 0.78), label="BANGALORE-BORN · 1986",
                     value="280+ PROJECTS", bg=BEAST_RED, opacity=circle_t)}
        </g>
      </g>
    """

def build_recap(b: Beat, local: float, t_sec: float) -> str:
    """0:10-0:13 — 'EP01-04 STREAMING NOW' with mini thumbnails."""
    cx = W // 2

    s1_t = smoothstep(0.05, 0.20, local)
    s2_t = smoothstep(0.25, 0.50, local)

    return f"""
      <rect width="{W}" height="{H}" fill="{BEAST_BLACK}"/>

      <!-- title -->
      <g opacity="{s1_t:.3f}">
        {stroke_text("ALL 4 EPISODES.", cx, int(H * 0.22), 110,
                     fill=BEAST_WHITE, stroke_w=10)}
        {stroke_text("STREAMING NOW.", cx, int(H * 0.34), 110,
                     fill=BEAST_YELLOW, stroke_w=10)}
      </g>

      <!-- 4 episode chips in a 2x2 grid -->
      <g opacity="{s2_t:.3f}">
        {episode_chip(cx - 240, int(H * 0.50), "EP 01", "TOP 8")}
        {episode_chip(cx + 240, int(H * 0.50), "EP 02", "HERITAGE 5")}
        {episode_chip(cx - 240, int(H * 0.68), "EP 03", "NEW MONEY")}
        {episode_chip(cx + 240, int(H * 0.68), "EP 04", "MODCON")}
      </g>

      <!-- bottom callout -->
      <g opacity="{smoothstep(0.55, 0.80, local):.3f}">
        {stroke_text("Built by @brandmint.studios", cx, int(H * 0.88), 36,
                     fill=BEAST_YELLOW, stroke_w=4,
                     kind_font=FONT_MONO, letter_spacing="0.10em")}
      </g>
    """

def episode_chip(cx: float, cy: float, num: str, name: str,
                 size: float = 220) -> str:
    return (
        f'<g>'
        f'{color_block(cx - size/2, cy - size/2, size, size, fill=BEAST_YELLOW, rotate_deg=-2)}'
        f'{stroke_text(num, cx, cy - 10, 56, fill=BEAST_BLACK, stroke=BEAST_BLACK, stroke_w=2)}'
        f'<text x="{cx:.1f}" y="{cy + 50:.1f}" font-family="{FONT_MONO}" '
        f'font-size="20" font-weight="700" fill="{BEAST_BLACK}" '
        f'text-anchor="middle" letter-spacing="0.16em">{esc(name)}</text>'
        f'</g>'
    )

def build_cta(b: Beat, local: float, t_sec: float) -> str:
    """0:13-0:15 — 'COMMENT \"EMPIRES\"' on yellow background."""
    cx = W // 2

    # Yellow flood-fills the canvas
    flood_t = back_out(clamp01(local / 0.22))

    # CTA text scales in with back_out
    text_t = back_out(clamp01((local - 0.15) / 0.25))
    text_alpha = clamp01((local - 0.12) / 0.15)

    # Continuous pulse on the CTA
    pulse = 1.0 + 0.05 * (0.5 + 0.5 * math.sin(local * 2 * math.pi * 2.0))

    # Brand mark anchor at very bottom (only place mint appears)
    mark_a = smoothstep(0.55, 0.80, local)

    return f"""
      <rect width="{W}" height="{H}" fill="{BEAST_BLACK}"/>

      <!-- yellow flood -->
      <rect width="{W}" height="{H}" fill="{BEAST_YELLOW}" opacity="{flood_t:.3f}"/>

      <g opacity="{text_alpha:.3f}"
         transform="scale({text_t * pulse:.3f})"
         transform-origin="{cx} {int(H * 0.46)}">
        {stroke_text("COMMENT", cx, int(H * 0.32), 148, fill=BEAST_BLACK, stroke=BEAST_WHITE, stroke_w=8)}
        {stroke_text('"EMPIRES"', cx, int(H * 0.48), 156, fill=BEAST_RED, stroke=BEAST_BLACK, stroke_w=10)}
        {stroke_text("FOR EARLY ACCESS", cx, int(H * 0.62), 64, fill=BEAST_BLACK, stroke=BEAST_BLACK, stroke_w=2)}
        {stroke_text("TO EP05.", cx, int(H * 0.70), 64, fill=BEAST_BLACK, stroke=BEAST_BLACK, stroke_w=2)}
      </g>

      <!-- big red arrow pointing down to the brand mark/handle -->
      <g opacity="{mark_a:.3f}">
        {red_arrow(cx, int(H * 0.78), cx, int(H * 0.86), stroke_w=14)}
      </g>

      <!-- Brand Mint anchor at the very bottom -->
      <g opacity="{mark_a:.3f}">
        {draw_mark(cx - 240, int(H * 0.92), scale=0.18, opacity=1.0)}
        <text x="{cx - 160}" y="{int(H * 0.928)}" font-family="{FONT_DISPLAY}"
              font-size="44" font-weight="900" fill="{BEAST_BLACK}"
              text-anchor="start" letter-spacing="-0.01em">
          @brandmint.studios
        </text>
      </g>
    """

# helper for color_block opacity safety
def block_alpha_safe(t: float) -> float:
    return clamp01(t)

# ===== compose ===========================================================

# Pre-compute beat boundaries for flash transitions
BEAT_BOUNDARIES = []
_cursor = 0.0
for _b in BEATS:
    BEAT_BOUNDARIES.append(_cursor)
    _cursor += _b.duration

def compose_svg(t: float) -> str:
    _, local, b, _ = beat_at(t)

    if b.kind == "hook":
        body = build_hook(b, local, t)
    elif b.kind == "stakes":
        body = build_stakes(b, local, t)
    elif b.kind == "method":
        body = build_method(b, local, t)
    elif b.kind == "winner":
        body = build_winner(b, local, t)
    elif b.kind == "recap":
        body = build_recap(b, local, t)
    elif b.kind == "cta":
        body = build_cta(b, local, t)
    else:
        body = ""

    # White-flash at every beat boundary (after the first)
    flash = ""
    for bnd in BEAT_BOUNDARIES[1:]:
        flash += flash_frame(t, peak_at=bnd, width=0.06,
                             color=BEAST_WHITE)

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"
     viewBox="0 0 {W} {H}">
  {body}
  {flash}
</svg>
"""

# ===== frames + audio + mux ==============================================

def render_frame(i: int):
    t = i / FPS
    random.seed(i * 1009)
    svg = compose_svg(t)
    out = FRAMES / f"f{i:06d}.png"
    cairosvg.svg2png(bytestring=svg.encode(), output_width=W,
                     output_height=H, write_to=str(out))

def render_all_frames():
    if FRAMES.exists():
        shutil.rmtree(FRAMES)
    FRAMES.mkdir()
    print(f"  rendering {TOTAL_F} frames ({TOTAL_S:.1f}s @ {FPS}fps)")
    for i in range(TOTAL_F):
        render_frame(i)
        if (i + 1) % 100 == 0 or i == TOTAL_F - 1:
            print(f"    {i + 1}/{TOTAL_F}")

def synth_audio(out_wav: Path):
    """BEAST-style audio: bright snares, dings, whooshes, crash on the
    winner reveal. Energetic, not editorial."""
    sr = 48000
    n = int(TOTAL_S * sr)
    track = np.zeros(n)

    # SNARE hit at every beat boundary
    for bnd in BEAT_BOUNDARIES:
        i = int(bnd * sr)
        dur = int(0.20 * sr)
        if i + dur <= n:
            env = np.exp(-np.linspace(0, 8, dur))
            # bright noise + low thump
            noise = np.random.normal(0, 1, dur) * 0.6
            thump = np.sin(2 * np.pi * 180 * np.arange(dur) / sr) * 0.4
            track[i:i + dur] += env * (noise + thump) * 0.55

    # CRASH on the WINNER beat reveal (~7.5s)
    winner_start = sum(b.duration for b in BEATS[:3])
    reveal_time = winner_start + BEATS[3].duration * 0.35
    ri = int(reveal_time * sr)
    rdur = int(1.5 * sr)
    if ri + rdur <= n:
        env = np.exp(-np.linspace(0, 3, rdur))
        crash = np.random.normal(0, 1, rdur) * env * 0.55
        boom = np.sin(2 * np.pi * 42 * np.arange(rdur) / sr) * env * 0.65
        track[ri:ri + rdur] += crash + boom

    # WHOOSH leading into the WINNER (last 0.25s of method beat)
    method_end = sum(b.duration for b in BEATS[:3])
    wsi = int((method_end - 0.25) * sr)
    wdur = int(0.25 * sr)
    if wsi >= 0 and wsi + wdur <= n:
        env = np.exp(np.linspace(0, 3, wdur))
        env = env / env.max()
        whoosh = np.random.normal(0, 1, wdur) * env * 0.40
        track[wsi:wsi + wdur] += whoosh

    # DING at every stat reveal (stakes chip, method stats)
    ding_times = [2.5, 3.2, 4.5, 5.5, 6.3, 9.0, 12.0, 14.0]
    for dt in ding_times:
        i = int(dt * sr)
        dur = int(0.4 * sr)
        if i + dur <= n:
            env = np.exp(-np.linspace(0, 5, dur))
            ding = (np.sin(2 * np.pi * 1320 * np.arange(dur) / sr) +
                    0.5 * np.sin(2 * np.pi * 1980 * np.arange(dur) / sr))
            track[i:i + dur] += env * ding * 0.20

    # Hi-hat ticks at 8th notes for energy
    for tick_t in np.arange(0.0, TOTAL_S, 0.25):
        i = int(tick_t * sr)
        dur = int(0.03 * sr)
        if i + dur <= n:
            env = np.exp(-np.linspace(0, 16, dur))
            track[i:i + dur] += np.random.normal(0, 1, dur) * env * 0.18

    # Master fade
    fade = int(0.4 * sr)
    envm = np.ones(n)
    envm[:fade] = np.linspace(0, 1, fade)
    envm[-fade:] = np.linspace(1, 0, fade)
    track = track * envm

    peak = float(np.max(np.abs(track))) or 1.0
    track = track / peak * 0.82
    pcm = (track * 32767).astype(np.int16)
    with wave.open(str(out_wav), "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(pcm.tobytes())

def mux(out_mp4: Path, with_audio: bool):
    cmd = ["ffmpeg", "-y", "-framerate", str(FPS),
           "-i", str(FRAMES / "f%06d.png")]
    if with_audio:
        cmd += ["-i", str(OUT / "_audio.wav")]
    cmd += ["-map", "0:v:0"]
    if with_audio:
        cmd += ["-map", "1:a:0"]
    cmd += ["-c:v:0", "libx264", "-pix_fmt:v:0", "yuv420p",
            "-profile:v:0", "high", "-level:v:0", "4.2",
            "-crf", "18", "-preset", "medium"]
    if with_audio:
        cmd += ["-c:a", "aac", "-b:a", "192k", "-ac", "2", "-shortest"]
    cmd += ["-movflags", "+faststart", str(out_mp4)]
    print(f"  muxing → {out_mp4.name}")
    subprocess.run(cmd, check=True, capture_output=True)

# ===== main ==============================================================

def main():
    print(f"\nv19 BEAST · {FPS}fps · target {TOTAL_S:.1f}s · {TOTAL_F} frames")
    render_all_frames()
    audio = OUT / "_audio.wav"
    print("  synth audio...")
    synth_audio(audio)
    scored = OUT / f"brandmint-beast-{BPM}bpm.mp4"
    silent = OUT / f"brandmint-beast-{BPM}bpm-silent.mp4"
    mux(scored, with_audio=True)
    mux(silent, with_audio=False)
    print(f"\n  ✓ {scored.relative_to(HERE.parent.parent)}")
    print(f"  ✓ {silent.relative_to(HERE.parent.parent)}\n")

if __name__ == "__main__":
    main()
