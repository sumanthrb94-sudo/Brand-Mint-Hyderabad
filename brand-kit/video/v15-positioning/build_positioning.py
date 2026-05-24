"""
BrandMint Studios — Positioning Reel (v15)

Marketing+positioning narrative reel. ~19s. Re-uses v14's butter-smooth
motion system (beat_envelope, ease-out-cubic slide-ins, smoothstep
cascades, slide-up reveals) and bolts on extra motion graphics:

  · draw_mark()         — Brand Mint M-monogram draws itself with
                          stroke-dashoffset, scales up, fades in
  · light_sweep()       — gradient overlay travelling L→R across hero
                          text, mimics the bloom moment in higgsfield reels
  · animated_underline() — line that draws itself under emphasis words
  · particle_field()    — subtle dot field drifting upward during pain beats
  · counter_text()      — number that counts up (used on proof beat)
  · lattice_bg()        — animated dot lattice on the define beat

Content beats:
  1. HOOK     "Positioning is the only marketing that compounds."
  2. PAIN     "Ads end. POSITIONS STAY."
  3. PAIN     "Logos fade. POSITIONS SHARPEN."
  4. DEFINE   "A position is the sentence your buyer says about you when
              you're not in the room."
  5. BRAND    Animated mark + "BRAND MINT" + "We engineer positions
              that compound."
  6. CTA      Comment "POSITION" → DM your category gap.

Run:  python3 build_positioning.py
"""

from __future__ import annotations

import math
import os
import shutil
import subprocess
import wave
from dataclasses import dataclass
from pathlib import Path
from typing import List

import cairosvg
import numpy as np
from PIL import ImageFont

# ----- canvas + bpm -------------------------------------------------------

W, H, FPS = 1080, 1920, 30
BPM = int(os.environ.get("BPM", "60"))
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

# Brand Mint typography
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

def ease_in_cubic(t: float) -> float:
    t = clamp01(t)
    return t ** 3

def ease_in_out(t: float) -> float:
    t = clamp01(t)
    return 0.5 - 0.5 * math.cos(math.pi * t)

def smoothstep(edge0: float, edge1: float, x: float) -> float:
    t = clamp01((x - edge0) / (edge1 - edge0)) if edge1 > edge0 else 0.0
    return t * t * (3 - 2 * t)

def beat_envelope(local: float, in_t: float = 0.20,
                  out_t: float = 0.12) -> dict:
    if local < in_t:
        alpha = ease_out_cubic(local / in_t)
        slide_y = lerp(40, 0, ease_out_cubic(local / in_t))
    elif local > 1 - out_t:
        alpha = 1 - ease_in_cubic((local - (1 - out_t)) / out_t)
        slide_y = lerp(0, -20, ease_in_cubic((local - (1 - out_t)) / out_t))
    else:
        alpha = 1.0
        hold_local = (local - in_t) / (1 - in_t - out_t)
        slide_y = 2 * math.sin(hold_local * math.pi * 2)

    punch_t = (local - 0.42) / 0.13
    punch = 1.0 + 0.06 * max(0.0, 1.0 - abs(punch_t)) if -1 <= punch_t <= 1 else 1.0

    return {"alpha": alpha, "slide_y": slide_y, "punch": punch}

# ----- beats --------------------------------------------------------------

@dataclass
class Beat:
    kind: str
    duration: float
    top: str = ""
    big: str = ""
    sub: str = ""
    sub2: str = ""

BEATS: List[Beat] = [
    # 0:00-0:03  HOOK — pattern-interrupt declarative
    Beat(kind="hook", duration=beats(3.0),
         top="POSITIONING IS",
         big="THE ONLY MARKETING",
         sub="THAT COMPOUNDS."),

    # 0:03-0:05.5  PAIN 1
    Beat(kind="pain", duration=beats(2.5),
         top="ADS END.",
         big="POSITIONS STAY.",
         sub="Compound interest, but for trust."),

    # 0:05.5-0:08  PAIN 2
    Beat(kind="pain", duration=beats(2.5),
         top="LOGOS FADE.",
         big="POSITIONS SHARPEN.",
         sub="Every year of clarity adds equity."),

    # 0:08-0:11  DEFINE — the editorial centerpiece
    Beat(kind="define", duration=beats(3.0),
         top="A POSITION IS",
         big="THE SENTENCE",
         sub="your buyer says about you",
         sub2="when you're not in the room."),

    # 0:11-0:14.5  BRAND — animated logo build
    Beat(kind="brand", duration=beats(3.5),
         big="BRAND MINT",
         sub="We engineer positions that compound."),

    # 0:14.5-0:19  CTA
    Beat(kind="cta", duration=beats(4.5),
         top="WANT TO HEAR YOUR POSITION?",
         big='COMMENT "POSITION"',
         sub="We'll DM your category gap."),
]

