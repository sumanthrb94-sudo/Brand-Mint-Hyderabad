#!/usr/bin/env python3
"""Turn the site's woff2 fonts into static TTFs libass can actually load.

    python3 scripts/woff2-to-ttf.py

The web fonts in fonts/ are woff2 variable fonts, which is right for a page
and useless to ffmpeg: libass reads TTF/OTF through fontconfig and, given a
variable font, renders the default instance — so a subtitle asking for weight
800 silently comes out at 400. Each face is decompressed and then pinned at a
single weight, which is what makes it a static font rather than a variable one
with a preference attached.

Output goes to marketing/video/fonts/, which is passed to ffmpeg as fontsdir.
"""
import pathlib
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

SRC = pathlib.Path("fonts")
OUT = pathlib.Path("marketing/video/fonts")
OUT.mkdir(parents=True, exist_ok=True)

# (file, weight to pin, family name to register it under)
FACES = [
    ("plus-jakarta-sans.woff2", 800, "BrandMint Display"),
    ("inter.woff2",             600, "BrandMint Text"),
]

for name, weight, family in FACES:
    src = SRC / name
    if not src.exists():
        print(f"  skip  {name} (missing)"); continue
    f = TTFont(src)                      # fontTools reads woff2 directly
    f.flavor = None                      # drop the woff2 wrapper
    axes = {a.axisTag for a in f["fvar"].axes} if "fvar" in f else set()
    if "wght" in axes:
        f = instancer.instantiateVariableFont(f, {"wght": weight}, inplace=False)
        pinned = f"pinned at {weight}"
    else:
        pinned = "static already"

    # Rename so fontconfig cannot confuse it with anything else on the box and
    # the .ass can name one exact family.
    for rec in f["name"].names:
        if rec.nameID in (1, 4, 16):
            rec.string = family
        elif rec.nameID in (2, 17):
            rec.string = "Regular"
        elif rec.nameID == 6:
            rec.string = family.replace(" ", "")
    dst = OUT / f"{family.replace(' ', '-').lower()}.ttf"
    f.save(dst)
    print(f"  ok    {dst}  {pinned}  ({dst.stat().st_size // 1024} KB)")
