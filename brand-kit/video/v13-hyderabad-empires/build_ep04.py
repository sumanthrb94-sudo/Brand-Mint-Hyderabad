"""
BrandMint Studios — Hyderabad Empires · EP04 · Modcon Builder Spotlight.

Single-builder deep dive (vs EP01-02's countdowns). Reuses the v13
editorial frame system but switches the accent palette from mint to
Modcon's own brand colors — warm sand (#c3baaf) and dusty rose
(#bf7f7f) — so the episode reads as "this builder's story" rather
than another ranking.

All copy is drawn verbatim from modconbuilders.com (pasted text in
the session transcript) — no facts invented. Fields not on the site
(founding year, RERA, Agartha unit count/price, upcoming Tukkuguda
spec) are deliberately omitted rather than guessed.

Out:   out/hyderabad-empires-ep04-{bpm}bpm[-silent].mp4
Run:   python3 build_ep04.py
"""

from __future__ import annotations

import math
import os
import shutil
import subprocess
import wave
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

import cairosvg
import numpy as np
from PIL import ImageFont

# ---------------------------------------------------------------- tokens ---

W, H, FPS = 1080, 1920, 30

BPM = int(os.environ.get("BPM", "80"))
BEAT_SEC = 60.0 / BPM
def beats(n: float) -> float:
    return n * BEAT_SEC

# Modcon brand palette (warm sand + dusty rose) on warm-black ground.
INK = "#0a0908"
INK_2 = "#14110d"
INK_3 = "#1f1a14"
PAPER = "#f5f1ea"
PAPER_DIM = "#aaa195"
SAND = "#c3baaf"           # Modcon primary  → replaces MINT
ROSE = "#bf7f7f"           # Modcon secondary → replaces MINT_2
SAND_DEEP = "#8a8175"      # vignette
MUTE = "#6e645a"

FONT_DISPLAY = "DejaVu Sans, Inter, system-ui, sans-serif"
FONT_SERIF = "DejaVu Serif, Georgia, serif"
FONT_MONO = "DejaVu Sans Mono, Menlo, monospace"
_DEJAVU_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
_DEJAVU_SERIF_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
_DEJAVU_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"

HERE = Path(__file__).parent
FRAMES = HERE / "frames_ep04"
OUT = HERE / "out"
FRAMES.mkdir(exist_ok=True)
OUT.mkdir(exist_ok=True)

BAR_H = 110

_font_cache: dict = {}

def _font(pt: int, kind: str = "bold"):
    key = (pt, kind)
    if key not in _font_cache:
        path = {
            "bold": _DEJAVU_BOLD,
            "serif": _DEJAVU_SERIF_BOLD,
            "mono": _DEJAVU_MONO,
        }[kind]
        _font_cache[key] = ImageFont.truetype(path, pt)
    return _font_cache[key]

def measure(text: str, pt: int, kind: str = "bold") -> float:
    if not text:
        return 0.0
    l, _, r, _ = _font(pt, kind).getbbox(text)
    return float(r - l)

# ------------------------------------------------------- beat schedule ---

@dataclass
class Beat:
    kind: str
    duration: float
    text: str = ""
    text2: str = ""

# Target ~17s — IG average view time on EP01 was 6s, so the hook
# (Agartha) is front-loaded into the 2-6s window. Modcon One dropped;
# commercial side-project doesn't earn screen time at this length.
#   splash 2 + agartha 5 + founders_award 4.5 + design_quote 4
#   + pillars 4 + closer 3 = 22.5 beats × 0.75s ≈ 16.9s ✓
BEATS: List[Beat] = [
    Beat(kind="splash",          duration=beats(2.0),
         text="Building beyond",
         text2="expectations."),
    Beat(kind="agartha",         duration=beats(5),
         text="AGARTHA",
         text2="ROOTS OF EARTH"),
    Beat(kind="founders_award",  duration=beats(4.5),
         text="MODCON",
         text2="BUILDERS"),
    Beat(kind="design_quote",    duration=beats(4),
         text="DESIGN  IDEOLOGY",
         text2=""),
    Beat(kind="pillars",         duration=beats(4),
         text="WHY  MODCON",
         text2=""),
    Beat(kind="closer",          duration=beats(3),
         text="BUILDING BEYOND",
         text2="EXPECTATIONS"),
]

