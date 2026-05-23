"""
BrandMint Studios — v13 "Hyderabad Empires" listicle reel.

Cinematic 9:16 listicle on Hyderabad's eight largest real-estate empires,
in the spirit of @habitat.uae / @habitat — ultra-dark backgrounds, warm
gold accents, big serif rank numerals, slow cinematic pace, lots of
negative space.

EDITORIAL CONTENT — uses public-record company names + founder names
only. Does NOT include net-worth figures, does NOT use any third-party
photos or logos in the rendered video, does NOT imply endorsement or
affiliation with BrandMint. Editorial ranking based on publicly known
project portfolios — FACT-CHECK before publishing.

Out:    out/hyderabad-empires-{bpm}bpm[-silent].mp4
        (1080×1920, 30fps)
Audio:  numpy direct-synth — sub drone + cinematic impact hits.
        Also exports a -silent variant for pairing with Canva audio.

Run:    python3 build_empires.py
        BPM=72 python3 build_empires.py   # slower trailer pace
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

# ---------------------------------------------------------------- tempo ---
# Cinematic trailer pace. 80 BPM works with most epic-trailer instrumentals.
#   72  → very slow, "Inception" trailer pace
#   80  → trailer standard (default)
#   90  → cinematic-pop
#  100  → upbeat cinematic
BPM = int(os.environ.get("BPM", "80"))
BEAT_SEC = 60.0 / BPM
def beats(n: float) -> float:
    return n * BEAT_SEC

# Habitat.uae editorial frame · BrandMint palette.
# Warm-black ground + cream display + signature mint accent (no gold).
INK = "#070a09"
INK_2 = "#10171a"
INK_3 = "#1a2024"
PAPER = "#f5f1ea"          # cream display text
PAPER_DIM = "#a3b2ac"      # muted cool-cream for meta lines
MINT = "#10b981"           # BrandMint signature
MINT_2 = "#7cf6c8"          # bright highlight
MINT_4 = "#047857"          # deep mint (vignette, deep accent)
MUTE = "#5d7368"

FONT_DISPLAY = "DejaVu Sans, Inter, system-ui, sans-serif"
FONT_SERIF = "DejaVu Serif, Georgia, serif"
FONT_MONO = "DejaVu Sans Mono, Menlo, monospace"
_DEJAVU_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
_DEJAVU_SERIF_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
_DEJAVU_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"

HERE = Path(__file__).parent
FRAMES = HERE / "frames"
OUT = HERE / "out"
FRAMES.mkdir(exist_ok=True)
OUT.mkdir(exist_ok=True)

BAR_H = 110  # slim letterbox bars

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

# ------------------------------------------------------- empire data ---
# Data source: editorial research doc "Hyderabad's Empires: Episode One
# — The 13 Titans of Hyderabad Real Estate, Ranking & History Report"
# (2026 edition). EP01 reveals the top 8 by current sales-value /
# prestige ranking; the bottom 5 (SMR, Modi, Aditya, Sri Aditya, Ramky)
# get teased at the end as "EP02: The Heritage Five".
#
# All fields are public-record (company sites + RERA + industry press).
# No net-worth figures or unverified claims.

@dataclass
class Empire:
    rank: int
    name: List[str]              # ["PRESTIGE", "GROUP"] — 1 or 2 lines
    founder: str                 # "Razack Sattar"
    founded: int                 # 1986
    hq: str                      # "BANGALORE → HYD" or "HYDERABAD"
    price: str                   # "₹8-12K"
    projects: str                # "200+ PROJECTS" or "37M SFT DELIVERED"
    angle: str                   # "The National Champion"  (story chip)
    key_project: str             # "The Prestige City · Rajendra Nagar"

# Ordered #8 → #1 (reveal countdown). Ranks from the research doc's
# Executive Ranking Table — by current sales value + prestige + portfolio.
EMPIRES: List[Empire] = [
    Empire(rank=8, name=["SUMADHURA", "INFRACON"],
           founder="Madhusudhan G.", founded=1995,
           hq="NALGONDA → HYD",
           price="₹6-9.5K", projects="56+ · 12,000 HOMES",
           angle="The First-Generation Hustle",
           key_project="The Olympus · Financial District"),

    Empire(rank=7, name=["RAJAPUSHPA", "PROPERTIES"],
           founder="Parupati Brothers", founded=2006,
           hq="KOKAPET · HYD",
           price="₹8.5-12.5K", projects="7+ DELIVERED · 4 BROTHERS",
           angle="The Four-Brothers Empire",
           key_project="Rajapushpa West Avenue · Kokapet"),

    Empire(rank=6, name=["PHOENIX", "GROUP"],
           founder="Phoenix Family", founded=2004,
           hq="JUBILEE HILLS · HYD",
           price="₹9-15K", projects="20+ · AWARD-WINNING",
           angle="The Ultra-Luxury Specialist",
           key_project="Phoenix Golf Edge · Gachibowli"),

    Empire(rank=5, name=["LODHA", "GROUP"],
           founder="Mangal Prabhat Lodha", founded=1980,
           hq="MUMBAI → HYD",
           price="₹7-10.5K", projects="300+ PROJECTS",
           angle="The Mumbai Giant",
           key_project="Lodha Bellezza · Kukatpally"),

    Empire(rank=4, name=["VASAVI", "GROUP"],
           founder="Vasavi Family", founded=1996,
           hq="HYDERABAD",
           price="₹6-9K", projects="40+ PROJECTS",
           angle="The Detail Masters",
           key_project="Vasavi Crown East · Uppal"),

    Empire(rank=3, name=["APARNA", "CONSTRUCTIONS"],
           founder="S. Sridhar Reddy Family", founded=1996,
           hq="HYDERABAD",
           price="₹6.5-9.5K", projects="60+ · ISO CERTIFIED",
           angle="The Green Pioneer",
           key_project="Aparna Sarovar Zenith · Nallagandla"),

    Empire(rank=2, name=["MY HOME", "GROUP"],
           founder="Dr. J. Rameswar Rao", founded=1981,
           hq="HYDERABAD",
           price="₹7.5-11K", projects="44 YEARS · ₹4,000Cr TURNOVER",
           angle="The Hyderabad Original",
           key_project="My Home Bhooja · Hi-Tech City"),

    Empire(rank=1, name=["PRESTIGE", "GROUP"],
           founder="Razack Sattar", founded=1986,
           hq="BANGALORE → HYD",
           price="₹8-12K", projects="200+ · INDIA'S #1",
           angle="The National Champion",
           key_project="The Prestige City · Rajendra Nagar"),
]

# ------------------------------------------------------- beat schedule ---

@dataclass
class Beat:
    kind: str
    duration: float
    text: str = ""
    text2: str = ""
    empire: Optional[Empire] = None

# Short cut for IG short-form — average view time is ~6s, so all
# intro/teaser/outro beats are dropped. Splash carries the framing,
# 8 empire slates flash in countdown, cta closes with the follow ask.
#   splash 2b + 8×2.2b empire + cta 3b = 22.6 beats × 0.75s ≈ 17.0s ✓
BEATS: List[Beat] = [
    Beat(kind="splash",        duration=beats(2.0),
         text="Can you rank",  text2="builders?"),
] + [
    Beat(kind="empire", duration=beats(2.2), empire=e) for e in EMPIRES
] + [
    Beat(kind="cta", duration=beats(3),
         text="FOLLOW",
         text2="@brandmint.studios"),
]

TOTAL_SECONDS = sum(b.duration for b in BEATS)
TOTAL_FRAMES = int(round(TOTAL_SECONDS * FPS))

# -------------------------------------------------------------- helpers ---

def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t

def ease_out_cubic(t: float) -> float:
    return 1 - (1 - t) ** 3

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
    """Warm-black background with slow radial gold glow + letterbox bars.
    `warm` 0..1 modulates the intensity of the gold vignette."""
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
          <stop offset="0%" stop-color="{MINT}" stop-opacity="{glow_op:.3f}"/>
          <stop offset="55%" stop-color="{MINT_4}" stop-opacity="{glow_op * 0.3:.3f}"/>
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

      <!-- letterbox bars -->
      <rect x="0" y="0" width="{W}" height="{BAR_H}" fill="#000"/>
      <rect x="0" y="{H - BAR_H}" width="{W}" height="{BAR_H}" fill="#000"/>

      <!-- thin gold hairlines beneath bars -->
      <line x1="0" y1="{BAR_H}" x2="{W}" y2="{BAR_H}"
            stroke="{MINT}" stroke-opacity="0.25" stroke-width="1"/>
      <line x1="0" y1="{H - BAR_H}" x2="{W}" y2="{H - BAR_H}"
            stroke="{MINT}" stroke-opacity="0.25" stroke-width="1"/>
    """

