"""
Brand Mint Studios — Brand Ad (v42 / audio-synced ad)

15.0s · 60fps · 1080x1920 vertical · MUSIC: mr_claps_fashion_abstract.

Sync strategy:
- Source audio trimmed 5.0s from start to skip the intro double-tap
- After trim, strong hits land at: 0.45, 2.90, 5.40, 7.85, 10.35, 12.85s
- Inter-hit interval ~2.45-2.50s — perfect for 6-scene ad cuts
- Scene boundaries set 0.05s BEFORE each hit so the cut anticipates
  the punch (music-video edit rule of thumb).

Designed for paid Meta ads + organic positioning:
  - Brand name visible by t=5s (Meta best practice)
  - Strong stop-scroll hook in scene 1
  - All text on-screen (most viewers play muted)
  - Hard cuts between 6 scenes for "advertisement" rhythm
  - No particles, no atmospheric haze, no M-coalesce — pure typography
    + color-blocking + scene transitions for a deliberate, editorial,
    type-led ad feel distinct from v40's particle ident

Scene plan (6 x 2.5s):
   0.0- 2.5  HOOK         INK bg  PAPER text  "DESIGN THAT THINKS."
   2.5- 5.0  BRAND        MINT-3  INK   text  "BRAND MINT" + studios kicker
   5.0- 7.5  POSITIONING  INK     PAPER text  three positioning words
   7.5-10.0  CAPABILITY   PAPER   INK   mono  "WEBSITES. TOOLS. BRANDS."
  10.0-12.5  TAGLINE      INK     mint gradient italic  "compound."
  12.5-15.0  CTA          INK     brand lockup + "Start a project →"

Audio: NONE in this render. User uploads audio after first render
       and we re-mux. Silent MP4 is the intermediate deliverable.

Render driver writes the MP4 with no audio track. To add audio later:
  ffmpeg -i brandmint-ad-15s-60fps.mp4 -i your-music.mp3 \\
         -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart \\
         brandmint-ad-15s-final.mp4
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
# Scene starts synced to detected audio onsets in the trimmed track.
# Cuts happen 0.05s BEFORE each beat hit so the new scene's first
# frame is immediately reinforced by the audio punch.
SCENE_STARTS = [0.00, 2.85, 5.35, 7.80, 10.30, 12.80]
SCENE_ENDS   = [2.85, 5.35, 7.80, 10.30, 12.80, 15.00]
N_SCENES = len(SCENE_STARTS)
# Audio hit timestamps in the FINAL (trimmed) audio:
AUDIO_HITS = [0.45, 2.90, 5.40, 7.85, 10.35, 12.85]

# ---------- Palette ----------
INK    = "#070A09"
PAPER  = "#F5F1EA"
MINT_1 = "#DCFCEC"
MINT_2 = "#7CF6C8"
MINT_3 = "#10B981"
MINT_4 = "#047857"
GHOST  = "rgba(245,241,234,0.55)"

# ---------- Fonts ----------
FONT_DISPLAY = "Plus Jakarta Sans"
FONT_MONO    = "JetBrains Mono"

# ---------- Output ----------
HERE = Path(__file__).resolve().parent
FRAMES_DIR = HERE / "frames"
OUT_DIR = HERE / "out"
OUT_MP4 = OUT_DIR / "brandmint-ad-synced-60fps.mp4"
AUDIO_SRC = HERE / "mrclaps-fashion-abstract.mp3"
AUDIO_TRIM_START = 5.0   # skip the intro 5s to land on the rhythm section

CENTER_X = W // 2
CENTER_Y = H // 2

# ---------- Easing ----------
def lerp(a, b, t): return a + (b - a) * t
def clamp01(t):    return 0.0 if t < 0 else (1.0 if t > 1 else t)
def ease_out_cubic(t):   t = clamp01(t); return 1 - (1 - t) ** 3
def ease_out_quint(t):   t = clamp01(t); return 1 - (1 - t) ** 5
def ease_in_cubic(t):    t = clamp01(t); return t ** 3
def ease_in_out_cubic(t):
    t = clamp01(t)
    return 4*t*t*t if t < 0.5 else 1 - ((-2*t + 2) ** 3) / 2
def smoothstep(e0, e1, x):
    t = clamp01((x - e0) / (e1 - e0))
    return t * t * (3 - 2 * t)

def scene_local(t: float, scene_i: int):
    """Return (local_raw_seconds, local_normalized_0to1) within a scene
    window. Each scene's window comes from SCENE_STARTS/SCENE_ENDS arrays
    so scenes can be non-uniform (synced to audio beats)."""
    start = SCENE_STARTS[scene_i]
    end   = SCENE_ENDS[scene_i]
    if t < start - 0.01 or t > end + 0.01:
        return None, None
    duration = end - start
    local_raw = t - start
    local_norm = clamp01(local_raw / duration)
    return local_raw, local_norm

# ---------- Scene 1: HOOK — "DESIGN THAT THINKS." ----------
def render_scene_1(t: float) -> str:
    local, n = scene_local(t, 0)
    if local is None: return ""
    # Two-line layout for the ad opener — more dramatic + fits cleanly.
    # Letter-spacing settle 0.16em -> 0.04em (tighter now that each line
    # is shorter and we have width budget for big type)
    ls = lerp(0.16, 0.04, ease_out_cubic(smoothstep(0.0, 0.45, n)))
    yoff_top = lerp(22, 0, ease_out_cubic(smoothstep(0.0, 0.35, n)))
    yoff_bot = lerp(22, 0, ease_out_cubic(smoothstep(0.10, 0.45, n)))
    appear_raw = smoothstep(0.0, 0.25, n)
    appear = max(0.55, appear_raw)   # floor at 55% so first frame is legible
    leave  = 1 - smoothstep(0.90, 1.0, n)
    a = appear * leave
    if a <= 0.01: return ""
    # Mint accent dot pulses between the two lines
    dot_a = appear_raw * leave * 0.9
    dot_pulse = 1.0 + 0.20 * math.sin(local * math.tau * 1.2)
    return f"""
      <text x="{CENTER_X}" y="{CENTER_Y - 80 + yoff_top:.1f}" font-family="{FONT_DISPLAY}"
            font-weight="800" font-size="140" letter-spacing="{ls:.3f}em"
            fill="{PAPER}" text-anchor="middle" opacity="{a:.3f}">DESIGN</text>
      <circle cx="{CENTER_X}" cy="{CENTER_Y + 8:.1f}" r="{6 * dot_pulse:.1f}"
              fill="{MINT_3}" opacity="{dot_a:.3f}"/>
      <text x="{CENTER_X}" y="{CENTER_Y + 130 + yoff_bot:.1f}" font-family="{FONT_DISPLAY}"
            font-weight="800" font-size="110" letter-spacing="{ls:.3f}em"
            fill="{PAPER}" text-anchor="middle" opacity="{a:.3f}">THAT THINKS.</text>
    """

# ---------- Scene 2: BRAND — "BRAND MINT" + STUDIOS · HYDERABAD ----------
def render_scene_2(t: float) -> str:
    local, n = scene_local(t, 1)
    if local is None: return ""
    appear = smoothstep(0.05, 0.45, n)
    leave  = 1 - smoothstep(0.92, 1.0, n)
    a = appear * leave
    if a <= 0.01: return ""
    # Big wordmark slides up
    yoff_main   = lerp(40, 0, ease_out_cubic(appear))
    ls_main     = lerp(0.20, 0.06, ease_out_cubic(appear))
    yoff_kicker = lerp(18, 0, ease_out_cubic(smoothstep(0.20, 0.55, n)))
    a_kicker    = smoothstep(0.20, 0.55, n) * leave
    # Tiny mint accent line above
    line_w = lerp(0, 220, ease_out_cubic(smoothstep(0.10, 0.45, n)))
    return f"""
      <line x1="{CENTER_X - line_w/2:.1f}" y1="{CENTER_Y - 160}"
            x2="{CENTER_X + line_w/2:.1f}" y2="{CENTER_Y - 160}"
            stroke="{INK}" stroke-width="3" opacity="{a:.3f}"/>
      <text x="{CENTER_X}" y="{CENTER_Y + yoff_main:.1f}" font-family="{FONT_DISPLAY}"
            font-weight="800" font-size="108" letter-spacing="{ls_main:.3f}em"
            fill="{INK}" text-anchor="middle" opacity="{a:.3f}">BRAND MINT</text>
      <text x="{CENTER_X}" y="{CENTER_Y + 100 + yoff_kicker:.1f}" font-family="{FONT_MONO}"
            font-weight="600" font-size="24" letter-spacing="0.35em"
            fill="{INK}" text-anchor="middle" opacity="{a_kicker:.3f}">STUDIOS &#183; HYDERABAD</text>
    """

# ---------- Scene 3: POSITIONING — three stacked positioning words ----------
def render_scene_3(t: float) -> str:
    local, n = scene_local(t, 2)
    if local is None: return ""
    leave = 1 - smoothstep(0.92, 1.0, n)
    lines = ["SENIOR PODS.", "EDITORIAL VOICE.", "FULL STACK."]
    line_starts = [0.05, 0.30, 0.55]
    parts = []
    for i, (text, t0) in enumerate(zip(lines, line_starts)):
        appear = smoothstep(t0, t0 + 0.18, n)
        a = appear * leave
        if a <= 0.01: continue
        y_base = CENTER_Y - 160 + i * 160
        yoff = lerp(22, 0, ease_out_cubic(appear))
        ls = lerp(0.26, 0.04, ease_out_cubic(appear))
        # Mint underline draws across
        rule_w = lerp(0, 360, ease_out_cubic(smoothstep(t0 + 0.10, t0 + 0.35, n)))
        parts.append(
            f'<text x="{CENTER_X}" y="{y_base + yoff:.1f}" '
            f'font-family="{FONT_DISPLAY}" font-weight="700" font-size="68" '
            f'letter-spacing="{ls:.3f}em" fill="{PAPER}" text-anchor="middle" '
            f'opacity="{a:.3f}">{text}</text>'
        )
        parts.append(
            f'<line x1="{CENTER_X - rule_w/2:.1f}" y1="{y_base + yoff + 22:.1f}" '
            f'x2="{CENTER_X + rule_w/2:.1f}" y2="{y_base + yoff + 22:.1f}" '
            f'stroke="{MINT_3}" stroke-width="3" opacity="{a:.3f}"/>'
        )
    return "".join(parts)

# ---------- Scene 4: CAPABILITY — brutalist mono on paper bg ----------
def render_scene_4(t: float) -> str:
    local, n = scene_local(t, 3)
    if local is None: return ""
    leave = 1 - smoothstep(0.92, 1.0, n)
    lines = ["WEBSITES.", "TOOLS.", "BRANDS."]
    line_starts = [0.08, 0.30, 0.52]
    parts = []
    # Vertical mint accent bar (slides in left)
    bar_h = lerp(0, 480, ease_out_cubic(smoothstep(0.05, 0.40, n)))
    bar_a = leave * smoothstep(0.05, 0.40, n)
    parts.append(
        f'<rect x="{int(W * 0.16)}" y="{CENTER_Y - bar_h/2:.1f}" '
        f'width="6" height="{bar_h:.1f}" fill="{MINT_3}" opacity="{bar_a:.3f}"/>'
    )
    # Lines, left-aligned (brutalist)
    text_x = int(W * 0.20)
    for i, (text, t0) in enumerate(zip(lines, line_starts)):
        appear = smoothstep(t0, t0 + 0.18, n)
        a = appear * leave
        if a <= 0.01: continue
        y_base = CENTER_Y - 200 + i * 200
        xoff = lerp(-40, 0, ease_out_cubic(appear))
        parts.append(
            f'<text x="{text_x + xoff:.1f}" y="{y_base:.1f}" '
            f'font-family="{FONT_MONO}" font-weight="700" font-size="104" '
            f'letter-spacing="-0.02em" fill="{INK}" text-anchor="start" '
            f'opacity="{a:.3f}">{text}</text>'
        )
    return "".join(parts)

# ---------- Scene 5: TAGLINE — "WE MINT BRANDS THAT compound." ----------
def render_scene_5(t: float) -> str:
    local, n = scene_local(t, 4)
    if local is None: return ""
    leave = 1 - smoothstep(0.92, 1.0, n)
    # Top: "WE MINT BRANDS THAT" mono kicker
    a_top = smoothstep(0.05, 0.35, n) * leave
    yoff_top = lerp(20, 0, ease_out_cubic(smoothstep(0.05, 0.35, n)))
    # Bottom: "compound." italic, mint gradient, scale-punch
    a_bot = smoothstep(0.25, 0.55, n) * leave
    # Scale-punch on entrance — quick over/undershoot
    if 0.40 < n < 0.70:
        sp = 1.0 + 0.08 * math.sin((n - 0.40) / 0.30 * math.pi)
    else:
        sp = 1.0
    return f"""
      <text x="{CENTER_X}" y="{CENTER_Y - 60 + yoff_top:.1f}" font-family="{FONT_MONO}"
            font-weight="600" font-size="30" letter-spacing="0.28em"
            fill="{PAPER}" text-anchor="middle"
            opacity="{a_top:.3f}">WE MINT BRANDS THAT</text>
      <g transform="translate({CENTER_X} {CENTER_Y + 70}) scale({sp:.3f})" opacity="{a_bot:.3f}">
        <text x="0" y="0" font-family="{FONT_DISPLAY}" font-weight="800"
              font-size="128" letter-spacing="0.02em" fill="url(#mintAdGrad)"
              text-anchor="middle" font-style="italic">compound.</text>
      </g>
    """

# ---------- Scene 6: CTA — brand lockup + "Start a project →" ----------
def render_scene_6(t: float) -> str:
    local, n = scene_local(t, 5)
    if local is None: return ""
    appear = smoothstep(0.05, 0.40, n)
    # Hold then gentle fade — don't fully leave, the final frame should
    # still show brand info as the video ends.
    leave = 1 - smoothstep(0.90, 1.0, n)
    a = appear * leave
    if a <= 0.01: return ""
    # M monogram (small, upper)
    mark_cx = CENTER_X
    mark_cy = CENTER_Y - 280
    s = 200
    mark_block = f"""
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
    # BRAND MINT wordmark
    word_yoff = lerp(20, 0, ease_out_cubic(appear))
    word_block = (
        f'<text x="{CENTER_X}" y="{CENTER_Y + 20 + word_yoff:.1f}" font-family="{FONT_DISPLAY}" '
        f'font-weight="800" font-size="78" letter-spacing="0.06em" '
        f'fill="{PAPER}" text-anchor="middle" opacity="{a:.3f}">BRAND MINT</text>'
    )
    # URL
    url_block = (
        f'<text x="{CENTER_X}" y="{CENTER_Y + 100:.1f}" font-family="{FONT_MONO}" '
        f'font-weight="500" font-size="22" letter-spacing="0.32em" '
        f'fill="{GHOST}" text-anchor="middle" '
        f'opacity="{smoothstep(0.20, 0.50, n) * leave:.3f}">brandmintstudios.in</text>'
    )
    # CTA — appears late in the scene, mint pill background
    cta_a = smoothstep(0.40, 0.70, n) * leave
    cta_yoff = lerp(20, 0, ease_out_cubic(smoothstep(0.40, 0.70, n)))
    cta_y = CENTER_Y + 280 + cta_yoff
    # Mint pill rectangle + text inside
    cta_block = (
        f'<rect x="{CENTER_X - 220:.1f}" y="{cta_y - 36:.1f}" width="440" height="76" rx="38" '
        f'fill="{MINT_3}" opacity="{cta_a:.3f}"/>'
        f'<text x="{CENTER_X}" y="{cta_y + 12:.1f}" font-family="{FONT_DISPLAY}" '
        f'font-weight="700" font-size="34" letter-spacing="0.04em" '
        f'fill="{INK}" text-anchor="middle" opacity="{cta_a:.3f}">'
        f'Start a project &#8594;</text>'
    )
    return mark_block + word_block + url_block + cta_block

