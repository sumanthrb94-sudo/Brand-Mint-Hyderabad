"""
Build a 9:16 social video (1080x1920) for Brand Mint from on-brand SVG frames.

- Renders 6 SVG frames (one per "scene") to PNG using cairosvg
- Assembles them into an MP4 with crossfades using ffmpeg
- Output: brand-kit/video/out/brand-mint-reel.mp4
"""
import os
import subprocess
import textwrap
from pathlib import Path

import cairosvg

ROOT = Path(__file__).resolve().parent
FRAMES = ROOT / "frames"
OUT = ROOT / "out"
FRAMES.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1080, 1920  # 9:16 Reels / Stories
SCENE_SECONDS = 3.0
CROSSFADE = 0.5
FPS = 30

# ---------- brand tokens ----------
INK = "#0A0E0C"
PAPER = "#F5F1EA"
PAPER_DEEP = "#E9E2D3"
MINT_1 = "#D6F5E6"
MINT_2 = "#7CF6C8"
MINT_3 = "#10B981"
MINT_4 = "#047857"
GOLD = "#C9A14A"
BM_INK = "#0B1F1A"
BM_INK_2 = "#14352D"
BM_CREAM = "#F5F1EA"
BM_EMERALD = "#00C897"

DISPLAY = "Plus Jakarta Sans, Inter, system-ui, sans-serif"
MONO = "JetBrains Mono, ui-monospace, monospace"
BODY = "Inter, system-ui, sans-serif"


def defs():
    return f"""
    <defs>
      <linearGradient id="paperBg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="{PAPER}"/>
        <stop offset="100%" stop-color="{PAPER_DEEP}"/>
      </linearGradient>
      <linearGradient id="darkBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="{BM_INK}"/>
        <stop offset="100%" stop-color="{BM_INK_2}"/>
      </linearGradient>
      <linearGradient id="mark" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="{MINT_2}"/>
        <stop offset="100%" stop-color="{MINT_3}"/>
      </linearGradient>
    </defs>
    """


def logo_lockup(dark=False):
    """64px monogram + wordmark, baseline bottom-left (x=80, y=H-120)."""
    text_color = BM_CREAM if dark else INK
    stroke_on_mark = BM_INK
    rule_color = "rgba(245,241,234,0.18)" if dark else "rgba(10,14,12,0.10)"
    url_color = BM_CREAM if dark else INK
    url_opacity = 0.62
    return f"""
    <line x1="80" y1="{H-200}" x2="{W-80}" y2="{H-200}" stroke="{rule_color}"/>
    <g transform="translate(80, {H-160})">
      <circle cx="32" cy="32" r="32" fill="url(#mark)"/>
      <path d="M18 44V20l14 12 14-12v24" stroke="{stroke_on_mark}" stroke-width="4.4"
            stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <text x="86" y="28" font-family="{DISPLAY}" font-size="28" font-weight="600"
            letter-spacing="-0.02em" fill="{text_color}">Brand Mint</text>
      <text x="86" y="56" font-family="{BODY}" font-size="18" font-weight="400"
            fill="{text_color}" opacity="0.62">— Hyderabad</text>
    </g>
    <text x="{W-80}" y="{H-126}" text-anchor="end" font-family="{MONO}" font-size="20"
          letter-spacing="0.06em" fill="{url_color}" opacity="{url_opacity}">brandmint.studio</text>
    """


def eyebrow(text, y=160, dark=False, with_dot=False):
    color = BM_CREAM if dark else INK
    opacity = 0.85 if dark else 1.0
    dot = f'<circle cx="92" cy="{y-10}" r="6" fill="{MINT_3}"/>' if with_dot else ""
    x = 116 if with_dot else 80
    return f"""
    {dot}
    <text x="{x}" y="{y}" font-family="{BODY}" font-size="22" font-weight="600"
          letter-spacing="0.18em" fill="{color}" opacity="{opacity}">{text}</text>
    """


