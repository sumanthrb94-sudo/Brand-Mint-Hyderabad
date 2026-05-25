"""
v21 EP03 — New Money · MrBeast structure · Brand Mint palette · ~15.5s @ 60fps.

Five emerging Hyderabad builders writing the next chapter. Countdown ends
on Modcon Builders as #1 — the cliffhanger that hands off to EP04.

Content arc:
  0:00-0:02   HOOK      "5 builders writing Hyderabad's next chapter"
  0:02-0:03.5 STAKES    "All founded after 2010"
  0:03.5-0:05 METHOD    "Track them now. Pay attention."
  0:05-0:11   COUNTDOWN 4 emerging (#5 → #2)
  0:11-0:13.5 WINNER    "#1 — MODCON BUILDERS · award-winning"
  0:13.5-0:15.5 CTA     "Watch EP04. Comment NEW for the watchlist."
"""

import math, os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))
from _lib import *  # noqa

BPM = int(os.environ.get("BPM", "120"))
BEAT_SEC = 60.0 / BPM
def beats(n: float) -> float: return n * BEAT_SEC

HERE = Path(__file__).parent
FRAMES = HERE / "frames_ep03"
OUT = HERE / "out"
FRAMES.mkdir(exist_ok=True)
OUT.mkdir(exist_ok=True)

# From build_ep03.py — verified source
BUILDERS = [
    (5, "GREENMARK DEVELOPERS", "EMERGING · HYDERABAD"),
    (4, "AURO REALTY",          "EMERGING · HYDERABAD"),
    (3, "VAMSIRAM BUILDERS",    "EMERGING · HYDERABAD"),
    (2, "ASBL",                  "EMERGING · HYDERABAD"),
]
WINNER = (1, "MODCON BUILDERS", "EMERGING · AWARD-WINNING")

@dataclass
class Beat:
    kind: str
    duration: float
    data: dict = field(default_factory=dict)

BEATS: List[Beat] = [
    Beat(kind="hook",     duration=beats(4.0)),
    Beat(kind="stakes",   duration=beats(3.0)),
    Beat(kind="method",   duration=beats(3.0)),
    Beat(kind="countdown",duration=beats(12.0)),
    Beat(kind="winner",   duration=beats(5.0)),
    Beat(kind="cta",      duration=beats(4.0)),
]

TOTAL_S = sum(b.duration for b in BEATS)
TOTAL_F = int(round(TOTAL_S * FPS))
BEAT_BOUNDARIES = []
_c = 0.0
for _b in BEATS:
    BEAT_BOUNDARIES.append(_c); _c += _b.duration

def beat_at(t):
    cursor = 0.0
    for i, b in enumerate(BEATS):
        if t < cursor + b.duration:
            local = (t - cursor) / b.duration if b.duration > 0 else 1.0
            return i, max(0.0, min(1.0, local)), b, cursor
        cursor += b.duration
    return len(BEATS) - 1, 1.0, BEATS[-1], cursor - BEATS[-1].duration

