"""
Brand Mint — Hollywood-style cinematic teaser (9:16, ~32s, MP4 + AAC audio).

Pipeline:
  1. Build 8 SVG scenes (cinematic typography, mint hero glow, cinema bars).
  2. Rasterize each at 1440x2560 (1.33x headroom for Ken Burns zoom).
  3. Build per-scene clips with: slow zoom (zoompan) + vignette + film grain.
  4. Concatenate clips with xfade transitions (some crossfade, some fade-to-black).
  5. Synthesize an ambient cinematic pad (sub-bass drone + brown noise + swell).
  6. Mux video + audio → out/brand-mint-cinematic.mp4.
"""
import math
import shutil
import subprocess
from pathlib import Path

import cairosvg

ROOT = Path(__file__).resolve().parent
FRAMES = ROOT / "frames"
CLIPS = ROOT / "clips"
OUT = ROOT / "out"
for d in (FRAMES, CLIPS, OUT):
    d.mkdir(parents=True, exist_ok=True)

# ---------- format ----------
W, H = 1080, 1920              # final 9:16
RW, RH = 1440, 2560            # render at 1.33x for zoom headroom
FPS = 30

# ---------- brand tokens ----------
INK = "#0A0E0C"
PAPER = "#F5F1EA"
PAPER_DEEP = "#E9E2D3"
BLACK = "#000000"
NEAR_BLACK = "#06090A"
MINT_2 = "#7CF6C8"
MINT_3 = "#10B981"
MINT_4 = "#047857"
GOLD = "#C9A14A"
CREAM = "#F5F1EA"
EMERALD = "#00C897"

DISPLAY = "Plus Jakarta Sans, Inter, system-ui, sans-serif"
MONO = "JetBrains Mono, ui-monospace, monospace"
BODY = "Inter, system-ui, sans-serif"


# ---------- shared SVG defs (filters, gradients) ----------
def defs():
    return f"""
    <defs>
      <radialGradient id="mintGlow" cx="50%" cy="50%" r="62%">
        <stop offset="0%"   stop-color="{MINT_3}" stop-opacity="0.42"/>
        <stop offset="55%"  stop-color="{MINT_4}" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="{BLACK}"  stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="cremeGlow" cx="50%" cy="40%" r="70%">
        <stop offset="0%"   stop-color="#FFFFFF" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="{PAPER}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="darkBg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="{BLACK}"/>
        <stop offset="100%" stop-color="{NEAR_BLACK}"/>
      </linearGradient>
      <linearGradient id="paperBg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="{PAPER}"/>
        <stop offset="100%" stop-color="{PAPER_DEEP}"/>
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
    """Hair-thin top + bottom mint bars + corner serial numbers (the 'film-strip' tell)."""
    color = MINT_3
    text_color = CREAM if dark else INK
    return f"""
    <rect x="0" y="0"          width="{RW}" height="3" fill="{color}" opacity="0.85"/>
    <rect x="0" y="{RH-3}"     width="{RW}" height="3" fill="{color}" opacity="0.85"/>
    <text x="48" y="{RH-30}" font-family="{MONO}" font-size="22" letter-spacing="0.22em"
          fill="{text_color}" opacity="0.55">BRAND MINT</text>
    <text x="{RW-48}" y="{RH-30}" text-anchor="end" font-family="{MONO}" font-size="22"
          letter-spacing="0.18em" fill="{text_color}" opacity="0.55">brandmint.studio</text>
    """


def wrap(inner: str) -> str:
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {RW} {RH}" width="{RW}" height="{RH}">
      {defs()}
      {inner}
    </svg>"""


# ---------- scenes ----------
def scene_1_cold_open():
    # Pure black, single editorial line, signature italic on 'story'
    inner = f"""
    <rect width="{RW}" height="{RH}" fill="{BLACK}"/>
    <rect width="{RW}" height="{RH}" fill="url(#mintGlow)" opacity="0.45"/>
    <text x="48" y="120" font-family="{MONO}" font-size="22" letter-spacing="0.22em"
          fill="{MINT_3}" opacity="0.85">— A BRAND MINT FILM</text>
    <g font-family="{DISPLAY}" font-weight="600" letter-spacing="-0.025em" fill="{CREAM}">
      <text x="{RW//2}" y="{RH//2 - 60}" text-anchor="middle" font-size="120">Every brand</text>
      <text x="{RW//2}" y="{RH//2 + 90}" text-anchor="middle" font-size="120">starts with a</text>
      <text x="{RW//2}" y="{RH//2 + 240}" text-anchor="middle" font-size="120"
            font-style="italic" fill="{MINT_3}" filter="url(#softGlow)">story.</text>
    </g>
    <text x="{RW//2}" y="{RH-120}" text-anchor="middle" font-family="{MONO}" font-size="22"
          letter-spacing="0.22em" fill="{CREAM}" opacity="0.55">HYDERABAD · MMXXVI</text>
    {cinema_bars(dark=True)}
    """
    return wrap(inner)