def chrome_overlay(intro_t: float) -> str:
    op = min(1.0, intro_t)
    return f"""
      <g opacity="{op:.3f}">
        <text x="64" y="68" font-family="{FONT_MONO}" font-size="20"
              font-weight="700" letter-spacing="0.22em" fill="{PAPER}"
              opacity="0.72">@brandmint.studios</text>
        <text x="{W - 64}" y="68" font-family="{FONT_MONO}" font-size="20"
              font-weight="700" letter-spacing="0.22em" fill="{MINT}"
              text-anchor="end" opacity="0.72">EDITORIAL · 2026</text>
      </g>
      <g opacity="{op * 0.72:.3f}">
        <text x="64" y="{H - 40}" font-family="{FONT_MONO}" font-size="16"
              font-weight="700" letter-spacing="0.22em" fill="{PAPER_DIM}">
          SOURCES · PUBLIC RECORDS
        </text>
        <text x="{W - 64}" y="{H - 40}" font-family="{FONT_MONO}" font-size="16"
              font-weight="700" letter-spacing="0.22em" fill="{PAPER_DIM}"
              text-anchor="end">
          EP01 · HYDERABAD
        </text>
      </g>
    """

# ------------------------------------------------------ scene renderers ---

def render_splash(beat: Beat, local: float, scale: float) -> str:
    """Held cover splash for ~1.2s at the start of the reel.

    This is the frame IG's feed shows BEFORE the user taps play — so
    it acts as a baked-in thumbnail (insurance against IG not picking up
    the custom cover JPG). Composition matches cover-question.jpg.

    Subtle 1.0 → 1.02 breathing scale + soft fade-out in the last 15%
    so the cut to the intro feels intentional, not abrupt.
    """
    cx = W // 2
    # subtle breathing on the mint accent
    pulse = 1.0 + 0.015 * math.sin(local * math.pi * 1.6)
    # gentle fade-out at the very end so the transition to intro is smooth
    op = 1.0 if local < 0.85 else max(0.0, 1.0 - (local - 0.85) / 0.15)

    big_pt = int(142 * pulse)

    return f"""
      <g opacity="{op:.3f}">
        <text x="{cx}" y="500" font-family="{FONT_MONO}" font-size="24"
              font-weight="700" fill="{MINT}" text-anchor="middle"
              letter-spacing="0.36em">HYDERABAD'S EMPIRES</text>
        <line x1="{cx - 70}" y1="530" x2="{cx + 70}" y2="530"
              stroke="{MINT}" stroke-width="2"/>

        <text x="{cx}" y="730" font-family="{FONT_SERIF}" font-size="108"
              font-weight="700" fill="{PAPER}" text-anchor="middle"
              font-style="italic">{beat.text}</text>
        <text x="{cx}" y="850" font-family="{FONT_SERIF}" font-size="108"
              font-weight="700" fill="{PAPER}" text-anchor="middle"
              font-style="italic">Hyderabad's</text>
        <text x="{cx}" y="1000" font-family="{FONT_DISPLAY}" font-size="{big_pt}"
              font-weight="900" fill="{MINT}" text-anchor="middle"
              letter-spacing="-0.01em">8 BIGGEST</text>
        <text x="{cx}" y="1120" font-family="{FONT_SERIF}" font-size="108"
              font-weight="700" fill="{PAPER}" text-anchor="middle"
              font-style="italic">{beat.text2}</text>

        <line x1="{cx - 60}" y1="1230" x2="{cx + 60}" y2="1230"
              stroke="{MINT}" stroke-width="2"/>
        <text x="{cx}" y="1300" font-family="{FONT_MONO}" font-size="22"
              font-weight="700" fill="{PAPER_DIM}" text-anchor="middle"
              letter-spacing="0.36em">RANKED  ·  BY SALES  ·  BY STORY</text>
      </g>
    """