TOTAL_S = sum(b.duration for b in BEATS)
TOTAL_F = int(round(TOTAL_S * FPS))

def beat_at(t_sec: float):
    cursor = 0.0
    for i, b in enumerate(BEATS):
        if t_sec < cursor + b.duration:
            local = (t_sec - cursor) / b.duration if b.duration > 0 else 1.0
            return i, max(0.0, min(1.0, local)), b
        cursor += b.duration
    return len(BEATS) - 1, 1.0, BEATS[-1]

# ----- text helper --------------------------------------------------------

def text_at(text: str, x: int, y: int, pt: int, fill: str = WHITE,
            anchor: str = "middle", weight: int = 900,
            letter_spacing: str = "-0.02em",
            kind_font: str = FONT_DISPLAY,
            font_style: str = "normal",
            opacity: float = 1.0) -> str:
    return (
        f'<text x="{x}" y="{y}" font-family="{kind_font}" '
        f'font-size="{pt}" font-weight="{weight}" fill="{fill}" '
        f'text-anchor="{anchor}" letter-spacing="{letter_spacing}" '
        f'font-style="{font_style}" opacity="{opacity:.3f}">'
        f"{esc(text)}</text>"
    )

# ===== MOTION GRAPHICS HELPERS ============================================

def draw_mark(cx: int, cy: int, scale: float, draw_t: float,
              opacity: float) -> str:
    """Brand Mint M-monogram. Scales up + the M-path draws itself via
    stroke-dashoffset, mimicking a Canva-style logo build.

    Source mark: 32x32 viewBox with a mint gradient circle and an M
    stroked in dark ink — from /index.html lockup."""
    # Bigger render — base 32px, we render at 320px
    size = int(320 * scale)
    # Approximate path length for the M (in 32-unit viewBox space): ~36
    path_len = 36
    dash_offset = path_len * (1 - clamp01(draw_t))
    op = clamp01(opacity)

    return f"""
      <g transform="translate({cx - size//2} {cy - size//2})"
         opacity="{op:.3f}">
        <svg width="{size}" height="{size}" viewBox="0 0 32 32">
          <defs>
            <linearGradient id="bm-mark-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="{MINT_2}"/>
              <stop offset="100%" stop-color="{MINT}"/>
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="15" fill="url(#bm-mark-grad)"/>
          <path d="M9 22V10l7 6 7-6v12"
                stroke="{INK_2}" stroke-width="2.4"
                stroke-linecap="round" stroke-linejoin="round" fill="none"
                stroke-dasharray="{path_len}"
                stroke-dashoffset="{dash_offset:.2f}"/>
        </svg>
      </g>
    """

def light_sweep(t: float, y_band: int, height: int = 160) -> str:
    """A bright soft gradient that travels left-to-right across `y_band`
    over the lifetime t∈[0,1]. Higgsfield-style bloom moment.

    Returns an SVG <g> with an absolutely-positioned soft glow rectangle.
    Best used during the hold phase of a beat to add 'shimmer' across
    the hero line. Set blend mode via paint-order or simply overlay."""
    if t < 0 or t > 1:
        return ""
    cx = lerp(-300, W + 300, ease_in_out(t))
    op = 0.32 * (1 - abs(t - 0.5) * 2)  # peak at mid-sweep

    return f"""
      <g opacity="{max(0, op):.3f}">
        <defs>
          <radialGradient id="sweep-grad-{int(t * 1000)}" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stop-color="{MINT_2}" stop-opacity="0.85"/>
            <stop offset="60%" stop-color="{MINT}" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="{MINT}" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <ellipse cx="{cx:.0f}" cy="{y_band}"
                 rx="320" ry="{height // 2}"
                 fill="url(#sweep-grad-{int(t * 1000)})"/>
      </g>
    """