TOTAL_SECONDS = sum(b.duration for b in BEATS)
TOTAL_FRAMES = int(round(TOTAL_SECONDS * FPS))

# -------------------------------------------------------------- helpers ---

def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t

def ease_in_out(t: float) -> float:
    return 0.5 - 0.5 * math.cos(math.pi * t)

def beat_at(t_sec: float) -> tuple[int, float, Beat]:
    cursor = 0.0
    for i, b in enumerate(BEATS):
        if t_sec < cursor + b.duration:
            local = (t_sec - cursor) / b.duration if b.duration > 0 else 1.0
            return i, max(0.0, min(1.0, local)), b
        cursor += b.duration
    return len(BEATS) - 1, 1.0, BEATS[-1]

# ----------------------------------------------------- background ---

def background(scale: float, warm: float = 1.0) -> str:
    radius = 0.85 * scale
    glow_op = 0.10 * warm
    return f"""
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="{INK_2}"/>
          <stop offset="50%" stop-color="{INK}"/>
          <stop offset="100%" stop-color="{INK}"/>
        </linearGradient>
        <radialGradient id="glow" cx="0.5" cy="0.4" r="{radius:.3f}">
          <stop offset="0%" stop-color="{SAND}" stop-opacity="{glow_op:.3f}"/>
          <stop offset="55%" stop-color="{SAND_DEEP}" stop-opacity="{glow_op * 0.3:.3f}"/>
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
            stroke="{SAND}" stroke-opacity="0.25" stroke-width="1"/>
      <line x1="0" y1="{H - BAR_H}" x2="{W}" y2="{H - BAR_H}"
            stroke="{SAND}" stroke-opacity="0.25" stroke-width="1"/>
    """

def chrome_overlay(intro_t: float) -> str:
    op = min(1.0, intro_t)
    return f"""
      <g opacity="{op:.3f}">
        <text x="64" y="68" font-family="{FONT_MONO}" font-size="20"
              font-weight="700" letter-spacing="0.22em" fill="{PAPER}"
              opacity="0.72">@brandmint.studios</text>
        <text x="{W - 64}" y="68" font-family="{FONT_MONO}" font-size="20"
              font-weight="700" letter-spacing="0.22em" fill="{SAND}"
              text-anchor="end" opacity="0.85">BUILDER SPOTLIGHT · 2026</text>
      </g>
      <g opacity="{op * 0.72:.3f}">
        <text x="64" y="{H - 40}" font-family="{FONT_MONO}" font-size="16"
              font-weight="700" letter-spacing="0.22em" fill="{PAPER_DIM}">
          SOURCE · MODCONBUILDERS.COM
        </text>
        <text x="{W - 64}" y="{H - 40}" font-family="{FONT_MONO}" font-size="16"
              font-weight="700" letter-spacing="0.22em" fill="{PAPER_DIM}"
              text-anchor="end">
          EP04 · MODCON
        </text>
      </g>
    """

# ------------------------------------------------------ scene renderers ---

