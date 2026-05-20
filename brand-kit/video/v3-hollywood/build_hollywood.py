"""
Brand Mint — "Compound" — 12s Hollywood-grade Reel builder.

Implements SCRIPT.md + SCENE-PLAN.md + MOTION-SYSTEM.md.

Pipeline:
  1. Per-shot SVG generators take t and produce the SVG for that frame.
  2. cairosvg rasterizes each frame to PNG.
  3. ffmpeg encodes each shot as an MP4.
  4. ffmpeg chains the shots with the transitions specified in SCENE-PLAN.
  5. Score is layered: sub-bass drone for the duration + impact hits +
     whoosh+pluck transitions + cymbal swell.
  6. Final mux: video + score → out/brand-mint-hollywood.mp4.

Output: ~12.5s, 1080x1920, H.264 + AAC, ~12 MB.
"""
import math
import subprocess
from pathlib import Path

import cairosvg

ROOT = Path(__file__).resolve().parent
FRAMES = ROOT / "frames"
SHOTS = ROOT / "shots"
OUT = ROOT / "out"
for d in (FRAMES, SHOTS, OUT):
    d.mkdir(parents=True, exist_ok=True)

# ---------- format ----------
W, H = 1080, 1920
FPS = 30
RW, RH = W, H  # render at native — animations carry the motion, not zoompan

# ---------- brand tokens (from BRAND-GUIDELINES.md) ----------
BLACK = "#000000"
INK = "#0A0E0C"
PAPER = "#F5F1EA"
CREAM = "#F5F1EA"
MINT_2 = "#7CF6C8"
MINT_3 = "#10B981"
GOLD = "#C9A14A"
BM_INK = "#0B1F1A"
BM_INK_2 = "#14352D"
BM_EMERALD = "#00C897"

DISPLAY = "Plus Jakarta Sans, Inter, system-ui, sans-serif"
MONO = "JetBrains Mono, ui-monospace, monospace"
BODY = "Inter, system-ui, sans-serif"

# ---------- easing ----------
def ease_out_cubic(t):
    return 1 - (1 - t) ** 3

def ease_in_out(t):
    return 0.5 * (1 - math.cos(math.pi * t)) if 0 <= t <= 1 else (0 if t < 0 else 1)

def overshoot(t):
    # cubic-bezier(0.34, 1.56, 0.64, 1) — Apple "spring"
    c1 = 1.70158
    return 1 + (c1 + 1) * (t - 1) ** 3 + c1 * (t - 1) ** 2

def clamp(x, lo=0.0, hi=1.0):
    return max(lo, min(hi, x))

# ---------- shared SVG fragments ----------
def defs():
    return f"""
    <defs>
      <radialGradient id="mintGlow" cx="50%" cy="50%" r="62%">
        <stop offset="0%"   stop-color="{MINT_3}" stop-opacity="0.42"/>
        <stop offset="55%"  stop-color="{MINT_3}" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="{BLACK}"  stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="ctaGlow" cx="50%" cy="50%" r="62%">
        <stop offset="0%"   stop-color="{MINT_3}" stop-opacity="0.62"/>
        <stop offset="60%"  stop-color="{MINT_3}" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="{BLACK}"  stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="darkBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"   stop-color="{BM_INK}"/>
        <stop offset="100%" stop-color="{BM_INK_2}"/>
      </linearGradient>
      <linearGradient id="mark" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"   stop-color="{MINT_2}"/>
        <stop offset="100%" stop-color="{MINT_3}"/>
      </linearGradient>
      <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="14" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="6" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    """


def cinema_bars(dark=True):
    text_color = CREAM if dark else INK
    return f"""
    <rect x="0" y="0"      width="{W}" height="3" fill="{MINT_3}" opacity="0.85"/>
    <rect x="0" y="{H-3}"  width="{W}" height="3" fill="{MINT_3}" opacity="0.85"/>
    <text x="48" y="{H-22}" font-family="{MONO}" font-size="18"
          letter-spacing="0.22em" fill="{text_color}" opacity="0.55">BRAND MINT</text>
    <text x="{W-48}" y="{H-22}" text-anchor="end" font-family="{MONO}"
          font-size="18" letter-spacing="0.18em" fill="{text_color}"
          opacity="0.55">brandmint.studio</text>
    """