def render_intro_title(beat: Beat, local: float, scale: float) -> str:
    """Big serif HYDERABAD with letter-by-letter reveal, then EIGHT EMPIRES
    fades in below."""
    title = beat.text          # "HYDERABAD"
    sub = beat.text2           # "EIGHT EMPIRES"

    reveal_progress = min(1.0, local / 0.45)
    n_chars = max(1, int(round(reveal_progress * len(title))))
    shown = title[:n_chars]

    pt = 156
    while pt > 80 and measure(title, pt, "serif") > W - 160:
        pt -= 6

    sub_op = max(0.0, min(1.0, (local - 0.45) / 0.30))
    sub_pt = 36

    cy = H // 2
    title_y = cy - 30
    sub_y = cy + 90

    # subtle vertical drift
    drift = lerp(8, -8, ease_in_out(local))

    sub_letter_spacing = "0.32em"

    return f"""
      <text x="{W//2}" y="{title_y + drift:.0f}"
            font-family="{FONT_SERIF}" font-size="{pt}" font-weight="700"
            fill="{PAPER}" text-anchor="middle"
            letter-spacing="0.04em">{shown}</text>

      <g opacity="{sub_op:.3f}">
        <line x1="{W//2 - 80}" y1="{sub_y - 60}"
              x2="{W//2 + 80}" y2="{sub_y - 60}"
              stroke="{MINT}" stroke-width="1.5"/>
        <text x="{W//2}" y="{sub_y}"
              font-family="{FONT_DISPLAY}" font-size="{sub_pt}"
              font-weight="700" fill="{MINT}" text-anchor="middle"
              letter-spacing="{sub_letter_spacing}">{sub}</text>
      </g>
    """

