"""
Brand Mint Studios — Brand Identity Ident (v22)

8.0s, 60fps, 1080×1920 vertical · brand-only.

A short, editorial brand stinger. No claims, no numbers, no MrBeast
retention noise. Inspired by Apple / Linear / Vercel idents:
particles converge into the canonical M monogram, wordmark types in,
positioning line lands, signature out.

Beats:
  0.00–1.50s  PARTICLES   – 80 mint particles drift in 3D space
  1.50–3.00s  CONVERGE    – particles spring-magnet into M-shape
  3.00–4.50s  MARK        – stroke draws on, mint gradient fills, 3D tilt settles
  4.50–6.00s  WORDMARK    – BRAND MINT types in, letter-spacing settles
  6.00–7.50s  TAGLINE     – we mint brands that COMPOUND.
  7.50–8.50s  SIGNATURE   – STUDIOS — HYDERABAD · fade out

Tech: cairosvg + ffmpeg, mass-spring particle physics, 3D z-projection
with depth-of-field blur, SVG matrix transform for mark tilt, kerning
animation for typography.
"""
from __future__ import annotations
import math, os, random, shutil, subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple

import cairosvg

# ---------- Canvas ----------
W, H = 1080, 1920
FPS = 60
TOTAL_S = 8.5
TOTAL_F = int(round(TOTAL_S * FPS))

# ---------- Brand palette ----------
INK        = "#070A09"       # primary background
PAPER      = "#F5F1EA"       # accent paper (used sparingly)
MINT_2     = "#7CF6C8"       # light mint
MINT_3     = "#10B981"       # core brand mint
MINT_4     = "#047857"       # deep mint
GHOST      = "rgba(245,241,234,0.55)"

# ---------- Fonts ----------
FONT_DISPLAY = "Plus Jakarta Sans"
FONT_MONO    = "JetBrains Mono"

# ---------- Output ----------
HERE = Path(__file__).resolve().parent
FRAMES_DIR = HERE / "frames"
OUT_DIR = HERE / "out"
OUT_MP4 = OUT_DIR / "brandmint-ident-60fps.mp4"

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

# ---------- Time helpers ----------
def localT(t: float, t0: float, t1: float) -> float:
    return clamp01((t - t0) / (t1 - t0))

# ---------- M monogram target shape (sampled along the canonical M path) ----------
# Path: "M9 22V10l7 6 7-6v12" in a 32-unit viewBox. We sample this into N
# target points so particles can spring toward them.
def sample_m_targets(n: int, cx: float, cy: float, scale: float) -> List[Tuple[float, float]]:
    # Vertices of the M path (in 32-unit space), scaled to 0..1 then to target.
    vx = [9, 9, 16, 23, 23]
    vy = [22, 10, 16, 10, 22]
    # Add reverse pass for thickness:
    # The M is a 5-vertex polyline; we'll distribute n points along it.
    segs = []
    total = 0.0
    for i in range(len(vx) - 1):
        dx, dy = vx[i+1] - vx[i], vy[i+1] - vy[i]
        L = math.hypot(dx, dy)
        segs.append((vx[i], vy[i], dx, dy, L))
        total += L
    pts = []
    for i in range(n):
        u = i / max(1, n - 1)
        d = u * total
        acc = 0.0
        for sx, sy, dx, dy, L in segs:
            if d <= acc + L:
                k = (d - acc) / L
                pts.append((sx + dx * k, sy + dy * k))
                break
            acc += L
        else:
            pts.append((vx[-1], vy[-1]))
    # Map from 32-unit space [0..32] to canvas: center on (cx,cy), scale by `scale`.
    out = []
    for px, py in pts:
        x = cx + (px - 16) * (scale / 32.0)
        y = cy + (py - 16) * (scale / 32.0)
        out.append((x, y))
    return out

# ---------- Particles (mass-spring with 3D z-axis depth) ----------
@dataclass
class Particle:
    x: float; y: float; z: float
    vx: float; vy: float; vz: float
    tx: float; ty: float           # target position once converging
    seed: float

def make_particles(n: int) -> List[Particle]:
    random.seed(7)
    ps: List[Particle] = []
    cx, cy = W / 2, H / 2 - 60
    for i in range(n):
        ang = random.uniform(0, math.tau)
        rad = random.uniform(40, 260)
        z = random.uniform(-0.55, 0.45)
        x = cx + math.cos(ang) * rad
        y = cy + math.sin(ang) * rad * 0.85
        ps.append(Particle(
            x=x, y=y, z=z,
            vx=random.uniform(-0.4, 0.4),
            vy=random.uniform(-0.4, 0.4),
            vz=random.uniform(-0.02, 0.02),
            tx=cx, ty=cy,
            seed=random.random(),
        ))
    return ps

