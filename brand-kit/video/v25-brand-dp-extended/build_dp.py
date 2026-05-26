"""
Brand Mint Studios — Brand Story Ident (v25 / DP extended cut)

22.0s, 60fps, 1080x1920 vertical · slower, more deliberate pacing.

Changes from v24:
- Removed the vertical key-light glaze on the M disc
- Extended total length 15->22s; pre-reveal beats stretched the most
- Added micro-animations during pre-reveal: Brownian wobble on the seed,
  per-particle bob at lattice positions, curved (bezier-flavored) flow
  paths during coalesce

SHOT LIST:
  1.  0.0– 3.0s  THE VOID         seed + subtle Brownian wobble · push-in 2%
  2.  3.0– 5.5s  THE BREAK        diagonal LL->UR · 12 particles · trails
  3.  5.5– 9.5s  THE ARCHITECTURE 3D hex lattice · per-particle bob · pull-back
  4.  9.5–13.5s  THE COALESCE     particles -> M · curved flow paths · trails
  5. 13.5–16.5s  THE LANDING      M draw + disc fill (NO GLAZE) · push-in 5%
  6. 16.5–19.5s  THE NAME         mark up, wordmark settles
  7. 19.5–22.0s  THE SIGNATURE    tagline + signature · fade to ink
"""
from __future__ import annotations
import math, random, shutil, subprocess
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Deque, List, Tuple

import cairosvg

# ---------- Canvas / output ----------
W, H = 1080, 1920
FPS = 60
TOTAL_S = 22.0
TOTAL_F = int(round(TOTAL_S * FPS))
DT = 1.0 / FPS

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

# ---------- Output paths ----------
HERE = Path(__file__).resolve().parent
FRAMES_DIR = HERE / "frames"
OUT_DIR = HERE / "out"
OUT_MP4 = OUT_DIR / "brandmint-dp-extended-60fps.mp4"

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

# ---------- Composition constants (rule of thirds) ----------
THIRD_X_LEFT  = W / 3
THIRD_X_RIGHT = 2 * W / 3
THIRD_Y_TOP   = H / 3
THIRD_Y_BOT   = 2 * H / 3
CENTER_X = W / 2
CENTER_Y = H / 2

# Anchor for the mark across shots (slightly above geometric center for
# more weight in the bottom-thirds where the type sits).
MARK_CY = H / 2 - 60

# ---------- 3D projection ----------
# Particles live in a normalized space. We project z to: scale, alpha, glow.
def proj(z: float) -> Tuple[float, float, float]:
    # z in [-1.2, 0.6] roughly. Closer (positive z) = bigger, brighter.
    s = 1.0 + z * 0.55                       # 0.34 .. 1.33
    a = 0.30 + (z + 1.2) * 0.45 / 1.8        # ~0.3..0.75
    glow_r = max(0.0, (z + 1.2) * 4.0)       # 0..7
    return s, max(0.0, min(1.0, a)), glow_r

# ---------- Particle ----------
@dataclass
class P:
    x: float; y: float; z: float
    vx: float; vy: float; vz: float
    tx: float = 0.0; ty: float = 0.0
    seed: float = 0.0
    born_t: float = 0.0
    role: str = "core"          # "lead" for the seed particle, "stream" for shot 2
    trail: Deque[Tuple[float, float, float]] = field(default_factory=lambda: deque(maxlen=6))

N_LATTICE_COLS = 9
N_LATTICE_ROWS = 10
N_PARTICLES = N_LATTICE_COLS * N_LATTICE_ROWS   # 90

