"""
BrandMint Studios — v17 MASTER REEL · the launch reel · ~15s @ 60fps.

The 1st master video. The studio's debut announcement on @brandmint.studios.
Built on v16's motion engine but with new content + tighter pacing per
the CEO Reels Bible (15-25s editorial tier).

Content arc:
  1. GLITCH OPEN     Brand Mint mark stamps in with RGB-split + scan lines
  2. HOOK            "Most agencies sell logos."
  3. TWIST           "We engineer positions." (with mask-wipe + underline)
  4. PROOF           "Hyderabad's Empires · EP01-04 streaming."
  5. PILLAR          Brand Mint mark draws + wordmark cascades + tagline
  6. CTA             "Comment 'BUILT' for a free brand audit."

Motion vocabulary (per CEO Bible §1):
  - Glitch / data-burst (open)
  - Mask reveal / text wipe (hook + twist)
  - Whip-pan (between hook and twist)
  - Match cut (proof → pillar via mark glow)
  - Mint pillar slide-up (pillar)
  - Strobe flash on beat (cta entry)
  - Underline draw (twist + cta)

Run: python3 build_master.py
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
BPM = int(os.environ.get("BPM", "120"))
BEAT_SEC = 60.0 / BPM
def beats(n: float) -> float: return n * BEAT_SEC

# ----- palette ------------------------------------------------------------

WHITE = "#FFFFFF"
BLACK = "#0D0D0D"
INK_2 = "#10171a"
MINT = "#10B981"
MINT_2 = "#7CF6C8"
MINT_DEEP = "#047857"
YELLOW = "#FFD60A"
PAPER = "#F5F1EA"

FONT_DISPLAY = "Plus Jakarta Sans, system-ui, sans-serif"
FONT_SERIF = "Plus Jakarta Sans, system-ui, sans-serif"
FONT_MONO = "JetBrains Mono, ui-monospace, monospace"
_DEJAVU_BOLD = "/usr/local/share/fonts/brandmint/PlusJakartaSans-ExtraBold.ttf"
_DEJAVU_SERIF_BOLD = "/usr/local/share/fonts/brandmint/PlusJakartaSans-SemiBoldItalic.ttf"
_DEJAVU_MONO = "/usr/local/share/fonts/brandmint/JetBrainsMono-Bold.ttf"

HERE = Path(__file__).parent
FRAMES = HERE / "frames"
OUT = HERE / "out"
FRAMES.mkdir(exist_ok=True)
OUT.mkdir(exist_ok=True)

SAFE_TEXT_W = 920

# Canonical M-monogram — loaded once at module init
_LOGO_SVG_PATH = Path(__file__).resolve().parent.parent.parent / "logo" / "brand-mint-monogram.svg"
_LOGO_SVG_SRC = _LOGO_SVG_PATH.read_text() if _LOGO_SVG_PATH.exists() else None

# ----- fonts --------------------------------------------------------------

_font_cache: dict = {}
def _font(pt: int, kind: str = "bold"):
    key = (pt, kind)
    if key not in _font_cache:
        path = {"bold": _DEJAVU_BOLD, "serif": _DEJAVU_SERIF_BOLD,
                "mono": _DEJAVU_MONO}[kind]
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

def ease_in_out(t: float) -> float:
    t = clamp01(t)
    return 0.5 - 0.5 * math.cos(math.pi * t)

def smoothstep(edge0: float, edge1: float, x: float) -> float:
    t = clamp01((x - edge0) / (edge1 - edge0)) if edge1 > edge0 else 0.0
    return t * t * (3 - 2 * t)

def back_out(t: float) -> float:
    t = clamp01(t)
    s = 1.70158
    return 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2

# ----- beats + shots ------------------------------------------------------

@dataclass
class Shot:
    zoom_start: float = 1.00
    zoom_end: float = 1.04
    focal_x: float = 0.5
    focal_y: float = 0.5
    enter: str = "fade"
    exit: str = "fade"
    shake: float = 0.0

@dataclass
class Beat:
    kind: str
    duration: float
    top: str = ""
    big: str = ""
    sub: str = ""
    shot: Shot = field(default_factory=Shot)

# ~15s total. CEO Bible §2: 15s is the sweet spot for "viral edge of editorial".
BEATS: List[Beat] = [
    # 0:00-0:01.0  GLITCH OPEN
    Beat(kind="glitch_open", duration=beats(2.0),
         shot=Shot(zoom_start=0.92, zoom_end=1.08, enter="glitch",
                   exit="whip_left", shake=10)),

    # 0:01-0:03.5  HOOK — Most agencies sell logos.
    Beat(kind="hook", duration=beats(5.0),
         top="MOST AGENCIES",
         big="SELL LOGOS.",
         shot=Shot(zoom_start=1.02, zoom_end=1.06, enter="whip_right",
                   exit="whip_left", shake=4)),

    # 0:03.5-0:06  TWIST — We engineer positions.
    Beat(kind="twist", duration=beats(5.0),
         top="WE ENGINEER",
         big="POSITIONS.",
         sub="that compound.",
         shot=Shot(zoom_start=1.00, zoom_end=1.05, enter="whip_right",
                   exit="match")),

    # 0:06-0:09  PROOF — Hyderabad's Empires teaser
    Beat(kind="proof", duration=beats(6.0),
         top="HYDERABAD'S EMPIRES",
         big="EP01 — 04",
         sub="streaming now.",
         shot=Shot(zoom_start=1.00, zoom_end=1.06, enter="fade",
                   exit="match")),

    # 0:09-0:12  BRAND PILLAR — mark + wordmark + tagline
    Beat(kind="brand", duration=beats(6.0),
         big="BRAND MINT",
         sub="Hyderabad's editorial studio for brands that compound.",
         shot=Shot(zoom_start=0.92, zoom_end=1.00, enter="match",
                   exit="fade", shake=4)),

    # 0:12-0:15  CTA
    Beat(kind="cta", duration=beats(6.0),
         top="STARTING A BRAND?",
         big='COMMENT "BUILT"',
         sub="We'll DM a 48-hour audit.",
         shot=Shot(zoom_start=1.00, zoom_end=1.05, enter="drop",
                   exit="fade")),
]

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

# ===== MOTION GRAPHIC PRIMITIVES ==========================================

def text_at(text: str, x: float, y: float, pt: int, fill: str = WHITE,
            anchor: str = "middle", weight: int = 900,
            letter_spacing: str = "-0.02em",
            kind_font: str = FONT_DISPLAY,
            font_style: str = "normal",
            opacity: float = 1.0) -> str:
    return (
        f'<text x="{x:.1f}" y="{y:.1f}" font-family="{kind_font}" '
        f'font-size="{pt}" font-weight="{weight}" fill="{fill}" '
        f'text-anchor="{anchor}" letter-spacing="{letter_spacing}" '
        f'font-style="{font_style}" opacity="{opacity:.3f}">'
        f"{esc(text)}</text>"
    )

def mask_wipe_text(text: str, x: float, y: float, pt: int,
                   wipe_t: float, mask_id: str, fill: str = WHITE,
                   **kwargs) -> str:
    wipe_t = clamp01(wipe_t)
    w_now = int(W * wipe_t)
    return f"""
      <defs>
        <clipPath id="{mask_id}">
          <rect x="0" y="0" width="{w_now}" height="{H}"/>
        </clipPath>
      </defs>
      <g clip-path="url(#{mask_id})">
        {text_at(text, x, y, pt, fill=fill, **kwargs)}
      </g>
    """

def draw_mark(cx: float, cy: float, scale: float, draw_t: float,
              opacity: float, glow: float = 0.0) -> str:
    """Canonical Brand Mint M-monogram — embeds the source SVG file."""
    size = int(320 * scale)
    if size <= 4 or _LOGO_SVG_SRC is None:
        return ""
    path_len = 85
    dash_offset = path_len * (1 - clamp01(draw_t))
    op = clamp01(opacity)

    uniq = f"{int(scale * 10000)}-{int(draw_t * 10000)}"
    svg = _LOGO_SVG_SRC
    svg = svg.replace('id="bmGrad"', f'id="bmGrad-{uniq}"')
    svg = svg.replace('url(#bmGrad)', f'url(#bmGrad-{uniq})')
    svg = svg.replace(
        'stroke-linejoin="round" fill="none"',
        f'stroke-linejoin="round" fill="none" '
        f'stroke-dasharray="{path_len}" stroke-dashoffset="{dash_offset:.2f}"'
    )
    svg = svg.replace('width="64" height="64"',
                      f'width="{size}" height="{size}"')
    if svg.startswith("<?xml"):
        svg = svg.split("?>", 1)[1].lstrip()

    glow_layer = ""
    if glow > 0:
        glow_r = int(180 * glow)
        glow_layer = (
            f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{glow_r}" '
            f'fill="{MINT_2}" opacity="{0.30 * glow:.3f}" '
            f'filter="blur(40)"/>'
        )

    return f"""
      {glow_layer}
      <g transform="translate({cx - size/2:.1f} {cy - size/2:.1f})"
         opacity="{op:.3f}">
        {svg}
      </g>
    """

def lens_flare(cx: float, cy: float, intensity: float,
               color: str = MINT_2) -> str:
    intensity = clamp01(intensity)
    if intensity < 0.01:
        return ""
    r = int(320 * intensity)
    fid = f"flare-{int(cx)}-{int(cy)}-{int(intensity * 1000)}"
    return f"""
      <defs>
        <radialGradient id="{fid}" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stop-color="{color}" stop-opacity="{0.60 * intensity:.3f}"/>
          <stop offset="40%" stop-color="{color}" stop-opacity="{0.22 * intensity:.3f}"/>
          <stop offset="100%" stop-color="{color}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r}"
              fill="url(#{fid})"/>
    """

def scan_lines(intensity: float = 0.4, seed: int = 0) -> str:
    intensity = clamp01(intensity)
    if intensity < 0.01:
        return ""
    rng = np.random.default_rng(seed + int(intensity * 1000))
    lines = []
    for _ in range(int(40 * intensity)):
        y = rng.uniform(0, H)
        h = rng.uniform(1, 4)
        op = rng.uniform(0.15, 0.55) * intensity
        col = rng.choice([WHITE, MINT_2, MINT])
        lines.append(
            f'<rect x="0" y="{y:.0f}" width="{W}" height="{h:.0f}" '
            f'fill="{col}" opacity="{op:.2f}"/>'
        )
    return "".join(lines)

def rgb_split(text: str, x: float, y: float, pt: int,
              offset: float, **kwargs) -> str:
    if offset <= 0.5:
        return text_at(text, x, y, pt, **kwargs)
    fill = kwargs.get("fill", WHITE)
    op = kwargs.get("opacity", 1.0)
    other = {k: v for k, v in kwargs.items() if k not in ("fill", "opacity")}
    return f"""
      {text_at(text, x - offset, y, pt, fill='#FF3344', opacity=0.85, **other)}
      {text_at(text, x + offset, y, pt, fill='#33CCFF', opacity=0.85, **other)}
      {text_at(text, x, y, pt, fill=fill, opacity=op, **other)}
    """

def particle_field(t_sec: float, alpha: float = 0.30,
                   density: int = 22, speed_mult: float = 1.0) -> str:
    if alpha <= 0:
        return ""
    out = ['<g opacity="{:.3f}">'.format(alpha)]
    rng = np.random.default_rng(42)
    for i in range(density):
        bx = rng.uniform(40, W - 40)
        by_base = rng.uniform(0, H)
        r = rng.uniform(2.0, 6.5)
        speed = rng.uniform(8, 22) * speed_mult
        phase = rng.uniform(0, math.pi * 2)
        by = (by_base - (t_sec * speed)) % (H + 200) - 100
        bx_off = math.sin(t_sec * 0.8 + phase) * 14
        op = 0.3 + 0.7 * (0.5 + 0.5 * math.sin(t_sec * 1.4 + phase))
        out.append(
            f'<circle cx="{bx + bx_off:.1f}" cy="{by:.1f}" r="{r:.1f}" '
            f'fill="{MINT}" opacity="{op:.2f}"/>'
        )
    out.append('</g>')
    return "".join(out)

def parallax_lattice(t_sec: float, depth: int = 0, alpha: float = 0.12) -> str:
    if alpha <= 0:
        return ""
    spacing = [96, 64, 40][depth]
    speed_x = [3, 6, 11][depth]
    speed_y = [2, 4, 8][depth]
    radius = [3.5, 2.2, 1.4][depth]

    out = ['<g opacity="{:.3f}">'.format(alpha)]
    sx = (t_sec * speed_x) % spacing
    sy = (t_sec * speed_y) % spacing
    for ix in range(-1, W // spacing + 2):
        for iy in range(-1, H // spacing + 2):
            x = ix * spacing + sx
            y = iy * spacing + sy
            out.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{radius}" '
                       f'fill="{MINT}"/>')
    out.append('</g>')
    return "".join(out)

def animated_underline(cx: float, y: float, full_w: int, t: float,
                       color: str = MINT) -> str:
    drawn_w = full_w * ease_out_cubic(clamp01(t))
    if drawn_w <= 1:
        return ""
    x0 = cx - drawn_w / 2
    x1 = cx + drawn_w / 2
    return (
        f'<line x1="{x0:.1f}" y1="{y:.1f}" x2="{x1:.1f}" y2="{y:.1f}" '
        f'stroke="{color}" stroke-width="6" stroke-linecap="round"/>'
    )

def strobe_flash(intensity: float = 1.0) -> str:
    """1-frame full-bleed white flash for strobe transition (Bible §1)."""
    intensity = clamp01(intensity)
    if intensity < 0.01:
        return ""
    return (
        f'<rect width="{W}" height="{H}" fill="{WHITE}" '
        f'opacity="{intensity:.3f}"/>'
    )

# ===== TRANSITION ENGINE =================================================

def transition_offset(beat: Beat, local: float) -> dict:
    in_t = 0.10
    out_t = 0.10
    out_alpha = 1.0
    out_tx, out_ty = 0.0, 0.0
    out_sx, out_sy = 1.0, 1.0

    shot = beat.shot
    zoom = lerp(shot.zoom_start, shot.zoom_end, ease_in_out(local))

    if local < in_t:
        e_t = local / in_t
        if shot.enter == "whip_right":
            out_tx = lerp(W * 0.8, 0, ease_out_quint(e_t))
            out_sx = lerp(1.6, 1.0, ease_out_quint(e_t))
            out_alpha = ease_out_cubic(e_t)
        elif shot.enter == "whip_left":
            out_tx = lerp(-W * 0.8, 0, ease_out_quint(e_t))
            out_sx = lerp(1.6, 1.0, ease_out_quint(e_t))
            out_alpha = ease_out_cubic(e_t)
        elif shot.enter == "drop":
            out_ty = lerp(-80, 0, ease_out_quint(e_t))
            out_alpha = ease_out_cubic(e_t)
        elif shot.enter == "scale":
            s = lerp(0.7, 1.0, back_out(e_t))
            out_sx = s; out_sy = s
            out_alpha = ease_out_cubic(e_t)
        elif shot.enter == "glitch":
            flicker = 0.5 + 0.5 * (1 if random.random() > 0.4 else 0)
            out_alpha = ease_out_cubic(e_t) * flicker
        elif shot.enter == "match":
            out_alpha = e_t
        else:
            out_alpha = ease_out_cubic(e_t)

    if local > 1 - out_t:
        e_t = (local - (1 - out_t)) / out_t
        if shot.exit == "whip_right":
            out_tx = lerp(0, W * 0.7, ease_in_cubic(e_t))
            out_sx = lerp(1.0, 1.5, ease_in_cubic(e_t))
            out_alpha = 1 - ease_in_cubic(e_t)
        elif shot.exit == "whip_left":
            out_tx = lerp(0, -W * 0.7, ease_in_cubic(e_t))
            out_sx = lerp(1.0, 1.5, ease_in_cubic(e_t))
            out_alpha = 1 - ease_in_cubic(e_t)
        elif shot.exit == "match":
            out_alpha = 1 - ease_in_cubic(e_t)
        else:
            out_alpha = 1 - ease_in_cubic(e_t)

    shake_x = shake_y = 0.0
    if shot.shake > 0:
        shake_window = 1.0 - abs((local - 0.20) / 0.12)
        if shake_window > 0:
            shake_x = (random.random() - 0.5) * shot.shake * shake_window
            shake_y = (random.random() - 0.5) * shot.shake * shake_window

    fx = shot.focal_x * W
    fy = shot.focal_y * H

    return {
        "tx": out_tx + shake_x,
        "ty": out_ty + shake_y,
        "sx": out_sx * zoom,
        "sy": out_sy * zoom,
        "fx": fx, "fy": fy,
        "alpha": out_alpha,
    }

def camera_g_open(tr: dict) -> str:
    return (
        f'<g opacity="{tr["alpha"]:.3f}" '
        f'transform="translate({tr["fx"] + tr["tx"]:.2f} '
        f'{tr["fy"] + tr["ty"]:.2f}) '
        f'scale({tr["sx"]:.3f} {tr["sy"]:.3f}) '
        f'translate({-tr["fx"]:.2f} {-tr["fy"]:.2f})">'
    )

# ===== SCENE BUILDERS =====================================================

def build_glitch_open(b: Beat, local: float, t_sec: float) -> str:
    cx, cy = W // 2, H // 2
    if local < 0.5:
        e = local / 0.5
        scale = lerp(0.4, 1.2, back_out(e))
        draw = clamp01(e * 1.5)
        op = ease_out_cubic(e)
        glow = e * 0.7
    else:
        e = (local - 0.5) / 0.5
        scale = 1.2 + 0.18 * e
        draw = 1.0
        op = 1 - ease_in_cubic(e)
        glow = 0.7 * (1 - e)
    glitch_offset = max(0, 10 * (1 - abs(local - 0.18) * 6))

    return f"""
      {scan_lines(intensity=max(0, 0.7 - local * 2), seed=int(t_sec * 60))}
      {draw_mark(cx, cy, scale=scale, draw_t=draw, opacity=op, glow=glow)}

      <g opacity="{op:.3f}">
        {rgb_split('BRAND', cx, cy + 300, 72, offset=glitch_offset,
                   anchor='middle', weight=900, letter_spacing='0.30em',
                   fill=WHITE)}
        {rgb_split('MINT', cx, cy + 390, 72, offset=glitch_offset,
                   anchor='middle', weight=900, letter_spacing='0.30em',
                   fill=MINT_2)}
      </g>
    """

def build_hook(b: Beat, local: float, t_sec: float) -> str:
    """0:01-0:03.5 — MOST AGENCIES / SELL LOGOS."""
    cx = W // 2
    top_pt = fit_to_width(b.top, SAFE_TEXT_W, 96, floor_pt=64)
    big_pt = fit_to_width(b.big, SAFE_TEXT_W, 188, floor_pt=120)

    top_t = smoothstep(0.05, 0.25, local)
    big_wipe_t = smoothstep(0.20, 0.50, local)
    out_alpha = 1 if local < 0.88 else max(0, 1 - (local - 0.88) / 0.12)
    flare = max(0, 1 - abs(local - 0.45) * 6)

    return f"""
      {parallax_lattice(t_sec, depth=0, alpha=0.10)}
      {particle_field(t_sec, alpha=0.28, density=18)}
      {lens_flare(cx, int(H * 0.55), flare * 0.6, color=YELLOW)}

      <g opacity="{out_alpha:.3f}">
        {text_at(b.top, cx, int(H * 0.32), top_pt, WHITE,
                 letter_spacing='0.04em', weight=700, opacity=top_t)}

        {mask_wipe_text(b.big, cx, int(H * 0.55), big_pt,
                        wipe_t=big_wipe_t, mask_id='mw-hook',
                        fill=YELLOW, letter_spacing='-0.03em', weight=900)}
      </g>
    """

def build_twist(b: Beat, local: float, t_sec: float) -> str:
    """0:03.5-0:06 — WE ENGINEER / POSITIONS. / that compound."""
    cx = W // 2
    top_pt = fit_to_width(b.top, SAFE_TEXT_W, 96, floor_pt=64)
    big_pt = fit_to_width(b.big, SAFE_TEXT_W, 196, floor_pt=128)
    sub_pt = fit_to_width(b.sub, SAFE_TEXT_W, 64, floor_pt=44, kind="serif")

    top_t = smoothstep(0.05, 0.22, local)
    big_wipe_t = smoothstep(0.18, 0.45, local)
    sub_alpha = smoothstep(0.40, 0.58, local)
    under_t = smoothstep(0.40, 0.65, local)
    flare = max(0, 1 - abs(local - 0.35) * 5)
    out_alpha = 1 if local < 0.88 else max(0, 1 - (local - 0.88) / 0.12)

    return f"""
      {parallax_lattice(t_sec, depth=1, alpha=0.10)}
      {particle_field(t_sec, alpha=0.30, density=20, speed_mult=1.3)}
      {lens_flare(cx, int(H * 0.50), flare * 0.7)}

      <g opacity="{out_alpha:.3f}">
        {text_at(b.top, cx, int(H * 0.30), top_pt, WHITE,
                 letter_spacing='0.04em', weight=700, opacity=top_t)}

        {mask_wipe_text(b.big, cx, int(H * 0.50), big_pt,
                        wipe_t=big_wipe_t, mask_id='mw-twist',
                        fill=MINT_2, letter_spacing='-0.03em', weight=900)}

        {animated_underline(cx, int(H * 0.54), full_w=720, t=under_t)}

        <text x="{cx}" y="{int(H * 0.66)}" font-family="{FONT_SERIF}"
              font-size="{sub_pt}" font-weight="700" fill="{WHITE}"
              text-anchor="middle" font-style="italic"
              opacity="{sub_alpha:.3f}">
          {esc(b.sub)}
        </text>
      </g>
    """

def build_proof(b: Beat, local: float, t_sec: float) -> str:
    """0:06-0:09 — HYDERABAD'S EMPIRES / EP01-04 / streaming now."""
    cx = W // 2
    top_pt = fit_to_width(b.top, SAFE_TEXT_W, 56, floor_pt=42)
    big_pt = fit_to_width(b.big, SAFE_TEXT_W, 196, floor_pt=128)
    sub_pt = fit_to_width(b.sub, SAFE_TEXT_W, 52, floor_pt=36, kind="serif")

    top_t = smoothstep(0.05, 0.20, local)
    big_a = smoothstep(0.18, 0.38, local)
    sub_a = smoothstep(0.38, 0.55, local)
    flare = max(0, 1 - abs(local - 0.30) * 5)
    # match-cut prep: glow ramps up in last 12% so brand beat picks it up
    glow_out = 0.0
    if local > 0.85:
        glow_out = (local - 0.85) / 0.15

    return f"""
      {parallax_lattice(t_sec, depth=0, alpha=0.18)}
      {parallax_lattice(t_sec, depth=2, alpha=0.10)}
      {lens_flare(cx, int(H * 0.50), flare * 0.5)}
      {lens_flare(cx, int(H * 0.50), glow_out)}

      {text_at(b.top, cx, int(H * 0.28), top_pt, MINT_2,
               letter_spacing='0.30em', weight=700, opacity=top_t)}

      {text_at(b.big, cx, int(H * 0.50), big_pt, WHITE,
               letter_spacing='-0.02em', weight=900,
               opacity=big_a * (1 - glow_out))}

      <text x="{cx}" y="{int(H * 0.66)}" font-family="{FONT_SERIF}"
            font-size="{sub_pt}" font-weight="700" fill="{WHITE}"
            text-anchor="middle" font-style="italic"
            opacity="{sub_a:.3f}">
        {esc(b.sub)}
      </text>

      <text x="{cx}" y="{int(H * 0.84)}" font-family="{FONT_MONO}"
            font-size="20" font-weight="700" fill="{MINT}"
            text-anchor="middle" letter-spacing='0.30em'
            opacity="{sub_a * 0.75:.3f}">
        — THE BUILDER COUNTDOWN
      </text>
    """

