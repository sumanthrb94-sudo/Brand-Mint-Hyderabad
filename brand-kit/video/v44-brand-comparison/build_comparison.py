"""
Brand Mint Studios — Comparison Ad (v44 / Partner-led vs Handoff)

15.0s · 60fps · 1080x1920 vertical · NO AUDIO (silent — user adds).

Per the 100 Meta Animation Styles reference (#87 Comparison Table
Slide). Type-driven, no particles. Builds a side-by-side comparison
between "PARTNER-LED" (Brand Mint's way) and "HANDOFF AGENCY"
(everyone else) progressively row by row, then locks with the brand
CTA. Reinforces the Q3 carousel's "Partner-led. No handoffs." line.

Beats:
   0.0- 2.5  HOOK     "WHO BUILDS YOUR BRAND?"        (ink bg, big caps)
   2.5- 4.5  HEADERS  PARTNER-LED  |  HANDOFF AGENCY  (two-col table)
   4.5- 6.5  ROW 1    Strategy:   Same room    |  Different teams
   6.5- 8.5  ROW 2    Design:     Sits w/ strat |  Waits for handoff
   8.5-10.5  ROW 3    Engineering: Day 1       |  After approval
  10.5-12.5  ROW 4    Outcome:    Compounds    |  Plateaus
  12.5-15.0  CTA      M monogram + "Partner-led. No handoffs." + pill
"""
from __future__ import annotations
import math, shutil, subprocess
from pathlib import Path

import cairosvg

# ---------- Canvas ----------
W, H = 1080, 1920
FPS = 60
TOTAL_S = 15.0
TOTAL_F = int(round(TOTAL_S * FPS))

# ---------- Palette ----------
INK    = "#070A09"
PAPER  = "#F5F1EA"
MINT_1 = "#DCFCEC"
MINT_2 = "#7CF6C8"
MINT_3 = "#10B981"
MINT_4 = "#047857"
GHOST  = "rgba(245,241,234,0.55)"
DIM    = "rgba(245,241,234,0.45)"

FONT_DISPLAY = "Plus Jakarta Sans"
FONT_MONO    = "JetBrains Mono"

HERE = Path(__file__).resolve().parent
FRAMES_DIR = HERE / "frames"
OUT_DIR = HERE / "out"
OUT_MP4 = OUT_DIR / "brandmint-comparison-15s-60fps.mp4"

CENTER_X = W // 2
CENTER_Y = H // 2

# ---------- Easing ----------
def lerp(a, b, t): return a + (b - a) * t
def clamp01(t):    return 0.0 if t < 0 else (1.0 if t > 1 else t)
def ease_out_cubic(t):   t = clamp01(t); return 1 - (1 - t) ** 3
def ease_in_cubic(t):    t = clamp01(t); return t ** 3
def smoothstep(e0, e1, x):
    t = clamp01((x - e0) / (e1 - e0))
    return t * t * (3 - 2 * t)

# ---------- Phase boundaries ----------
HOOK_END    = 2.5
HEADERS_T   = 2.5
ROW1_T      = 4.5
ROW2_T      = 6.5
ROW3_T      = 8.5
ROW4_T      = 10.5
CTA_T       = 12.5

# Comparison data
ROWS = [
    ("Strategy",    "Same room",         "Different teams"),
    ("Design",      "Sits with strategy", "Waits for handoff"),
    ("Engineering", "Day 1",             "After approval"),
    ("Outcome",     "Compounds",          "Plateaus"),
]
ROW_TIMES = [ROW1_T, ROW2_T, ROW3_T, ROW4_T]

# Layout
COL_LEFT_X  = int(W * 0.27)    # Partner-led column center
COL_RIGHT_X = int(W * 0.73)    # Handoff column center
LABEL_X     = 90                # row labels left-aligned

# ---------- Scene 1: HOOK ----------
def render_hook(t: float) -> str:
    if t > HOOK_END + 0.2: return ""
    appear = max(0.4, smoothstep(0.0, 0.25, t / HOOK_END))
    leave  = 1 - smoothstep(0.85, 1.0, t / HOOK_END)
    a = appear * leave
    if a <= 0.01: return ""
    ls = lerp(0.30, 0.05, ease_out_cubic(smoothstep(0.0, 0.50, t / HOOK_END)))
    yoff = lerp(20, 0, ease_out_cubic(smoothstep(0.0, 0.35, t / HOOK_END)))
    # Mint accent dot
    dot_a = smoothstep(0.30, 0.55, t / HOOK_END) * leave
    return f"""
      <text x="{CENTER_X}" y="{CENTER_Y + yoff:.1f}" font-family="{FONT_DISPLAY}"
            font-weight="800" font-size="88" letter-spacing="{ls:.3f}em"
            fill="{PAPER}" text-anchor="middle" opacity="{a:.3f}">WHO BUILDS</text>
      <text x="{CENTER_X}" y="{CENTER_Y + 100 + yoff:.1f}" font-family="{FONT_DISPLAY}"
            font-weight="800" font-size="88" letter-spacing="{ls:.3f}em"
            fill="url(#mintAdGrad)" text-anchor="middle" opacity="{a:.3f}" font-style="italic">your brand?</text>
      <circle cx="{CENTER_X}" cy="{CENTER_Y + 180 + yoff:.1f}" r="7"
              fill="{MINT_3}" opacity="{dot_a:.3f}"/>
    """