# Target layouts ---------------------------------------------------------------
def m_path_targets(n: int, cx: float, cy: float, scale: float) -> List[Tuple[float,float]]:
    vx = [9, 9, 16, 23, 23]
    vy = [22, 10, 16, 10, 22]
    segs = []; total = 0.0
    for i in range(len(vx)-1):
        dx, dy = vx[i+1]-vx[i], vy[i+1]-vy[i]
        L = math.hypot(dx, dy)
        segs.append((vx[i], vy[i], dx, dy, L))
        total += L
    out = []
    for i in range(n):
        u = i / max(1, n-1); d = u * total; acc = 0.0
        for sx, sy, dx, dy, L in segs:
            if d <= acc + L:
                k = (d - acc) / L
                out.append((sx + dx*k, sy + dy*k))
                break
            acc += L
        else:
            out.append((vx[-1], vy[-1]))
    return [(cx + (px-16)*(scale/32.0), cy + (py-16)*(scale/32.0)) for px,py in out]

def hex_lattice_targets(cols: int, rows: int, cx: float, cy: float,
                        spacing_x: float, spacing_y: float) -> List[Tuple[float,float,float]]:
    """Centered hex lattice with z-jitter for 3D depth."""
    out = []
    random.seed(42)
    for r in range(rows):
        for c in range(cols):
            offset_x = (spacing_x * 0.5) if (r % 2 == 1) else 0.0
            x = cx + (c - (cols - 1) / 2) * spacing_x + offset_x
            y = cy + (r - (rows - 1) / 2) * spacing_y
            z = random.uniform(-0.6, 0.4)
            out.append((x, y, z))
    return out

LATTICE = hex_lattice_targets(N_LATTICE_COLS, N_LATTICE_ROWS,
                              CENTER_X, MARK_CY,
                              spacing_x=88, spacing_y=92)
M_TARGETS = m_path_targets(N_PARTICLES, CENTER_X, MARK_CY, scale=560)

# Diagonal stream — 12 particles fly from lower-third left up to upper-third right.
DIAGONAL_START = (THIRD_X_LEFT, THIRD_Y_BOT)
DIAGONAL_END   = (THIRD_X_RIGHT + 60, THIRD_Y_TOP - 40)

# ---------- Particle init ----------
def make_particles() -> List[P]:
    random.seed(11)
    ps: List[P] = []
    # Particle 0 is the SEED at lower-third left intersection.
    seed_x, seed_y = THIRD_X_LEFT, THIRD_Y_BOT
    ps.append(P(x=seed_x, y=seed_y, z=0.3,
                vx=0, vy=0, vz=0,
                tx=seed_x, ty=seed_y,
                born_t=0.0, role="lead"))
    # Particles 1..12 are STREAM particles (visible in shot 2 along the diagonal)
    for i in range(1, 13):
        u = i / 12.0
        x = lerp(DIAGONAL_START[0], DIAGONAL_END[0], u)
        y = lerp(DIAGONAL_START[1], DIAGONAL_END[1], u)
        # They emerge as a slow wave during shot 2 (3.0-5.5s)
        born = 3.10 + u * 2.0
        ps.append(P(x=seed_x, y=seed_y, z=lerp(0.4, -0.2, u),
                    vx=0, vy=0, vz=0,
                    tx=x, ty=y,
                    born_t=born, role="stream", seed=u))
    # Particles 13..89 are the lattice/CORE particles
    for i in range(13, N_PARTICLES):
        lx, ly, lz = LATTICE[i]
        ang = random.uniform(0, math.tau)
        rad = random.uniform(40, 320)
        # Birth scattered slowly during shot 3 (5.5-8.5s)
        born = 5.55 + (i - 13) / (N_PARTICLES - 13) * 2.8
        ps.append(P(
            x=CENTER_X + math.cos(ang) * rad,
            y=MARK_CY + math.sin(ang) * rad * 0.7,
            z=random.uniform(-0.8, 0.5),
            vx=random.uniform(-0.4, 0.4),
            vy=random.uniform(-0.4, 0.4),
            vz=random.uniform(-0.02, 0.02),
            tx=lx, ty=ly,
            born_t=born, role="core", seed=random.random(),
        ))
    return ps

PARTICLES = make_particles()