def render_intro_setup(beat: Beat, local: float, scale: float) -> str:
    """Setup line: 'The builders / who shaped a city.'"""
    op_in = min(1.0, local / 0.25)
    op_out = 1.0 - max(0.0, (local - 0.85) / 0.15)
    op = min(op_in, op_out)

    pt = 64
    line_h = int(pt * 1.20)
    cy = H // 2

    return f"""
      <g opacity="{op:.3f}">
        <text x="{W//2}" y="{cy - line_h // 2 + pt // 2}"
              font-family="{FONT_SERIF}" font-size="{pt}" font-weight="700"
              fill="{PAPER}" text-anchor="middle" letter-spacing="0.02em"
              font-style="italic">{beat.text}</text>
        <text x="{W//2}" y="{cy + line_h // 2 + pt // 2}"
              font-family="{FONT_SERIF}" font-size="{pt}" font-weight="700"
              fill="{PAPER}" text-anchor="middle" letter-spacing="0.02em"
              font-style="italic">{beat.text2}</text>
      </g>
    """

def render_empire(beat: Beat, local: float, scale: float) -> str:
    """Per-builder slate — CENTRE-ALIGNED inside Instagram Reel's safe
    zone (top 220px, bottom 384px are reserved by Meta's UI). All content
    sits in Y=320–1540, fully usable horizontal width with 80px gutters.

    Layout (top → bottom, Y coordinates):
        Y=400   eyebrow "HYDERABAD'S EMPIRES · 2026"
        Y=430   short mint rule
        Y=580   rank numeral "#01"  (serif 160pt mint, the anchor)
        Y=615   "RANK" micro-label
        Y=730   name line 1  (display 100-110pt)
        Y=840   name line 2  (if 2-line)
        Y=970   italic story angle  ("The National Champion")
        Y=1080  stats dot-strip  "FOUNDED 1986 · 200+ PROJECTS · ₹8-12K"
        Y=1170  founder + HQ  "RAZACK SATTAR · BANGALORE → HYD"
        Y=1290  mint mid-rule
        Y=1370  italic key project  "The Prestige City · Rajendra Nagar"

    The richer info-grid (vs v13's MSF-only) trades pure cinematic
    silence for editorial density — every slate now carries founder,
    age, scale, price tier, story angle, and a signature project in
    a single glance.
    """
    e = beat.empire
    if e is None:
        return ""

    op_in = min(1.0, local / 0.20)
    op_out = 1.0 - max(0.0, (local - 0.88) / 0.12)
    op = min(op_in, op_out)
    drift = lerp(10, -10, ease_in_out(local))
    cx = W // 2

    # Mint accent for the rank numeral fades in slightly later for
    # cinematic reveal feel.
    rank_op = min(1.0, max(0.0, (local - 0.10) / 0.20))

    # Name — auto-shrink if a line is too wide
    safe_w = W - 200
    name_pt = 108
    while name_pt > 64 and any(
        measure(line, name_pt) > safe_w for line in e.name
    ):
        name_pt -= 6
    name_line_h = int(name_pt * 1.05)

    eyebrow_y      = 400
    eyebrow_rule_y = 432

    rank_pt        = 160
    rank_y         = 580
    rank_label_y   = 620

    # Name block (1 or 2 lines, centered vertically in its slot)
    name_slot_top    = 700
    name_slot_height = 200          # fits 2 × 100pt comfortably
    n_lines = len(e.name)
    name_block_h = name_line_h * n_lines
    name_block_top = name_slot_top + (name_slot_height - name_block_h) // 2
    name_baseline_first = name_block_top + int(name_pt * 0.85)

    angle_y     = 970
    stats_y     = 1080
    founder_y   = 1170
    rule_y      = 1290
    project_y   = 1370

    name_lines_svg = []
    for i, line in enumerate(e.name):
        y_line = name_baseline_first + i * name_line_h + drift
        name_lines_svg.append(
            f'<text x="{cx}" y="{y_line:.0f}" '
            f'font-family="{FONT_DISPLAY}" font-size="{name_pt}" '
            f'font-weight="900" fill="{PAPER}" text-anchor="middle" '
            f'letter-spacing="-0.01em">{line}</text>'
        )

    # Stats strip: "FOUNDED 1986 · 200+ PROJECTS · ₹8-12K"
    stats_text = f"FOUNDED {e.founded}  ·  {e.projects}  ·  {e.price}"

    # Founder + HQ: "RAZACK SATTAR · BANGALORE → HYD"
    founder_text = f"{e.founder.upper()}  ·  {e.hq}"

    rank_str = f"#{e.rank:02d}"

    return f"""
      <g opacity="{op:.3f}">
        <!-- eyebrow -->
        <text x="{cx}" y="{eyebrow_y + drift:.0f}"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              fill="{MINT}" text-anchor="middle" letter-spacing="0.34em">
          HYDERABAD'S EMPIRES  ·  2026
        </text>
        <line x1="{cx - 60}" y1="{eyebrow_rule_y + drift:.0f}"
              x2="{cx + 60}" y2="{eyebrow_rule_y + drift:.0f}"
              stroke="{MINT}" stroke-width="1.5"/>

        <!-- rank numeral (mint, the anchor) -->
        <g opacity="{rank_op:.3f}">
          <text x="{cx}" y="{rank_y + drift:.0f}"
                font-family="{FONT_SERIF}" font-size="{rank_pt}" font-weight="700"
                fill="{MINT}" text-anchor="middle" letter-spacing="-0.02em">
            {rank_str}
          </text>
          <text x="{cx}" y="{rank_label_y + drift:.0f}"
                font-family="{FONT_MONO}" font-size="18" font-weight="700"
                fill="{PAPER_DIM}" text-anchor="middle" letter-spacing="0.40em">
            RANK
          </text>
        </g>

        <!-- name block (1 or 2 lines, vertically centered) -->
        {''.join(name_lines_svg)}

        <!-- italic story angle -->
        <text x="{cx}" y="{angle_y + drift:.0f}"
              font-family="{FONT_SERIF}" font-size="52" font-weight="700"
              fill="{MINT_2}" text-anchor="middle"
              font-style="italic" letter-spacing="0.01em">
          {e.angle}
        </text>

        <!-- stats dot-strip: founded · projects · price -->
        <text x="{cx}" y="{stats_y + drift:.0f}"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              fill="{PAPER}" text-anchor="middle" letter-spacing="0.20em">
          {stats_text}
        </text>

        <!-- founder + HQ -->
        <text x="{cx}" y="{founder_y + drift:.0f}"
              font-family="{FONT_MONO}" font-size="20" font-weight="700"
              fill="{PAPER_DIM}" text-anchor="middle" letter-spacing="0.26em">
          {founder_text}
        </text>

        <!-- mid-rule before the project -->
        <line x1="{cx - 50}" y1="{rule_y + drift:.0f}"
              x2="{cx + 50}" y2="{rule_y + drift:.0f}"
              stroke="{MINT}" stroke-width="2" opacity="0.6"/>

        <!-- signature project (italic serif) -->
        <text x="{cx}" y="{project_y + drift:.0f}"
              font-family="{FONT_SERIF}" font-size="36" font-weight="700"
              fill="{PAPER}" text-anchor="middle" font-style="italic">
          {e.key_project}
        </text>
      </g>
    """

