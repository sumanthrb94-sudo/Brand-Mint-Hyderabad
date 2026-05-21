"""
BrandMint Studios — quote-card generator.

Pure typographic still images in BrandMint aesthetic (no human portrait, no stock).
1080x1080 (IG feed) by default; pass SIZE=portrait for 1080x1350.

Layout primitive: eyebrow / oversized mint quote glyph / bold quote body with
mint-accented words / dual-foot attribution. Inspired by Dan Koe's grid posts
but stripped of all imagery.

Run:  python3 build_quote.py
Out:  out/quote-XX-slug.png
"""

from __future__ import annotations

import os
import re
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Tuple

import cairosvg
from PIL import ImageFont

# ---------------------------------------------------------------- tokens ---

INK = "#0A0E0C"
INK_2 = "#11181A"   # subtle gradient stop
PAPER = "#F5F1EA"
MINT = "#10B981"
MINT_SOFT = "#7CF6C8"
MUTE = "#8A8F8C"

# cairosvg falls back to DejaVu on this box; reference it directly so PIL
# measurement matches what cairosvg actually rasterises.
FONT_DISPLAY = "DejaVu Sans, Inter, system-ui, sans-serif"
FONT_MONO = "DejaVu Sans Mono, Menlo, monospace"

_DEJAVU_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
_DEJAVU_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
_font_cache: dict = {}

def _font(pt: int, mono: bool = False):
    key = (pt, mono)
    if key not in _font_cache:
        _font_cache[key] = ImageFont.truetype(_DEJAVU_MONO if mono else _DEJAVU_BOLD, pt)
    return _font_cache[key]

def measure(text: str, pt: int, mono: bool = False) -> float:
    if not text:
        return 0.0
    f = _font(pt, mono)
    # left, top, right, bottom; use the advance (right - left) for layout.
    l, _, r, _ = f.getbbox(text)
    return float(r - l)

SIZE = os.environ.get("SIZE", "square").lower()  # 'square' (1080x1080) | 'portrait' (1080x1350)
W = 1080
H = 1350 if SIZE == "portrait" else 1080

OUT_DIR = Path(__file__).parent / "out"
OUT_DIR.mkdir(exist_ok=True)

BANNED = {
    "innovative", "seamless", "scalable", "synergy", "leverage", "next-gen",
    "cutting-edge", "world-class", "best-in-class", "supercharge", "transform",
    "unlock", "empower", "revolutionize",
}

# ----------------------------------------------------------- data model ---

@dataclass
class Quote:
    slug: str
    eyebrow: str           # small top-left label (e.g. "SHIP", "BUILD", "STUDIO NOTE")
    body: str              # the quote — use {mint:words} to colour-accent
    attribution: str       # bottom-left (e.g. "BRANDMINT / STUDIO NOTE")
    handle: str = "brandmint.studios"
    body_size: int = 84    # auto-shrinks if needed


QUOTES: List[Quote] = [
    Quote(
        slug="01-edge-of-shipping",
        eyebrow="SHIP",
        body="THE {mint:GREATEST EDGE} A FOUNDER HAS IS DECREASING THE {mint:TIME} BETWEEN AN {mint:IDEA} AND ITS {mint:LAUNCH}.",
        attribution="BRANDMINT / STUDIO NOTE",
    ),
    Quote(
        slug="02-average-is-the-enemy",
        eyebrow="BUILD",
        body="{mint:AVERAGE} BRANDS BUY ADS. {mint:GREAT BRANDS} BUILD COMPOUND.",
        attribution="BRANDMINT / MANIFESTO",
        body_size=104,
    ),
    Quote(
        slug="03-templates-vs-platforms",
        eyebrow="OWN",
        body="A {mint:TEMPLATE} GETS YOU LIVE. A {mint:PLATFORM} GETS YOU PAID.",
        attribution="BRANDMINT / FIELD NOTE",
        body_size=104,
    ),
    Quote(
        slug="04-seven-week-window",
        eyebrow="SPEED",
        body="EVERY {mint:WEEK} YOU DELAY SHIPPING IS A {mint:WEEK} YOUR COMPETITOR {mint:LEARNS FASTER}.",
        attribution="BRANDMINT / STUDIO NOTE",
    ),
    Quote(
        slug="05-own-the-repo",
        eyebrow="CODE",
        body="IF YOU DON'T {mint:OWN THE REPO}, YOU DON'T OWN THE {mint:BRAND}.",
        attribution="BRANDMINT / BUILDER'S RULE",
        body_size=96,
    ),
    Quote(
        slug="06-three-second-rule",
        eyebrow="HOOK",
        body="YOU HAVE {mint:THREE SECONDS} TO PROVE YOU AREN'T A {mint:TEMPLATE}.",
        attribution="BRANDMINT / SCROLL ECONOMY",
        body_size=104,
    ),
]