# ---------- Background color per scene + transition ----------
def current_scene(t: float) -> int:
    """Index of the scene containing time t."""
    for i in range(N_SCENES - 1, -1, -1):
        if t >= SCENE_STARTS[i] - 0.01:
            return i
    return 0

def scene_bg(t: float) -> str:
    """Return the background <rect fill="..."> for the current frame.
    Hard cuts between scenes (no crossfade for ad-style decisive rhythm)."""
    scene_i = current_scene(t)
    bg_per_scene = [INK, MINT_3, INK, PAPER, INK, INK]
    color = bg_per_scene[scene_i]
    return f'<rect width="{W}" height="{H}" fill="{color}"/>'

# ---------- Vignette per scene (subtle) ----------
def scene_vignette(t: float) -> str:
    """Subtle vignette tuned per-scene background. On INK/dark scenes
    a darker vignette pulls eye to center; on MINT/PAPER scenes the
    vignette is much softer so it doesn't darken the bright bg."""
    scene_i = current_scene(t)
    vig_strength = [0.55, 0.10, 0.50, 0.08, 0.55, 0.60]
    s = vig_strength[scene_i]
    if s < 0.02: return ""
    return f'<rect width="{W}" height="{H}" fill="url(#vig)" opacity="{s:.3f}"/>'