def scene_2_tension():
    inner = f"""
    <rect width="{RW}" height="{RH}" fill="{BLACK}"/>
    <rect width="{RW}" height="{RH}" fill="url(#mintGlow)" opacity="0.6"/>
    <g font-family="{DISPLAY}" font-weight="600" letter-spacing="-0.025em" fill="{CREAM}">
      <text x="{RW//2}" y="{RH//2 - 80}" text-anchor="middle" font-size="120">But what if</text>
      <text x="{RW//2}" y="{RH//2 + 70}" text-anchor="middle" font-size="120">the story</text>
      <text x="{RW//2}" y="{RH//2 + 230}" text-anchor="middle" font-size="140"
            font-style="italic" fill="{MINT_3}" filter="url(#glow)">compounds?</text>
    </g>
    {cinema_bars(dark=True)}
    """
    return wrap(inner)


def scene_3_reveal():
    # Logo reveal — large monogram with mint glow on black
    cx, cy = RW//2, RH//2 - 200
    r = 220
    inner = f"""
    <rect width="{RW}" height="{RH}" fill="{BLACK}"/>
    <rect width="{RW}" height="{RH}" fill="url(#mintGlow)" opacity="0.7"/>
    <g filter="url(#glow)">
      <circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#mark)"/>
      <path d="M{cx-r*0.45} {cy+r*0.45} V {cy-r*0.4} l {r*0.45} {r*0.4} l {r*0.45} {-r*0.4} V {cy+r*0.45}"
            stroke="{BLACK}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </g>
    <text x="{RW//2}" y="{cy + r + 220}" text-anchor="middle" font-family="{DISPLAY}"
          font-size="92" font-weight="600" letter-spacing="-0.02em" fill="{CREAM}">
      WE MINT BRANDS
    </text>
    <text x="{RW//2}" y="{cy + r + 320}" text-anchor="middle" font-family="{DISPLAY}"
          font-size="92" font-weight="600" letter-spacing="-0.02em" fill="{MINT_3}"
          font-style="italic" filter="url(#softGlow)">
      THAT COMPOUND.
    </text>
    <text x="{RW//2}" y="{cy + r + 460}" text-anchor="middle" font-family="{MONO}"
          font-size="28" letter-spacing="0.32em" fill="{CREAM}" opacity="0.55">
      EST. HYDERABAD
    </text>
    {cinema_bars(dark=True)}
    """
    return wrap(inner)


def scene_4_stat_drop():
    inner = f"""
    <rect width="{RW}" height="{RH}" fill="{BLACK}"/>
    <rect width="{RW}" height="{RH}" fill="url(#mintGlow)" opacity="0.5"/>
    <text x="{RW//2}" y="320" text-anchor="middle" font-family="{MONO}" font-size="28"
          letter-spacing="0.32em" fill="{CREAM}" opacity="0.7">TRACKED · Q1 FY26</text>
    <text x="{RW//2}" y="{RH//2 + 70}" text-anchor="middle" font-family="{MONO}"
          font-size="320" font-weight="500" letter-spacing="-0.03em"
          fill="{MINT_3}" filter="url(#glow)">+&#8377;42.6 Cr</text>
    <g font-family="{DISPLAY}" font-weight="500" font-style="italic" fill="{CREAM}">
      <text x="{RW//2}" y="{RH//2 + 350}" text-anchor="middle" font-size="62">tracked revenue,</text>
      <text x="{RW//2}" y="{RH//2 + 440}" text-anchor="middle" font-size="62">
        across <tspan font-family="{MONO}" font-style="normal" fill="{MINT_3}">11</tspan>
        founder-led brands.
      </text>
    </g>
    {cinema_bars(dark=True)}
    """
    return wrap(inner)