def animated_underline(cx: int, y: int, full_w: int, t: float,
                       color: str = MINT) -> str:
    """Underline that draws itself L→R from the centerline, ease-out.
    Used under emphasis words after the parent text has appeared."""
    drawn_w = full_w * ease_out_cubic(clamp01(t))
    if drawn_w <= 1:
        return ""
    x0 = cx - drawn_w / 2
    x1 = cx + drawn_w / 2
    return (
        f'<line x1="{x0:.1f}" y1="{y}" x2="{x1:.1f}" y2="{y}" '
        f'stroke="{color}" stroke-width="6" stroke-linecap="round"/>'
    )

def particle_field(t_sec: float, alpha: float = 0.45) -> str:
    """24 floating mint dots, each on its own drift cycle. Subtle
    parallax-depth — used during pain + define beats."""
    if alpha <= 0:
        return ""
    out = ['<g opacity="{:.3f}">'.format(alpha)]
    rng = np.random.default_rng(42)  # deterministic positions
    for i in range(24):
        bx = rng.uniform(80, W - 80)
        by_base = rng.uniform(200, H - 200)
        r = rng.uniform(2.5, 6.0)
        speed = rng.uniform(8, 18)
        phase = rng.uniform(0, math.pi * 2)
        # drift upward + side-sway
        by = (by_base - (t_sec * speed)) % (H - 200) + 100
        bx_off = math.sin(t_sec * 0.8 + phase) * 12
        op = 0.4 + 0.6 * (0.5 + 0.5 * math.sin(t_sec * 1.2 + phase))
        out.append(
            f'<circle cx="{bx + bx_off:.1f}" cy="{by:.1f}" r="{r:.1f}" '
            f'fill="{MINT}" opacity="{op:.2f}"/>'
        )
    out.append('</g>')
    return "".join(out)

def lattice_bg(t_sec: float, alpha: float = 0.18) -> str:
    """Slowly-shifting dot lattice. Used on the define beat to suggest
    a thinking-grid behind the editorial centerpiece."""
    if alpha <= 0:
        return ""
    out = ['<g opacity="{:.3f}">'.format(alpha)]
    spacing = 64
    shift_x = (t_sec * 6) % spacing
    shift_y = (t_sec * 3) % spacing
    for ix in range(-1, W // spacing + 2):
        for iy in range(-1, H // spacing + 2):
            x = ix * spacing + shift_x
            y = iy * spacing + shift_y
            r = 1.5 + 0.5 * math.sin(t_sec * 1.2 + ix * 0.5 + iy * 0.3)
            out.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r:.1f}" '
                       f'fill="{MINT}"/>')
    out.append('</g>')
    return "".join(out)

# ===== SCENE RENDERERS ====================================================

def render_hook(b: Beat, local: float, t_sec: float) -> str:
    env = beat_envelope(local, in_t=0.22, out_t=0.10)
    cx = W // 2
    top_pt = fit_to_width(b.top,  SAFE_TEXT_W, 72, floor_pt=48)
    big_pt = int(fit_to_width(b.big, SAFE_TEXT_W, 120, floor_pt=72) * env["punch"])
    sub_pt = fit_to_width(b.sub,  SAFE_TEXT_W, 120, floor_pt=72)
    sub_alpha = smoothstep(0.28, 0.48, local) * env["alpha"]
    # Light sweep over hero band during hold (local 0.30..0.85)
    sweep_t = smoothstep(0.30, 0.85, local)

    # Animated underline under "COMPOUNDS." (the sub line)
    under_t = smoothstep(0.55, 0.85, local)

    return f"""
      {particle_field(t_sec, alpha=0.35)}
      {light_sweep(sweep_t, y_band=int(H * 0.50), height=240)}

      <g opacity="{env['alpha']:.3f}" transform="translate(0 {env['slide_y']:.2f})">
        {text_at(b.top, cx, int(H * 0.30), top_pt, WHITE,
                 letter_spacing="0.04em", weight=700)}

        {text_at(b.big, cx, int(H * 0.46), big_pt, MINT_2,
                 letter_spacing="-0.025em", weight=900)}
      </g>

      <g opacity="{sub_alpha:.3f}">
        {text_at(b.sub, cx, int(H * 0.62), sub_pt, WHITE,
                 letter_spacing="-0.02em", weight=900)}
        {animated_underline(cx, int(H * 0.66) + 24, full_w=720, t=under_t)}
      </g>

      <text x="{cx}" y="{int(H * 0.92)}" font-family="{FONT_MONO}"
            font-size="22" font-weight="700" fill="{WHITE}"
            text-anchor="middle" letter-spacing="0.30em"
            opacity="{0.70 * env['alpha']:.3f}">
        AGENCY MANIFESTO
      </text>
    """

