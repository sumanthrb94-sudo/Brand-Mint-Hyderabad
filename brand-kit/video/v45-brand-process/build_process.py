"""
Brand Mint Studios — Process Reel (v45 / how we build a brand)

15.0s · 60fps · 1080x1920 vertical · NO AUDIO (user adds later).

Per the 100 Meta Animation Styles catalog #81 (Progress Bar Journey),
combined with #2 Kinetic Typewriter Scroll for the step reveals.

5-step editorial process explainer. No financial content, no pricing,
no claims. Pure how-we-work narrative for top-of-funnel trust building.

Beats:
   0.0- 2.5  HOOK     "How we build a brand."   (paper caps + mint italic)
   2.5- 4.5  STEP 01  LISTEN     — One partner. One conversation.
   4.5- 6.5  STEP 02  RESEARCH   — Public records. Audience. Competitive density.
   6.5- 8.5  STEP 03  POSITION   — Find the one true thing.
   8.5-10.5  STEP 04  DESIGN + ENGINEER — Same room. Same week.
  10.5-12.5  STEP 05  SHIP + MEASURE    — Editorial cadence.
  12.5-15.0  CTA      brand lockup + Start-a-project pill

Persistent mint progress bar at the top fills 0% -> 100% as steps
land. Bar uses ROW indices 0..5 (5 steps + final lockup).
"""
from __future__ import annotations
import math, shutil, subprocess
from pathlib import Path

import cairosvg

W, H = 1080, 1920
FPS = 60
TOTAL_S = 15.0
TOTAL_F = int(round(TOTAL_S * FPS))

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
OUT_MP4 = OUT_DIR / "brandmint-process-15s-60fps.mp4"

CENTER_X = W // 2
CENTER_Y = H // 2

def lerp(a, b, t): return a + (b - a) * t
def clamp01(t):    return 0.0 if t < 0 else (1.0 if t > 1 else t)
def ease_out_cubic(t):   t = clamp01(t); return 1 - (1 - t) ** 3
def ease_in_cubic(t):    t = clamp01(t); return t ** 3
def smoothstep(e0, e1, x):
    t = clamp01((x - e0) / (e1 - e0))
    return t * t * (3 - 2 * t)

# Phase boundaries
HOOK_END   = 2.5
STEP_TIMES = [2.5, 4.5, 6.5, 8.5, 10.5]   # start of each step
STEP_END   = 12.5                          # end of last step
CTA_T      = 12.5

# Step content
STEPS = [
    ("01", "LISTEN",            "One partner.",        "One conversation.",   "Before any tool opens."),
    ("02", "RESEARCH",          "Public records.",     "Audience.",           "Competitive density."),
    ("03", "POSITION",          "Find the one",        "true thing.",         "Cut the rest."),
    ("04", "DESIGN + ENGINEER", "Same room.",          "Same week.",          "Same standard."),
    ("05", "SHIP + MEASURE",    "Editorial cadence.",  "Tuesday and Thursday.","Then iterate."),
]

# Progress bar geometry
BAR_Y       = 230
BAR_X_LEFT  = 110
BAR_X_RIGHT = W - 110
BAR_HEIGHT  = 4