def scene_5_montage():
    # Cream paper — staccato pillars
    inner = f"""
    <rect width="{RW}" height="{RH}" fill="url(#paperBg)"/>
    <rect width="{RW}" height="{RH}" fill="url(#cremeGlow)" opacity="0.4"/>
    <text x="80" y="240" font-family="{MONO}" font-size="28" letter-spacing="0.32em"
          fill="{INK}" opacity="0.6">— WHAT WE SHIP</text>
    <g font-family="{DISPLAY}" font-weight="600" letter-spacing="-0.03em" fill="{INK}">
      <text x="80" y="780"  font-size="140">Sites.</text>
      <text x="80" y="900"  font-size="80" font-style="italic" fill="{MINT_3}">that convert.</text>

      <text x="80" y="1180" font-size="140">Tools.</text>
      <text x="80" y="1300" font-size="80" font-style="italic" fill="{MINT_3}">that scale.</text>

      <text x="80" y="1580" font-size="140">AI.</text>
      <text x="80" y="1700" font-size="80" font-style="italic" fill="{MINT_3}">woven in.</text>
    </g>
    {cinema_bars(dark=False)}
    """
    return wrap(inner)


def scene_6_climax():
    inner = f"""
    <rect width="{RW}" height="{RH}" fill="{BLACK}"/>
    <rect width="{RW}" height="{RH}" fill="url(#mintGlow)" opacity="0.4"/>
    <text x="{RW//2}" y="220" text-anchor="middle" font-family="{MONO}" font-size="26"
          letter-spacing="0.32em" fill="{GOLD}">— 06 / 08 · CASE</text>

    <g font-family="{DISPLAY}" font-weight="600" letter-spacing="-0.02em" fill="{CREAM}">
      <text x="{RW//2}" y="640" text-anchor="middle" font-size="80">Bookings up</text>
      <text x="{RW//2}" y="900" text-anchor="middle" font-family="{MONO}" font-size="340"
            font-weight="500" fill="{MINT_3}" filter="url(#glow)">3.4&#215;</text>

      <text x="{RW//2}" y="1260" text-anchor="middle" font-size="80">Cost per lead</text>
      <text x="{RW//2}" y="1520" text-anchor="middle" font-family="{MONO}" font-size="340"
            font-weight="500" fill="{MINT_3}" filter="url(#glow)">61%</text>
    </g>

    <text x="{RW//2}" y="1720" text-anchor="middle" font-family="{DISPLAY}" font-size="44"
          font-style="italic" fill="{CREAM}" opacity="0.75">Two quarters. Same product.</text>
    {cinema_bars(dark=True)}
    """
    return wrap(inner)


def scene_7_human():
    # Cream Paper — testimonial with massive ghost quote mark
    inner = f"""
    <rect width="{RW}" height="{RH}" fill="url(#paperBg)"/>
    <rect width="{RW}" height="{RH}" fill="url(#cremeGlow)" opacity="0.5"/>
    <text x="50" y="780" font-family="{DISPLAY}" font-size="900" font-weight="700"
          fill="{MINT_3}" opacity="0.10">&#8220;</text>

    <g font-family="{DISPLAY}" font-weight="500" letter-spacing="-0.015em" fill="{INK}">
      <text x="80" y="900"  font-size="78">They shipped</text>
      <text x="80" y="1010" font-size="78">in <tspan font-style="italic" fill="{MINT_3}">eleven days</tspan></text>
      <text x="80" y="1120" font-size="78">what our last agency</text>
      <text x="80" y="1230" font-size="78">couldn't ship in</text>
      <text x="80" y="1340" font-size="78"><tspan font-style="italic">three months.</tspan></text>
    </g>

    <g transform="translate(80, 1530)">
      <rect width="120" height="120" rx="16" fill="{MINT_3}"/>
      <text x="60" y="86" text-anchor="middle" font-family="{DISPLAY}" font-size="64"
            font-weight="600" fill="{CREAM}">A</text>
      <text x="160" y="60" font-family="{DISPLAY}" font-size="40" font-weight="600" fill="{INK}">
        Arjun R.
      </text>
      <text x="160" y="106" font-family="{BODY}" font-size="30" fill="{INK}" opacity="0.62">
        Founder, Northwind Labs
      </text>
    </g>
    {cinema_bars(dark=False)}
    """
    return wrap(inner)