def svg_wrap(inner: str) -> str:
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">{defs()}{inner}</svg>'


# ---------- per-shot SVG generators ----------

def shot_1(t):
    """0.00–1.60 — Counter from 0 to 42.6 over 0.7s, then hold."""
    if t <= 0.7:
        progress = ease_out_cubic(t / 0.7)
        value = 42.6 * progress
    else:
        value = 42.6
    label = f"+&#8377;{value:.1f} Cr"

    scale = 1.0 + 0.04 * (t / 1.6)
    cx, cy = W / 2, H / 2

    inner = f"""
    <rect width="{W}" height="{H}" fill="{BLACK}"/>
    <rect width="{W}" height="{H}" fill="url(#mintGlow)" opacity="{min(1.0, t/0.4)}"/>
    <text x="48" y="60" font-family="{MONO}" font-size="20" letter-spacing="0.22em"
          fill="{MINT_3}" opacity="{0.85 * min(1.0, t/0.5)}">— A BRAND MINT FILM</text>
    <g transform="translate({cx} {cy}) scale({scale}) translate({-cx} {-cy})">
      <text x="{W//2}" y="{H//2 + 50}" text-anchor="middle" font-family="{MONO}"
            font-size="170" font-weight="500" letter-spacing="-0.025em"
            fill="{MINT_3}" filter="url(#glow)">{label}</text>
    </g>
    {cinema_bars(dark=True)}
    """
    return svg_wrap(inner)


def shot_2(t):
    """1.40–3.20 — Stat shrinks + moves up, two context lines stagger fade-up."""
    # Stat scales from 1.0 → 0.6 over 400ms, translates up
    tn = clamp(t / 0.4)
    scale = 1.0 - 0.4 * ease_in_out(tn)
    y_offset = -440 * ease_in_out(tn)  # move stat upward
    cx, cy = W / 2, H / 2 + 50

    # Two context lines fade up with stagger (start at t=0.5 and t=0.7)
    line1_t = clamp((t - 0.5) / 0.4)
    line2_t = clamp((t - 0.7) / 0.4)
    line1_op = ease_out_cubic(line1_t)
    line2_op = ease_out_cubic(line2_t)
    line1_dy = 20 * (1 - line1_op)
    line2_dy = 20 * (1 - line2_op)

    inner = f"""
    <rect width="{W}" height="{H}" fill="{BLACK}"/>
    <rect width="{W}" height="{H}" fill="url(#mintGlow)" opacity="1.0"/>
    <g transform="translate({cx} {cy}) scale({scale}) translate({-cx} {-cy + y_offset})">
      <text x="{W//2}" y="{H//2 + 50}" text-anchor="middle" font-family="{MONO}"
            font-size="170" font-weight="500" letter-spacing="-0.025em"
            fill="{MINT_3}" filter="url(#glow)">+&#8377;42.6 Cr</text>
    </g>
    <text x="{W//2}" y="{1180 + line1_dy}" text-anchor="middle"
          font-family="{DISPLAY}" font-size="62" font-weight="500"
          font-style="italic" fill="{CREAM}" opacity="{line1_op * 0.92}">in tracked revenue.</text>
    <text x="{W//2}" y="{1280 + line2_dy}" text-anchor="middle"
          font-family="{BODY}" font-size="40" fill="{CREAM}"
          opacity="{line2_op * 0.78}">across eleven founder-led brands.</text>
    {cinema_bars(dark=True)}
    """
    return svg_wrap(inner)


def shot_3(t):
    """3.20–4.60 — 3.4× bookings."""
    inner = f"""
    <rect width="{W}" height="{H}" fill="url(#darkBg)"/>
    <text x="80" y="60" font-family="{MONO}" font-size="20" letter-spacing="0.22em"
          fill="{GOLD}" opacity="0.78">— PROOF 01</text>
    <text x="80" y="{H//2 + 100}" font-family="{MONO}" font-size="340" font-weight="500"
          letter-spacing="-0.04em" fill="{MINT_3}" filter="url(#glow)">3.4&#215;</text>
    <text x="80" y="{H//2 + 240}" font-family="{DISPLAY}" font-size="92" font-weight="500"
          font-style="italic" fill="{CREAM}">bookings.</text>
    <text x="80" y="{H//2 + 320}" font-family="{BODY}" font-size="34" fill="{CREAM}"
          opacity="0.6">Q2 → Q3 FY26 · D2C wellness, Hyderabad &#8594; Dubai.</text>
    {cinema_bars(dark=True)}
    """
    return svg_wrap(inner)