# ---------- Progress bar (always visible, fills as steps land) ----------
def render_progress_bar(t: float) -> str:
    # 0 before hook, then fills proportional to step completion.
    # Each step adds 20% of the bar.
    if t < 0.5:
        progress = 0.0
    elif t < HOOK_END:
        progress = 0.05   # nudge so the bar shows at start of journey
    elif t < CTA_T:
        completed_steps = 0
        for i, st in enumerate(STEP_TIMES):
            if t >= st:
                completed_steps = i + 1
        # Smooth progression within the active step
        if completed_steps < len(STEP_TIMES):
            cur_start = STEP_TIMES[completed_steps - 1] if completed_steps > 0 else HOOK_END
            cur_end = STEP_TIMES[completed_steps] if completed_steps < len(STEP_TIMES) else STEP_END
            within = ease_out_cubic((t - cur_start) / (cur_end - cur_start))
            progress = (completed_steps - 1) / 5 + within / 5
        else:
            progress = 1.0
    else:
        progress = 1.0

    bar_full_w = BAR_X_RIGHT - BAR_X_LEFT
    fill_w = bar_full_w * progress
    # Fade out the bar during CTA
    bar_a = 1.0 - smoothstep(CTA_T + 0.6, CTA_T + 1.0, t)
    if bar_a <= 0.01:
        return ""
    # Background track
    return f"""
      <rect x="{BAR_X_LEFT}" y="{BAR_Y}" width="{bar_full_w}" height="{BAR_HEIGHT}"
            rx="{BAR_HEIGHT/2}" fill="{MINT_4}" opacity="{0.30 * bar_a:.3f}"/>
      <rect x="{BAR_X_LEFT}" y="{BAR_Y}" width="{fill_w:.1f}" height="{BAR_HEIGHT}"
            rx="{BAR_HEIGHT/2}" fill="url(#mintAdGrad)" opacity="{bar_a:.3f}"/>
      <text x="{BAR_X_LEFT}" y="{BAR_Y - 18}" font-family="{FONT_MONO}"
            font-weight="500" font-size="16" letter-spacing="0.32em"
            fill="{GHOST}" text-anchor="start" opacity="{bar_a:.3f}">PROCESS</text>
      <text x="{BAR_X_RIGHT}" y="{BAR_Y - 18}" font-family="{FONT_MONO}"
            font-weight="600" font-size="16" letter-spacing="0.32em"
            fill="{MINT_2}" text-anchor="end" opacity="{bar_a:.3f}">{int(progress * 100):02d}%</text>
    """

# ---------- Scene 1: HOOK ----------
def render_hook(t: float) -> str:
    if t > HOOK_END + 0.2: return ""
    appear = max(0.4, smoothstep(0.0, 0.25, t / HOOK_END))
    leave  = 1 - smoothstep(0.85, 1.0, t / HOOK_END)
    a = appear * leave
    if a <= 0.01: return ""
    ls = lerp(0.30, 0.05, ease_out_cubic(smoothstep(0.0, 0.50, t / HOOK_END)))
    yoff = lerp(20, 0, ease_out_cubic(smoothstep(0.0, 0.35, t / HOOK_END)))
    return f"""
      <text x="{CENTER_X}" y="{CENTER_Y - 20 + yoff:.1f}" font-family="{FONT_MONO}"
            font-weight="600" font-size="22" letter-spacing="0.36em"
            fill="{MINT_2}" text-anchor="middle" opacity="{a:.3f}">EDITORIAL PROCESS</text>
      <text x="{CENTER_X}" y="{CENTER_Y + 70 + yoff:.1f}" font-family="{FONT_DISPLAY}"
            font-weight="800" font-size="92" letter-spacing="{ls:.3f}em"
            fill="{PAPER}" text-anchor="middle" opacity="{a:.3f}">How we build</text>
      <text x="{CENTER_X}" y="{CENTER_Y + 170 + yoff:.1f}" font-family="{FONT_DISPLAY}"
            font-weight="800" font-size="92" letter-spacing="{ls:.3f}em"
            fill="url(#mintAdGrad)" text-anchor="middle" font-style="italic" opacity="{a:.3f}">a brand.</text>
    """

# ---------- Step renderer ----------
def render_step(t: float, step_idx: int) -> str:
    if step_idx >= len(STEPS): return ""
    t_start = STEP_TIMES[step_idx]
    t_end   = STEP_TIMES[step_idx + 1] if step_idx + 1 < len(STEP_TIMES) else STEP_END
    if t < t_start - 0.2 or t > t_end + 0.3: return ""
    duration = t_end - t_start
    local = (t - t_start) / duration
    appear = smoothstep(0.0, 0.30, local)
    leave  = 1 - smoothstep(0.85, 1.05, local)
    a = appear * leave
    if a <= 0.01: return ""

    num, title, line1, line2, line3 = STEPS[step_idx]

    # Number — huge, mint
    num_yoff = lerp(30, 0, ease_out_cubic(appear))
    num_a = a
    # Title — paper, large
    title_yoff = lerp(20, 0, ease_out_cubic(smoothstep(0.10, 0.40, local)))
    title_a = smoothstep(0.10, 0.40, local) * leave
    # Body lines stagger
    line_a = [
        smoothstep(0.20, 0.45, local) * leave,
        smoothstep(0.30, 0.55, local) * leave,
        smoothstep(0.40, 0.65, local) * leave,
    ]
    line_yoff = [lerp(15, 0, ease_out_cubic(la)) for la in line_a]

    return f"""
      <text x="{CENTER_X}" y="{H * 0.30 + num_yoff:.1f}" font-family="{FONT_DISPLAY}"
            font-weight="800" font-size="240" letter-spacing="-0.04em"
            fill="url(#mintAdGrad)" text-anchor="middle" opacity="{num_a:.3f}">{num}</text>
      <text x="{CENTER_X}" y="{H * 0.46 + title_yoff:.1f}" font-family="{FONT_DISPLAY}"
            font-weight="800" font-size="58" letter-spacing="0.04em"
            fill="{PAPER}" text-anchor="middle" opacity="{title_a:.3f}">{title}</text>
      <text x="{CENTER_X}" y="{H * 0.56 + line_yoff[0]:.1f}" font-family="{FONT_DISPLAY}"
            font-weight="500" font-size="40" letter-spacing="0.02em"
            fill="{PAPER}" text-anchor="middle" opacity="{line_a[0]:.3f}">{line1}</text>
      <text x="{CENTER_X}" y="{H * 0.62 + line_yoff[1]:.1f}" font-family="{FONT_DISPLAY}"
            font-weight="500" font-size="40" letter-spacing="0.02em"
            fill="{PAPER}" text-anchor="middle" opacity="{line_a[1]:.3f}">{line2}</text>
      <text x="{CENTER_X}" y="{H * 0.68 + line_yoff[2]:.1f}" font-family="{FONT_MONO}"
            font-weight="500" font-size="24" letter-spacing="0.20em"
            fill="{MINT_2}" text-anchor="middle" opacity="{line_a[2]:.3f}">{line3}</text>
    """