# ---------- Particle update ----------
def step(t: float):
    """Per-shot behaviors with subtle pre-reveal micro-animations."""
    cx, cy = CENTER_X, MARK_CY
    for i, p in enumerate(PARTICLES):
        if t < p.born_t:
            continue
        # Record trail every 3 frames during high-motion shots (extended window)
        if t < 13.5 and (int(t * FPS) % 3 == 0):
            p.trail.append((p.x, p.y, p.z))

        if p.role == "lead":
            # SHOT 1 (0.0-3.0s): Brownian wobble — tiny stochastic drift
            if t < 3.0:
                # Use deterministic noise so it's smooth, not jittery
                wob_x = math.sin(t * 1.7 + p.seed * 6) * 1.4 + math.cos(t * 0.9) * 0.7
                wob_y = math.cos(t * 1.3 + p.seed * 4) * 1.4 + math.sin(t * 0.7) * 0.7
                p.x = THIRD_X_LEFT + wob_x
                p.y = THIRD_Y_BOT + wob_y
            else:
                # Spring toward lattice slot, then M target
                tx, ty = (LATTICE[0][0], LATTICE[0][1]) if t < 9.5 else M_TARGETS[0]
                k = 0.055; damp = 0.86
                p.vx = (p.vx + (tx - p.x) * k) * damp
                p.vy = (p.vy + (ty - p.y) * k) * damp
                p.x += p.vx; p.y += p.vy
            continue

        if p.role == "stream":
            local = t - p.born_t
            tx, ty = p.tx, p.ty
            if t < 5.5:
                # SHOT 2: deliberate diagonal pop
                k = 0.10 * smoothstep(0.0, 0.7, local)
                p.vx = (p.vx + (tx - p.x) * k) * 0.83
                p.vy = (p.vy + (ty - p.y) * k) * 0.83
                p.x += p.vx; p.y += p.vy
            elif t < 9.5:
                # Migrate to lattice slot slowly
                lx, ly, lz = LATTICE[i] if i < len(LATTICE) else (cx, cy, 0)
                p.tx, p.ty = lx, ly
                k = 0.055; damp = 0.86
                p.vx = (p.vx + (lx - p.x) * k) * damp
                p.vy = (p.vy + (ly - p.y) * k) * damp
                p.x += p.vx; p.y += p.vy
            else:
                # Curved flow to M target
                p.tx, p.ty = M_TARGETS[i]
                k = 0.075; damp = 0.82
                # Add a perpendicular bias for curved (non-linear) path
                dx, dy = p.tx - p.x, p.ty - p.y
                # Perpendicular vector (rotate 90°), strength fades as we approach
                dist = math.hypot(dx, dy) + 1e-6
                perp_strength = min(0.5, dist / 200.0) * 0.012
                p.vx = (p.vx + dx * k - dy * perp_strength) * damp
                p.vy = (p.vy + dy * k + dx * perp_strength) * damp
                p.x += p.vx; p.y += p.vy
            continue

        # ROLE: "core"
        local = t - p.born_t
        if t < 5.5:
            continue
        if t < 9.5:
            # SHOT 3: spring to lattice slot, then bob in place
            lx, ly, lz = LATTICE[i] if i < len(LATTICE) else (cx, cy, 0)
            # Slow Y-axis rotation via X-shift based on z
            rot = math.sin(t * 0.5) * 9.0
            # Per-particle micro-bob — phase shifted by seed for organic feel
            bob_x = math.sin(t * 0.9 + p.seed * 7.3) * 2.2
            bob_y = math.cos(t * 0.8 + p.seed * 5.1) * 2.2
            target_x = lx + rot * lz + bob_x
            target_y = ly + bob_y
            k = 0.05 * smoothstep(0.0, 0.8, local); damp = 0.88
            p.vx = (p.vx + (target_x - p.x) * k) * damp
            p.vy = (p.vy + (target_y - p.y) * k) * damp
            p.vz = (p.vz + (lz - p.z) * 0.04) * 0.95
            p.x += p.vx; p.y += p.vy; p.z += p.vz
        elif t < 13.5:
            # SHOT 4: curved flow into M target (not straight lines)
            p.tx, p.ty = M_TARGETS[i]
            k = 0.065 * smoothstep(9.5, 11.0, t); damp = 0.84
            dx, dy = p.tx - p.x, p.ty - p.y
            dist = math.hypot(dx, dy) + 1e-6
            # Perpendicular bias for curved approach
            perp_strength = min(0.5, dist / 300.0) * 0.010
            # Direction of curve depends on seed (some particles arc left, some right)
            sign = 1.0 if (i % 2 == 0) else -1.0
            p.vx = (p.vx + dx * k - dy * perp_strength * sign) * damp
            p.vy = (p.vy + dy * k + dx * perp_strength * sign) * damp
            p.vz = (p.vz + (-p.z * 0.08)) * 0.93
            p.x += p.vx; p.y += p.vy; p.z += p.vz
        else:
            # SHOTS 5+: lock onto M, slowly fade
            p.x = lerp(p.x, p.tx, 0.3)
            p.y = lerp(p.y, p.ty, 0.3)
            p.vx *= 0.4; p.vy *= 0.4; p.vz *= 0.4

