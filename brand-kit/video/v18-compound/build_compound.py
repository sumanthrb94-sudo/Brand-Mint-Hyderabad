"""
BrandMint Studios — v18 COMPOUND · animator-craft visual essay · ~17s @ 60fps.

This is the piece the 2D/3D animator lead CEO directs. Motion as concept:
a single mint dot multiplies, connects into a network, organizes itself
into the Brand Mint M-monogram, then pulls back to reveal the studio.
No tricks — one idea, well executed.

Craft markers (every frame must honor):
  - WEIGHT: particles move via mass-spring-damper (ease, not snap)
  - ANTICIPATION: micro reverse-move before each beat change
  - SECONDARY MOTION: camera dolly + light trails follow
  - RHYTHM: every multiplication lands on a beat
  - RESTRAINT: ~64 particles peak, not 1000 — clarity over chaos

Beats:
  0:00-0:01.5  SEED         one mint dot, pulse, anticipation
  0:01.5-0:08  COMPOUND     doubles 1→2→4→8→16→32→64, connections fade in
  0:08-0:11    ORGANIZE     network reshapes into the M-path positions
  0:11-0:13.5  REVEAL       camera pulls back, M dissolves into the brand mark
  0:13.5-0:15.5 PILLAR      BRAND MINT wordmark + tagline cascade in
  0:15.5-0:17   CTA          "COMMENT 'COMPOUND' for your category gap"

Run: python3 build_compound.py
"""

from __future__ import annotations

import math
import os
import random
import shutil
import subprocess
import wave
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Tuple

import cairosvg
import numpy as np
from PIL import ImageFont

# ----- canvas + bpm -------------------------------------------------------

W, H, FPS = 1080, 1920, 60
BPM = int(os.environ.get("BPM", "120"))
BEAT_SEC = 60.0 / BPM
def beats(n: float) -> float: return n * BEAT_SEC

# ----- palette ------------------------------------------------------------

WHITE = "#FFFFFF"
BLACK = "#0D0D0D"
INK_2 = "#10171a"
MINT = "#10B981"
MINT_2 = "#7CF6C8"
MINT_DEEP = "#047857"
MINT_DUSK = "#0a2a22"

FONT_DISPLAY = "Plus Jakarta Sans, system-ui, sans-serif"
FONT_SERIF = "Plus Jakarta Sans, system-ui, sans-serif"
FONT_MONO = "JetBrains Mono, ui-monospace, monospace"
_DEJAVU_BOLD = "/usr/local/share/fonts/brandmint/PlusJakartaSans-ExtraBold.ttf"
_DEJAVU_SERIF_BOLD = "/usr/local/share/fonts/brandmint/PlusJakartaSans-SemiBoldItalic.ttf"
_DEJAVU_MONO = "/usr/local/share/fonts/brandmint/JetBrainsMono-Bold.ttf"

HERE = Path(__file__).parent
FRAMES = HERE / "frames"
OUT = HERE / "out"
FRAMES.mkdir(exist_ok=True)
OUT.mkdir(exist_ok=True)

SAFE_TEXT_W = 920

_LOGO_SVG_PATH = Path(__file__).resolve().parent.parent.parent / "logo" / "brand-mint-monogram.svg"
_LOGO_SVG_SRC = _LOGO_SVG_PATH.read_text() if _LOGO_SVG_PATH.exists() else None

# ----- fonts --------------------------------------------------------------

_font_cache: dict = {}
def _font(pt: int, kind: str = "bold"):
    key = (pt, kind)
    if key not in _font_cache:
        path = {"bold": _DEJAVU_BOLD, "serif": _DEJAVU_SERIF_BOLD,
                "mono": _DEJAVU_MONO}[kind]
        _font_cache[key] = ImageFont.truetype(path, pt)
    return _font_cache[key]

def measure(text: str, pt: int, kind: str = "bold") -> float:
    if not text:
        return 0.0
    l, _, r, _ = _font(pt, kind).getbbox(text)
    return float(r - l)

def fit_to_width(text: str, max_w_px: float, start_pt: int,
                 floor_pt: int = 36, kind: str = "bold",
                 step: int = 2) -> int:
    for pt in range(start_pt, floor_pt - 1, -step):
        if measure(text, pt, kind) <= max_w_px:
            return pt
    return floor_pt

def esc(s: str) -> str:
    return (s.replace("&", "&amp;").replace("<", "&lt;")
             .replace(">", "&gt;").replace('"', "&quot;"))

# ----- easing -------------------------------------------------------------

def lerp(a, b, t): return a + (b - a) * t

def clamp01(t: float) -> float:
    return 0.0 if t < 0 else 1.0 if t > 1 else t

