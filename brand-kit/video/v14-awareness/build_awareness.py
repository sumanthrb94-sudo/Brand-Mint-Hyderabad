"""
BrandMint Studios — Awareness Reel · ~18s motion-graphics social ad.

Built straight from brand-kit/PLAYBOOK-VIRAL-REELS.md mechanics:
  #1 Hook text by frame 1 (no logo bumper)
  #3 Pattern-interrupt formula: "Most Hyderabad founders don't know this."
  #6 Comment-trigger CTA: "Comment 'AUDIT' for a free 48h teardown"
  #7 Cuts every 1.5-2.0s, zoom-punch on emphasis words

Voice differs from v13 editorial reels — this is the **growth** vehicle,
not the brand-polish one. White + 5px black stroke captions per §2 of
the playbook, top-18% hook placement, mint accent for the brand reveal,
hard cuts (no fades).

Out:  brand-kit/video/v14-awareness/out/brandmint-awareness-{bpm}bpm.mp4
Run:  python3 build_awareness.py
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
BPM = int(os.environ.get("BPM", "60"))   # 1 beat = 1.00s → 19s total (playbook target 18-22s)
BEAT_SEC = 60.0 / BPM
def beats(n: float) -> float: return n * BEAT_SEC

# ----- viral palette (per playbook §2) ------------------------------------

WHITE = "#FFFFFF"
BLACK = "#0D0D0D"
STROKE = "#000000"
MINT = "#10B981"            # brand thread — brand reveal + CTA pill
MINT_2 = "#7CF6C8"          # highlight (lime accent on emphasis words)
YELLOW = "#FFD60A"          # keyword highlight (per §2 fill_highlight option)
PAPER = "#F5F1EA"           # used only on the brand-reveal beat

# Brand Mint typography per brand-kit/BRAND-GUIDELINES.md §4:
#   Display  = Plus Jakarta Sans (ExtraBold 800 for hero, Bold 700 for body)
#   Italic   = Plus Jakarta Sans SemiBold Italic (for the angle/emphasis)
#   Numerals = JetBrains Mono Bold (for labels, IDs, monospaced UI marks)
# (Inter is the body face but this reel has no body copy — only display.)
FONT_DISPLAY = "Plus Jakarta Sans, system-ui, sans-serif"
FONT_SERIF = "Plus Jakarta Sans, system-ui, sans-serif"  # italic via font-style
FONT_MONO = "JetBrains Mono, ui-monospace, monospace"
_DEJAVU_BOLD = "/usr/local/share/fonts/brandmint/PlusJakartaSans-ExtraBold.ttf"
_DEJAVU_SERIF_BOLD = "/usr/local/share/fonts/brandmint/PlusJakartaSans-SemiBoldItalic.ttf"
_DEJAVU_MONO = "/usr/local/share/fonts/brandmint/JetBrainsMono-Bold.ttf"

HERE = Path(__file__).parent
FRAMES = HERE / "frames"
OUT = HERE / "out"
FRAMES.mkdir(exist_ok=True)
OUT.mkdir(exist_ok=True)

# ----- type fitting (per SPACING-GUIDELINES.md) ---------------------------

SAFE_TEXT_W = 920

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

# ----- beat schedule (8 cuts @ ~1.5-2.5s = 16.7s total) -------------------
# Target: 18-22s per playbook §2. Cuts every 1.0-1.5s per mechanic #7.
#   hook 3 + pain1 2 + pain2 2 + pain3 2 + setup 3 + proof 3 + cta 4
#   = 19 beats × ~0.55s ≈ 10.5s — too fast. Bump to ~2.5b avg.
# Final: 16 beats total × 0.555s ≈ 8.9s × 2 = ~18s.

@dataclass
class Beat:
    kind: str
    duration: float
    top: str = ""             # hook line (white+stroke, top-18%)
    big: str = ""             # center display (white or mint)
    sub: str = ""             # supporting line below big
    highlight: str = ""       # one word in `big` to colour in mint/yellow
    tag: str = ""             # mono caption at bottom

BEATS: List[Beat] = [
    # 0:00-0:03  HOOK (frame 1) — pattern interrupt
    Beat(kind="hook", duration=beats(3.0),
         top="MOST HYDERABAD FOUNDERS",
         big="DON'T KNOW THIS.",
         highlight="DON'T"),

    # 0:03-0:05  Pain 1
    Beat(kind="pain", duration=beats(2.0),
         top="THEIR WEBSITE IS",
         big="INVISIBLE",
         sub="to Google."),

    # 0:05-0:07  Pain 2
    Beat(kind="pain", duration=beats(2.0),
         top="THEIR LOGO IS",
         big="LOUDER",
         sub="than their offer."),

    # 0:07-0:09  Pain 3
    Beat(kind="pain", duration=beats(2.0),
         top="THEIR INSTAGRAM LOOKS",
         big="LIKE 2014.",
         sub="(brochure energy.)"),

    # 0:09-0:12  Switch / brand reveal
    Beat(kind="brand", duration=beats(3.0),
         big="BRAND MINT",
         sub="Hyderabad's premium digital studio."),

    # 0:12-0:15  Proof
    Beat(kind="proof", duration=beats(3.0),
         top="200+ SITES SHIPPED",
         big="₹500 Cr+",
         sub="in client revenue influenced.",
         highlight="₹500 Cr+"),

    # 0:15-0:19  CTA (mechanic #6)
    Beat(kind="cta", duration=beats(4.0),
         top="WANT A FREE BRAND TEARDOWN?",
         big='COMMENT  "AUDIT"',
         sub="We'll DM a 48-hour scope.",
         highlight='"AUDIT"'),
]

TOTAL_S = sum(b.duration for b in BEATS)
TOTAL_F = int(round(TOTAL_S * FPS))

# ----- timing helpers -----------------------------------------------------

def beat_at(t_sec: float):
    cursor = 0.0
    for i, b in enumerate(BEATS):
        if t_sec < cursor + b.duration:
            local = (t_sec - cursor) / b.duration if b.duration > 0 else 1.0
            return i, max(0.0, min(1.0, local)), b
        cursor += b.duration
    return len(BEATS) - 1, 1.0, BEATS[-1]

# ----- easing + animation helpers -----------------------------------------

def lerp(a, b, t): return a + (b - a) * t

def clamp01(t: float) -> float:
    return 0.0 if t < 0 else 1.0 if t > 1 else t

def ease_out_cubic(t: float) -> float:
    """Snappy entrances — fast start, gentle settle."""
    t = clamp01(t)
    return 1 - (1 - t) ** 3

def ease_in_cubic(t: float) -> float:
    """Mirror — gentle start, fast finish (use for exits)."""
    t = clamp01(t)
    return t ** 3

def ease_in_out(t: float) -> float:
    t = clamp01(t)
    return 0.5 - 0.5 * math.cos(math.pi * t)

def smoothstep(edge0: float, edge1: float, x: float) -> float:
    t = clamp01((x - edge0) / (edge1 - edge0)) if edge1 > edge0 else 0.0
    return t * t * (3 - 2 * t)

def beat_envelope(local: float, in_t: float = 0.18,
                  out_t: float = 0.12) -> dict:
    """Standard beat envelope:
       0..in_t          → entrance (slide-up + fade-in, ease-out-cubic)
       in_t..(1-out_t)  → hold with subtle breathing
       (1-out_t)..1     → exit (fade-out, ease-in-cubic)
    Returns dict of {alpha, slide_y, breathe, punch}.
    """
    if local < in_t:
        alpha = ease_out_cubic(local / in_t)
        slide_y = lerp(40, 0, ease_out_cubic(local / in_t))
    elif local > 1 - out_t:
        alpha = 1 - ease_in_cubic((local - (1 - out_t)) / out_t)
        slide_y = lerp(0, -20, ease_in_cubic((local - (1 - out_t)) / out_t))
    else:
        alpha = 1.0
        # Continuous gentle breathing during hold — never linear, never flat.
        hold_local = (local - in_t) / (1 - in_t - out_t)
        slide_y = 2 * math.sin(hold_local * math.pi * 2)  # ±2px sway

    # Zoom-punch on the emphasis word — peaks at local=0.42, decays by 0.55
    punch_t = (local - 0.42) / 0.13
    punch = 1.0 + 0.06 * max(0.0, 1.0 - abs(punch_t)) if -1 <= punch_t <= 1 else 1.0

    # Slow background breathe (independent of beat envelope, used for bg scale)
    breathe = 1.0 + 0.008 * math.sin(local * math.pi * 1.8)

    return {"alpha": alpha, "slide_y": slide_y,
            "punch": punch, "breathe": breathe}

# ----- shared background --------------------------------------------------

def bg_for(kind: str) -> str:
    """Black canvas only. The mint pillar (brand beat) and mint CTA bar
    (cta beat) are painted INSIDE their render_* functions so they can
    animate (slide up from below) instead of popping into place."""
    return f'<rect width="{W}" height="{H}" fill="{BLACK}"/>'

# ----- text helpers -------------------------------------------------------

def stroked_text(text: str, x: int, y: int, pt: int, fill: str,
                 anchor: str = "middle", weight: int = 900,
                 letter_spacing: str = "-0.02em",
                 kind_font: str = FONT_DISPLAY,
                 stroke_w: int = 0) -> str:
    """Display text in brand-mint typography.

    NOTE on stroke: the playbook §2 calls for a 5px black stroke for
    legibility on busy/bright backgrounds. On our solid-black beats it
    would be invisible AND `paint-order="stroke fill"` would eat the
    visible silhouette of every glyph, making the font look thin.
    Default stroke_w=0 here; only pass stroke_w>0 when rendering over a
    bright fill (mint pillar, image bg, etc.).
    """
    stroke_attr = (
        f'stroke="{STROKE}" stroke-width="{stroke_w}" '
        f'paint-order="stroke fill" stroke-linejoin="round" '
        if stroke_w > 0 else ""
    )
    return (
        f'<text x="{x}" y="{y}" font-family="{kind_font}" '
        f'font-size="{pt}" font-weight="{weight}" fill="{fill}" '
        f'{stroke_attr}'
        f'text-anchor="{anchor}" letter-spacing="{letter_spacing}">'
        f"{esc(text)}</text>"
    )

# ----- scene renderers ----------------------------------------------------

def render_hook(b: Beat, local: float) -> str:
    """Frame 1 hook. Slide-up + fade-in on entry, zoom-punch on the
    payoff word at local≈0.42, fade-out at the end."""
    env = beat_envelope(local, in_t=0.22, out_t=0.10)
    cx = W // 2
    top_pt = fit_to_width(b.top, SAFE_TEXT_W, 88, floor_pt=56)
    big_pt = int(fit_to_width(b.big, SAFE_TEXT_W, 168, floor_pt=72) * env["punch"])

    return f"""
      <g opacity="{env['alpha']:.3f}" transform="translate(0 {env['slide_y']:.2f})">
        {stroked_text(b.top, cx, int(H * 0.20), top_pt, WHITE,
                      letter_spacing="0.02em", weight=800)}

        {stroked_text(b.big, cx, int(H * 0.55), big_pt, MINT_2,
                      letter_spacing="-0.025em")}

        <text x="{cx}" y="{int(H * 0.85)}" font-family="{FONT_MONO}"
              font-size="22" font-weight="700" fill="{WHITE}"
              text-anchor="middle" letter-spacing="0.30em"
              opacity="{0.70 * env['alpha']:.3f}">
          KEEP WATCHING.
        </text>
      </g>
    """

def render_pain(b: Beat, local: float) -> str:
    env = beat_envelope(local, in_t=0.24, out_t=0.16)
    cx = W // 2
    top_pt = fit_to_width(b.top, SAFE_TEXT_W, 72, floor_pt=44)
    big_pt = int(fit_to_width(b.big, SAFE_TEXT_W, 200, floor_pt=110) * env["punch"])
    sub_pt = fit_to_width(b.sub, SAFE_TEXT_W, 60, floor_pt=40, kind="serif")
    # Sub line enters slightly later for a staggered feel.
    sub_alpha = smoothstep(0.30, 0.50, local) * env["alpha"]

    return f"""
      <g opacity="{env['alpha']:.3f}" transform="translate(0 {env['slide_y']:.2f})">
        {stroked_text(b.top, cx, int(H * 0.28), top_pt, WHITE,
                      letter_spacing="0.04em", weight=700)}

        {stroked_text(b.big, cx, int(H * 0.55), big_pt, YELLOW,
                      letter_spacing="-0.03em")}
      </g>
      <text x="{cx}" y="{int(H * 0.68)}" font-family="{FONT_SERIF}"
            font-size="{sub_pt}" font-weight="700" fill="{WHITE}"
            text-anchor="middle" font-style="italic"
            opacity="{sub_alpha:.3f}">
        {esc(b.sub)}
      </text>
    """

def render_brand(b: Beat, local: float) -> str:
    """Mint pillar slides UP from below the canvas to its resting band
    over the first 30% of the beat, ease-out-cubic. Text fades in inside
    the pillar after the pillar arrives."""
    cx = W // 2

    pillar_t = clamp01(local / 0.30)
    pillar_top = lerp(H, 600, ease_out_cubic(pillar_t))
    pillar_h = 720

    text_t = smoothstep(0.18, 0.42, local)
    text_drift = lerp(20, 0, ease_out_cubic(text_t))

    # Exit fade in the last 12%
    text_alpha = text_t
    if local > 0.88:
        out = ease_in_cubic((local - 0.88) / 0.12)
        text_alpha *= (1 - out)
        pillar_top -= 40 * out

    big_pt = fit_to_width(b.big, SAFE_TEXT_W, start_pt=168, floor_pt=110)

    # Each line enters with its own small delay for a staggered cascade.
    we_are_a = smoothstep(0.18, 0.32, local) * (1 if local <= 0.88 else max(0, 1 - (local - 0.88) / 0.12))
    big_a = smoothstep(0.24, 0.40, local) * (1 if local <= 0.88 else max(0, 1 - (local - 0.88) / 0.12))
    sub_a = smoothstep(0.32, 0.50, local) * (1 if local <= 0.88 else max(0, 1 - (local - 0.88) / 0.12))
    url_a = smoothstep(0.40, 0.58, local) * (1 if local <= 0.88 else max(0, 1 - (local - 0.88) / 0.12))

    return f"""
      <!-- mint pillar slides up -->
      <rect x="0" y="{pillar_top:.2f}" width="{W}" height="{pillar_h}"
            fill="{MINT}"/>

      <g transform="translate(0 {pillar_top - 600 + text_drift:.2f})">
        <text x="{cx}" y="720"
              font-family="{FONT_MONO}" font-size="28" font-weight="700"
              letter-spacing="0.40em" fill="{BLACK}" text-anchor="middle"
              opacity="{0.65 * we_are_a:.3f}">
          WE ARE
        </text>

        <text x="{cx}" y="900"
              font-family="{FONT_DISPLAY}" font-size="{big_pt}"
              font-weight="900" fill="{BLACK}" text-anchor="middle"
              letter-spacing="-0.025em"
              opacity="{big_a:.3f}">
          {esc(b.big)}
        </text>

        <text x="{cx}" y="1070"
              font-family="{FONT_SERIF}" font-size="40" font-weight="700"
              fill="{BLACK}" text-anchor="middle" font-style="italic"
              opacity="{sub_a:.3f}">
          {esc(b.sub)}
        </text>

        <text x="{cx}" y="1230"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              letter-spacing="0.30em" fill="{BLACK}" text-anchor="middle"
              opacity="{0.75 * url_a:.3f}">
          BRANDMINTSTUDIOS.IN
        </text>
      </g>
    """

def render_proof(b: Beat, local: float) -> str:
    env = beat_envelope(local, in_t=0.22, out_t=0.14)
    cx = W // 2
    top_pt = fit_to_width(b.top, SAFE_TEXT_W, 60, floor_pt=44)
    # Strong zoom-punch on the ₹500 Cr+ figure
    big_pt = int(fit_to_width(b.big, SAFE_TEXT_W, 200, floor_pt=120) * env["punch"])
    sub_alpha = smoothstep(0.30, 0.50, local) * env["alpha"]

    return f"""
      <g opacity="{env['alpha']:.3f}" transform="translate(0 {env['slide_y']:.2f})">
        {stroked_text(b.top, cx, int(H * 0.28), top_pt, WHITE,
                      letter_spacing="0.10em", weight=700)}

        {stroked_text(b.big, cx, int(H * 0.55), big_pt, MINT_2,
                      letter_spacing="-0.02em")}
      </g>
      <text x="{cx}" y="{int(H * 0.72)}" font-family="{FONT_SERIF}"
            font-size="44" font-weight="700" fill="{WHITE}"
            text-anchor="middle" font-style="italic"
            opacity="{sub_alpha:.3f}">
        {esc(b.sub)}
      </text>
    """

def render_cta(b: Beat, local: float) -> str:
    """CTA bar slides UP from below over the first 25% of the beat.
    Text fades in after the bar. Continuous mint pulse on the CTA word."""
    cx = W // 2

    bar_t = clamp01(local / 0.25)
    bar_top = lerp(H, 1450, ease_out_cubic(bar_t))
    bar_h = 280

    body_t = smoothstep(0.05, 0.30, local)
    body_drift = lerp(20, 0, ease_out_cubic(body_t))

    # Continuous pulse on the CTA word
    pulse = 1.0 + 0.035 * (0.5 + 0.5 * math.sin(local * 2 * math.pi * 1.5))

    top_pt = fit_to_width(b.top, SAFE_TEXT_W, 60, floor_pt=44)
    big_pt = int(fit_to_width(b.big, SAFE_TEXT_W, 152, floor_pt=84) * pulse)
    sub_pt = fit_to_width(b.sub, SAFE_TEXT_W, 56, floor_pt=40, kind="serif")
    sub_alpha = smoothstep(0.35, 0.55, local)

    return f"""
      <g opacity="{body_t:.3f}" transform="translate(0 {body_drift:.2f})">
        {stroked_text(b.top, cx, int(H * 0.28), top_pt, WHITE,
                      letter_spacing="0.06em", weight=800)}

        {stroked_text(b.big, cx, int(H * 0.50), big_pt, MINT_2,
                      letter_spacing="-0.02em")}
      </g>
      <text x="{cx}" y="{int(H * 0.63)}" font-family="{FONT_SERIF}"
            font-size="{sub_pt}" font-weight="700" fill="{WHITE}"
            text-anchor="middle" font-style="italic"
            opacity="{sub_alpha:.3f}">
        {esc(b.sub)}
      </text>

      <!-- mint CTA bar (slides up) -->
      <rect x="0" y="{bar_top:.2f}" width="{W}" height="{bar_h}"
            fill="{MINT}"/>

      <g transform="translate(0 {bar_top - 1450:.2f})">
        <text x="{cx}" y="1620"
              font-family="{FONT_DISPLAY}" font-size="52" font-weight="900"
              fill="{BLACK}" text-anchor="middle" letter-spacing="0.04em">
          @brandmint.studios
        </text>
        <text x="{cx}" y="1690"
              font-family="{FONT_MONO}" font-size="26" font-weight="700"
              fill="{BLACK}" text-anchor="middle" letter-spacing="0.30em">
          HYDERABAD  ·  HITEC CITY
        </text>
      </g>
    """

# ----- compose ------------------------------------------------------------

def compose_svg(t_sec: float) -> str:
    _, local, b = beat_at(t_sec)
    bg = bg_for(b.kind)

    if b.kind == "hook":
        body = render_hook(b, local)
    elif b.kind == "pain":
        body = render_pain(b, local)
    elif b.kind == "brand":
        body = render_brand(b, local)
    elif b.kind == "proof":
        body = render_proof(b, local)
    elif b.kind == "cta":
        body = render_cta(b, local)
    else:
        body = ""

    # No black flash — entrances are now smooth slide+fade so the
    # scene-break is intrinsic to the animation, not a hard cut.
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"
     viewBox="0 0 {W} {H}">
  {bg}
  {body}
</svg>
"""

