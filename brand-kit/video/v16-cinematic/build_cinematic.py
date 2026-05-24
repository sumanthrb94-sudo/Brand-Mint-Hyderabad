"""
BrandMint Studios — v16 Cinematic Positioning Reel · ~19s @ 60fps.

Production-tier motion: every beat is a "shot" with its own camera
(zoom + focal point), entry transition (whip-pan / glitch / drop / fade)
and exit transition (whip-out / blur-out / match-cut). Hero text reveals
letter-by-letter or mask-wipes. Transition frames carry scan lines,
RGB-split glitch noise, and lens-flare bloom on emphasis.

Built straight on v15's positioning script (same content) but a fresh
motion engine. Run:
    python3 build_cinematic.py
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
from typing import List, Optional

import cairosvg
import numpy as np
from PIL import ImageFont

# ----- canvas + bpm -------------------------------------------------------

W, H, FPS = 1080, 1920, 60          # 60fps for true butter motion
BPM = int(os.environ.get("BPM", "120"))   # 0.5s / beat
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
    """Ease-out with overshoot — for scale-bounce reveals."""
    t = clamp01(t)
    s = 1.70158
    return 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2

# ----- beats + shots ------------------------------------------------------

@dataclass
class Shot:
    """Per-beat camera + transition envelope."""
    zoom_start: float = 1.00       # global scale at local=0
    zoom_end: float = 1.04         # global scale at local=1 (Ken Burns)
    focal_x: float = 0.5           # zoom focal point (frac of W)
    focal_y: float = 0.5           # zoom focal point (frac of H)
    enter: str = "fade"            # fade | whip_right | whip_left | drop | glitch | scale
    exit: str = "fade"             # fade | whip_left | whip_right | blur | match
    shake: float = 0.0             # max px shake at impact

@dataclass
class Beat:
    kind: str
    duration: float
    top: str = ""
    big: str = ""
    sub: str = ""
    sub2: str = ""
    shot: Shot = field(default_factory=Shot)

BEATS: List[Beat] = [
    # 0:00-0:01.0  GLITCH OPEN — mark stamps in, dissolves
    Beat(kind="glitch_open", duration=beats(2.0),
         shot=Shot(zoom_start=0.95, zoom_end=1.06, enter="glitch",
                   exit="whip_left", shake=8)),

    # 0:01-0:03.5  HOOK — typewriter
    Beat(kind="hook", duration=beats(5.0),
         top="POSITIONING IS",
         big="THE ONLY MARKETING",
         sub="THAT COMPOUNDS.",
         shot=Shot(zoom_start=1.02, zoom_end=1.06, enter="whip_right",
                   exit="whip_left")),

    # 0:03.5-0:05  PAIN1 setup
    Beat(kind="pain_setup", duration=beats(3.0),
         top="ADS END.",
         shot=Shot(zoom_start=1.00, zoom_end=1.05, enter="drop",
                   exit="whip_right", shake=4)),

    # 0:05-0:06.5  PAIN1 payoff
    Beat(kind="pain_payoff", duration=beats(3.0),
         big="POSITIONS STAY.",
         sub="Compound interest, but for trust.",
         shot=Shot(zoom_start=1.05, zoom_end=1.00, enter="whip_right",
                   exit="whip_left", shake=6)),

    # 0:06.5-0:08  PAIN2 setup
    Beat(kind="pain_setup", duration=beats(3.0),
         top="LOGOS FADE.",
         shot=Shot(zoom_start=1.00, zoom_end=1.05, enter="drop",
                   exit="whip_right", shake=4)),

    # 0:08-0:09.5  PAIN2 payoff
    Beat(kind="pain_payoff", duration=beats(3.0),
         big="POSITIONS SHARPEN.",
         sub="Every year of clarity adds equity.",
         shot=Shot(zoom_start=1.05, zoom_end=1.00, enter="whip_right",
                   exit="whip_left", shake=6)),

    # 0:09.5-0:12.5  DEFINE — the editorial centerpiece (3s)
    Beat(kind="define", duration=beats(6.0),
         top="A POSITION IS",
         big="THE SENTENCE",
         sub="your buyer says about you",
         sub2="when you're not in the room.",
         shot=Shot(zoom_start=1.00, zoom_end=1.08, enter="fade",
                   exit="match")),

    # 0:12.5-0:15  BRAND BUILD — mark draws + wordmark
    Beat(kind="brand", duration=beats(5.0),
         big="BRAND MINT",
         sub="We engineer positions that compound.",
         shot=Shot(zoom_start=0.90, zoom_end=1.00, enter="match",
                   exit="fade", shake=4)),

    # 0:15-0:19  CTA
    Beat(kind="cta", duration=beats(8.0),
         top="WANT TO HEAR YOUR POSITION?",
         big='COMMENT "POSITION"',
         sub="We'll DM your category gap.",
         shot=Shot(zoom_start=1.00, zoom_end=1.05, enter="drop",
                   exit="fade")),
]

TOTAL_S = sum(b.duration for b in BEATS)
TOTAL_F = int(round(TOTAL_S * FPS))

# ----- timing -------------------------------------------------------------

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
            opacity: float = 1.0,
            extra: str = "") -> str:
    return (
        f'<text x="{x:.1f}" y="{y:.1f}" font-family="{kind_font}" '
        f'font-size="{pt}" font-weight="{weight}" fill="{fill}" '
        f'text-anchor="{anchor}" letter-spacing="{letter_spacing}" '
        f'font-style="{font_style}" opacity="{opacity:.3f}" {extra}>'
        f"{esc(text)}</text>"
    )

def typewriter_text(full_text: str, x: float, y: float, pt: int,
                    reveal_t: float, **kwargs) -> str:
    """Reveal text letter-by-letter at progress reveal_t (0..1)."""
    n = max(1, int(round(len(full_text) * clamp01(reveal_t))))
    return text_at(full_text[:n], x, y, pt, **kwargs)

def mask_wipe_text(text: str, x: float, y: float, pt: int,
                   wipe_t: float, mask_id: str, fill: str = WHITE,
                   **kwargs) -> str:
    """Reveal text L→R behind a clip mask that grows in width."""
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
    """Brand Mint M-monogram. scale=1 → 320px size. draw_t controls
    stroke-dashoffset on the M-path. glow adds a soft mint aura."""
    size = int(320 * scale)
    if size <= 4:
        return ""
    path_len = 36
    dash_offset = path_len * (1 - clamp01(draw_t))
    op = clamp01(opacity)

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
        <svg width="{size}" height="{size}" viewBox="0 0 32 32">
          <defs>
            <linearGradient id="bm-mark-g-{int(scale * 1000)}" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="{MINT_2}"/>
              <stop offset="100%" stop-color="{MINT}"/>
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="15" fill="url(#bm-mark-g-{int(scale * 1000)})"/>
          <path d="M9 22V10l7 6 7-6v12"
                stroke="{INK_2}" stroke-width="2.4"
                stroke-linecap="round" stroke-linejoin="round" fill="none"
                stroke-dasharray="{path_len}"
                stroke-dashoffset="{dash_offset:.2f}"/>
        </svg>
      </g>
    """