def ease_out_cubic(t: float) -> float:
    t = clamp01(t)
    return 1 - (1 - t) ** 3

def ease_out_quint(t: float) -> float:
    t = clamp01(t)
    return 1 - (1 - t) ** 5

def ease_in_cubic(t: float) -> float:
    t = clamp01(t)
    return t ** 3

def ease_in_out(t: float) -> float:
    t = clamp01(t)
    return 0.5 - 0.5 * math.cos(math.pi * t)

def smoothstep(edge0: float, edge1: float, x: float) -> float:
    t = clamp01((x - edge0) / (edge1 - edge0)) if edge1 > edge0 else 0.0
    return t * t * (3 - 2 * t)

def back_out(t: float) -> float:
    t = clamp01(t)
    s = 1.70158
    return 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2

# ----- M-path target positions --------------------------------------------
# Sample 64 evenly-spaced points along the canonical M-path so the
# particle network can resolve into the mark.

def sample_m_path(n: int = 64, scale: float = 460, cx: float = W // 2,
                  cy: float = H // 2) -> List[Tuple[float, float]]:
    """Sample n points along path 'M18 44V20l14 12 14-12v24' in
    a 64-viewBox, then scale + translate to canvas."""
    # Path segments in 64-viewBox space:
    #   (18,44) → (18,20)   left vertical, length 24
    #   (18,20) → (32,32)   diag, length √(14²+12²) ≈ 18.44
    #   (32,32) → (46,20)   diag, length 18.44
    #   (46,20) → (46,44)   right vertical, length 24
    segs = [
        ((18, 44), (18, 20)),
        ((18, 20), (32, 32)),
        ((32, 32), (46, 20)),
        ((46, 20), (46, 44)),
    ]
    lengths = [math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in segs]
    total = sum(lengths)
    pts = []
    for i in range(n):
        d = (i / (n - 1)) * total
        # find which segment d lands in
        accum = 0
        for (a, b), L in zip(segs, lengths):
            if d <= accum + L or (a, b) == segs[-1]:
                local = (d - accum) / L if L > 0 else 0
                local = clamp01(local)
                px = a[0] + (b[0] - a[0]) * local
                py = a[1] + (b[1] - a[1]) * local
                # center the path in 64-viewBox and scale to canvas
                # viewBox center is (32, 32). Translate to (0,0), scale, then move to cx,cy.
                sx = (px - 32) / 32 * scale + cx
                sy = (py - 32) / 32 * scale + cy
                pts.append((sx, sy))
                break
            accum += L
    return pts

M_TARGETS = sample_m_path(n=64, scale=420, cx=W // 2, cy=H // 2)

# ----- particles ---------------------------------------------------------

@dataclass
class Particle:
    x: float
    y: float
    vx: float = 0.0
    vy: float = 0.0
    z: float = 0.0           # depth in [-1, 1]; -1 closest, 1 farthest
    target_x: float = 0.0
    target_y: float = 0.0
    birth_t: float = 0.0     # when it appeared
    home_idx: int = 0        # which M-target this particle resolves to

def make_particles() -> List[Particle]:
    """Construct 64 particles. They all start at center but only the
    first appears at t=0. Particles 2..64 are born during compound phase."""
    rng = random.Random(7)
    parts = []
    for i in range(64):
        # Initial scattered "wander" target (used during compound phase
        # before they're pulled to M positions)
        wander_r = rng.uniform(120, 380)
        wander_a = rng.uniform(0, math.tau)
        wx = W // 2 + math.cos(wander_a) * wander_r
        wy = H // 2 + math.sin(wander_a) * wander_r
        z = rng.uniform(-0.6, 0.6)
        parts.append(Particle(
            x=W // 2, y=H // 2, vx=0, vy=0, z=z,
            target_x=wx, target_y=wy,
            birth_t=0.0, home_idx=i,
        ))
    return parts

# Birth schedule — exponential doubling on beats
# 1, 2, 4, 8, 16, 32, 64 — births at t = 0, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5
BIRTH_BEATS = [
    (0, 1.5),    # 1st particle alive at 0s, target wander
    (1, 2.5),    # particles 1→2 at 1.5s
    (2, 3.5),    # 2→4 at 2.5s
    (4, 4.5),    # 4→8
    (8, 5.5),    # 8→16
    (16, 6.5),   # 16→32
    (32, 7.5),   # 32→64
]

def particle_alive_count(t: float) -> int:
    """How many particles are alive at time t."""
    schedule = [
        (0.0, 1), (1.5, 2), (2.5, 4), (3.5, 8),
        (4.5, 16), (5.5, 32), (6.5, 64),
    ]
    count = 1
    for boundary, n in schedule:
        if t >= boundary:
            count = n
    return count

# ----- phases -----------------------------------------------------------

# Total duration ~17s.
PHASE_SEED_END     = 1.5
PHASE_COMPOUND_END = 8.0
PHASE_ORGANIZE_END = 11.0
PHASE_REVEAL_END   = 13.5
PHASE_PILLAR_END   = 15.5
PHASE_CTA_END      = 17.0

TOTAL_S = PHASE_CTA_END
TOTAL_F = int(round(TOTAL_S * FPS))

# ----- simulation -------------------------------------------------------

PARTICLES = make_particles()
SIM_DT = 1.0 / FPS

def step_particles(t: float):
    """Advance the simulation for one frame.

    Each particle is a mass-spring-damper toward its target. Spring
    constant + damping tuned for tactile, weighty motion."""
    K = 14.0    # spring stiffness
    D = 5.0     # damping

    # During organize phase, retarget to M positions
    organize_t = smoothstep(PHASE_COMPOUND_END, PHASE_ORGANIZE_END, t)

    n_alive = particle_alive_count(t)
    for i, p in enumerate(PARTICLES):
        if i >= n_alive:
            # Dormant particles stay at center
            p.x = W // 2; p.y = H // 2
            p.vx = 0; p.vy = 0
            continue

        # In SEED phase, particle 0 stays near center with tiny breathing
        if t < PHASE_SEED_END and i == 0:
            target = (W // 2, H // 2)
        elif t < PHASE_COMPOUND_END:
            # During compound, target is wander point
            # Slow drift on wander position to keep things moving
            drift_x = math.sin(t * 0.6 + i * 0.3) * 16
            drift_y = math.cos(t * 0.5 + i * 0.4) * 14
            target = (p.target_x + drift_x, p.target_y + drift_y)
        else:
            # Organize → resolve to M target
            mx, my = M_TARGETS[p.home_idx % len(M_TARGETS)]
            target = (
                lerp(p.target_x, mx, organize_t),
                lerp(p.target_y, my, organize_t),
            )

        # Spring force toward target
        dx = target[0] - p.x
        dy = target[1] - p.y
        fx = K * dx - D * p.vx
        fy = K * dy - D * p.vy

        p.vx += fx * SIM_DT
        p.vy += fy * SIM_DT
        p.x += p.vx * SIM_DT
        p.y += p.vy * SIM_DT

# ----- 3D perspective projection ---------------------------------------

def project(x: float, y: float, z: float, camera_z: float = 1.4) -> Tuple[float, float, float]:
    """Project (x, y, z) to screen-space (sx, sy, scale)."""
    fz = camera_z + z * 0.6
    if fz <= 0.01:
        fz = 0.01
    persp = camera_z / fz
    sx = W // 2 + (x - W // 2) * persp
    sy = H // 2 + (y - H // 2) * persp
    return sx, sy, persp

# ----- render scenes ----------------------------------------------------

def render_particles(t: float, camera_z: float = 1.4,
                     intensity: float = 1.0) -> str:
    """Render alive particles with glow + center dot."""
    n_alive = particle_alive_count(t)
    items = []

    # Sort particles back-to-front so closer ones are on top
    drawables = []
    for i, p in enumerate(PARTICLES):
        if i >= n_alive:
            continue
        sx, sy, scale = project(p.x, p.y, p.z, camera_z=camera_z)
        drawables.append((p.z, sx, sy, scale, i))
    drawables.sort(key=lambda d: d[0], reverse=True)  # farthest first

    for z, sx, sy, scale, i in drawables:
        # Soft outer glow
        glow_r = 22 * scale
        items.append(
            f'<circle cx="{sx:.1f}" cy="{sy:.1f}" r="{glow_r:.1f}" '
            f'fill="{MINT}" opacity="{0.28 * intensity:.3f}" '
            f'filter="blur(8)"/>'
        )
        # Mid glow
        items.append(
            f'<circle cx="{sx:.1f}" cy="{sy:.1f}" r="{glow_r * 0.5:.1f}" '
            f'fill="{MINT_2}" opacity="{0.55 * intensity:.3f}" '
            f'filter="blur(3)"/>'
        )
        # Bright center dot
        dot_r = 3.0 * scale
        items.append(
            f'<circle cx="{sx:.1f}" cy="{sy:.1f}" r="{dot_r:.1f}" '
            f'fill="{WHITE}" opacity="{0.9 * intensity:.3f}"/>'
        )

    return "".join(items)

def render_connections(t: float, camera_z: float = 1.4,
                       intensity: float = 1.0,
                       max_dist: float = 240.0) -> str:
    """Draw mint lines between particles within max_dist. Opacity
    scales inversely with distance — closer = brighter."""
    n_alive = particle_alive_count(t)
    if n_alive < 2:
        return ""
    items = []
    # Use only alive particles
    alive = []
    for i, p in enumerate(PARTICLES):
        if i >= n_alive:
            continue
        sx, sy, scale = project(p.x, p.y, p.z, camera_z=camera_z)
        alive.append((sx, sy, scale))

    for i in range(len(alive)):
        x1, y1, s1 = alive[i]
        for j in range(i + 1, len(alive)):
            x2, y2, s2 = alive[j]
            d = math.hypot(x2 - x1, y2 - y1)
            if d > max_dist:
                continue
            t_strength = 1 - (d / max_dist)
            op = 0.45 * t_strength * intensity
            if op < 0.04:
                continue
            sw = max(0.6, 2.0 * t_strength * (s1 + s2) * 0.5)
            items.append(
                f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
                f'stroke="{MINT_2}" stroke-width="{sw:.2f}" '
                f'opacity="{op:.3f}" stroke-linecap="round"/>'
            )
    return "".join(items)

def render_atmosphere(t: float) -> str:
    """Subtle dust + ambient haze behind the particle network."""
    rng = np.random.default_rng(11)
    out = []
    # Radial vignette via dim center glow
    out.append(
        f'<radialGradient id="atmo-glow" cx="0.5" cy="0.5" r="0.55">'
        f'<stop offset="0%" stop-color="{MINT_DUSK}" stop-opacity="0.5"/>'
        f'<stop offset="100%" stop-color="{BLACK}" stop-opacity="0"/>'
        f'</radialGradient>'
    )
    out.append(f'<rect width="{W}" height="{H}" fill="url(#atmo-glow)"/>')
    # Dust motes — 80 deterministic specks drifting upward
    out.append('<g opacity="0.35">')
    for k in range(80):
        bx = rng.uniform(0, W)
        by_base = rng.uniform(0, H)
        speed = rng.uniform(6, 20)
        phase = rng.uniform(0, math.tau)
        by = (by_base - (t * speed)) % H
        r = rng.uniform(0.6, 1.8)
        op = 0.4 + 0.6 * (0.5 + 0.5 * math.sin(t * 0.8 + phase))
        out.append(
            f'<circle cx="{bx + math.sin(t * 0.3 + phase) * 8:.1f}" '
            f'cy="{by:.1f}" r="{r:.1f}" fill="{MINT}" opacity="{op:.2f}"/>'
        )
    out.append('</g>')
    return "".join(out)

# ----- brand mark embedding ---------------------------------------------

def draw_mark(cx: float, cy: float, scale: float, draw_t: float,
              opacity: float, glow: float = 0.0) -> str:
    size = int(320 * scale)
    if size <= 4 or _LOGO_SVG_SRC is None:
        return ""
    path_len = 85
    dash_offset = path_len * (1 - clamp01(draw_t))
    op = clamp01(opacity)

    uniq = f"{int(scale * 10000)}-{int(draw_t * 10000)}"
    svg = _LOGO_SVG_SRC
    svg = svg.replace('id="bmGrad"', f'id="bmGrad-{uniq}"')
    svg = svg.replace('url(#bmGrad)', f'url(#bmGrad-{uniq})')
    svg = svg.replace(
        'stroke-linejoin="round" fill="none"',
        f'stroke-linejoin="round" fill="none" '
        f'stroke-dasharray="{path_len}" stroke-dashoffset="{dash_offset:.2f}"'
    )
    svg = svg.replace('width="64" height="64"',
                      f'width="{size}" height="{size}"')
    if svg.startswith("<?xml"):
        svg = svg.split("?>", 1)[1].lstrip()

    glow_layer = ""
    if glow > 0:
        glow_r = int(180 * glow)
        glow_layer = (
            f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{glow_r}" '
            f'fill="{MINT_2}" opacity="{0.30 * glow:.3f}" '
            f'filter="blur(40)"/>'
        )

    return f"""
      {glow_layer}
      <g transform="translate({cx - size/2:.1f} {cy - size/2:.1f})"
         opacity="{op:.3f}">
        {svg}
      </g>
    """

# ----- text helpers -----------------------------------------------------

def text_at(text: str, x: float, y: float, pt: int, fill: str = WHITE,
            anchor: str = "middle", weight: int = 900,
            letter_spacing: str = "-0.02em",
            kind_font: str = FONT_DISPLAY,
            font_style: str = "normal",
            opacity: float = 1.0) -> str:
    return (
        f'<text x="{x:.1f}" y="{y:.1f}" font-family="{kind_font}" '
        f'font-size="{pt}" font-weight="{weight}" fill="{fill}" '
        f'text-anchor="{anchor}" letter-spacing="{letter_spacing}" '
        f'font-style="{font_style}" opacity="{opacity:.3f}">'
        f"{esc(text)}</text>"
    )

# ----- camera / phase choreography --------------------------------------

def camera_z_at(t: float) -> float:
    """Camera dolly. Pulls in during SEED, drifts during COMPOUND,
    holds during ORGANIZE, pulls back during REVEAL."""
    if t < PHASE_SEED_END:
        return lerp(2.5, 1.4, ease_out_cubic(t / PHASE_SEED_END))
    elif t < PHASE_COMPOUND_END:
        local = (t - PHASE_SEED_END) / (PHASE_COMPOUND_END - PHASE_SEED_END)
        return 1.4 + 0.05 * math.sin(local * math.pi * 2)
    elif t < PHASE_ORGANIZE_END:
        local = (t - PHASE_COMPOUND_END) / (PHASE_ORGANIZE_END - PHASE_COMPOUND_END)
        return lerp(1.4, 1.2, ease_in_out(local))
    elif t < PHASE_REVEAL_END:
        local = (t - PHASE_ORGANIZE_END) / (PHASE_REVEAL_END - PHASE_ORGANIZE_END)
        return lerp(1.2, 2.4, ease_out_cubic(local))
    else:
        return 2.4

def render_seed_phase(t: float) -> str:
    """0:00-0:01.5 SEED — one mint dot, pulse, anticipation."""
    cz = camera_z_at(t)
    parts = render_particles(t, camera_z=cz)
    # Anticipation: tiny inverse pulse before the first doubling
    return f"""
      {render_atmosphere(t)}
      {parts}
    """

def render_compound_phase(t: float) -> str:
    """0:01.5-0:08 COMPOUND — particles double + connections form."""
    cz = camera_z_at(t)
    # As more particles appear, intensify connections
    n = particle_alive_count(t)
    conn_intensity = min(1.0, n / 32) * 0.85
    label_a = smoothstep(2.0, 3.0, t) * smoothstep(7.5, 8.0, 8.0 - (t - 1.5)) ** 0
    # Show running count as a quiet label
    label_a = clamp01(smoothstep(2.0, 3.5, t) - smoothstep(7.3, 8.0, t))

    return f"""
      {render_atmosphere(t)}
      {render_connections(t, camera_z=cz, intensity=conn_intensity)}
      {render_particles(t, camera_z=cz)}

      <g opacity="{label_a:.3f}">
        <text x="{W // 2}" y="{int(H * 0.88)}" font-family="{FONT_MONO}"
              font-size="20" font-weight="700" fill="{MINT}"
              text-anchor="middle" letter-spacing="0.30em">
          n = {n}
        </text>
        <text x="{W // 2}" y="{int(H * 0.92)}" font-family="{FONT_MONO}"
              font-size="14" font-weight="700" fill="{WHITE}"
              text-anchor="middle" letter-spacing="0.30em" opacity="0.55">
          POSITIONING COMPOUNDS.
        </text>
      </g>
    """

def render_organize_phase(t: float) -> str:
    """0:08-0:11 ORGANIZE — network reshapes into M positions."""
    cz = camera_z_at(t)
    local = (t - PHASE_COMPOUND_END) / (PHASE_ORGANIZE_END - PHASE_COMPOUND_END)
    # As resolution completes, connections fade so the M shape reads cleanly
    conn_int = lerp(0.85, 0.25, ease_out_cubic(local))
    return f"""
      {render_atmosphere(t)}
      {render_connections(t, camera_z=cz, intensity=conn_int, max_dist=300)}
      {render_particles(t, camera_z=cz, intensity=lerp(1.0, 1.15, local))}
    """

def render_reveal_phase(t: float) -> str:
    """0:11-0:13.5 REVEAL — particles bloom-flash, fade out CLEAN, then
    mark fades in. Serial, not parallel — no overlap window."""
    cz = camera_z_at(t)
    local = (t - PHASE_ORGANIZE_END) / (PHASE_REVEAL_END - PHASE_ORGANIZE_END)

    # FIX C2: particles fade out in the FIRST 35% of reveal (was the full phase).
    # Mark starts fading in at 40%. No overlap.
    particles_a = 1.0 - ease_in_cubic(clamp01(local / 0.35))

    # Q2: bloom-flash at local≈0.05 — the moment the M resolves
    bloom = max(0, 1 - abs(local - 0.05) * 12)
    particles_intensity = particles_a * (1.0 + 1.5 * bloom)

    mark_a = smoothstep(0.40, 0.78, local)
    mark_scale = lerp(0.6, 0.90, ease_out_cubic(local))
    mark_glow = max(0, 1 - abs(local - 0.55) * 3)

    # Mint pillar starts arriving at the END of reveal
    pillar_t = smoothstep(0.72, 1.0, local)
    pillar_top = lerp(H + 200, 600, ease_out_cubic(pillar_t))

    cx, cy = W // 2, H // 2

    return f"""
      {render_atmosphere(t)}
      <g opacity="{particles_a:.3f}">
        {render_connections(t, camera_z=cz, intensity=0.5 * particles_a)}
        {render_particles(t, camera_z=cz, intensity=particles_intensity)}
      </g>

      <rect x="0" y="{pillar_top:.2f}" width="{W}" height="900" fill="{MINT}"/>
      {draw_mark(cx, min(960, pillar_top + 180), scale=mark_scale * 0.9,
                 draw_t=mark_a, opacity=mark_a, glow=mark_glow * 0.6)}
    """

def render_pillar_phase(t: float) -> str:
    """0:13.5-0:15.5 PILLAR — wordmark + tagline cascade."""
    cx = W // 2
    local = (t - PHASE_REVEAL_END) / (PHASE_PILLAR_END - PHASE_REVEAL_END)

    pillar_top = 600  # at rest
    big_pt = fit_to_width("BRAND MINT", SAFE_TEXT_W, 152, floor_pt=110)
    tagline = "Positioning is the only marketing that compounds."
    sub_pt = fit_to_width(tagline, SAFE_TEXT_W, 36, floor_pt=28, kind="serif")

    word_a = smoothstep(0.08, 0.28, local)
    word_drift = lerp(16, 0, ease_out_cubic(word_a))
    sub_a = smoothstep(0.28, 0.50, local)
    url_a = smoothstep(0.45, 0.70, local)

    # Mark draws if not already
    mark_draw_t = 1.0
    mark_scale = 0.81
    mark_glow = max(0, 1 - abs(local - 0.20) * 3) * 0.5

    return f"""
      <rect x="0" y="{pillar_top}" width="{W}" height="900" fill="{MINT}"/>
      {draw_mark(cx, 780, scale=mark_scale, draw_t=mark_draw_t,
                 opacity=1.0, glow=mark_glow)}

      <g transform="translate(0 {word_drift:.2f})">
        {text_at("BRAND MINT", cx, 1110, big_pt, INK_2,
                 letter_spacing='-0.025em', weight=900, opacity=word_a)}

        <text x="{cx}" y="1230"
              font-family="{FONT_SERIF}" font-size="{sub_pt}" font-weight="700"
              fill="{INK_2}" text-anchor="middle" font-style="italic"
              opacity="{sub_a:.3f}">
          {esc(tagline)}
        </text>

        <text x="{cx}" y="1370"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              letter-spacing='0.30em' fill="{INK_2}" text-anchor="middle"
              opacity="{0.78 * url_a:.3f}">
          BRANDMINTSTUDIOS.IN
        </text>
      </g>
    """

def render_cta_phase(t: float) -> str:
    """0:15.5-0:17 CTA — pillar SLIDES UP off the canvas (clearing the
    middle), CTA text fades in on clean black, mint CTA bar slides up.

    FIX C1: pillar no longer fades-in-place (which stacked 7 layers in
    the same vertical band). Now pillar exits via slide-up + fade,
    completely off-canvas by local≈0.55, then CTA text takes the stage."""
    cx = W // 2
    local = (t - PHASE_PILLAR_END) / (PHASE_CTA_END - PHASE_PILLAR_END)

    # Pillar exits FAST: slides up + fades, fully gone by local=0.22
    # (was 0.55 — caused overlap with the incoming CTA text).
    pillar_exit_t = ease_in_cubic(clamp01(local / 0.22))
    pillar_top = lerp(600, -900, pillar_exit_t)
    pillar_a = 1.0 - clamp01(local / 0.20)
    if pillar_a < 0.02 or pillar_top <= -800:
        pillar_a = 0.0    # killswitch

    big_pt = fit_to_width("BRAND MINT", SAFE_TEXT_W, 152, floor_pt=110)
    tagline = "Positioning is the only marketing that compounds."
    sub_pt = fit_to_width(tagline, SAFE_TEXT_W, 36, floor_pt=28, kind="serif")

    # CTA text starts AFTER pillar is gone (0.22 → 0.50). Clean handoff.
    cta_text_a = smoothstep(0.25, 0.50, local)
    cta_top_pt = fit_to_width("COMMENT \"COMPOUND\"", SAFE_TEXT_W, 76, floor_pt=56)

    # CTA bar slides up from the bottom (independent of pillar).
    bar_t = clamp01((local - 0.15) / 0.40)
    bar_top = lerp(H, 1450, ease_out_cubic(bar_t))

    # Only render pillar group while it's still on-screen
    pillar_group = ""
    if pillar_a > 0.01:
        pillar_group = f"""
        <g opacity="{pillar_a:.3f}">
          <rect x="0" y="{pillar_top:.2f}" width="{W}" height="900" fill="{MINT}"/>
          {draw_mark(cx, pillar_top + 180, scale=0.81, draw_t=1.0, opacity=1.0)}
          <text x="{cx}" y="{pillar_top + 510:.0f}"
                font-family="{FONT_DISPLAY}" font-size="{big_pt}" font-weight="900"
                fill="{INK_2}" text-anchor="middle" letter-spacing="-0.025em">
            BRAND MINT
          </text>
          <text x="{cx}" y="{pillar_top + 630:.0f}"
                font-family="{FONT_SERIF}" font-size="{sub_pt}" font-weight="700"
                fill="{INK_2}" text-anchor="middle" font-style="italic"
                opacity="0.85">
            {esc(tagline)}
          </text>
        </g>"""

    return f"""
      {pillar_group}

      <g opacity="{cta_text_a:.3f}">
        <text x="{cx}" y="{int(H * 0.34)}"
              font-family="{FONT_MONO}" font-size="28" font-weight="700"
              fill="{WHITE}" text-anchor="middle" letter-spacing="0.30em">
          YOUR POSITION?
        </text>
        <text x="{cx}" y="{int(H * 0.50)}"
              font-family="{FONT_DISPLAY}" font-size="{cta_top_pt}"
              font-weight="900" fill="{MINT_2}" text-anchor="middle"
              letter-spacing="-0.02em">
          COMMENT "COMPOUND"
        </text>
        <text x="{cx}" y="{int(H * 0.60)}"
              font-family="{FONT_SERIF}" font-size="36" font-weight="700"
              fill="{WHITE}" text-anchor="middle" font-style="italic">
          We'll DM your category gap.
        </text>
      </g>

      <rect x="0" y="{bar_top:.2f}" width="{W}" height="280" fill="{MINT}"/>
      <g transform="translate(0 {bar_top - 1450:.2f})">
        {draw_mark(180, 1590, scale=0.25, draw_t=1.0, opacity=cta_text_a)}
        <text x="{int(W * 0.42)}" y="1605"
              font-family="{FONT_DISPLAY}" font-size="48" font-weight="900"
              fill="{INK_2}" text-anchor="start" letter-spacing="-0.01em">
          @brandmint.studios
        </text>
        <text x="{int(W * 0.42)}" y="1665"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              fill="{INK_2}" text-anchor="start" letter-spacing="0.28em"
              opacity="0.78">
          BRANDMINTSTUDIOS.IN
        </text>
      </g>
    """

# ----- compose ----------------------------------------------------------

def compose_svg(t: float) -> str:
    if t < PHASE_SEED_END:
        body = render_seed_phase(t)
    elif t < PHASE_COMPOUND_END:
        body = render_compound_phase(t)
    elif t < PHASE_ORGANIZE_END:
        body = render_organize_phase(t)
    elif t < PHASE_REVEAL_END:
        body = render_reveal_phase(t)
    elif t < PHASE_PILLAR_END:
        body = render_pillar_phase(t)
    else:
        body = render_cta_phase(t)

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"
     viewBox="0 0 {W} {H}">
  <defs>
    <radialGradient id="atmo-glow-static" cx="0.5" cy="0.5" r="0.55">
      <stop offset="0%" stop-color="{MINT_DUSK}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="{BLACK}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="{W}" height="{H}" fill="{BLACK}"/>
  {body}
</svg>
"""

# ----- frames -----------------------------------------------------------

def render_frame(i: int):
    t = i / FPS
    # advance simulation each frame
    step_particles(t)
    svg = compose_svg(t)
    out = FRAMES / f"f{i:06d}.png"
    cairosvg.svg2png(bytestring=svg.encode(), output_width=W,
                     output_height=H, write_to=str(out))

def render_all_frames():
    # reset simulation
    global PARTICLES
    PARTICLES = make_particles()
    if FRAMES.exists():
        shutil.rmtree(FRAMES)
    FRAMES.mkdir()
    print(f"  rendering {TOTAL_F} frames ({TOTAL_S:.1f}s @ {FPS}fps)")
    for i in range(TOTAL_F):
        render_frame(i)
        if (i + 1) % 100 == 0 or i == TOTAL_F - 1:
            print(f"    {i + 1}/{TOTAL_F}")

# ----- audio ------------------------------------------------------------

def synth_audio(out_wav: Path):
    """Score that mirrors the visual essay: tones build with population,
    bell on the M-formation, crash on the brand reveal, pad on tagline."""
    sr = 48000
    n = int(TOTAL_S * sr)
    t = np.arange(n) / sr
    track = np.zeros(n)

    # Sub thumps on each compound event
    compound_times = [0.0, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5]
    for ct in compound_times:
        i = int(ct * sr)
        dur = int(0.5 * sr)
        if 0 <= i and i + dur <= n:
            env = np.exp(-np.linspace(0, 5, dur))
            sub = np.sin(2 * np.pi * 52 * np.arange(dur) / sr)
            noise = np.random.normal(0, 1, dur) * 0.15
            track[i:i + dur] += env * (0.7 * sub + 0.30 * noise) * 0.65

    # Pad drone — slowly rising tone during compound + organize
    drone = 0.06 * np.sin(2 * np.pi * 96 * t)
    drone += 0.035 * np.sin(2 * np.pi * 144 * t)
    # Drone fades in 0-2s, out at 13-14s
    drone_env = np.minimum(np.minimum(t / 2.0, 1.0),
                           np.minimum((14.0 - t) / 1.0, 1.0))
    drone_env = np.clip(drone_env, 0, 1)
    track += drone * drone_env

    # Hi-hat ticks every 0.5s during compound phase
    for tick_t in np.arange(0.5, PHASE_ORGANIZE_END, 0.5):
        i = int(tick_t * sr)
        dur = int(0.04 * sr)
        if i + dur <= n:
            env = np.exp(-np.linspace(0, 14, dur))
            track[i:i + dur] += np.random.normal(0, 1, dur) * env * 0.20

    # Bell on the M-formation (at PHASE_ORGANIZE_END)
    bi = int(PHASE_ORGANIZE_END * sr)
    bdur = int(2.0 * sr)
    if bi + bdur <= n:
        env = np.exp(-np.linspace(0, 3, bdur))
        bell = (np.sin(2 * np.pi * 660 * np.arange(bdur) / sr) +
                0.6 * np.sin(2 * np.pi * 990 * np.arange(bdur) / sr) +
                0.4 * np.sin(2 * np.pi * 1320 * np.arange(bdur) / sr))
        track[bi:bi + bdur] += env * bell * 0.22

    # Crash on brand pillar arrival (at PHASE_REVEAL_END)
    ci = int(PHASE_REVEAL_END * sr)
    cdur = int(1.5 * sr)
    if ci + cdur <= n:
        env = np.exp(-np.linspace(0, 4, cdur))
        crash = np.random.normal(0, 1, cdur) * env * 0.30
        # Also a low boom
        boom = np.sin(2 * np.pi * 38 * np.arange(cdur) / sr) * env * 0.55
        track[ci:ci + cdur] += crash + boom

    # Master fade
    fade = int(0.6 * sr)
    envm = np.ones(n)
    envm[:fade] = np.linspace(0, 1, fade)
    envm[-fade:] = np.linspace(1, 0, fade)
    track = track * envm

    peak = float(np.max(np.abs(track))) or 1.0
    track = track / peak * 0.78
    pcm = (track * 32767).astype(np.int16)
    with wave.open(str(out_wav), "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(pcm.tobytes())

# ----- mux --------------------------------------------------------------

def mux(out_mp4: Path, with_audio: bool):
    cmd = ["ffmpeg", "-y", "-framerate", str(FPS),
           "-i", str(FRAMES / "f%06d.png")]
    if with_audio:
        cmd += ["-i", str(OUT / "_audio.wav")]
    cmd += ["-map", "0:v:0"]
    if with_audio:
        cmd += ["-map", "1:a:0"]
    cmd += ["-c:v:0", "libx264", "-pix_fmt:v:0", "yuv420p",
            "-profile:v:0", "high", "-level:v:0", "4.2",
            "-crf", "18", "-preset", "medium"]
    if with_audio:
        cmd += ["-c:a", "aac", "-b:a", "192k", "-ac", "2", "-shortest"]
    cmd += ["-movflags", "+faststart", str(out_mp4)]
    print(f"  muxing → {out_mp4.name}")
    subprocess.run(cmd, check=True, capture_output=True)

# ----- main -------------------------------------------------------------

def main():
    print(f"\nv18 COMPOUND · {FPS}fps · target {TOTAL_S:.1f}s · {TOTAL_F} frames")
    render_all_frames()
    audio = OUT / "_audio.wav"
    print("  synth audio...")
    synth_audio(audio)
    scored = OUT / f"brandmint-compound-{BPM}bpm.mp4"
    silent = OUT / f"brandmint-compound-{BPM}bpm-silent.mp4"
    mux(scored, with_audio=True)
    mux(silent, with_audio=False)
    print(f"\n  ✓ {scored.relative_to(HERE.parent.parent)}")
    print(f"  ✓ {silent.relative_to(HERE.parent.parent)}\n")

if __name__ == "__main__":
    main()
