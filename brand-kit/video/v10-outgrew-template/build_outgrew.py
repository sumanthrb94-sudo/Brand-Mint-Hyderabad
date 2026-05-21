"""
BrandMint Studios — v10 "5 Signs You've Outgrew Your Template" carousel reel.

Same beat structure / pacing as the reference Canva grunge carousel
(intro · 5 numbered signs · outro), but rebuilt in BrandMint aesthetic:
charcoal INK ground, mint pill labels, Plus Jakarta Sans (no grunge),
clean line-icon accents, ambient mint radial highlight.

Output: out/brandmint-outgrew-template.mp4  (1080×1920, 30fps, ~22s)
Audio:  numpy direct-synthesised mint pulse + drone bed.

Run:  python3 build_outgrew.py
"""

from __future__ import annotations

import math
import os
import shutil
import struct
import subprocess
import wave
from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple

import cairosvg
import numpy as np
from PIL import ImageFont

# ----------------------------------------------------------------- tokens ---

W, H, FPS = 1080, 1920, 30
INK = "#0a0e0c"
INK_2 = "#11181a"
PAPER = "#f5f1ea"
MINT = "#10b981"
MINT_2 = "#7cf6c8"
MINT_SOFT = "rgba(16, 185, 129, 0.16)"

FONT_DISPLAY = "DejaVu Sans, Inter, system-ui, sans-serif"
FONT_MONO = "DejaVu Sans Mono, Menlo, monospace"
_DEJAVU_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
_DEJAVU_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"

HERE = Path(__file__).parent
FRAMES = HERE / "frames"
OUT = HERE / "out"
FRAMES.mkdir(exist_ok=True)
OUT.mkdir(exist_ok=True)

# ------------------------------------------------------------- text utils ---

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

def fit_font_size(text: str, start_pt: int, max_w: float, min_pt: int = 36) -> int:
    pt = start_pt
    while pt > min_pt and measure(text, pt) > max_w:
        pt -= 4
    return pt

def wrap_text(text: str, pt: int, max_w: float) -> List[str]:
    words = text.split()
    lines: List[str] = []
    cur = ""
    for w in words:
        trial = (cur + " " + w).strip()
        if measure(trial, pt) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines

# ------------------------------------------------------------- beat model ---

@dataclass
class Beat:
    label: str          # eyebrow label, e.g. "SIGN 01"
    headline: str       # big bold line
    body: str           # support copy
    duration: float = 3.0  # seconds


BEATS: List[Beat] = [
    Beat(
        label="STUDIO NOTE",
        headline="5 SIGNS YOU'VE OUTGROWN YOUR TEMPLATE",
        body="If two of these feel familiar, your storefront is leaving money on the table.",
        duration=3.0,
    ),
    Beat(
        label="SIGN 01",
        headline="TRAFFIC SPIKES. BOUNCE STAYS.",
        body="The ads are working. The landing page can't carry the load.",
        duration=3.0,
    ),
    Beat(
        label="SIGN 02",
        headline="YOU'RE EXPLAINING THE PRICE.",
        body="Your design says template. Your invoice says premium.",
        duration=3.0,
    ),
    Beat(
        label="SIGN 03",
        headline="THE THEME FIGHTS YOU.",
        body="Every new feature needs a plugin. Every plugin breaks the layout.",
        duration=3.0,
    ),
    Beat(
        label="SIGN 04",
        headline="NO ONE REMEMBERS THE NAME.",
        body="Without a brand system, only the URL sticks. URLs don't compound.",
        duration=3.0,
    ),
    Beat(
        label="SIGN 05",
        headline="YOUR CRM IS A SPREADSHEET.",
        body="When the data outgrows the tool, the team outgrows the speed.",
        duration=3.2,
    ),
    Beat(
        label="— YOUR MOVE",
        headline="BUILT IN HITEC CITY. SHIPPED WORLDWIDE.",
        body='DM "OUTGROWN" — we scope your build in 48 hours.',
        duration=3.5,
    ),
]

# --------------------------------------------------------------- chrome ---

def chrome_top() -> str:
    """Top-bar: tiny IG glyph + handle, kept inside the Meta safe-zone."""
    y = 210
    return f"""
      <g transform="translate(72,{y})">
        <rect x="0" y="-22" width="32" height="32" rx="8" ry="8"
              fill="none" stroke="{PAPER}" stroke-opacity="0.75" stroke-width="2"/>
        <circle cx="16" cy="-6" r="7" fill="none" stroke="{PAPER}" stroke-opacity="0.75" stroke-width="2"/>
        <circle cx="25" cy="-14" r="1.6" fill="{PAPER}" opacity="0.75"/>
      </g>
      <text x="120" y="206" font-family="{FONT_MONO}" font-size="26" font-weight="600"
            letter-spacing="0.10em" fill="{PAPER}" opacity="0.92">@brandmint.studios</text>

      <!-- top-right corner brackets -->
      <line x1="{W-72}" y1="195" x2="{W-72-32}" y2="195"
            stroke="{MINT}" stroke-width="3" stroke-linecap="square"/>
      <line x1="{W-72}" y1="195" x2="{W-72}" y2="227"
            stroke="{MINT}" stroke-width="3" stroke-linecap="square"/>
    """