# ---------- Scene 2+: Comparison table ----------
def render_comparison(t: float) -> str:
    """Progressive comparison reveal — headers + 4 rows."""
    if t < HEADERS_T - 0.2: return ""
    # Fade in after hook fades out, fade out as CTA begins
    a_table = smoothstep(HEADERS_T - 0.1, HEADERS_T + 0.4, t) * (1 - smoothstep(CTA_T - 0.2, CTA_T + 0.3, t))
    if a_table <= 0.01: return ""

    parts = []
    # Title bar at top
    title_a = a_table
    parts.append(
        f'<text x="{CENTER_X}" y="240" font-family="{FONT_MONO}" '
        f'font-weight="600" font-size="22" letter-spacing="0.35em" '
        f'fill="{MINT_2}" text-anchor="middle" opacity="{title_a:.3f}">'
        f'WHO BUILDS YOUR BRAND</text>'
    )

    # Column headers
    headers_y = 340
    header_a = smoothstep(HEADERS_T, HEADERS_T + 0.5, t) * a_table
    # Underline draws across
    underline_w = lerp(0, 280, ease_out_cubic(smoothstep(HEADERS_T + 0.2, HEADERS_T + 0.8, t)))
    parts.append(
        f'<text x="{COL_LEFT_X}" y="{headers_y}" font-family="{FONT_DISPLAY}" '
        f'font-weight="800" font-size="42" letter-spacing="0.04em" '
        f'fill="{MINT_2}" text-anchor="middle" opacity="{header_a:.3f}">PARTNER-LED</text>'
        f'<line x1="{COL_LEFT_X - underline_w/2:.1f}" y1="{headers_y + 18}" '
        f'x2="{COL_LEFT_X + underline_w/2:.1f}" y2="{headers_y + 18}" '
        f'stroke="{MINT_3}" stroke-width="3" opacity="{header_a:.3f}"/>'
    )
    parts.append(
        f'<text x="{COL_RIGHT_X}" y="{headers_y}" font-family="{FONT_DISPLAY}" '
        f'font-weight="600" font-size="42" letter-spacing="0.04em" '
        f'fill="{DIM}" text-anchor="middle" opacity="{header_a:.3f}">HANDOFF</text>'
        f'<text x="{COL_RIGHT_X}" y="{headers_y + 50}" font-family="{FONT_MONO}" '
        f'font-weight="500" font-size="20" letter-spacing="0.30em" '
        f'fill="{DIM}" text-anchor="middle" opacity="{header_a:.3f}">AGENCY</text>'
    )

    # 4 rows — each appears at its own time
    row_base_y = 580
    row_gap = 200
    for i, (label, partner, handoff) in enumerate(ROWS):
        row_t = ROW_TIMES[i]
        row_a = smoothstep(row_t, row_t + 0.4, t) * a_table
        if row_a <= 0.01: continue
        y = row_base_y + i * row_gap
        # Slide-in from left
        xoff = lerp(-30, 0, ease_out_cubic(smoothstep(row_t, row_t + 0.5, t)))
        # Row label (small mono on left)
        parts.append(
            f'<text x="{LABEL_X}" y="{y - 30:.1f}" font-family="{FONT_MONO}" '
            f'font-weight="600" font-size="18" letter-spacing="0.32em" '
            f'fill="{GHOST}" text-anchor="start" opacity="{row_a:.3f}">'
            f'0{i+1} &#183; {label.upper()}</text>'
        )
        # Partner-led cell (mint check + text)
        check_a = smoothstep(row_t + 0.1, row_t + 0.45, t)
        parts.append(
            f'<g opacity="{row_a:.3f}">'
            # Checkmark in mint circle
            f'<circle cx="{COL_LEFT_X - 110 + xoff:.1f}" cy="{y + 4:.1f}" '
            f'r="18" fill="{MINT_3}" opacity="{check_a:.3f}"/>'
            f'<path d="M{COL_LEFT_X - 119 + xoff:.1f} {y + 4:.1f} '
            f'l 6 7 l 12 -12" stroke="{INK}" stroke-width="3" fill="none" '
            f'stroke-linecap="round" stroke-linejoin="round" '
            f'opacity="{check_a:.3f}"/>'
            f'<text x="{COL_LEFT_X - 80 + xoff:.1f}" y="{y + 14:.1f}" '
            f'font-family="{FONT_DISPLAY}" font-weight="700" font-size="30" '
            f'letter-spacing="0.02em" fill="{PAPER}" text-anchor="start">'
            f'{partner}</text>'
            f'</g>'
        )
        # Handoff cell (x mark + dim text)
        x_a = smoothstep(row_t + 0.15, row_t + 0.50, t)
        parts.append(
            f'<g opacity="{row_a * 0.75:.3f}">'
            f'<circle cx="{COL_RIGHT_X - 110:.1f}" cy="{y + 4:.1f}" '
            f'r="18" fill="none" stroke="{DIM}" stroke-width="2" '
            f'opacity="{x_a:.3f}"/>'
            f'<path d="M{COL_RIGHT_X - 119:.1f} {y - 5:.1f} l 18 18 '
            f'M{COL_RIGHT_X - 101:.1f} {y - 5:.1f} l -18 18" '
            f'stroke="{DIM}" stroke-width="2.5" stroke-linecap="round" '
            f'opacity="{x_a:.3f}"/>'
            f'<text x="{COL_RIGHT_X - 80:.1f}" y="{y + 14:.1f}" '
            f'font-family="{FONT_DISPLAY}" font-weight="500" font-size="28" '
            f'letter-spacing="0.02em" fill="{DIM}" text-anchor="start">'
            f'{handoff}</text>'
            f'</g>'
        )

    # Center divider line (full table height)
    div_a = a_table * smoothstep(HEADERS_T + 0.2, HEADERS_T + 1.0, t)
    parts.append(
        f'<line x1="{CENTER_X}" y1="320" x2="{CENTER_X}" y2="{row_base_y + 4 * row_gap - 100}" '
        f'stroke="{MINT_4}" stroke-width="1" opacity="{div_a * 0.4:.3f}"/>'
    )
    return "".join(parts)