# ----- frame + render -----------------------------------------------------

def render_frame(i: int) -> Path:
    t = i / FPS
    svg = compose_svg(t)
    out = FRAMES / f"f{i:05d}.png"
    cairosvg.svg2png(bytestring=svg.encode(), output_width=W,
                     output_height=H, write_to=str(out))
    return out

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
# Punchy lo-fi/tech beat: sub thump on every beat boundary, sparse high-hat,
# slight high-mid bell on the cta. Mono, 48k, normalised to ~-14 LUFS-ish.

def synth_audio(out_wav: Path):
    sr = 48000
    n = int(TOTAL_S * sr)
    t = np.arange(n) / sr

    # Sub-bass thumps on every cut boundary
    track = np.zeros(n)
    cursor = 0.0
    for b in BEATS:
        i = int(cursor * sr)
        dur = int(0.35 * sr)
        if i + dur <= n:
            env = np.exp(-np.linspace(0, 7, dur))
            thump = np.sin(2 * np.pi * 56 * np.arange(dur) / sr)
            noise = np.random.normal(0, 1, dur) * 0.18
            track[i:i + dur] += env * (0.65 * thump + 0.30 * noise)
        cursor += b.duration

    # Sparse high-hat-ish ticks every 0.25s
    for tick_t in np.arange(0.1, TOTAL_S, 0.25):
        i = int(tick_t * sr)
        dur = int(0.04 * sr)
        if i + dur <= n:
            env = np.exp(-np.linspace(0, 14, dur))
            tick = np.random.normal(0, 1, dur) * env * 0.20
            track[i:i + dur] += tick

    # Bell on the CTA beat (last beat)
    cta_start = sum(b.duration for b in BEATS[:-1])
    i = int(cta_start * sr)
    dur = int(1.0 * sr)
    if i + dur <= n:
        env = np.exp(-np.linspace(0, 3.5, dur))
        bell = (np.sin(2 * np.pi * 880 * np.arange(dur) / sr) +
                0.4 * np.sin(2 * np.pi * 1320 * np.arange(dur) / sr))
        track[i:i + dur] += env * bell * 0.18

    # Master fade
    fade = int(0.5 * sr)
    env = np.ones(n)
    env[:fade] = np.linspace(0, 1, fade)
    env[-fade:] = np.linspace(1, 0, fade)
    track = track * env

    peak = float(np.max(np.abs(track))) or 1.0
    track = track / peak * 0.75
    pcm = (track * 32767).astype(np.int16)

    with wave.open(str(out_wav), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
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
    print(f"\nBrandMint awareness reel · BPM={BPM} · target {TOTAL_S:.1f}s")

    render_all_frames()

    audio = OUT / "_audio.wav"
    print("  synth audio...")
    synth_audio(audio)

    scored = OUT / f"brandmint-awareness-{BPM}bpm.mp4"
    silent = OUT / f"brandmint-awareness-{BPM}bpm-silent.mp4"

    mux(scored, with_audio=True)
    mux(silent, with_audio=False)

    print(f"\n  ✓ {scored.relative_to(HERE.parent.parent)}")
    print(f"  ✓ {silent.relative_to(HERE.parent.parent)}\n")

if __name__ == "__main__":
    main()