def render_pain(b: Beat, local: float, t_sec: float) -> str:
    env = beat_envelope(local, in_t=0.22, out_t=0.16)
    cx = W // 2
    top_pt = fit_to_width(b.top, SAFE_TEXT_W, 88, floor_pt=56)
    big_pt = int(fit_to_width(b.big, SAFE_TEXT_W, 168, floor_pt=96) * env["punch"])
    sub_pt = fit_to_width(b.sub, SAFE_TEXT_W, 52, floor_pt=36, kind="serif")
    sub_alpha = smoothstep(0.30, 0.50, local) * env["alpha"]
    under_t = smoothstep(0.50, 0.85, local)

    return f"""
      {particle_field(t_sec, alpha=0.28)}

      <g opacity="{env['alpha']:.3f}" transform="translate(0 {env['slide_y']:.2f})">
        {text_at(b.top, cx, int(H * 0.32), top_pt, WHITE,
                 letter_spacing="0.04em", weight=700)}

        {text_at(b.big, cx, int(H * 0.52), big_pt, MINT_2,
                 letter_spacing="-0.025em", weight=900)}

        {animated_underline(cx, int(H * 0.55), full_w=640, t=under_t)}
      </g>

      <text x="{cx}" y="{int(H * 0.70)}" font-family="{FONT_SERIF}"
            font-size="{sub_pt}" font-weight="700" fill="{WHITE}"
            text-anchor="middle" font-style="italic"
            opacity="{sub_alpha:.3f}">
        {esc(b.sub)}
      </text>
    """

def render_define(b: Beat, local: float, t_sec: float) -> str:
    """Editorial centerpiece. Lattice bg + staggered line entrances."""
    cx = W // 2
    big_pt = fit_to_width(b.big, SAFE_TEXT_W, 156, floor_pt=96)
    top_pt = fit_to_width(b.top, SAFE_TEXT_W, 56, floor_pt=40)
    sub_pt = fit_to_width(b.sub, SAFE_TEXT_W, 52, floor_pt=36, kind="serif")
    sub2_pt = fit_to_width(b.sub2, SAFE_TEXT_W, 52, floor_pt=36, kind="serif")

    # Cascading entrance
    top_a = smoothstep(0.10, 0.28, local)
    big_a = smoothstep(0.20, 0.40, local)
    sub_a = smoothstep(0.32, 0.52, local)
    sub2_a = smoothstep(0.42, 0.62, local)

    # Exit fade
    out_fade = 1.0
    if local > 0.84:
        out_fade = 1 - ease_in_cubic((local - 0.84) / 0.16)
    top_a *= out_fade
    big_a *= out_fade
    sub_a *= out_fade
    sub2_a *= out_fade

    return f"""
      {lattice_bg(t_sec, alpha=0.16)}

      {text_at(b.top, cx, int(H * 0.26), top_pt, MINT_2,
               letter_spacing="0.30em", weight=700, opacity=top_a)}

      {text_at(b.big, cx, int(H * 0.42), big_pt, WHITE,
               letter_spacing="-0.025em", weight=900, opacity=big_a)}

      <text x="{cx}" y="{int(H * 0.60)}" font-family="{FONT_SERIF}"
            font-size="{sub_pt}" font-weight="700" fill="{WHITE}"
            text-anchor="middle" font-style="italic"
            opacity="{sub_a:.3f}">
        {esc(b.sub)}
      </text>
      <text x="{cx}" y="{int(H * 0.66)}" font-family="{FONT_SERIF}"
            font-size="{sub2_pt}" font-weight="700" fill="{WHITE}"
            text-anchor="middle" font-style="italic"
            opacity="{sub2_a:.3f}">
        {esc(b.sub2)}
      </text>

      <text x="{cx}" y="{int(H * 0.85)}" font-family="{FONT_MONO}"
            font-size="20" font-weight="700" fill="{MINT}"
            text-anchor="middle" letter-spacing="0.30em"
            opacity="{sub2_a * 0.75:.3f}">
        — THE BRAND MINT DEFINITION
      </text>
    """