def lens_flare(cx: float, cy: float, intensity: float,
               color: str = MINT_2) -> str:
    """Soft circular bloom on emphasis moments."""
    intensity = clamp01(intensity)
    if intensity < 0.01:
        return ""
    r = int(300 * intensity)
    return f"""
      <defs>
        <radialGradient id="flare-{int(cx)}-{int(cy)}" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stop-color="{color}" stop-opacity="{0.55 * intensity:.3f}"/>
          <stop offset="40%" stop-color="{color}" stop-opacity="{0.20 * intensity:.3f}"/>
          <stop offset="100%" stop-color="{color}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r}"
              fill="url(#flare-{int(cx)}-{int(cy)})"/>
    """

def scan_lines(intensity: float = 0.4) -> str:
    """Horizontal scan-line glitch. Used during whip / glitch transitions."""
    intensity = clamp01(intensity)
    if intensity < 0.01:
        return ""
    rng = np.random.default_rng(int(intensity * 1000))
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
    """RGB-channel split — used in glitch_open. Three text layers in
    red/green/blue offset by ±offset pixels, then the main white on top."""
    if offset <= 0.5:
        return text_at(text, x, y, pt, **kwargs)
    return f"""
      {text_at(text, x - offset, y, pt, fill='#FF3344', opacity=0.85, **{k: v for k, v in kwargs.items() if k != 'fill' and k != 'opacity'})}
      {text_at(text, x + offset, y, pt, fill='#33CCFF', opacity=0.85, **{k: v for k, v in kwargs.items() if k != 'fill' and k != 'opacity'})}
      {text_at(text, x, y, pt, **kwargs)}
    """

