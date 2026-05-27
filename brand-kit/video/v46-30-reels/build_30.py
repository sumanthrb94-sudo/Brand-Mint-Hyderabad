"""
Brand Mint Studios — 30-Reel Templated Builder (v46)

Renders any/all of 30 editorial brand reels from reels.json.

Each reel: 10s · 60fps · 1080x1920 vertical, silent (audio TBA).

Usage:
  python3 build_30.py                  # render all 30
  python3 build_30.py --only 03        # render just reel 3
  python3 build_30.py --from 11 --to 20

Layout supported:
  - MANIFESTO (default) — eyebrow + hook (2 lines) + 3 body lines + CTA pill
  - PROCESS (set "layout":"process") — eyebrow + hook + numbered list + CTA

All beats:
  0.0- 1.0  intro fade in — eyebrow + hook only
  1.0- 7.0  body lines reveal staggered, hook persists
  7.0-10.0  CTA: brand mark scales in, CTA pill, URL
  9.7-10.0  final fade to ink

No financial content. Per the AI-VIDEO-GENERATION-BRIEF — no fabricated
numbers, no founder face, no competitor callouts.
"""
from __future__ import annotations
import argparse, json, math, shutil, subprocess, sys
from pathlib import Path
import cairosvg

W, H = 1080, 1920
FPS = 60
TOTAL_S = 10.0
TOTAL_F = int(round(TOTAL_S * FPS))

INK    = "#070A09"
PAPER  = "#F5F1EA"
MINT_1 = "#DCFCEC"
MINT_2 = "#7CF6C8"
MINT_3 = "#10B981"
MINT_4 = "#047857"
GHOST  = "rgba(245,241,234,0.55)"

FONT_DISPLAY = "Plus Jakarta Sans"
FONT_MONO    = "JetBrains Mono"

HERE = Path(__file__).resolve().parent
REELS_JSON = HERE / "reels.json"
OUT_DIR = HERE / "out"

CENTER_X = W // 2

# Easing
def lerp(a, b, t): return a + (b - a) * t
def clamp01(t):    return 0.0 if t < 0 else (1.0 if t > 1 else t)
def ease_out_cubic(t):   t = clamp01(t); return 1 - (1 - t) ** 3
def ease_in_cubic(t):    t = clamp01(t); return t ** 3
def smoothstep(e0, e1, x):
    t = clamp01((x - e0) / (e1 - e0))
    return t * t * (3 - 2 * t)

# Phase boundaries
T_EYEBROW = 0.1
T_HOOK    = 0.3
T_LINES   = [1.4, 2.2, 3.0, 3.8, 4.6]   # body line entry times
T_HOLD    = 6.5
T_CTA     = 7.0
T_FADE    = 9.7