def render_brand(b: Beat, local: float, t_sec: float) -> str:
    """Animated logo build. Mark draws + scales + wordmark cascades in,
    then mint pillar slides in to complete the lockup."""
    cx = W // 2

    # Pillar slides up
    pillar_t = clamp01((local - 0.05) / 0.30)
    pillar_top = lerp(H, 600, ease_out_cubic(pillar_t))

    # Mark build (after pillar arrives a bit)
    mark_scale_t = smoothstep(0.20, 0.42, local)
    mark_scale = ease_out_cubic(mark_scale_t) * 1.0
    mark_draw_t = smoothstep(0.28, 0.52, local)

    # Wordmark + tagline cascade
    word_a = smoothstep(0.42, 0.58, local)
    word_drift = lerp(16, 0, ease_out_cubic(word_a))
    sub_a = smoothstep(0.52, 0.68, local)
    url_a = smoothstep(0.62, 0.78, local)

    # Exit
    if local > 0.88:
        out = ease_in_cubic((local - 0.88) / 0.12)
        word_a *= (1 - out)
        sub_a *= (1 - out)
        url_a *= (1 - out)
        pillar_top -= 40 * out
        mark_scale *= (1 - out * 0.3)

    big_pt = fit_to_width(b.big, SAFE_TEXT_W, 152, floor_pt=110)

    return f"""
      <rect x="0" y="{pillar_top:.2f}" width="{W}" height="900"
            fill="{MINT}"/>

      {draw_mark(cx, int(pillar_top + 180), scale=mark_scale * 0.85,
                 draw_t=mark_draw_t,
                 opacity=mark_scale_t)}

      <g transform="translate(0 {pillar_top - 600 + word_drift:.2f})">
        {text_at(b.big, cx, 1110, big_pt, INK_2,
                 letter_spacing="-0.025em", weight=900, opacity=word_a)}

        <text x="{cx}" y="1230"
              font-family="{FONT_SERIF}" font-size="40" font-weight="700"
              fill="{INK_2}" text-anchor="middle" font-style="italic"
              opacity="{sub_a:.3f}">
          {esc(b.sub)}
        </text>

        <text x="{cx}" y="1370"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              letter-spacing="0.30em" fill="{INK_2}" text-anchor="middle"
              opacity="{0.78 * url_a:.3f}">
          BRANDMINTSTUDIOS.IN
        </text>
      </g>
    """

def render_cta(b: Beat, local: float, t_sec: float) -> str:
    cx = W // 2
    bar_t = clamp01(local / 0.25)
    bar_top = lerp(H, 1450, ease_out_cubic(bar_t))

    body_t = smoothstep(0.10, 0.35, local)
    body_drift = lerp(20, 0, ease_out_cubic(body_t))

    # Continuous gentle pulse on the CTA word
    pulse = 1.0 + 0.035 * (0.5 + 0.5 * math.sin(local * 2 * math.pi * 1.5))

    top_pt = fit_to_width(b.top, SAFE_TEXT_W, 60, floor_pt=44)
    big_pt = int(fit_to_width(b.big, SAFE_TEXT_W, 132, floor_pt=84) * pulse)
    sub_pt = fit_to_width(b.sub, SAFE_TEXT_W, 56, floor_pt=40, kind="serif")
    sub_alpha = smoothstep(0.40, 0.60, local)
    under_t = smoothstep(0.45, 0.75, local)

    return f"""
      {particle_field(t_sec, alpha=0.20)}

      <g opacity="{body_t:.3f}" transform="translate(0 {body_drift:.2f})">
        {text_at(b.top, cx, int(H * 0.28), top_pt, WHITE,
                 letter_spacing="0.06em", weight=800)}

        {text_at(b.big, cx, int(H * 0.46), big_pt, MINT_2,
                 letter_spacing="-0.02em", weight=900)}

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
        {draw_mark(180, 1590, scale=0.25, draw_t=1.0,
                   opacity=body_t)}

        <text x="{int(W * 0.42)}" y="1605"
              font-family="{FONT_DISPLAY}" font-size="48" font-weight="900"
              fill="{INK_2}" text-anchor="start" letter-spacing="-0.01em">
          @brandmint.studios
        </text>
        <text x="{int(W * 0.42)}" y="1665"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              fill="{INK_2}" text-anchor="start" letter-spacing="0.28em"
              opacity="0.78">
          BRANDMINTSTUDIOS.IN
        </text>
      </g>
    """

# ----- compose ------------------------------------------------------------