def frame_svg(body_inner: str) -> str:
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
      {defs()}
      {body_inner}
    </svg>"""


# ---------- scene builders ----------
def scene_1():
    body = f"""
    <rect width="{W}" height="{H}" fill="url(#paperBg)"/>
    {eyebrow("BUILT IN HYDERABAD", y=200, with_dot=True)}
    <g font-family="{DISPLAY}" font-weight="600" letter-spacing="-0.03em" fill="{INK}">
      <text x="80" y="560" font-size="124">We mint</text>
      <text x="80" y="700" font-size="124" font-style="italic">brands that</text>
      <text x="80" y="840" font-size="124"><tspan fill="{MINT_3}">compound.</tspan></text>
    </g>
    <g font-family="{BODY}" font-size="32" font-weight="400" fill="{INK}" opacity="0.68">
      <text x="80" y="1060">Custom websites &amp; internal tools,</text>
      <text x="80" y="1110">engineered for founders who'd rather ship</text>
      <text x="80" y="1160">than slide-deck.</text>
    </g>
    {logo_lockup()}
    """
    return frame_svg(body)


def scene_2():
    body = f"""
    <rect width="{W}" height="{H}" fill="url(#paperBg)"/>
    {eyebrow("LAST QUARTER", y=200)}
    <text x="80" y="640" font-family="{MONO}" font-size="180" font-weight="500"
          letter-spacing="-0.02em" fill="{MINT_3}">+&#8377;42.6 Cr</text>
    <text x="80" y="720" font-family="{DISPLAY}" font-size="56" font-weight="600"
          letter-spacing="-0.02em" fill="{INK}">tracked revenue.</text>
    <g font-family="{BODY}" font-size="30" font-weight="400" fill="{INK}" opacity="0.68">
      <text x="80" y="900">Across 11 founder-led brands.</text>
      <text x="80" y="950">India &amp; the Gulf · Q1 FY26.</text>
    </g>
    <text x="80" y="1180" font-family="{MONO}" font-size="22" letter-spacing="0.06em"
          fill="{INK}" opacity="0.55">— receipts, not promises</text>
    {logo_lockup()}
    """
    return frame_svg(body)


def _pillar(y, n, title, sub):
    return f"""
    <g transform="translate(80, {y})">
      <text x="0" y="-8" font-family="{MONO}" font-size="20" letter-spacing="0.06em"
            fill="{MINT_3}">0{n}</text>
      <circle cx="44" cy="56" r="44" fill="none" stroke="{MINT_3}" stroke-width="3"/>
      <text x="120" y="46" font-family="{DISPLAY}" font-size="44" font-weight="600"
            letter-spacing="-0.02em" fill="{INK}">{title}</text>
      <text x="120" y="92" font-family="{BODY}" font-size="26" fill="{INK}" opacity="0.62">{sub}</text>
    </g>
    """


def scene_3():
    body = f"""
    <rect width="{W}" height="{H}" fill="url(#paperBg)"/>
    {eyebrow("WHAT WE SHIP", y=200)}
    <text x="80" y="380" font-family="{DISPLAY}" font-size="92" font-weight="600"
          letter-spacing="-0.03em" fill="{INK}">Three things.</text>
    <text x="80" y="470" font-family="{DISPLAY}" font-size="92" font-weight="600"
          letter-spacing="-0.03em" fill="{INK}" font-style="italic">Done well.</text>
    {_pillar(680,  1, "Marketing sites that convert",   "SEO, speed, Core Web Vitals — green by default.")}
    {_pillar(880,  2, "Internal tools that scale",       "Ops dashboards, admin panels, no-code-killers.")}
    {_pillar(1080, 3, "AI woven in, not bolted on",      "Quiet automations behind the brand.")}
    {logo_lockup()}
    """
    return frame_svg(body)


def scene_4():
    # Dark interlude — case study
    body = f"""
    <rect width="{W}" height="{H}" fill="url(#darkBg)"/>
    <text x="80" y="160" font-family="{MONO}" font-size="22" letter-spacing="0.18em"
          fill="{GOLD}">— 04 / 06 · CASE</text>
    {eyebrow("D2C WELLNESS · HYD &#8594; DXB", y=210, dark=True)}
    <g font-family="{DISPLAY}" font-weight="500" letter-spacing="-0.015em" fill="{BM_CREAM}">
      <text x="80" y="500"  font-size="84">Bookings up</text>
      <text x="80" y="610"  font-size="170" font-family="{MONO}" font-weight="500"
            fill="{BM_EMERALD}">3.4&#215;</text>
      <text x="80" y="780"  font-size="84">Cost per lead</text>
      <text x="80" y="880"  font-size="84">down</text>
      <text x="80" y="1030" font-size="170" font-family="{MONO}" font-weight="500"
            fill="{BM_EMERALD}">61%</text>
    </g>
    <text x="80" y="1180" font-family="{BODY}" font-size="28" fill="{BM_CREAM}" opacity="0.72">
      Two quarters. Same founder. Same product.
    </text>
    <g transform="translate(80, 1320)">
      <rect width="500" height="96" rx="48" fill="{BM_EMERALD}"/>
      <text x="250" y="62" text-anchor="middle" font-family="{DISPLAY}" font-size="34"
            font-weight="600" fill="{BM_INK}">See the build &#8594;</text>
    </g>
    {logo_lockup(dark=True)}
    """
    return frame_svg(body)


def scene_5():
    body = f"""
    <rect width="{W}" height="{H}" fill="url(#paperBg)"/>
    {eyebrow("FOUNDER NOTE", y=200)}
    <text x="80" y="320" font-family="{DISPLAY}" font-size="120" font-weight="600"
          fill="{MINT_3}" opacity="0.35">&#8220;</text>
    <g font-family="{DISPLAY}" font-weight="500" font-style="normal" letter-spacing="-0.015em" fill="{INK}">
      <text x="80" y="520" font-size="64">They shipped in</text>
      <text x="80" y="610" font-size="64" font-style="italic" fill="{MINT_3}">eleven days</text>
      <text x="80" y="700" font-size="64">what our last agency</text>
      <text x="80" y="790" font-size="64">couldn't ship in</text>
      <text x="80" y="880" font-size="64">three months.</text>
    </g>
    <g transform="translate(80, 1060)">
      <rect width="92" height="92" rx="12" fill="{MINT_3}"/>
      <text x="46" y="64" text-anchor="middle" font-family="{DISPLAY}" font-size="48"
            font-weight="600" fill="{BM_CREAM}">A</text>
      <text x="124" y="46" font-family="{DISPLAY}" font-size="32" font-weight="600"
            fill="{INK}">Arjun R.</text>
      <text x="124" y="80" font-family="{BODY}" font-size="24" fill="{INK}" opacity="0.62">
        Founder, Northwind Labs
      </text>
    </g>
    {logo_lockup()}
    """
    return frame_svg(body)


def scene_6():
    body = f"""
    <rect width="{W}" height="{H}" fill="url(#paperBg)"/>
    {eyebrow("BOOKING Q3 2026", y=200, with_dot=True)}
    <g font-family="{DISPLAY}" font-weight="600" letter-spacing="-0.03em" fill="{INK}">
      <text x="80" y="540" font-size="108">Let's mint</text>
      <text x="80" y="668" font-size="108">something that</text>
      <text x="80" y="796" font-size="108"><tspan fill="{MINT_3}" font-style="italic">compounds.</tspan></text>
    </g>
    <g font-family="{BODY}" font-size="30" fill="{INK}" opacity="0.68">
      <text x="80" y="980">Studio in HITEC City · INR-priced · GST extra.</text>
      <text x="80" y="1030">8+ year operators only. No interns at the table.</text>
    </g>
    <g transform="translate(80, 1180)">
      <rect width="640" height="120" rx="60" fill="{MINT_3}"/>
      <text x="320" y="76" text-anchor="middle" font-family="{DISPLAY}" font-size="40"
            font-weight="600" fill="{BM_CREAM}">Start a project &#8594;</text>
    </g>
    {logo_lockup()}
    """
    return frame_svg(body)


SCENES = [scene_1, scene_2, scene_3, scene_4, scene_5, scene_6]


def render_all():
    pngs = []
    for i, scene in enumerate(SCENES, start=1):
        svg_path = FRAMES / f"scene-{i}.svg"
        png_path = FRAMES / f"scene-{i}.png"
        svg_path.write_text(scene())
        cairosvg.svg2png(
            bytestring=svg_path.read_bytes(),
            write_to=str(png_path),
            output_width=W,
            output_height=H,
        )
        pngs.append(png_path)
        print(f"[render] {png_path.name}")
    return pngs


def assemble_video(pngs):
    """Build MP4 with crossfade transitions between scenes."""
    out_mp4 = OUT / "brand-mint-reel.mp4"

    # Build per-scene inputs (each looped to SCENE_SECONDS)
    inputs = []
    for p in pngs:
        inputs += ["-loop", "1", "-t", f"{SCENE_SECONDS}", "-i", str(p)]

    n = len(pngs)
    # Filtergraph: chain xfade transitions
    chain_parts = []
    labels = []
    for i in range(n):
        labels.append(f"[v{i}]")
        chain_parts.append(
            f"[{i}:v]format=yuv420p,fps={FPS},scale={W}:{H},setsar=1[v{i}]"
        )

    # Chain xfades
    last = "[v0]"
    xfade_parts = []
    for i in range(1, n):
        offset = (SCENE_SECONDS * i) - CROSSFADE * i
        out_label = f"[x{i}]" if i < n - 1 else "[vout]"
        xfade_parts.append(
            f"{last}[v{i}]xfade=transition=fade:duration={CROSSFADE}:offset={offset:.3f}{out_label}"
        )
        last = out_label

    filtergraph = ";".join(chain_parts + xfade_parts)

    cmd = [
        "ffmpeg", "-y",
        *inputs,
        "-filter_complex", filtergraph,
        "-map", "[vout]",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-r", str(FPS),
        "-movflags", "+faststart",
        str(out_mp4),
    ]
    print("[ffmpeg]", " ".join(cmd[:8]), "...")
    subprocess.run(cmd, check=True, capture_output=True)
    print(f"[done]  {out_mp4}  ({out_mp4.stat().st_size/1024:.1f} KB)")
    return out_mp4


if __name__ == "__main__":
    pngs = render_all()
    assemble_video(pngs)
