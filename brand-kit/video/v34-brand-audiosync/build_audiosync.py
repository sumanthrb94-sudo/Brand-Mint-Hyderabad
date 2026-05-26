"""
Brand Mint Studios — Brand Story Ident (v34 / audio synced)

22.0s, 60fps, 1080x1920 vertical · production-agency grade.

Synced to "Epic Cinematic" by NastelBom (Pixabay). Major audio hits
were detected at t = 1.9, 5.75, 9.6, 13.45, 15.4, 18.6 (median IOI
~3.85s). The visual phase boundaries snap to these onsets:

  0.00 - 1.90s   THE VOID         4 dots scatter -> LOCK at edges on HIT 1
  1.90 - 5.75s   ARCHITECTURE     lattice spawns through to HIT 2
  5.75 - 9.60s   ARCH (breath)    lattice peak, rotates, bobs to HIT 3
  9.60 -13.45s   THE COALESCE     particles flow to M, locks ON HIT 4
 13.45 -15.40s   M LANDS          god-ray peak ON HIT 4
 15.40 -18.60s   THE NAME         BRAND MINT wordmark settles ON HIT 5
 18.60 -20.50s   compound.        mint-gradient tagline lands ON HIT 6
 20.50 -22.00s   SIGNATURE        URL + fade to ink

After rendering, ffmpeg mux includes the audio (trimmed to 22s, with
a 0.6s tail fade-out to match the visual fade).
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
OUT_MP4 = OUT_DIR / "brandmint-audiosync-60fps.mp4"
AUDIO_SRC = HERE / "epic-cinematic.mp3"

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

# Expanded for symmetric canvas coverage — no empty corners.
# 18 x 22 grid @ 56x56 spacing -> spans ~1008 x 1232 px centered on mark.
N_LATTICE_COLS = 18
N_LATTICE_ROWS = 22
N_PARTICLES = N_LATTICE_COLS * N_LATTICE_ROWS   # 396
N_ORBITERS   = 3                                # plus the seed = 4 in shot 1
N_STREAM     = 0                                # diagonal stream removed per user direction
N_LEAD       = 1 + N_ORBITERS                   # = 4

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
                              spacing_x=56, spacing_y=56)

# Clean symmetric M target set — 200 points evenly distributed along the
# canonical M polyline. No perpendicular jitter so the M reads as a crisp
# symmetric chain of pyramids.
# 4 lead dots STAY at the edges throughout — they don't go to the M.
# Only the 14 stream + 378 core particles = 392 converge to the M.
N_M_PARTICLES = N_PARTICLES - N_LEAD   # 392
M_TARGETS = m_path_targets(N_M_PARTICLES, CENTER_X, MARK_CY, scale=560)

# Diagonal stream — 12 particles fly from lower-third left up to upper-third right.
DIAGONAL_START = (THIRD_X_LEFT, THIRD_Y_BOT)
DIAGONAL_END   = (THIRD_X_RIGHT + 60, THIRD_Y_TOP - 40)

# ---------- Particle init ----------
def make_particles() -> List[P]:
    random.seed(11)
    ps: List[P] = []
    # All 4 lead dots start at the canvas mark center and slowly scatter
    # to four edges across shot 1.
    start_x, start_y = CENTER_X, MARK_CY

    # ── LEAD pool: 4 dots total. Lead = dot 0 (-> top edge),
    #   "orbiter" dots 1..3 -> right/bottom/left edges respectively.
    #   We keep the "lead"/"orbiter" roles for backward compatibility
    #   with the step() branches; the seed field carries the edge index.
    ps.append(P(x=start_x, y=start_y, z=0.20,
                vx=0, vy=0, vz=0, tx=start_x, ty=start_y,
                born_t=0.0, role="lead", seed=0.0))
    for k in range(N_ORBITERS):   # k = 0,1,2 -> seed = 1,2,3 (edge index)
        ps.append(P(
            x=start_x, y=start_y,
            z=0.15,
            vx=0, vy=0, vz=0,
            tx=start_x, ty=start_y,
            born_t=0.18 + k * 0.20,
            role="orbiter",
            seed=(k + 1) / 4.0,   # 0.25 / 0.50 / 0.75 -> edge index = round(seed*4) = 1/2/3
        ))

    # ── STREAM + CORE: unified M-bound pool ──
    # 14 stream particles + 378 core particles = 392 particles all assigned
    # to LATTICE slots [0..391] AND proximity-matched to M_TARGETS [0..391].
    # Stream particles have an additional shot-2 diagonal target before
    # they migrate to the lattice; core particles go straight to lattice.
    n_m = N_PARTICLES - N_LEAD                    # 392
    n_core = n_m - N_STREAM                        # 378
    lattice_subset = LATTICE[:n_m]

    # Greedy nearest-neighbor: pair each lattice slot with its closest
    # unclaimed M target. Result: slot_to_m[slot_i] = (mx, my).
    m_claimed = [False] * len(M_TARGETS)
    slot_to_m = {}
    for slot_i, (lx, ly, _) in enumerate(lattice_subset):
        best_d = float("inf"); best_m = 0
        for m_i, (mx, my) in enumerate(M_TARGETS):
            if m_claimed[m_i]:
                continue
            d = (mx - lx) ** 2 + (my - ly) ** 2
            if d < best_d:
                best_d = d; best_m = m_i
        m_claimed[best_m] = True
        slot_to_m[slot_i] = M_TARGETS[best_m]

    # Birth ordering for lattice arrival (closer-to-center first).
    lattice_dists = [
        (i, math.hypot(lx - CENTER_X, ly - MARK_CY))
        for i, (lx, ly, _) in enumerate(lattice_subset)
    ]
    lattice_dists.sort(key=lambda x: x[1])
    birth_for_slot = {}
    for rank, (slot_i, _) in enumerate(lattice_dists):
        u = rank / max(1, n_m - 1)
        birth_for_slot[slot_i] = 1.95 + u * 3.80   # spawn 1.95 - 5.75 to land lattice on HIT 2

    # STREAM particles use lattice slots 0..N_STREAM-1, plus a diagonal
    # waypoint stored in p.seed extras (we encode diagonal_x/y on the
    # particle via the existing tx/ty field temporarily — overwritten
    # at the lattice handoff in step()).
    for k in range(N_STREAM):
        slot_i = k
        u = (k + 1) / N_STREAM
        diag_x = lerp(DIAGONAL_START[0], DIAGONAL_END[0], u)
        diag_y = lerp(DIAGONAL_START[1], DIAGONAL_END[1], u)
        born = 3.10 + u * 2.0
        mx, my = slot_to_m[slot_i]
        ps.append(P(
            x=start_x, y=start_y, z=lerp(0.4, -0.2, u),
            vx=0, vy=0, vz=0,
            tx=mx, ty=my,             # final M target stored
            born_t=born, role="stream", seed=u,
        ))

    # CORE particles use lattice slots N_STREAM..n_m-1
    for k in range(n_core):
        slot_i = N_STREAM + k
        lx, ly, lz = lattice_subset[slot_i]
        ang = random.uniform(0, math.tau)
        rad = random.uniform(60, 380)
        born = birth_for_slot[slot_i]
        mx, my = slot_to_m[slot_i]
        ps.append(P(
            x=CENTER_X + math.cos(ang) * rad,
            y=MARK_CY + math.sin(ang) * rad * 0.7,
            z=random.uniform(-0.9, 0.55),
            vx=random.uniform(-0.4, 0.4),
            vy=random.uniform(-0.4, 0.4),
            vz=random.uniform(-0.02, 0.02),
            tx=mx, ty=my,
            born_t=born, role="core", seed=random.random(),
        ))
    return ps

PARTICLES = make_particles()

# ---------- Particle update ----------
# ---------- Shot 1: four-edge scatter targets ----------
# The 4 lead dots all start at the canvas mark center and slowly drift
# outward to four cardinal edges of the screen, forming a plus-pattern.
# Targets are inset slightly from the canvas boundary so they're not
# clipped by the rounded-rect safe area.
EDGE_MARGIN_X = 110
EDGE_MARGIN_Y = 280

EDGE_TARGETS = [
    (CENTER_X,             EDGE_MARGIN_Y),                # top
    (W - EDGE_MARGIN_X,    MARK_CY),                      # right
    (CENTER_X,             H - EDGE_MARGIN_Y),            # bottom
    (EDGE_MARGIN_X,        MARK_CY),                      # left
]

def edge_target_for(particle_index_in_lead: int) -> Tuple[float, float]:
    """Returns the (x, y) edge target for one of the 4 lead dots."""
    return EDGE_TARGETS[particle_index_in_lead % 4]

def step(t: float):
    """Per-shot behaviors with subtle pre-reveal micro-animations."""
    cx, cy = CENTER_X, MARK_CY
    for i, p in enumerate(PARTICLES):
        if t < p.born_t:
            continue
        # Record trail every 3 frames during high-motion shots (extended window)
        if t < 13.5 and (int(t * FPS) % 3 == 0):
            p.trail.append((p.x, p.y, p.z))

        # Lead + orbiter dots: scatter to their edge in shot 1, then
        # STAY there forever as composition anchors. Subtle ongoing
        # wobble keeps them feeling alive without drifting away.
        if p.role in ("lead", "orbiter"):
            edge_i = int(round(p.seed * 4)) % 4
            ex, ey = EDGE_TARGETS[edge_i]
            if t < 1.9:
                age = t - p.born_t
                # Scatter faster (1.5s) to land at edges ON HIT 1 (t=1.9s)
                appear = ease_out_cubic(clamp01(age / 1.5))
                wob_x = math.sin(t * 1.4 + edge_i * 1.7) * 1.3
                wob_y = math.cos(t * 1.1 + edge_i * 2.3) * 1.3
                p.x = lerp(CENTER_X, ex, appear) + wob_x
                p.y = lerp(MARK_CY, ey, appear) + wob_y
            else:
                # Anchored at edge — gentle breathing wobble only.
                wob_x = math.sin(t * 0.9 + edge_i * 1.7) * 1.6
                wob_y = math.cos(t * 0.8 + edge_i * 2.3) * 1.6
                p.x = ex + wob_x
                p.y = ey + wob_y
            continue

        if p.role == "stream":
            # Stream's permanent M target is in p.tx, p.ty (set at init).
            # Stream's lattice slot = stream_index = i - N_LEAD.
            stream_i = i - N_LEAD
            slot_i = stream_i   # stream slots are 0..N_STREAM-1 of lattice
            m_target_x, m_target_y = p.tx, p.ty
            local = t - p.born_t
            if t < 5.5:
                # Shot 2: travel to seed-computed diagonal waypoint
                diag_x = lerp(DIAGONAL_START[0], DIAGONAL_END[0], p.seed)
                diag_y = lerp(DIAGONAL_START[1], DIAGONAL_END[1], p.seed)
                k = 0.085 * smoothstep(0.0, 0.7, local)
                p.vx = (p.vx + (diag_x - p.x) * k) * 0.84
                p.vy = (p.vy + (diag_y - p.y) * k) * 0.84
                p.x += p.vx; p.y += p.vy
            elif t < 9.5:
                # Migrate to assigned lattice slot
                lx, ly, _ = LATTICE[slot_i] if 0 <= slot_i < len(LATTICE) else (cx, cy, 0)
                k = 0.055; damp = 0.86
                p.vx = (p.vx + (lx - p.x) * k) * damp
                p.vy = (p.vy + (ly - p.y) * k) * damp
                p.x += p.vx; p.y += p.vy
            elif t < 12.0:
                # Smooth flow to M target (no perpendicular oscillation)
                k = 0.075 * smoothstep(9.5, 10.5, t); damp = 0.85
                dx, dy = m_target_x - p.x, m_target_y - p.y
                p.vx = (p.vx + dx * k) * damp
                p.vy = (p.vy + dy * k) * damp
                p.vz = (p.vz + (-p.z * 0.18)) * 0.88
                p.x += p.vx; p.y += p.vy; p.z += p.vz
            else:
                # Lock onto M target, z=0 for uniform size
                p.x = lerp(p.x, m_target_x, 0.45)
                p.y = lerp(p.y, m_target_y, 0.45)
                p.z = lerp(p.z, 0.0, 0.30)
                p.vx *= 0.3; p.vy *= 0.3; p.vz *= 0.3
            continue

        # ROLE: "core"
        # Core particles use lattice slots N_STREAM..n_m-1.
        # Global index i (in 18..395 for 396 particles) maps to:
        #   stream_or_core_index = i - N_LEAD     (in 0..391)
        #   slot_i = stream_or_core_index         (same — direct map)
        slot_i = i - N_LEAD
        local = t - p.born_t
        if t < 1.9:
            continue
        if t < 9.6:
            # ARCHITECTURE (1.9-9.6): spring to lattice slot, bob.
            # Spans through HIT 2 (5.75s) where the lattice fully populates,
            # and continues breathing through HIT 3 (9.6s) when COALESCE starts.
            lx, ly, lz = LATTICE[slot_i] if 0 <= slot_i < len(LATTICE) else (cx, cy, 0)
            rot = math.sin(t * 0.5) * 9.0
            bob_x = math.sin(t * 0.9 + p.seed * 7.3) * 2.2
            bob_y = math.cos(t * 0.8 + p.seed * 5.1) * 2.2
            target_x = lx + rot * lz + bob_x
            target_y = ly + bob_y
            k = 0.05 * smoothstep(0.0, 0.8, local); damp = 0.88
            p.vx = (p.vx + (target_x - p.x) * k) * damp
            p.vy = (p.vy + (target_y - p.y) * k) * damp
            p.vz = (p.vz + (lz - p.z) * 0.04) * 0.95
            p.x += p.vx; p.y += p.vy; p.z += p.vz
        elif t < 13.45:
            # COALESCE (9.6-13.45): smooth flow into M target.
            # Starts ON HIT 3, locks ON HIT 4 (the cinematic climax).
            k = 0.085 * smoothstep(9.6, 10.6, t); damp = 0.85
            dx, dy = p.tx - p.x, p.ty - p.y
            p.vx = (p.vx + dx * k) * damp
            p.vy = (p.vy + dy * k) * damp
            p.vz = (p.vz + (-p.z * 0.20)) * 0.88
            p.x += p.vx; p.y += p.vy; p.z += p.vz
        else:
            # LOCK (t >= 13.45): hard settle on M, z=0
            p.x = lerp(p.x, p.tx, 0.50)
            p.y = lerp(p.y, p.ty, 0.50)
            p.z = lerp(p.z, 0.0, 0.30)
            p.vx *= 0.3; p.vy *= 0.3; p.vz *= 0.3

# ---------- Particle render (with styling: highlight + glow + trail) ----------
def render_particles(t: float, alpha_mul: float = 1.0) -> str:
    parts = []
    # Trails removed in v27 — production-agency cleanliness over motion blur.
    # Render particles
    for i, p in enumerate(PARTICLES):
        if t < p.born_t - 0.02: continue
        # Birth bloom + Pixar-style squash-and-stretch
        age = t - p.born_t
        bloom = 1.0
        stretch_y = 1.0   # vertical squash factor
        if 0 <= age < 0.45:
            bloom = 1.0 + (1 - clamp01(age / 0.45)) * 1.6
            # Y-stretch peaks at 1.35 just after birth, settles to 1.0
            stretch_y = 1.0 + (1 - clamp01(age / 0.30)) * 0.35
        s, a, glow_r = proj(p.z)
        # Dot radius — bumped to 8.5 so the locked M reads as a solid
        # bold chain rather than fine stippling.
        r = 8.5 * s * bloom
        # Color by depth: close = lighter mint body + bright highlight,
        #                 far  = deeper mint body + softer highlight
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
        if p.role == "lead" and t < 1.9:
            pulse = 1.0 + 0.15 * math.sin(t * math.tau * 0.7)
            seed_glow_extra = pulse * 16.0
            r *= pulse
        # Outer glow halo
        total_glow = glow_r + seed_glow_extra
        if total_glow > 0.5:
            parts.append(
                f'<circle cx="{p.x:.1f}" cy="{p.y:.1f}" r="{r + total_glow:.1f}" '
                f'fill="url(#particleGlow)" opacity="{a * 0.55:.3f}"/>'
            )
        # Body — ellipse during squash-and-stretch, circle once settled
        if stretch_y > 1.02:
            parts.append(
                f'<ellipse cx="{p.x:.1f}" cy="{p.y:.1f}" '
                f'rx="{r:.1f}" ry="{r * stretch_y:.1f}" '
                f'fill="{fill}" opacity="{a:.3f}"/>'
            )
        else:
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
    # Kicker chyrons during shots 3 & 4 removed per direction —
    # only brand-reveal text remains (wordmark / tagline / signature).
    # ── BRAND MINT wordmark — types in, locks ON HIT 5 (15.4s)
    if t > 14.0:
        local = localT(t, 14.0, 15.4)
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
    # ── Tagline kicker — fades in just after HIT 5
    base_y = THIRD_Y_BOT + 60
    if t > 15.4:
        sub_k = smoothstep(15.4, 16.4, t)
        if sub_k > 0.01:
            parts.append(
                f'<text x="{CENTER_X}" y="{base_y:.1f}" '
                f'font-family="{FONT_MONO}" font-weight="600" font-size="22" '
                f'letter-spacing="0.22em" fill="{PAPER}" text-anchor="middle" '
                f'opacity="{sub_k:.3f}">WE MINT BRANDS &#183; THAT</text>'
            )
    # ── compound. — pulses-lands precisely ON HIT 6 (18.6s)
    if t > 17.4:
        sub_c = smoothstep(17.4, 18.6, t)
        if sub_c > 0.01:
            # Pulse peaks exactly at t=18.6 then settles
            pulse_local = clamp01((t - 17.8) / 0.9)
            sp = 1.0 + 0.06 * math.sin(pulse_local * math.pi)
            parts.append(
                f'<g transform="translate({CENTER_X} {base_y + 80:.1f}) scale({sp:.3f})" opacity="{sub_c:.3f}">'
                f'<text x="0" y="0" font-family="{FONT_DISPLAY}" font-weight="800" '
                f'font-size="90" letter-spacing="0.02em" fill="url(#mintTextGrad)" '
                f'text-anchor="middle" font-style="italic">compound.</text>'
                f'</g>'
            )
    # ── Signature — fades in 19.5-20.5, holds through end
    if t > 19.5:
        local = localT(t, 19.5, 20.5)
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

# ---------- Atmospheric haze (Dolby Atmos style depth) ----------
def render_atmosphere(t: float) -> str:
    """5 large soft mint-fog circles drifting slowly across the canvas."""
    parts = []
    # Stable seed-based positions, animated drift
    for i in range(5):
        seed = (i * 53 + 17) % 100 / 100.0
        # Slow horizontal + vertical drift
        bx = (seed - 0.5) * W * 0.9 + CENTER_X
        by = ((seed * 7) % 1 - 0.5) * H * 0.6 + CENTER_Y
        drift_x = math.sin(t * 0.13 + seed * 7) * 90
        drift_y = math.cos(t * 0.10 + seed * 5) * 60
        cx = bx + drift_x
        cy = by + drift_y
        r = 280 + seed * 220
        # Opacity fades during reveal so the mark dominates
        base_a = 0.06 + seed * 0.04
        if t > 12.5:
            base_a *= 1.0 - smoothstep(12.5, 15.4, t) * 0.6
        parts.append(
            f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" '
            f'fill="url(#hazeGrad)" opacity="{base_a:.3f}"/>'
        )
    return "".join(parts)

# ---------- God ray (light beam during LANDING) ----------
def render_god_ray(t: float, cx: float, cy: float) -> str:
    """Soft vertical light beam behind the mark, peaks during reveal."""
    # Active 12.5-16.0s, peak ON HIT 4 (13.45s)
    if t < 12.5 or t > 16.0: return ""
    p = localT(t, 12.5, 13.45) * (1 - localT(t, 14.5, 16.0))
    p = max(0.0, p)
    if p < 0.02: return ""
    # Two diagonal beams: from upper-left and upper-right toward the mark
    beam_w = 600
    beam_h = 1700
    a = p * 0.18
    return (
        f'<g opacity="{a:.3f}" filter="url(#blurXL)">'
        f'<rect x="{cx - beam_w/2:.1f}" y="{cy - beam_h*0.7:.1f}" '
        f'width="{beam_w}" height="{beam_h}" rx="240" '
        f'fill="url(#godRayGrad)" transform="rotate(-8 {cx:.1f} {cy:.1f})"/>'
        f'<rect x="{cx - beam_w/2:.1f}" y="{cy - beam_h*0.7:.1f}" '
        f'width="{beam_w}" height="{beam_h}" rx="240" '
        f'fill="url(#godRayGrad)" transform="rotate(8 {cx:.1f} {cy:.1f})"/>'
        f'</g>'
    )

# ---------- Camera (per-shot moves) ----------
def camera_state(t: float) -> Tuple[float, float, float]:
    """Returns (scale, tx, ty). v34 timing — synced to audio hits."""
    if t < 1.9:
        # SHOT 1 (0-1.9): push-in 2% to HIT 1
        p = ease_in_out_cubic(t / 1.9)
        return (1.0 + p * 0.02, 0, 0)
    if t < 5.75:
        # ARCH spawn (1.9-5.75): pull-back to -4% by HIT 2
        p = ease_in_out_cubic(localT(t, 1.9, 5.75))
        return (lerp(1.02, 0.96, p), 0, 0)
    if t < 9.60:
        # ARCH breath (5.75-9.6): drift 0.96 -> 0.98 through HIT 3
        p = ease_out_cubic(localT(t, 5.75, 9.60))
        return (lerp(0.96, 0.98, p), 0, 0)
    if t < 13.45:
        # COALESCE (9.6-13.45): subtle push-in to HIT 4
        p = ease_in_out_cubic(localT(t, 9.60, 13.45))
        return (lerp(0.98, 1.05, p), 0, 0)
    if t < 18.60:
        # LANDING + NAME (13.45-18.6): ease back through HIT 5 and HIT 6
        p = ease_out_cubic(localT(t, 13.45, 18.60))
        return (lerp(1.05, 1.0, p), 0, 0)
    return (1.0, 0, 0)

# ---------- Vignette (breathes per beat) ----------
def vignette_strength(t: float) -> float:
    if t < 1.9:   return 0.70     # tight on the void
    if t < 5.75:  return 0.40     # widest while lattice spawns
    if t < 9.60:  return 0.42     # arch breath
    if t < 13.45: return 0.50     # narrowing as coalesce builds
    if t < 15.40: return 0.65     # tighter on landing
    if t < 18.60: return 0.55     # neutral on name + tagline
    return 0.72                    # tightens for sign-off

# ---------- Frame composer ----------
def svg_for_frame(f: int) -> str:
    t = f / FPS
    step(t)

    # Camera
    cs, ctx, cty = camera_state(t)
    cam_tx = (W / 2) * (1 - cs) + ctx
    cam_ty = MARK_CY * (1 - cs) + cty

    # Mark animation — synced so the M LANDS on HIT 4 (13.45s)
    mark_a    = ease_out_cubic(localT(t, 12.0, 13.0))    # M fades in just before HIT 4
    mark_draw = ease_out_cubic(localT(t, 12.5, 13.45))   # stroke fully drawn ON HIT 4
    mark_disc = ease_out_cubic(localT(t, 13.45, 14.5))   # disc fills outward from HIT 4
    # Glow peak ON HIT 4
    glow = 0.0
    if t > 13.0:
        p = clamp01((t - 13.0) / 1.8)
        glow = (1 - (1 - p) ** 3) * (1 - p) * 0.95

    # Mark rises between HIT 4 (13.45) and HIT 5 (15.4) to make room for the wordmark
    rise = lerp(0, -160, ease_out_cubic(localT(t, 14.0, 15.4)))
    mark_cy = MARK_CY + rise
    mark_scale = lerp(560, 320, ease_out_cubic(localT(t, 14.0, 15.4)))

    # Particle alpha — fade out as the M dominates
    p_alpha = 1.0 - smoothstep(12.8, 14.0, t)

    # Final fade — into ink before the next audio hit at 23s
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
    <radialGradient id="hazeGrad" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%"  stop-color="{MINT_3}" stop-opacity="0.55"/>
      <stop offset="60%" stop-color="{MINT_4}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="{MINT_4}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="godRayGrad" x1="0.5" y1="0" x2="0.5" y2="1">
      <stop offset="0%"  stop-color="{MINT_2}" stop-opacity="0"/>
      <stop offset="30%" stop-color="{MINT_2}" stop-opacity="0.55"/>
      <stop offset="55%" stop-color="{MINT_1}" stop-opacity="0.85"/>
      <stop offset="80%" stop-color="{MINT_2}" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="{MINT_3}" stop-opacity="0"/>
    </linearGradient>
    <filter id="blurXL" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="42"/>
    </filter>
  </defs>

  <rect width="{W}" height="{H}" fill="{INK}"/>

  <!-- Atmospheric haze layer (behind everything, gentle camera scale) -->
  <g transform="translate({cam_tx:.1f},{cam_ty:.1f}) scale({cs:.4f})">
    {render_atmosphere(t)}
  </g>

  <!-- God-ray light beam (behind mark) -->
  <g transform="translate({cam_tx:.1f},{cam_ty:.1f}) scale({cs:.4f})">
    {render_god_ray(t, CENTER_X, mark_cy)}
  </g>

  <!-- Camera-scaled world (particles + mark) -->
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
    """Mux frames + audio. Audio is trimmed to TOTAL_S with a 0.7s
    tail fade-out so it dissolves with the final visual fade."""
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"  muxing → {OUT_MP4.name}")
    fade_start = TOTAL_S - 0.7
    af = f"afade=t=out:st={fade_start:.2f}:d=0.7"
    cmd = [
        "ffmpeg", "-y",
        "-framerate", str(FPS),
        "-i", str(FRAMES_DIR / "f%05d.png"),
        "-i", str(AUDIO_SRC),
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
    print(f"v34 audiosync · {FPS}fps · {TOTAL_S}s · {N_PARTICLES} dots · 4 anchor + 392 to M")
    print(f"  audio source: {AUDIO_SRC.name}")
    render_all_frames()
    mux()
    size_mb = OUT_MP4.stat().st_size / 1024 / 1024
    print(f"  done → {OUT_MP4} ({size_mb:.2f}MB)")

if __name__ == "__main__":
    main()