def build_hook(b, local, t):
    cx = W // 2
    l1 = smoothstep(0.05, 0.18, local)
    l2 = smoothstep(0.12, 0.26, local)
    l3 = smoothstep(0.20, 0.38, local)
    l4 = smoothstep(0.32, 0.46, local)
    l5 = smoothstep(0.40, 0.55, local)
    kicker = smoothstep(0.55, 0.75, local)
    num_punch = 1.0 + 0.16 * max(0, 1 - abs(local - 0.30) * 7)
    circle_t = smoothstep(0.34, 0.58, local)

    pt1 = fit_to_width("HYDERABAD'S",          SAFE_TEXT_W, 96, floor_pt=72)
    pt2 = fit_to_width("NEXT",                  SAFE_TEXT_W, 90,  floor_pt=72)
    pt3 = int(fit_to_width("5", SAFE_TEXT_W, 260, floor_pt=200) * num_punch)
    pt4 = fit_to_width("EMERGING",             SAFE_TEXT_W, 96,  floor_pt=72)
    pt5 = fit_to_width("BUILDERS.",            SAFE_TEXT_W, 124, floor_pt=96)

    return f"""
      <rect width="{W}" height="{H}" fill="{BEAST_BLACK}"/>
      <g opacity="{l1:.3f}" transform="translate(0 {lerp(20,0,l1):.1f})">
        {stroke_text("HYDERABAD'S", cx, int(H*0.14), pt1, fill=BEAST_WHITE)}
      </g>
      <g opacity="{l2:.3f}" transform="translate(0 {lerp(20,0,l2):.1f})">
        {stroke_text("NEXT", cx, int(H*0.25), pt2, fill=BEAST_WHITE)}
      </g>
      <g opacity="{l3:.3f}" transform="translate(0 {lerp(40,0,l3):.1f})">
        {stroke_text("5", cx, int(H*0.50), pt3, fill=BEAST_YELLOW, stroke_w=12)}
      </g>
      <g opacity="{circle_t:.3f}">
        {red_circle_annotation(cx, int(H*0.43), r=180, draw_t=circle_t, stroke_w=14)}
      </g>
      <g opacity="{l4:.3f}" transform="translate(0 {lerp(20,0,l4):.1f})">
        {stroke_text("EMERGING", cx, int(H*0.62), pt4, fill=BEAST_WHITE)}
      </g>
      <g opacity="{l5:.3f}" transform="translate(0 {lerp(20,0,l5):.1f})">
        {stroke_text("BUILDERS.", cx, int(H*0.74), pt5, fill=BEAST_WHITE)}
      </g>
      <text x="{cx}" y="{int(H*0.88)}" font-family="{FONT_MONO}"
            font-size="26" font-weight="700" fill="{BEAST_YELLOW}"
            text-anchor="middle" letter-spacing="0.30em"
            opacity="{kicker:.3f}">
        NEW MONEY.
      </text>
    """

def build_stakes(b, local, t):
    cx = W // 2
    block_t = back_out(clamp01(local / 0.22))
    text_t = smoothstep(0.20, 0.40, local)
    kicker_t = smoothstep(0.50, 0.75, local)

    return f"""
      <rect width="{W}" height="{H}" fill="{BEAST_BLACK}"/>
      {color_block(60, 360, W - 120, 760, fill=BEAST_YELLOW,
                   rotate_deg=-3.0, opacity=block_t)}
      <g opacity="{text_t:.3f}">
        {stroke_text("ALL FOUNDED", cx, int(H * 0.36), 116,
                     fill=BEAST_BLACK, stroke=BEAST_BLACK, stroke_w=2)}
        {stroke_text("AFTER", cx, int(H * 0.52), 116,
                     fill=BEAST_BLACK, stroke=BEAST_BLACK, stroke_w=2)}
        {stroke_text("2010.", cx, int(H * 0.68), 156,
                     fill=BEAST_BLACK, stroke=BEAST_BLACK, stroke_w=2)}
      </g>
      <text x="{cx}" y="{int(H * 0.85)}" font-family="{FONT_MONO}"
            font-size="24" font-weight="700" fill="{BEAST_WHITE}"
            text-anchor="middle" letter-spacing="0.24em"
            opacity="{kicker_t:.3f}">
        NEW BLOOD · NEW BETS
      </text>
    """

