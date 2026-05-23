"""
BrandMint — Render 30 IG post covers + caption files from the master plan.

Reads brand-kit/content/30-posts/post-*.md (one file per post), parses
out hook/caption/hashtags/format/pillar, and emits for each post:
   posts-ready/post-NN/cover.png    1080x1350 visual (IG portrait)
   posts-ready/post-NN/caption.txt  caption + hashtags (paste-ready)

Cover style: v13 frame system (warm-black ground, paper-cream serif,
mint accent, letterbox bars). Each cover shows post number + pillar
chip + the hook as a serif statement + @brandmint.studios footer.

Run:  python3 render_30_posts.py
"""

from __future__ import annotations

import re
import textwrap
from pathlib import Path

import cairosvg
from PIL import ImageFont

# ----- canvas / palette ----------------------------------------------------

W, H = 1080, 1350          # IG portrait 4:5
BAR_H = 80                 # letterbox bar

INK = "#070a09"
INK_2 = "#10171a"
PAPER = "#f5f1ea"
PAPER_DIM = "#a3b2ac"
MINT = "#10b981"
MINT_2 = "#7cf6c8"
MINT_DEEP = "#047857"

FONT_DISPLAY = "DejaVu Sans, Inter, sans-serif"
FONT_SERIF = "DejaVu Serif, Georgia, serif"
FONT_MONO = "DejaVu Sans Mono, Menlo, monospace"
_DEJAVU_SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"

# Pillar → short chip label
PILLAR_CHIP = {
    "Behind-the-scenes / process": "BTS",
    "Industry intel / market data": "MARKET INTEL",
    "Brand positioning for developers": "BRAND POSITIONING",
    "Lifestyle & locality": "LIFESTYLE",
    "Builder spotlight / series extension": "BUILDER SPOTLIGHT",
    "Builder spotlights / series extensions": "BUILDER SPOTLIGHT",
    "Engagement / poll / hot take": "HOT TAKE",
}

HERE = Path(__file__).parent.resolve()
SRC = HERE.parent / "content" / "30-posts"
OUT = HERE.parent / "content" / "posts-ready"
OUT.mkdir(parents=True, exist_ok=True)

# ----- parse ---------------------------------------------------------------

def parse_post(md_text: str) -> dict:
    """Pull structured fields out of a post-NN-*.md file."""
    fields = {}

    m = re.search(r"^- \*\*#:\*\*\s*(\d+)", md_text, re.MULTILINE)
    fields["num"] = m.group(1) if m else "00"

    m = re.search(r"^- \*\*Pillar:\*\*\s*(.+)$", md_text, re.MULTILINE)
    fields["pillar"] = m.group(1).strip() if m else ""

    m = re.search(r"^- \*\*Format:\*\*\s*(.+)$", md_text, re.MULTILINE)
    fields["format"] = m.group(1).strip() if m else ""

    m = re.search(r'^- \*\*Hook:\*\*\s*"?(.+?)"?\s*$', md_text, re.MULTILINE)
    fields["hook"] = m.group(1).strip().strip('"').strip("`") if m else ""

    # Caption: everything between **Caption:** and **Visual concept:**
    m = re.search(
        r"^- \*\*Caption:\*\*\s*\n(.+?)\n- \*\*Visual concept:",
        md_text, re.DOTALL | re.MULTILINE,
    )
    fields["caption"] = m.group(1).strip() if m else ""

    m = re.search(r"^- \*\*Hashtags:\*\*\s*(.+?)(?:\n- |\Z)",
                  md_text, re.MULTILINE | re.DOTALL)
    if m:
        # collapse whitespace, keep #tags
        tags_raw = m.group(1).strip()
        fields["hashtags"] = " ".join(tags_raw.split())
    else:
        fields["hashtags"] = ""

    m = re.search(r"^- \*\*Best time to post:\*\*\s*(.+?)\.\s",
                  md_text, re.MULTILINE)
    fields["when"] = (m.group(1).strip() + ".") if m else ""

    return fields

# ----- typography wrap (display serif) -------------------------------------

def _font(pt: int):
    return ImageFont.truetype(_DEJAVU_SERIF, pt)