def shot_4(t):
    """4.60–6.00 — 61% lower CPL."""
    inner = f"""
    <rect width="{W}" height="{H}" fill="url(#darkBg)"/>
    <text x="80" y="60" font-family="{MONO}" font-size="20" letter-spacing="0.22em"
          fill="{GOLD}" opacity="0.78">— PROOF 02</text>
    <text x="80" y="{H//2 + 100}" font-family="{MONO}" font-size="340" font-weight="500"
          letter-spacing="-0.04em" fill="{MINT_3}" filter="url(#glow)">61%</text>
    <text x="80" y="{H//2 + 240}" font-family="{DISPLAY}" font-size="92" font-weight="500"
          font-style="italic" fill="{CREAM}">lower CPL.</text>
    <text x="80" y="{H//2 + 320}" font-family="{BODY}" font-size="34" fill="{CREAM}"
          opacity="0.6">Same product. Same audience. New creative system.</text>
    {cinema_bars(dark=True)}
    """
    return svg_wrap(inner)


def shot_5(t):
    """6.00–8.20 — Tension → Promise with mint bar wipe.
    A line:  0.0 - 1.2 s, fades up over 0.6s, holds
    B line:  starts at 1.2s. Mint bar wipes right→left over 0.3s (1.2-1.5s)
             revealing line B underneath. Line A is replaced by line B.
    """
    # Phase A: tighter two-line tension (shorter copy, fits easily)
    if t < 1.4:
        line_a_t = clamp(t / 0.6)
        op_a = ease_out_cubic(line_a_t)
        line_a = (
            f'<text x="{W//2}" y="{H//2 - 50}" text-anchor="middle" '
            f'font-family="{DISPLAY}" font-size="76" font-weight="500" '
            f'fill="{CREAM}" opacity="{op_a * 0.85}">Most agencies</text>'
            f'<text x="{W//2}" y="{H//2 + 50}" text-anchor="middle" '
            f'font-family="{DISPLAY}" font-size="76" font-weight="500" '
            f'fill="{CREAM}" opacity="{op_a * 0.92}">ship a logo.</text>'
        )
        bar = ""
        line_b = ""
    elif t < 1.7:
        # Bar wipes right → left across 0.3s
        wipe_t = (t - 1.4) / 0.3
        wipe_x = W * (1 - wipe_t)
        bar = f'<rect x="{wipe_x}" y="0" width="{W - wipe_x}" height="{H}" fill="{MINT_3}" opacity="0.94"/>'
        line_a = ""
        line_b = ""
    else:
        bar_in = clamp((t - 1.7) / 0.3)
        bar = f'<rect x="0" y="0" width="{W * (1 - bar_in)}" height="{H}" fill="{MINT_3}" opacity="{0.94 * (1 - bar_in)}"/>'
        # Line B fades up
        line_b_t = clamp((t - 1.7) / 0.5)
        op_b = ease_out_cubic(line_b_t)
        line_b = (
            f'<text x="{W//2}" y="{H//2 - 50}" text-anchor="middle" '
            f'font-family="{DISPLAY}" font-size="76" font-weight="500" '
            f'fill="{CREAM}" opacity="{op_b * 0.92}">We ship</text>'
            f'<text x="{W//2}" y="{H//2 + 70}" text-anchor="middle" '
            f'font-family="{DISPLAY}" font-size="72" font-weight="500" '
            f'font-style="italic" fill="{MINT_3}" filter="url(#softGlow)" '
            f'opacity="{op_b}">compounding revenue.</text>'
        )
        line_a = ""

    inner = f"""
    <rect width="{W}" height="{H}" fill="{BLACK}"/>
    {line_a}{line_b}{bar}
    {cinema_bars(dark=True)}
    """
    return svg_wrap(inner)