def build_method(b, local, t):
    cx = W // 2
    s1 = smoothstep(0.05, 0.25, local)
    s2 = smoothstep(0.20, 0.40, local)
    s3 = smoothstep(0.35, 0.55, local)

    return f"""
      <rect width="{W}" height="{H}" fill="{BEAST_BLACK}"/>
      <g opacity="0.18">
        {color_block(-200, 600, 1500, 80, fill=BEAST_RED, rotate_deg=-10, stroke_w=0)}
        {color_block(-200, 850, 1500, 80, fill=BEAST_BLUE, rotate_deg=-10, stroke_w=0)}
        {color_block(-200, 1100, 1500, 80, fill=BEAST_YELLOW, rotate_deg=-10, stroke_w=0)}
      </g>
      <g opacity="{s1:.3f}">
        {stroke_text("THE WATCHLIST.", cx, int(H * 0.18), 96,
                     fill=BEAST_YELLOW, stroke=BEAST_BLACK, stroke_w=8)}
      </g>
      <g opacity="{s1:.3f}" transform="translate(0 {lerp(40,0,s1):.1f})">
        {stroke_text("TRACK THEM", cx, int(H * 0.40), 132, fill=BEAST_WHITE, stroke_w=10)}
      </g>
      <g opacity="{s2:.3f}" transform="translate(0 {lerp(40,0,s2):.1f})">
        {stroke_text("NOW.", cx, int(H * 0.56), 156, fill=BEAST_YELLOW, stroke_w=10)}
      </g>
      <g opacity="{s3:.3f}" transform="translate(0 {lerp(40,0,s3):.1f})">
        {stroke_text("BEFORE EVERYONE", cx, int(H * 0.76), 72, fill=BEAST_RED, stroke_w=8)}
        {stroke_text("ELSE DOES.", cx, int(H * 0.84), 72, fill=BEAST_RED, stroke_w=8)}
      </g>
    """

def build_countdown(b, local, t):
    cx = W // 2
    cy = H // 2

    n = len(BUILDERS)
    out = [f'<rect width="{W}" height="{H}" fill="{BEAST_BLACK}"/>']

    head_a = smoothstep(0.02, 0.10, local)
    out.append(
        f'<text x="{cx}" y="200" font-family="{FONT_MONO}" '
        f'font-size="26" font-weight="700" fill="{BEAST_YELLOW}" '
        f'text-anchor="middle" letter-spacing="0.30em" '
        f'opacity="{head_a:.3f}">THE WATCHLIST</text>'
    )
    out.append(
        f'{stroke_text("#5 → #2", cx, 290, 84, fill=BEAST_WHITE, opacity=head_a)}'
    )

    for i, (rank, name, sub) in enumerate(BUILDERS):
        slot_start = 0.12 + i * (0.84 / n)
        slot_end = 0.12 + (i + 1) * (0.84 / n)
        seg_len = slot_end - slot_start
        in_a = smoothstep(slot_start, slot_start + seg_len * 0.25, local)
        out_a = 1 - smoothstep(slot_end - seg_len * 0.20, slot_end, local)
        alpha = max(0, min(in_a, out_a))
        if alpha < 0.02:
            continue
        scale_t = smoothstep(slot_start, slot_start + seg_len * 0.20, local)
        scale = lerp(0.85, 1.0, back_out(scale_t))
        out.append(
            f'<g opacity="{alpha:.3f}" transform="scale({scale:.3f})" '
            f'transform-origin="{cx} {cy}">'
        )
        out.append(builder_card(cx, cy, rank, name, sub, alpha=alpha))
        out.append('</g>')

    return "".join(out)

def build_winner(b, local, t):
    cx = W // 2
    tension_t = smoothstep(0.05, 0.18, local)
    reveal_t = back_out(clamp01((local - 0.30) / 0.18))
    reveal_alpha = clamp01((local - 0.28) / 0.10)
    chip_t = smoothstep(0.50, 0.75, local)

    shake_mag = 14 * max(0, 1 - abs(local - 0.32) * 6)
    sx, sy = shake_xy(t, magnitude=shake_mag)

    return f"""
      <rect width="{W}" height="{H}" fill="{BEAST_BLACK}"/>
      <g transform="translate({sx:.1f} {sy:.1f})">
        <g opacity="{tension_t:.3f}">
          {stroke_text("#1 IS...", cx, int(H*0.26), 156, fill=BEAST_WHITE, stroke_w=10)}
        </g>
        <g opacity="{reveal_alpha:.3f}"
           transform="scale({reveal_t:.3f})"
           transform-origin="{cx} {int(H*0.52)}">
          {color_block(80, int(H*0.43), W-160, 260, fill=BEAST_YELLOW, rotate_deg=-2)}
          {stroke_text("MODCON", cx, int(H*0.52), 156,
                       fill=BEAST_BLACK, stroke=BEAST_WHITE, stroke_w=8)}
          {stroke_text("BUILDERS.", cx, int(H*0.64), 124,
                       fill=BEAST_BLACK, stroke=BEAST_WHITE, stroke_w=8)}
        </g>
        <g opacity="{chip_t:.3f}">
          {stat_chip(cx, int(H * 0.76), label="OUTLOOK BUSINESS · 2024",
                     value="AWARD-WINNING", bg=BEAST_RED, opacity=chip_t,
                     value_pt=64)}
        </g>
      </g>
    """

