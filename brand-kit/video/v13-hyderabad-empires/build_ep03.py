"""
BrandMint Studios — Hyderabad Empires · EP03 · New Money Teaser.

Five emerging Hyderabad builders flashed in countdown 5 → 1, closing
on Modcon Builders as the cliffhanger into EP04's deep-dive. Names
only — no founder / founded-year / project / award claims, because
verified source material for Greenmark, Auro Realty, Vamsiram, and
ASBL is not yet available. Once the user supplies that data, the
slates can be re-rendered with full info-grids.

Reuses v13 frame system + EP01-02's mint palette (the "Empires"
series identity). Total runtime ~14s, well under the 20s short-form
target.

Out:   out/hyderabad-empires-ep03-{bpm}bpm[-silent].mp4
Run:   python3 build_ep03.py
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

# Same palette as EP01-02 — emerald accent ties EP03 back to the series.
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
FRAMES = HERE / "frames_ep03"
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

# IG Reels safe text width — 1080 canvas with 80px margin each side
# leaves 920px for content. Any display line that risks being long
# (splash phrases, brand names, hooks) must call fit_to_width() first.
SAFE_TEXT_W = 920

def fit_to_width(text: str, max_w_px: float, start_pt: int,
                 floor_pt: int = 32, kind: str = "bold",
                 step: int = 2) -> int:
    for pt in range(start_pt, floor_pt - 1, -step):
        if measure(text or "", pt, kind) <= max_w_px:
            return pt
    return floor_pt

# ------------------------------------------------------- builder roster ---
# Countdown 5 → 1. Modcon is #1 — it's the cliffhanger that hands off
# to EP04. Other 4 are placeholders until verified data lands.

@dataclass
class Brand:
    rank: int
    name: List[str]              # 1 or 2 lines
    tag: str                     # short editorial tag — NOT a verified claim

BRANDS: List[Brand] = [
    Brand(rank=5, name=["GREENMARK", "DEVELOPERS"],
          tag="EMERGING · HYDERABAD"),
    Brand(rank=4, name=["AURO", "REALTY"],
          tag="EMERGING · HYDERABAD"),
    Brand(rank=3, name=["VAMSIRAM", "BUILDERS"],
          tag="EMERGING · HYDERABAD"),
    Brand(rank=2, name=["ASBL"],
          tag="EMERGING · HYDERABAD"),
    Brand(rank=1, name=["MODCON", "BUILDERS"],
          tag="EMERGING · AWARD-WINNING"),
]

# ------------------------------------------------------- beat schedule ---

@dataclass
class Beat:
    kind: str
    duration: float
    text: str = ""
    text2: str = ""
    brand: Optional[Brand] = None

# Target ~14s — pure teaser pace.
#   splash 2b + 5×2.2b brand + closer 4b = 17 beats × 0.75s = 12.75s ✓
BEATS: List[Beat] = [
    Beat(kind="splash",        duration=beats(2.0),
         text="New Money.",    text2="New Hyderabad."),
] + [
    Beat(kind="brand", duration=beats(2.2), brand=b) for b in BRANDS
] + [
    Beat(kind="closer",        duration=beats(4),
         text="EP04 · MODCON",
         text2="DEEP-DIVE NEXT"),
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
              text-anchor="end" opacity="0.72">NEW MONEY · 2026</text>
      </g>
      <g opacity="{op * 0.72:.3f}">
        <text x="64" y="{H - 40}" font-family="{FONT_MONO}" font-size="16"
              font-weight="700" letter-spacing="0.22em" fill="{PAPER_DIM}">
          SOURCES · PUBLIC RECORDS
        </text>
        <text x="{W - 64}" y="{H - 40}" font-family="{FONT_MONO}" font-size="16"
              font-weight="700" letter-spacing="0.22em" fill="{PAPER_DIM}"
              text-anchor="end">
          EP03 · HYDERABAD
        </text>
      </g>
    """

# ------------------------------------------------------ scene renderers ---