# -------------------------------------------------------- text + layout ---

MINT_PAT = re.compile(r"\{mint:([^}]+)\}")

def parse_runs(body: str) -> List[Tuple[str, bool]]:
    """Return list of (text, is_mint) runs, preserving spaces between."""
    out: List[Tuple[str, bool]] = []
    i = 0
    for m in MINT_PAT.finditer(body):
        if m.start() > i:
            out.append((body[i:m.start()], False))
        out.append((m.group(1), True))
        i = m.end()
    if i < len(body):
        out.append((body[i:], False))
    return out


def check_voice(body: str) -> None:
    flat = body.lower()
    flat = MINT_PAT.sub(lambda m: m.group(1), flat).lower()
    for w in BANNED:
        if re.search(rf"\b{re.escape(w)}\b", flat):
            raise SystemExit(f"voice violation: banned word '{w}' in quote")


_PUNCT_ONLY = set(".,:;!?")

def _runs_to_words(runs: List[Tuple[str, bool]]) -> List[Tuple[str, bool]]:
    words: List[Tuple[str, bool]] = []
    for text, is_mint in runs:
        for p in text.split():
            words.append((p, is_mint))
    # Absorb punctuation-only tokens into the previous word so we don't
    # render a floating "." after a mint phrase.
    merged: List[Tuple[str, bool]] = []
    for w, flag in words:
        if merged and all(ch in _PUNCT_ONLY for ch in w):
            prev_w, prev_flag = merged[-1]
            merged[-1] = (prev_w + w, prev_flag)
        else:
            merged.append((w, flag))
    return merged

def wrap_runs(runs: List[Tuple[str, bool]], pt: int, max_w: float) -> List[List[Tuple[str, bool]]]:
    """Greedy word-wrap using true font metrics."""
    words = _runs_to_words(runs)
    lines: List[List[Tuple[str, bool]]] = []
    cur: List[Tuple[str, bool]] = []
    cur_w = 0.0
    space_w = measure(" ", pt)
    for word, flag in words:
        ww = measure(word, pt)
        add = ww if not cur else ww + space_w
        if cur and cur_w + add > max_w:
            lines.append(cur)
            cur = [(word, flag)]
            cur_w = ww
        else:
            cur.append((word, flag))
            cur_w += add
    if cur:
        lines.append(cur)
    return lines

def widest_line_w(lines, pt) -> float:
    space_w = measure(" ", pt)
    widest = 0.0
    for line in lines:
        ww = sum(measure(w, pt) for w, _ in line) + space_w * max(0, len(line) - 1)
        widest = max(widest, ww)
    return widest

def fit_quote(runs: List[Tuple[str, bool]], start_pt: int, max_w: float,
              max_lines: int) -> Tuple[int, List[List[Tuple[str, bool]]]]:
    pt = start_pt
    while pt >= 40:
        lines = wrap_runs(runs, pt, max_w)
        if len(lines) <= max_lines and widest_line_w(lines, pt) <= max_w:
            return pt, lines
        pt -= 4
    return pt, wrap_runs(runs, pt, max_w)