# ---------- Particle render (with styling: highlight + glow + trail) ----------
def render_particles(t: float, alpha_mul: float = 1.0) -> str:
    parts = []
    # Render trails first (under particles) — extended motion window
    if 2.8 < t < 13.5:
        for p in PARTICLES:
            if t < p.born_t: continue
            for j, (tx, ty, tz) in enumerate(p.trail):
                ghost_a = (j + 1) / max(1, len(p.trail)) * 0.18 * alpha_mul
                s, _, _ = proj(tz)
                r = 3.5 * s
                parts.append(
                    f'<circle cx="{tx:.1f}" cy="{ty:.1f}" r="{r:.1f}" '
                    f'fill="{MINT_3}" opacity="{ghost_a:.3f}"/>'
                )
    # Render particles
    for i, p in enumerate(PARTICLES):
        if t < p.born_t - 0.02: continue
        # Birth bloom
        age = t - p.born_t
        bloom = 1.0
        if 0 <= age < 0.45:
            bloom = 1.0 + (1 - clamp01(age / 0.45)) * 1.6
        s, a, glow_r = proj(p.z)
        r = 4.6 * s * bloom
        # Color by depth: close = lighter mint, far = deeper mint
        if p.z > 0.2:
            fill = MINT_2; hl = MINT_1
        elif p.z > -0.2:
            fill = MINT_3; hl = MINT_2
        else:
            fill = MINT_4; hl = MINT_3
        a *= alpha_mul
        if a <= 0.02: continue
        # The seed gets extra slow-breathing glow before shot 2
        seed_glow_extra = 0.0
        if p.role == "lead" and t < 3.0:
            pulse = 1.0 + 0.15 * math.sin(t * math.tau * 0.7)   # slower breath
            seed_glow_extra = pulse * 16.0
            r *= pulse
        # Glow halo (sized by depth)
        total_glow = glow_r + seed_glow_extra
        if total_glow > 0.5:
            parts.append(
                f'<circle cx="{p.x:.1f}" cy="{p.y:.1f}" r="{r + total_glow:.1f}" '
                f'fill="url(#particleGlow)" opacity="{a * 0.55:.3f}"/>'
            )
        # Body
        parts.append(
            f'<circle cx="{p.x:.1f}" cy="{p.y:.1f}" r="{r:.1f}" '
            f'fill="{fill}" opacity="{a:.3f}"/>'
        )
        # Specular highlight (offset toward key light at upper-right)
        if p.z > -0.3 and r > 2.5:
            hx = p.x + r * 0.35
            hy = p.y - r * 0.35
            hr = r * 0.30
            parts.append(
                f'<circle cx="{hx:.1f}" cy="{hy:.1f}" r="{hr:.1f}" '
                f'fill="{hl}" opacity="{min(1.0, a * 1.4):.3f}"/>'
            )
    return "".join(parts)