def particle_field(t_sec: float, alpha: float = 0.45,
                   density: int = 32, speed_mult: float = 1.0) -> str:
    if alpha <= 0:
        return ""
    out = ['<g opacity="{:.3f}">'.format(alpha)]
    rng = np.random.default_rng(42)
    for i in range(density):
        bx = rng.uniform(40, W - 40)
        by_base = rng.uniform(0, H)
        r = rng.uniform(2.0, 7.0)
        speed = rng.uniform(8, 24) * speed_mult
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
    """Slowly-drifting dot lattice at one of 3 depth planes.
    depth=0 (back, slow + big), 1 (mid), 2 (front, fast + small)."""
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

# ===== TRANSITION HELPERS =================================================

def transition_offset(beat: Beat, local: float) -> dict:
    """Returns dict with the camera-level transforms for this frame:
       tx, ty, sx, sy, alpha, blur — applied as a global <g> transform."""
    in_t = 0.10
    out_t = 0.10
    out_alpha = 1.0
    out_tx, out_ty = 0.0, 0.0
    out_sx, out_sy = 1.0, 1.0

    shot = beat.shot
    # Ken-Burns zoom from zoom_start → zoom_end over the whole beat
    zoom = lerp(shot.zoom_start, shot.zoom_end, ease_in_out(local))

    # ENTER transition (first in_t of the beat)
    if local < in_t:
        e_t = local / in_t
        if shot.enter == "whip_right":
            # comes in from the right with horizontal stretch
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
            # Quick alpha flicker for the first 50% of the in
            flicker = 0.5 + 0.5 * (1 if random.random() > 0.4 else 0)
            out_alpha = ease_out_cubic(e_t) * flicker
        elif shot.enter == "match":
            out_alpha = e_t  # linear so the match cut feels seamless
        else:  # fade
            out_alpha = ease_out_cubic(e_t)

    # EXIT transition (last out_t of the beat)
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
        elif shot.exit == "blur":
            out_alpha = 1 - ease_in_cubic(e_t)
        elif shot.exit == "match":
            out_alpha = 1 - ease_in_cubic(e_t)
        else:
            out_alpha = 1 - ease_in_cubic(e_t)

    # Micro shake during impact moments (mid-beat for shake>0)
    shake_x = shake_y = 0.0
    if shot.shake > 0:
        shake_window = 1.0 - abs((local - 0.20) / 0.10)  # peak around 20%
        if shake_window > 0:
            shake_x = (random.random() - 0.5) * shot.shake * shake_window
            shake_y = (random.random() - 0.5) * shot.shake * shake_window

    # Focal point for zoom
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
    """Wraps content in a <g> with translate-scale-translate to apply
    the camera transform around the focal point."""
    return (
        f'<g opacity="{tr["alpha"]:.3f}" '
        f'transform="translate({tr["fx"] + tr["tx"]:.2f} '
        f'{tr["fy"] + tr["ty"]:.2f}) '
        f'scale({tr["sx"]:.3f} {tr["sy"]:.3f}) '
        f'translate({-tr["fx"]:.2f} {-tr["fy"]:.2f})">'
    )

# ===== SCENE BUILDERS =====================================================

def build_glitch_open(b: Beat, local: float, t_sec: float) -> str:
    """0-1s: Mark stamps in with glitch + RGB split, then dissolves."""
    cx, cy = W // 2, H // 2
    # Mark scales up + draws + dissolves
    if local < 0.5:
        e = local / 0.5
        scale = lerp(0.4, 1.1, back_out(e))
        draw = clamp01(e * 1.5)
        op = ease_out_cubic(e)
        glow = e * 0.6
    else:
        e = (local - 0.5) / 0.5
        scale = 1.1 + 0.15 * e
        draw = 1.0
        op = 1 - ease_in_cubic(e)
        glow = 0.6 * (1 - e)
    # rgb glitch around mark
    glitch_offset = max(0, 8 * (1 - abs(local - 0.18) * 6))

    return f"""
      {scan_lines(intensity=max(0, 0.6 - local * 2))}
      {draw_mark(cx, cy, scale=scale, draw_t=draw, opacity=op, glow=glow)}

      <g opacity="{op:.3f}">
        {rgb_split('BRAND', cx, cy + 280, 64, offset=glitch_offset,
                   anchor='middle', weight=900, letter_spacing='0.3em',
                   fill=WHITE)}
        {rgb_split('MINT', cx, cy + 360, 64, offset=glitch_offset,
                   anchor='middle', weight=900, letter_spacing='0.3em',
                   fill=MINT_2)}
      </g>
    """

