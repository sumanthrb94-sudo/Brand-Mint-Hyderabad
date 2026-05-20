"""
Brand Mint — "Studio." — v5 Apple-grammar 50s anthem.

Eight slow beats. Average 6s each. All crossfade transitions. No
cinema bars. Mint appears at exactly two moments (the cold-open dot
and the monogram reveal). One musical swell at the reveal.

Output: out/brand-mint-studio.mp4  (~1080×1920, 50s, ~3-5 MB)
"""
import math
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import cairosvg

ROOT = Path(__file__).resolve().parent
FRAMES = ROOT / "frames"
CLIPS = ROOT / "clips"
OUT = ROOT / "out"
for d in (FRAMES, CLIPS, OUT):
    d.mkdir(parents=True, exist_ok=True)

# ---------- format ----------
W, H = 1080, 1920
FPS = 30

# ---------- tokens ----------
BLACK = "#000000"
INK = "#0A0E0C"
CREAM = "#F5F1EA"
MINT_2 = "#7CF6C8"
MINT_3 = "#10B981"

DISPLAY = "Plus Jakarta Sans, Inter, system-ui, sans-serif"
MONO = "JetBrains Mono, ui-monospace, monospace"

# ---------- easing ----------
def ease_out_cubic(t): return 1 - (1 - t) ** 3
def ease_in_out(t):    return 0.5 * (1 - math.cos(math.pi * t)) if 0 <= t <= 1 else (0 if t < 0 else 1)
def clamp(x, lo=0.0, hi=1.0): return max(lo, min(hi, x))
def overshoot(t):
    c1 = 1.70158
    return 1 + (c1 + 1) * (t - 1) ** 3 + c1 * (t - 1) ** 2


# ---------- shared defs ----------
DEFS = f"""
<defs>
  <radialGradient id="mintGlow" cx="50%" cy="50%" r="62%">
    <stop offset="0%"   stop-color="{MINT_3}" stop-opacity="0.55"/>
    <stop offset="55%"  stop-color="{MINT_3}" stop-opacity="0.15"/>
    <stop offset="100%" stop-color="{BLACK}"  stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="mark" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="{MINT_2}"/>
    <stop offset="100%" stop-color="{MINT_3}"/>
  </linearGradient>
  <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur stdDeviation="14" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur stdDeviation="6" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
</defs>
"""


def svg_wrap(inner):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">{DEFS}{inner}</svg>'


def slow_zoom(t, duration, max_scale=1.04):
    """Apple's signature: imperceptibly slow zoom over each beat."""
    return 1.0 + (max_scale - 1.0) * (t / duration)


# ---------- per-beat renderers ----------
def shot_1_dot(t, dur):
    """0–6s: pure black + one mint dot, centered. Drone enters at 1.5s."""
    # Dot pulse: starts 1px, gently grows to 8px by t=3, holds.
    if t < 1.0:
        r = 0
    elif t < 3.0:
        r = ease_out_cubic((t - 1.0) / 2.0) * 8
    else:
        # Subtle breathe
        r = 8 + 0.6 * math.sin((t - 3.0) * 1.4)
    inner = f"""
    <rect width="{W}" height="{H}" fill="{BLACK}"/>
    <circle cx="{W//2}" cy="{H//2}" r="{r}" fill="{MINT_3}" filter="url(#softGlow)"/>
    """
    return inner


def shot_2_a_studio(t, dur):
    """6–12s: 'A studio.' fades up over 1.2s, holds, gentle zoom."""
    op = ease_out_cubic(clamp(t / 1.2))
    scale = slow_zoom(t, dur)
    cx, cy = W / 2, H / 2
    inner = f"""
    <rect width="{W}" height="{H}" fill="{BLACK}"/>
    <g transform="translate({cx} {cy}) scale({scale}) translate({-cx} {-cy})">
      <text x="{W//2}" y="{H//2 + 60}" text-anchor="middle" font-family="{DISPLAY}"
            font-size="180" font-weight="600" letter-spacing="-0.025em"
            fill="{CREAM}" opacity="{op}">A studio.</text>
    </g>
    """
    return inner


def shot_3_city(t, dur):
    """12–18.5s: 'In a city of agencies.' """
    op = ease_out_cubic(clamp(t / 1.0))
    scale = slow_zoom(t, dur, 1.035)
    cx, cy = W / 2, H / 2
    inner = f"""
    <rect width="{W}" height="{H}" fill="{BLACK}"/>
    <g transform="translate({cx} {cy}) scale({scale}) translate({-cx} {-cy})">
      <text x="{W//2}" y="{H//2 + 35}" text-anchor="middle" font-family="{DISPLAY}"
            font-size="84" font-weight="500" letter-spacing="-0.02em"
            fill="{CREAM}" opacity="{op * 0.95}">In a city of agencies.</text>
    </g>
    """
    return inner