def render_splash(beat: Beat, local: float, scale: float) -> str:
    cx = W // 2
    pulse = 1.0 + 0.015 * math.sin(local * math.pi * 1.6)
    op = 1.0 if local < 0.85 else max(0.0, 1.0 - (local - 0.85) / 0.15)
    big_pt = int(132 * pulse)

    return f"""
      <g opacity="{op:.3f}">
        <text x="{cx}" y="500" font-family="{FONT_MONO}" font-size="24"
              font-weight="700" fill="{SAND}" text-anchor="middle"
              letter-spacing="0.36em">BUILDER SPOTLIGHT · EP04</text>
        <line x1="{cx - 80}" y1="530" x2="{cx + 80}" y2="530"
              stroke="{SAND}" stroke-width="2"/>

        <text x="{cx}" y="730" font-family="{FONT_SERIF}" font-size="100"
              font-weight="700" fill="{PAPER}" text-anchor="middle"
              font-style="italic">{beat.text}</text>
        <text x="{cx}" y="850" font-family="{FONT_SERIF}" font-size="100"
              font-weight="700" fill="{PAPER}" text-anchor="middle"
              font-style="italic">{beat.text2}</text>

        <line x1="{cx - 60}" y1="940" x2="{cx + 60}" y2="940"
              stroke="{ROSE}" stroke-width="2"/>

        <text x="{cx}" y="1060" font-family="{FONT_DISPLAY}" font-size="{big_pt}"
              font-weight="900" fill="{SAND}" text-anchor="middle"
              letter-spacing="0.02em">MODCON</text>
        <text x="{cx}" y="1170" font-family="{FONT_DISPLAY}" font-size="56"
              font-weight="700" fill="{PAPER}" text-anchor="middle"
              letter-spacing="0.24em">BUILDERS</text>

        <line x1="{cx - 60}" y1="1260" x2="{cx + 60}" y2="1260"
              stroke="{SAND}" stroke-width="2"/>
        <text x="{cx}" y="1330" font-family="{FONT_MONO}" font-size="22"
              font-weight="700" fill="{PAPER_DIM}" text-anchor="middle"
              letter-spacing="0.36em">HYDERABAD  ·  UAE</text>
      </g>
    """

def render_founders_award(beat: Beat, local: float, scale: float) -> str:
    """Founders + award slate. Layout:
       eyebrow · MODCON / BUILDERS · italic angle · award badge ·
       founders strip · mid-rule · "the visionary boutique"
    """
    op_in = min(1.0, local / 0.20)
    op_out = 1.0 - max(0.0, (local - 0.88) / 0.12)
    op = min(op_in, op_out)
    drift = lerp(10, -10, ease_in_out(local))
    cx = W // 2
    badge_op = min(1.0, max(0.0, (local - 0.15) / 0.25))

    return f"""
      <g opacity="{op:.3f}">
        <text x="{cx}" y="{400 + drift:.0f}"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              fill="{SAND}" text-anchor="middle" letter-spacing="0.34em">
          THE BUILDER  ·  EP04
        </text>
        <line x1="{cx - 60}" y1="{432 + drift:.0f}"
              x2="{cx + 60}" y2="{432 + drift:.0f}"
              stroke="{SAND}" stroke-width="1.5"/>

        <!-- Award badge (verified verbatim) -->
        <g opacity="{badge_op:.3f}">
          <rect x="{cx - 380}" y="{510 + drift:.0f}" width="760" height="110"
                fill="none" stroke="{ROSE}" stroke-width="1.5" rx="6"/>
          <text x="{cx}" y="{552 + drift:.0f}"
                font-family="{FONT_MONO}" font-size="18" font-weight="700"
                fill="{ROSE}" text-anchor="middle" letter-spacing="0.30em">
            OUTLOOK BUSINESS SPOTLIGHT ENTITY AWARD
          </text>
          <text x="{cx}" y="{595 + drift:.0f}"
                font-family="{FONT_MONO}" font-size="20" font-weight="700"
                fill="{PAPER}" text-anchor="middle" letter-spacing="0.30em">
            2024  ·  BY BUSINESS MINT
          </text>
        </g>

        <!-- Brand -->
        <text x="{cx}" y="{810 + drift:.0f}"
              font-family="{FONT_DISPLAY}" font-size="116" font-weight="900"
              fill="{PAPER}" text-anchor="middle" letter-spacing="-0.01em">
          {beat.text}
        </text>
        <text x="{cx}" y="{920 + drift:.0f}"
              font-family="{FONT_DISPLAY}" font-size="116" font-weight="900"
              fill="{PAPER}" text-anchor="middle" letter-spacing="-0.01em">
          {beat.text2}
        </text>

        <!-- Italic angle -->
        <text x="{cx}" y="{1030 + drift:.0f}"
              font-family="{FONT_SERIF}" font-size="48" font-weight="700"
              fill="{ROSE}" text-anchor="middle"
              font-style="italic" letter-spacing="0.01em">
          The visionary boutique
        </text>

        <!-- Founders -->
        <text x="{cx}" y="{1140 + drift:.0f}"
              font-family="{FONT_MONO}" font-size="20" font-weight="700"
              fill="{PAPER}" text-anchor="middle" letter-spacing="0.24em">
          LED BY
        </text>
        <text x="{cx}" y="{1180 + drift:.0f}"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              fill="{SAND}" text-anchor="middle" letter-spacing="0.18em">
          CHANDU REDDY  ·  MANIKANTA SRIDHAR MALLADI
        </text>

        <line x1="{cx - 50}" y1="{1290 + drift:.0f}"
              x2="{cx + 50}" y2="{1290 + drift:.0f}"
              stroke="{SAND}" stroke-width="2" opacity="0.6"/>

        <text x="{cx}" y="{1370 + drift:.0f}"
              font-family="{FONT_SERIF}" font-size="36" font-weight="700"
              fill="{PAPER}" text-anchor="middle" font-style="italic">
          Hyderabad + UAE
        </text>
      </g>
    """