def build_hook(b: Beat, local: float, t_sec: float) -> str:
    cx = W // 2
    top_pt = fit_to_width(b.top, SAFE_TEXT_W, 72, floor_pt=48)
    big_pt = fit_to_width(b.big, SAFE_TEXT_W, 110, floor_pt=72)
    sub_pt = fit_to_width(b.sub, SAFE_TEXT_W, 132, floor_pt=84)

    # Three reveals — typewriter on top, mask-wipe on big, scale-pop on sub
    top_t = smoothstep(0.10, 0.30, local)
    big_wipe_t = smoothstep(0.28, 0.55, local)
    sub_t = smoothstep(0.55, 0.75, local)
    sub_scale = lerp(0.85, 1.0, back_out(clamp01((local - 0.55) / 0.25)))

    # Lens flare on sub reveal
    flare_t = max(0, 1 - abs(local - 0.65) * 8)

    out_alpha = 1 if local < 0.85 else max(0, 1 - (local - 0.85) / 0.15)

    return f"""
      {parallax_lattice(t_sec, depth=0, alpha=0.10)}
      {particle_field(t_sec, alpha=0.30, density=18)}
      {lens_flare(cx, int(H * 0.62), flare_t)}

      <g opacity="{out_alpha:.3f}">
        {typewriter_text(b.top, cx, int(H * 0.28), top_pt,
                         reveal_t=top_t, fill=WHITE,
                         letter_spacing='0.04em', weight=700)}

        {mask_wipe_text(b.big, cx, int(H * 0.46), big_pt,
                        wipe_t=big_wipe_t, mask_id=f'mw-hook',
                        fill=MINT_2, letter_spacing='-0.025em', weight=900)}

        <g opacity="{sub_t:.3f}"
           transform="translate({cx:.0f} {int(H * 0.62)})
                      scale({sub_scale:.3f})
                      translate({-cx:.0f} {int(-H * 0.62)})">
          {text_at(b.sub, cx, int(H * 0.62), sub_pt, WHITE,
                   letter_spacing='-0.025em', weight=900)}
          {animated_underline(cx, int(H * 0.62) + 28, full_w=720,
                              t=smoothstep(0.65, 0.85, local))}
        </g>
      </g>
    """

def build_pain_setup(b: Beat, local: float, t_sec: float) -> str:
    cx = W // 2
    big_pt = fit_to_width(b.top, SAFE_TEXT_W, 156, floor_pt=96)
    # Drop in fast, hold, slight settle
    return f"""
      {parallax_lattice(t_sec, depth=1, alpha=0.08)}
      {particle_field(t_sec, alpha=0.25, density=16, speed_mult=1.4)}
      {text_at(b.top, cx, int(H * 0.50), big_pt, WHITE,
               letter_spacing='-0.025em', weight=900)}
    """

def build_pain_payoff(b: Beat, local: float, t_sec: float) -> str:
    cx = W // 2
    big_pt = fit_to_width(b.big, SAFE_TEXT_W, 156, floor_pt=96)
    sub_pt = fit_to_width(b.sub, SAFE_TEXT_W, 52, floor_pt=36, kind="serif")

    # mask-wipe the big text in, then sub fades in below
    big_wipe = smoothstep(0.05, 0.35, local)
    sub_alpha = smoothstep(0.35, 0.55, local)
    under_t = smoothstep(0.30, 0.55, local)
    flare = max(0, 1 - abs(local - 0.30) * 6)

    return f"""
      {parallax_lattice(t_sec, depth=1, alpha=0.08)}
      {particle_field(t_sec, alpha=0.30, density=20, speed_mult=1.6)}
      {lens_flare(cx, int(H * 0.45), flare * 0.7)}

      {mask_wipe_text(b.big, cx, int(H * 0.45), big_pt,
                      wipe_t=big_wipe, mask_id=f'mw-pp-{int(t_sec * 60)}',
                      fill=MINT_2, letter_spacing='-0.025em', weight=900)}

      {animated_underline(cx, int(H * 0.49), full_w=720, t=under_t)}

      <text x="{cx}" y="{int(H * 0.62)}" font-family="{FONT_SERIF}"
            font-size="{sub_pt}" font-weight="700" fill="{WHITE}"
            text-anchor="middle" font-style="italic"
            opacity="{sub_alpha:.3f}">
        {esc(b.sub)}
      </text>
    """