# ---------- The M mark (outline → full solid) ----------
def render_mark(cx: float, cy: float, scale: float, draw_t: float,
                disc_t: float, alpha: float, glow: float = 0.0) -> str:
    """
    Clean Brand Mint mark — disc + ink M. No glaze, no sweep highlight.
    Only the mint gradient (bmDisc) and an optional outer glow halo.
    """
    s = scale
    DASH_MAX = 80.0
    dash_vis = draw_t * DASH_MAX
    dash_hid = DASH_MAX - dash_vis
    disc_a = ease_out_cubic(disc_t) * alpha
    stroke_a = ease_out_cubic(min(1.0, draw_t * 1.1)) * alpha
    # Stroke color crosses from mint to ink as the disc fills in
    stroke_col = MINT_3 if disc_t < 0.05 else INK if disc_t > 0.6 else MINT_4
    stroke_w = s * 0.040 if disc_t < 0.5 else s * 0.069
    glow_block = ""
    if glow > 0.001:
        glow_block = (
            f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{s*0.66:.1f}" '
            f'fill="url(#markGlow)" opacity="{glow:.3f}"/>'
        )
    return f"""
    <g opacity="{alpha:.3f}">
      {glow_block}
      <circle cx="{cx:.1f}" cy="{cy:.1f}" r="{s*0.5:.1f}"
              fill="url(#bmDisc)" opacity="{disc_a:.3f}"/>
      <g opacity="{stroke_a:.3f}">
        <path d="M{cx-s*0.219:.2f} {cy+s*0.187:.2f}
                 V{cy-s*0.187:.2f}
                 l{s*0.219:.2f} {s*0.187:.2f}
                 l{s*0.219:.2f} {-s*0.187:.2f}
                 v{s*0.375:.2f}"
              stroke="{stroke_col}" stroke-width="{stroke_w:.2f}"
              stroke-linecap="round" stroke-linejoin="round" fill="none"
              stroke-dasharray="{dash_vis:.2f},{dash_hid:.2f}"/>
      </g>
    </g>
    """

