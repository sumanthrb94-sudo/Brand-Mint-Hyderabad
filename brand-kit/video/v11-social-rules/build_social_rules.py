"""
BrandMint Studios — v11 "5 Founder Rules for Social Media".

Same beat rhythm as the uploaded reference (5-sec vertical reel,
numbered tip cards cascading in, headline reveal), but rebuilt with
BrandMint's own voice and design system: charcoal INK ground, mint
accents, cream cards, clean Plus Jakarta Sans. No grids, blobs, or
flower icons — we keep it typographic.

Out:    out/brandmint-social-rules.mp4  (1080×1920, 30fps, 5.0s)
Audio:  numpy direct-synth — 5 ticks for the 5 cards + outro swell.

Run:    python3 build_social_rules.py
"""

from __future__ import annotations

import math
import shutil
import subprocess
import wave
from dataclasses import dataclass
from pathlib import Path
from typing import List

import cairosvg
import numpy as np
from PIL import ImageFont

# --------------------------------------------------------------- tokens ---

W, H, FPS = 1080, 1920, 30
TOTAL_SECONDS = 5.0
TOTAL_FRAMES = int(TOTAL_SECONDS * FPS)

INK = "#0a0e0c"
INK_2 = "#11181a"
PAPER = "#f5f1ea"
CARD_BG = "#f7f4ee"
MINT = "#10b981"
MINT_2 = "#7cf6c8"
MINT_4 = "#047857"
MUTE = "#5d7368"

FONT_DISPLAY = "DejaVu Sans, Inter, system-ui, sans-serif"
FONT_MONO = "DejaVu Sans Mono, Menlo, monospace"
_DEJAVU_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
_DEJAVU_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"

HERE = Path(__file__).parent
FRAMES = HERE / "frames"
OUT = HERE / "out"
FRAMES.mkdir(exist_ok=True)
OUT.mkdir(exist_ok=True)

_font_cache: dict = {}

def _font(pt: int, mono: bool = False):
    key = (pt, mono)
    if key not in _font_cache:
        _font_cache[key] = ImageFont.truetype(_DEJAVU_MONO if mono else _DEJAVU_BOLD, pt)
    return _font_cache[key]

def measure(text: str, pt: int, mono: bool = False) -> float:
    if not text:
        return 0.0
    l, _, r, _ = _font(pt, mono).getbbox(text)
    return float(r - l)

# ----------------------------------------------------------- data model ---

@dataclass
class Card:
    num: str
    text: str

# Original BrandMint observations (founder/builder lens), not a paraphrase
# of the reference template. Each line fits inside one card width.
CARDS: List[Card] = [
    Card("01", "Name the metric. Hype is forgettable."),
    Card("02", "Saves rank above likes. Optimise for saves."),
    Card("03", "First 116 chars carry the hook."),
    Card("04", "Pin what converted, not what went viral."),
    Card("05", "Reply in an hour or don't bother."),
]

HEADLINE_FULL = "FIVE FOUNDER RULES FOR SOCIAL"

# Per-card slide-in keyframes. Each card enters from alternating side.
# Animation lasts 0.5s per card, starting at the timing below.
ENTRY_START = [0.20, 0.55, 0.90, 1.25, 1.60]   # seconds
ENTRY_DUR   = 0.50
ENTRY_FROM  = ["top", "left", "right", "left", "right"]

HEADLINE_START = 3.0   # second to begin the letter-by-letter reveal
HEADLINE_DUR   = 1.5   # finishes at 4.5s, leaves 0.5s hold

# ------------------------------------------------------------- helpers ---

def ease_out_back(t: float) -> float:
    # gentle overshoot, then settle
    c1, c3 = 1.70158, 2.70158
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2

def card_pose(idx: int, t_sec: float) -> tuple[float, float, float]:
    """Return (offset_x, offset_y, opacity) for card[idx] at time t_sec."""
    start = ENTRY_START[idx]
    if t_sec < start:
        # not yet entered: offscreen
        from_dir = ENTRY_FROM[idx]
        if from_dir == "top":     return (0, -260, 0.0)
        if from_dir == "left":    return (-W, 0, 0.0)
        if from_dir == "right":   return (W, 0, 0.0)
    local = min(1.0, (t_sec - start) / ENTRY_DUR)
    e = ease_out_back(local)
    from_dir = ENTRY_FROM[idx]
    if from_dir == "top":
        return (0, -260 * (1 - e), min(1.0, local * 1.6))
    if from_dir == "left":
        return (-W * (1 - e), 0, min(1.0, local * 1.6))
    if from_dir == "right":
        return (W * (1 - e), 0, min(1.0, local * 1.6))
    return (0, 0, 1.0)

# --------------------------------------------------------- card layout ---

CARD_W = 940
CARD_H = 168
CARD_GAP = 22
CARD_TOP = 400
CARD_X = (W - CARD_W) // 2