def build_brand(b: Beat, local: float, t_sec: float) -> str:
    """0:09-0:12 — Mark draws + BRAND MINT cascades."""
    cx = W // 2

    mark_in_t = smoothstep(0.0, 0.28, local)
    mark_scale = lerp(0.08, 0.85, back_out(mark_in_t))
    mark_draw_t = smoothstep(0.18, 0.42, local)
    mark_glow = max(0, 1 - abs(local - 0.18) * 4)

    pillar_t = smoothstep(0.25, 0.50, local)
    pillar_top = lerp(H + 200, 600, ease_out_cubic(pillar_t))

    word_a = smoothstep(0.48, 0.62, local)
    word_drift = lerp(16, 0, ease_out_cubic(word_a))
    sub_a = smoothstep(0.58, 0.74, local)
    url_a = smoothstep(0.68, 0.84, local)

    if local > 0.90:
        out = ease_in_cubic((local - 0.90) / 0.10)
        word_a *= (1 - out)
        sub_a *= (1 - out)
        url_a *= (1 - out)

    big_pt = fit_to_width(b.big, SAFE_TEXT_W, 152, floor_pt=110)

    return f"""
      <rect x="0" y="{pillar_top:.2f}" width="{W}" height="900"
            fill="{MINT}"/>

      {draw_mark(cx, max(960, pillar_top + 180), scale=mark_scale,
                 draw_t=mark_draw_t, opacity=mark_in_t, glow=mark_glow)}

      <g transform="translate(0 {pillar_top - 600 + word_drift:.2f})">
        {text_at(b.big, cx, 1110, big_pt, INK_2,
                 letter_spacing='-0.025em', weight=900, opacity=word_a)}

        <text x="{cx}" y="1230"
              font-family="{FONT_SERIF}" font-size="34" font-weight="700"
              fill="{INK_2}" text-anchor="middle" font-style="italic"
              opacity="{sub_a:.3f}">
          {esc(b.sub)}
        </text>

        <text x="{cx}" y="1370"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              letter-spacing='0.30em' fill="{INK_2}" text-anchor="middle"
              opacity="{0.78 * url_a:.3f}">
          BRANDMINTSTUDIOS.IN
        </text>
      </g>
    """