def chrome_bottom(beat_index: int, total: int) -> str:
    """Bottom-bar: dot pager + brand mark, kept above Meta safe-zone."""
    cx_start = W // 2 - ((total - 1) * 26) // 2
    dots: List[str] = []
    for i in range(total):
        cx = cx_start + i * 26
        fill = MINT if i == beat_index else PAPER
        op = "1" if i == beat_index else "0.35"
        r = 5 if i == beat_index else 4
        dots.append(
            f'<circle cx="{cx}" cy="1465" r="{r}" fill="{fill}" opacity="{op}"/>'
        )
    return f"""
      {''.join(dots)}
      <text x="{W//2}" y="1520" font-family="{FONT_MONO}" font-size="22"
            font-weight="600" letter-spacing="0.32em" fill="{PAPER}" opacity="0.72"
            text-anchor="middle">BRANDMINT · STUDIO NOTE</text>

      <!-- bottom-left corner brackets -->
      <line x1="72" y1="1700" x2="104" y2="1700"
            stroke="{MINT}" stroke-width="3" stroke-linecap="square"/>
      <line x1="72" y1="1700" x2="72" y2="1668"
            stroke="{MINT}" stroke-width="3" stroke-linecap="square"/>
    """

# ----------------------------------------------------------- beat layout ---

def render_pill(text: str, cx: int, cy: int, pad_x: int = 28, height: int = 64,
                fg: str = INK, bg: str = MINT) -> str:
    """Mint pill (or paper pill) with mono caps label. Ultra-symmetric."""
    pt = 22
    txt_w = measure(text, pt, mono=True)
    w = int(txt_w + pad_x * 2)
    x = cx - w // 2
    y = cy - height // 2
    r = height // 2
    return f"""
      <rect x="{x}" y="{y}" width="{w}" height="{height}" rx="{r}" ry="{r}"
            fill="{bg}"/>
      <text x="{cx}" y="{cy + 8}" font-family="{FONT_MONO}" font-size="{pt}"
            font-weight="700" letter-spacing="0.18em" fill="{fg}" text-anchor="middle">{text}</text>
    """

def render_headline(text: str, cy: int) -> Tuple[str, int, int]:
    """Bold display headline, auto-fit + wrap. Returns (svg, top_y, bottom_y)."""
    max_w = W - 220
    pt = 100
    while pt >= 56:
        lines = wrap_text(text, pt, max_w)
        if len(lines) <= 4 and all(measure(l, pt) <= max_w for l in lines):
            break
        pt -= 4
    lines = wrap_text(text, pt, max_w)
    line_h = int(pt * 1.06)
    block_h = line_h * len(lines)
    start_y = cy - block_h // 2 + int(pt * 0.85)
    svgs: List[str] = []
    for i, line in enumerate(lines):
        y = start_y + i * line_h
        svgs.append(
            f'<text x="{W//2}" y="{y}" font-family="{FONT_DISPLAY}" '
            f'font-weight="800" font-size="{pt}" fill="{PAPER}" '
            f'letter-spacing="-0.01em" text-anchor="middle">{line}</text>'
        )
    top = start_y - int(pt * 0.85)
    bottom = start_y + (len(lines) - 1) * line_h + int(pt * 0.15)
    return "".join(svgs), top, bottom

def render_body(text: str, cy: int) -> str:
    max_w = W - 260
    pt = 38
    while pt >= 26 and any(measure(l, pt) > max_w for l in wrap_text(text, pt, max_w)):
        pt -= 2
    lines = wrap_text(text, pt, max_w)
    line_h = int(pt * 1.32)
    block_h = line_h * len(lines)
    start_y = cy - block_h // 2 + int(pt * 0.9)
    svgs: List[str] = []
    for i, line in enumerate(lines):
        y = start_y + i * line_h
        svgs.append(
            f'<text x="{W//2}" y="{y}" font-family="{FONT_DISPLAY}" '
            f'font-weight="500" font-size="{pt}" fill="{PAPER}" opacity="0.82" '
            f'text-anchor="middle">{line}</text>'
        )
    return "".join(svgs)

def render_cta_pill(text: str, cy: int) -> str:
    """Big mint CTA pill for the closing beat."""
    pt = 36
    pad_x = 60
    h = 108
    txt_w = measure(text, pt, mono=False)
    w = int(txt_w + pad_x * 2)
    x = W // 2 - w // 2
    y = cy - h // 2
    r = h // 2
    return f"""
      <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" ry="{r}"
            fill="{MINT}"/>
      <text x="{W//2}" y="{cy + 13}" font-family="{FONT_DISPLAY}" font-size="{pt}"
            font-weight="700" letter-spacing="0.04em" fill="{INK}" text-anchor="middle">{text}</text>
    """

# ----------------------------------------------------------- SVG → frame ---