def render_boutique_teaser(beat: Beat, local: float, scale: float) -> str:
    """EP02 teaser — "The Heritage Five". Five more Hyderabad builders
    that didn't make the Top 8 but have decades of legacy: SMR, Modi,
    Aditya, Sri Aditya, Ramky. Same centered grammar as the empire
    slates so it reads as a continuation, not a CTA.
    """
    op_in = min(1.0, local / 0.20)
    op_out = 1.0 - max(0.0, (local - 0.88) / 0.12)
    op = min(op_in, op_out)
    drift = lerp(10, -10, ease_in_out(local))
    cx = W // 2

    title = ["THE HERITAGE", "FIVE"]
    title_pt = 108
    safe_w = W - 200
    while title_pt > 64 and any(measure(line, title_pt) > safe_w for line in title):
        title_pt -= 6
    title_line_h = int(title_pt * 1.05)
    title_block_h = title_line_h * len(title)

    eyebrow_y      = 400
    eyebrow_rule_y = 432

    arrow_pt       = 160
    arrow_y        = 580
    arrow_label_y  = 620

    name_slot_top    = 700
    name_slot_height = 200
    name_block_top   = name_slot_top + (name_slot_height - title_block_h) // 2
    name_baseline    = name_block_top + int(title_pt * 0.85)

    angle_y    = 970
    list_y     = 1080
    note_y     = 1170
    rule_y     = 1290
    drop_y     = 1370

    title_lines_svg = []
    for i, line in enumerate(title):
        y_line = name_baseline + i * title_line_h + drift
        title_lines_svg.append(
            f'<text x="{cx}" y="{y_line:.0f}" '
            f'font-family="{FONT_DISPLAY}" font-size="{title_pt}" '
            f'font-weight="900" fill="{PAPER}" text-anchor="middle" '
            f'letter-spacing="-0.01em">{line}</text>'
        )

    return f"""
      <g opacity="{op:.3f}">
        <!-- eyebrow -->
        <text x="{cx}" y="{eyebrow_y + drift:.0f}"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              fill="{MINT}" text-anchor="middle" letter-spacing="0.34em">
          NEXT  EPISODE  ·  EP 02
        </text>
        <line x1="{cx - 60}" y1="{eyebrow_rule_y + drift:.0f}"
              x2="{cx + 60}" y2="{eyebrow_rule_y + drift:.0f}"
              stroke="{MINT}" stroke-width="1.5"/>

        <!-- arrow in place of rank -->
        <text x="{cx}" y="{arrow_y + drift:.0f}"
              font-family="{FONT_SERIF}" font-size="{arrow_pt}" font-weight="700"
              fill="{MINT}" text-anchor="middle">→</text>
        <text x="{cx}" y="{arrow_label_y + drift:.0f}"
              font-family="{FONT_MONO}" font-size="18" font-weight="700"
              fill="{PAPER_DIM}" text-anchor="middle" letter-spacing="0.40em">
          NEXT
        </text>

        <!-- title -->
        {''.join(title_lines_svg)}

        <!-- italic angle line -->
        <text x="{cx}" y="{angle_y + drift:.0f}"
              font-family="{FONT_SERIF}" font-size="52" font-weight="700"
              fill="{MINT_2}" text-anchor="middle"
              font-style="italic" letter-spacing="0.01em">
          The five who built the foundations
        </text>

        <!-- five names dot-strip -->
        <text x="{cx}" y="{list_y + drift:.0f}"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              fill="{PAPER}" text-anchor="middle" letter-spacing="0.20em">
          {beat.text2}
        </text>

        <!-- combined heritage stat -->
        <text x="{cx}" y="{note_y + drift:.0f}"
              font-family="{FONT_MONO}" font-size="20" font-weight="700"
              fill="{PAPER_DIM}" text-anchor="middle" letter-spacing="0.26em">
          5 BUILDERS  ·  150+ YEARS COMBINED  ·  HYDERABAD
        </text>

        <line x1="{cx - 50}" y1="{rule_y + drift:.0f}"
              x2="{cx + 50}" y2="{rule_y + drift:.0f}"
              stroke="{MINT}" stroke-width="2" opacity="0.6"/>

        <text x="{cx}" y="{drop_y + drift:.0f}"
              font-family="{FONT_SERIF}" font-size="36" font-weight="700"
              fill="{PAPER}" text-anchor="middle" font-style="italic">
          ▸ Out next Sunday
        </text>
      </g>
    """