def scene_8_cta_stamp():
    # Pure black, big mint glow, glowing CTA button
    inner = f"""
    <rect width="{RW}" height="{RH}" fill="{BLACK}"/>
    <rect width="{RW}" height="{RH}" fill="url(#mintGlow)" opacity="0.75"/>

    <g>
      <circle cx="100" cy="216" r="10" fill="{MINT_3}" filter="url(#glow)"/>
      <text x="140" y="226" font-family="{MONO}" font-size="28" letter-spacing="0.32em"
            fill="{CREAM}">BOOKING Q3 2026</text>
    </g>

    <g font-family="{DISPLAY}" font-weight="600" letter-spacing="-0.025em" fill="{CREAM}">
      <text x="{RW//2}" y="{RH//2 - 60}" text-anchor="middle" font-size="118">Let's mint</text>
      <text x="{RW//2}" y="{RH//2 + 80}" text-anchor="middle" font-size="118">something that</text>
      <text x="{RW//2}" y="{RH//2 + 240}" text-anchor="middle" font-size="138"
            font-style="italic" fill="{MINT_3}" filter="url(#glow)">compounds.</text>
    </g>

    <g transform="translate({RW//2 - 360}, {RH//2 + 380})" filter="url(#softGlow)">
      <rect width="720" height="160" rx="80" fill="{MINT_3}"/>
      <text x="360" y="105" text-anchor="middle" font-family="{DISPLAY}" font-size="52"
            font-weight="600" fill="{BLACK}">Start a project  &#8594;</text>
    </g>

    <g transform="translate({RW//2 - 60}, {RH - 280})">
      <circle cx="60" cy="60" r="60" fill="url(#mark)"/>
      <path d="M30 80 V 38 l 30 26 l 30 -26 V 80"
            stroke="{BLACK}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </g>
    <text x="{RW//2}" y="{RH - 160}" text-anchor="middle" font-family="{DISPLAY}" font-size="40"
          font-weight="600" letter-spacing="-0.01em" fill="{CREAM}">Brand Mint — Hyderabad</text>
    {cinema_bars(dark=True)}
    """
    return wrap(inner)


SCENES = [
    ("01-cold-open",     scene_1_cold_open,   4.0, "fade-from-black"),
    ("02-tension",       scene_2_tension,     3.5, "crossfade"),
    ("03-reveal",        scene_3_reveal,      4.0, "crossfade"),
    ("04-stat-drop",     scene_4_stat_drop,   4.0, "fade-through-black"),
    ("05-montage",       scene_5_montage,     4.0, "crossfade"),
    ("06-climax",        scene_6_climax,      4.5, "fade-through-black"),
    ("07-human",         scene_7_human,       4.0, "crossfade"),
    ("08-cta",           scene_8_cta_stamp,   4.5, "crossfade"),
]
XFADE = 0.6   # transition duration between scenes


# ---------- pipeline ----------
def render_pngs():
    pngs = []
    for name, fn, *_ in SCENES:
        svg_path = FRAMES / f"{name}.svg"
        png_path = FRAMES / f"{name}.png"
        svg_path.write_text(fn())
        cairosvg.svg2png(
            bytestring=svg_path.read_bytes(),
            write_to=str(png_path),
            output_width=RW,
            output_height=RH,
        )
        pngs.append(png_path)
        print(f"[render] {png_path.name}")
    return pngs


def build_scene_clip(png_path: Path, idx: int, duration: float, direction: str) -> Path:
    """
    Render one scene clip with Ken Burns zoom + vignette + film grain.
    direction toggles whether the zoom is in or out so consecutive scenes alternate.
    """
    out_clip = CLIPS / f"clip-{idx:02d}.mp4"
    total_frames = int(duration * FPS)
    # zoompan: smooth zoom 1.00 -> 1.10 (or 1.10 -> 1.00 for alternating)
    if direction == "in":
        z_expr = f"min(1.0+0.0007*on,1.12)"
    else:
        z_expr = f"max(1.12-0.0007*on,1.0)"
    vf = (
        f"scale={RW}:{RH}:flags=lanczos,"
        f"zoompan=z='{z_expr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
        f"d={total_frames}:s={W}x{H}:fps={FPS},"
        f"vignette=PI/4.5,"
        f"noise=alls=6:allf=t,"
        f"format=yuv420p"
    )
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-framerate", str(FPS), "-t", f"{duration}",
        "-i", str(png_path),
        "-vf", vf,
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-r", str(FPS),
        str(out_clip),
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    print(f"[clip]   {out_clip.name}  ({duration}s, zoom-{direction})")
    return out_clip


def build_all_clips(pngs):
    clips = []
    for i, (png, scene_meta) in enumerate(zip(pngs, SCENES)):
        _, _, dur, _ = scene_meta
        direction = "in" if i % 2 == 0 else "out"
        clips.append(build_scene_clip(png, i + 1, dur, direction))
    return clips


