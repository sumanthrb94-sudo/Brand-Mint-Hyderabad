"""
Brand Mint Studios — Brand Story Ident (v23)

15.0s, 60fps, 1080x1920 vertical · narrative-driven · 2D + 3D motion.

A hooky brand story told in five beats. The Brand Mint M is hidden
behind a flat outline for the first half — at the centerpiece moment
(t≈8.0s) it FLIPS around the vertical axis, revealing the fully-formed
3D brand mark (mint disc + ink monogram). This is the moment the brand
'compounds'.

Beat sheet:
  0.0–2.0s   SEED        one mint particle pulses                "ONE IDEA."
  2.0–4.5s   MULTIPLY    1→2→4→8→…→90 particles cascade out      "MULTIPLIES."
  4.5–7.0s   FORM        particles converge into flat M outline   "BECOMES A BRAND."
  7.0–10.5s  FLIP        flat M flips around Y to reveal full     "THAT COMPOUNDS."
                          3D mint disc + ink monogram + glow
  10.5–12.5s WORDMARK    "BRAND MINT" types in (letter-spacing settle)
  12.5–14.0s TAGLINE     we mint brands that COMPOUND.
  14.0–15.0s SIGNATURE   STUDIOS — HYDERABAD · brandmintstudios.in
                          + final fade

Tech notes:
- Y-axis flip implemented as SVG matrix(scaleX,…) where scaleX = cos(theta).
  At theta=90° the M is edge-on (invisible); we swap from the flat outline
  to the full mark while it's invisible, so the back face is the real brand.
- Edge highlight during flip simulates light catching the rotating face.
- Camera zooms in 5% during flip to add weight to the reveal.
- All text uses Plus Jakarta Sans (display) + JetBrains Mono (kicker).
- No claims, no numbers, no founder face — brand-only.
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
TOTAL_S = 15.0
TOTAL_F = int(round(TOTAL_S * FPS))

# ---------- Brand palette ----------
INK    = "#070A09"
PAPER  = "#F5F1EA"
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
OUT_MP4 = OUT_DIR / "brandmint-story-60fps.mp4"

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
def localT(t, t0, t1): return clamp01((t - t0) / (t1 - t0))

# ---------- M target sampling (flat, on the M polyline) ----------
def sample_m_targets(n: int, cx: float, cy: float, scale: float) -> List[Tuple[float,float]]:
    vx = [9, 9, 16, 23, 23]
    vy = [22, 10, 16, 10, 22]
    segs = []; total = 0.0
    for i in range(len(vx)-1):
        dx, dy = vx[i+1]-vx[i], vy[i+1]-vy[i]
        L = math.hypot(dx, dy)
        segs.append((vx[i], vy[i], dx, dy, L))
        total += L
    pts = []
    for i in range(n):
        u = i / max(1, n-1)
        d = u * total
        acc = 0.0
        for sx, sy, dx, dy, L in segs:
            if d <= acc + L:
                k = (d - acc) / L
                pts.append((sx + dx*k, sy + dy*k))
                break
            acc += L
        else:
            pts.append((vx[-1], vy[-1]))
    out = []
    for px, py in pts:
        x = cx + (px - 16) * (scale/32.0)
        y = cy + (py - 16) * (scale/32.0)
        out.append((x, y))
    return out

# ---------- Particle pool with growth/birth times ----------
@dataclass
class Particle:
    x: float; y: float; z: float
    vx: float; vy: float; vz: float
    tx: float; ty: float
    born_t: float          # time at which this particle becomes visible
    seed: float

N_PARTICLES = 90

def make_particles(n: int) -> List[Particle]:
    random.seed(11)
    cx, cy = W / 2, H / 2 - 80
    ps: List[Particle] = []
    # Birth schedule: particle 0 is born at t=0 (the seed); the rest
    # cascade in across the MULTIPLY phase (2.0–4.5s) in exponential bursts.
    # Doubling bursts: at 2.0s we go 1→2, at 2.4s 2→4, …
    birth_times = [0.0]
    times_for_bursts = [2.0, 2.3, 2.6, 2.9, 3.2, 3.6, 4.0]   # doubling waves
    remaining = n - 1
    wave = 0
    while remaining > 0 and wave < len(times_for_bursts):
        burst = min(remaining, 2 ** wave)
        for k in range(burst):
            jitter = random.uniform(0, 0.18)
            birth_times.append(times_for_bursts[wave] + jitter)
        remaining -= burst
        wave += 1
    # Fill any remainder with late births clustered around 4.0–4.4s.
    while len(birth_times) < n:
        birth_times.append(random.uniform(4.0, 4.4))
    birth_times.sort()
    for i in range(n):
        ang = random.uniform(0, math.tau)
        rad = random.uniform(20, 220) if i > 0 else 0.0
        z = random.uniform(-0.55, 0.45)
        x = cx + math.cos(ang) * rad
        y = cy + math.sin(ang) * rad * 0.85
        ps.append(Particle(
            x=x, y=y, z=z,
            vx=random.uniform(-0.6, 0.6),
            vy=random.uniform(-0.6, 0.6),
            vz=random.uniform(-0.02, 0.02),
            tx=cx, ty=cy,
            born_t=birth_times[i] if i > 0 else 0.0,
            seed=random.random(),
        ))
    return ps

PARTICLES = make_particles(N_PARTICLES)
M_TARGETS = sample_m_targets(N_PARTICLES, W//2, H//2 - 80, scale=560)
for i, p in enumerate(PARTICLES):
    p.tx, p.ty = M_TARGETS[i]

def step_particles(t: float):
    cx, cy = W/2, H/2 - 80
    for p in PARTICLES:
        if t < p.born_t:
            continue
        local = t - p.born_t
        if t < 4.5:
            # Free drift after birth, gentle radial drift outward then settle
            if local < 0.4:
                # Birth pop: a small velocity kick outward
                if local < DT * 1.5:
                    ang = math.atan2(p.y - cy, p.x - cx + 1e-6)
                    p.vx += math.cos(ang) * 5.0
                    p.vy += math.sin(ang) * 5.0
            ax = (cx - p.x) * 0.0004
            ay = (cy - p.y) * 0.0004
            az = -p.z * 0.02
            p.vx = (p.vx + ax) * 0.985
            p.vy = (p.vy + ay) * 0.985
            p.vz = (p.vz + az) * 0.97
        elif t < 7.0:
            # Spring toward M target
            k = smoothstep(4.5, 6.5, t) * 0.085
            damp = lerp(0.92, 0.78, smoothstep(4.5, 7.0, t))
            ax = (p.tx - p.x) * k
            ay = (p.ty - p.y) * k
            az = -p.z * 0.10
            p.vx = (p.vx + ax) * damp
            p.vy = (p.vy + ay) * damp
            p.vz = (p.vz + az) * damp
        else:
            # Freeze after FORM, lock to target
            p.x = lerp(p.x, p.tx, 0.25)
            p.y = lerp(p.y, p.ty, 0.25)
            p.vx *= 0.5; p.vy *= 0.5; p.vz *= 0.5
        p.x += p.vx; p.y += p.vy; p.z += p.vz

DT = 1.0 / FPS

# ---------- Render particles ----------
def project_z(z):
    s = 1.0 + z * 0.4
    a = 0.4 + (z + 0.6) * 0.5
    blur = max(0.0, -z * 4.5)
    return s, max(0.0, min(1.0, a)), blur

def render_particles(t: float, alpha_mul: float = 1.0) -> str:
    parts = []
    for p in PARTICLES:
        if t < p.born_t - 0.02:
            continue
        # Birth bloom: scale up + glow when newly born
        age = t - p.born_t
        bloom = 1.0
        if age < 0.4:
            bloom = 1.0 + (1 - clamp01(age / 0.4)) * 1.4
        s, a, blur = project_z(p.z)
        r = 4.0 * s * bloom
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
                f'<circle cx="{p.x:.1f}" cy="{p.y:.1f}" r="{r:.1f}" '
                f'fill="{fill}" opacity="{a:.3f}" filter="url(#blurSoft)"/>'
            )
        else:
            parts.append(
                f'<circle cx="{p.x:.1f}" cy="{p.y:.1f}" r="{r:.1f}" '
                f'fill="{fill}" opacity="{a:.3f}"/>'
            )
    return "".join(parts)

# ---------- M Mark — TWO faces (front: flat outline, back: full disc+M) ----------
def render_flat_outline(cx: float, cy: float, scale: float, alpha: float) -> str:
    """The 'front' face — just the M polyline, no disc, mint stroke."""
    s = scale
    return f"""
    <g opacity="{alpha:.3f}">
      <path d="M{cx-s*0.219:.2f} {cy+s*0.187:.2f}
               V{cy-s*0.187:.2f}
               l{s*0.219:.2f} {s*0.187:.2f}
               l{s*0.219:.2f} {-s*0.187:.2f}
               v{s*0.375:.2f}"
            stroke="{MINT_3}" stroke-width="{s*0.040:.2f}"
            stroke-linecap="round" stroke-linejoin="round"
            fill="none" stroke-dasharray="none"/>
    </g>
    """

def render_full_mark(cx: float, cy: float, scale: float, alpha: float,
                     glow: float = 0.0) -> str:
    """The 'back' face — full Brand Mint canonical mark: mint disc + ink M."""
    s = scale
    glow_block = ""
    if glow > 0.001:
        glow_block = (
            f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{s*0.62:.1f}" '
            f'fill="url(#markGlow)" opacity="{glow:.3f}"/>'
        )
    return f"""
    <g opacity="{alpha:.3f}">
      {glow_block}
      <circle cx="{cx:.1f}" cy="{cy:.1f}" r="{s*0.5:.1f}" fill="url(#bmDisc)"/>
      <path d="M{cx-s*0.219:.2f} {cy+s*0.187:.2f}
               V{cy-s*0.187:.2f}
               l{s*0.219:.2f} {s*0.187:.2f}
               l{s*0.219:.2f} {-s*0.187:.2f}
               v{s*0.375:.2f}"
            stroke="{INK}" stroke-width="{s*0.069:.2f}"
            stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </g>
    """

def render_flip(t: float, cx: float, cy: float, scale: float) -> str:
    """
    Y-axis flip from flat outline (front) to full mark (back).

    Flip window: 7.0–10.5s. Theta 0 → π (180°).
    At theta < π/2 the front face is visible (with squash).
    At theta >= π/2 the back face is visible (mirrored, with squash).
    At the exact equator (theta ≈ π/2) the face is edge-on — invisible —
    so the swap is seamless.

    `scaleX = cos(theta)` gives a clean projection. We also add a thin
    "edge" rectangle visible at the swap moment for depth.
    """
    if t < 7.0:
        # Pre-flip: front face only, settled
        return render_flat_outline(cx, cy, scale, alpha=1.0)
    if t > 10.5:
        # Post-flip: back face only, settled
        return render_full_mark(cx, cy, scale, alpha=1.0,
                                glow=glow_pulse_after_flip(t))

    # During flip
    flip_t = ease_in_out_cubic(localT(t, 7.0, 10.5))   # 0..1
    theta = flip_t * math.pi                            # 0..π
    scale_x = math.cos(theta)                           # +1 → -1
    abs_sx = abs(scale_x)

    # Edge-glow when near equator
    edge_glow = (1 - abs_sx) ** 3
    edge_h = scale * 0.62

    parts = []
    # Edge sliver (faint metallic mint band visible at flip apex)
    if edge_glow > 0.04:
        parts.append(
            f'<rect x="{cx-2.5}" y="{cy-edge_h:.1f}" width="5" height="{2*edge_h:.1f}" '
            f'rx="2" fill="url(#edgeBand)" opacity="{edge_glow:.3f}"/>'
        )
    # Light catch — a thin highlight that sweeps across the rotating face
    light_x = math.sin(flip_t * math.pi) * scale * 0.5
    parts.append(
        f'<g transform="translate({cx:.1f},{cy:.1f}) matrix({scale_x:.4f},0,0,1,0,0)">'
    )
    if scale_x > 0:
        # Front (flat outline)
        parts.append(render_flat_outline(0, 0, scale, alpha=1.0))
    else:
        # Back (full mark) — we already flipped via negative scaleX, so the
        # mark renders mirrored which is fine because it's centered & symmetric.
        parts.append(render_full_mark(0, 0, scale, alpha=1.0,
                                      glow=edge_glow * 0.5))
    parts.append("</g>")
    return "".join(parts)

def glow_pulse_after_flip(t: float) -> float:
    """Soft glow that pulses just after the flip lands, then fades."""
    if t < 10.5: return 0.0
    p = clamp01((t - 10.5) / 1.2)
    return (1 - (1 - p) ** 3) * (1 - p) * 0.8

# ---------- Text overlays ----------
def render_story_line(t: float) -> str:
    """
    Mono kicker that tells the story. One line at a time.
    Each line fades in over 0.5s, holds for ~1s, fades out over 0.4s.
    """
    lines = [
        ("ONE IDEA.",            0.5, 2.2),
        ("MULTIPLIES.",          2.4, 4.6),
        ("BECOMES A BRAND.",     4.9, 7.1),
        ("THAT COMPOUNDS.",      9.6, 11.2),
    ]
    parts = []
    for text, t0, t1 in lines:
        if t < t0 - 0.1 or t > t1 + 0.5: continue
        a = smoothstep(t0, t0 + 0.4, t) * (1 - smoothstep(t1, t1 + 0.4, t))
        y = H * 0.78   # lower third
        parts.append(
            f'<text x="{W//2}" y="{y:.1f}" '
            f'font-family="{FONT_MONO}" font-weight="600" font-size="34" '
            f'letter-spacing="0.28em" fill="{PAPER}" text-anchor="middle" '
            f'opacity="{a:.3f}">{text}</text>'
        )
    return "".join(parts)

def render_wordmark(t: float) -> str:
    """
    'BRAND MINT' typesets in below the mark with letter-spacing settle.
    """
    local = localT(t, 10.5, 12.5)
    if local <= 0: return ""
    ease = ease_out_cubic(local)
    letter_spacing_em = lerp(0.45, 0.06, ease)
    yoff = lerp(28, 0, ease)
    y = H * 0.62 + yoff
    return (
        f'<text x="{W//2}" y="{y:.1f}" '
        f'font-family="{FONT_DISPLAY}" font-weight="800" font-size="78" '
        f'letter-spacing="{letter_spacing_em:.3f}em" fill="{PAPER}" '
        f'text-anchor="middle" opacity="{ease:.3f}">BRAND MINT</text>'
    )

def render_tagline(t: float) -> str:
    """We mint brands that compound."""
    local = localT(t, 12.3, 14.0)
    if local <= 0: return ""
    sub_kicker = smoothstep(0.0, 0.35, local)
    sub_comp = smoothstep(0.3, 0.85, local)
    base_y = H * 0.70
    parts = []
    # Mono kicker line
    parts.append(
        f'<text x="{W//2}" y="{base_y:.1f}" '
        f'font-family="{FONT_MONO}" font-weight="600" font-size="22" '
        f'letter-spacing="0.22em" fill="{PAPER}" text-anchor="middle" '
        f'opacity="{sub_kicker:.3f}">WE MINT BRANDS &#183; THAT</text>'
    )
    # Display "compound." with mint gradient + scale pulse
    scale_pulse = 1.0 + 0.05 * math.sin(min(1.0, (local - 0.4) * 6) * math.pi) if local > 0.4 else 1.0
    parts.append(
        f'<g transform="translate({W//2} {base_y + 80:.1f}) scale({scale_pulse:.3f})" opacity="{sub_comp:.3f}">'
        f'<text x="0" y="0" font-family="{FONT_DISPLAY}" font-weight="800" '
        f'font-size="86" letter-spacing="0.02em" fill="url(#mintTextGrad)" '
        f'text-anchor="middle" font-style="italic">compound.</text>'
        f'</g>'
    )
    return "".join(parts)

def render_signature(t: float) -> str:
    local = localT(t, 13.8, 14.8)
    if local <= 0: return ""
    a = ease_out_cubic(local)
    blink = 1.0 if (math.floor(t * 4) % 2 == 0) else 0.25
    y = H * 0.92
    return (
        f'<text x="{W//2}" y="{y:.1f}" font-family="{FONT_MONO}" '
        f'font-weight="500" font-size="22" letter-spacing="0.32em" '
        f'fill="{GHOST}" text-anchor="middle" opacity="{a:.3f}">'
        f'STUDIOS &#8212; HYDERABAD &#183; brandmintstudios.in'
        f'<tspan dx="6" opacity="{blink:.2f}">|</tspan></text>'
    )

# ---------- Camera (subtle scale on flip) ----------
def camera_scale(t: float) -> float:
    """Slight zoom-in during the flip to add weight."""
    if t < 7.0: return 1.0
    if t < 10.5:
        p = ease_in_out_cubic(localT(t, 7.0, 10.5))
        return lerp(1.0, 1.05, p)
    # Hold the zoom briefly then ease back
    p2 = ease_out_cubic(localT(t, 10.5, 12.5))
    return lerp(1.05, 1.0, p2)

# ---------- Frame composer ----------
def svg_for_frame(f: int) -> str:
    t = f / FPS
    step_particles(t)

    # Camera transform
    cs = camera_scale(t)
    cam_tx = W / 2 * (1 - cs)
    cam_ty = (H / 2 - 80) * (1 - cs)

    # Particle alpha — they fade out as the M takes over
    particle_alpha = 1.0 - smoothstep(6.5, 7.5, t)

    # Mark center / scale (during FORM/FLIP it sits center; after flip it
    # stays at center, then rises slightly before the wordmark joins).
    mark_cx = W // 2
    rise = lerp(0, -120, ease_out_cubic(localT(t, 10.8, 12.0)))
    mark_cy = H // 2 - 80 + rise
    # Slight scale-down post-flip when wordmark joins
    mark_scale = lerp(560, 320, ease_out_cubic(localT(t, 10.8, 12.0)))

    # Seed pulse (only beat 1: ONE IDEA)
    seed_block = ""
    if t < 2.0:
        pulse = 1.0 + 0.25 * math.sin(t * math.tau * 1.5)
        seed_a = 1.0
        # Big outer ring that pulses
        seed_block = (
            f'<circle cx="{W//2}" cy="{H//2 - 80}" r="{32*pulse:.1f}" '
            f'fill="none" stroke="{MINT_2}" stroke-width="1.5" '
            f'opacity="{0.4 / pulse:.3f}"/>'
        )

    # Background + vignette
    bg = f'<rect width="{W}" height="{H}" fill="{INK}"/>'
    vignette = f'<rect width="{W}" height="{H}" fill="url(#vig)"/>'

    # Fade out at the very end
    fade_t = localT(t, 14.6, 15.0)

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
    <linearGradient id="edgeBand" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"  stop-color="{MINT_2}" stop-opacity="0"/>
      <stop offset="50%" stop-color="{MINT_2}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="{MINT_2}" stop-opacity="0"/>
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

  <!-- Camera-scaled content -->
  <g transform="translate({cam_tx:.1f},{cam_ty:.1f}) scale({cs:.4f})">
    {seed_block}
    {render_particles(t, alpha_mul=particle_alpha)}
    <g transform="translate({mark_cx - W//2:.1f},{mark_cy - (H//2 - 80):.1f})">
      <!-- Render mark at canonical center, the translate above moves it -->
      <g transform="translate({W//2 - mark_cx:.1f},{(H//2 - 80) - mark_cy:.1f})">
        <!-- Use mark center coords -->
      </g>
    </g>
    {render_flip(t, mark_cx, mark_cy, mark_scale)}
  </g>

  <!-- UI text (not camera-scaled, stays crisp) -->
  {render_story_line(t)}
  {render_wordmark(t)}
  {render_tagline(t)}
  {render_signature(t)}

  <!-- Vignette top -->
  {vignette}

  <!-- Final fade -->
  <rect width="{W}" height="{H}" fill="{INK}" opacity="{ease_in_cubic(fade_t):.3f}"/>
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
    print(f"v23 Brand Story Ident · {FPS}fps · {TOTAL_S}s")
    render_all_frames()
    mux()
    size_mb = OUT_MP4.stat().st_size / 1024 / 1024
    print(f"  done → {OUT_MP4} ({size_mb:.2f}MB)")

if __name__ == "__main__":
    main()