def build_define(b: Beat, local: float, t_sec: float) -> str:
    cx = W // 2
    top_pt = fit_to_width(b.top, SAFE_TEXT_W, 56, floor_pt=40)
    big_pt = fit_to_width(b.big, SAFE_TEXT_W, 156, floor_pt=96)
    sub_pt = fit_to_width(b.sub, SAFE_TEXT_W, 52, floor_pt=36, kind="serif")
    sub2_pt = fit_to_width(b.sub2, SAFE_TEXT_W, 52, floor_pt=36, kind="serif")

    top_a = smoothstep(0.05, 0.18, local)
    big_a = smoothstep(0.15, 0.32, local)
    sub_a = smoothstep(0.30, 0.45, local)
    sub2_a = smoothstep(0.42, 0.58, local)
    cred_a = smoothstep(0.58, 0.72, local)
    flare = max(0, 1 - abs(local - 0.25) * 6) * 0.5

    # match-cut prep: in the last 12%, the big text fades but its glow
    # ramps up so the next beat (brand) can match into the mark.
    glow_out = 0.0
    if local > 0.85:
        glow_out = (local - 0.85) / 0.15

    return f"""
      {parallax_lattice(t_sec, depth=0, alpha=0.18)}
      {parallax_lattice(t_sec, depth=2, alpha=0.10)}
      {lens_flare(cx, int(H * 0.42), flare)}
      {lens_flare(cx, int(H * 0.42), glow_out)}

      {text_at(b.top, cx, int(H * 0.26), top_pt, MINT_2,
               letter_spacing='0.30em', weight=700, opacity=top_a)}

      {text_at(b.big, cx, int(H * 0.44), big_pt, WHITE,
               letter_spacing='-0.025em', weight=900,
               opacity=big_a * (1 - glow_out))}

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

      <text x="{cx}" y="{int(H * 0.84)}" font-family="{FONT_MONO}"
            font-size="20" font-weight="700" fill="{MINT}"
            text-anchor="middle" letter-spacing='0.30em'
            opacity="{cred_a * 0.75:.3f}">
        — THE BRAND MINT DEFINITION
      </text>
    """