def build_cta(b: Beat, local: float, t_sec: float) -> str:
    """0:12-0:15 — Strobe flash → CTA bar slides up."""
    cx = W // 2
    bar_t = clamp01(local / 0.22)
    bar_top = lerp(H, 1450, ease_out_cubic(bar_t))

    body_t = smoothstep(0.08, 0.30, local)
    body_drift = lerp(20, 0, ease_out_cubic(body_t))
    pulse = 1.0 + 0.04 * (0.5 + 0.5 * math.sin(local * 2 * math.pi * 1.6))

    top_pt = fit_to_width(b.top, SAFE_TEXT_W, 60, floor_pt=44)
    big_pt = int(fit_to_width(b.big, SAFE_TEXT_W, 132, floor_pt=84) * pulse)
    sub_pt = fit_to_width(b.sub, SAFE_TEXT_W, 56, floor_pt=40, kind="serif")
    sub_alpha = smoothstep(0.35, 0.55, local)
    under_t = smoothstep(0.40, 0.65, local)
    flare = max(0, 1 - abs(local - 0.40) * 5) * 0.6

    return f"""
      {particle_field(t_sec, alpha=0.20, density=18)}
      {lens_flare(cx, int(H * 0.46), flare)}

      <g opacity="{body_t:.3f}" transform="translate(0 {body_drift:.2f})">
        {text_at(b.top, cx, int(H * 0.28), top_pt, WHITE,
                 letter_spacing='0.06em', weight=800)}

        {text_at(b.big, cx, int(H * 0.46), big_pt, MINT_2,
                 letter_spacing='-0.02em', weight=900)}

        {animated_underline(cx, int(H * 0.49), full_w=720, t=under_t)}
      </g>

      <text x="{cx}" y="{int(H * 0.60)}" font-family="{FONT_SERIF}"
            font-size="{sub_pt}" font-weight="700" fill="{WHITE}"
            text-anchor="middle" font-style="italic"
            opacity="{sub_alpha:.3f}">
        {esc(b.sub)}
      </text>

      <rect x="0" y="{bar_top:.2f}" width="{W}" height="280"
            fill="{MINT}"/>

      <g transform="translate(0 {bar_top - 1450:.2f})">
        {draw_mark(180, 1590, scale=0.25, draw_t=1.0, opacity=body_t)}

        <text x="{int(W * 0.42)}" y="1605"
              font-family="{FONT_DISPLAY}" font-size="48" font-weight="900"
              fill="{INK_2}" text-anchor="start" letter-spacing='-0.01em'>
          @brandmint.studios
        </text>
        <text x="{int(W * 0.42)}" y="1665"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              fill="{INK_2}" text-anchor="start" letter-spacing='0.28em'
              opacity="0.78">
          BRANDMINTSTUDIOS.IN
        </text>
      </g>
    """