def compose_svg(t_sec: float) -> str:
    _, local, b = beat_at(t_sec)
    bg = f'<rect width="{W}" height="{H}" fill="{BLACK}"/>'

    if b.kind == "hook":
        body = render_hook(b, local, t_sec)
    elif b.kind == "pain":
        body = render_pain(b, local, t_sec)
    elif b.kind == "define":
        body = render_define(b, local, t_sec)
    elif b.kind == "brand":
        body = render_brand(b, local, t_sec)
    elif b.kind == "cta":
        body = render_cta(b, local, t_sec)
    else:
        body = ""

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"
     viewBox="0 0 {W} {H}">
  {bg}
  {body}
</svg>
"""

# ----- render frames ------------------------------------------------------

def render_frame(i: int):
    t = i / FPS
    svg = compose_svg(t)
    out = FRAMES / f"f{i:05d}.png"
    cairosvg.svg2png(bytestring=svg.encode(), output_width=W,
                     output_height=H, write_to=str(out))

def render_all_frames():
    if FRAMES.exists():
        shutil.rmtree(FRAMES)
    FRAMES.mkdir()
    print(f"  rendering {TOTAL_F} frames ({TOTAL_S:.1f}s @ {FPS}fps · BPM={BPM})")
    for i in range(TOTAL_F):
        render_frame(i)
        if (i + 1) % 60 == 0 or i == TOTAL_F - 1:
            print(f"    {i + 1}/{TOTAL_F}")

# ----- audio --------------------------------------------------------------

def synth_audio(out_wav: Path):
    sr = 48000
    n = int(TOTAL_S * sr)
    track = np.zeros(n)
    cursor = 0.0
    for b in BEATS:
        i = int(cursor * sr)
        dur = int(0.40 * sr)
        if i + dur <= n:
            env = np.exp(-np.linspace(0, 6, dur))
            thump = np.sin(2 * np.pi * 58 * np.arange(dur) / sr)
            noise = np.random.normal(0, 1, dur) * 0.18
            track[i:i + dur] += env * (0.65 * thump + 0.30 * noise)
        cursor += b.duration

    for tick_t in np.arange(0.1, TOTAL_S, 0.25):
        i = int(tick_t * sr)
        dur = int(0.04 * sr)
        if i + dur <= n:
            env = np.exp(-np.linspace(0, 14, dur))
            track[i:i + dur] += np.random.normal(0, 1, dur) * env * 0.18

    fade = int(0.6 * sr)
    envm = np.ones(n)
    envm[:fade] = np.linspace(0, 1, fade)
    envm[-fade:] = np.linspace(1, 0, fade)
    track = track * envm

    peak = float(np.max(np.abs(track))) or 1.0
    track = track / peak * 0.75
    pcm = (track * 32767).astype(np.int16)
    with wave.open(str(out_wav), "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(pcm.tobytes())

# ----- mux ----------------------------------------------------------------

def mux(out_mp4: Path, with_audio: bool):
    cmd = ["ffmpeg", "-y", "-framerate", str(FPS),
           "-i", str(FRAMES / "f%05d.png")]
    if with_audio:
        cmd += ["-i", str(OUT / "_audio.wav")]
    cmd += ["-map", "0:v:0"]
    if with_audio:
        cmd += ["-map", "1:a:0"]
    cmd += ["-c:v:0", "libx264", "-pix_fmt:v:0", "yuv420p",
            "-profile:v:0", "high", "-level:v:0", "4.0",
            "-crf", "18", "-preset", "medium"]
    if with_audio:
        cmd += ["-c:a", "aac", "-b:a", "192k", "-ac", "2", "-shortest"]
    cmd += ["-movflags", "+faststart", str(out_mp4)]
    print(f"  muxing → {out_mp4.name}")
    subprocess.run(cmd, check=True, capture_output=True)

# ----- main ---------------------------------------------------------------

def main():
    print(f"\nv15 positioning reel · BPM={BPM} · target {TOTAL_S:.1f}s")
    render_all_frames()
    audio = OUT / "_audio.wav"
    print("  synth audio...")
    synth_audio(audio)
    scored = OUT / f"brandmint-positioning-{BPM}bpm.mp4"
    silent = OUT / f"brandmint-positioning-{BPM}bpm-silent.mp4"
    mux(scored, with_audio=True)
    mux(silent, with_audio=False)
    print(f"\n  ✓ {scored.relative_to(HERE.parent.parent)}")
    print(f"  ✓ {silent.relative_to(HERE.parent.parent)}\n")

if __name__ == "__main__":
    main()