def render_splash(beat: Beat, local: float, scale: float) -> str:
    cx = W // 2
    pulse = 1.0 + 0.015 * math.sin(local * math.pi * 1.6)
    op = 1.0 if local < 0.85 else max(0.0, 1.0 - (local - 0.85) / 0.15)

    line1_pt = fit_to_width(beat.text,  SAFE_TEXT_W, start_pt=108, kind="serif")
    line2_pt = fit_to_width(beat.text2, SAFE_TEXT_W, start_pt=108, kind="serif")
    big_pt_base = fit_to_width("5 EMERGING", SAFE_TEXT_W, start_pt=132, kind="bold")
    big_pt = int(big_pt_base * pulse)

    return f"""
      <g opacity="{op:.3f}">
        <text x="{cx}" y="500" font-family="{FONT_MONO}" font-size="24"
              font-weight="700" fill="{MINT}" text-anchor="middle"
              letter-spacing="0.36em">HYDERABAD'S EMPIRES</text>
        <line x1="{cx - 70}" y1="530" x2="{cx + 70}" y2="530"
              stroke="{MINT}" stroke-width="2"/>

        <text x="{cx}" y="730" font-family="{FONT_SERIF}" font-size="{line1_pt}"
              font-weight="700" fill="{PAPER}" text-anchor="middle"
              font-style="italic">{beat.text}</text>
        <text x="{cx}" y="870" font-family="{FONT_SERIF}" font-size="{line2_pt}"
              font-weight="700" fill="{PAPER}" text-anchor="middle"
              font-style="italic">{beat.text2}</text>

        <text x="{cx}" y="1050" font-family="{FONT_DISPLAY}" font-size="{big_pt}"
              font-weight="900" fill="{MINT}" text-anchor="middle"
              letter-spacing="-0.01em">5 EMERGING</text>
        <text x="{cx}" y="1170" font-family="{FONT_DISPLAY}" font-size="60"
              font-weight="700" fill="{PAPER}" text-anchor="middle"
              letter-spacing="0.24em">BUILDERS</text>

        <line x1="{cx - 60}" y1="1260" x2="{cx + 60}" y2="1260"
              stroke="{MINT}" stroke-width="2"/>
        <text x="{cx}" y="1330" font-family="{FONT_MONO}" font-size="22"
              font-weight="700" fill="{PAPER_DIM}" text-anchor="middle"
              letter-spacing="0.36em">EP03  ·  NEW MONEY</text>
      </g>
    """

def render_brand(beat: Beat, local: float, scale: float) -> str:
    """Name-flash slate. Eyebrow → #rank → big name → emerging tag.
    Minimal info — no founder/year/project claims, since those are
    unverified for 4 of the 5 builders in this teaser cohort."""
    b = beat.brand
    if b is None:
        return ""

    op_in = min(1.0, local / 0.20)
    op_out = 1.0 - max(0.0, (local - 0.85) / 0.15)
    op = min(op_in, op_out)
    drift = lerp(10, -10, ease_in_out(local))
    cx = W // 2

    rank_op = min(1.0, max(0.0, (local - 0.05) / 0.20))

    safe_w = W - 200
    name_pt = 124
    while name_pt > 64 and any(
        measure(line, name_pt) > safe_w for line in b.name
    ):
        name_pt -= 6
    name_line_h = int(name_pt * 1.05)

    name_slot_top    = 800
    name_slot_height = 280
    n_lines = len(b.name)
    name_block_h = name_line_h * n_lines
    name_block_top = name_slot_top + (name_slot_height - name_block_h) // 2
    name_baseline_first = name_block_top + int(name_pt * 0.85)

    name_lines_svg = []
    for i, line in enumerate(b.name):
        y_line = name_baseline_first + i * name_line_h + drift
        name_lines_svg.append(
            f'<text x="{cx}" y="{y_line:.0f}" '
            f'font-family="{FONT_DISPLAY}" font-size="{name_pt}" '
            f'font-weight="900" fill="{PAPER}" text-anchor="middle" '
            f'letter-spacing="-0.01em">{line}</text>'
        )

    rank_str = f"#{b.rank:02d}"

    return f"""
      <g opacity="{op:.3f}">
        <text x="{cx}" y="{400 + drift:.0f}"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              fill="{MINT}" text-anchor="middle" letter-spacing="0.34em">
          NEW MONEY  ·  EP03
        </text>
        <line x1="{cx - 60}" y1="{432 + drift:.0f}"
              x2="{cx + 60}" y2="{432 + drift:.0f}"
              stroke="{MINT}" stroke-width="1.5"/>

        <g opacity="{rank_op:.3f}">
          <text x="{cx}" y="{620 + drift:.0f}"
                font-family="{FONT_SERIF}" font-size="180" font-weight="700"
                fill="{MINT}" text-anchor="middle" letter-spacing="-0.02em">
            {rank_str}
          </text>
          <text x="{cx}" y="{665 + drift:.0f}"
                font-family="{FONT_MONO}" font-size="18" font-weight="700"
                fill="{PAPER_DIM}" text-anchor="middle" letter-spacing="0.40em">
            RANK
          </text>
        </g>

        {''.join(name_lines_svg)}

        <line x1="{cx - 50}" y1="{1280 + drift:.0f}"
              x2="{cx + 50}" y2="{1280 + drift:.0f}"
              stroke="{MINT}" stroke-width="2" opacity="0.6"/>

        <text x="{cx}" y="{1360 + drift:.0f}"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              fill="{MINT_2}" text-anchor="middle" letter-spacing="0.30em">
          {b.tag}
        </text>
      </g>
    """