# ---------- Final fade at the very end ----------
def final_fade(t: float) -> str:
    fade_t = clamp01((t - 14.5) / 0.5)
    if fade_t <= 0.01: return ""
    return f'<rect width="{W}" height="{H}" fill="{INK}" opacity="{ease_in_cubic(fade_t):.3f}"/>'

# ---------- Frame composer ----------
def svg_for_frame(f: int) -> str:
    t = f / FPS
    # Tiny micro-flash on scene boundary for a tactile cut feel. Boundaries
    # are the 5 internal scene cuts (SCENE_STARTS[1:]) which are 0.05s before
    # each audio hit, so flash + cut + hit land in one tight 0.1s window.
    flash = ""
    for boundary in SCENE_STARTS[1:]:
        delta = t - boundary
        if -0.02 < delta < 0.08:
            flash_a = 1.0 - clamp01(delta / 0.08)
            flash = f'<rect width="{W}" height="{H}" fill="{PAPER}" opacity="{flash_a * 0.25:.3f}"/>'
            break
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
    <linearGradient id="mintTextGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"  stop-color="{MINT_2}"/>
      <stop offset="60%" stop-color="{MINT_3}"/>
      <stop offset="100%" stop-color="{MINT_4}"/>
    </linearGradient>
    <linearGradient id="mintAdGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="{MINT_1}"/>
      <stop offset="50%"  stop-color="{MINT_2}"/>
      <stop offset="100%" stop-color="{MINT_3}"/>
    </linearGradient>
    <radialGradient id="vig" cx="0.5" cy="0.5" r="0.9">
      <stop offset="0%"  stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="1.0"/>
    </radialGradient>
  </defs>

  {scene_bg(t)}

  {render_scene_1(t)}
  {render_scene_2(t)}
  {render_scene_3(t)}
  {render_scene_4(t)}
  {render_scene_5(t)}
  {render_scene_6(t)}

  {scene_vignette(t)}

  {flash}

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
    """Mux frames with audio. Audio trimmed 5.0s from start (-ss 5.0)
    so the rhythm section lands at video t=0. 0.4s tail fade to match
    the visual final fade."""
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"  muxing (with audio) → {OUT_MP4.name}")
    fade_start = TOTAL_S - 0.6
    af = f"afade=t=out:st={fade_start:.2f}:d=0.6"
    cmd = [
        "ffmpeg", "-y",
        "-framerate", str(FPS),
        "-i", str(FRAMES_DIR / "f%05d.png"),
        "-ss", str(AUDIO_TRIM_START), "-i", str(AUDIO_SRC),
        "-c:v", "libx264",
        "-preset", "slow",
        "-crf", "17",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-af", af,
        "-t", f"{TOTAL_S}",
        "-shortest",
        "-movflags", "+faststart",
        str(OUT_MP4),
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

def main():
    print(f"v42 brand-ad-synced · {FPS}fps · {TOTAL_S}s · 6 scenes synced to mr_claps_fashion_abstract beats")
    print(f"  scene starts: {SCENE_STARTS}")
    print(f"  audio hits:   {AUDIO_HITS}")
    render_all_frames()
    mux()
    size_mb = OUT_MP4.stat().st_size / 1024 / 1024
    print(f"  done → {OUT_MP4} ({size_mb:.2f}MB)")

if __name__ == "__main__":
    main()
