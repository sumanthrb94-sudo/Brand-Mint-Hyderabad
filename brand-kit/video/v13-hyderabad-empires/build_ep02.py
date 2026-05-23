"""
BrandMint Studios — Hyderabad Empires · EP02 · The Heritage Five.

Continuation of v13. Reveals ranks 13 → 09 of the 13-Titans research
doc — the five builders who didn't make EP01's Top 8 but anchor
Hyderabad's decades-long real-estate story.

Reuses v13's frame system (same chrome, same palette, same emerald
accent) so the two episodes feel like one series. Differences:

  · Chrome label: EP02 · HYDERABAD
  · Splash + intro language flipped to the heritage framing
  · #11 Aditya Constructions slate carries a small disambig eyebrow
    pointing back to #12 Sri Aditya Homes (different company, different
    founder, 11 years apart)
  · Closer is an all-13 recap with the line "Now you know."

Out:   out/hyderabad-empires-ep02-{bpm}bpm[-silent].mp4
Run:   python3 build_ep02.py
       BPM=72 python3 build_ep02.py
"""

from __future__ import annotations

import math
import os
import shutil
import subprocess
import wave
from dataclasses import dataclass, field
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

INK = "#070a09"
INK_2 = "#10171a"
INK_3 = "#1a2024"
PAPER = "#f5f1ea"
PAPER_DIM = "#a3b2ac"
MINT = "#10b981"
MINT_2 = "#7cf6c8"
MINT_4 = "#047857"
MUTE = "#5d7368"

FONT_DISPLAY = "DejaVu Sans, Inter, system-ui, sans-serif"
FONT_SERIF = "DejaVu Serif, Georgia, serif"
FONT_MONO = "DejaVu Sans Mono, Menlo, monospace"
_DEJAVU_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
_DEJAVU_SERIF_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
_DEJAVU_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"

HERE = Path(__file__).parent
FRAMES = HERE / "frames_ep02"
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

# ------------------------------------------------------- empire data ---
# Ranks 13 → 09 from "Hyderabad's Empires: Episode One — The 13 Titans
# of Hyderabad Real Estate" (2026 edition). Reveal order: countdown
# 13 → 09, closing on SMR Holdings as the climax slate.

@dataclass
class Empire:
    rank: int
    name: List[str]
    founder: str
    founded: int
    hq: str
    price: str
    projects: str
    angle: str
    key_project: str
    disambig: str = ""    # small note above the name (used for #11)

EMPIRES: List[Empire] = [
    Empire(rank=13, name=["RAMKY", "ESTATES"],
           founder="Ramky Group", founded=1994,
           hq="HYDERABAD",
           price="₹6-9K", projects="INTEGRATED TOWNSHIPS",
           angle="The Township King",
           key_project="Ramky One Galaxia"),

    Empire(rank=12, name=["SRI ADITYA", "HOMES"],
           founder="V. Kota Reddy", founded=1991,
           hq="HYDERABAD",
           price="₹5.5-8K", projects="34 YEARS",
           angle="The 1991 Original",
           key_project="Sri Aditya Heights"),

    Empire(rank=11, name=["ADITYA", "CONSTRUCTIONS"],
           founder="Sathiraju Vakkalanka", founded=2002,
           hq="HYDERABAD",
           price="₹7-10K", projects="VAASTU LANDMARKS",
           angle="The Landmark Maker",
           key_project="Aditya Capitol Heights",
           disambig="DISTINCT FROM #12 · SRI ADITYA HOMES"),

    Empire(rank=10, name=["MODI", "BUILDERS"],
           founder="Modi Family", founded=1985,
           hq="HYDERABAD",
           price="₹5-7.5K", projects="50+ PROJECTS · 40 YEARS",
           angle="The Hyderabad Heritage",
           key_project="Modi Splendour · Kukatpally"),

    Empire(rank=9, name=["SMR", "HOLDINGS"],
           founder="S. Ram Reddy", founded=1993,
           hq="HYDERABAD + BLR",
           price="₹5.5-8.5K", projects="32 YEARS OF CONVICTION",
           angle="The Conviction Builders",
           key_project="SMR Vinay Iconia"),
]

