"""
BrandMint Studios — 10-reel monthly content drop.

Built from a 10-agent parallel design pass. Each reel: 4-5 beats,
12-15s, silent (audio added in IG editor), Meta-safe-zone enforced.

Safe-zone: hero content lives in y=[200, 1500], x=[60, 1020].
Bottom 420px is the IG UI overlay (caption preview + actions) -
chrome URL anchors at y=1500, no hero content past it.

Outputs: out/reel-01.mp4 through out/reel-10.mp4
"""
import math
import os
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, List, Optional

import cairosvg

ROOT = Path(__file__).resolve().parent
FRAMES = ROOT / "frames"
OUT = ROOT / "out"
FRAMES.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1080, 1920
FPS = 30
CX = W / 2
# Hero content lives between SAFE_TOP and SAFE_BOTTOM
SAFE_TOP = 280
SAFE_BOTTOM = 1450
SAFE_MID = (SAFE_TOP + SAFE_BOTTOM) // 2  # = 865

# Tokens
BLACK = "#000000"
INK = "#0A0E0C"
CREAM = "#F5F1EA"
WHITE_CARD = "#FFFFFF"
LINE_LIGHT = "#E5E1D5"
MUTED = "#7C7468"
MINT_1 = "#D6F5E6"
MINT_3 = "#10B981"
MINT_4 = "#047857"
STRIKE = "#C44747"

DISPLAY = "Plus Jakarta Sans, Inter, system-ui, sans-serif"
MONO = "JetBrains Mono, ui-monospace, monospace"
BODY = "Inter, system-ui, sans-serif"


# ---------- easing ----------
def ease_out_cubic(t): return 1 - (1 - t) ** 3
def ease_in_out(t): return 0.5 * (1 - math.cos(math.pi * t)) if 0 <= t <= 1 else (0 if t < 0 else 1)
def clamp(x, lo=0.0, hi=1.0): return max(lo, min(hi, x))
def overshoot(t):
    c1 = 1.70158
    return 1 + (c1 + 1) * (t - 1) ** 3 + c1 * (t - 1) ** 2


# ---------- shared defs ----------
DEFS = f"""
<defs>
  <linearGradient id="mark" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#7CF6C8"/>
    <stop offset="100%" stop-color="{MINT_3}"/>
  </linearGradient>
</defs>
"""


def svg_wrap(bg, inner):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
        f'width="{W}" height="{H}">'
        f'<rect width="{W}" height="{H}" fill="{bg}"/>'
        f'{DEFS}{inner}'
        f'</svg>'
    )


def chrome(bg):
    """Top + bottom chrome anchored within Meta safe zone.
    BRANDMINT STUDIOS top label sits at y=180 (above safe-top, but visible).
    brandmint.studios URL sits at y=1500 (last row of safe zone).
    """
    if bg == BLACK:
        fg = CREAM
    elif bg == CREAM:
        fg = MUTED
    else:  # mint
        fg = INK
    glyph_size = 26
    text_w = 286
    block_w = glyph_size + 14 + text_w
    block_x = CX - block_w / 2
    return f"""
    <text x="{CX}" y="180" text-anchor="middle" font-family="{MONO}" font-size="20"
          letter-spacing="0.20em" fill="{fg}" opacity="0.65">BRANDMINT STUDIOS</text>
    <g opacity="0.65">
      <g transform="translate({block_x} {1480})" stroke="{fg}" fill="none" stroke-width="2.2">
        <rect x="0" y="0" width="{glyph_size}" height="{glyph_size}" rx="{glyph_size * 0.28}" ry="{glyph_size * 0.28}"/>
        <circle cx="{glyph_size/2}" cy="{glyph_size/2}" r="{glyph_size * 0.22}"/>
        <circle cx="{glyph_size * 0.76}" cy="{glyph_size * 0.24}" r="{glyph_size * 0.055}" fill="{fg}"/>
      </g>
      <text x="{block_x + glyph_size + 14}" y="{1500}" font-family="{MONO}"
            font-size="20" letter-spacing="0.06em" fill="{fg}">brandmint.studios</text>
    </g>
    """


# ============================================================
# LAYOUT PRIMITIVES (5 types, used across all 10 reels)
# ============================================================

def color_for_bg(bg):
    if bg == BLACK: return CREAM, MINT_3, "#a8a299"
    if bg == CREAM: return INK, MINT_3, MUTED
    if bg == MINT_3: return INK, INK, "#08110E"
    return CREAM, MINT_3, MUTED