def fits(text: str, pt: int, max_w_px: float) -> bool:
    l, _, r, _ = _font(pt).getbbox(text)
    return (r - l) <= max_w_px

def wrap_serif(text: str, pt: int, max_w_px: float) -> list[str]:
    """Greedy word-wrap to lines that fit within max_w_px at the given pt."""
    words = text.split()
    lines: list[str] = []
    cur: list[str] = []
    for w in words:
        candidate = " ".join(cur + [w])
        if fits(candidate, pt, max_w_px) or not cur:
            cur.append(w)
        else:
            lines.append(" ".join(cur))
            cur = [w]
    if cur:
        lines.append(" ".join(cur))
    return lines

def fit_hook(hook: str, max_w_px: float, max_lines: int = 5,
             start_pt: int = 92) -> tuple[list[str], int]:
    """Pick the largest pt that fits the hook in <= max_lines."""
    for pt in range(start_pt, 38, -4):
        lines = wrap_serif(hook, pt, max_w_px)
        if len(lines) <= max_lines:
            return lines, pt
    # fallback
    return wrap_serif(hook, 44, max_w_px)[:max_lines], 44

# ----- xml-safe ------------------------------------------------------------

def esc(s: str) -> str:
    return (s.replace("&", "&amp;").replace("<", "&lt;")
             .replace(">", "&gt;").replace('"', "&quot;"))

# ----- svg render ----------------------------------------------------------

def render_cover_svg(p: dict) -> str:
    num = p["num"]
    pillar_label = PILLAR_CHIP.get(p["pillar"], p["pillar"].upper()[:18])
    fmt = p["format"].upper()
    hook = p["hook"]

    # Hook block: 5 lines max in a 900px-wide region
    hook_lines, hook_pt = fit_hook(hook, max_w_px=900, max_lines=5)
    line_h = int(hook_pt * 1.15)
    block_h = line_h * len(hook_lines)

    # Vertical centering of the hook block
    safe_top = BAR_H + 240
    safe_bot = H - BAR_H - 280
    safe_h = safe_bot - safe_top
    block_top = safe_top + (safe_h - block_h) // 2

    cx = W // 2

    # Render hook lines
    hook_svg = ""
    for i, line in enumerate(hook_lines):
        y = block_top + (i + 1) * line_h - int(line_h * 0.25)
        hook_svg += (
            f'<text x="{cx}" y="{y}" font-family="{FONT_SERIF}" '
            f'font-size="{hook_pt}" font-weight="700" fill="{PAPER}" '
            f'text-anchor="middle" letter-spacing="-0.005em">'
            f"{esc(line)}</text>"
        )

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"
     viewBox="0 0 {W} {H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="{INK_2}"/>
      <stop offset="55%" stop-color="{INK}"/>
      <stop offset="100%" stop-color="{INK}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.78">
      <stop offset="0%" stop-color="{MINT}" stop-opacity="0.10"/>
      <stop offset="55%" stop-color="{MINT_DEEP}" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="{INK}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grain" x="0" y="0" width="3" height="3"
             patternUnits="userSpaceOnUse">
      <rect width="3" height="3" fill="{INK}"/>
      <circle cx="1.5" cy="1.5" r="0.4" fill="{PAPER}" opacity="0.035"/>
    </pattern>
  </defs>

  <rect width="{W}" height="{H}" fill="url(#bg)"/>
  <rect width="{W}" height="{H}" fill="url(#glow)"/>
  <rect width="{W}" height="{H}" fill="url(#grain)" opacity="0.55"/>

  <!-- letterbox bars -->
  <rect x="0" y="0" width="{W}" height="{BAR_H}" fill="#000"/>
  <rect x="0" y="{H - BAR_H}" width="{W}" height="{BAR_H}" fill="#000"/>
  <line x1="0" y1="{BAR_H}" x2="{W}" y2="{BAR_H}"
        stroke="{MINT}" stroke-opacity="0.25" stroke-width="1"/>
  <line x1="0" y1="{H - BAR_H}" x2="{W}" y2="{H - BAR_H}"
        stroke="{MINT}" stroke-opacity="0.25" stroke-width="1"/>

  <!-- top chrome: handle left, post number right -->
  <text x="56" y="54" font-family="{FONT_MONO}" font-size="18"
        font-weight="700" letter-spacing="0.22em" fill="{PAPER}" opacity="0.72">
    @brandmint.studios
  </text>
  <text x="{W - 56}" y="54" font-family="{FONT_MONO}" font-size="18"
        font-weight="700" letter-spacing="0.22em" fill="{MINT}"
        text-anchor="end" opacity="0.85">
    POST {esc(num)} / 30
  </text>

  <!-- header zone: pillar chip + format -->
  <g transform="translate({cx}, {BAR_H + 140})">
    <rect x="-200" y="-44" width="400" height="64" rx="32"
          fill="none" stroke="{MINT}" stroke-width="1.5"/>
    <text x="0" y="-2" font-family="{FONT_MONO}" font-size="20"
          font-weight="700" letter-spacing="0.30em"
          fill="{MINT}" text-anchor="middle">{esc(pillar_label)}</text>
    <text x="0" y="62" font-family="{FONT_MONO}" font-size="16"
          font-weight="700" letter-spacing="0.30em"
          fill="{PAPER_DIM}" text-anchor="middle">{esc(fmt)}</text>
  </g>

  <!-- hook -->
  {hook_svg}

  <!-- closer rule -->
  <line x1="{cx - 60}" y1="{H - BAR_H - 200}"
        x2="{cx + 60}" y2="{H - BAR_H - 200}"
        stroke="{MINT}" stroke-width="2"/>

  <!-- closer block -->
  <text x="{cx}" y="{H - BAR_H - 140}"
        font-family="{FONT_SERIF}" font-size="32" font-weight="700"
        font-style="italic" fill="{MINT_2}" text-anchor="middle">
    Hyderabad's Empires
  </text>
  <text x="{cx}" y="{H - BAR_H - 90}"
        font-family="{FONT_MONO}" font-size="18" font-weight="700"
        letter-spacing="0.30em" fill="{PAPER_DIM}" text-anchor="middle">
    EDITORIAL  ·  REAL-ESTATE  ·  HYDERABAD
  </text>

  <!-- bottom chrome -->
  <text x="56" y="{H - 30}" font-family="{FONT_MONO}" font-size="14"
        font-weight="700" letter-spacing="0.30em" fill="{PAPER_DIM}">
    SAVE  ·  SHARE  ·  FOLLOW
  </text>
  <text x="{W - 56}" y="{H - 30}" font-family="{FONT_MONO}" font-size="14"
        font-weight="700" letter-spacing="0.30em" fill="{PAPER_DIM}"
        text-anchor="end">
    BRAND  ·  MINT  ·  STUDIOS
  </text>