def beat_svg(beat: Beat, idx: int, total: int, anim_t: float = 1.0) -> str:
    """Render a single beat at animation progress anim_t in [0,1].
    anim_t controls a subtle fade-in (0 = invisible, 1 = full)."""
    is_cta = idx == total - 1
    body_opacity = anim_t  # whole content fades up

    # Layout: label pill at y=560, headline centred ~860, body centred ~1180
    label_pill = render_pill(beat.label, W // 2, 560)
    headline_svg, h_top, h_bot = render_headline(beat.headline, 920)

    if is_cta:
        body_svg = render_cta_pill('DM "OUTGROWN"', 1240)
    else:
        body_svg = render_body(beat.body, 1230)

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

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}"
                    width="{W}" height="{H}">
      {background}
      {chrome_top()}
      {chrome_bottom(idx, total)}
      <g opacity="{body_opacity:.3f}">
        {label_pill}
        {headline_svg}
        {body_svg}
      </g>
    </svg>"""

def render_frame(svg: str, path: Path) -> None:
    cairosvg.svg2png(bytestring=svg.encode("utf-8"),
                     output_width=W, output_height=H,
                     write_to=str(path))

# ------------------------------------------------------------ frames pass ---

def build_frames() -> List[Tuple[Path, float]]:
    """Render every frame, return list of (path, duration_seconds_of_this_segment)."""
    if FRAMES.exists():
        shutil.rmtree(FRAMES)
    FRAMES.mkdir()
    segments: List[Tuple[Path, float]] = []

    total = len(BEATS)
    frame_idx = 0
    for i, beat in enumerate(BEATS):
        n_frames = max(1, int(beat.duration * FPS))
        # Short fade-in over first 8 frames, then hold.
        for f in range(n_frames):
            t = min(1.0, (f + 1) / 8.0) if f < 8 else 1.0
            svg = beat_svg(beat, i, total, anim_t=t)
            p = FRAMES / f"f-{frame_idx:05d}.png"
            render_frame(svg, p)
            segments.append((p, 1.0 / FPS))
            frame_idx += 1

    return segments

# -------------------------------------------------------------- audio ---

def synth_audio(total_seconds: float) -> Path:
    """Numpy direct-synth: low drone + soft tick on every beat boundary."""
    sr = 44100
    n = int(total_seconds * sr)
    out = np.zeros(n, dtype=np.float32)

    # Low drone bed (110 Hz + soft 220 Hz harmonic)
    t = np.arange(n) / sr
    drone = 0.06 * np.sin(2 * np.pi * 110 * t) + 0.03 * np.sin(2 * np.pi * 220 * t)
    # gentle volume swell
    env = 0.5 + 0.5 * np.sin(2 * np.pi * 0.08 * t)
    out += (drone * env).astype(np.float32)

    # Beat hits at each beat boundary
    cursor = 0.0
    for i, beat in enumerate(BEATS):
        hit_t = cursor
        cursor += beat.duration
        idx = int(hit_t * sr)
        # tick = short sine burst with quick decay
        burst_n = int(0.18 * sr)
        ts = np.arange(burst_n) / sr
        freq = 880 if i == 0 else 660
        burst = 0.32 * np.sin(2 * np.pi * freq * ts) * np.exp(-ts * 28)
        # mint-style pluck — second harmonic
        burst += 0.16 * np.sin(2 * np.pi * (freq * 1.5) * ts) * np.exp(-ts * 40)
        end = min(idx + burst_n, n)
        out[idx:end] += burst[: end - idx].astype(np.float32)

    # Outro swell — gentle low-mid pad in last 2s
    swell_start = int((total_seconds - 2.0) * sr)
    if swell_start >= 0:
        ts = np.arange(n - swell_start) / sr
        swell = 0.10 * np.sin(2 * np.pi * 165 * ts) * (1 - np.exp(-ts * 4))
        out[swell_start:] += swell.astype(np.float32)

    # Normalize peak to ~0.9
    peak = np.max(np.abs(out))
    if peak > 0:
        out *= 0.85 / peak

    wav_path = OUT / "_audio.wav"
    with wave.open(str(wav_path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        ints = (out * 32767).astype(np.int16).tobytes()
        wf.writeframes(ints)
    return wav_path

# -------------------------------------------------------------- ffmpeg ---

def encode_video(segments: List[Tuple[Path, float]], audio: Path, out_mp4: Path) -> None:
    """Concat all frame PNGs into an mp4 at FPS, mux audio."""
    # Use the frames numbered sequentially → simple image2 input.
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
    total_seconds = sum(b.duration for b in BEATS)
    print(f"Total runtime: {total_seconds:.2f}s · {len(BEATS)} beats · {int(total_seconds*FPS)} frames")
    print("Rendering frames…")
    segments = build_frames()
    print(f"  rendered {len(segments)} frames")
    print("Synthesising audio…")
    audio = synth_audio(total_seconds)
    print(f"  wrote {audio.name}")
    print("Encoding mp4…")
    out_mp4 = OUT / "brandmint-outgrew-template.mp4"
    encode_video(segments, audio, out_mp4)
    print(f"\n✓ {out_mp4}")

if __name__ == "__main__":
    main()