def shot_6(t):
    """8.20–10.60 — Monogram (overshoot in), wordmark typewriter, CTA pill slide-up."""
    # Monogram scale 0.85 → 1.05 → 1.00 with overshoot, fading in
    if t < 0.25:
        prog = t / 0.25
        scale = 0.85 + overshoot(prog) * 0.15
        op_mono = prog
    else:
        scale = 1.0
        op_mono = 1.0

    # Wordmark typewriter starts at t=0.4, "Brand Mint." = 11 chars × 30ms = 330ms
    word = "Brand Mint."
    if t < 0.4:
        word_shown = ""
    else:
        chars_visible = int((t - 0.4) / 0.030)
        word_shown = word[: min(chars_visible, len(word))]

    # CTA pill slides up + fades in starting at t=1.1, over 350ms
    cta_t = clamp((t - 1.1) / 0.35)
    cta_op = ease_out_cubic(cta_t)
    cta_dy = 80 * (1 - cta_op)

    # Subtle breathe on the whole composition
    breathe = 1.0 + 0.015 * math.sin(t / 0.5)
    cx, cy = W / 2, H / 2

    # Build monogram (gradient circle + single-stroke M)
    mono_cx, mono_cy, mono_r = W // 2, 720, 160
    monogram = f"""
    <g transform="translate({mono_cx} {mono_cy}) scale({scale}) translate({-mono_cx} {-mono_cy})" opacity="{op_mono}">
      <circle cx="{mono_cx}" cy="{mono_cy}" r="{mono_r}" fill="url(#mark)" filter="url(#softGlow)"/>
      <path d="M{mono_cx - mono_r * 0.42} {mono_cy + mono_r * 0.42}
               V {mono_cy - mono_r * 0.38}
               l {mono_r * 0.42} {mono_r * 0.38}
               l {mono_r * 0.42} {-mono_r * 0.38}
               V {mono_cy + mono_r * 0.42}"
            stroke="{BM_INK}" stroke-width="18" stroke-linecap="round"
            stroke-linejoin="round" fill="none"/>
    </g>
    """

    # Wordmark
    wordmark = f"""
    <text x="{W//2}" y="1000" text-anchor="middle" font-family="{DISPLAY}"
          font-size="86" font-weight="600" letter-spacing="-0.02em" fill="{CREAM}">
      {word_shown}
    </text>
    """

    # CTA pill
    pill_x, pill_y = (W - 720) // 2, 1280 + cta_dy
    pill = f"""
    <g opacity="{cta_op}" filter="url(#softGlow)">
      <rect x="{pill_x}" y="{pill_y}" width="720" height="140" rx="70" fill="{MINT_3}"/>
      <text x="{W//2}" y="{pill_y + 92}" text-anchor="middle" font-family="{DISPLAY}"
            font-size="48" font-weight="600" fill="{BM_INK}">
        Mint your next quarter  &#8594;
      </text>
    </g>
    """

    inner = f"""
    <rect width="{W}" height="{H}" fill="{BLACK}"/>
    <rect width="{W}" height="{H}" fill="url(#ctaGlow)"/>
    <g transform="translate({cx} {cy}) scale({breathe}) translate({-cx} {-cy})">
      {monogram}{wordmark}{pill}
    </g>
    {cinema_bars(dark=True)}
    """
    return svg_wrap(inner)