def render_manifesto(t: float, cfg: dict) -> str:
    """Standard manifesto layout — eyebrow + 2-line hook + 3-5 body + CTA."""
    parts = []
    eyebrow  = cfg.get("eyebrow", "")
    hook_top = cfg.get("hook_top", "")
    hook_bot = cfg.get("hook_bot", "")
    lines    = cfg.get("lines", [])[:5]   # cap at 5

    # ─── Eyebrow (mono small caps, mint accent)
    if t > T_EYEBROW and t < T_FADE:
        e_local = (t - T_EYEBROW)
        e_a = smoothstep(0.0, 0.40, e_local) * (1 - smoothstep(T_CTA - T_EYEBROW - 0.2, T_CTA - T_EYEBROW + 0.3, e_local))
        e_yoff = lerp(15, 0, ease_out_cubic(smoothstep(0.0, 0.45, e_local)))
        if e_a > 0.01:
            parts.append(
                f'<text x="{CENTER_X}" y="{int(H * 0.18) + e_yoff:.1f}" font-family="{FONT_MONO}" '
                f'font-weight="600" font-size="22" letter-spacing="0.36em" '
                f'fill="{MINT_2}" text-anchor="middle" opacity="{e_a:.3f}">{eyebrow}</text>'
            )

    # ─── Hook (huge 2-line display caps, letter-spacing settle)
    if t > T_HOOK and t < T_CTA + 0.3:
        h_local = t - T_HOOK
        h_a = smoothstep(0.0, 0.50, h_local) * (1 - smoothstep(T_CTA - T_HOOK - 0.3, T_CTA - T_HOOK + 0.2, h_local))
        ls = lerp(0.28, 0.04, ease_out_cubic(smoothstep(0.0, 0.65, h_local)))
        yoff = lerp(25, 0, ease_out_cubic(smoothstep(0.0, 0.45, h_local)))
        if h_a > 0.01:
            parts.append(
                f'<text x="{CENTER_X}" y="{int(H * 0.30) + yoff:.1f}" font-family="{FONT_DISPLAY}" '
                f'font-weight="800" font-size="94" letter-spacing="{ls:.3f}em" '
                f'fill="{PAPER}" text-anchor="middle" opacity="{h_a:.3f}">{hook_top}</text>'
            )
            parts.append(
                f'<text x="{CENTER_X}" y="{int(H * 0.39) + yoff:.1f}" font-family="{FONT_DISPLAY}" '
                f'font-weight="800" font-size="94" letter-spacing="{ls:.3f}em" '
                f'fill="url(#mintAdGrad)" text-anchor="middle" font-style="italic" opacity="{h_a:.3f}">{hook_bot}</text>'
            )

    # ─── Body lines (staggered, fade in then out before CTA)
    line_base_y = int(H * 0.55)
    line_gap    = 70
    for i, ln in enumerate(lines):
        if i >= len(T_LINES): break
        ln_start = T_LINES[i]
        if t < ln_start - 0.1 or t > T_CTA + 0.1:
            continue
        ln_local = t - ln_start
        ln_a = smoothstep(0.0, 0.35, ln_local) * (1 - smoothstep(T_CTA - ln_start - 0.3, T_CTA - ln_start + 0.1, ln_local))
        if ln_a <= 0.01: continue
        ln_yoff = lerp(15, 0, ease_out_cubic(smoothstep(0.0, 0.40, ln_local)))
        y = line_base_y + i * line_gap + ln_yoff
        parts.append(
            f'<text x="{CENTER_X}" y="{y:.1f}" font-family="{FONT_DISPLAY}" '
            f'font-weight="500" font-size="36" letter-spacing="0.02em" '
            f'fill="{PAPER}" text-anchor="middle" opacity="{ln_a:.3f}">{ln}</text>'
        )

    return "".join(parts)