def card_y(idx: int) -> int:
    return CARD_TOP + idx * (CARD_H + CARD_GAP)

def render_card(card: Card, idx: int, dx: float, dy: float, opacity: float) -> str:
    x = CARD_X + dx
    y = card_y(idx) + dy
    r = CARD_H // 2
    tag_w = 120
    tag_h = CARD_H - 28
    tag_x = x + 14
    tag_y = y + (CARD_H - tag_h) // 2
    tag_r = tag_h // 2
    txt_x = tag_x + tag_w + 28
    # Auto-fit body text into the remaining card width.
    text_max_w = CARD_W - (tag_w + 14 + 28 + 32)
    pt = 32
    while pt > 20 and measure(card.text, pt) > text_max_w:
        pt -= 2
    txt_y_offset = int(pt * 0.36)
    return f"""
      <g opacity="{opacity:.3f}">
        <rect x="{x:.1f}" y="{y:.1f}" width="{CARD_W}" height="{CARD_H}"
              rx="{r}" ry="{r}" fill="{CARD_BG}"
              stroke="{MINT}" stroke-opacity="0.18" stroke-width="2"/>
        <rect x="{tag_x:.1f}" y="{tag_y:.1f}" width="{tag_w}" height="{tag_h}"
              rx="{tag_r}" ry="{tag_r}" fill="{MINT}"/>
        <text x="{tag_x + tag_w/2:.1f}" y="{tag_y + tag_h/2 + 12:.1f}"
              font-family="{FONT_MONO}" font-size="36" font-weight="800"
              letter-spacing="0.04em" fill="{INK}" text-anchor="middle">{card.num}</text>
        <text x="{txt_x:.1f}" y="{y + CARD_H/2 + txt_y_offset:.1f}"
              font-family="{FONT_DISPLAY}" font-size="{pt}" font-weight="700"
              fill="{INK}" letter-spacing="-0.005em">{card.text}</text>
      </g>
    """

# --------------------------------------------------------- chrome bits ---

def chrome_top() -> str:
    return f"""
      <g transform="translate(72,210)">
        <rect x="0" y="-22" width="32" height="32" rx="8" ry="8"
              fill="none" stroke="{PAPER}" stroke-opacity="0.75" stroke-width="2"/>
        <circle cx="16" cy="-6" r="7" fill="none" stroke="{PAPER}"
                stroke-opacity="0.75" stroke-width="2"/>
        <circle cx="25" cy="-14" r="1.6" fill="{PAPER}" opacity="0.75"/>
      </g>
      <text x="120" y="206" font-family="{FONT_MONO}" font-size="26"
            font-weight="600" letter-spacing="0.10em" fill="{PAPER}"
            opacity="0.92">@brandmint.studios</text>

      <line x1="{W-72}" y1="195" x2="{W-72-32}" y2="195"
            stroke="{MINT}" stroke-width="3" stroke-linecap="square"/>
      <line x1="{W-72}" y1="195" x2="{W-72}" y2="227"
            stroke="{MINT}" stroke-width="3" stroke-linecap="square"/>
    """

def chrome_bottom() -> str:
    return f"""
      <text x="{W//2}" y="1820" font-family="{FONT_MONO}" font-size="22"
            font-weight="600" letter-spacing="0.32em" fill="{PAPER}"
            opacity="0.72" text-anchor="middle">BRANDMINT · STUDIO NOTE</text>

      <line x1="72" y1="1860" x2="104" y2="1860"
            stroke="{MINT}" stroke-width="3" stroke-linecap="square"/>
      <line x1="72" y1="1860" x2="72" y2="1828"
            stroke="{MINT}" stroke-width="3" stroke-linecap="square"/>
    """

# --------------------------------------------------- headline reveal ---

def headline_at(t_sec: float) -> str:
    """Letter-by-letter reveal of the bottom headline."""
    if t_sec < HEADLINE_START:
        return ""
    local = min(1.0, (t_sec - HEADLINE_START) / HEADLINE_DUR)
    n_chars = int(round(local * len(HEADLINE_FULL)))
    return HEADLINE_FULL[:n_chars]

def render_headline(t_sec: float) -> str:
    text = headline_at(t_sec)
    if not text:
        return ""
    pt = 60
    # Word-aware wrap into two lines.
    words = text.split(" ")
    # Find the split that keeps the two lines roughly balanced.
    best_split = len(words)
    best_diff = float("inf")
    for split in range(1, len(words) + 1):
        l1 = " ".join(words[:split])
        l2 = " ".join(words[split:])
        w1 = measure(l1, pt)
        w2 = measure(l2, pt) if l2 else 0
        diff = max(w1, w2) - min(w1, w2)
        # prefer the split that gives the smaller max width
        if max(w1, w2) <= W - 200 and diff < best_diff:
            best_diff = diff
            best_split = split
    line1 = " ".join(words[:best_split])
    line2 = " ".join(words[best_split:])
    line_h = int(pt * 1.06)
    y1 = 1620
    y2 = y1 + line_h
    return f"""
      <text x="{W//2}" y="{y1}" font-family="{FONT_DISPLAY}"
            font-weight="800" font-size="{pt}" fill="{PAPER}"
            letter-spacing="-0.01em" text-anchor="middle">{line1}</text>
      <text x="{W//2}" y="{y2}" font-family="{FONT_DISPLAY}"
            font-weight="800" font-size="{pt}" fill="{PAPER}"
            letter-spacing="-0.01em" text-anchor="middle">{line2}</text>
    """

