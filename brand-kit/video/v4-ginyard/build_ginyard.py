"""
Brand Mint — "Built to Ship" — v4 Ginyard-grammar Reel.

Pattern borrowed from canva.link/402uvoziftavy5g (Ginyard Company
"Modern Animated Business Advertising Mobile Video"):
  - Broken-line question hook (one word per beat)
  - Alternating solid colour blocks per beat (no glows, no radial fades)
  - Rapid services stack
  - Contact / CTA close

Tokens are Brand Mint only. No revenue claims.

Output: out/brand-mint-builtoship.mp4  (~1080×1920, 12s, ~1-2 MB)
"""
import math
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Optional

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

# ---------- brand tokens ----------
BLACK = "#000000"
INK = "#0A0E0C"
CREAM = "#F5F1EA"
MINT_2 = "#7CF6C8"
MINT_3 = "#10B981"

DISPLAY = "Plus Jakarta Sans, Inter, system-ui, sans-serif"
MONO = "JetBrains Mono, ui-monospace, monospace"

# ---------- easing ----------
def ease_out_cubic(t):  return 1 - (1 - t) ** 3
def clamp(x, lo=0.0, hi=1.0): return max(lo, min(hi, x))
def overshoot(t):
    c1 = 1.70158
    return 1 + (c1 + 1) * (t - 1) ** 3 + c1 * (t - 1) ** 2


# ---------- beat data ----------
@dataclass
class Beat:
    id: str
    duration: float
    bg: str            # hex color
    transition_in: str # "fade-from-black" | "whip-h" | "whip-v" | "fade-black" | "cut" | "crossfade" | "hold"
    render: Callable[[float, float], str]  # (t, duration) -> svg_inner


# ---------- shared cinema bars ----------
def cinema_bars(bg):
    # bars adapt to bg darkness
    dark = bg in (BLACK, INK)
    text_color = CREAM if dark else INK
    bar_color = MINT_3 if dark else INK
    bar_opacity = 0.85 if dark else 0.55
    return f"""
    <rect x="0" y="0"     width="{W}" height="3" fill="{bar_color}" opacity="{bar_opacity}"/>
    <rect x="0" y="{H-3}" width="{W}" height="3" fill="{bar_color}" opacity="{bar_opacity}"/>
    <text x="48" y="{H-22}" font-family="{MONO}" font-size="18"
          letter-spacing="0.22em" fill="{text_color}" opacity="0.55">BRAND MINT</text>
    <text x="{W-48}" y="{H-22}" text-anchor="end" font-family="{MONO}"
          font-size="18" letter-spacing="0.18em" fill="{text_color}"
          opacity="0.55">brandmint.studio</text>
    """


def svg_wrap(bg, inner):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
        f'width="{W}" height="{H}">'
        f'<rect width="{W}" height="{H}" fill="{bg}"/>'
        f'{inner}'
        f'{cinema_bars(bg)}'
        f'</svg>'
    )


def big_centered(text, size, color, y=None, font_weight=600, italic=False,
                 tspans=None, family=DISPLAY):
    """One centered text element with optional inline tspans."""
    if y is None:
        y = H // 2 + size // 4  # roughly center vertical
    style = f'font-style="italic"' if italic else ""
    if tspans:
        # tspans = [(text, color, italic), ...]
        children = ""
        for txt, col, ital in tspans:
            ts_style = ' font-style="italic"' if ital else ""
            children += f'<tspan fill="{col}"{ts_style}>{txt}</tspan>'
        body = children
    else:
        body = text
    return (
        f'<text x="{W//2}" y="{y}" text-anchor="middle" '
        f'font-family="{family}" font-size="{size}" font-weight="{font_weight}" '
        f'letter-spacing="-0.025em" fill="{color}" {style}>{body}</text>'
    )


# ---------- per-beat renderers ----------
def r_word(text, size=200, color=None, weight=600, y=None, family=DISPLAY):
    """One-word beat: word fades in with a 50ms scale-up; otherwise static."""
    def render(t, dur):
        scale = 1.0 + 0.02 * min(1.0, t / 0.15)  # tiny entrance settle
        cx, cy = W / 2, H / 2
        inner = (
            f'<g transform="translate({cx} {cy}) scale({scale}) '
            f'translate({-cx} {-cy})">'
            f'{big_centered(text, size, color, y=y, font_weight=weight, family=family)}'
            f'</g>'
        )
        return inner
    return render