def shot_7(t):
    """10.60–12.00 — Hold CTA + URL typewriter."""
    # URL types in starting at t=0.1, ~16 chars × 30ms
    url = "brandmint.studio"
    if t < 0.1:
        url_shown = ""
    else:
        chars_visible = int((t - 0.1) / 0.030)
        url_shown = url[: min(chars_visible, len(url))]

    # Blinking cursor — sized to match where the typed URL actually ends
    # ('brandmint.studio' renders ~ 316px wide at 38pt mono with 0.06em tracking)
    cursor_x = W // 2 - 218 + 316
    show_cursor = (0.9 < t < 1.4) and (math.floor(t * 6) % 2 == 0)
    cursor = f'<rect x="{cursor_x}" y="1480" width="3" height="48" fill="{CREAM}"/>' if show_cursor else ""

    # Slow fade-out across the back half of the shot
    fade_out = clamp(1 - (t - 1.2) / 0.4) if t > 1.2 else 1.0

    # Rebuild the static CTA layer (same as shot_6 final state)
    mono_cx, mono_cy, mono_r = W // 2, 720, 160
    pill_x, pill_y = (W - 720) // 2, 1280

    inner = f"""
    <rect width="{W}" height="{H}" fill="{BLACK}"/>
    <rect width="{W}" height="{H}" fill="url(#ctaGlow)"/>
    <g opacity="{fade_out}">
      <circle cx="{mono_cx}" cy="{mono_cy}" r="{mono_r}" fill="url(#mark)" filter="url(#softGlow)"/>
      <path d="M{mono_cx - mono_r * 0.42} {mono_cy + mono_r * 0.42}
               V {mono_cy - mono_r * 0.38}
               l {mono_r * 0.42} {mono_r * 0.38}
               l {mono_r * 0.42} {-mono_r * 0.38}
               V {mono_cy + mono_r * 0.42}"
            stroke="{BM_INK}" stroke-width="18" stroke-linecap="round"
            stroke-linejoin="round" fill="none"/>
      <text x="{W//2}" y="1000" text-anchor="middle" font-family="{DISPLAY}"
            font-size="86" font-weight="600" letter-spacing="-0.02em" fill="{CREAM}">
        Brand Mint.
      </text>
      <rect x="{pill_x}" y="{pill_y}" width="720" height="140" rx="70"
            fill="{MINT_3}" filter="url(#softGlow)"/>
      <text x="{W//2}" y="{pill_y + 92}" text-anchor="middle" font-family="{DISPLAY}"
            font-size="48" font-weight="600" fill="{BM_INK}">
        Mint your next quarter  &#8594;
      </text>
      <text x="{W//2 - 218}" y="1518" font-family="{MONO}" font-size="38"
            letter-spacing="0.06em" fill="{MINT_3}">{url_shown}</text>
      {cursor}
    </g>
    {cinema_bars(dark=True)}
    """
    return svg_wrap(inner)


# ---------- shot table ----------
SHOTS_TABLE = [
    # (id, generator, duration, transition_in)
    ("01-hook",       shot_1, 1.60, "fade-from-black"),
    ("02-context",    shot_2, 2.00, "morph"),
    ("03-proof1",     shot_3, 1.60, "whip-h"),
    ("04-proof2",     shot_4, 1.60, "whip-v"),
    ("05-tension",    shot_5, 2.80, "fade-black"),
    ("06-cta",        shot_6, 3.00, "crossfade"),
    ("07-stamp",      shot_7, 1.60, "hold"),
]

# Transition durations
XFADE = {
    "fade-from-black": 0.50,
    "morph":           0.0,   # internal animation handles continuity
    "whip-h":          0.24,
    "whip-v":          0.20,
    "fade-black":      0.30,
    "crossfade":       0.40,
    "hold":            0.0,
}


# ---------- frame rendering ----------
def render_shot_frames(shot_id, generator, duration):
    """Render every frame of a shot to PNGs. Returns the frame directory."""
    shot_dir = FRAMES / shot_id
    shot_dir.mkdir(parents=True, exist_ok=True)
    total_frames = int(round(duration * FPS))
    for i in range(total_frames):
        t = i / FPS
        svg = generator(t)
        png_path = shot_dir / f"f-{i:04d}.png"
        cairosvg.svg2png(
            bytestring=svg.encode("utf-8"),
            write_to=str(png_path),
            output_width=W,
            output_height=H,
        )
    return shot_dir, total_frames