# -------------------------------------------------------------- render ---

def render_line(line: List[Tuple[str, bool]], pt: int, cx: int, y: int) -> str:
    """Render one centered line as separate per-word <text> elements with
    measured x positions. Each word is anchored at start so PIL-measured
    widths line up with cairosvg's raster."""
    space_w = measure(" ", pt)
    word_widths = [measure(w, pt) for w, _ in line]
    total_w = sum(word_widths) + space_w * max(0, len(line) - 1)
    start_x = cx - total_w / 2
    out: List[str] = []
    x = start_x
    for i, (word, is_mint) in enumerate(line):
        fill = MINT if is_mint else PAPER
        out.append(
            f'<text x="{x:.1f}" y="{y}" font-family="{FONT_DISPLAY}" '
            f'font-weight="700" font-size="{pt}" fill="{fill}" '
            f'text-anchor="start">{word}</text>'
        )
        x += word_widths[i] + space_w
    return "".join(out)


def build_svg(q: Quote) -> str:
    check_voice(q.body)
    runs = parse_runs(q.body)

    # Layout box for the quote — generous side margins, ~70px between lines at full size.
    side_pad = 96
    max_w = W - 2 * side_pad - 40
    max_lines = 6 if SIZE == "portrait" else 5

    pt, lines = fit_quote(runs, q.body_size, max_w, max_lines)
    line_h = int(pt * 1.06)

    # Vertical centering of the quote block, biased slightly toward upper-third.
    block_h = line_h * len(lines)
    quote_top = int(H * 0.42) - block_h // 2 + pt  # baseline of first line
    cx = W // 2

    line_svgs: List[str] = []
    for i, line in enumerate(lines):
        y = quote_top + i * line_h
        line_svgs.append(render_line(line, pt, cx, y))

    # Oversized opening quote glyph — sits above the first line, left-aligned.
    glyph_pt = 320
    open_q = (
        f'<text x="{side_pad - 12}" y="{quote_top - pt * 0.10:.0f}" '
        f'font-family="{FONT_DISPLAY}" font-weight="700" '
        f'font-size="{glyph_pt}" fill="{MINT}" opacity="0.18">&#8220;</text>'
    )
    # Closing glyph — anchored to right edge, sits just under last line.
    close_q_y = quote_top + (len(lines) - 1) * line_h + pt * 1.05
    close_q = (
        f'<text x="{W - side_pad + 12}" y="{close_q_y:.0f}" '
        f'font-family="{FONT_DISPLAY}" font-weight="700" '
        f'font-size="{glyph_pt}" fill="{MINT}" opacity="0.18" '
        f'text-anchor="end">&#8221;</text>'
    )

    # Subtle radial highlight (replaces the human-portrait fade) — soft mint in top-right.
    bg_grad = f"""
      <defs>
        <radialGradient id="bgGlow" cx="0.78" cy="0.22" r="0.6">
          <stop offset="0%" stop-color="{MINT}" stop-opacity="0.16"/>
          <stop offset="45%" stop-color="{MINT}" stop-opacity="0.04"/>
          <stop offset="100%" stop-color="{INK}" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="vignette" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="{INK_2}"/>
          <stop offset="55%" stop-color="{INK}"/>
          <stop offset="100%" stop-color="{INK}"/>
        </linearGradient>
      </defs>
    """

    # Top eyebrow + tiny tick.
    eyebrow_y = 92
    eyebrow = (
        f'<text x="{side_pad}" y="{eyebrow_y}" font-family="{FONT_MONO}" '
        f'font-size="22" font-weight="600" letter-spacing="0.32em" '
        f'fill="{PAPER}" opacity="0.86">{q.eyebrow}</text>'
        f'<line x1="{side_pad}" y1="{eyebrow_y + 14}" '
        f'x2="{side_pad + 56}" y2="{eyebrow_y + 14}" '
        f'stroke="{MINT}" stroke-width="3" stroke-linecap="round"/>'
    )

    # Footer block — attribution left, handle right, plus a thin rule above.
    foot_y = H - 90
    rule_y = H - 150
    footer = (
        f'<line x1="{side_pad}" y1="{rule_y}" x2="{W - side_pad}" y2="{rule_y}" '
        f'stroke="{PAPER}" stroke-opacity="0.12" stroke-width="1"/>'
        f'<text x="{side_pad}" y="{foot_y}" font-family="{FONT_MONO}" '
        f'font-size="20" font-weight="600" letter-spacing="0.22em" '
        f'fill="{PAPER}" opacity="0.78">{q.attribution}</text>'
        # IG glyph (rounded square + dot)
        f'<g transform="translate({W - side_pad - 240}, {foot_y - 22})">'
        f'  <rect x="0" y="0" width="28" height="28" rx="7" ry="7" '
        f'        fill="none" stroke="{PAPER}" stroke-opacity="0.78" stroke-width="2"/>'
        f'  <circle cx="14" cy="14" r="6" fill="none" stroke="{PAPER}" '
        f'          stroke-opacity="0.78" stroke-width="2"/>'
        f'  <circle cx="22" cy="6" r="1.6" fill="{PAPER}" opacity="0.78"/>'
        f'</g>'
        f'<text x="{W - side_pad - 200}" y="{foot_y}" font-family="{FONT_MONO}" '
        f'font-size="20" font-weight="600" letter-spacing="0.10em" '
        f'fill="{PAPER}" opacity="0.92">@{q.handle}</text>'
    )

    # Corner brackets — small typographic marks in mint to anchor composition.
    bracket_len = 28
    bracket_w = 3
    brackets = (
        # top-left
        f'<line x1="{side_pad - 24}" y1="36" x2="{side_pad - 24 + bracket_len}" y2="36" '
        f'stroke="{MINT}" stroke-width="{bracket_w}" stroke-linecap="square"/>'
        f'<line x1="{side_pad - 24}" y1="36" x2="{side_pad - 24}" y2="{36 + bracket_len}" '
        f'stroke="{MINT}" stroke-width="{bracket_w}" stroke-linecap="square"/>'
        # bottom-right
        f'<line x1="{W - side_pad + 24}" y1="{H - 36}" '
        f'x2="{W - side_pad + 24 - bracket_len}" y2="{H - 36}" '
        f'stroke="{MINT}" stroke-width="{bracket_w}" stroke-linecap="square"/>'
        f'<line x1="{W - side_pad + 24}" y1="{H - 36}" '
        f'x2="{W - side_pad + 24}" y2="{H - 36 - bracket_len}" '
        f'stroke="{MINT}" stroke-width="{bracket_w}" stroke-linecap="square"/>'
    )

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
      {bg_grad}
      <rect width="{W}" height="{H}" fill="url(#vignette)"/>
      <rect width="{W}" height="{H}" fill="url(#bgGlow)"/>
      {brackets}
      {eyebrow}
      {open_q}
      {''.join(line_svgs)}
      {close_q}
      {footer}
    </svg>"""
    return svg


def render_quote(q: Quote) -> Path:
    svg = build_svg(q)
    out = OUT_DIR / f"quote-{q.slug}.png"
    cairosvg.svg2png(bytestring=svg.encode("utf-8"),
                     output_width=W, output_height=H,
                     write_to=str(out))
    return out


def main() -> None:
    print(f"Format: {SIZE} ({W}x{H})")
    for q in QUOTES:
        path = render_quote(q)
        print(f"  ✓ {path.name}")
    print(f"\nWrote {len(QUOTES)} card(s) to {OUT_DIR}")


if __name__ == "__main__":
    main()