# ---------- Scene 7: CTA ----------
def render_cta(t: float) -> str:
    if t < CTA_T - 0.2: return ""
    local = (t - CTA_T) / (TOTAL_S - CTA_T)
    appear = smoothstep(0.0, 0.4, local)
    leave  = 1 - smoothstep(0.92, 1.0, local)
    a = appear * leave
    if a <= 0.01: return ""

    # M monogram (small, upper)
    mark_cx = CENTER_X
    mark_cy = int(H * 0.30)
    s = 180
    mark = f"""
      <circle cx="{mark_cx}" cy="{mark_cy}" r="{s*0.66:.1f}"
              fill="url(#markGlow)" opacity="{a*0.55:.3f}"/>
      <circle cx="{mark_cx}" cy="{mark_cy}" r="{s*0.5:.1f}"
              fill="url(#bmDisc)" opacity="{a:.3f}"/>
      <path d="M{mark_cx-s*0.219:.2f} {mark_cy+s*0.187:.2f}
               V{mark_cy-s*0.187:.2f}
               l{s*0.219:.2f} {s*0.187:.2f}
               l{s*0.219:.2f} {-s*0.187:.2f}
               v{s*0.375:.2f}"
            stroke="{INK}" stroke-width="{s*0.069:.2f}"
            stroke-linecap="round" stroke-linejoin="round" fill="none"
            opacity="{a:.3f}"/>
    """
    # Tagline lines
    line1_y = int(H * 0.49)
    line2_y = int(H * 0.58)
    line1 = (
        f'<text x="{CENTER_X}" y="{line1_y}" font-family="{FONT_DISPLAY}" '
        f'font-weight="800" font-size="80" letter-spacing="0.02em" '
        f'fill="{PAPER}" text-anchor="middle" opacity="{a:.3f}">Partner-led.</text>'
    )
    line2 = (
        f'<text x="{CENTER_X}" y="{line2_y}" font-family="{FONT_DISPLAY}" '
        f'font-weight="800" font-size="80" letter-spacing="0.02em" '
        f'fill="url(#mintAdGrad)" font-style="italic" text-anchor="middle" '
        f'opacity="{a:.3f}">No handoffs.</text>'
    )
    sub_a = smoothstep(0.15, 0.40, local) * leave
    sub = (
        f'<text x="{CENTER_X}" y="{int(H * 0.66)}" font-family="{FONT_MONO}" '
        f'font-weight="600" font-size="22" letter-spacing="0.28em" '
        f'fill="{PAPER}" text-anchor="middle" opacity="{sub_a:.3f}">'
        f'STRATEGY &#183; DESIGN &#183; ENGINEERING</text>'
    )
    # CTA pill
    cta_a = smoothstep(0.30, 0.55, local) * leave
    cta_y = int(H * 0.84)
    cta_yoff = lerp(20, 0, ease_out_cubic(smoothstep(0.30, 0.55, local)))
    pill = (
        f'<rect x="{CENTER_X - 240:.1f}" y="{cta_y - 38 + cta_yoff:.1f}" '
        f'width="480" height="76" rx="38" fill="{MINT_3}" opacity="{cta_a:.3f}"/>'
        f'<text x="{CENTER_X}" y="{cta_y + 12 + cta_yoff:.1f}" '
        f'font-family="{FONT_DISPLAY}" font-weight="700" font-size="30" '
        f'letter-spacing="0.04em" fill="{INK}" text-anchor="middle" '
        f'opacity="{cta_a:.3f}">Book a strategy workshop &#8594;</text>'
    )
    # URL
    url_a = smoothstep(0.45, 0.70, local) * leave
    url = (
        f'<text x="{CENTER_X}" y="{int(H * 0.93)}" font-family="{FONT_MONO}" '
        f'font-weight="500" font-size="20" letter-spacing="0.32em" '
        f'fill="{GHOST}" text-anchor="middle" opacity="{url_a:.3f}">'
        f'brandmintstudios.in</text>'
    )
    return mark + line1 + line2 + sub + pill + url