# All-13 recap roster for the closer (rank, short-name).
ALL_THIRTEEN = [
    (1, "PRESTIGE"), (2, "MY HOME"), (3, "APARNA"),
    (4, "VASAVI"), (5, "LODHA"), (6, "PHOENIX"),
    (7, "RAJAPUSHPA"), (8, "SUMADHURA"),
    (9, "SMR"), (10, "MODI"), (11, "ADITYA"),
    (12, "SRI ADITYA"), (13, "RAMKY"),
]

# ------------------------------------------------------- beat schedule ---

@dataclass
class Beat:
    kind: str
    duration: float
    text: str = ""
    text2: str = ""
    empire: Optional[Empire] = None

# Short cut for IG short-form — average view time is ~6s. Empire
# slates trimmed to 3.3b each, closer 4b. Splash holds episode framing.
#   splash 1.5b + 5×3.3b empire + closer 4b = 22.0 beats × 0.75s ≈ 16.5s ✓
BEATS: List[Beat] = [
    Beat(kind="splash",        duration=beats(1.5),
         text="Before the towers,",
         text2="builders."),
] + [
    Beat(kind="empire", duration=beats(3.3), empire=e) for e in EMPIRES
] + [
    Beat(kind="closer", duration=beats(4),
         text="Now you know.",
         text2="THE 13 TITANS · 2026"),
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

      <rect x="0" y="0" width="{W}" height="{BAR_H}" fill="#000"/>
      <rect x="0" y="{H - BAR_H}" width="{W}" height="{BAR_H}" fill="#000"/>

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
          EP02 · HYDERABAD
        </text>
      </g>
    """

# ------------------------------------------------------ scene renderers ---

def render_splash(beat: Beat, local: float, scale: float) -> str:
    """EP02 cover splash: 'Before the towers, / there were / THESE 5 /
    builders.' Held ~1.5s as the IG feed thumbnail."""
    cx = W // 2
    pulse = 1.0 + 0.015 * math.sin(local * math.pi * 1.6)
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
              font-style="italic">there were</text>
        <text x="{cx}" y="1000" font-family="{FONT_DISPLAY}" font-size="{big_pt}"
              font-weight="900" fill="{MINT}" text-anchor="middle"
              letter-spacing="-0.01em">THESE 5</text>
        <text x="{cx}" y="1120" font-family="{FONT_SERIF}" font-size="108"
              font-weight="700" fill="{PAPER}" text-anchor="middle"
              font-style="italic">{beat.text2}</text>

        <line x1="{cx - 60}" y1="1230" x2="{cx + 60}" y2="1230"
              stroke="{MINT}" stroke-width="2"/>
        <text x="{cx}" y="1300" font-family="{FONT_MONO}" font-size="22"
              font-weight="700" fill="{PAPER_DIM}" text-anchor="middle"
              letter-spacing="0.36em">EP02  ·  THE HERITAGE FIVE</text>
      </g>
    """

def render_intro_title(beat: Beat, local: float, scale: float) -> str:
    title = beat.text
    sub = beat.text2

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
    drift = lerp(8, -8, ease_in_out(local))

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
              letter-spacing="0.32em">{sub}</text>
      </g>
    """

def render_intro_setup(beat: Beat, local: float, scale: float) -> str:
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
    """Per-builder slate. Same layout as EP01. If empire.disambig is set,
    a small italic note appears below the RANK label pointing out which
    other builder it must not be confused with."""
    e = beat.empire
    if e is None:
        return ""

    op_in = min(1.0, local / 0.20)
    op_out = 1.0 - max(0.0, (local - 0.88) / 0.12)
    op = min(op_in, op_out)
    drift = lerp(10, -10, ease_in_out(local))
    cx = W // 2

    rank_op = min(1.0, max(0.0, (local - 0.10) / 0.20))

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
    disambig_y     = 658

    name_slot_top    = 700
    name_slot_height = 200
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

    stats_text = f"FOUNDED {e.founded}  ·  {e.projects}  ·  {e.price}"
    founder_text = f"{e.founder.upper()}  ·  {e.hq}"
    rank_str = f"#{e.rank:02d}"

    disambig_svg = ""
    if e.disambig:
        disambig_svg = f"""
        <text x="{cx}" y="{disambig_y + drift:.0f}"
              font-family="{FONT_MONO}" font-size="16" font-weight="700"
              fill="{MINT_2}" text-anchor="middle" letter-spacing="0.24em"
              opacity="0.90">
          {e.disambig}
        </text>"""

    return f"""
      <g opacity="{op:.3f}">
        <text x="{cx}" y="{eyebrow_y + drift:.0f}"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              fill="{MINT}" text-anchor="middle" letter-spacing="0.34em">
          HYDERABAD'S EMPIRES  ·  2026
        </text>
        <line x1="{cx - 60}" y1="{eyebrow_rule_y + drift:.0f}"
              x2="{cx + 60}" y2="{eyebrow_rule_y + drift:.0f}"
              stroke="{MINT}" stroke-width="1.5"/>

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
          {disambig_svg}
        </g>

        {''.join(name_lines_svg)}

        <text x="{cx}" y="{angle_y + drift:.0f}"
              font-family="{FONT_SERIF}" font-size="52" font-weight="700"
              fill="{MINT_2}" text-anchor="middle"
              font-style="italic" letter-spacing="0.01em">
          {e.angle}
        </text>

        <text x="{cx}" y="{stats_y + drift:.0f}"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              fill="{PAPER}" text-anchor="middle" letter-spacing="0.20em">
          {stats_text}
        </text>

        <text x="{cx}" y="{founder_y + drift:.0f}"
              font-family="{FONT_MONO}" font-size="20" font-weight="700"
              fill="{PAPER_DIM}" text-anchor="middle" letter-spacing="0.26em">
          {founder_text}
        </text>

        <line x1="{cx - 50}" y1="{rule_y + drift:.0f}"
              x2="{cx + 50}" y2="{rule_y + drift:.0f}"
              stroke="{MINT}" stroke-width="2" opacity="0.6"/>

        <text x="{cx}" y="{project_y + drift:.0f}"
              font-family="{FONT_SERIF}" font-size="36" font-weight="700"
              fill="{PAPER}" text-anchor="middle" font-style="italic">
          {e.key_project}
        </text>
      </g>
    """

def render_closer(beat: Beat, local: float, scale: float) -> str:
    """All-13 recap. Eyebrow → 'Now you know.' (big serif italic) → 5
    lines of #rank + short-name covering ranks 01-13 → handle footer.
    Lines reveal in two waves so the closer feels like a payoff, not
    a roll-credit."""
    op_in = min(1.0, local / 0.15)
    op_out = 1.0 - max(0.0, (local - 0.92) / 0.08)
    op = min(op_in, op_out)
    drift = lerp(8, -8, ease_in_out(local))
    cx = W // 2

    # Bands of 13 split into 5 mono-text lines.
    lines = [
        [(1, "PRESTIGE"), (2, "MY HOME"), (3, "APARNA")],
        [(4, "VASAVI"), (5, "LODHA"), (6, "PHOENIX")],
        [(7, "RAJAPUSHPA"), (8, "SUMADHURA")],
        [(9, "SMR"), (10, "MODI"), (11, "ADITYA")],
        [(12, "SRI ADITYA"), (13, "RAMKY")],
    ]
    line_strs = [
        "  ·  ".join(f"#{r:02d} {n}" for r, n in row) for row in lines
    ]

    # Reveal lines progressively from 0.20 → 0.60 of the scene.
    def line_op(i: int) -> float:
        start = 0.20 + i * 0.06
        end = start + 0.18
        return max(0.0, min(1.0, (local - start) / (end - start)))

    headline_op = max(0.0, min(1.0, (local - 0.08) / 0.20))

    eyebrow_y       = 400
    eyebrow_rule_y  = 432
    headline_y      = 640
    headline_sub_y  = 740
    rule_y          = 820
    list_top_y      = 920
    list_step       = 70
    footer_y        = H - BAR_H - 100

    list_svg = []
    for i, s in enumerate(line_strs):
        ly = list_top_y + i * list_step + drift
        op_line = line_op(i)
        list_svg.append(
            f'<text x="{cx}" y="{ly:.0f}" '
            f'font-family="{FONT_MONO}" font-size="32" font-weight="700" '
            f'fill="{PAPER}" text-anchor="middle" letter-spacing="0.10em" '
            f'opacity="{op_line:.3f}">{s}</text>'
        )

    return f"""
      <g opacity="{op:.3f}">
        <text x="{cx}" y="{eyebrow_y + drift:.0f}"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              fill="{MINT}" text-anchor="middle" letter-spacing="0.34em">
          {beat.text2}
        </text>
        <line x1="{cx - 60}" y1="{eyebrow_rule_y + drift:.0f}"
              x2="{cx + 60}" y2="{eyebrow_rule_y + drift:.0f}"
              stroke="{MINT}" stroke-width="1.5"/>

        <g opacity="{headline_op:.3f}">
          <text x="{cx}" y="{headline_y + drift:.0f}"
                font-family="{FONT_SERIF}" font-size="108" font-weight="700"
                fill="{PAPER}" text-anchor="middle" font-style="italic">
            {beat.text}
          </text>
          <text x="{cx}" y="{headline_sub_y + drift:.0f}"
                font-family="{FONT_MONO}" font-size="22" font-weight="700"
                fill="{MINT_2}" text-anchor="middle" letter-spacing="0.26em">
            EP01  +  EP02  ·  COMPLETE
          </text>
        </g>

        <line x1="{cx - 50}" y1="{rule_y + drift:.0f}"
              x2="{cx + 50}" y2="{rule_y + drift:.0f}"
              stroke="{MINT}" stroke-width="2" opacity="0.6"/>

        {''.join(list_svg)}

        <text x="{cx}" y="{footer_y + drift:.0f}"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              fill="{MINT}" text-anchor="middle" letter-spacing="0.28em">
          @brandmint.studios
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
    elif beat.kind == "intro_title":
        content = render_intro_title(beat, local, scale)
    elif beat.kind == "intro_setup":
        content = render_intro_setup(beat, local, scale)
    elif beat.kind == "empire":
        content = render_empire(beat, local, scale)
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
        if b.kind in ("intro_title", "empire", "closer"):
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
        cmd += ["-i", str(OUT / "_audio_ep02.wav")]

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
    print(f"\nEP02 · Hyderabad Empires · Heritage Five · BPM={BPM}")
    print(f"  total: {TOTAL_SECONDS:.1f}s · {TOTAL_FRAMES} frames")

    render_all_frames()

    audio_wav = OUT / "_audio_ep02.wav"
    print("  synthesising audio ...")
    synth_audio(audio_wav)

    scored = OUT / f"hyderabad-empires-ep02-{BPM}bpm.mp4"
    silent = OUT / f"hyderabad-empires-ep02-{BPM}bpm-silent.mp4"

    mux_video(scored, with_audio=True)
    mux_video(silent, with_audio=False)

    print(f"\n  ✓ {scored.relative_to(HERE.parent.parent)}")
    print(f"  ✓ {silent.relative_to(HERE.parent.parent)}")
    print()

if __name__ == "__main__":
    main()