def shot_4_we_chose(t, dur):
    """18.5–26s: 'We chose to ship.' with italic mint on 'ship'.
    Cairosvg can't mix tspan styles in centered text, so we render the line in two
    text elements positioned manually.
    """
    op = ease_out_cubic(clamp(t / 1.0))
    scale = slow_zoom(t, dur, 1.035)
    cx, cy = W / 2, H / 2
    # 'We chose to ' in cream, 'ship.' in italic mint with glow
    # Render as two text elements, anchored so they read as one phrase.
    # 'We chose to ' renders ~ 12 chars at 130pt = visually ~ 480px wide.
    # We'll right-anchor the first phrase ending just before center,
    # left-anchor the mint italic just after center, separated by space.
    inner = f"""
    <rect width="{W}" height="{H}" fill="{BLACK}"/>
    <g transform="translate({cx} {cy}) scale({scale}) translate({-cx} {-cy})">
      <text x="{W//2}" y="{H//2 - 30}" text-anchor="middle" font-family="{DISPLAY}"
            font-size="100" font-weight="500" letter-spacing="-0.02em"
            fill="{CREAM}" opacity="{op}">We chose</text>
      <text x="{W//2}" y="{H//2 + 110}" text-anchor="middle" font-family="{DISPLAY}"
            font-size="120" font-weight="600" font-style="italic" letter-spacing="-0.02em"
            fill="{CREAM}" opacity="{op}">to ship.</text>
    </g>
    """
    return inner


def shot_5_monogram(t, dur):
    """26–34s: The monogram emerges. Music swells.

    Beat 1 (0–1.5s):  glow fades in
    Beat 2 (0.6–2.5s): monogram scales 0.85 → 1.00 with overshoot
    Beat 3 (2.5–8.0s): monogram holds with subtle breathe
    """
    # Glow opacity
    glow_op = ease_out_cubic(clamp(t / 1.5))
    # Monogram scale + opacity
    if t < 0.6:
        mono_op = 0
        mono_scale = 0.85
    elif t < 2.5:
        prog = (t - 0.6) / 1.9
        mono_op = ease_out_cubic(prog)
        mono_scale = 0.85 + overshoot(prog) * 0.15
    else:
        mono_op = 1.0
        # Gentle breathe: 1.0 ± 0.015 over 5s cycle
        mono_scale = 1.0 + 0.015 * math.sin((t - 2.5) * 0.9)

    mx, my, mr = W // 2, H // 2, 220
    inner = f"""
    <rect width="{W}" height="{H}" fill="{BLACK}"/>
    <rect width="{W}" height="{H}" fill="url(#mintGlow)" opacity="{glow_op}"/>
    <g transform="translate({mx} {my}) scale({mono_scale}) translate({-mx} {-my})" opacity="{mono_op}" filter="url(#glow)">
      <circle cx="{mx}" cy="{my}" r="{mr}" fill="url(#mark)"/>
      <path d="M{mx - mr * 0.42} {my + mr * 0.42}
               V {my - mr * 0.38}
               l {mr * 0.42} {mr * 0.38}
               l {mr * 0.42} {-mr * 0.38}
               V {my + mr * 0.42}"
            stroke="{BLACK}" stroke-width="22" stroke-linecap="round"
            stroke-linejoin="round" fill="none"/>
    </g>
    """
    return inner


def shot_6_wordmark(t, dur):
    """34–40s: 'Brand Mint.' wordmark — cream below where the monogram was."""
    op = ease_out_cubic(clamp(t / 1.2))
    # Keep a residual mint glow from shot 5
    glow_op = max(0, 1.0 - t / 5.0) * 0.6
    cx, cy = W / 2, H / 2
    scale = slow_zoom(t, dur)
    inner = f"""
    <rect width="{W}" height="{H}" fill="{BLACK}"/>
    <rect width="{W}" height="{H}" fill="url(#mintGlow)" opacity="{glow_op}"/>
    <g transform="translate({cx} {cy}) scale({scale}) translate({-cx} {-cy})">
      <text x="{W//2}" y="{H//2 + 40}" text-anchor="middle" font-family="{DISPLAY}"
            font-size="130" font-weight="600" letter-spacing="-0.025em"
            fill="{CREAM}" opacity="{op}">Brand Mint.</text>
    </g>
    """
    return inner


