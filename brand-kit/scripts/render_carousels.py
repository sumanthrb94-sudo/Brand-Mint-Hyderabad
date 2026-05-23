"""
BrandMint — Render carousel body + CTA slides for the 16 carousel posts.

Consumes the SLIDES dict from carousel_slides.py (per-post slide content,
designed by the editorial agent) and emits slide-N.png files into the
matching posts-ready/post-NN/ folder.

Each post folder ends up with:
  cover.png      slide 1 — the hook (already rendered by render_30_posts.py)
  slide-2.png    first body slide
  slide-3.png    ...
  slide-N.png    CTA closer

Run:  python3 render_carousels.py
"""

from __future__ import annotations

from pathlib import Path

import cairosvg
from PIL import ImageFont

from carousel_slides import SLIDES

# ----- canvas / palette ----------------------------------------------------

W, H = 1080, 1350
BAR_H = 80

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

HERE = Path(__file__).parent.resolve()
OUT = HERE.parent / "content" / "posts-ready"

# ----- type fitting --------------------------------------------------------

def _font(pt: int):
    return ImageFont.truetype(_DEJAVU_SERIF, pt)

def fits(text: str, pt: int, max_w_px: float) -> bool:
    l, _, r, _ = _font(pt).getbbox(text)
    return (r - l) <= max_w_px

def fit_title(lines: list[str], max_w_px: float = 920,
              start_pt: int = 96) -> int:
    """Largest pt at which every title line fits within max_w_px."""
    for pt in range(start_pt, 36, -4):
        if all(fits(line, pt, max_w_px) for line in lines):
            return pt
    return 40

def fit_body(lines: list[str], max_w_px: float = 880,
             start_pt: int = 40) -> int:
    for pt in range(start_pt, 22, -2):
        if all(fits(line, pt, max_w_px) for line in lines):
            return pt
    return 24

def esc(s: str) -> str:
    return (s.replace("&", "&amp;").replace("<", "&lt;")
             .replace(">", "&gt;").replace('"', "&quot;"))

# ----- background ----------------------------------------------------------

def background_svg() -> str:
    return f"""
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="{INK_2}"/>
      <stop offset="55%" stop-color="{INK}"/>
      <stop offset="100%" stop-color="{INK}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.78">
      <stop offset="0%" stop-color="{MINT}" stop-opacity="0.08"/>
      <stop offset="55%" stop-color="{MINT_DEEP}" stop-opacity="0.03"/>
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
  <rect x="0" y="0" width="{W}" height="{BAR_H}" fill="#000"/>
  <rect x="0" y="{H - BAR_H}" width="{W}" height="{BAR_H}" fill="#000"/>
  <line x1="0" y1="{BAR_H}" x2="{W}" y2="{BAR_H}"
        stroke="{MINT}" stroke-opacity="0.25" stroke-width="1"/>
  <line x1="0" y1="{H - BAR_H}" x2="{W}" y2="{H - BAR_H}"
        stroke="{MINT}" stroke-opacity="0.25" stroke-width="1"/>
"""

# ----- slide ---------------------------------------------------------------