# ---------- Text: one line per shot, by rule of thirds ----------
def render_shot_text(t: float) -> str:
    """
    Single-text-per-shot rule. Each line uses rule-of-thirds positioning.
    Shot 3:    01 — PRINCIPLE → SYSTEM    (lower third, mono kicker)
    Shot 4:    02 — A SHAPE YOU REMEMBER  (lower third, mono kicker)
    Shot 5:    (no text — let the mark breathe)
    Shot 6:    BRAND MINT  +  we mint brands that compound.  (composed)
    Shot 7:    STUDIOS · HYDERABAD · brandmintstudios.in     (mono)
    """
    parts = []
    # ── Shot 3 kicker: 6.0 - 9.5
    if 5.8 < t < 9.7:
        a = smoothstep(6.0, 6.8, t) * (1 - smoothstep(9.0, 9.6, t))
        if a > 0.01:
            parts.append(
                f'<text x="{CENTER_X}" y="{THIRD_Y_BOT + 220:.1f}" '
                f'font-family="{FONT_MONO}" font-weight="600" font-size="30" '
                f'letter-spacing="0.32em" fill="{PAPER}" text-anchor="middle" '
                f'opacity="{a:.3f}">01 &#8212; PRINCIPLE &#8594; SYSTEM</text>'
            )
    # ── Shot 4 kicker: 9.8 - 13.3
    if 9.6 < t < 13.4:
        a = smoothstep(9.8, 10.6, t) * (1 - smoothstep(12.7, 13.3, t))
        if a > 0.01:
            parts.append(
                f'<text x="{CENTER_X}" y="{THIRD_Y_BOT + 220:.1f}" '
                f'font-family="{FONT_MONO}" font-weight="600" font-size="30" '
                f'letter-spacing="0.32em" fill="{PAPER}" text-anchor="middle" '
                f'opacity="{a:.3f}">02 &#8212; A SHAPE YOU REMEMBER</text>'
            )
    # ── Shot 6: BRAND MINT wordmark (16.5 - 18.5)
    if t > 16.5:
        local = localT(t, 16.5, 18.5)
        ease = ease_out_cubic(local)
        ls = lerp(0.45, 0.06, ease)
        yoff = lerp(28, 0, ease)
        y = THIRD_Y_BOT - 40 + yoff
        a = ease
        if a > 0.01:
            parts.append(
                f'<text x="{CENTER_X}" y="{y:.1f}" '
                f'font-family="{FONT_DISPLAY}" font-weight="800" font-size="80" '
                f'letter-spacing="{ls:.3f}em" fill="{PAPER}" text-anchor="middle" '
                f'opacity="{a:.3f}">BRAND MINT</text>'
            )
    # ── Shot 6 tagline (18.0 - 19.8)
    if t > 18.0:
        local = localT(t, 18.0, 19.8)
        sub_k = smoothstep(0.0, 0.35, local)
        sub_c = smoothstep(0.3, 0.85, local)
        base_y = THIRD_Y_BOT + 60
        if sub_k > 0.01:
            parts.append(
                f'<text x="{CENTER_X}" y="{base_y:.1f}" '
                f'font-family="{FONT_MONO}" font-weight="600" font-size="22" '
                f'letter-spacing="0.22em" fill="{PAPER}" text-anchor="middle" '
                f'opacity="{sub_k:.3f}">WE MINT BRANDS &#183; THAT</text>'
            )
        if sub_c > 0.01:
            sp = 1.0 + 0.05 * math.sin(min(1.0, (local - 0.4) * 6) * math.pi) if local > 0.4 else 1.0
            parts.append(
                f'<g transform="translate({CENTER_X} {base_y + 80:.1f}) scale({sp:.3f})" opacity="{sub_c:.3f}">'
                f'<text x="0" y="0" font-family="{FONT_DISPLAY}" font-weight="800" '
                f'font-size="90" letter-spacing="0.02em" fill="url(#mintTextGrad)" '
                f'text-anchor="middle" font-style="italic">compound.</text>'
                f'</g>'
            )
    # ── Shot 7 signature (19.8 - 21.0)
    if t > 19.8:
        local = localT(t, 19.8, 21.0)
        a = ease_out_cubic(local)
        blink = 1.0 if (int(t * 4) % 2 == 0) else 0.25
        y = H * 0.94
        if a > 0.01:
            parts.append(
                f'<text x="{CENTER_X}" y="{y:.1f}" font-family="{FONT_MONO}" '
                f'font-weight="500" font-size="22" letter-spacing="0.32em" '
                f'fill="{GHOST}" text-anchor="middle" opacity="{a:.3f}">'
                f'STUDIOS &#8212; HYDERABAD &#183; brandmintstudios.in'
                f'<tspan dx="6" opacity="{blink:.2f}">|</tspan></text>'
            )
    return "".join(parts)

# ---------- Camera (per-shot moves) ----------
def camera_state(t: float) -> Tuple[float, float, float]:
    """Returns (scale, tx, ty). Same arc as v24, stretched for 22s pacing."""
    if t < 3.0:
        # SHOT 1: very slow push-in 2%
        p = ease_in_out_cubic(t / 3.0)
        return (1.0 + p * 0.02, 0, 0)
    if t < 5.5:
        # SHOT 2: gentle whip
        p = localT(t, 3.0, 5.5)
        spike = math.sin(p * math.pi) * 0.022
        return (1.02 + spike, 0, 0)
    if t < 9.5:
        # SHOT 3: pull-back -4%
        p = ease_in_out_cubic(localT(t, 5.5, 9.5))
        return (lerp(1.0, 0.96, p), 0, 0)
    if t < 13.5:
        # SHOT 4: drift 0.96 -> 0.98
        p = ease_out_cubic(localT(t, 9.5, 13.5))
        return (lerp(0.96, 0.98, p), 0, 0)
    if t < 16.5:
        # SHOT 5: push-in +5%
        p = ease_in_out_cubic(localT(t, 13.5, 16.5))
        return (lerp(0.98, 1.05, p), 0, 0)
    if t < 19.5:
        # SHOT 6: ease back to 1.0
        p = ease_out_cubic(localT(t, 16.5, 19.5))
        return (lerp(1.05, 1.0, p), 0, 0)
    return (1.0, 0, 0)