def render_process(t: float, cfg: dict) -> str:
    """Process layout — numbered list of items, no progress bar."""
    parts = []
    eyebrow  = cfg.get("eyebrow", "")
    hook_top = cfg.get("hook_top", "")
    hook_bot = cfg.get("hook_bot", "")
    steps    = cfg.get("lines", [])[:5]

    # Same eyebrow + hook as manifesto, just shifted up
    if t > T_EYEBROW and t < T_FADE:
        e_local = (t - T_EYEBROW)
        e_a = smoothstep(0.0, 0.40, e_local) * (1 - smoothstep(T_CTA - T_EYEBROW - 0.2, T_CTA - T_EYEBROW + 0.3, e_local))
        e_yoff = lerp(15, 0, ease_out_cubic(smoothstep(0.0, 0.45, e_local)))
        if e_a > 0.01:
            parts.append(
                f'<text x="{CENTER_X}" y="{int(H * 0.14) + e_yoff:.1f}" font-family="{FONT_MONO}" '
                f'font-weight="600" font-size="22" letter-spacing="0.36em" '
                f'fill="{MINT_2}" text-anchor="middle" opacity="{e_a:.3f}">{eyebrow}</text>'
            )

    if t > T_HOOK and t < T_CTA + 0.3:
        h_local = t - T_HOOK
        h_a = smoothstep(0.0, 0.50, h_local) * (1 - smoothstep(T_CTA - T_HOOK - 0.3, T_CTA - T_HOOK + 0.2, h_local))
        ls = lerp(0.28, 0.04, ease_out_cubic(smoothstep(0.0, 0.65, h_local)))
        yoff = lerp(25, 0, ease_out_cubic(smoothstep(0.0, 0.45, h_local)))
        if h_a > 0.01:
            parts.append(
                f'<text x="{CENTER_X}" y="{int(H * 0.23) + yoff:.1f}" font-family="{FONT_DISPLAY}" '
                f'font-weight="800" font-size="80" letter-spacing="{ls:.3f}em" '
                f'fill="{PAPER}" text-anchor="middle" opacity="{h_a:.3f}">{hook_top}</text>'
            )
            parts.append(
                f'<text x="{CENTER_X}" y="{int(H * 0.31) + yoff:.1f}" font-family="{FONT_DISPLAY}" '
                f'font-weight="800" font-size="80" letter-spacing="{ls:.3f}em" '
                f'fill="url(#mintAdGrad)" text-anchor="middle" font-style="italic" opacity="{h_a:.3f}">{hook_bot}</text>'
            )

    # Numbered steps (huge mint numbers + label)
    step_base_y = int(H * 0.44)
    step_gap    = 90
    for i, step in enumerate(steps):
        if i >= len(T_LINES): break
        s_start = T_LINES[i]
        if t < s_start - 0.1 or t > T_CTA + 0.1:
            continue
        s_local = t - s_start
        s_a = smoothstep(0.0, 0.35, s_local) * (1 - smoothstep(T_CTA - s_start - 0.3, T_CTA - s_start + 0.1, s_local))
        if s_a <= 0.01: continue
        s_yoff = lerp(15, 0, ease_out_cubic(smoothstep(0.0, 0.40, s_local)))
        y = step_base_y + i * step_gap + s_yoff
        parts.append(
            f'<text x="{int(W*0.20)}" y="{y:.1f}" font-family="{FONT_DISPLAY}" '
            f'font-weight="800" font-size="44" letter-spacing="-0.02em" '
            f'fill="url(#mintAdGrad)" text-anchor="start" opacity="{s_a:.3f}">0{i+1}</text>'
        )
        parts.append(
            f'<text x="{int(W*0.28)}" y="{y:.1f}" font-family="{FONT_DISPLAY}" '
            f'font-weight="600" font-size="40" letter-spacing="0.02em" '
            f'fill="{PAPER}" text-anchor="start" opacity="{s_a:.3f}">{step}</text>'
        )

    return "".join(parts)


def render_cta(t: float, cfg: dict) -> str:
    """Brand lockup + CTA pill — same across all reels."""
    if t < T_CTA - 0.1: return ""
    local = (t - T_CTA) / (TOTAL_S - T_CTA)
    appear = smoothstep(0.0, 0.40, local)
    leave  = 1 - smoothstep(0.92, 1.0, local)
    a = appear * leave
    if a <= 0.01: return ""

    # M mark
    mark_cx = CENTER_X
    mark_cy = int(H * 0.42)
    s = 130
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
    word = (
        f'<text x="{CENTER_X}" y="{int(H * 0.56)}" font-family="{FONT_DISPLAY}" '
        f'font-weight="800" font-size="62" letter-spacing="0.04em" '
        f'fill="{PAPER}" text-anchor="middle" opacity="{a:.3f}">BRAND MINT</text>'
    )
    kicker = (
        f'<text x="{CENTER_X}" y="{int(H * 0.62)}" font-family="{FONT_MONO}" '
        f'font-weight="500" font-size="20" letter-spacing="0.32em" '
        f'fill="{MINT_2}" text-anchor="middle" opacity="{a:.3f}">STUDIOS &#183; HYDERABAD</text>'
    )
    cta_text = cfg.get("cta", "Start a project")
    cta_a = smoothstep(0.25, 0.55, local) * leave
    cta_yoff = lerp(20, 0, ease_out_cubic(smoothstep(0.25, 0.55, local)))
    cta_y = int(H * 0.80) + cta_yoff
    pill_w = max(360, min(580, len(cta_text) * 18 + 80))
    pill = (
        f'<rect x="{CENTER_X - pill_w/2:.1f}" y="{cta_y - 38:.1f}" '
        f'width="{pill_w}" height="76" rx="38" fill="{MINT_3}" opacity="{cta_a:.3f}"/>'
        f'<text x="{CENTER_X}" y="{cta_y + 12:.1f}" font-family="{FONT_DISPLAY}" '
        f'font-weight="700" font-size="28" letter-spacing="0.04em" '
        f'fill="{INK}" text-anchor="middle" opacity="{cta_a:.3f}">{cta_text} &#8594;</text>'
    )
    url_a = smoothstep(0.45, 0.70, local) * leave
    url = (
        f'<text x="{CENTER_X}" y="{int(H * 0.92)}" font-family="{FONT_MONO}" '
        f'font-weight="500" font-size="20" letter-spacing="0.32em" '
        f'fill="{GHOST}" text-anchor="middle" opacity="{url_a:.3f}">'
        f'brandmintstudios.in</text>'
    )
    return mark + word + kicker + pill + url