def render_agartha(beat: Beat, local: float, scale: float) -> str:
    """Agartha signature project. Direct quote from modconbuilders.com:
       'A regenerative permaculture from land project where nature's wisdom
       guides our journey towards a more resilient and abundant future.'
    """
    op_in = min(1.0, local / 0.20)
    op_out = 1.0 - max(0.0, (local - 0.88) / 0.12)
    op = min(op_in, op_out)
    drift = lerp(10, -10, ease_in_out(local))
    cx = W // 2

    return f"""
      <g opacity="{op:.3f}">
        <text x="{cx}" y="{400 + drift:.0f}"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              fill="{SAND}" text-anchor="middle" letter-spacing="0.34em">
          SIGNATURE PROJECT
        </text>
        <line x1="{cx - 60}" y1="{432 + drift:.0f}"
              x2="{cx + 60}" y2="{432 + drift:.0f}"
              stroke="{SAND}" stroke-width="1.5"/>

        <!-- Big name -->
        <text x="{cx}" y="{640 + drift:.0f}"
              font-family="{FONT_SERIF}" font-size="156" font-weight="700"
              fill="{SAND}" text-anchor="middle" letter-spacing="0.02em">
          {beat.text}
        </text>
        <text x="{cx}" y="{740 + drift:.0f}"
              font-family="{FONT_DISPLAY}" font-size="42" font-weight="700"
              fill="{PAPER}" text-anchor="middle" letter-spacing="0.32em">
          {beat.text2}
        </text>

        <line x1="{cx - 50}" y1="{830 + drift:.0f}"
              x2="{cx + 50}" y2="{830 + drift:.0f}"
              stroke="{ROSE}" stroke-width="2"/>

        <!-- Italic angle (verbatim language from site) -->
        <text x="{cx}" y="{940 + drift:.0f}"
              font-family="{FONT_SERIF}" font-size="46" font-weight="700"
              fill="{ROSE}" text-anchor="middle"
              font-style="italic">
          Regenerative permaculture
        </text>
        <text x="{cx}" y="{1000 + drift:.0f}"
              font-family="{FONT_SERIF}" font-size="46" font-weight="700"
              fill="{ROSE}" text-anchor="middle"
              font-style="italic">
          from land.
        </text>

        <!-- Body (paraphrased from site, italic serif) -->
        <text x="{cx}" y="{1130 + drift:.0f}"
              font-family="{FONT_SERIF}" font-size="34" font-weight="700"
              fill="{PAPER}" text-anchor="middle"
              font-style="italic">
          Nature's wisdom guides our journey
        </text>
        <text x="{cx}" y="{1180 + drift:.0f}"
              font-family="{FONT_SERIF}" font-size="34" font-weight="700"
              fill="{PAPER}" text-anchor="middle"
              font-style="italic">
          toward a more resilient future.
        </text>

        <line x1="{cx - 50}" y1="{1290 + drift:.0f}"
              x2="{cx + 50}" y2="{1290 + drift:.0f}"
              stroke="{SAND}" stroke-width="2" opacity="0.6"/>

        <!-- Tags -->
        <text x="{cx}" y="{1370 + drift:.0f}"
              font-family="{FONT_MONO}" font-size="20" font-weight="700"
              fill="{PAPER_DIM}" text-anchor="middle" letter-spacing="0.30em">
          SUSTAINABILITY  ·  DESIGN-LED
        </text>
      </g>
    """