# ---------- Vignette (breathes per beat) ----------
def vignette_strength(t: float) -> float:
    if t < 3.0:  return 0.7      # tight on the void
    if t < 5.5:  return 0.50     # opens slightly for the break
    if t < 9.5:  return 0.40     # widest on architecture
    if t < 13.5: return 0.48     # narrowing as coalesce
    if t < 16.5: return 0.65     # tighter on landing
    if t < 19.5: return 0.55     # neutral on name
    return 0.72                   # tightens for the sign-off

# ---------- Frame composer ----------
def svg_for_frame(f: int) -> str:
    t = f / FPS
    step(t)

    # Camera
    cs, ctx, cty = camera_state(t)
    cam_tx = (W / 2) * (1 - cs) + ctx
    cam_ty = MARK_CY * (1 - cs) + cty

    # Mark animation timing — stretched for the 22s cut
    mark_draw = ease_out_cubic(localT(t, 12.5, 15.0))   # stroke draws on slow
    mark_disc = ease_out_cubic(localT(t, 14.5, 16.5))   # disc fills slow
    mark_a    = ease_out_cubic(localT(t, 12.0, 13.5))   # M materializes
    # Soft glow pulse on landing (no glaze sweep)
    glow = 0.0
    if t > 15.0:
        p = clamp01((t - 15.0) / 1.8)
        glow = (1 - (1 - p) ** 3) * (1 - p) * 0.85

    # Mark position — center for shots 4/5, rises into upper-mid for shot 6
    rise = lerp(0, -160, ease_out_cubic(localT(t, 16.5, 18.5)))
    mark_cy = MARK_CY + rise
    mark_scale = lerp(560, 320, ease_out_cubic(localT(t, 16.5, 18.5)))

    # Particle alpha — fade out as mark dominates
    p_alpha = 1.0 - smoothstep(12.5, 14.5, t)

    # Final fade
    fade_t = localT(t, 21.4, 22.0)

    vig = vignette_strength(t)

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
  <defs>
    <linearGradient id="bmDisc" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"  stop-color="{MINT_2}"/>
      <stop offset="100%" stop-color="{MINT_3}"/>
    </linearGradient>
    <radialGradient id="markGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%"  stop-color="{MINT_2}" stop-opacity="0.85"/>
      <stop offset="55%" stop-color="{MINT_3}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="{MINT_3}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="particleGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%"  stop-color="{MINT_2}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="{MINT_3}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="mintTextGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"  stop-color="{MINT_2}"/>
      <stop offset="60%" stop-color="{MINT_3}"/>
      <stop offset="100%" stop-color="{MINT_4}"/>
    </linearGradient>
    <radialGradient id="vig" cx="0.5" cy="0.5" r="0.9">
      <stop offset="0%"  stop-color="{INK}" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="{vig:.3f}"/>
    </radialGradient>
  </defs>

  <rect width="{W}" height="{H}" fill="{INK}"/>

  <!-- Camera-scaled world -->
  <g transform="translate({cam_tx:.1f},{cam_ty:.1f}) scale({cs:.4f})">
    {render_particles(t, alpha_mul=p_alpha)}
    {render_mark(CENTER_X, mark_cy, mark_scale, mark_draw, mark_disc,
                 mark_a, glow=glow)}
  </g>

  <!-- Vignette stays at 1:1 -->
  <rect width="{W}" height="{H}" fill="url(#vig)"/>

  <!-- UI text — crisp, never camera-scaled -->
  {render_shot_text(t)}

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
    print(f"v25 DP extended cut · {FPS}fps · {TOTAL_S}s")
    render_all_frames()
    mux()
    size_mb = OUT_MP4.stat().st_size / 1024 / 1024
    print(f"  done → {OUT_MP4} ({size_mb:.2f}MB)")

if __name__ == "__main__":
    main()