def render_outro_caption(beat: Beat, local: float, scale: float) -> str:
    """'Built by giants. / Branded by craftsmen.'"""
    op_in = min(1.0, local / 0.25)
    op_out = 1.0 - max(0.0, (local - 0.85) / 0.15)
    op = min(op_in, op_out)

    pt = 76
    cy = H // 2

    return f"""
      <g opacity="{op:.3f}">
        <text x="{W//2}" y="{cy - 30}"
              font-family="{FONT_SERIF}" font-size="{pt}" font-weight="700"
              fill="{PAPER}" text-anchor="middle"
              font-style="italic">{beat.text}</text>
        <text x="{W//2}" y="{cy + 80}"
              font-family="{FONT_SERIF}" font-size="{pt}" font-weight="700"
              fill="{MINT}" text-anchor="middle"
              font-style="italic">{beat.text2}</text>
      </g>
    """

def render_cta(beat: Beat, local: float, scale: float) -> str:
    """Final follow-for-more CTA designed for organic follower growth.

    Layout (top → bottom):
       EPISODE 01 OF ──
       HYDERABAD'S
       EMPIRES                 ← series brand-mark (serif)
       ━━━
       FOLLOW    ← huge cream display
       @brandmint.studios     ← gold handle
       for Episode 02  →      ← incentive
       ─────────
       Telugu Titans · National Giants · Tomorrow's Builders
    """
    op_in = min(1.0, local / 0.18)
    op = op_in

    # Pulse on FOLLOW — 1.0 → 1.04 → 1.0 every 1.5s
    pulse = 1.0 + 0.04 * math.sin(local * math.pi * 2.4)

    # Series mark (top half)
    series_y_top = BAR_H + 230
    series_pt = 96

    # FOLLOW block (mid)
    follow_pt = int(180 * pulse)
    follow_y = H // 2 + 100

    # Handle + incentive (below FOLLOW)
    handle_pt = 44
    handle_y = follow_y + 80

    incentive_pt = 30
    incentive_y = handle_y + 60

    # Teaser footer
    teaser_y = H - BAR_H - 100

    return f"""
      <g opacity="{op:.3f}">
        <!-- top: episode marker -->
        <text x="{W//2}" y="{BAR_H + 100}"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              fill="{MINT}" text-anchor="middle" letter-spacing="0.32em">
          EPISODE  01  OF
        </text>

        <!-- series wordmark -->
        <text x="{W//2}" y="{series_y_top}"
              font-family="{FONT_SERIF}" font-size="{series_pt}"
              font-weight="700" fill="{PAPER}" text-anchor="middle"
              letter-spacing="0.02em">HYDERABAD'S</text>
        <text x="{W//2}" y="{series_y_top + 100}"
              font-family="{FONT_SERIF}" font-size="{series_pt}"
              font-weight="700" fill="{PAPER}" text-anchor="middle"
              letter-spacing="0.02em">EMPIRES</text>

        <!-- gold divider -->
        <line x1="{W//2 - 80}" y1="{series_y_top + 180}"
              x2="{W//2 + 80}" y2="{series_y_top + 180}"
              stroke="{MINT}" stroke-width="2"/>

        <!-- FOLLOW (huge, pulsing) -->
        <text x="{W//2}" y="{follow_y}"
              font-family="{FONT_DISPLAY}" font-size="{follow_pt}"
              font-weight="900" fill="{MINT}" text-anchor="middle"
              letter-spacing="0.04em">{beat.text}</text>

        <!-- handle -->
        <text x="{W//2}" y="{handle_y}"
              font-family="{FONT_MONO}" font-size="{handle_pt}"
              font-weight="700" fill="{PAPER}" text-anchor="middle"
              letter-spacing="0.04em">{beat.text2}</text>

        <!-- incentive: for Episode 02 → -->
        <text x="{W//2}" y="{incentive_y}"
              font-family="{FONT_SERIF}" font-size="{incentive_pt}"
              font-weight="700" fill="{PAPER_DIM}" text-anchor="middle"
              font-style="italic">for Episode 02  ▸</text>

        <!-- teaser footer -->
        <line x1="{W//2 - 220}" y1="{teaser_y - 30}"
              x2="{W//2 + 220}" y2="{teaser_y - 30}"
              stroke="{MINT}" stroke-opacity="0.4" stroke-width="1"/>
        <text x="{W//2}" y="{teaser_y}"
              font-family="{FONT_MONO}" font-size="18"
              font-weight="700" fill="{PAPER_DIM}" text-anchor="middle"
              letter-spacing="0.22em">
          NEXT  ·  TELUGU  TITANS  ·  NATIONAL  GIANTS
        </text>
      </g>
    """