def parse_lines(copy):
    """Split copy on ' / ' separator. Returns list of clean lines."""
    return [s.strip() for s in copy.split(" / ")]


def fit_font_size(text, max_width_px=940, base_size=110, min_size=48):
    """Auto-shrink font so the line fits within max_width_px."""
    # Plus Jakarta 600 average char width ratio ~0.55 of font-size
    est_w = len(text) * base_size * 0.55
    if est_w <= max_width_px:
        return base_size
    scaled = int(max_width_px / (len(text) * 0.55))
    return max(min_size, min(base_size, scaled))


def layout_hero_text(t, dur, copy, italic_word, bg):
    """1-2 big centered lines. If 2 lines, second is bigger + mint italic
    (when italic_word is set or starts the second line)."""
    fg, accent, sub = color_for_bg(bg)
    lines = parse_lines(copy)
    op1 = ease_out_cubic(clamp(t / 0.45))
    op2 = ease_out_cubic(clamp((t - 0.3) / 0.55))

    if len(lines) == 1:
        size1 = fit_font_size(lines[0], base_size=110)
        return f"""
        <text x="{CX}" y="{SAFE_MID}" text-anchor="middle" font-family="{DISPLAY}"
              font-size="{size1}" font-weight="600" letter-spacing="-0.025em"
              fill="{fg}" opacity="{op1}">{lines[0]}</text>
        """
    # Two-line: line 1 normal, line 2 mint italic if italic_word present
    italic_line2 = bool(italic_word and italic_word.strip("\"' *—") != "")
    fill2 = accent if italic_line2 else fg
    style2 = "italic" if italic_line2 else "normal"
    weight2 = 700 if italic_line2 else 600
    # Both lines auto-fit
    size1 = fit_font_size(lines[0], base_size=92)
    base2 = 110 if italic_line2 else 92
    size2 = fit_font_size(lines[1], base_size=base2)
    return f"""
    <text x="{CX}" y="{SAFE_MID - 60}" text-anchor="middle" font-family="{DISPLAY}"
          font-size="{size1}" font-weight="600" letter-spacing="-0.025em"
          fill="{fg}" opacity="{op1}">{lines[0]}</text>
    <text x="{CX}" y="{SAFE_MID + 80}" text-anchor="middle" font-family="{DISPLAY}"
          font-size="{size2}" font-weight="{weight2}" font-style="{style2}"
          letter-spacing="-0.025em" fill="{fill2}" opacity="{op2}">{lines[1]}</text>
    """


def layout_triple_lines(t, dur, copy, italic_word, bg):
    """3 stacked lines with mint dot bullets — left-aligned with 80px margin."""
    fg, accent, sub = color_for_bg(bg)
    lines = parse_lines(copy)[:3]
    line_h = 140
    start_y = SAFE_MID - line_h
    # Auto-fit each line's font
    sizes = [fit_font_size(ln, max_width_px=880, base_size=52, min_size=38) for ln in lines]
    out_svg = ""
    list_x = 90  # left margin for the list
    for i, ln in enumerate(lines):
        op_i = ease_out_cubic(clamp((t - 0.2 * i) / 0.45))
        dy = (1 - op_i) * 14
        y = start_y + i * line_h
        dot_y = y - 16
        out_svg += f"""
        <g opacity="{op_i}" transform="translate(0 {dy})">
          <circle cx="{list_x}" cy="{dot_y}" r="9" fill="{accent}"/>
          <text x="{list_x + 32}" y="{y}" font-family="{DISPLAY}" font-size="{sizes[i]}"
                font-weight="500" letter-spacing="-0.015em" fill="{fg}">{ln}</text>
        </g>
        """
    return out_svg


def layout_stat_card(t, dur, copy, italic_word, bg):
    """Big number on top + small label below."""
    fg, accent, sub = color_for_bg(bg)
    lines = parse_lines(copy)
    op1 = ease_out_cubic(clamp(t / 0.4))
    op2 = ease_out_cubic(clamp((t - 0.3) / 0.5))
    big = lines[0] if lines else ""
    label = lines[1] if len(lines) > 1 else ""
    big_size = 280 if len(big) <= 4 else 200 if len(big) <= 7 else 150
    return f"""
    <text x="{CX}" y="{SAFE_MID + 30}" text-anchor="middle" font-family="{MONO}"
          font-size="{big_size}" font-weight="700" letter-spacing="-0.03em"
          fill="{accent}" opacity="{op1}">{big}</text>
    <text x="{CX}" y="{SAFE_MID + 140}" text-anchor="middle" font-family="{BODY}"
          font-size="30" font-weight="400" fill="{fg}" opacity="{op2 * 0.78}">{label}</text>
    """