# ---------- CTA ----------
def render_cta(t: float) -> str:
    if t < CTA_T - 0.2: return ""
    local = (t - CTA_T) / (TOTAL_S - CTA_T)
    appear = smoothstep(0.0, 0.40, local)
    leave  = 1 - smoothstep(0.92, 1.0, local)
    a = appear * leave
    if a <= 0.01: return ""

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
    line1_y = int(H * 0.49)
    line2_y = int(H * 0.58)
    line1 = (
        f'<text x="{CENTER_X}" y="{line1_y}" font-family="{FONT_DISPLAY}" '
        f'font-weight="800" font-size="80" letter-spacing="0.02em" '
        f'fill="{PAPER}" text-anchor="middle" opacity="{a:.3f}">Brand Mint</text>'
    )
    line2 = (
        f'<text x="{CENTER_X}" y="{line2_y}" font-family="{FONT_DISPLAY}" '
        f'font-weight="800" font-size="80" letter-spacing="0.02em" '
        f'fill="url(#mintAdGrad)" font-style="italic" text-anchor="middle" '
        f'opacity="{a:.3f}">Studios.</text>'
    )
    sub_a = smoothstep(0.15, 0.40, local) * leave
    sub = (
        f'<text x="{CENTER_X}" y="{int(H * 0.66)}" font-family="{FONT_MONO}" '
        f'font-weight="600" font-size="22" letter-spacing="0.28em" '
        f'fill="{PAPER}" text-anchor="middle" opacity="{sub_a:.3f}">'
        f'STUDIOS &#183; HYDERABAD</text>'
    )
    cta_a = smoothstep(0.30, 0.55, local) * leave
    cta_y = int(H * 0.84)
    cta_yoff = lerp(20, 0, ease_out_cubic(smoothstep(0.30, 0.55, local)))
    pill = (
        f'<rect x="{CENTER_X - 200:.1f}" y="{cta_y - 38 + cta_yoff:.1f}" '
        f'width="400" height="76" rx="38" fill="{MINT_3}" opacity="{cta_a:.3f}"/>'
        f'<text x="{CENTER_X}" y="{cta_y + 12 + cta_yoff:.1f}" '
        f'font-family="{FONT_DISPLAY}" font-weight="700" font-size="32" '
        f'letter-spacing="0.04em" fill="{INK}" text-anchor="middle" '
        f'opacity="{cta_a:.3f}">Start a project &#8594;</text>'
    )
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
    steps_svg = "".join(render_step(t, i) for i in range(len(STEPS)))
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

  {render_progress_bar(t)}
  {render_hook(t)}
  {steps_svg}
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
    print(f"v45 brand-process · {FPS}fps · {TOTAL_S}s · #81 Progress Bar Journey")
    render_all_frames()
    mux()
    size_mb = OUT_MP4.stat().st_size / 1024 / 1024
    print(f"  done → {OUT_MP4} ({size_mb:.2f}MB)")

if __name__ == "__main__":
    main()