def render_design_quote(beat: Beat, local: float, scale: float) -> str:
    """Pull quote from modconbuilders.com About section."""
    op_in = min(1.0, local / 0.20)
    op_out = 1.0 - max(0.0, (local - 0.88) / 0.12)
    op = min(op_in, op_out)
    drift = lerp(10, -10, ease_in_out(local))
    cx = W // 2

    return f"""
      <g opacity="{op:.3f}">
        <text x="{cx}" y="{400 + drift:.0f}"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              fill="{SAND}" text-anchor="middle" letter-spacing="0.34em">
          {beat.text}
        </text>
        <line x1="{cx - 60}" y1="{432 + drift:.0f}"
              x2="{cx + 60}" y2="{432 + drift:.0f}"
              stroke="{SAND}" stroke-width="1.5"/>

        <!-- Big opening quote mark -->
        <text x="{cx}" y="{600 + drift:.0f}"
              font-family="{FONT_SERIF}" font-size="180" font-weight="700"
              fill="{ROSE}" text-anchor="middle" font-style="italic">“</text>

        <!-- Pull quote (verbatim from site) -->
        <text x="{cx}" y="{760 + drift:.0f}"
              font-family="{FONT_SERIF}" font-size="50" font-weight="700"
              fill="{PAPER}" text-anchor="middle"
              font-style="italic">
          Architecture has the power
        </text>
        <text x="{cx}" y="{830 + drift:.0f}"
              font-family="{FONT_SERIF}" font-size="50" font-weight="700"
              fill="{PAPER}" text-anchor="middle"
              font-style="italic">
          to transform lives,
        </text>
        <text x="{cx}" y="{900 + drift:.0f}"
              font-family="{FONT_SERIF}" font-size="50" font-weight="700"
              fill="{PAPER}" text-anchor="middle"
              font-style="italic">
          foster connections
        </text>
        <text x="{cx}" y="{970 + drift:.0f}"
              font-family="{FONT_SERIF}" font-size="50" font-weight="700"
              fill="{PAPER}" text-anchor="middle"
              font-style="italic">
          and create a sense
        </text>
        <text x="{cx}" y="{1040 + drift:.0f}"
              font-family="{FONT_SERIF}" font-size="50" font-weight="700"
              fill="{PAPER}" text-anchor="middle"
              font-style="italic">
          of belonging.
        </text>

        <line x1="{cx - 50}" y1="{1180 + drift:.0f}"
              x2="{cx + 50}" y2="{1180 + drift:.0f}"
              stroke="{SAND}" stroke-width="2" opacity="0.6"/>

        <!-- Credit -->
        <text x="{cx}" y="{1260 + drift:.0f}"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              fill="{SAND}" text-anchor="middle" letter-spacing="0.28em">
          — MODCON BUILDERS
        </text>
        <text x="{cx}" y="{1340 + drift:.0f}"
              font-family="{FONT_MONO}" font-size="16" font-weight="700"
              fill="{PAPER_DIM}" text-anchor="middle" letter-spacing="0.30em">
          OFFICIAL BRAND PHILOSOPHY
        </text>
      </g>
    """