def shot_7_designed_in(t, dur):
    """40–46s: 'Designed in HITEC City, Hyderabad.' — homage to Apple's tagline."""
    op = ease_out_cubic(clamp(t / 1.0))
    cx, cy = W / 2, H / 2
    scale = slow_zoom(t, dur, 1.02)
    inner = f"""
    <rect width="{W}" height="{H}" fill="{BLACK}"/>
    <g transform="translate({cx} {cy}) scale({scale}) translate({-cx} {-cy})">
      <text x="{W//2}" y="{H//2 + 20}" text-anchor="middle" font-family="{MONO}"
            font-size="42" font-weight="500" letter-spacing="0.16em"
            fill="{CREAM}" opacity="{op * 0.88}">DESIGNED IN HITEC CITY,</text>
      <text x="{W//2}" y="{H//2 + 90}" text-anchor="middle" font-family="{MONO}"
            font-size="42" font-weight="500" letter-spacing="0.16em"
            fill="{CREAM}" opacity="{op * 0.88}">HYDERABAD.</text>
    </g>
    """
    return inner


def shot_8_url(t, dur):
    """46–50s: 'brandmint.studio' types in. Fade to black at the end."""
    url = "brandmint.studio"
    # Type in over 1.4s starting at t=0.0
    if t < 0.05:
        url_shown = ""
    else:
        chars = int((t - 0.05) / 0.085)  # slower typewriter than v4
        url_shown = url[:min(chars, len(url))]
    # Cursor blinks while typing, then disappears
    show_cursor = (t < 1.5) and (math.floor(t * 6) % 2 == 0)
    cursor_x = W // 2 - 200 + 26 * len(url_shown)
    cursor = (
        f'<rect x="{cursor_x}" y="{H//2 - 30}" width="3" height="48" fill="{CREAM}"/>'
        if show_cursor else ""
    )
    # Final fade-out in the last 1s
    fade_out = clamp(1 - (t - 3.0) / 1.0) if t > 3.0 else 1.0
    inner = f"""
    <rect width="{W}" height="{H}" fill="{BLACK}"/>
    <g opacity="{fade_out}">
      <text x="{W//2 - 200}" y="{H//2 + 16}" font-family="{MONO}" font-size="38"
            font-weight="500" letter-spacing="0.06em" fill="{MINT_3}">{url_shown}</text>
      {cursor}
    </g>
    """
    return inner


# ---------- shot table ----------
@dataclass
class Shot:
    id: str
    render: Callable[[float, float], str]
    duration: float


SHOTS = [
    Shot("01-dot",         shot_1_dot,         6.0),
    Shot("02-a-studio",    shot_2_a_studio,    6.0),
    Shot("03-city",        shot_3_city,        6.5),
    Shot("04-we-chose",    shot_4_we_chose,    7.5),
    Shot("05-monogram",    shot_5_monogram,    8.0),
    Shot("06-wordmark",    shot_6_wordmark,    6.0),
    Shot("07-designed-in", shot_7_designed_in, 6.0),
    Shot("08-url",         shot_8_url,         4.0),
]
XFADE = 0.8  # All crossfades — Apple's only transition vocabulary


# ---------- pipeline ----------
def render_shot(shot):
    sd = FRAMES / shot.id
    sd.mkdir(parents=True, exist_ok=True)
    n = int(round(shot.duration * FPS))
    for i in range(n):
        t = i / FPS
        svg = svg_wrap(shot.render(t, shot.duration))
        png = sd / f"f-{i:04d}.png"
        cairosvg.svg2png(
            bytestring=svg.encode("utf-8"),
            write_to=str(png),
            output_width=W,
            output_height=H,
        )
    return sd, n


def encode_shot(shot, sd, n):
    out = CLIPS / f"{shot.id}.mp4"
    subprocess.run([
        "ffmpeg", "-y",
        "-framerate", str(FPS),
        "-i", str(sd / "f-%04d.png"),
        "-frames:v", str(n),
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-r", str(FPS),
        str(out),
    ], check=True, capture_output=True)
    return out


