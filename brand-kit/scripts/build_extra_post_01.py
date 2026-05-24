"""
BrandMint — extra post #01: "The 5 words on every Hyderabad builder hoarding."

Brand-positioning carousel (8 slides) — designed for the cold-start
phase. Calls out the 5 most overused words on Hyderabad builder
hoardings and shows the gap between what builders SAY, what buyers
HEAR, and what each word actually MEANS. The post is itself a soft
demo of the brand-positioning work @brandmint.studios sells.

Out:
  posts-ready/post-extra-01/cover.png
  posts-ready/post-extra-01/slide-01.png ... slide-08.png
  posts-ready/post-extra-01/caption.txt
  posts-ready/post-extra-01/meta.txt
"""

from __future__ import annotations

from pathlib import Path

import cairosvg
from PIL import ImageFont

# ---- palette + canvas (same as render_30_posts.py / render_carousels.py)

W, H = 1080, 1350
BAR_H = 80

INK = "#070a09"
INK_2 = "#10171a"
PAPER = "#f5f1ea"
PAPER_DIM = "#a3b2ac"
MINT = "#10b981"
MINT_2 = "#7cf6c8"
MINT_DEEP = "#047857"

FONT_DISPLAY = "DejaVu Sans, sans-serif"
FONT_SERIF = "DejaVu Serif, Georgia, serif"
FONT_MONO = "DejaVu Sans Mono, Menlo, monospace"
_DEJAVU_SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"

HERE = Path(__file__).parent.resolve()
OUT_DIR = HERE.parent / "content" / "posts-ready" / "post-extra-01"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# ---- typography helpers ---------------------------------------------------

def _font(pt: int):
    return ImageFont.truetype(_DEJAVU_SERIF, pt)

def fits(text: str, pt: int, max_w_px: float) -> bool:
    l, _, r, _ = _font(pt).getbbox(text)
    return (r - l) <= max_w_px

def fit_size(lines, max_w_px, start_pt, floor_pt=24, step=4):
    for pt in range(start_pt, floor_pt - 1, -step):
        if all(fits(line, pt, max_w_px) for line in lines):
            return pt
    return floor_pt

def esc(s):
    return (s.replace("&", "&amp;").replace("<", "&lt;")
             .replace(">", "&gt;").replace('"', "&quot;"))

# ---- shared background ---------------------------------------------------

def bg_svg():
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

def chrome_top(slide_num, total):
    return f"""
  <text x="56" y="54" font-family="{FONT_MONO}" font-size="18"
        font-weight="700" letter-spacing="0.22em" fill="{PAPER}" opacity="0.72">
    @brandmint.studios
  </text>
  <text x="{W - 56}" y="54" font-family="{FONT_MONO}" font-size="18"
        font-weight="700" letter-spacing="0.22em" fill="{MINT}"
        text-anchor="end" opacity="0.85">
    BRAND POSITIONING · {slide_num:02d}/{total:02d}
  </text>
"""

def chrome_bottom():
    return f"""
  <text x="56" y="{H - 30}" font-family="{FONT_MONO}" font-size="14"
        font-weight="700" letter-spacing="0.30em" fill="{PAPER_DIM}">
    SAVE  ·  SHARE  ·  DM "AUDIT"
  </text>
  <text x="{W - 56}" y="{H - 30}" font-family="{FONT_MONO}" font-size="14"
        font-weight="700" letter-spacing="0.30em" fill="{PAPER_DIM}"
        text-anchor="end">
    BRAND  ·  MINT  ·  STUDIOS
  </text>
"""

# ---- COVER (slide 1) -----------------------------------------------------

