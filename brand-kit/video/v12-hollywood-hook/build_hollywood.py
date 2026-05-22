"""
BrandMint Studios — v12 "Hollywood trending hook" awareness reel.

Cinematic-grammar Instagram reel for top-of-funnel awareness:
letterbox bars, deep INK vignette, slow push-in zoom per beat,
letter-by-letter type reveal, mint impact flashes between acts,
synthesised low-rumble + tonal-hit audio. No copyrighted music,
no trending-audio reference, no movie-dialogue quotes — all
original BrandMint voice.

Out:    out/brandmint-hollywood-hook.mp4  (1080×1920, 30fps, ~15s)
Audio:  numpy direct-synth — sub drone + tonal hits + mint swell.

Run:    python3 build_hollywood.py
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

# ---------------------------------------------------------------- tempo ---
# All cuts snap to a BPM grid so the video syncs to any audio at this tempo.
# Set BPM to match the trending audio you're pairing with in Canva / IG.
#   90  → cinematic / lo-fi
#   100 → mid-tempo pop
#   120 → mainstream pop, Bollywood remix, "trending"  ← default
#   128 → EDM standard
#   140 → trap / drill
BPM = int(os.environ.get("BPM", "120"))
BEAT_SEC = 60.0 / BPM            # seconds per musical beat
def beats(n: float) -> float:    # convenience: 2 beats → seconds
    return n * BEAT_SEC

INK = "#070a09"
INK_2 = "#10171a"
PAPER = "#f5f1ea"
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

# Letterbox bars (always visible — cinematic frame).
BAR_H = 130

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

# ------------------------------------------------------------ beat model ---

@dataclass
class Beat:
    text: str
    duration: float
    kind: str = "title"          # title | metric | flash | brandmark | cta
    accent: str = ""             # word inside text to render in mint
    sub: str = ""                # small supporting line (cta / brandmark)

# Each beat's duration is expressed in MUSICAL beats (whole numbers), so the
# whole reel snaps to the BPM grid. At 120 BPM this gives 15.5s total; at
# 100 BPM = 18.6s; at 140 BPM = 13.3s. The visual cuts always land on beat
# boundaries no matter which audio you pair with.
BEATS: List[Beat] = [
    Beat(text="MOST FOUNDERS",          duration=beats(3), kind="title"),
    Beat(text="BLAME THE MARKET.",      duration=beats(3), kind="title"),
    Beat(text="",                       duration=beats(1), kind="flash"),
    Beat(text="IT WAS NEVER THE MARKET.", duration=beats(4), kind="title", accent="NEVER"),
    Beat(text="IT WAS THE TEMPLATE.",   duration=beats(4), kind="title", accent="TEMPLATE"),
    Beat(text="",                       duration=beats(1), kind="flash"),
    Beat(text="FROM ZERO.",             duration=beats(2), kind="metric"),
    Beat(text="IN SEVEN WEEKS.",        duration=beats(2), kind="metric"),
    Beat(text="ONE SENIOR TEAM.",       duration=beats(3), kind="metric"),
    Beat(text="BRANDMINT STUDIOS",
         duration=beats(4), kind="brandmark",
         sub="Custom websites · Internal tools · Brand systems"),
    Beat(text='DM "BUILD"',             duration=beats(4), kind="cta",
         sub="brandmint.studios · HITEC City, Hyderabad"),
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
    """Return (beat_index, local_t_normalised, beat)."""
    cursor = 0.0
    for i, b in enumerate(BEATS):
        if t_sec < cursor + b.duration:
            local = (t_sec - cursor) / b.duration if b.duration > 0 else 1.0
            return i, max(0.0, min(1.0, local)), b
        cursor += b.duration
    return len(BEATS) - 1, 1.0, BEATS[-1]

# ----------------------------------------------------- letterbox + bg ---

def background(scale: float) -> str:
    """Background with letterbox bars + slow-zoom radial vignette."""
    # Scale subtly increases by ~5% across each beat → cinematic push-in.
    radius = 0.7 * scale
    return f"""
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="{INK_2}"/>
          <stop offset="50%" stop-color="{INK}"/>
          <stop offset="100%" stop-color="{INK}"/>
        </linearGradient>
        <radialGradient id="glow" cx="0.5" cy="0.5" r="{radius:.3f}">
          <stop offset="0%" stop-color="{MINT}" stop-opacity="0.10"/>
          <stop offset="60%" stop-color="{MINT}" stop-opacity="0.02"/>
          <stop offset="100%" stop-color="{INK}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="{W}" height="{H}" fill="url(#bg)"/>
      <rect width="{W}" height="{H}" fill="url(#glow)"/>

      <!-- letterbox bars -->
      <rect x="0" y="0" width="{W}" height="{BAR_H}" fill="#000"/>
      <rect x="0" y="{H - BAR_H}" width="{W}" height="{BAR_H}" fill="#000"/>

      <!-- thin mint hairlines beneath bars (cinematic gate) -->
      <line x1="0" y1="{BAR_H}" x2="{W}" y2="{BAR_H}"
            stroke="{MINT}" stroke-opacity="0.18" stroke-width="1"/>
      <line x1="0" y1="{H - BAR_H}" x2="{W}" y2="{H - BAR_H}"
            stroke="{MINT}" stroke-opacity="0.18" stroke-width="1"/>
    """

def chrome_overlay(beat_idx: int, intro_t: float) -> str:
    """Tiny IG handle in top-left bar + film-strip ticks in top-right.
    intro_t fades the chrome in during the first 0.5s of the reel."""
    op = min(1.0, intro_t)
    ticks: List[str] = []
    for i in range(6):
        x = W - 80 - i * 22
        ticks.append(
            f'<rect x="{x}" y="58" width="10" height="14" fill="{PAPER}" opacity="{0.35 * op:.3f}"/>'
        )
    return f"""
      <g opacity="{op:.3f}">
        <text x="64" y="78" font-family="{FONT_MONO}" font-size="22"
              font-weight="700" letter-spacing="0.18em" fill="{PAPER}"
              opacity="0.78">@brandmint.studios</text>
        {''.join(ticks)}
      </g>
    """

# ------------------------------------------------------ text rendering ---

def render_title(beat: Beat, local: float, scale: float) -> str:
    """Big bold headline, letter-by-letter reveal during first 35% of beat,
    centred in the safe area between the bars, with optional mint accent
    on a single word."""
    if not beat.text:
        return ""
    reveal_progress = min(1.0, local / 0.35)
    n_chars = max(1, int(round(reveal_progress * len(beat.text))))
    shown = beat.text[:n_chars]

    # Word-aware wrap of the FULL text (not just shown), then mask the trail.
    # Choose font size that fits within 920px line width on the longest line.
    max_w = W - 160
    words = beat.text.split(" ")

    # Greedy wrap at a fixed font size first; auto-shrink until it fits.
    pt = 124
    while pt > 60:
        lines: List[str] = []
        cur = ""
        for w in words:
            t = (cur + " " + w).strip()
            if measure(t, pt) <= max_w:
                cur = t
            else:
                if cur:
                    lines.append(cur)
                cur = w
        if cur:
            lines.append(cur)
        if max(measure(l, pt) for l in lines) <= max_w and len(lines) <= 3:
            break
        pt -= 6

    # Now mask the wrapped lines to show only the first `n_chars` characters
    # of the full text (so the reveal sweeps line-by-line correctly).
    chars_so_far = 0
    rendered_lines: List[str] = []
    for line in lines:
        # +1 accounts for the space we removed when wrapping
        chars_in_line = len(line)
        if chars_so_far + chars_in_line <= n_chars:
            rendered_lines.append(line)
            chars_so_far += chars_in_line + 1  # +1 for the wrap space
        elif chars_so_far < n_chars:
            visible = n_chars - chars_so_far
            rendered_lines.append(line[:visible])
            chars_so_far = n_chars
            break
        else:
            break

    line_h = int(pt * 1.06)
    block_h = line_h * len(rendered_lines)
    cy = H // 2
    start_y = cy - block_h // 2 + int(pt * 0.85)

    svgs: List[str] = []
    cx = W // 2
    # Apply gentle scale around centre using SVG <g transform>.
    for i, line in enumerate(rendered_lines):
        y = start_y + i * line_h
        # Render accent word in mint if present and fully visible
        if beat.accent and beat.accent in line:
            before, _, after = line.partition(beat.accent)
            # SVG <text> strips surrounding whitespace, so manage spaces explicitly
            before_trail_space = before.endswith(" ")
            after_lead_space = after.startswith(" ")
            before = before.rstrip()
            after = after.lstrip()
            space_w = measure(" ", pt)
            w_before = measure(before, pt)
            w_accent = measure(beat.accent, pt)
            w_after = measure(after, pt)
            gap_before = space_w if before_trail_space else 0
            gap_after = space_w if after_lead_space else 0
            total_w = w_before + gap_before + w_accent + gap_after + w_after
            x_start = cx - total_w / 2
            x = x_start
            if before:
                svgs.append(
                    f'<text x="{x:.1f}" y="{y}" font-family="{FONT_DISPLAY}" '
                    f'font-weight="800" font-size="{pt}" fill="{PAPER}" '
                    f'letter-spacing="-0.01em" text-anchor="start">{before}</text>'
                )
                x += w_before + gap_before
            else:
                x += gap_before
            svgs.append(
                f'<text x="{x:.1f}" y="{y}" font-family="{FONT_DISPLAY}" '
                f'font-weight="800" font-size="{pt}" fill="{MINT}" '
                f'letter-spacing="-0.01em" text-anchor="start">{beat.accent}</text>'
            )
            x += w_accent + gap_after
            if after:
                svgs.append(
                    f'<text x="{x:.1f}" y="{y}" font-family="{FONT_DISPLAY}" '
                    f'font-weight="800" font-size="{pt}" fill="{PAPER}" '
                    f'letter-spacing="-0.01em" text-anchor="start">{after}</text>'
                )
        else:
            svgs.append(
                f'<text x="{cx}" y="{y}" font-family="{FONT_DISPLAY}" '
                f'font-weight="800" font-size="{pt}" fill="{PAPER}" '
                f'letter-spacing="-0.01em" text-anchor="middle">{line}</text>'
            )

    # Scale around centre
    return f'<g transform="translate({cx} {cy}) scale({scale:.3f}) translate({-cx} {-cy})">{"".join(svgs)}</g>'

def render_metric(beat: Beat, local: float, scale: float) -> str:
    """Single big phrase, slam-in fade with subtle scale."""
    pt = 140
    while pt > 80 and measure(beat.text, pt) > W - 160:
        pt -= 4
    # slam-in: opacity ramps fast (0-15%), scale settles
    op = min(1.0, local / 0.15)
    slam_scale = 1.06 - 0.06 * ease_out_cubic(min(1.0, local / 0.25))
    final_scale = scale * slam_scale
    cx, cy = W // 2, H // 2
    return f"""
      <g transform="translate({cx} {cy}) scale({final_scale:.3f}) translate({-cx} {-cy})"
         opacity="{op:.3f}">
        <text x="{cx}" y="{cy + int(pt*0.35)}" font-family="{FONT_DISPLAY}"
              font-weight="800" font-size="{pt}" fill="{PAPER}"
              letter-spacing="-0.01em" text-anchor="middle">{beat.text}</text>
      </g>
    """

def render_flash(beat: Beat, local: float) -> str:
    """Full-screen mint impact flash that fades to nothing."""
    op = max(0.0, 1.0 - local) * 0.92
    return f'<rect width="{W}" height="{H}" fill="{MINT}" opacity="{op:.3f}"/>'

def render_brandmark(beat: Beat, local: float, scale: float) -> str:
    """BrandMint M-logo + wordmark + tagline.  Logo grows in, mark fades up."""
    # logo: mint gradient rounded square with the M stroke
    logo_size = int(260 * lerp(0.85, 1.0, ease_out_cubic(min(1.0, local / 0.4))))
    lx = W // 2 - logo_size // 2
    ly = int(H * 0.40) - logo_size // 2
    r = int(logo_size * 0.18)
    # M-path scaled into the box (favicon viewBox 32, path 9-23 / 10-22)
    sc = logo_size / 32
    sw = 2.6 * sc * 0.9
    def px(v): return lx + v * sc
    def py(v): return ly + v * sc
    d = (f"M {px(9):.1f} {py(22):.1f} V {py(10):.1f} L {px(16):.1f} {py(16):.1f} "
         f"L {px(23):.1f} {py(10):.1f} V {py(22):.1f}")

    # wordmark + tagline fade up after 0.35s of the beat
    txt_op = min(1.0, max(0.0, (local - 0.20) / 0.35))
    word_y = ly + logo_size + 90
    tag_y = word_y + 70
    return f"""
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="{MINT_2}"/>
          <stop offset="100%" stop-color="{MINT}"/>
        </linearGradient>
      </defs>
      <rect x="{lx}" y="{ly}" width="{logo_size}" height="{logo_size}"
            rx="{r}" ry="{r}" fill="url(#logoGrad)"/>
      <path d="{d}" stroke="{INK}" stroke-width="{sw:.1f}"
            stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <g opacity="{txt_op:.3f}">
        <text x="{W//2}" y="{word_y}" font-family="{FONT_DISPLAY}"
              font-weight="800" font-size="80" fill="{PAPER}"
              letter-spacing="-0.005em" text-anchor="middle">{beat.text}</text>
        <text x="{W//2}" y="{tag_y}" font-family="{FONT_MONO}" font-size="24"
              font-weight="600" letter-spacing="0.10em" fill="{PAPER}"
              opacity="0.75" text-anchor="middle">{beat.sub}</text>
      </g>
    """

def render_cta(beat: Beat, local: float) -> str:
    """Big mint pill that scales in with a confident slam."""
    pt = 64
    pad_x = 90
    ph = 160
    txt_w = measure(beat.text, pt)
    pw = int(txt_w + pad_x * 2)
    cx, cy = W // 2, int(H * 0.46)
    rad = ph // 2
    pill_scale = lerp(0.7, 1.0, ease_out_cubic(min(1.0, local / 0.35)))
    op = min(1.0, local / 0.20)
    return f"""
      <g transform="translate({cx} {cy}) scale({pill_scale:.3f}) translate({-cx} {-cy})"
         opacity="{op:.3f}">
        <rect x="{cx - pw//2}" y="{cy - ph//2}" width="{pw}" height="{ph}"
              rx="{rad}" ry="{rad}" fill="{MINT}"/>
        <text x="{cx}" y="{cy + 22}" font-family="{FONT_DISPLAY}"
              font-weight="800" font-size="{pt}" fill="{INK}"
              letter-spacing="0.02em" text-anchor="middle">{beat.text}</text>
      </g>
      <text x="{W//2}" y="{cy + 200}" font-family="{FONT_MONO}" font-size="26"
            font-weight="600" letter-spacing="0.12em" fill="{PAPER}"
            opacity="{op * 0.85:.3f}" text-anchor="middle">{beat.sub}</text>
    """

# ----------------------------------------------------------- compose ---

def frame_svg(t_sec: float) -> str:
    idx, local, beat = beat_at(t_sec)

    # Scale grows from 1.0 to 1.04 across the duration of each text beat.
    scale = 1.0 + 0.04 * ease_in_out(local)

    intro_t = min(1.0, t_sec / 0.5)
    bg = background(scale)
    chrome = chrome_overlay(idx, intro_t)

    if beat.kind == "flash":
        content = render_flash(beat, local)
    elif beat.kind == "metric":
        content = render_metric(beat, local, scale)
    elif beat.kind == "brandmark":
        content = render_brandmark(beat, local, scale)
    elif beat.kind == "cta":
        content = render_cta(beat, local)
    else:
        content = render_title(beat, local, scale)

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}"
                    width="{W}" height="{H}">
      {bg}
      {content}
      {chrome}
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

    # Sub-rumble bed: 55 Hz + 110 Hz harmonic, modulated by slow LFO
    drone = 0.10 * np.sin(2 * np.pi * 55 * t) + 0.05 * np.sin(2 * np.pi * 110 * t)
    lfo = 0.5 + 0.5 * np.sin(2 * np.pi * 0.12 * t)
    out += (drone * lfo).astype(np.float32)

    # Tonal hit at each beat boundary
    cursor = 0.0
    for i, beat in enumerate(BEATS):
        idx = int(cursor * sr)
        if beat.kind == "flash":
            # Mint flash = white-noise crash + rising sine sweep
            burst_n = int(0.32 * sr)
            ts = np.arange(burst_n) / sr
            noise = (np.random.rand(burst_n) * 2 - 1) * 0.35 * np.exp(-ts * 14)
            sweep_f = 220 + 800 * ts / 0.32
            sweep = 0.30 * np.sin(2 * np.pi * sweep_f * ts) * np.exp(-ts * 10)
            burst = (noise + sweep).astype(np.float32)
        elif beat.kind == "brandmark":
            # Mint chord swell — long, warm
            burst_n = int(0.9 * sr)
            ts = np.arange(burst_n) / sr
            chord = (0.18 * np.sin(2 * np.pi * 165 * ts)
                     + 0.14 * np.sin(2 * np.pi * 220 * ts)
                     + 0.10 * np.sin(2 * np.pi * 330 * ts))
            burst = (chord * (1 - np.exp(-ts * 5)) * np.exp(-ts * 1.2)).astype(np.float32)
        elif beat.kind == "cta":
            # Confident sub-thump
            burst_n = int(0.6 * sr)
            ts = np.arange(burst_n) / sr
            thump = 0.45 * np.sin(2 * np.pi * 110 * ts) * np.exp(-ts * 6)
            thump += 0.20 * np.sin(2 * np.pi * 220 * ts) * np.exp(-ts * 10)
            burst = thump.astype(np.float32)
        else:
            # Standard tonal hit — mid sine with quick decay
            burst_n = int(0.22 * sr)
            ts = np.arange(burst_n) / sr
            freq = 260 if beat.kind == "title" else 440
            burst = 0.32 * np.sin(2 * np.pi * freq * ts) * np.exp(-ts * 22)
            burst += 0.14 * np.sin(2 * np.pi * (freq * 1.5) * ts) * np.exp(-ts * 32)
            burst = burst.astype(np.float32)
        end = min(idx + len(burst), n)
        out[idx:end] += burst[: end - idx]
        cursor += beat.duration

    # Final 0.6s tail fade
    tail_n = int(0.6 * sr)
    if tail_n < n:
        fade = np.linspace(1.0, 0.0, tail_n)
        out[-tail_n:] *= fade

    # Normalise peak to ~0.9
    peak = float(np.max(np.abs(out)))
    if peak > 0:
        out *= 0.88 / peak

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
        "-crf", "19",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        "-movflags", "+faststart",
        str(out_mp4),
    ]
    subprocess.run(cmd, check=True)

# ---------------------------------------------------------------- main ---

def main() -> None:
    print(f"Runtime: {TOTAL_SECONDS:.2f}s · {len(BEATS)} beats · {TOTAL_FRAMES} frames")
    print("Rendering frames…")
    build_frames()
    print("Synthesising audio…")
    audio = synth_audio()
    print("Encoding mp4…")
    out_mp4 = OUT / f"brandmint-hollywood-hook-{BPM}bpm.mp4"
    encode_video(audio, out_mp4)
    print(f"\n✓ {out_mp4}")

if __name__ == "__main__":
    main()