def encode_shot_clip(shot_id, shot_dir, total_frames):
    """Concat the PNG frames into an MP4."""
    out_clip = SHOTS / f"{shot_id}.mp4"
    cmd = [
        "ffmpeg", "-y",
        "-framerate", str(FPS),
        "-i", str(shot_dir / "f-%04d.png"),
        "-frames:v", str(total_frames),
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-r", str(FPS),
        str(out_clip),
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return out_clip


# ---------- score ----------
def build_score(total_duration: float) -> Path:
    """
    Build the score with multiple stems and impact hits.

      - Sub-bass drone:   55 Hz sine, full duration
      - Low-mid drone:    82.4 Hz sine, full duration (E2)
      - Mid drone:        110 Hz sine, full duration (A2)
      - Air:              brown noise, full duration
      - Impact hit @0.7s  (counter lands)
      - Whoosh @3.2s + pluck @3.2s  (shot 3 entry)
      - Whoosh @4.6s + pluck @4.6s  (shot 4 entry)
      - Cymbal @8.2s      (shot 6 entry, soft swell)
    """
    drone_wav = OUT / "_drone.wav"
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"sine=frequency=55:duration={total_duration}",
        "-f", "lavfi", "-i", f"sine=frequency=82.4:duration={total_duration}",
        "-f", "lavfi", "-i", f"sine=frequency=110:duration={total_duration}",
        "-f", "lavfi", "-i", f"anoisesrc=duration={total_duration}:color=brown:amplitude=0.04",
        "-filter_complex",
            "[0]volume=0.30[bass];"
            "[1]volume=0.20[low];"
            "[2]volume=0.16[mid];"
            "[3]volume=0.45[air];"
            "[bass][low][mid][air]amix=inputs=4:duration=longest,"
            "lowpass=f=1800,"
            f"afade=t=in:st=0:d=1.2,"
            f"afade=t=out:st={total_duration - 1.2}:d=1.2,"
            "volume=0.88",
        "-ac", "2", "-ar", "48000",
        "-t", f"{total_duration}",
        str(drone_wav),
    ]
    subprocess.run(cmd, check=True, capture_output=True)

    # Impact hit (single low thud)
    impact_wav = OUT / "_impact.wav"
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "sine=frequency=65:duration=0.4",
        "-af", "afade=t=in:st=0:d=0.005,afade=t=out:st=0.05:d=0.35,volume=0.85",
        "-ac", "2", "-ar", "48000",
        str(impact_wav),
    ]
    subprocess.run(cmd, check=True, capture_output=True)

    # Pluck (perfect fifth ping)
    pluck_wav = OUT / "_pluck.wav"
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "sine=frequency=880:duration=0.4",
        "-f", "lavfi", "-i", "sine=frequency=1320:duration=0.4",
        "-filter_complex",
            "[0]volume=0.55[a];"
            "[1]volume=0.40[b];"
            "[a][b]amix=inputs=2,"
            "afade=t=in:st=0:d=0.005,"
            "afade=t=out:st=0.06:d=0.34,"
            "volume=0.6",
        "-ac", "2", "-ar", "48000",
        str(pluck_wav),
    ]
    subprocess.run(cmd, check=True, capture_output=True)

    # Whoosh (filtered noise sweep)
    whoosh_wav = OUT / "_whoosh.wav"
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "anoisesrc=duration=0.35:color=white:amplitude=0.8",
        "-af",
            "highpass=f=200,"
            "lowpass=f=3000,"
            "afade=t=in:st=0:d=0.05,"
            "afade=t=out:st=0.18:d=0.17,"
            "volume=0.55",
        "-ac", "2", "-ar", "48000",
        str(whoosh_wav),
    ]
    subprocess.run(cmd, check=True, capture_output=True)

    # Cymbal swell (filtered brown noise rising)
    cymbal_wav = OUT / "_cymbal.wav"
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "anoisesrc=duration=1.5:color=pink:amplitude=0.5",
        "-af",
            "highpass=f=4000,"
            "lowpass=f=12000,"
            "afade=t=in:st=0:d=0.8,"
            "afade=t=out:st=1.0:d=0.5,"
            "volume=0.32",
        "-ac", "2", "-ar", "48000",
        str(cymbal_wav),
    ]
    subprocess.run(cmd, check=True, capture_output=True)

    # Mix all stems together with -itsoffset for timing.
    out_score = OUT / "score.wav"
    cmd = [
        "ffmpeg", "-y",
        "-i", str(drone_wav),                             # 0
        "-itsoffset", "0.70", "-i", str(impact_wav),       # 1 — counter lands
        "-itsoffset", "3.20", "-i", str(whoosh_wav),       # 2 — shot 3 entry
        "-itsoffset", "3.20", "-i", str(pluck_wav),        # 3
        "-itsoffset", "4.60", "-i", str(whoosh_wav),       # 4 — shot 4 entry
        "-itsoffset", "4.60", "-i", str(pluck_wav),        # 5
        "-itsoffset", "8.20", "-i", str(cymbal_wav),       # 6 — shot 6 entry
        "-filter_complex",
            "[0][1][2][3][4][5][6]amix=inputs=7:duration=first:normalize=0,"
            "alimiter=limit=0.95",
        "-ac", "2", "-ar", "48000",
        "-t", f"{total_duration}",
        str(out_score),
    ]
    subprocess.run(cmd, check=True, capture_output=True)

    # Cleanup stems
    for stem in [drone_wav, impact_wav, pluck_wav, whoosh_wav, cymbal_wav]:
        stem.unlink()
    return out_score