def build_audio(total_duration: float) -> Path:
    """
    Synthesize a cinematic ambient pad:
      - 55 Hz sub-bass drone
      - 82.4 Hz (E2) lower-mid
      - 110 Hz mid (perfect 4th)
      - brown-noise 'air'
    Crescendo in over 3s, fade out over 3s, low-pass to keep it cinematic.
    """
    out_wav = OUT / "ambient.wav"
    fc = (
        f"[0]volume=0.30[bass];"
        f"[1]volume=0.20[low];"
        f"[2]volume=0.16[mid];"
        f"[3]volume=0.45[air];"
        f"[bass][low][mid][air]amix=inputs=4:duration=longest,"
        f"lowpass=f=1800,"
        f"afade=t=in:st=0:d=2.5,"
        f"afade=t=out:st={total_duration - 2.5}:d=2.5,"
        f"volume=0.9"
    )
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"sine=frequency=55:duration={total_duration}",
        "-f", "lavfi", "-i", f"sine=frequency=82.4:duration={total_duration}",
        "-f", "lavfi", "-i", f"sine=frequency=110:duration={total_duration}",
        "-f", "lavfi", "-i", f"anoisesrc=duration={total_duration}:color=brown:amplitude=0.04",
        "-filter_complex", fc,
        "-ac", "2", "-ar", "48000",
        "-t", f"{total_duration}",
        str(out_wav),
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    print(f"[audio]  {out_wav.name}  ({total_duration:.2f}s)")
    return out_wav


def assemble(clips, audio_path: Path) -> Path:
    """Chain xfades, then mux with audio."""
    out_mp4 = OUT / "brand-mint-cinematic.mp4"

    # Build filtergraph for sequential xfades
    inputs = []
    for c in clips:
        inputs += ["-i", str(c)]

    # Normalize each clip first
    chain = []
    for i in range(len(clips)):
        chain.append(f"[{i}:v]format=yuv420p,fps={FPS},setsar=1[v{i}]")

    # xfade chain — use 'fadeblack' for dramatic cuts, 'fade' for crossfades
    durations = [s[2] for s in SCENES]
    transitions = [s[3] for s in SCENES]  # transition INTO this scene
    last_label = "[v0]"
    cum_offset = durations[0]
    xfade_parts = []
    for i in range(1, len(clips)):
        trans_type = transitions[i]
        if trans_type == "fade-through-black":
            xf = "fadeblack"
        elif trans_type == "fade-from-black":
            xf = "fade"  # (only used on scene 0 — irrelevant here)
        else:
            xf = "fade"
        offset = cum_offset - XFADE
        out_label = f"[x{i}]" if i < len(clips) - 1 else "[vmix]"
        xfade_parts.append(
            f"{last_label}[v{i}]xfade=transition={xf}:duration={XFADE}:offset={offset:.3f}{out_label}"
        )
        last_label = out_label
        cum_offset += durations[i] - XFADE

    # Open with a 1s fade from black at the very start
    final = f"{last_label}fade=t=in:st=0:d=1.2,fade=t=out:st={cum_offset - 0.8}:d=0.8[vout]"
    filtergraph = ";".join(chain + xfade_parts + [final])

    total_video_dur = cum_offset  # final composition length

    cmd = [
        "ffmpeg", "-y",
        *inputs,
        "-i", str(audio_path),
        "-filter_complex", filtergraph,
        "-map", "[vout]",
        "-map", f"{len(clips)}:a",
        "-c:v", "libx264", "-preset", "slow", "-crf", "17",
        "-pix_fmt", "yuv420p",
        "-r", str(FPS),
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
        "-movflags", "+faststart",
        "-shortest",
        str(out_mp4),
    ]
    print(f"[mux]    composing {len(clips)} clips + audio → {out_mp4.name}")
    subprocess.run(cmd, check=True, capture_output=True)
    size_mb = out_mp4.stat().st_size / 1024 / 1024
    print(f"[done]   {out_mp4}  ({size_mb:.2f} MB, ~{total_video_dur:.1f}s)")
    return out_mp4


if __name__ == "__main__":
    if CLIPS.exists():
        for p in CLIPS.glob("*.mp4"):
            p.unlink()
    pngs = render_pngs()
    clips = build_all_clips(pngs)

    durations = [s[2] for s in SCENES]
    # Total composition length after xfades:
    total = sum(durations) - XFADE * (len(durations) - 1)
    audio = build_audio(total + 0.5)
    assemble(clips, audio)