def build_cta(b, local, t):
    cx = W // 2
    flood_t = back_out(clamp01(local / 0.22))
    text_t = back_out(clamp01((local - 0.15) / 0.25))
    text_a = clamp01((local - 0.12) / 0.15)
    pulse = 1.0 + 0.05 * (0.5 + 0.5 * math.sin(local * 2 * math.pi * 2.0))
    mark_a = smoothstep(0.55, 0.80, local)

    return f"""
      <rect width="{W}" height="{H}" fill="{BEAST_BLACK}"/>
      <rect width="{W}" height="{H}" fill="{BEAST_YELLOW}" opacity="{flood_t:.3f}"/>
      <g opacity="{text_a:.3f}"
         transform="scale({text_t * pulse:.3f})"
         transform-origin="{cx} {int(H * 0.46)}">
        {stroke_text("WATCH", cx, int(H*0.30), 152, fill=BEAST_BLACK, stroke=BEAST_WHITE, stroke_w=8)}
        {stroke_text("EP04", cx, int(H*0.46), 168, fill=BEAST_RED, stroke=BEAST_BLACK, stroke_w=10)}
        {plain_text("COMMENT 'NEW' FOR", cx, int(H*0.62), 56, fill=BEAST_BLACK, weight=900)}
        {plain_text("THE WATCHLIST.", cx, int(H*0.69), 56, fill=BEAST_BLACK, weight=900)}
      </g>
      <g opacity="{mark_a:.3f}">
        {red_arrow(cx, int(H * 0.78), cx, int(H * 0.86), stroke_w=14)}
      </g>
      <g opacity="{mark_a:.3f}">
        {draw_mark(cx - 240, int(H * 0.92), scale=0.18, opacity=1.0)}
        <text x="{cx - 160}" y="{int(H * 0.928)}" font-family="{FONT_DISPLAY}"
              font-size="44" font-weight="900" fill="{BEAST_BLACK}"
              text-anchor="start" letter-spacing="-0.01em">
          @brandmint.studios
        </text>
      </g>
    """

def compose_svg(t):
    _, local, b, _ = beat_at(t)
    if b.kind == "hook":     body = build_hook(b, local, t)
    elif b.kind == "stakes": body = build_stakes(b, local, t)
    elif b.kind == "method": body = build_method(b, local, t)
    elif b.kind == "countdown": body = build_countdown(b, local, t)
    elif b.kind == "winner": body = build_winner(b, local, t)
    elif b.kind == "cta":    body = build_cta(b, local, t)
    else: body = ""
    flash = "".join(flash_frame(t, bnd, 0.06, PURE_WHITE) for bnd in BEAT_BOUNDARIES[1:])
    return f"""<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{body}{flash}</svg>"""

def main():
    print(f"\nv21 EP03 (New Money · Beast) · {FPS}fps · {TOTAL_S:.1f}s")
    render_all_frames(FRAMES, TOTAL_F, TOTAL_S, compose_svg)
    audio = OUT / "_audio_ep03.wav"
    print("  synth audio...")
    winner_start = sum(b.duration for b in BEATS[:4])
    winner_reveal = winner_start + BEATS[4].duration * 0.30
    synth_beast_audio(audio, TOTAL_S, BEAT_BOUNDARIES,
                      winner_at=winner_reveal,
                      ding_times=[6.0, 7.2, 8.4, 9.6])
    scored = OUT / f"brandmint-ep03-beast-{BPM}bpm.mp4"
    silent = OUT / f"brandmint-ep03-beast-{BPM}bpm-silent.mp4"
    mux(FRAMES, audio, scored, with_audio=True)
    mux(FRAMES, audio, silent, with_audio=False)
    print(f"  ✓ {scored.name}\n  ✓ {silent.name}\n")

if __name__ == "__main__":
    main()