# ----- compose ------------------------------------------------------------

def compose_svg(t_sec: float) -> str:
    _, local, b, _ = beat_at(t_sec)
    tr = transition_offset(b, local)

    if b.kind == "glitch_open":
        body = build_glitch_open(b, local, t_sec)
    elif b.kind == "hook":
        body = build_hook(b, local, t_sec)
    elif b.kind == "twist":
        body = build_twist(b, local, t_sec)
    elif b.kind == "proof":
        body = build_proof(b, local, t_sec)
    elif b.kind == "brand":
        body = build_brand(b, local, t_sec)
    elif b.kind == "cta":
        body = build_cta(b, local, t_sec)
    else:
        body = ""

    bg = f'<rect width="{W}" height="{H}" fill="{BLACK}"/>'

    # Edge scan lines for cut feel + strobe flash before CTA (Bible §1)
    overlay = ""
    if local < 0.04 or local > 0.96:
        edge_t = max(0, 1 - abs(local - (0 if local < 0.5 else 1)) * 24)
        overlay = scan_lines(intensity=0.5 * edge_t, seed=int(t_sec * 60))

    # Strobe flash at the very start of the CTA beat (Bible §1 — Strobe Flash)
    if b.kind == "cta" and local < 0.04:
        overlay += strobe_flash(intensity=0.9 * (1 - local / 0.04))

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"
     viewBox="0 0 {W} {H}">
  {bg}
  {camera_g_open(tr)}
    {body}
  </g>
  {overlay}