def r_that_lasts(t, dur):
    """Beat 4: 'that lasts?' — all mint italic, no inline tspans."""
    # Single-line, single-style — avoids cairosvg tspan-center collision
    return big_centered(
        "that lasts?", 150, MINT_3, y=H // 2 + 50,
        font_weight=600, italic=True,
    )


def r_studio_reveal(t, dur):
    """Beat 5: 'We're a studio.' — all cream, single style."""
    return big_centered(
        "We're a studio.", 110, CREAM, y=H // 2 + 35,
        font_weight=600,
    )


def r_not_an_agency(t, dur):
    """Beat 6: 'Not an agency.' — all cream italic (italic IS the emphasis)."""
    return big_centered(
        "Not an agency.", 110, CREAM, y=H // 2 + 35,
        font_weight=600, italic=True,
    )


def r_ai(t, dur):
    """Beat 9: 'AI.' — solid mint italic."""
    return big_centered(
        "AI.", 360, MINT_3, y=H // 2 + 100,
        font_weight=600, italic=True,
    )


def r_built_hitec(t, dur):
    """Beat 10: 'Built in HITEC City.' specificity line."""
    return big_centered("Built in HITEC City.", 88, CREAM, font_weight=500)


def r_booking_q3(t, dur):
    """Beat 11: 'Booking' display + 'Q3 2026.' mono on mint bg."""
    return (
        big_centered("Booking", 80, INK, y=H // 2 - 30, font_weight=500) +
        big_centered("Q3 2026.", 130, INK, y=H // 2 + 110, font_weight=500, family=MONO)
    )


def r_cta(t, dur):
    """Beat 12: monogram + 'Brand Mint.' + CTA pill.

    Monogram fades in scaling with overshoot 0–0.3s.
    Wordmark typewriter 0.4–0.7s.
    CTA slide-up 1.0–1.35s.
    """
    if t < 0.30:
        prog = t / 0.30
        scale = 0.85 + overshoot(prog) * 0.15
        op_mono = prog
    else:
        scale, op_mono = 1.0, 1.0
    word = "Brand Mint."
    if t < 0.40:
        word_shown = ""
    else:
        chars = int((t - 0.40) / 0.030)
        word_shown = word[:min(chars, len(word))]
    cta_t = clamp((t - 1.00) / 0.35)
    cta_op = ease_out_cubic(cta_t)
    cta_dy = 80 * (1 - cta_op)

    mx, my, mr = W // 2, 720, 150
    pill_x, pill_y = (W - 720) // 2, 1280 + cta_dy
    return f"""
    <radialGradient id="ctaGlow"  cx="50%" cy="50%" r="60%">
      <stop offset="0%"   stop-color="{MINT_3}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="{BLACK}" stop-opacity="0"/>
    </radialGradient>
    <rect width="{W}" height="{H}" fill="url(#ctaGlow)"/>
    <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <linearGradient id="mark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{MINT_2}"/>
      <stop offset="100%" stop-color="{MINT_3}"/>
    </linearGradient>
    <g transform="translate({mx} {my}) scale({scale}) translate({-mx} {-my})" opacity="{op_mono}">
      <circle cx="{mx}" cy="{my}" r="{mr}" fill="url(#mark)" filter="url(#softGlow)"/>
      <path d="M{mx - mr * 0.42} {my + mr * 0.42}
               V {my - mr * 0.38}
               l {mr * 0.42} {mr * 0.38}
               l {mr * 0.42} {-mr * 0.38}
               V {my + mr * 0.42}"
            stroke="{BLACK}" stroke-width="17" stroke-linecap="round"
            stroke-linejoin="round" fill="none"/>
    </g>
    <text x="{W//2}" y="990" text-anchor="middle" font-family="{DISPLAY}"
          font-size="84" font-weight="600" letter-spacing="-0.02em" fill="{CREAM}">
      {word_shown}
    </text>
    <g opacity="{cta_op}" filter="url(#softGlow)">
      <rect x="{pill_x}" y="{pill_y}" width="720" height="140" rx="70" fill="{MINT_3}"/>
      <text x="{W//2}" y="{pill_y + 92}" text-anchor="middle" font-family="{DISPLAY}"
            font-size="48" font-weight="600" fill="{BLACK}">
        Start a project  &#8594;
      </text>
    </g>
    """


def r_url_stamp(t, dur):
    """Beat 13: URL types in + cursor + slow fade."""
    url = "brandmint.studio"
    if t < 0.05:
        url_shown = ""
    else:
        chars = int((t - 0.05) / 0.030)
        url_shown = url[:min(chars, len(url))]
    show_cursor = (0.55 < t < 0.85) and (math.floor(t * 6) % 2 == 0)
    cursor_x = W // 2 - 218 + 316
    cursor = f'<rect x="{cursor_x}" y="1480" width="3" height="48" fill="{CREAM}"/>' if show_cursor else ""
    fade_out = clamp(1 - (t - 0.6) / 0.4) if t > 0.6 else 1.0
    # also keep the CTA pill + monogram from beat 12 visible
    mx, my, mr = W // 2, 720, 150
    pill_x, pill_y = (W - 720) // 2, 1280
    return f"""
    <radialGradient id="ctaGlow"  cx="50%" cy="50%" r="60%">
      <stop offset="0%"   stop-color="{MINT_3}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="{BLACK}" stop-opacity="0"/>
    </radialGradient>
    <rect width="{W}" height="{H}" fill="url(#ctaGlow)"/>
    <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <linearGradient id="mark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{MINT_2}"/>
      <stop offset="100%" stop-color="{MINT_3}"/>
    </linearGradient>
    <g opacity="{fade_out}">
      <circle cx="{mx}" cy="{my}" r="{mr}" fill="url(#mark)" filter="url(#softGlow)"/>
      <path d="M{mx - mr * 0.42} {my + mr * 0.42}
               V {my - mr * 0.38}
               l {mr * 0.42} {mr * 0.38}
               l {mr * 0.42} {-mr * 0.38}
               V {my + mr * 0.42}"
            stroke="{BLACK}" stroke-width="17" stroke-linecap="round"
            stroke-linejoin="round" fill="none"/>
      <text x="{W//2}" y="990" text-anchor="middle" font-family="{DISPLAY}"
            font-size="84" font-weight="600" letter-spacing="-0.02em" fill="{CREAM}">
        Brand Mint.
      </text>
      <rect x="{pill_x}" y="{pill_y}" width="720" height="140" rx="70"
            fill="{MINT_3}" filter="url(#softGlow)"/>
      <text x="{W//2}" y="{pill_y + 92}" text-anchor="middle" font-family="{DISPLAY}"
            font-size="48" font-weight="600" fill="{BLACK}">
        Start a project  &#8594;
      </text>
      <text x="{W//2 - 218}" y="1518" font-family="{MONO}" font-size="38"
            letter-spacing="0.06em" fill="{MINT_3}">{url_shown}</text>
      {cursor}
    </g>
    """


# ---------- beat table ----------
BEATS = [
    Beat("01-want-to",     0.50, CREAM, "fade-from-black",
         r_word("Want to",   180, INK, weight=600, y=420)),
    Beat("02-ship",        0.40, MINT_3, "whip-h",
         r_word("ship",      280, CREAM, weight=600, y=H//2 + 60)),
    Beat("03-something",   0.50, BLACK, "whip-v",
         r_word("something", 200, CREAM, weight=600, y=H - 480)),
    Beat("04-that-lasts",  1.40, CREAM, "whip-h-right",
         r_that_lasts),
    Beat("05-studio",      1.60, MINT_3, "fade-black",
         r_studio_reveal),
    Beat("06-not-agency",  1.20, BLACK, "cut",
         r_not_an_agency),
    Beat("07-sites",       0.80, CREAM, "whip-h",
         r_word("Sites.",    260, INK,  weight=700, y=H//2 + 90)),
    Beat("08-tools",       0.80, BLACK, "whip-v",
         r_word("Tools.",    260, MINT_3, weight=700, y=H//2 + 90)),
    Beat("09-ai",          0.80, CREAM, "whip-h",
         r_ai),
    Beat("10-hitec",       1.50, BLACK, "fade-black",
         r_built_hitec),
    Beat("11-booking",     1.50, MINT_3, "whip-v",
         r_booking_q3),
    Beat("12-cta",         2.60, BLACK, "crossfade",
         r_cta),
    Beat("13-url",         1.30, BLACK, "hold",
         r_url_stamp),
]

# Transition durations (xfade overlap; smaller = punchier cut)
XFADE = {
    "fade-from-black": 0.30,
    "whip-h":          0.12,  # slideleft
    "whip-v":          0.10,  # slideup
    "whip-h-right":    0.12,  # slideright
    "fade-black":      0.20,
    "cut":             0.04,
    "crossfade":       0.30,
    "hold":            0.04,
}
XFADE_TYPE = {
    "fade-from-black": "fade",
    "whip-h":          "slideleft",
    "whip-v":          "slideup",
    "whip-h-right":    "slideright",
    "fade-black":      "fadeblack",
    "cut":             "fade",
    "crossfade":       "fade",
    "hold":            "fade",
}


# ---------- pipeline ----------
def render_beat_frames(beat: Beat):
    beat_dir = FRAMES / beat.id
    beat_dir.mkdir(parents=True, exist_ok=True)
    n = int(round(beat.duration * FPS))
    for i in range(n):
        t = i / FPS
        inner = beat.render(t, beat.duration)
        svg = svg_wrap(beat.bg, inner)
        png_path = beat_dir / f"f-{i:04d}.png"
        cairosvg.svg2png(
            bytestring=svg.encode("utf-8"),
            write_to=str(png_path),
            output_width=W,
            output_height=H,
        )
    return beat_dir, n


def encode_beat_clip(beat: Beat, beat_dir: Path, n_frames: int) -> Path:
    out_clip = CLIPS / f"{beat.id}.mp4"
    cmd = [
        "ffmpeg", "-y",
        "-framerate", str(FPS),
        "-i", str(beat_dir / "f-%04d.png"),
        "-frames:v", str(n_frames),
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-r", str(FPS),
        str(out_clip),
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return out_clip


# ---------- score ----------
def build_score(total_dur: float) -> Path:
    """Layered score: drone bed + per-beat whooshes + plucks on service stack + cymbal on CTA."""
    drone = OUT / "_drone.wav"
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"sine=frequency=55:duration={total_dur}",
        "-f", "lavfi", "-i", f"sine=frequency=82.4:duration={total_dur}",
        "-f", "lavfi", "-i", f"sine=frequency=110:duration={total_dur}",
        "-f", "lavfi", "-i", f"anoisesrc=duration={total_dur}:color=brown:amplitude=0.04",
        "-filter_complex",
            "[0]volume=0.30[bass];"
            "[1]volume=0.18[low];"
            "[2]volume=0.15[mid];"
            "[3]volume=0.42[air];"
            "[bass][low][mid][air]amix=inputs=4:duration=longest,"
            "lowpass=f=1800,"
            f"afade=t=in:st=0:d=1.0,"
            f"afade=t=out:st={total_dur - 1.0}:d=1.0,"
            "volume=0.82",
        "-ac", "2", "-ar", "48000",
        "-t", f"{total_dur}",
        str(drone),
    ], check=True, capture_output=True)

    whoosh = OUT / "_whoosh.wav"
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "anoisesrc=duration=0.32:color=white:amplitude=0.7",
        "-af", "highpass=f=300,lowpass=f=3500,afade=t=in:st=0:d=0.04,afade=t=out:st=0.16:d=0.16,volume=0.45",
        "-ac", "2", "-ar", "48000",
        str(whoosh),
    ], check=True, capture_output=True)

    kick = OUT / "_kick.wav"
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "sine=frequency=60:duration=0.18",
        "-af", "afade=t=in:st=0:d=0.005,afade=t=out:st=0.02:d=0.16,volume=0.65",
        "-ac", "2", "-ar", "48000",
        str(kick),
    ], check=True, capture_output=True)

    pluck = OUT / "_pluck.wav"
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "sine=frequency=880:duration=0.32",
        "-f", "lavfi", "-i", "sine=frequency=1320:duration=0.32",
        "-filter_complex",
            "[0]volume=0.5[a];[1]volume=0.35[b];"
            "[a][b]amix=inputs=2,afade=t=in:st=0:d=0.005,"
            "afade=t=out:st=0.05:d=0.27,volume=0.55",
        "-ac", "2", "-ar", "48000",
        str(pluck),
    ], check=True, capture_output=True)

    cymbal = OUT / "_cymbal.wav"
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "anoisesrc=duration=1.4:color=pink:amplitude=0.5",
        "-af", "highpass=f=4000,lowpass=f=12000,afade=t=in:st=0:d=0.7,afade=t=out:st=0.9:d=0.5,volume=0.30",
        "-ac", "2", "-ar", "48000",
        str(cymbal),
    ], check=True, capture_output=True)

    # Compute beat boundaries (composition timeline, with xfade overlaps)
    boundaries = [0.0]
    cum = BEATS[0].duration
    for b in BEATS[1:]:
        cum -= XFADE[b.transition_in]
        boundaries.append(cum)
        cum += b.duration

    # Hits to schedule:
    #  - whoosh at every whip-h / whip-v / whip-h-right transition
    #  - kick under beat 4 entry ('that lasts?')
    #  - pluck at beats 7, 8, 9 (services stack)
    #  - cymbal at beat 12 (CTA)
    hits = []
    for i, b in enumerate(BEATS):
        if b.transition_in in ("whip-h", "whip-v", "whip-h-right"):
            hits.append(("whoosh", boundaries[i] - 0.08))
        if b.id == "04-that-lasts":
            hits.append(("kick", boundaries[i]))
        if b.id in ("07-sites", "08-tools", "09-ai"):
            hits.append(("pluck", boundaries[i]))
        if b.id == "12-cta":
            hits.append(("cymbal", boundaries[i]))

    # Build the amix command
    out_score = OUT / "score.wav"
    inputs = ["-i", str(drone)]
    stem_path = {"whoosh": whoosh, "kick": kick, "pluck": pluck, "cymbal": cymbal}
    for stem, when in hits:
        inputs += ["-itsoffset", f"{max(0, when):.3f}", "-i", str(stem_path[stem])]

    n_inputs = 1 + len(hits)
    mix_inputs = "".join(f"[{i}]" for i in range(n_inputs))
    filter_complex = (
        f"{mix_inputs}amix=inputs={n_inputs}:duration=first:normalize=0,"
        f"alimiter=limit=0.93"
    )
    subprocess.run([
        "ffmpeg", "-y", *inputs,
        "-filter_complex", filter_complex,
        "-ac", "2", "-ar", "48000",
        "-t", f"{total_dur}",
        str(out_score),
    ], check=True, capture_output=True)

    for p in (drone, whoosh, kick, pluck, cymbal):
        p.unlink()
    return out_score


