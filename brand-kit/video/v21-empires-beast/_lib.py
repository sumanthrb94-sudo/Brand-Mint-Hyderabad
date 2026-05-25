"""
Shared helpers for v21-empires-beast — MrBeast structure + Brand Mint palette.

All four episodes (EP01-04) import from this file so the visual system,
typography, animation easing, and audio recipes stay consistent.

Each episode then defines:
- BEATS (list of beat configs)
- compose_svg(t) that routes each beat to its scene builder
- main() that renders + muxes

Brand Mint palette is locked here. Per BRAND-GUIDELINES.md §3.
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

# ----- canvas + framerate -------------------------------------------------

W, H, FPS = 1080, 1920, 60

# ----- Brand Mint palette (BEAST-named, mint-valued) ---------------------

BEAST_BLACK = "#070A09"        # INK — warm-black ground
BEAST_WHITE = "#F5F1EA"        # PAPER — cream display text
BEAST_YELLOW = "#7CF6C8"       # MINT_2 — bright mint highlight (was yellow)
BEAST_RED = "#10B981"          # MINT_3 — primary mint (arrows + emphasis)
BEAST_GREEN = "#047857"        # MINT_4 — deep mint (chip backgrounds)
BEAST_BLUE = "#047857"         # MINT_4 — accent
BEAST_PINK = "#10B981"         # MINT_3 fallback

PURE_WHITE = "#FFFFFF"          # for flash transitions

MINT = "#10B981"
MINT_2 = "#7CF6C8"
MINT_4 = "#047857"
INK_2 = "#070A09"

# Typography
FONT_DISPLAY = "Plus Jakarta Sans, system-ui, sans-serif"
FONT_MONO = "JetBrains Mono, ui-monospace, monospace"
_DEJAVU_BOLD = "/usr/local/share/fonts/brandmint/PlusJakartaSans-ExtraBold.ttf"
_DEJAVU_MONO = "/usr/local/share/fonts/brandmint/JetBrainsMono-Bold.ttf"

SAFE_TEXT_W = 960

# Canonical Brand Mint mark
REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
_LOGO_SVG_PATH = REPO_ROOT / "brand-kit" / "logo" / "brand-mint-monogram.svg"
_LOGO_SVG_SRC = _LOGO_SVG_PATH.read_text() if _LOGO_SVG_PATH.exists() else None

# ----- font cache ---------------------------------------------------------

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

def ease_in_out(t: float) -> float:
    t = clamp01(t)
    return 0.5 - 0.5 * math.cos(math.pi * t)

def smoothstep(edge0: float, edge1: float, x: float) -> float:
    t = clamp01((x - edge0) / (edge1 - edge0)) if edge1 > edge0 else 0.0
    return t * t * (3 - 2 * t)

def back_out(t: float) -> float:
    t = clamp01(t)
    s = 2.2
    return 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2

# ----- BEAST primitives ---------------------------------------------------

def stroke_text(text: str, x: float, y: float, pt: int,
                fill: str = BEAST_YELLOW,
                stroke: str = BEAST_BLACK,
                stroke_w: int = 8,
                weight: int = 900,
                anchor: str = "middle",
                letter_spacing: str = "-0.02em",
                opacity: float = 1.0,
                kind_font: str = FONT_DISPLAY) -> str:
    return (
        f'<text x="{x:.1f}" y="{y:.1f}" font-family="{kind_font}" '
        f'font-size="{pt}" font-weight="{weight}" fill="{fill}" '
        f'stroke="{stroke}" stroke-width="{stroke_w}" '
        f'paint-order="stroke fill" stroke-linejoin="round" '
        f'text-anchor="{anchor}" letter-spacing="{letter_spacing}" '
        f'opacity="{opacity:.3f}">'
        f"{esc(text)}</text>"
    )

def plain_text(text: str, x: float, y: float, pt: int,
               fill: str = BEAST_WHITE,
               anchor: str = "middle",
               weight: int = 900,
               letter_spacing: str = "-0.02em",
               opacity: float = 1.0,
               kind_font: str = FONT_DISPLAY) -> str:
    """Text without stroke — for clean text on solid bgs."""
    return (
        f'<text x="{x:.1f}" y="{y:.1f}" font-family="{kind_font}" '
        f'font-size="{pt}" font-weight="{weight}" fill="{fill}" '
        f'text-anchor="{anchor}" letter-spacing="{letter_spacing}" '
        f'opacity="{opacity:.3f}">'
        f"{esc(text)}</text>"
    )

def color_block(x: float, y: float, w: float, h: float,
                fill: str, rotate_deg: float = -2.0,
                stroke: str = BEAST_BLACK, stroke_w: int = 6,
                opacity: float = 1.0) -> str:
    cx_block = x + w / 2
    cy_block = y + h / 2
    return (
        f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" '
        f'fill="{fill}" stroke="{stroke}" stroke-width="{stroke_w}" '
        f'opacity="{opacity:.3f}" '
        f'transform="rotate({rotate_deg} {cx_block:.1f} {cy_block:.1f})"/>'
    )

def red_arrow(x1: float, y1: float, x2: float, y2: float,
              opacity: float = 1.0, stroke_w: int = 10,
              color: Optional[str] = None) -> str:
    if color is None:
        color = BEAST_RED
    mx = (x1 + x2) / 2
    my = (y1 + y2) / 2
    dx = x2 - x1
    dy = y2 - y1
    L = math.hypot(dx, dy) or 1
    nx = -dy / L
    ny = dx / L
    curve = min(120, L * 0.3)
    cpx = mx + nx * curve
    cpy = my + ny * curve
    angle = math.atan2(y2 - cpy, x2 - cpx)
    head = 30
    h1x = x2 - head * math.cos(angle - 0.5)
    h1y = y2 - head * math.sin(angle - 0.5)
    h2x = x2 - head * math.cos(angle + 0.5)
    h2y = y2 - head * math.sin(angle + 0.5)
    return (
        f'<g opacity="{opacity:.3f}">'
        f'<path d="M {x1:.1f} {y1:.1f} Q {cpx:.1f} {cpy:.1f} {x2:.1f} {y2:.1f}" '
        f'stroke="{color}" stroke-width="{stroke_w}" fill="none" '
        f'stroke-linecap="round"/>'
        f'<path d="M {x2:.1f} {y2:.1f} L {h1x:.1f} {h1y:.1f} M {x2:.1f} {y2:.1f} L {h2x:.1f} {h2y:.1f}" '
        f'stroke="{color}" stroke-width="{stroke_w}" fill="none" '
        f'stroke-linecap="round"/>'
        f'</g>'
    )

def red_circle_annotation(cx: float, cy: float, r: float,
                          draw_t: float = 1.0, opacity: float = 1.0,
                          stroke_w: int = 10,
                          color: Optional[str] = None) -> str:
    if color is None:
        color = BEAST_RED
    circumference = 2 * math.pi * r
    dash_offset = circumference * (1 - clamp01(draw_t))
    return (
        f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" '
        f'fill="none" stroke="{color}" stroke-width="{stroke_w}" '
        f'stroke-dasharray="{circumference:.1f}" '
        f'stroke-dashoffset="{dash_offset:.1f}" '
        f'stroke-linecap="round" opacity="{opacity:.3f}"/>'
    )

def stat_chip(x: float, y: float, label: str, value: str,
              bg: str = BEAST_GREEN, opacity: float = 1.0,
              value_pt: int = 96) -> str:
    val_w = measure(value, value_pt) + 80
    val_h = max(130, value_pt + 34)
    lab_pt = 24
    lab_w = measure(label, lab_pt, kind="mono") + 40
    return (
        f'<g opacity="{opacity:.3f}">'
        f'<rect x="{x - val_w/2:.1f}" y="{y:.1f}" width="{val_w:.1f}" height="{val_h}" '
        f'fill="{bg}" stroke="{BEAST_BLACK}" stroke-width="6" rx="12"/>'
        f'{stroke_text(value, x, y + val_h - 36, value_pt, fill=BEAST_WHITE, stroke=BEAST_BLACK, stroke_w=6)}'
        f'<rect x="{x - lab_w/2:.1f}" y="{y + val_h + 4:.1f}" width="{lab_w:.1f}" height="44" '
        f'fill="{BEAST_BLACK}" rx="6"/>'
        f'<text x="{x:.1f}" y="{y + val_h + 34:.1f}" font-family="{FONT_MONO}" '
        f'font-size="{lab_pt}" font-weight="700" fill="{BEAST_WHITE}" '
        f'text-anchor="middle" letter-spacing="0.20em">{esc(label)}</text>'
        f'</g>'
    )

def builder_card(cx: float, cy: float, rank: int, name: str,
                 sub: str = "", size: float = 460,
                 alpha: float = 1.0,
                 rotate_deg: float = -2.0) -> str:
    """A MrBeast-style builder reveal card: rank chip + name on mint block."""
    half = size / 2
    rank_str = f"#{rank}"
    # Fit name within the card's internal width (~size - 60 padding)
    name_pt = fit_to_width(name, max_w_px=size - 60, start_pt=44, floor_pt=22)
    return f"""
      <g opacity="{alpha:.3f}">
        {color_block(cx - half, cy - 130, size, 260, fill=BEAST_YELLOW, rotate_deg=rotate_deg)}
        {stroke_text(rank_str, cx, cy - 30, 92, fill=BEAST_BLACK, stroke=BEAST_WHITE, stroke_w=4)}
        {stroke_text(name, cx, cy + 60, name_pt, fill=BEAST_BLACK, stroke=BEAST_BLACK, stroke_w=1, weight=900)}
        {('<text x="' + str(cx) + '" y="' + str(cy + 160) + '" font-family="' + FONT_MONO + '" '
          'font-size="18" font-weight="700" fill="' + BEAST_WHITE + '" text-anchor="middle" '
          'letter-spacing="0.20em">' + esc(sub) + '</text>') if sub else ''}
      </g>
    """

def shake_xy(t: float, magnitude: float, seed: int = 0) -> tuple:
    if magnitude <= 0:
        return (0.0, 0.0)
    rng = random.Random(int(t * 1000) + seed)
    return (
        (rng.random() - 0.5) * 2 * magnitude,
        (rng.random() - 0.5) * 2 * magnitude,
    )

def flash_frame(t: float, peak_at: float, width: float = 0.06,
                color: str = PURE_WHITE) -> str:
    if abs(t - peak_at) > width:
        return ""
    intensity = 1.0 - (abs(t - peak_at) / width)
    intensity = intensity ** 1.5
    return (
        f'<rect width="{W}" height="{H}" fill="{color}" '
        f'opacity="{intensity * 0.65:.3f}"/>'
    )

def draw_mark(cx: float, cy: float, scale: float, opacity: float = 1.0) -> str:
    """Brand Mint M-monogram. Used on closing frames only."""
    size = int(320 * scale)
    if size <= 4 or _LOGO_SVG_SRC is None:
        return ""
    uniq = f"{int(scale * 10000)}-{int(opacity * 1000)}"
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

# ----- audio synth (shared) -----------------------------------------------

def synth_beast_audio(out_wav: Path, total_s: float,
                      beat_boundaries: List[float],
                      winner_at: Optional[float] = None,
                      ding_times: Optional[List[float]] = None) -> None:
    """MrBeast-style audio: snare on every beat boundary, drone pad,
    bell on optional winner moment, ding on optional stat reveals."""
    sr = 48000
    n = int(total_s * sr)
    track = np.zeros(n)

    # Snare hit at every beat boundary
    for bnd in beat_boundaries:
        i = int(bnd * sr)
        dur = int(0.20 * sr)
        if i + dur <= n:
            env = np.exp(-np.linspace(0, 8, dur))
            noise = np.random.normal(0, 1, dur) * 0.6
            thump = np.sin(2 * np.pi * 180 * np.arange(dur) / sr) * 0.4
            track[i:i + dur] += env * (noise + thump) * 0.55

    # Winner crash
    if winner_at is not None:
        ri = int(winner_at * sr)
        rdur = int(1.5 * sr)
        if ri + rdur <= n:
            env = np.exp(-np.linspace(0, 3, rdur))
            crash = np.random.normal(0, 1, rdur) * env * 0.55
            boom = np.sin(2 * np.pi * 42 * np.arange(rdur) / sr) * env * 0.65
            track[ri:ri + rdur] += crash + boom

    # Dings on stat reveals
    for dt in (ding_times or []):
        i = int(dt * sr)
        dur = int(0.4 * sr)
        if i + dur <= n:
            env = np.exp(-np.linspace(0, 5, dur))
            ding = (np.sin(2 * np.pi * 1320 * np.arange(dur) / sr) +
                    0.5 * np.sin(2 * np.pi * 1980 * np.arange(dur) / sr))
            track[i:i + dur] += env * ding * 0.20

    # Hi-hat ticks at 8th notes
    for tick_t in np.arange(0.0, total_s, 0.25):
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

# ----- render driver (shared) ---------------------------------------------

def render_all_frames(frames_dir: Path, total_f: int, total_s: float,
                      compose_svg_fn) -> None:
    if frames_dir.exists():
        shutil.rmtree(frames_dir)
    frames_dir.mkdir(parents=True)
    print(f"  rendering {total_f} frames ({total_s:.1f}s @ {FPS}fps)")
    for i in range(total_f):
        t = i / FPS
        random.seed(i * 1009)
        svg = compose_svg_fn(t)
        out = frames_dir / f"f{i:06d}.png"
        cairosvg.svg2png(bytestring=svg.encode(), output_width=W,
                         output_height=H, write_to=str(out))
        if (i + 1) % 100 == 0 or i == total_f - 1:
            print(f"    {i + 1}/{total_f}")

def mux(frames_dir: Path, audio_wav: Path, out_mp4: Path,
        with_audio: bool = True) -> None:
    cmd = ["ffmpeg", "-y", "-framerate", str(FPS),
           "-i", str(frames_dir / "f%06d.png")]
    if with_audio:
        cmd += ["-i", str(audio_wav)]
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