def layout_comparison(t, dur, copy, italic_word, bg):
    """Struck-out old + bigger new line. Copy = '~old~ / new'."""
    fg, accent, sub = color_for_bg(bg)
    lines = parse_lines(copy)
    op1 = ease_out_cubic(clamp(t / 0.4))
    op2 = ease_out_cubic(clamp((t - 0.5) / 0.5))
    old_text = lines[0] if lines else ""
    new_text = lines[1] if len(lines) > 1 else ""
    # Strip tilde markers from the old text
    old_clean = old_text.replace("~", "")
    # Estimate strike line width
    old_w = max(200, len(old_clean) * 22)
    # Auto-fit both lines
    old_size = fit_font_size(old_clean, max_width_px=900, base_size=44, min_size=24)
    new_size = fit_font_size(new_text, max_width_px=940, base_size=100, min_size=48)
    # Recompute strike width based on actual char count × size
    old_w = max(200, int(len(old_clean) * old_size * 0.55))
    return f"""
    <g opacity="{op1}">
      <text x="{CX}" y="{SAFE_MID - 100}" text-anchor="middle" font-family="{MONO}"
            font-size="{old_size}" font-weight="500" fill="{sub}">{old_clean}</text>
      <line x1="{CX - old_w/2}" y1="{SAFE_MID - 110}" x2="{CX + old_w/2}"
            y2="{SAFE_MID - 110}" stroke="{STRIKE}" stroke-width="3" stroke-linecap="round"/>
    </g>
    <text x="{CX}" y="{SAFE_MID + 90}" text-anchor="middle" font-family="{DISPLAY}"
          font-size="{new_size}" font-weight="700" letter-spacing="-0.025em"
          fill="{accent}" opacity="{op2}">{new_text}</text>
    """


def layout_cta_pill(t, dur, copy, italic_word, bg):
    """Mint pill with DM keyword. Centered. Ultra-symmetric rx=ry=H/2.
    Adds an eyebrow above the pill so the screen isn't visually empty."""
    fg, accent, sub = color_for_bg(bg)
    pill_t = clamp((t - 0.2) / 0.4)
    pill_op = ease_out_cubic(pill_t)
    pill_scale = 0.92 + overshoot(pill_t) * 0.08 if pill_t > 0 else 0.92
    eyebrow_op = ease_out_cubic(clamp(t / 0.4))

    # Adaptive font size based on copy length
    text_size = fit_font_size(copy, max_width_px=760, base_size=42, min_size=24)
    pill_w = 880
    pill_h = 180
    pill_y = SAFE_MID

    if bg == MINT_3:
        pill_fill = INK
        pill_text_color = CREAM
        eyebrow_fill = INK
    else:
        pill_fill = MINT_3
        pill_text_color = INK
        eyebrow_fill = accent

    return f"""
    <text x="{CX}" y="{SAFE_TOP + 260}" text-anchor="middle" font-family="{MONO}" font-size="24"
          letter-spacing="0.22em" fill="{eyebrow_fill}" opacity="{eyebrow_op * 0.85}">— YOUR MOVE</text>
    <g transform="translate({CX} {pill_y}) scale({pill_scale}) translate({-CX} {-pill_y})"
       opacity="{pill_op}">
      <rect x="{CX - pill_w/2}" y="{pill_y - pill_h/2}" width="{pill_w}" height="{pill_h}"
            rx="{pill_h/2}" ry="{pill_h/2}" fill="{pill_fill}"/>
      <text x="{CX}" y="{pill_y + text_size/3}" text-anchor="middle" font-family="{DISPLAY}"
            font-size="{text_size}" font-weight="600" fill="{pill_text_color}">{copy}</text>
    </g>
    """


LAYOUTS = {
    "hero_text":    layout_hero_text,
    "triple_lines": layout_triple_lines,
    "stat_card":    layout_stat_card,
    "comparison":   layout_comparison,
    "cta_pill":     layout_cta_pill,
}


# ============================================================
# Reel data — 10 reels, each 4 beats
# (synthesized from 10 parallel agent designs)
# ============================================================

@dataclass
class Beat:
    dur: float
    bg: str       # BLACK / CREAM / MINT_3
    layout: str   # one of LAYOUTS
    copy: str
    italic_word: str = "—"

@dataclass
class Reel:
    id: str
    title: str
    beats: List[Beat]


