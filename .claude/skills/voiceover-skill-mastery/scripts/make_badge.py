#!/usr/bin/env python3
"""
Render the Brand Mint monogram as a PNG badge for compositing onto footage.

    python3 scripts/make_badge.py badge.png 120

It draws the mark from brand-kit/logo/brand-mint-monogram.svg rather than
importing the file, because the container has no SVG rasteriser and the mark is
two primitives — a gradient disc and an M polyline on a 64-unit grid.

The badge is opaque and carries a soft dark halo, because its job is to sit over
a generator's watermark on unpredictable footage. A translucent mark would let
the thing underneath show through.
"""

import sys
from PIL import Image, ImageDraw, ImageFilter

# brand-kit/logo/brand-mint-monogram.svg
GRAD_FROM = (124, 246, 200)      # #7CF6C8
GRAD_TO = (16, 185, 129)         # #10B981
INK = (11, 31, 26)               # #0B1F1A
M_PATH = [(18, 44), (18, 20), (32, 32), (46, 20), (46, 44)]   # M18 44V20l14 12 14-12v24
STROKE = 4.4
VIEWBOX = 64


def build(size):
    ss = 4                                   # supersample; the disc edge shows
    n = size * ss
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))

    # Diagonal gradient, clipped to the disc.
    grad = Image.new("RGB", (n, n))
    gd = ImageDraw.Draw(grad)
    for i in range(n):
        t = i / max(1, n - 1)
        gd.line([(0, i), (n, i)],
                fill=tuple(round(a + (b - a) * t) for a, b in zip(GRAD_FROM, GRAD_TO)))
    mask = Image.new("L", (n, n), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, n - 1, n - 1], fill=255)
    img.paste(grad, (0, 0), mask)

    k = n / VIEWBOX
    d = ImageDraw.Draw(img)
    pts = [(x * k, y * k) for x, y in M_PATH]
    w = round(STROKE * k)
    d.line(pts, fill=INK + (255,), width=w, joint="curve")
    for x, y in pts:                          # round caps and joins
        d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=INK + (255,))

    img = img.resize((size, size), Image.LANCZOS)

    # A halo, so the badge separates from whatever it lands on.
    pad = max(6, size // 10)
    out = Image.new("RGBA", (size + pad * 2, size + pad * 2), (0, 0, 0, 0))
    shadow = Image.new("RGBA", out.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).ellipse(
        [pad - 2, pad - 2, pad + size + 2, pad + size + 2], fill=(4, 18, 13, 150))
    out.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(pad * 0.55)))
    out.alpha_composite(img, (pad, pad))
    return out


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "badge.png"
    size = int(sys.argv[2]) if len(sys.argv) > 2 else 120
    b = build(size)
    b.save(path)
    print(f"{path}  {b.size[0]}x{b.size[1]}  (mark {size}px + halo)")


if __name__ == "__main__":
    main()