# ------------------------------------------------------------ compose ---

def compose_svg(t_sec: float, frame_idx: int) -> str:
    idx, local, beat = beat_at(t_sec)

    # Slow push-in per beat — scale grows 1.0 → 1.06 across each scene.
    scale = lerp(1.0, 1.06, local)
    # Chrome fades in only AFTER the splash so the cover frame stays clean.
    splash_dur = BEATS[0].duration if BEATS and BEATS[0].kind == "splash" else 0.0
    intro_t = max(0.0, min(1.0, (t_sec - splash_dur) / 0.6))

    bg = background(scale)
    chrome = "" if beat.kind == "splash" else chrome_overlay(intro_t)

    if beat.kind == "splash":
        content = render_splash(beat, local, scale)
    elif beat.kind == "intro_title":
        content = render_intro_title(beat, local, scale)
    elif beat.kind == "intro_setup":
        content = render_intro_setup(beat, local, scale)
    elif beat.kind == "empire":
        content = render_empire(beat, local, scale)
    elif beat.kind == "boutique_teaser":
        content = render_boutique_teaser(beat, local, scale)
    elif beat.kind == "outro_caption":
        content = render_outro_caption(beat, local, scale)
    elif beat.kind == "cta":
        content = render_cta(beat, local, scale)
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
    """Cinematic trailer score:
       - sub-bass drone at 55Hz (continuous, dipped between scenes)
       - mid pad at 165Hz (slow swell on intro + cta)
       - tonal impact hit at the start of each empire slate (filtered sub thump)
    """
    sr = 48000
    n = int(TOTAL_SECONDS * sr)
    t = np.arange(n) / sr

    # Sub drone
    sub = 0.28 * np.sin(2 * np.pi * 55 * t)
    sub += 0.10 * np.sin(2 * np.pi * 27.5 * t)

    # Mid pad
    pad = 0.10 * np.sin(2 * np.pi * 165 * t)
    pad += 0.06 * np.sin(2 * np.pi * 247.5 * t)

    # Impact hits at the start of each empire beat + intro + cta
    impacts = np.zeros(n)
    cursor = 0.0
    for b in BEATS:
        if b.kind in ("intro_title", "empire", "boutique_teaser", "cta"):
            i = int(cursor * sr)
            dur = int(0.45 * sr)
            if i + dur <= n:
                env = np.exp(-np.linspace(0, 6, dur))
                # filtered noise burst + sub thump
                noise = np.random.normal(0, 1, dur) * 0.15
                thump = np.sin(2 * np.pi * 48 * np.arange(dur) / sr)
                hit = env * (0.55 * thump + 0.30 * noise)
                impacts[i:i + dur] += hit
        cursor += b.duration

    # Master swell — fade in first 1.5s, hold, fade out last 1.5s
    env = np.ones(n)
    fade = int(1.5 * sr)
    env[:fade] = np.linspace(0, 1, fade)
    env[-fade:] = np.linspace(1, 0, fade)

    mix = (sub + pad + impacts) * env

    # Normalise to peak -3 dBFS
    peak = float(np.max(np.abs(mix))) or 1.0
    mix = mix / peak * 0.7

    # int16 mono
    pcm = (mix * 32767).astype(np.int16)

    with wave.open(str(out_wav), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())