# ---------- Final fade ----------
def final_fade(t: float) -> str:
    fade_t = clamp01((t - 14.5) / 0.5)
    if fade_t <= 0.01: return ""
    return f'<rect width="{W}" height="{H}" fill="{INK}" opacity="{ease_in_cubic(fade_t):.3f}"/>'

# ---------- Frame composer ----------
def svg_for_frame(f: int) -> str:
    t = f / FPS
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
  <defs>
    <linearGradient id="bmDisc" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"  stop-color="{MINT_2}"/>
      <stop offset="100%" stop-color="{MINT_3}"/>
    </linearGradient>
    <radialGradient id="markGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%"  stop-color="{MINT_2}" stop-opacity="0.85"/>
      <stop offset="55%" stop-color="{MINT_3}" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="{MINT_3}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="mintAdGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="{MINT_1}"/>
      <stop offset="50%"  stop-color="{MINT_2}"/>
      <stop offset="100%" stop-color="{MINT_3}"/>
    </linearGradient>
    <radialGradient id="vig" cx="0.5" cy="0.5" r="0.9">
      <stop offset="0%"  stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.55"/>
    </radialGradient>
  </defs>

  <rect width="{W}" height="{H}" fill="{INK}"/>

  {render_hook(t)}
  {render_comparison(t)}
  {render_cta(t)}

  <rect width="{W}" height="{H}" fill="url(#vig)"/>

  {final_fade(t)}
</svg>"""

# ---------- Render driver ----------
def render_all_frames():
    if FRAMES_DIR.exists(): shutil.rmtree(FRAMES_DIR)
    FRAMES_DIR.mkdir(parents=True, exist_ok=True)
    print(f"  rendering {TOTAL_F} frames ({TOTAL_S}s @ {FPS}fps)")
    for f in range(TOTAL_F):
        svg = svg_for_frame(f)
        out_path = FRAMES_DIR / f"f{f:05d}.png"
        cairosvg.svg2png(bytestring=svg.encode("utf-8"),
                         write_to=str(out_path),
                         output_width=W, output_height=H)
        if (f + 1) % 60 == 0 or f == TOTAL_F - 1:
            print(f"    {f+1}/{TOTAL_F}")

def mux():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"  muxing → {OUT_MP4.name} (silent — user adds audio later)")
    cmd = [
        "ffmpeg", "-y",
        "-framerate", str(FPS),
        "-i", str(FRAMES_DIR / "f%05d.png"),
        "-c:v", "libx264",
        "-preset", "slow",
        "-crf", "17",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        str(OUT_MP4),
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

def main():
    print(f"v44 brand-comparison · {FPS}fps · {TOTAL_S}s · #87 Comparison Table style")
    render_all_frames()
    mux()
    size_mb = OUT_MP4.stat().st_size / 1024 / 1024
    print(f"  done → {OUT_MP4} ({size_mb:.2f}MB)")

if __name__ == "__main__":
    main()