def render_pillars(beat: Beat, local: float, scale: float) -> str:
    """Four pillars from modconbuilders.com 'Our Speciality' section."""
    op_in = min(1.0, local / 0.20)
    op_out = 1.0 - max(0.0, (local - 0.88) / 0.12)
    op = min(op_in, op_out)
    drift = lerp(10, -10, ease_in_out(local))
    cx = W // 2

    pillars = [
        ("01", "UNCOMPROMISING", "Quality Standards"),
        ("02", "SUSTAINABLE", "Building Practices"),
        ("03", "EXPERIENCED", "& Skilled Team"),
        ("04", "TIMELY", "Project Delivery"),
    ]

    row_top = 660
    row_step = 150

    rows_svg = []
    for i, (num, line1, line2) in enumerate(pillars):
        ry = row_top + i * row_step + drift
        line_op = max(0.0, min(1.0, (local - (0.20 + i * 0.10)) / 0.18))
        rows_svg.append(f"""
          <g opacity="{line_op:.3f}">
            <text x="{cx - 380}" y="{ry:.0f}"
                  font-family="{FONT_SERIF}" font-size="64" font-weight="700"
                  fill="{ROSE}" text-anchor="start" letter-spacing="-0.02em">
              {num}
            </text>
            <text x="{cx - 280}" y="{ry - 18:.0f}"
                  font-family="{FONT_DISPLAY}" font-size="36" font-weight="900"
                  fill="{PAPER}" text-anchor="start" letter-spacing="0.04em">
              {line1}
            </text>
            <text x="{cx - 280}" y="{ry + 22:.0f}"
                  font-family="{FONT_SERIF}" font-size="32" font-weight="700"
                  fill="{SAND}" text-anchor="start" font-style="italic">
              {line2}
            </text>
            <line x1="{cx - 380}" y1="{ry + 55:.0f}"
                  x2="{cx + 380}" y2="{ry + 55:.0f}"
                  stroke="{SAND}" stroke-width="0.8" opacity="0.30"/>
          </g>
        """)

    return f"""
      <g opacity="{op:.3f}">
        <text x="{cx}" y="{400 + drift:.0f}"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              fill="{SAND}" text-anchor="middle" letter-spacing="0.34em">
          {beat.text}
        </text>
        <line x1="{cx - 60}" y1="{432 + drift:.0f}"
              x2="{cx + 60}" y2="{432 + drift:.0f}"
              stroke="{SAND}" stroke-width="1.5"/>

        <text x="{cx}" y="{560 + drift:.0f}"
              font-family="{FONT_SERIF}" font-size="56" font-weight="700"
              fill="{PAPER}" text-anchor="middle" font-style="italic">
          The four pillars.
        </text>

        {''.join(rows_svg)}
      </g>
    """

def render_modcon_one(beat: Beat, local: float, scale: float) -> str:
    op_in = min(1.0, local / 0.20)
    op_out = 1.0 - max(0.0, (local - 0.88) / 0.12)
    op = min(op_in, op_out)
    drift = lerp(8, -8, ease_in_out(local))
    cx = W // 2

    return f"""
      <g opacity="{op:.3f}">
        <text x="{cx}" y="{400 + drift:.0f}"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              fill="{SAND}" text-anchor="middle" letter-spacing="0.34em">
          COMMERCIAL DEBUT
        </text>
        <line x1="{cx - 60}" y1="{432 + drift:.0f}"
              x2="{cx + 60}" y2="{432 + drift:.0f}"
              stroke="{SAND}" stroke-width="1.5"/>

        <text x="{cx}" y="{750 + drift:.0f}"
              font-family="{FONT_DISPLAY}" font-size="124" font-weight="900"
              fill="{PAPER}" text-anchor="middle" letter-spacing="-0.01em">
          {beat.text}
        </text>

        <text x="{cx}" y="{900 + drift:.0f}"
              font-family="{FONT_SERIF}" font-size="42" font-weight="700"
              fill="{ROSE}" text-anchor="middle" font-style="italic">
          {beat.text2}
        </text>

        <line x1="{cx - 50}" y1="{1020 + drift:.0f}"
              x2="{cx + 50}" y2="{1020 + drift:.0f}"
              stroke="{SAND}" stroke-width="2" opacity="0.6"/>

        <text x="{cx}" y="{1140 + drift:.0f}"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              fill="{PAPER}" text-anchor="middle" letter-spacing="0.20em">
          HIGH-VISIBILITY COMMERCIAL
        </text>
        <text x="{cx}" y="{1190 + drift:.0f}"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              fill="{PAPER}" text-anchor="middle" letter-spacing="0.20em">
          STRONG RENTAL DEMAND
        </text>
        <text x="{cx}" y="{1240 + drift:.0f}"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              fill="{PAPER}" text-anchor="middle" letter-spacing="0.20em">
          LONG-TERM APPRECIATION
        </text>
      </g>
    """