# --------------------------------------------------------------- mux ---

def mux_video(out_mp4: Path, with_audio: bool) -> None:
    """Mux the rendered PNG frames + audio into an MP4 with an embedded
    cover image (attached_pic) so Android Gallery / WhatsApp / Telegram /
    IG upload-preview show the splash cover as the thumbnail rather than
    auto-sampling a random middle frame."""
    cover = OUT / "covers" / "cover-question.jpg"

    cmd = [
        "ffmpeg", "-y",
        "-framerate", str(FPS),
        "-i", str(FRAMES / "f%05d.png"),
    ]
    if with_audio:
        cmd += ["-i", str(OUT / "_audio.wav")]
    if cover.exists():
        cmd += ["-i", str(cover)]

    cmd += ["-map", "0:v:0"]
    if with_audio:
        cmd += ["-map", "1:a:0"]
    if cover.exists():
        cover_input_idx = 2 if with_audio else 1
        cmd += ["-map", f"{cover_input_idx}:v:0"]

    cmd += [
        "-c:v:0", "libx264", "-pix_fmt:v:0", "yuv420p",
        "-profile:v:0", "high", "-level:v:0", "4.0",
        "-crf", "18", "-preset", "medium",
    ]
    if with_audio:
        cmd += ["-c:a", "aac", "-b:a", "192k", "-ac", "2"]
    if cover.exists():
        # mjpeg encoder needs the JPEG-range pixel format
        cmd += ["-c:v:1", "mjpeg",
                "-pix_fmt:v:1", "yuvj420p",
                "-disposition:v:1", "attached_pic"]

    cmd += ["-movflags", "+faststart"]
    # -shortest would clip to the 1-frame cover; skip it when a cover is
    # attached. Video and audio already match by design.
    if with_audio and not cover.exists():
        cmd += ["-shortest"]
    cmd += [str(out_mp4)]

    print(f"  muxing → {out_mp4.name}"
          + ("  (+cover embedded)" if cover.exists() else ""))
    subprocess.run(cmd, check=True, capture_output=True)

# ---------------------------------------------------------------- main ---

def main() -> None:
    print(f"\nv13 · Hyderabad Empires · BPM={BPM}")
    print(f"  total: {TOTAL_SECONDS:.1f}s · {TOTAL_FRAMES} frames")

    render_all_frames()

    audio_wav = OUT / "_audio.wav"
    print("  synthesising audio ...")
    synth_audio(audio_wav)

    scored = OUT / f"hyderabad-empires-{BPM}bpm.mp4"
    silent = OUT / f"hyderabad-empires-{BPM}bpm-silent.mp4"

    mux_video(scored, with_audio=True)
    mux_video(silent, with_audio=False)

    print(f"\n  ✓ {scored.relative_to(HERE.parent.parent)}")
    print(f"  ✓ {silent.relative_to(HERE.parent.parent)}")
    print()

if __name__ == "__main__":
    main()