def final_fade(t: float) -> str:
    fade_t = clamp01((t - T_FADE) / (TOTAL_S - T_FADE))
    if fade_t <= 0.01: return ""
    return f'<rect width="{W}" height="{H}" fill="{INK}" opacity="{ease_in_cubic(fade_t):.3f}"/>'


def svg_for_frame(f: int, cfg: dict) -> str:
    t = f / FPS
    layout = cfg.get("layout", "manifesto")
    body = render_process(t, cfg) if layout == "process" else render_manifesto(t, cfg)
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

  {body}
  {render_cta(t, cfg)}

  <rect width="{W}" height="{H}" fill="url(#vig)"/>

  {final_fade(t)}
</svg>"""


def render_reel(cfg: dict, verbose: bool = True):
    slug = cfg["slug"]
    n    = cfg["n"]
    frames_dir = HERE / f"_frames_{n:02d}_{slug}"
    if frames_dir.exists(): shutil.rmtree(frames_dir)
    frames_dir.mkdir(parents=True, exist_ok=True)
    if verbose:
        print(f"  [{n:02d}/{len(REELS)}] {slug} — rendering {TOTAL_F} frames...")
    for f in range(TOTAL_F):
        svg = svg_for_frame(f, cfg)
        out_path = frames_dir / f"f{f:05d}.png"
        cairosvg.svg2png(bytestring=svg.encode("utf-8"),
                         write_to=str(out_path),
                         output_width=W, output_height=H)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_mp4 = OUT_DIR / f"reel-{n:02d}-{slug}-60fps.mp4"
    if verbose:
        print(f"  [{n:02d}/{len(REELS)}] {slug} — muxing → {out_mp4.name}")
    cmd = [
        "ffmpeg", "-y",
        "-framerate", str(FPS),
        "-i", str(frames_dir / "f%05d.png"),
        "-c:v", "libx264",
        "-preset", "slow",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        str(out_mp4),
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    # Clean up frames immediately to save disk
    shutil.rmtree(frames_dir)
    if verbose:
        size_kb = out_mp4.stat().st_size // 1024
        print(f"  [{n:02d}/{len(REELS)}] DONE → {out_mp4.name} ({size_kb} KB)")


def main():
    global REELS
    REELS = json.loads(REELS_JSON.read_text())

    ap = argparse.ArgumentParser()
    ap.add_argument("--only", type=int)
    ap.add_argument("--from", type=int, dest="from_n", default=1)
    ap.add_argument("--to",   type=int, default=30)
    args = ap.parse_args()

    selected = []
    for r in REELS:
        if args.only is not None:
            if r["n"] == args.only: selected.append(r)
        else:
            if args.from_n <= r["n"] <= args.to: selected.append(r)

    print(f"v46 30-reels · {FPS}fps · {TOTAL_S}s each · rendering {len(selected)} reel(s)")
    for cfg in selected:
        render_reel(cfg, verbose=True)
    print(f"All done. Output in: {OUT_DIR}")


if __name__ == "__main__":
    main()