# ---------- final mux ----------
def mux_final(clips, score_path):
    """Chain clips with their transitions + mux score."""
    out_mp4 = OUT / "brand-mint-hollywood.mp4"
    durations = [s[2] for s in SHOTS_TABLE]
    transitions = [s[3] for s in SHOTS_TABLE]

    inputs = []
    for c in clips:
        inputs += ["-i", str(c)]

    # Normalize each clip's stream
    chain = [f"[{i}:v]format=yuv420p,fps={FPS},setsar=1[v{i}]" for i in range(len(clips))]

    # Build xfade chain. xfade transitions used:
    #   morph / hold → concat at boundary (no overlap)
    #   whip-h → slideleft
    #   whip-v → slideup
    #   fade-black → fadeblack
    #   crossfade → fade
    xfade_map = {
        "whip-h": "slideleft",
        "whip-v": "slideup",
        "fade-black": "fadeblack",
        "crossfade": "fade",
        "fade-from-black": "fade",  # for the opening
    }

    last_label = "[v0]"
    cum_offset = durations[0]
    xfade_parts = []
    for i in range(1, len(clips)):
        trans = transitions[i]
        xfade_dur = XFADE[trans]
        if xfade_dur == 0 or trans not in xfade_map:
            # Concat at boundary — use xfade with very short fade to remain in filter graph
            xfade_dur = 0.04
            xf_type = "fade"
        else:
            xf_type = xfade_map[trans]
        offset = cum_offset - xfade_dur
        out_label = f"[x{i}]" if i < len(clips) - 1 else "[vmix]"
        xfade_parts.append(
            f"{last_label}[v{i}]xfade=transition={xf_type}:duration={xfade_dur}:offset={offset:.3f}{out_label}"
        )
        last_label = out_label
        cum_offset += durations[i] - xfade_dur

    # Opening fade-from-black + closing fade-to-black
    final = f"{last_label}fade=t=in:st=0:d=0.4,fade=t=out:st={cum_offset - 0.5}:d=0.5[vout]"
    filtergraph = ";".join(chain + xfade_parts + [final])

    print(f"[mux] total composition duration: {cum_offset:.2f}s")

    cmd = [
        "ffmpeg", "-y",
        *inputs,
        "-i", str(score_path),
        "-filter_complex", filtergraph,
        "-map", "[vout]",
        "-map", f"{len(clips)}:a",
        "-c:v", "libx264", "-preset", "medium", "-crf", "22",
        "-tune", "grain",
        "-maxrate", "5M", "-bufsize", "10M",
        "-pix_fmt", "yuv420p",
        "-r", str(FPS),
        "-c:a", "aac", "-b:a", "160k", "-ar", "48000",
        "-movflags", "+faststart",
        "-shortest",
        str(out_mp4),
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    size_mb = out_mp4.stat().st_size / 1024 / 1024
    print(f"[done] {out_mp4}  ({size_mb:.2f} MB, ~{cum_offset:.2f}s)")
    return out_mp4


# ---------- main ----------
def main():
    # Clean prior runs
    for d in (FRAMES, SHOTS):
        for child in d.glob("*"):
            if child.is_file():
                child.unlink()
            else:
                for f in child.iterdir():
                    f.unlink()
                child.rmdir()

    # Render frames per shot
    clips = []
    for shot_id, gen, dur, _ in SHOTS_TABLE:
        shot_dir, n_frames = render_shot_frames(shot_id, gen, dur)
        print(f"[render] {shot_id}: {n_frames} frames")
        clip = encode_shot_clip(shot_id, shot_dir, n_frames)
        clips.append(clip)
        size_mb = clip.stat().st_size / 1024 / 1024
        print(f"[clip]   {clip.name}  ({dur}s, {size_mb:.1f} MB)")

    # Score
    total_dur = sum(s[2] for s in SHOTS_TABLE) - sum(
        XFADE[s[3]] for s in SHOTS_TABLE[1:]
    )
    print(f"[score]  building score for {total_dur:.2f}s")
    score = build_score(total_dur + 0.5)
    print(f"[score]  done: {score}")

    # Mux
    mux_final(clips, score)


if __name__ == "__main__":
    main()