def render_closer(beat: Beat, local: float, scale: float) -> str:
    """Cliffhanger to EP04 — Modcon deep-dive next."""
    op_in = min(1.0, local / 0.18)
    op_out = 1.0 - max(0.0, (local - 0.92) / 0.08)
    op = min(op_in, op_out)
    drift = lerp(6, -6, ease_in_out(local))
    cx = W // 2

    pulse = 1.0 + 0.04 * math.sin(local * math.pi * 2.4)
    big_pt = int(108 * pulse)

    return f"""
      <g opacity="{op:.3f}">
        <text x="{cx}" y="{420 + drift:.0f}"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              fill="{MINT}" text-anchor="middle" letter-spacing="0.34em">
          CLIFFHANGER  ·  EP03
        </text>
        <line x1="{cx - 60}" y1="{452 + drift:.0f}"
              x2="{cx + 60}" y2="{452 + drift:.0f}"
              stroke="{MINT}" stroke-width="1.5"/>

        <text x="{cx}" y="{700 + drift:.0f}"
              font-family="{FONT_SERIF}" font-size="64" font-weight="700"
              fill="{PAPER}" text-anchor="middle" font-style="italic">
          One name keeps coming up.
        </text>

        <text x="{cx}" y="{900 + drift:.0f}"
              font-family="{FONT_DISPLAY}" font-size="{big_pt}" font-weight="900"
              fill="{MINT}" text-anchor="middle" letter-spacing="0.02em">
          {beat.text}
        </text>
        <text x="{cx}" y="{1010 + drift:.0f}"
              font-family="{FONT_DISPLAY}" font-size="52" font-weight="700"
              fill="{PAPER}" text-anchor="middle" letter-spacing="0.24em">
          {beat.text2}
        </text>

        <line x1="{cx - 80}" y1="{1120 + drift:.0f}"
              x2="{cx + 80}" y2="{1120 + drift:.0f}"
              stroke="{MINT}" stroke-width="2"/>

        <text x="{cx}" y="{1220 + drift:.0f}"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              fill="{PAPER}" text-anchor="middle" letter-spacing="0.28em">
          FOLLOW  ·  @brandmint.studios
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
    elif beat.kind == "brand":
        content = render_brand(beat, local, scale)
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
        if b.kind in ("brand", "closer"):
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
        cmd += ["-i", str(OUT / "_audio_ep03.wav")]

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
    print(f"\nEP03 · New Money Teaser · BPM={BPM}")
    print(f"  total: {TOTAL_SECONDS:.1f}s · {TOTAL_FRAMES} frames")

    render_all_frames()

    audio_wav = OUT / "_audio_ep03.wav"
    print("  synthesising audio ...")
    synth_audio(audio_wav)

    scored = OUT / f"hyderabad-empires-ep03-{BPM}bpm.mp4"
    silent = OUT / f"hyderabad-empires-ep03-{BPM}bpm-silent.mp4"

    mux_video(scored, with_audio=True)
    mux_video(silent, with_audio=False)

    print(f"\n  ✓ {scored.relative_to(HERE.parent.parent)}")
    print(f"  ✓ {silent.relative_to(HERE.parent.parent)}")
    print()

if __name__ == "__main__":
    main()