def build_score(total: float) -> Path:
    """Apple-style score: long drone bed + ONE swell at the monogram reveal.

    Reveal occurs at composition t ≈ 26s (shot 5 start), peak at ~28s,
    settle by 30s. Outside that swell, the cut is very quiet.
    """
    # Long calm drone
    drone = OUT / "_drone.wav"
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"sine=frequency=55:duration={total}",
        "-f", "lavfi", "-i", f"sine=frequency=82.4:duration={total}",
        "-f", "lavfi", "-i", f"sine=frequency=110:duration={total}",
        "-f", "lavfi", "-i", f"anoisesrc=duration={total}:color=brown:amplitude=0.035",
        "-filter_complex",
            "[0]volume=0.22[bass];"
            "[1]volume=0.14[low];"
            "[2]volume=0.10[mid];"
            "[3]volume=0.32[air];"
            "[bass][low][mid][air]amix=inputs=4:duration=longest,"
            "lowpass=f=1500,"
            f"afade=t=in:st=0:d=2.5,"
            f"afade=t=out:st={total - 2.5}:d=2.5,"
            "volume=0.72",
        "-ac", "2", "-ar", "48000",
        "-t", f"{total}",
        str(drone),
    ], check=True, capture_output=True)

    # The reveal swell — a perfect-fifth chord with cymbal-style air, 4s arc
    swell = OUT / "_swell.wav"
    swell_dur = 4.5
    subprocess.run([
        "ffmpeg", "-y",
        # Root + fifth + octave + bright air
        "-f", "lavfi", "-i", f"sine=frequency=110:duration={swell_dur}",
        "-f", "lavfi", "-i", f"sine=frequency=164.8:duration={swell_dur}",  # E (fifth above A)
        "-f", "lavfi", "-i", f"sine=frequency=220:duration={swell_dur}",   # A (octave)
        "-f", "lavfi", "-i", f"sine=frequency=329.6:duration={swell_dur}", # E5 (high fifth)
        "-f", "lavfi", "-i", f"anoisesrc=duration={swell_dur}:color=pink:amplitude=0.45",
        "-filter_complex",
            "[0]volume=0.45[r];"
            "[1]volume=0.35[fifth];"
            "[2]volume=0.30[oct];"
            "[3]volume=0.22[hi];"
            "[4]highpass=f=4000,lowpass=f=12000,volume=0.30[air];"
            "[r][fifth][oct][hi][air]amix=inputs=5:duration=longest,"
            "afade=t=in:st=0:d=1.8,"
            "afade=t=out:st=2.7:d=1.8,"
            "volume=0.55",
        "-ac", "2", "-ar", "48000",
        str(swell),
    ], check=True, capture_output=True)

    # Mix drone + swell (offset = 26.0s — shot 5 start)
    out_score = OUT / "score.wav"
    subprocess.run([
        "ffmpeg", "-y",
        "-i", str(drone),
        "-itsoffset", "26.0", "-i", str(swell),
        "-filter_complex", "[0][1]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.93",
        "-ac", "2", "-ar", "48000",
        "-t", f"{total}",
        str(out_score),
    ], check=True, capture_output=True)
    drone.unlink()
    swell.unlink()
    return out_score


def mux(clips, score):
    out_mp4 = OUT / "brand-mint-studio.mp4"
    inputs = []
    for c in clips:
        inputs += ["-i", str(c)]
    chain = [f"[{i}:v]format=yuv420p,fps={FPS},setsar=1[v{i}]" for i in range(len(clips))]
    last = "[v0]"
    cum = SHOTS[0].duration
    xfade_parts = []
    for i in range(1, len(clips)):
        offset = cum - XFADE
        out_label = f"[x{i}]" if i < len(clips) - 1 else "[vmix]"
        xfade_parts.append(
            f"{last}[v{i}]xfade=transition=fade:duration={XFADE}:offset={offset:.3f}{out_label}"
        )
        last = out_label
        cum += SHOTS[i].duration - XFADE

    final = f"{last}fade=t=in:st=0:d=1.5,fade=t=out:st={cum - 1.2}:d=1.2[vout]"
    filtergraph = ";".join(chain + xfade_parts + [final])
    print(f"[mux] composition duration: {cum:.2f}s")
    subprocess.run([
        "ffmpeg", "-y",
        *inputs,
        "-i", str(score),
        "-filter_complex", filtergraph,
        "-map", "[vout]",
        "-map", f"{len(clips)}:a",
        "-c:v", "libx264", "-preset", "medium", "-crf", "22",
        "-tune", "stillimage",
        "-maxrate", "5M", "-bufsize", "10M",
        "-pix_fmt", "yuv420p",
        "-r", str(FPS),
        "-c:a", "aac", "-b:a", "160k", "-ar", "48000",
        "-movflags", "+faststart",
        "-shortest",
        str(out_mp4),
    ], check=True, capture_output=True)
    size_mb = out_mp4.stat().st_size / 1024 / 1024
    print(f"[done] {out_mp4} ({size_mb:.2f} MB, ~{cum:.2f}s)")
    return out_mp4


def main():
    # Clean
    for d in (FRAMES, CLIPS):
        for child in list(d.iterdir()) if d.exists() else []:
            if child.is_file():
                child.unlink()
            else:
                for f in child.iterdir():
                    f.unlink()
                child.rmdir()

    clips = []
    for shot in SHOTS:
        sd, n = render_shot(shot)
        print(f"[render] {shot.id}: {n} frames")
        clip = encode_shot(shot, sd, n)
        clips.append(clip)

    total = sum(s.duration for s in SHOTS) - XFADE * (len(SHOTS) - 1)
    print(f"[score] for {total:.2f}s")
    score = build_score(total + 0.3)
    mux(clips, score)


if __name__ == "__main__":
    main()