def render_closer(beat: Beat, local: float, scale: float) -> str:
    op_in = min(1.0, local / 0.18)
    op_out = 1.0 - max(0.0, (local - 0.92) / 0.08)
    op = min(op_in, op_out)
    drift = lerp(6, -6, ease_in_out(local))
    cx = W // 2

    return f"""
      <g opacity="{op:.3f}">
        <text x="{cx}" y="{420 + drift:.0f}"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              fill="{SAND}" text-anchor="middle" letter-spacing="0.34em">
          MODCON  ·  EP04
        </text>
        <line x1="{cx - 60}" y1="{452 + drift:.0f}"
              x2="{cx + 60}" y2="{452 + drift:.0f}"
              stroke="{SAND}" stroke-width="1.5"/>

        <text x="{cx}" y="{680 + drift:.0f}"
              font-family="{FONT_DISPLAY}" font-size="92" font-weight="900"
              fill="{SAND}" text-anchor="middle" letter-spacing="0.02em">
          {beat.text}
        </text>
        <text x="{cx}" y="{800 + drift:.0f}"
              font-family="{FONT_DISPLAY}" font-size="92" font-weight="900"
              fill="{PAPER}" text-anchor="middle" letter-spacing="0.02em">
          {beat.text2}
        </text>

        <text x="{cx}" y="{920 + drift:.0f}"
              font-family="{FONT_SERIF}" font-size="46" font-weight="700"
              fill="{ROSE}" text-anchor="middle" font-style="italic">
          — Modcon Builders
        </text>

        <line x1="{cx - 60}" y1="{1040 + drift:.0f}"
              x2="{cx + 60}" y2="{1040 + drift:.0f}"
              stroke="{SAND}" stroke-width="2"/>

        <text x="{cx}" y="{1140 + drift:.0f}"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              fill="{PAPER}" text-anchor="middle" letter-spacing="0.28em">
          MODCONBUILDERS.COM
        </text>
        <text x="{cx}" y="{1200 + drift:.0f}"
              font-family="{FONT_MONO}" font-size="20" font-weight="700"
              fill="{PAPER_DIM}" text-anchor="middle" letter-spacing="0.30em">
          HYDERABAD  +  UAE
        </text>

        <line x1="{cx - 200}" y1="{1300 + drift:.0f}"
              x2="{cx + 200}" y2="{1300 + drift:.0f}"
              stroke="{SAND}" stroke-opacity="0.40" stroke-width="1"/>
        <text x="{cx}" y="{1370 + drift:.0f}"
              font-family="{FONT_MONO}" font-size="18" font-weight="700"
              fill="{SAND}" text-anchor="middle" letter-spacing="0.30em">
          BUILDER SPOTLIGHT  ·  @brandmint.studios
        </text>
      </g>
    """

# ------------------------------------------------------------ compose ---

def compose_svg(t_sec: float, frame_idx: int) -> str:
    idx, local, beat = beat_at(t_sec)

    scale = lerp(1.0, 1.06, local)
    splash_dur = BEATS[0].duration if BEATS and BEATS[0].kind == "splash" else 0.0
    intro_t = max(0.0, min(1.0, (t_sec - splash_dur) / 0.6))

    bg = background(scale)
    chrome = "" if beat.kind == "splash" else chrome_overlay(intro_t)

    if beat.kind == "splash":
        content = render_splash(beat, local, scale)
    elif beat.kind == "founders_award":
        content = render_founders_award(beat, local, scale)
    elif beat.kind == "agartha":
        content = render_agartha(beat, local, scale)
    elif beat.kind == "design_quote":
        content = render_design_quote(beat, local, scale)
    elif beat.kind == "pillars":
        content = render_pillars(beat, local, scale)
    elif beat.kind == "modcon_one":
        content = render_modcon_one(beat, local, scale)
    elif beat.kind == "closer":
        content = render_closer(beat, local, scale)
    else:
        content = ""

    return f"""<?xml version="1.0" encoding="UTF-8"?>
      <svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"
           viewBox="0 0 {W} {H}">
        {bg}
        {content}
        {chrome}
      </svg>
    """

# ------------------------------------------------------ frame rendering ---

def render_frame(frame_idx: int) -> Path:
    t = frame_idx / FPS
    svg = compose_svg(t, frame_idx)
    out_path = FRAMES / f"f{frame_idx:05d}.png"
    cairosvg.svg2png(bytestring=svg.encode(), output_width=W,
                     output_height=H, write_to=str(out_path))
    return out_path