def build_brand(b: Beat, local: float, t_sec: float) -> str:
    cx = W // 2

    # Match-cut entrance: the lens flare from the define beat hands off
    # into the mark, which scales up from a small bright point.
    mark_in_t = smoothstep(0.0, 0.30, local)
    mark_scale = lerp(0.08, 0.85, back_out(mark_in_t))
    mark_draw_t = smoothstep(0.18, 0.42, local)
    mark_glow = max(0, 1 - abs(local - 0.18) * 4)

    # Mint pillar bg arrives a beat behind the mark
    pillar_t = smoothstep(0.25, 0.50, local)
    pillar_top = lerp(H + 200, 600, ease_out_cubic(pillar_t))

    # Wordmark + tagline + url
    word_a = smoothstep(0.50, 0.65, local)
    word_drift = lerp(16, 0, ease_out_cubic(word_a))
    sub_a = smoothstep(0.60, 0.75, local)
    url_a = smoothstep(0.70, 0.85, local)

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
              font-family="{FONT_SERIF}" font-size="40" font-weight="700"
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
    cx = W // 2
    bar_t = clamp01(local / 0.20)
    bar_top = lerp(H, 1450, ease_out_cubic(bar_t))

    body_t = smoothstep(0.10, 0.32, local)
    body_drift = lerp(20, 0, ease_out_cubic(body_t))
    pulse = 1.0 + 0.04 * (0.5 + 0.5 * math.sin(local * 2 * math.pi * 1.8))

    top_pt = fit_to_width(b.top, SAFE_TEXT_W, 60, floor_pt=44)
    big_pt = int(fit_to_width(b.big, SAFE_TEXT_W, 132, floor_pt=84) * pulse)
    sub_pt = fit_to_width(b.sub, SAFE_TEXT_W, 56, floor_pt=40, kind="serif")
    sub_alpha = smoothstep(0.35, 0.55, local)
    under_t = smoothstep(0.40, 0.65, local)
    flare = max(0, 1 - abs(local - 0.40) * 5) * 0.6

    return f"""
      {particle_field(t_sec, alpha=0.18, density=18)}
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
    elif b.kind == "pain_setup":
        body = build_pain_setup(b, local, t_sec)
    elif b.kind == "pain_payoff":
        body = build_pain_payoff(b, local, t_sec)
    elif b.kind == "define":
        body = build_define(b, local, t_sec)
    elif b.kind == "brand":
        body = build_brand(b, local, t_sec)
    elif b.kind == "cta":
        body = build_cta(b, local, t_sec)
    else:
        body = ""

    bg = f'<rect width="{W}" height="{H}" fill="{BLACK}"/>'

    # Scan-line overlay during the first/last 6% of each beat (cut feel)
    overlay = ""
    if local < 0.06 or local > 0.94:
        edge_t = max(0, 1 - abs(local - (0 if local < 0.5 else 1)) * 16)
        overlay = scan_lines(intensity=0.5 * edge_t)

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
    # Deterministic random seed per frame so shake/scan look consistent on re-renders
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
    """Cinematic-style score: low sub pulse on every beat boundary,
    whoosh swells on whip-pans, bell on the brand reveal, crash on CTA."""
    sr = 48000
    n = int(TOTAL_S * sr)
    t = np.arange(n) / sr
    track = np.zeros(n)

    cursor = 0.0
    for bi, b in enumerate(BEATS):
        # Sub thump at beat start
        i = int(cursor * sr)
        dur = int(0.45 * sr)
        if i + dur <= n:
            env = np.exp(-np.linspace(0, 5, dur))
            sub = np.sin(2 * np.pi * 52 * np.arange(dur) / sr)
            noise = np.random.normal(0, 1, dur) * 0.18
            track[i:i + dur] += env * (0.7 * sub + 0.30 * noise)

        # Whoosh swell on whip transitions (last 0.18s of outgoing beat)
        if b.shot.exit in ("whip_left", "whip_right", "match"):
            swoosh_start = cursor + b.duration - 0.18
            si = int(swoosh_start * sr)
            sdur = int(0.18 * sr)
            if si >= 0 and si + sdur <= n:
                # Filtered noise that pitches up
                whoosh = np.random.normal(0, 1, sdur)
                env = np.exp(np.linspace(0, 1.5, sdur)) - 1
                env = env / env.max() * 0.5
                track[si:si + sdur] += whoosh * env * 0.30

        cursor += b.duration

    # Background drone — slow mint pad
    drone = 0.04 * np.sin(2 * np.pi * 96 * t)
    drone += 0.025 * np.sin(2 * np.pi * 144 * t)
    track += drone

    # Sparse hi-hat ticks every 0.25s
    for tick_t in np.arange(0.1, TOTAL_S, 0.25):
        i = int(tick_t * sr)
        dur = int(0.04 * sr)
        if i + dur <= n:
            env = np.exp(-np.linspace(0, 14, dur))
            track[i:i + dur] += np.random.normal(0, 1, dur) * env * 0.15

    # Bell on brand reveal (sum of beat durations up to brand)
    cursor = sum(b.duration for b in BEATS[:7])  # after define
    bi = int(cursor * sr)
    bdur = int(1.5 * sr)
    if bi >= 0 and bi + bdur <= n:
        env = np.exp(-np.linspace(0, 3, bdur))
        bell = (np.sin(2 * np.pi * 880 * np.arange(bdur) / sr) +
                0.5 * np.sin(2 * np.pi * 1320 * np.arange(bdur) / sr) +
                0.3 * np.sin(2 * np.pi * 1760 * np.arange(bdur) / sr))
        track[bi:bi + bdur] += env * bell * 0.18

    # Master fade
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
    print(f"\nv16 cinematic positioning · {FPS}fps · target {TOTAL_S:.1f}s")
    render_all_frames()
    audio = OUT / "_audio.wav"
    print("  synth audio...")
    synth_audio(audio)
    scored = OUT / f"brandmint-cinematic-{BPM}bpm.mp4"
    silent = OUT / f"brandmint-cinematic-{BPM}bpm-silent.mp4"
    mux(scored, with_audio=True)
    mux(silent, with_audio=False)
    print(f"\n  ✓ {scored.relative_to(HERE.parent.parent)}")
    print(f"  ✓ {silent.relative_to(HERE.parent.parent)}\n")

if __name__ == "__main__":
    main()