def render_slide_svg(slide: dict, slide_num: int, total: int,
                     post_num: str) -> str:
    eyebrow = slide.get("eyebrow", f"{slide_num:02d} / {total:02d}")
    title_lines = slide.get("title", "").split("\n")
    body_lines = slide.get("body", "").split("\n")
    tag = slide.get("tag", "")

    cx = W // 2

    # Fit type sizes
    title_pt = fit_title(title_lines)
    body_pt = fit_body(body_lines)
    title_lh = int(title_pt * 1.12)
    body_lh = int(body_pt * 1.32)

    title_block_h = title_lh * len(title_lines)
    body_block_h = body_lh * len(body_lines)

    # Vertical composition: eyebrow top, title middle, rule, body, tag bottom.
    eyebrow_y = BAR_H + 130

    # Center the title around y=560
    title_start = 540 - title_block_h // 2

    rule_y = title_start + title_block_h + 80

    body_start = rule_y + 100

    tag_y = H - BAR_H - 130

    # Render title lines
    title_svg = ""
    for i, line in enumerate(title_lines):
        y = title_start + (i + 1) * title_lh - int(title_lh * 0.22)
        title_svg += (
            f'<text x="{cx}" y="{y}" font-family="{FONT_SERIF}" '
            f'font-size="{title_pt}" font-weight="700" fill="{PAPER}" '
            f'text-anchor="middle" letter-spacing="-0.01em">'
            f"{esc(line)}</text>"
        )

    # Render body lines
    body_svg = ""
    for i, line in enumerate(body_lines):
        if not line.strip():
            continue
        y = body_start + (i + 1) * body_lh - int(body_lh * 0.30)
        body_svg += (
            f'<text x="{cx}" y="{y}" font-family="{FONT_SERIF}" '
            f'font-size="{body_pt}" font-weight="700" fill="{MINT_2}" '
            f'font-style="italic" text-anchor="middle">'
            f"{esc(line)}</text>"
        )

    tag_svg = ""
    if tag:
        tag_svg = (
            f'<text x="{cx}" y="{tag_y}" font-family="{FONT_MONO}" '
            f'font-size="16" font-weight="700" letter-spacing="0.30em" '
            f'fill="{PAPER_DIM}" text-anchor="middle">{esc(tag)}</text>'
        )

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"
     viewBox="0 0 {W} {H}">
  {background_svg()}

  <!-- top chrome -->
  <text x="56" y="54" font-family="{FONT_MONO}" font-size="18"
        font-weight="700" letter-spacing="0.22em" fill="{PAPER}" opacity="0.72">
    @brandmint.studios
  </text>
  <text x="{W - 56}" y="54" font-family="{FONT_MONO}" font-size="18"
        font-weight="700" letter-spacing="0.22em" fill="{MINT}"
        text-anchor="end" opacity="0.85">
    POST {esc(post_num)} · {slide_num:02d}/{total:02d}
  </text>

  <!-- eyebrow chip -->
  <g transform="translate({cx}, {eyebrow_y})">
    <rect x="-220" y="-30" width="440" height="48" rx="24"
          fill="none" stroke="{MINT}" stroke-width="1.5"/>
    <text x="0" y="4" font-family="{FONT_MONO}" font-size="16"
          font-weight="700" letter-spacing="0.30em"
          fill="{MINT}" text-anchor="middle">{esc(eyebrow)}</text>
  </g>

  {title_svg}

  <!-- mint rule -->
  <line x1="{cx - 60}" y1="{rule_y}" x2="{cx + 60}" y2="{rule_y}"
        stroke="{MINT}" stroke-width="2"/>

  {body_svg}

  {tag_svg}

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

# ----- driver --------------------------------------------------------------

def render_all() -> None:
    total_rendered = 0
    for post_key, slides in SLIDES.items():
        post_num = post_key.replace("post-", "")
        post_dir = OUT / post_key
        if not post_dir.is_dir():
            print(f"  ! missing {post_dir} — skipping")
            continue

        total = len(slides) + 1  # +1 because slide 1 is the cover
        print(f"\n{post_key} — {total} slides total ({len(slides)} body+CTA)")

        for i, slide in enumerate(slides, start=2):  # slide 2 .. N
            svg = render_slide_svg(slide, slide_num=i, total=total,
                                   post_num=post_num)
            out_path = post_dir / f"slide-{i:02d}.png"
            cairosvg.svg2png(bytestring=svg.encode(), output_width=W,
                             output_height=H, write_to=str(out_path))
            total_rendered += 1
            title_preview = slide.get("title", "").replace("\n", " · ")[:50]
            print(f"  ✓ slide-{i:02d}.png  {title_preview}")

        # symlink/copy cover.png as slide-01.png for posting-order clarity
        cover = post_dir / "cover.png"
        slide_1 = post_dir / "slide-01.png"
        if cover.exists() and not slide_1.exists():
            slide_1.write_bytes(cover.read_bytes())
            print(f"  ✓ slide-01.png  (= cover.png)")

    print(f"\nTotal body+CTA slides rendered: {total_rendered}")

if __name__ == "__main__":
    render_all()