REELS: List[Reel] = [
    Reel("01-pain-pivot", "The Pain Pivot", [
        Beat(2.5, BLACK,  "hero_text",    "Bought the template. / Bought the plugin too.", "plugin"),
        Beat(3.5, CREAM,  "triple_lines", "Five tools duct-taped. / Launch in 9 days. / Nothing can break."),
        Beat(3.0, BLACK,  "hero_text",    "Templates are for average. / You are not.", "not"),
        Beat(3.5, MINT_3, "cta_pill",     "DM 'SCALE' to scope your build"),
    ]),

    Reel("02-speed-test", "The Speed Test", [
        Beat(2.5, BLACK,  "hero_text",    "Your site loads. / You just lost the sale.", "lost"),
        Beat(3.5, CREAM,  "comparison",   "~4.2s load~ / 0.8s"),
        Beat(2.5, BLACK,  "stat_card",    "+40% / conversion lift, measured"),
        Beat(3.0, MINT_3, "cta_pill",     "DM 'SPEED' for a free site audit"),
    ]),

    Reel("03-no-code-nightmare", "The No-Code Nightmare", [
        Beat(2.5, BLACK,  "hero_text",    "No-code is great. / Until it isn't.", "isn't"),
        Beat(4.5, CREAM,  "triple_lines", "Until a feature it can't ship. / Until it crawls past 100 users. / Until you can't export your data."),
        Beat(3.0, BLACK,  "hero_text",    "No-code is a start. / Code is the destination.", "destination"),
        Beat(3.5, MINT_3, "cta_pill",     "DM 'CODE' to plan your stack"),
    ]),

    Reel("04-three-second-rule", "The 3-Second Rule", [
        Beat(2.5, BLACK,  "stat_card",    "3 seconds. / to stay or leave"),
        Beat(4.0, CREAM,  "triple_lines", "What do you do? / Why should I care? / What should I do next?"),
        Beat(3.0, BLACK,  "hero_text",    "Most sites fail all three.", "fail"),
        Beat(3.5, MINT_3, "cta_pill",     "DM 'AUDIT' for a 24h review"),
    ]),

    Reel("05-landing-page-anatomy", "Landing Page Anatomy", [
        Beat(2.5, BLACK,  "hero_text",    "7 things every page needs. / Most pages have 3.", "3"),
        Beat(3.5, CREAM,  "triple_lines", "Headline names the pain. / Subhead promises the fix. / Visual proof of outcome."),
        Beat(3.5, CREAM,  "triple_lines", "Micro-copy kills objections. / Social proof from real buyers. / One CTA — never two."),
        Beat(3.0, MINT_3, "cta_pill",     "DM 'LANDING' for a page audit"),
    ]),

    Reel("06-d2c-transformation", "The D2C Transformation", [
        Beat(2.5, BLACK,  "hero_text",    "Same ad spend. / 3× the revenue.", "3×"),
        Beat(3.5, CREAM,  "comparison",   "~1.8% conv · ₹80K/mo~ / 4.6% conv · ₹3.8L/mo"),
        Beat(3.5, BLACK,  "stat_card",    "₹3.8 L / monthly revenue · 6 mo in"),
        Beat(3.0, MINT_3, "cta_pill",     "DM 'D2C' to scope your build"),
    ]),

    Reel("07-revenue-proof", "The Revenue Proof", [
        Beat(2.5, BLACK,  "stat_card",    "₹12 Cr+ / revenue generated for clients"),
        Beat(4.0, CREAM,  "triple_lines", "50+ custom platforms built. / 8 countries served. / 0 abandoned at scale."),
        Beat(2.5, BLACK,  "hero_text",    "Numbers don't lie. / Neither do we.", "lie"),
        Beat(3.0, MINT_3, "cta_pill",     "DM 'RESULTS' to scope your build"),
    ]),

    Reel("08-price-objection", "The Price Objection", [
        Beat(2.5, BLACK,  "hero_text",    "'Custom is too expensive.' / Wrong.", "Wrong"),
        Beat(4.0, CREAM,  "comparison",   "~₹25K/mo × 36 = ₹9,00,000~ / ₹4,50,000 once. You own it."),
        Beat(3.0, BLACK,  "hero_text",    "Custom is cheaper. / You just pay upfront.", "cheaper"),
        Beat(3.5, MINT_3, "cta_pill",     "DM 'MATH' for your stack's TCO"),
    ]),

    Reel("09-limited-capacity", "The Limited Capacity", [
        Beat(2.5, BLACK,  "hero_text",    "We take 4 projects. / Per month. Only.", "Only"),
        Beat(3.0, MINT_3, "stat_card",    "1 slot left. / this month"),
        Beat(2.5, BLACK,  "hero_text",    "Quality over volume.", "Quality"),
        Beat(3.0, MINT_3, "cta_pill",     "DM 'SLOT' to claim it"),
    ]),

    Reel("10-manifesto", "The Manifesto", [
        Beat(3.0, BLACK,  "hero_text",    "Average. / Is the enemy of great.", "enemy"),
        Beat(5.0, BLACK,  "triple_lines", "We don't download themes — we write code. / We don't resell plugins — we architect systems. / We don't post and pray — we engineer revenue."),
        Beat(3.0, BLACK,  "hero_text",    "Built in Hyderabad. / Shipped worldwide.", "Hyderabad"),
        Beat(4.0, MINT_3, "cta_pill",     "DM 'MINT' to refuse average"),
    ]),
]