N_PARTICLES = 90
PARTICLES = make_particles(N_PARTICLES)
# Assign each particle a target on the M when converge phase begins.
M_TARGETS = sample_m_targets(N_PARTICLES, W // 2, H // 2 - 60, scale=520)
for i, p in enumerate(PARTICLES):
    tx, ty = M_TARGETS[i]
    p.tx, p.ty = tx, ty

DT = 1.0 / FPS

def step_particles(t: float):
    """
    0.0–1.5s: free drift with gentle attractor toward center, slow Z oscillation.
    1.5–3.0s: spring-magnet toward M-target positions; damping increases.
    3.0+:     particles fade out (rendered with falling alpha; positions frozen-ish).
    """
    cx, cy = W / 2, H / 2 - 60
    for i, p in enumerate(PARTICLES):
        if t < 1.5:
            # Free drift
            ax = (cx - p.x) * 0.0006
            ay = (cy - p.y) * 0.0006
            az = -p.z * 0.02
            p.vx = (p.vx + ax) * 0.985
            p.vy = (p.vy + ay) * 0.985
            p.vz = (p.vz + az) * 0.97
        elif t < 3.0:
            # Spring toward M target. Strength ramps up.
            k = smoothstep(1.5, 2.6, t) * 0.085
            damp = lerp(0.92, 0.78, smoothstep(1.5, 3.0, t))
            ax = (p.tx - p.x) * k
            ay = (p.ty - p.y) * k
            az = -p.z * 0.10
            p.vx = (p.vx + ax) * damp
            p.vy = (p.vy + ay) * damp
            p.vz = (p.vz + az) * damp
        else:
            # Settle / freeze
            p.vx *= 0.85
            p.vy *= 0.85
            p.vz *= 0.85
        p.x += p.vx
        p.y += p.vy
        p.z += p.vz

# ---------- SVG primitives ----------
def project_z(z: float):
    """Map z in [-0.6, 0.6] to size scale + alpha + blur."""
    s = 1.0 + z * 0.4
    a = 0.4 + (z + 0.6) * 0.5
    blur = max(0.0, -z * 4.5)
    return s, max(0.0, min(1.0, a)), blur

def render_particles(t: float, alpha_mul: float = 1.0) -> str:
    parts = []
    for p in PARTICLES:
        s, a, blur = project_z(p.z)
        r = 4.0 * s
        # Mint color, brighter in core, slightly cooler at depth
        if p.z > 0.15:
            fill = MINT_2
        elif p.z > -0.1:
            fill = MINT_3
        else:
            fill = MINT_4
        a *= alpha_mul
        if a <= 0.02: continue
        if blur > 0.1:
            parts.append(
                f'<circle cx="{p.x:.1f}" cy="{p.y:.1f}" r="{r:.1f}" fill="{fill}" '
                f'opacity="{a:.3f}" filter="url(#blurSoft)"/>'
            )
        else:
            parts.append(
                f'<circle cx="{p.x:.1f}" cy="{p.y:.1f}" r="{r:.1f}" fill="{fill}" '
                f'opacity="{a:.3f}"/>'
            )
    return "".join(parts)

# ---------- M Mark (canonical SVG embedded inline + animated stroke) ----------
def render_mark(cx: float, cy: float, scale: float, draw_t: float,
                fill_t: float, tilt_deg: float = 0.0, alpha: float = 1.0,
                glow: float = 0.0) -> str:
    """
    Render the canonical M monogram. `draw_t` 0..1 animates the stroke
    drawing on (dasharray). `fill_t` 0..1 fades in the gradient fill on
    the disc. `tilt_deg` rotates around Y for a 3D feel (via skew).
    """
    # M path total length (the 5-vertex polyline) in canonical 32-unit space ≈ 36.
    # We use a generous max length so the dash math is always covered.
    DASH_MAX = 80.0
    dash_visible = draw_t * DASH_MAX
    dash_hidden = DASH_MAX - dash_visible

    # 3D tilt: approximate Y rotation via an X-axis skew + a horizontal squash.
    rad = math.radians(tilt_deg)
    sx = math.cos(rad)           # squash horizontal as if rotating around Y
    skew_y = math.sin(rad) * 8   # subtle vertical skew on the right edge

    # Disc fill + ring
    disc_alpha = ease_out_cubic(fill_t) * alpha
    stroke_alpha = ease_out_cubic(min(1.0, draw_t * 1.15)) * alpha

    # Glow: a soft outer disc that pulses
    glow_block = ""
    if glow > 0.001:
        glow_block = (
            f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{scale*0.62:.1f}" '
            f'fill="url(#markGlow)" opacity="{glow:.3f}"/>'
        )

    s = scale
    # Inner mark coordinates in canonical 32-unit space, mapped to our scale.
    # Disc radius = 15/16 of half-scale to match the SVG.
    return f"""
    <g transform="translate({cx:.1f},{cy:.1f}) matrix({sx:.4f},{skew_y:.4f},0,1,0,0)" opacity="{alpha:.3f}">
      {glow_block}
      <circle cx="0" cy="0" r="{s*0.5:.1f}" fill="url(#bmDisc)" opacity="{disc_alpha:.3f}"/>
      <g opacity="{stroke_alpha:.3f}">
        <path d="M{-s*0.219:.2f} {s*0.187:.2f} V{-s*0.187:.2f} l{s*0.219:.2f} {s*0.187:.2f} l{s*0.219:.2f} {-s*0.187:.2f} v{s*0.375:.2f}"
              stroke="{INK}" stroke-width="{s*0.069:.2f}" stroke-linecap="round"
              stroke-linejoin="round" fill="none"
              stroke-dasharray="{dash_visible:.2f},{dash_hidden:.2f}"/>
      </g>
    </g>
    """

# ---------- Typography ----------
def render_wordmark(t: float, y: float) -> str:
    """
    'BRAND MINT' wordmark: appears with wide letter-spacing that
    settles, plus a top-clip slide-up reveal.
    """
    if t <= 0: return ""
    ease = ease_out_cubic(t)
    letter_spacing_em = lerp(0.45, 0.06, ease)   # wide → tight
    yoff = lerp(28, 0, ease)
    alpha = ease
    return (
        f'<text x="{W//2}" y="{y + yoff:.1f}" '
        f'font-family="{FONT_DISPLAY}" font-weight="800" '
        f'font-size="78" letter-spacing="{letter_spacing_em:.3f}em" '
        f'fill="{PAPER}" text-anchor="middle" opacity="{alpha:.3f}">BRAND MINT</text>'
    )

def render_tagline(t: float, y: float) -> str:
    """
    'WE MINT BRANDS THAT COMPOUND.' — word-by-word fade in.
    'COMPOUND.' gets the mint gradient.
    """
    if t <= 0: return ""
    words = [("WE MINT BRANDS", PAPER, False),
             ("THAT", PAPER, False),
             ("COMPOUND.", MINT_2, True)]
    # Stagger reveal: each word takes 0.25 of the local time, overlap 0.1
    parts = []
    base_x = W // 2
    line_h = 56
    # First two words on line 1, COMPOUND. on line 2
    line1_y = y
    line2_y = y + line_h + 4

    # Word reveal — each gets a 0–1 sub-progress
    sub = [
        smoothstep(0.0,  0.35, t),
        smoothstep(0.2,  0.55, t),
        smoothstep(0.4,  0.85, t),
    ]
    # Line 1 — "WE MINT BRANDS · THAT"
    parts.append(
        f'<text x="{base_x}" y="{line1_y:.1f}" '
        f'font-family="{FONT_MONO}" font-weight="600" font-size="22" '
        f'letter-spacing="0.22em" fill="{PAPER}" text-anchor="middle" '
        f'opacity="{sub[0]:.3f}">WE MINT BRANDS · THAT</text>'
    )
    # Line 2 — "COMPOUND." with mint gradient
    scale_pulse = 1.0 + 0.04 * math.sin(min(1.0, (t - 0.55) * 6) * math.pi) if t > 0.55 else 1.0
    parts.append(
        f'<g transform="translate({base_x} {line2_y:.1f}) scale({scale_pulse:.3f})" opacity="{sub[2]:.3f}">'
        f'<text x="0" y="0" font-family="{FONT_DISPLAY}" font-weight="800" '
        f'font-size="76" letter-spacing="0.02em" fill="url(#mintTextGrad)" '
        f'text-anchor="middle" font-style="italic">compound.</text>'
        f'</g>'
    )
    return "".join(parts)

def render_signature(t: float, y: float) -> str:
    if t <= 0: return ""
    a = ease_out_cubic(t)
    blink = 1.0 if (math.floor(t * 4) % 2 == 0) else 0.25
    return (
        f'<text x="{W//2}" y="{y:.1f}" font-family="{FONT_MONO}" '
        f'font-weight="500" font-size="20" letter-spacing="0.32em" '
        f'fill="{GHOST}" text-anchor="middle" opacity="{a:.3f}">'
        f'STUDIOS &#8212; HYDERABAD'
        f'<tspan dx="6" opacity="{blink:.2f}">|</tspan></text>'
    )

# ---------- Frame composer ----------
def svg_for_frame(f: int) -> str:
    t = f / FPS

    # Update particle simulation
    step_particles(t)

    # Phase windows
    t_particles = localT(t, 0.0, 1.5)
    t_converge  = localT(t, 1.5, 3.0)
    t_mark      = localT(t, 3.0, 4.5)
    t_word      = localT(t, 4.5, 6.0)
    t_tag       = localT(t, 6.0, 7.5)
    t_sig       = localT(t, 7.2, 8.2)
    t_fadeout   = localT(t, 8.0, 8.5)

    # Particle visibility multiplier — they fade as mark draws on
    particle_alpha = 1.0 - smoothstep(3.0, 4.0, t)

    # Mark animation
    mark_draw = ease_out_cubic(t_mark)
    mark_fill = ease_out_cubic(localT(t, 3.5, 4.8))
    # Subtle 3D wobble that settles to zero
    if t < 4.5:
        tilt = math.sin(t * 1.5) * lerp(8.0, 0.0, ease_out_cubic(t_mark))
    else:
        tilt = math.sin(t * 0.8) * 0.6   # tiny breathing rotation
    mark_alpha = ease_out_cubic(localT(t, 2.8, 3.8))
    # Glow pulse on mark landing
    glow = 0.0
    if t > 3.0:
        gp = clamp01((t - 3.0) / 1.4)
        glow = (1 - (1 - gp) ** 3) * (1 - gp) * 0.9   # rise-then-fade

    # Mark position: starts at center, then rises slightly when wordmark joins
    mark_cx = W // 2
    mark_cy = H // 2 - 60
    rise = lerp(0, -180, ease_out_cubic(localT(t, 4.4, 6.0)))
    mark_cy_final = mark_cy + rise
    mark_scale = lerp(520, 280, ease_out_cubic(localT(t, 4.4, 6.0)))

    # Wordmark
    word_y = mark_cy + 280 + lerp(60, 0, ease_out_cubic(t_word))

    # Tagline
    tag_y = word_y + 130

    # Sig
    sig_y = tag_y + 220

    # Background — deep ink, with subtle radial vignette
    bg = f'<rect width="{W}" height="{H}" fill="{INK}"/>'
    vignette = (
        f'<rect width="{W}" height="{H}" fill="url(#vig)"/>'
    )

    # Full SVG
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
  <defs>
    <linearGradient id="bmDisc" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"  stop-color="{MINT_2}"/>
      <stop offset="100%" stop-color="{MINT_3}"/>
    </linearGradient>
    <radialGradient id="markGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%"  stop-color="{MINT_2}" stop-opacity="0.85"/>
      <stop offset="60%" stop-color="{MINT_3}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="{MINT_3}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="mintTextGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"  stop-color="{MINT_2}"/>
      <stop offset="60%" stop-color="{MINT_3}"/>
      <stop offset="100%" stop-color="{MINT_4}"/>
    </linearGradient>
    <radialGradient id="vig" cx="0.5" cy="0.5" r="0.85">
      <stop offset="0%"  stop-color="{INK}" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.55"/>
    </radialGradient>
    <filter id="blurSoft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2"/>
    </filter>
  </defs>

  {bg}

  <!-- Particle field -->
  {render_particles(t, alpha_mul=particle_alpha)}

  <!-- M monogram -->
  {render_mark(mark_cx, mark_cy_final, mark_scale, mark_draw, mark_fill,
               tilt_deg=tilt, alpha=mark_alpha, glow=glow)}

  <!-- Wordmark -->
  {render_wordmark(t_word, word_y)}

  <!-- Tagline -->
  {render_tagline(t_tag, tag_y)}

  <!-- Signature -->
  {render_signature(t_sig, sig_y)}

  <!-- Vignette top -->
  {vignette}

  <!-- Fade out -->
  <rect width="{W}" height="{H}" fill="{INK}" opacity="{ease_in_cubic(t_fadeout):.3f}"/>
</svg>"""

# ---------- Render ----------
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
    print(f"  muxing → {OUT_MP4.name}")
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
    print(f"v22 Brand Identity Ident · {FPS}fps · {TOTAL_S}s")
    render_all_frames()
    mux()
    size_mb = OUT_MP4.stat().st_size / 1024 / 1024
    print(f"  done → {OUT_MP4} ({size_mb:.2f}MB)")

if __name__ == "__main__":
    main()