# ---------- mux ----------
def mux(clips, score_path):
    out_mp4 = OUT / "brand-mint-builtoship.mp4"
    inputs = []
    for c in clips:
        inputs += ["-i", str(c)]

    chain = [f"[{i}:v]format=yuv420p,fps={FPS},setsar=1[v{i}]" for i in range(len(clips))]
    last = "[v0]"
    cum_offset = BEATS[0].duration
    xfade_parts = []
    for i in range(1, len(clips)):
        b = BEATS[i]
        dur = XFADE[b.transition_in]
        xf = XFADE_TYPE[b.transition_in]
        offset = cum_offset - dur
        out_label = f"[x{i}]" if i < len(clips) - 1 else "[vmix]"
        xfade_parts.append(
            f"{last}[v{i}]xfade=transition={xf}:duration={dur}:offset={offset:.3f}{out_label}"
        )
        last = out_label
        cum_offset += BEATS[i].duration - dur

    final = f"{last}fade=t=in:st=0:d=0.3,fade=t=out:st={cum_offset - 0.4}:d=0.4[vout]"
    filtergraph = ";".join(chain + xfade_parts + [final])

    print(f"[mux] total composition: {cum_offset:.2f}s")
    subprocess.run([
        "ffmpeg", "-y", *inputs,
        "-i", str(score_path),
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
    print(f"[done] {out_mp4} ({size_mb:.2f} MB, ~{cum_offset:.2f}s)")
    return out_mp4


# ---------- main ----------
def main():
    # Clean prior runs
    for d in (FRAMES, CLIPS):
        for child in d.iterdir() if d.exists() else []:
            if child.is_file():
                child.unlink()
            elif child.is_dir():
                for f in child.iterdir():
                    f.unlink()
                child.rmdir()

    clips = []
    for b in BEATS:
        beat_dir, n = render_beat_frames(b)
        print(f"[render] {b.id}: {n} frames")
        clip = encode_beat_clip(b, beat_dir, n)
        clips.append(clip)

    total_video_dur = sum(b.duration for b in BEATS) - sum(
        XFADE[b.transition_in] for b in BEATS[1:]
    )
    print(f"[score] for {total_video_dur:.2f}s")
    score = build_score(total_video_dur + 0.3)
    mux(clips, score)


if __name__ == "__main__":
    main()