# ============================================================
# Pipeline
# ============================================================

def render_beat_svg(t, beat):
    inner = LAYOUTS[beat.layout](t, beat.dur, beat.copy, beat.italic_word, beat.bg)
    return svg_wrap(beat.bg, chrome(beat.bg) + inner)


def render_reel(reel: Reel):
    """Render one reel: per-beat PNG sequence + ffmpeg encode + xfade mux."""
    reel_dir = FRAMES / reel.id
    reel_dir.mkdir(parents=True, exist_ok=True)
    # Clean old frames
    for f in reel_dir.glob("*.png"):
        f.unlink()

    # Render frames per beat, then per-beat mp4s
    beat_clips = []
    for bi, beat in enumerate(reel.beats):
        bdir = reel_dir / f"beat-{bi:02d}"
        bdir.mkdir(exist_ok=True)
        for f in bdir.glob("*.png"):
            f.unlink()
        n = int(round(beat.dur * FPS))
        for i in range(n):
            t = i / FPS
            svg = render_beat_svg(t, beat)
            cairosvg.svg2png(
                bytestring=svg.encode("utf-8"),
                write_to=str(bdir / f"f-{i:04d}.png"),
                output_width=W, output_height=H,
            )
        # Encode beat clip
        clip = reel_dir / f"beat-{bi:02d}.mp4"
        subprocess.run([
            "ffmpeg", "-y",
            "-framerate", str(FPS),
            "-i", str(bdir / "f-%04d.png"),
            "-frames:v", str(n),
            "-c:v", "libx264", "-preset", "medium", "-crf", "20",
            "-pix_fmt", "yuv420p", "-r", str(FPS),
            str(clip),
        ], check=True, capture_output=True)
        beat_clips.append(clip)

    # Mux clips with xfade
    out_mp4 = OUT / f"reel-{reel.id}.mp4"
    inputs = []
    for c in beat_clips:
        inputs += ["-i", str(c)]
    XFADE = 0.20
    chain = [f"[{i}:v]format=yuv420p,fps={FPS},setsar=1[v{i}]" for i in range(len(beat_clips))]
    last = "[v0]"
    cum = reel.beats[0].dur
    xfade_parts = []
    for i in range(1, len(beat_clips)):
        offset = cum - XFADE
        out_label = f"[x{i}]" if i < len(beat_clips) - 1 else "[vmix]"
        xfade_parts.append(
            f"{last}[v{i}]xfade=transition=fade:duration={XFADE}:offset={offset:.3f}{out_label}"
        )
        last = out_label
        cum += reel.beats[i].dur - XFADE
    final = f"{last}fade=t=in:st=0:d=0.3,fade=t=out:st={cum - 0.4}:d=0.4[vout]"
    filtergraph = ";".join(chain + xfade_parts + [final])
    subprocess.run([
        "ffmpeg", "-y", *inputs,
        "-filter_complex", filtergraph,
        "-map", "[vout]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "22",
        "-tune", "stillimage", "-pix_fmt", "yuv420p", "-r", str(FPS),
        "-movflags", "+faststart",
        str(out_mp4),
    ], check=True, capture_output=True)

    size_mb = out_mp4.stat().st_size / 1024 / 1024
    return out_mp4, cum, size_mb


def main():
    only = os.environ.get("BMINT_ONLY", "").strip()  # e.g. '01' to render just reel 01
    for reel in REELS:
        if only and not reel.id.startswith(only):
            continue
        try:
            path, dur, size = render_reel(reel)
            print(f"[done] {path.name}  {dur:.1f}s  {size:.2f} MB  ({reel.title})")
        except subprocess.CalledProcessError as e:
            print(f"[fail] {reel.id}: {e.stderr.decode()[-500:] if e.stderr else 'unknown'}")


if __name__ == "__main__":
    main()