# ----------------------------------------------------------- compose ---

def frame_svg(t_sec: float) -> str:
    background = f"""
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="{INK_2}"/>
          <stop offset="55%" stop-color="{INK}"/>
          <stop offset="100%" stop-color="{INK}"/>
        </linearGradient>
        <radialGradient id="glow" cx="0.78" cy="0.22" r="0.55">
          <stop offset="0%" stop-color="{MINT}" stop-opacity="0.18"/>
          <stop offset="45%" stop-color="{MINT}" stop-opacity="0.04"/>
          <stop offset="100%" stop-color="{INK}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="{W}" height="{H}" fill="url(#bg)"/>
      <rect width="{W}" height="{H}" fill="url(#glow)"/>
    """

    cards_svg: List[str] = []
    for i, card in enumerate(CARDS):
        dx, dy, op = card_pose(i, t_sec)
        cards_svg.append(render_card(card, i, dx, dy, op))

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}"
                    width="{W}" height="{H}">
      {background}
      {chrome_top()}
      {''.join(cards_svg)}
      {render_headline(t_sec)}
      {chrome_bottom()}
    </svg>"""

def render_frame(svg: str, path: Path) -> None:
    cairosvg.svg2png(bytestring=svg.encode("utf-8"),
                     output_width=W, output_height=H, write_to=str(path))

def build_frames() -> None:
    if FRAMES.exists():
        shutil.rmtree(FRAMES)
    FRAMES.mkdir()
    for f in range(TOTAL_FRAMES):
        t = f / FPS
        render_frame(frame_svg(t), FRAMES / f"f-{f:05d}.png")

# -------------------------------------------------------------- audio ---

def synth_audio() -> Path:
    sr = 44100
    n = int(TOTAL_SECONDS * sr)
    out = np.zeros(n, dtype=np.float32)
    t = np.arange(n) / sr

    # quiet drone bed
    drone = 0.05 * np.sin(2 * np.pi * 110 * t) + 0.025 * np.sin(2 * np.pi * 220 * t)
    env = 0.5 + 0.5 * np.sin(2 * np.pi * 0.10 * t)
    out += (drone * env).astype(np.float32)

    # tick at each card entry
    for start in ENTRY_START:
        idx = int(start * sr)
        burst_n = int(0.16 * sr)
        ts = np.arange(burst_n) / sr
        freq = 880
        burst = 0.30 * np.sin(2 * np.pi * freq * ts) * np.exp(-ts * 28)
        burst += 0.14 * np.sin(2 * np.pi * (freq * 1.5) * ts) * np.exp(-ts * 40)
        end = min(idx + burst_n, n)
        out[idx:end] += burst[: end - idx].astype(np.float32)

    # outro swell
    swell_start = int((TOTAL_SECONDS - 1.5) * sr)
    ts = np.arange(n - swell_start) / sr
    swell = 0.12 * np.sin(2 * np.pi * 165 * ts) * (1 - np.exp(-ts * 4))
    out[swell_start:] += swell.astype(np.float32)

    peak = np.max(np.abs(out))
    if peak > 0:
        out *= 0.85 / peak

    wav_path = OUT / "_audio.wav"
    with wave.open(str(wav_path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes((out * 32767).astype(np.int16).tobytes())
    return wav_path

# -------------------------------------------------------------- ffmpeg ---

def encode_video(audio: Path, out_mp4: Path) -> None:
    pattern = str(FRAMES / "f-%05d.png")
    cmd = [
        "ffmpeg", "-y", "-v", "error",
        "-framerate", str(FPS),
        "-i", pattern,
        "-i", str(audio),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "medium",
        "-crf", "20",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        "-movflags", "+faststart",
        str(out_mp4),
    ]
    subprocess.run(cmd, check=True)

# ---------------------------------------------------------------- main ---

def main() -> None:
    print(f"Total runtime: {TOTAL_SECONDS:.2f}s · {TOTAL_FRAMES} frames")
    print("Rendering frames…")
    build_frames()
    print(f"  rendered {TOTAL_FRAMES} frames")
    print("Synthesising audio…")
    audio = synth_audio()
    print(f"  wrote {audio.name}")
    print("Encoding mp4…")
    out_mp4 = OUT / "brandmint-social-rules.mp4"
    encode_video(audio, out_mp4)
    print(f"\n✓ {out_mp4}")

if __name__ == "__main__":
    main()