def render_all_frames() -> None:
    if FRAMES.exists():
        shutil.rmtree(FRAMES)
    FRAMES.mkdir()
    print(f"  rendering {TOTAL_FRAMES} frames "
          f"({TOTAL_SECONDS:.1f}s @ {FPS}fps · BPM={BPM}) ...")
    for i in range(TOTAL_FRAMES):
        render_frame(i)
        if (i + 1) % 50 == 0 or i == TOTAL_FRAMES - 1:
            print(f"    {i + 1}/{TOTAL_FRAMES}")

# -------------------------------------------------------------- audio ---

def synth_audio(out_wav: Path) -> None:
    sr = 48000
    n = int(TOTAL_SECONDS * sr)
    t = np.arange(n) / sr

    sub = 0.28 * np.sin(2 * np.pi * 55 * t)
    sub += 0.10 * np.sin(2 * np.pi * 27.5 * t)

    pad = 0.10 * np.sin(2 * np.pi * 165 * t)
    pad += 0.06 * np.sin(2 * np.pi * 247.5 * t)

    impacts = np.zeros(n)
    cursor = 0.0
    for b in BEATS:
        if b.kind in ("founders_award", "agartha", "design_quote",
                      "pillars", "modcon_one", "closer"):
            i = int(cursor * sr)
            dur = int(0.45 * sr)
            if i + dur <= n:
                env = np.exp(-np.linspace(0, 6, dur))
                noise = np.random.normal(0, 1, dur) * 0.15
                thump = np.sin(2 * np.pi * 48 * np.arange(dur) / sr)
                hit = env * (0.55 * thump + 0.30 * noise)
                impacts[i:i + dur] += hit
        cursor += b.duration

    env = np.ones(n)
    fade = int(1.5 * sr)
    env[:fade] = np.linspace(0, 1, fade)
    env[-fade:] = np.linspace(1, 0, fade)

    mix = (sub + pad + impacts) * env

    peak = float(np.max(np.abs(mix))) or 1.0
    mix = mix / peak * 0.7

    pcm = (mix * 32767).astype(np.int16)

    with wave.open(str(out_wav), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())

# --------------------------------------------------------------- mux ---

def mux_video(out_mp4: Path, with_audio: bool) -> None:
    cmd = [
        "ffmpeg", "-y",
        "-framerate", str(FPS),
        "-i", str(FRAMES / "f%05d.png"),
    ]
    if with_audio:
        cmd += ["-i", str(OUT / "_audio_ep04.wav")]

    cmd += ["-map", "0:v:0"]
    if with_audio:
        cmd += ["-map", "1:a:0"]

    cmd += [
        "-c:v:0", "libx264", "-pix_fmt:v:0", "yuv420p",
        "-profile:v:0", "high", "-level:v:0", "4.0",
        "-crf", "18", "-preset", "medium",
    ]
    if with_audio:
        cmd += ["-c:a", "aac", "-b:a", "192k", "-ac", "2", "-shortest"]

    cmd += ["-movflags", "+faststart", str(out_mp4)]

    print(f"  muxing → {out_mp4.name}")
    subprocess.run(cmd, check=True, capture_output=True)

# ---------------------------------------------------------------- main ---

def main() -> None:
    print(f"\nEP04 · Modcon Builders Spotlight · BPM={BPM}")
    print(f"  total: {TOTAL_SECONDS:.1f}s · {TOTAL_FRAMES} frames")

    render_all_frames()

    audio_wav = OUT / "_audio_ep04.wav"
    print("  synthesising audio ...")
    synth_audio(audio_wav)

    scored = OUT / f"hyderabad-empires-ep04-{BPM}bpm.mp4"
    silent = OUT / f"hyderabad-empires-ep04-{BPM}bpm-silent.mp4"

    mux_video(scored, with_audio=True)
    mux_video(silent, with_audio=False)

    print(f"\n  ✓ {scored.relative_to(HERE.parent.parent)}")
    print(f"  ✓ {silent.relative_to(HERE.parent.parent)}")
    print()

if __name__ == "__main__":
    main()