</svg>
"""

# ----- frames -------------------------------------------------------------

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

# ----- audio --------------------------------------------------------------

def synth_audio(out_wav: Path):
    sr = 48000
    n = int(TOTAL_S * sr)
    t = np.arange(n) / sr
    track = np.zeros(n)

    cursor = 0.0
    for bi, b in enumerate(BEATS):
        i = int(cursor * sr)
        dur = int(0.45 * sr)
        if i + dur <= n:
            env = np.exp(-np.linspace(0, 5, dur))
            sub = np.sin(2 * np.pi * 52 * np.arange(dur) / sr)
            noise = np.random.normal(0, 1, dur) * 0.18
            track[i:i + dur] += env * (0.7 * sub + 0.30 * noise)

        if b.shot.exit in ("whip_left", "whip_right", "match"):
            swoosh_start = cursor + b.duration - 0.18
            si = int(swoosh_start * sr)
            sdur = int(0.18 * sr)
            if si >= 0 and si + sdur <= n:
                whoosh = np.random.normal(0, 1, sdur)
                env = np.exp(np.linspace(0, 1.5, sdur)) - 1
                env = env / env.max() * 0.5
                track[si:si + sdur] += whoosh * env * 0.30

        cursor += b.duration

    drone = 0.04 * np.sin(2 * np.pi * 96 * t)
    drone += 0.025 * np.sin(2 * np.pi * 144 * t)
    track += drone

    for tick_t in np.arange(0.1, TOTAL_S, 0.25):
        i = int(tick_t * sr)
        dur = int(0.04 * sr)
        if i + dur <= n:
            env = np.exp(-np.linspace(0, 14, dur))
            track[i:i + dur] += np.random.normal(0, 1, dur) * env * 0.15

    # Bell on brand reveal
    cursor = sum(b.duration for b in BEATS[:4])  # at start of brand beat
    bi = int(cursor * sr)
    bdur = int(1.5 * sr)
    if bi >= 0 and bi + bdur <= n:
        env = np.exp(-np.linspace(0, 3, bdur))
        bell = (np.sin(2 * np.pi * 880 * np.arange(bdur) / sr) +
                0.5 * np.sin(2 * np.pi * 1320 * np.arange(bdur) / sr) +
                0.3 * np.sin(2 * np.pi * 1760 * np.arange(bdur) / sr))
        track[bi:bi + bdur] += env * bell * 0.18

    # Crash cymbal-ish on CTA strobe flash
    cursor = sum(b.duration for b in BEATS[:5])
    ci = int(cursor * sr)
    cdur = int(0.8 * sr)
    if ci >= 0 and ci + cdur <= n:
        env = np.exp(-np.linspace(0, 4, cdur))
        crash = np.random.normal(0, 1, cdur) * env * 0.35
        track[ci:ci + cdur] += crash

    fade = int(0.6 * sr)
    envm = np.ones(n)
    envm[:fade] = np.linspace(0, 1, fade)
    envm[-fade:] = np.linspace(1, 0, fade)
    track = track * envm

    peak = float(np.max(np.abs(track))) or 1.0
    track = track / peak * 0.78
    pcm = (track * 32767).astype(np.int16)
    with wave.open(str(out_wav), "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(pcm.tobytes())

# ----- mux ----------------------------------------------------------------

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

# ----- main ---------------------------------------------------------------

def main():
    print(f"\nv17 MASTER LAUNCH REEL · {FPS}fps · target {TOTAL_S:.1f}s")
    render_all_frames()
    audio = OUT / "_audio.wav"
    print("  synth audio...")
    synth_audio(audio)
    scored = OUT / f"brandmint-master-{BPM}bpm.mp4"
    silent = OUT / f"brandmint-master-{BPM}bpm-silent.mp4"
    mux(scored, with_audio=True)
    mux(silent, with_audio=False)
    print(f"\n  ✓ {scored.relative_to(HERE.parent.parent)}")
    print(f"  ✓ {silent.relative_to(HERE.parent.parent)}\n")

if __name__ == "__main__":
    main()
