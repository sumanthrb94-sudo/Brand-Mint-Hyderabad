"""
v21 EP04 — Modcon Spotlight · MrBeast structure · Brand Mint palette · ~16s @ 60fps.

NOT a countdown. Single-builder deep-dive presented as a "case study reveal"
sequence: hook → award → founders → project → philosophy → CTA. Each beat
is a single fact-reveal with the BEAST design vocabulary.

Content arc:
  0:00-0:02   HOOK       "I found Hyderabad's most-awarded 2-year-old builder"
  0:02-0:04   AWARD      "Outlook Business Spotlight · 2024" stat chip
  0:04-0:06   FOUNDERS   "Led by Chandu Reddy + Manikanta Sridhar Malladi"
  0:06-0:08.5 PROJECT    "AGARTHA — regenerative permaculture from land"
  0:08.5-0:11 PHILOSOPHY "Architecture has the power to transform lives."
  0:11-0:14   BRAND      Mint pillar with mark + tagline
  0:14-0:16   CTA        "Comment AUDIT for free brand teardown"
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
FRAMES = HERE / "frames_ep04"
OUT = HERE / "out"
FRAMES.mkdir(exist_ok=True)
OUT.mkdir(exist_ok=True)

@dataclass
class Beat:
    kind: str
    duration: float
    data: dict = field(default_factory=dict)

BEATS: List[Beat] = [
    Beat(kind="hook",       duration=beats(4.0)),
    Beat(kind="award",      duration=beats(4.0)),
    Beat(kind="founders",   duration=beats(4.0)),
    Beat(kind="project",    duration=beats(5.0)),
    Beat(kind="philosophy", duration=beats(5.0)),
    Beat(kind="brand",      duration=beats(6.0)),
    Beat(kind="cta",        duration=beats(4.0)),
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
    l2 = smoothstep(0.18, 0.32, local)
    l3 = smoothstep(0.30, 0.50, local)
    l4 = smoothstep(0.45, 0.62, local)
    kicker = smoothstep(0.55, 0.75, local)
    num_punch = 1.0 + 0.16 * max(0, 1 - abs(local - 0.40) * 7)
    circle_t = smoothstep(0.45, 0.70, local)

    pt1 = fit_to_width("I FOUND HYDERABAD'S",  SAFE_TEXT_W, 72,  floor_pt=56)
    pt2 = fit_to_width("MOST-AWARDED",         SAFE_TEXT_W, 96,  floor_pt=72)
    pt3 = int(fit_to_width("2-YEAR-OLD", SAFE_TEXT_W, 124, floor_pt=88) * num_punch)
    pt4 = fit_to_width("BUILDER.",             SAFE_TEXT_W, 124, floor_pt=96)

    return f"""
      <rect width="{W}" height="{H}" fill="{BEAST_BLACK}"/>
      <g opacity="{l1:.3f}" transform="translate(0 {lerp(20,0,l1):.1f})">
        {stroke_text("I FOUND HYDERABAD'S", cx, int(H*0.18), pt1, fill=BEAST_WHITE)}
      </g>
      <g opacity="{l2:.3f}" transform="translate(0 {lerp(20,0,l2):.1f})">
        {stroke_text("MOST-AWARDED", cx, int(H*0.36), pt2, fill=BEAST_YELLOW, stroke_w=10)}
      </g>
      <g opacity="{l3:.3f}" transform="translate(0 {lerp(40,0,l3):.1f})">
        {stroke_text("2-YEAR-OLD", cx, int(H*0.55), pt3, fill=BEAST_WHITE, stroke_w=10)}
      </g>
      <g opacity="{circle_t:.3f}">
        {red_circle_annotation(cx, int(H*0.50), r=200, draw_t=circle_t, stroke_w=14)}
      </g>
      <g opacity="{l4:.3f}" transform="translate(0 {lerp(20,0,l4):.1f})">
        {stroke_text("BUILDER.", cx, int(H*0.72), pt4, fill=BEAST_WHITE)}
      </g>
      <text x="{cx}" y="{int(H*0.88)}" font-family="{FONT_MONO}"
            font-size="26" font-weight="700" fill="{BEAST_YELLOW}"
            text-anchor="middle" letter-spacing="0.30em"
            opacity="{kicker:.3f}">
        FOUNDED 2023.
      </text>
    """

def build_award(b, local, t):
    cx = W // 2
    chip_t = back_out(clamp01(local / 0.25))
    chip_y = lerp(H + 200, int(H * 0.38), chip_t)
    body_a = smoothstep(0.32, 0.55, local)
    kicker_a = smoothstep(0.55, 0.78, local)

    return f"""
      <rect width="{W}" height="{H}" fill="{BEAST_BLACK}"/>
      <g opacity="{body_a:.3f}">
        {stroke_text("THE AWARD:", cx, int(H * 0.18), 76,
                     fill=BEAST_YELLOW, stroke=BEAST_BLACK, stroke_w=8)}
      </g>
      {stat_chip(cx, chip_y - 90, label="ISSUED BY BUSINESS MINT",
                 value="OUTLOOK BUSINESS SPOTLIGHT 2024",
                 bg=BEAST_GREEN, opacity=chip_t, value_pt=46)}
      <g opacity="{body_a:.3f}">
        {stroke_text("FOR THE", cx, int(H * 0.70), 72,
                     fill=BEAST_WHITE, stroke_w=8)}
        {stroke_text("AGARTHA PROJECT.", cx, int(H * 0.79), 72,
                     fill=BEAST_RED, stroke_w=8)}
      </g>
      <text x="{cx}" y="{int(H * 0.92)}" font-family="{FONT_MONO}"
            font-size="22" font-weight="700" fill="{BEAST_WHITE}"
            text-anchor="middle" letter-spacing="0.30em"
            opacity="{kicker_a:.3f}">
        ENTITY · 2024
      </text>
    """

def build_founders(b, local, t):
    cx = W // 2
    block_t = back_out(clamp01(local / 0.22))
    f1_a = smoothstep(0.20, 0.42, local)
    f2_a = smoothstep(0.35, 0.58, local)
    kicker_a = smoothstep(0.55, 0.78, local)

    return f"""
      <rect width="{W}" height="{H}" fill="{BEAST_BLACK}"/>
      <g opacity="{block_t:.3f}">
        {stroke_text("THE BUILDERS:", cx, int(H * 0.18), 76,
                     fill=BEAST_YELLOW, stroke=BEAST_BLACK, stroke_w=8)}
      </g>
      {color_block(80, int(H * 0.34), W - 160, 200, fill=BEAST_YELLOW,
                   rotate_deg=-2, opacity=block_t)}
      <g opacity="{f1_a:.3f}">
        {stroke_text("CHANDU REDDY", cx, int(H * 0.42), 64,
                     fill=BEAST_BLACK, stroke=BEAST_BLACK, stroke_w=1)}
      </g>
      <g opacity="{f2_a:.3f}">
        <text x="{cx}" y="{int(H * 0.475)}" font-family="{FONT_MONO}"
              font-size="22" font-weight="700" fill="{BEAST_BLACK}"
              text-anchor="middle" letter-spacing="0.20em">+</text>
        {stroke_text("MANIKANTA SRIDHAR MALLADI", cx, int(H * 0.52), 36,
                     fill=BEAST_BLACK, stroke=BEAST_BLACK, stroke_w=1)}
      </g>
      <g opacity="{kicker_a:.3f}">
        {stroke_text("HYDERABAD + UAE.", cx, int(H * 0.78), 84,
                     fill=BEAST_WHITE, stroke_w=8)}
      </g>
      <text x="{cx}" y="{int(H * 0.90)}" font-family="{FONT_MONO}"
            font-size="22" font-weight="700" fill="{BEAST_YELLOW}"
            text-anchor="middle" letter-spacing="0.30em"
            opacity="{kicker_a:.3f}">
        THE VISIONARY DUO
      </text>
    """

def build_project(b, local, t):
    cx = W // 2
    l1 = smoothstep(0.05, 0.20, local)
    l2 = back_out(clamp01((local - 0.15) / 0.25))
    l2_a = clamp01((local - 0.15) / 0.20)
    l3 = smoothstep(0.45, 0.65, local)
    kicker = smoothstep(0.60, 0.80, local)

    pt2 = int(196 * (1.0 + 0.10 * max(0, 1 - abs(local - 0.30) * 6)))

    return f"""
      <rect width="{W}" height="{H}" fill="{BEAST_BLACK}"/>
      <g opacity="{l1:.3f}">
        {stroke_text("SIGNATURE PROJECT:", cx, int(H * 0.18), 60,
                     fill=BEAST_YELLOW, stroke=BEAST_BLACK, stroke_w=6)}
      </g>
      <g opacity="{l2_a:.3f}" transform="scale({l2:.3f})"
         transform-origin="{cx} {int(H * 0.42)}">
        {stroke_text("AGARTHA.", cx, int(H * 0.42), pt2,
                     fill=BEAST_YELLOW, stroke=BEAST_BLACK, stroke_w=12)}
      </g>
      <g opacity="{l3:.3f}">
        {stroke_text("REGENERATIVE", cx, int(H * 0.62), 80,
                     fill=BEAST_WHITE, stroke_w=8)}
        {stroke_text("PERMACULTURE", cx, int(H * 0.71), 80,
                     fill=BEAST_WHITE, stroke_w=8)}
        {stroke_text("FROM LAND.", cx, int(H * 0.80), 80,
                     fill=BEAST_RED, stroke_w=8)}
      </g>
      <text x="{cx}" y="{int(H * 0.92)}" font-family="{FONT_MONO}"
            font-size="22" font-weight="700" fill="{BEAST_WHITE}"
            text-anchor="middle" letter-spacing="0.30em"
            opacity="{kicker:.3f}">
        SUSTAINABILITY · DESIGN-LED
      </text>
    """

def build_philosophy(b, local, t):
    cx = W // 2
    block_t = back_out(clamp01(local / 0.22))
    body_a = smoothstep(0.18, 0.42, local)
    body2_a = smoothstep(0.32, 0.55, local)
    body3_a = smoothstep(0.46, 0.68, local)
    kicker_a = smoothstep(0.60, 0.82, local)

    return f"""
      <rect width="{W}" height="{H}" fill="{BEAST_BLACK}"/>
      {color_block(80, int(H * 0.20), W - 160, 1100, fill=BEAST_YELLOW,
                   rotate_deg=-1.5, opacity=block_t * 0.95)}
      <g opacity="{block_t:.3f}">
        {stroke_text("THEIR BELIEF:", cx, int(H * 0.16), 64,
                     fill=BEAST_BLACK, stroke=BEAST_BLACK, stroke_w=2)}
      </g>
      <g opacity="{body_a:.3f}">
        {stroke_text('"ARCHITECTURE', cx, int(H * 0.34), 88,
                     fill=BEAST_BLACK, stroke=BEAST_BLACK, stroke_w=1)}
      </g>
      <g opacity="{body2_a:.3f}">
        {stroke_text("HAS THE POWER", cx, int(H * 0.46), 88,
                     fill=BEAST_BLACK, stroke=BEAST_BLACK, stroke_w=1)}
        {stroke_text("TO TRANSFORM", cx, int(H * 0.58), 88,
                     fill=BEAST_BLACK, stroke=BEAST_BLACK, stroke_w=1)}
      </g>
      <g opacity="{body3_a:.3f}">
        {stroke_text('LIVES."', cx, int(H * 0.72), 124,
                     fill=BEAST_BLACK, stroke=BEAST_BLACK, stroke_w=2)}
      </g>
      <text x="{cx}" y="{int(H * 0.86)}" font-family="{FONT_MONO}"
            font-size="22" font-weight="700" fill="{BEAST_BLACK}"
            text-anchor="middle" letter-spacing="0.30em"
            opacity="{kicker_a:.3f}">
        — MODCON, OFFICIAL
      </text>
    """

def build_brand(b, local, t):
    cx = W // 2

    pillar_t = smoothstep(0.05, 0.30, local)
    pillar_top = lerp(H + 200, 540, ease_out_cubic(pillar_t))

    mark_a = smoothstep(0.20, 0.42, local)
    word_a = smoothstep(0.42, 0.58, local)
    word_drift = lerp(16, 0, ease_out_cubic(word_a))
    sub_a = smoothstep(0.55, 0.72, local)
    url_a = smoothstep(0.65, 0.82, local)

    if local > 0.90:
        out = ease_in_cubic((local - 0.90) / 0.10)
        mark_a *= (1 - out); word_a *= (1 - out)
        sub_a *= (1 - out); url_a *= (1 - out)

    return f"""
      <rect width="{W}" height="{H}" fill="{BEAST_BLACK}"/>
      <rect x="0" y="{pillar_top:.2f}" width="{W}" height="900" fill="{BEAST_YELLOW}"/>

      {draw_mark(cx, pillar_top + 180, scale=0.78, opacity=mark_a)}

      <g transform="translate(0 {pillar_top - 540 + word_drift:.2f})">
        {stroke_text("MODCON BUILDERS", cx, 1080, 96,
                     fill=BEAST_BLACK, stroke=BEAST_BLACK, stroke_w=2,
                     opacity=word_a)}
        <text x="{cx}" y="1180"
              font-family="{FONT_DISPLAY}" font-size="40" font-weight="900"
              fill="{BEAST_BLACK}" text-anchor="middle" font-style="italic"
              opacity="{sub_a:.3f}">
          The new vanguard.
        </text>
        <text x="{cx}" y="1310"
              font-family="{FONT_MONO}" font-size="22" font-weight="700"
              letter-spacing="0.30em" fill="{BEAST_BLACK}" text-anchor="middle"
              opacity="{0.78 * url_a:.3f}">
          MODCONBUILDERS.COM
        </text>
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
        {stroke_text("COMMENT", cx, int(H*0.30), 148, fill=BEAST_BLACK, stroke=BEAST_WHITE, stroke_w=8)}
        {stroke_text('"AUDIT"', cx, int(H*0.46), 168, fill=BEAST_RED, stroke=BEAST_BLACK, stroke_w=10)}
        {plain_text("FREE BRAND TEARDOWN", cx, int(H*0.62), 56, fill=BEAST_BLACK, weight=900)}
        {plain_text("FOR ANY BUILDER.", cx, int(H*0.69), 56, fill=BEAST_BLACK, weight=900)}
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
    if b.kind == "hook":       body = build_hook(b, local, t)
    elif b.kind == "award":    body = build_award(b, local, t)
    elif b.kind == "founders": body = build_founders(b, local, t)
    elif b.kind == "project":  body = build_project(b, local, t)
    elif b.kind == "philosophy": body = build_philosophy(b, local, t)
    elif b.kind == "brand":    body = build_brand(b, local, t)
    elif b.kind == "cta":      body = build_cta(b, local, t)
    else: body = ""
    flash = "".join(flash_frame(t, bnd, 0.06, PURE_WHITE) for bnd in BEAT_BOUNDARIES[1:])
    return f"""<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{body}{flash}</svg>"""

def main():
    print(f"\nv21 EP04 (Modcon · Beast) · {FPS}fps · {TOTAL_S:.1f}s")
    render_all_frames(FRAMES, TOTAL_F, TOTAL_S, compose_svg)
    audio = OUT / "_audio_ep04.wav"
    print("  synth audio...")
    brand_start = sum(b.duration for b in BEATS[:5])
    synth_beast_audio(audio, TOTAL_S, BEAT_BOUNDARIES,
                      winner_at=brand_start + 0.3,
                      ding_times=[2.5, 6.5, 9.0])
    scored = OUT / f"brandmint-ep04-beast-{BPM}bpm.mp4"
    silent = OUT / f"brandmint-ep04-beast-{BPM}bpm-silent.mp4"
    mux(FRAMES, audio, scored, with_audio=True)
    mux(FRAMES, audio, silent, with_audio=False)
    print(f"  ✓ {scored.name}\n  ✓ {silent.name}\n")

if __name__ == "__main__":
    main()