</svg>
"""

# ----- caption render ------------------------------------------------------

def make_caption_txt(p: dict) -> str:
    """Caption ready to paste: hook line + body + breathing dots + hashtags."""
    parts = []
    if p["caption"]:
        parts.append(p["caption"].strip())
    parts.append("")
    parts.append(".")
    parts.append(".")
    parts.append(".")
    if p["hashtags"]:
        parts.append(p["hashtags"])
    return "\n".join(parts) + "\n"

# ----- driver --------------------------------------------------------------

def render_all() -> None:
    md_files = sorted(SRC.glob("post-*.md"))
    print(f"Rendering {len(md_files)} posts → {OUT}")

    for md in md_files:
        p = parse_post(md.read_text())
        num = p["num"]
        post_dir = OUT / f"post-{num}"
        post_dir.mkdir(exist_ok=True)

        # 1. Cover image
        svg = render_cover_svg(p)
        cover_path = post_dir / "cover.png"
        cairosvg.svg2png(bytestring=svg.encode(), output_width=W,
                         output_height=H, write_to=str(cover_path))

        # 2. Caption text
        caption_path = post_dir / "caption.txt"
        caption_path.write_text(make_caption_txt(p))

        # 3. Quick meta sidecar (format + post-time, for the scheduler)
        meta = (
            f"Post #{num}\n"
            f"Pillar: {p['pillar']}\n"
            f"Format: {p['format']}\n"
            f"Best time: {p['when']}\n"
        )
        (post_dir / "meta.txt").write_text(meta)

        print(f"  ✓ post-{num}  ({p['format']})  {p['hook'][:50]}")

if __name__ == "__main__":
    render_all()