def render_cover():
    cx = W // 2
    hook_lines = ["The 5 words on", "every Hyderabad", "builder hoarding."]
    hook_pt = fit_size(hook_lines, max_w_px=920, start_pt=98)
    line_h = int(hook_pt * 1.15)
    block_top = (H // 2) - (line_h * len(hook_lines)) // 2 - 40

    hook_svg = ""
    for i, line in enumerate(hook_lines):
        y = block_top + (i + 1) * line_h - int(line_h * 0.25)
        hook_svg += (
            f'<text x="{cx}" y="{y}" font-family="{FONT_SERIF}" '
            f'font-size="{hook_pt}" font-weight="700" fill="{PAPER}" '
            f'text-anchor="middle" letter-spacing="-0.01em">'
            f"{esc(line)}</text>"
        )

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"
     viewBox="0 0 {W} {H}">
  {bg_svg()}
  {chrome_top(1, 8)}

  <g transform="translate({cx}, {BAR_H + 140})">
    <rect x="-220" y="-30" width="440" height="48" rx="24"
          fill="none" stroke="{MINT}" stroke-width="1.5"/>
    <text x="0" y="4" font-family="{FONT_MONO}" font-size="16"
          font-weight="700" letter-spacing="0.30em"
          fill="{MINT}" text-anchor="middle">CATEGORY  ·  CLICHÉ</text>
  </g>

  {hook_svg}

  <line x1="{cx - 60}" y1="{H - BAR_H - 220}"
        x2="{cx + 60}" y2="{H - BAR_H - 220}"
        stroke="{MINT}" stroke-width="2"/>

  <text x="{cx}" y="{H - BAR_H - 150}"
        font-family="{FONT_SERIF}" font-size="34" font-weight="700"
        font-style="italic" fill="{MINT_2}" text-anchor="middle">
    What builders say.
  </text>
  <text x="{cx}" y="{H - BAR_H - 100}"
        font-family="{FONT_SERIF}" font-size="34" font-weight="700"
        font-style="italic" fill="{MINT_2}" text-anchor="middle">
    What buyers hear.
  </text>

  {chrome_bottom()}
</svg>
"""

# ---- SETUP (slide 2) -----------------------------------------------------

def render_setup():
    cx = W // 2
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"
     viewBox="0 0 {W} {H}">
  {bg_svg()}
  {chrome_top(2, 8)}

  <g transform="translate({cx}, {BAR_H + 130})">
    <rect x="-180" y="-30" width="360" height="48" rx="24"
          fill="none" stroke="{MINT}" stroke-width="1.5"/>
    <text x="0" y="4" font-family="{FONT_MONO}" font-size="16"
          font-weight="700" letter-spacing="0.30em"
          fill="{MINT}" text-anchor="middle">THE FILLER FIVE</text>
  </g>

  <text x="{cx}" y="490"
        font-family="{FONT_SERIF}" font-size="76" font-weight="700"
        fill="{PAPER}" text-anchor="middle" letter-spacing="-0.01em">
    Five words used
  </text>
  <text x="{cx}" y="580"
        font-family="{FONT_SERIF}" font-size="76" font-weight="700"
        fill="{PAPER}" text-anchor="middle" letter-spacing="-0.01em">
    so widely they
  </text>
  <text x="{cx}" y="670"
        font-family="{FONT_SERIF}" font-size="76" font-weight="700"
        fill="{PAPER}" text-anchor="middle" letter-spacing="-0.01em">
    mean nothing.
  </text>

  <line x1="{cx - 60}" y1="760" x2="{cx + 60}" y2="760"
        stroke="{MINT}" stroke-width="2"/>

  <text x="{cx}" y="860"
        font-family="{FONT_SERIF}" font-size="34" font-weight="700"
        font-style="italic" fill="{MINT_2}" text-anchor="middle">
    They used to mean something specific.
  </text>
  <text x="{cx}" y="910"
        font-family="{FONT_SERIF}" font-size="34" font-weight="700"
        font-style="italic" fill="{MINT_2}" text-anchor="middle">
    Now they are filler.
  </text>
  <text x="{cx}" y="970"
        font-family="{FONT_SERIF}" font-size="34" font-weight="700"
        font-style="italic" fill="{MINT_2}" text-anchor="middle">
    Here is the gap.
  </text>

  <text x="{cx}" y="{H - BAR_H - 130}"
        font-family="{FONT_MONO}" font-size="16" font-weight="700"
        letter-spacing="0.30em" fill="{PAPER_DIM}" text-anchor="middle">
    SAID  ·  HEARD  ·  MEANT
  </text>

  {chrome_bottom()}
</svg>
"""

# ---- WORD SLIDE (slides 3-7) ---------------------------------------------

WORDS = [
    {
        "num": "01",
        "word": "Premium.",
        "said": "Better than the alternative.",
        "heard": "Costs 25-30% more for finishes.",
        "meant": "Nothing measurable.",
        "tag": "USED ON ~80% OF HOARDINGS",
    },
    {
        "num": "02",
        "word": "Luxury.",
        "said": "Aspirational lifestyle.",
        "heard": "Marble entrance, gym, pool.",
        "meant": "Anything above ₹15K per sqft.",
        "tag": "NO DEFINED THRESHOLD",
    },
    {
        "num": "03",
        "word": "Iconic.",
        "said": "A new city landmark.",
        "heard": "Tall, lit, photographable.",
        "meant": "We want to be on a postcard.",
        "tag": "SELF-FULFILLING",
    },
    {
        "num": "04",
        "word": "Lifestyle.",
        "said": "How you will live here.",
        "heard": "Clubhouse and a yoga deck.",
        "meant": "Project lacks a real location.",
        "tag": "USUALLY MEANS AMENITIES",
    },
    {
        "num": "05",
        "word": "Bespoke.",
        "said": "Made for you.",
        "heard": "Customizable interiors.",
        "meant": "Probably nothing changes.",
        "tag": "BORROWED FROM TAILORING",
    },
]

def render_word(idx, w):
    cx = W // 2
    slide_num = idx + 3   # 3..7
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"
     viewBox="0 0 {W} {H}">
  {bg_svg()}
  {chrome_top(slide_num, 8)}

  <g transform="translate({cx}, {BAR_H + 130})">
    <rect x="-180" y="-30" width="360" height="48" rx="24"
          fill="none" stroke="{MINT}" stroke-width="1.5"/>
    <text x="0" y="4" font-family="{FONT_MONO}" font-size="16"
          font-weight="700" letter-spacing="0.30em"
          fill="{MINT}" text-anchor="middle">
      {w["num"]}  /  {w["word"].rstrip(".").upper()}
    </text>
  </g>

  <text x="{cx}" y="500"
        font-family="{FONT_SERIF}" font-size="148" font-weight="700"
        fill="{PAPER}" text-anchor="middle" letter-spacing="-0.02em">
    {esc(w["word"])}
  </text>

  <line x1="{cx - 60}" y1="580" x2="{cx + 60}" y2="580"
        stroke="{MINT}" stroke-width="2"/>

  <!-- SAID row -->
  <text x="200" y="700" font-family="{FONT_MONO}" font-size="18"
        font-weight="700" letter-spacing="0.30em" fill="{MINT}">
    SAID
  </text>
  <text x="200" y="750" font-family="{FONT_SERIF}" font-size="36"
        font-weight="700" fill="{PAPER}" font-style="italic">
    {esc(w["said"])}
  </text>

  <!-- HEARD row -->
  <text x="200" y="850" font-family="{FONT_MONO}" font-size="18"
        font-weight="700" letter-spacing="0.30em" fill="{MINT}">
    HEARD
  </text>
  <text x="200" y="900" font-family="{FONT_SERIF}" font-size="36"
        font-weight="700" fill="{PAPER}" font-style="italic">
    {esc(w["heard"])}
  </text>

  <!-- MEANT row (the punch) -->
  <text x="200" y="1000" font-family="{FONT_MONO}" font-size="18"
        font-weight="700" letter-spacing="0.30em" fill="{MINT_2}">
    MEANT
  </text>
  <text x="200" y="1050" font-family="{FONT_SERIF}" font-size="36"
        font-weight="700" fill="{MINT_2}" font-style="italic">
    {esc(w["meant"])}
  </text>

  <text x="{cx}" y="{H - BAR_H - 130}"
        font-family="{FONT_MONO}" font-size="16" font-weight="700"
        letter-spacing="0.30em" fill="{PAPER_DIM}" text-anchor="middle">
    {esc(w["tag"])}
  </text>

  {chrome_bottom()}
</svg>
"""

# ---- CTA (slide 8) -------------------------------------------------------

def render_cta():
    cx = W // 2
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"
     viewBox="0 0 {W} {H}">
  {bg_svg()}
  {chrome_top(8, 8)}

  <g transform="translate({cx}, {BAR_H + 130})">
    <rect x="-200" y="-30" width="400" height="48" rx="24"
          fill="none" stroke="{MINT}" stroke-width="1.5"/>
    <text x="0" y="4" font-family="{FONT_MONO}" font-size="16"
          font-weight="700" letter-spacing="0.30em"
          fill="{MINT}" text-anchor="middle">08  /  THE PITCH</text>
  </g>

  <text x="{cx}" y="490"
        font-family="{FONT_SERIF}" font-size="82" font-weight="700"
        fill="{PAPER}" text-anchor="middle" letter-spacing="-0.01em">
    These words
  </text>
  <text x="{cx}" y="580"
        font-family="{FONT_SERIF}" font-size="82" font-weight="700"
        fill="{PAPER}" text-anchor="middle" letter-spacing="-0.01em">
    don't move
  </text>
  <text x="{cx}" y="670"
        font-family="{FONT_SERIF}" font-size="82" font-weight="700"
        fill="{PAPER}" text-anchor="middle" letter-spacing="-0.01em">
    buyers anymore.
  </text>

  <line x1="{cx - 60}" y1="760" x2="{cx + 60}" y2="760"
        stroke="{MINT}" stroke-width="2"/>

  <text x="{cx}" y="860"
        font-family="{FONT_SERIF}" font-size="38" font-weight="700"
        font-style="italic" fill="{MINT_2}" text-anchor="middle">
    We help builders find
  </text>
  <text x="{cx}" y="910"
        font-family="{FONT_SERIF}" font-size="38" font-weight="700"
        font-style="italic" fill="{MINT_2}" text-anchor="middle">
    language that does.
  </text>

  <text x="{cx}" y="1030"
        font-family="{FONT_MONO}" font-size="22" font-weight="700"
        letter-spacing="0.30em" fill="{PAPER}" text-anchor="middle">
    SAVE THIS
  </text>
  <text x="{cx}" y="1085"
        font-family="{FONT_MONO}" font-size="22" font-weight="700"
        letter-spacing="0.30em" fill="{PAPER}" text-anchor="middle">
    SHARE WITH A BUILDER
  </text>
  <text x="{cx}" y="1140"
        font-family="{FONT_MONO}" font-size="22" font-weight="700"
        letter-spacing="0.30em" fill="{MINT}" text-anchor="middle">
    DM  "AUDIT"
  </text>

  {chrome_bottom()}
</svg>
"""

# ---- driver --------------------------------------------------------------

def write_png(svg: str, name: str):
    cairosvg.svg2png(bytestring=svg.encode(), output_width=W,
                     output_height=H, write_to=str(OUT_DIR / name))

def write_caption():
    caption = """Walk down any of Hyderabad's arterials this month — Outer Ring Road, Banjara, Kondapur, Tellapur — and count how many hoardings use the same five words.

Premium. Luxury. Iconic. Lifestyle. Bespoke.

Every one of them is a category cliché now. They used to mean something specific. A "premium" project once meant marble lobbies and a German-engineered lift. "Bespoke" meant the buyer actually chose the marble. Today both words are the baseline. Filler.

The problem isn't that builders are being dishonest. It's that the language has been used so widely it has stopped doing the work of distinguishing anything.

What replaces it? Specificity. The name of the supplier. The square-foot count of the kitchen. The brand of the fixtures. The exact year the maintenance fund is funded to. The boring stuff. Because boring, when it's specific, sounds like proof.

We help real-estate brands translate from generic language to the specific kind. It's the slowest part of a rebrand, and the most expensive thing to skip.

Save this for the next project copy you write.
DM "audit" if you want us to read your homepage.
Follow @brandmint.studios — we publish brand positioning every Wed and Sun.

.
.
.
#brandmintstudios #hyderabadrealestate #realestatehyderabad #hyderabadbuilders #buildermarketing #realestatebranding #realestatemarketing #realestateads #hyderabad #realestatecopywriting #brandstrategy #hyderabaddevelopers #marketinghyderabad #realestatecontent #editorialdesign #realestateindia #hyderabaddesign #propertyhyderabad #hyderabadproperty #brandpositioning
"""
    (OUT_DIR / "caption.txt").write_text(caption)

def write_meta():
    (OUT_DIR / "meta.txt").write_text(
        "Post: extra-01\n"
        "Pillar: Brand positioning for developers\n"
        "Format: Carousel (8 slides)\n"
        "Best time: Wed or Sun · 7:30pm IST (brand-positioning slot)\n"
        "DM keyword: 'audit'\n"
    )

def main():
    print(f"Building extra post 01 → {OUT_DIR}")

    write_png(render_cover(), "cover.png")
    write_png(render_cover(), "slide-01.png")  # mirror cover
    write_png(render_setup(), "slide-02.png")
    for idx, w in enumerate(WORDS):
        write_png(render_word(idx, w), f"slide-{idx + 3:02d}.png")
    write_png(render_cta(), "slide-08.png")

    write_caption()
    write_meta()

    print("  ✓ cover.png")
    for i in range(1, 9):
        print(f"  ✓ slide-{i:02d}.png")
    print("  ✓ caption.txt + meta.txt")

if __name__ == "__main__":
    main()
