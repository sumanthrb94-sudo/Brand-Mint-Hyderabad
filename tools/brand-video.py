#!/usr/bin/env python3
"""
Wan 2.2 image-to-video, for Brand Mint's own brand assets.

    export HF_TOKEN=...            # read scope, from huggingface.co/settings/tokens
    python3 tools/brand-video.py --shot store-push
    python3 tools/brand-video.py --list

Takes a still, adds restrained motion, writes an mp4 plus a poster frame to
assets/video/.

WHY THE TOKEN IS NOT IN THIS FILE
---------------------------------
The sample this is adapted from assigned the token as a placeholder literal
at the top of the file. That is the one change that had to be made before
anything else, because
THIS REPOSITORY IS PUBLIC (CLAUDE.md section 2). A token written into a file
here is published permanently, in the git history, to anyone who looks — and
git history is not fixed by deleting the line afterwards.

Section 3 records what that costs: a Firebase service-account key was pasted
once, and the standing conclusion is that a key which has been pasted is a key
that must be rotated, regardless of what happened to the file. The same is true
of a Hugging Face token. So this reads the environment and refuses to run
without it, and tests/secrets.test.mjs fails the suite if a token-shaped string
ever appears in a tracked file.

WHAT THIS IS AND IS NOT FOR
---------------------------
Brand Mint sells ecommerce stores, so the honest subjects are the studio's own
brand surfaces and generic product/store imagery it owns.

It must NOT be used to fabricate a client result. A generated video of a busy
storefront, or of a dashboard showing invented numbers, is the moving version
of the "Conversion 7.1%" tile that was removed from the home page hero — a
claim nobody can stand behind. Motion is allowed to make a real thing look
good; it is not allowed to assert something untrue.

PERFORMANCE
-----------
The frontend shortlist is explicit: lazy-load heavy hero visuals, and a premium
look must not mean oversized media and degraded mobile loading. So this caps
resolution, keeps clips short, and always writes a poster frame — a video hero
without a poster is a grey rectangle on a slow connection.
"""

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "assets" / "video"
SPACE = os.environ.get("WAN_SPACE", "Rchoks/wan555")

# Longest edge fed to the model. Bigger costs time and buys nothing at the size
# these clips are actually displayed.
MAX_EDGE = 1280

# Restrained on purpose. The shortlist's guardrail is that motion should
# amplify the message rather than become it, and that decorative-only animation
# is an anti-pattern. Every prompt here holds the subject still and moves the
# light, the camera, or one secondary element — never the product itself, which
# would read as a different product.
SHOTS = {
    "store-push": {
        "prompt": (
            "very slow camera push toward the screen, subtle parallax, "
            "interface and text remain perfectly still and legible, "
            "soft light drifting across the surface, no warping, no morphing text"
        ),
        "note": "A store or admin screen. Text must stay readable — check it frame by frame.",
    },
    "product-turn": {
        "prompt": (
            "product stays centred and still, slow soft studio light sweeping "
            "left to right, gentle shadow shift, background unchanged, "
            "no deformation of the product silhouette"
        ),
        "note": "A single product on a plain background.",
    },
    "desk-ambient": {
        "prompt": (
            "static camera, shallow depth of field, faint steam rising, "
            "hands absent, objects on the desk remain still, "
            "natural window light with slow subtle variation"
        ),
        "note": "Workspace texture for an about or process section.",
    },
    "logo-settle": {
        "prompt": (
            "mark holds dead centre and does not deform, slow gradient shift "
            "behind it, faint grain, extremely subtle scale settle, "
            "no rotation, no letterform distortion"
        ),
        "note": "The brand mark. Watch for letterform warping — I2V models are bad at type.",
    },
}


def die(msg: str) -> "NoReturn":
    print(f"\n  {msg}\n", file=sys.stderr)
    raise SystemExit(1)


def token() -> str:
    """The token, from the environment and nowhere else."""
    tok = os.environ.get("HF_TOKEN", "").strip()
    if not tok:
        die(
            "HF_TOKEN is not set.\n\n"
            "  export HF_TOKEN=...   (read scope, huggingface.co/settings/tokens)\n\n"
            "  Do NOT paste it into this file or any other file in this repo.\n"
            "  The repository is public: a token committed here is published\n"
            "  permanently in the git history, and deleting the line later does\n"
            "  not remove it. If you have already pasted one anywhere, treat it\n"
            "  as spent and revoke it."
        )
    if tok.startswith("hf_x") or set(tok[3:]) <= {"x"}:
        die("HF_TOKEN is still the placeholder from the sample script.")
    return tok


def prepare(source: Path) -> Path:
    """Downscale to a JPEG. Wan trips on webp uploads."""
    try:
        from PIL import Image
    except ImportError:
        die("Pillow is missing.  pip install gradio-client pillow")
    if not source.exists():
        die(f"No such file: {source}")

    img = Image.open(source).convert("RGB")
    before = img.size
    img.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)
    tmp = OUT_DIR / "_input.jpg"
    tmp.parent.mkdir(parents=True, exist_ok=True)
    img.save(tmp, quality=92)
    print(f"  prepared  {before[0]}x{before[1]} -> {img.size[0]}x{img.size[1]}")
    return tmp


def poster(video: Path) -> None:
    """First frame as a poster. A video hero without one is a grey rectangle
    until the clip downloads, which on a phone is most of the visit."""
    if not shutil.which("ffmpeg"):
        print("  poster   skipped — ffmpeg not installed")
        return
    out = video.with_suffix(".jpg")
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(video),
         "-vframes", "1", "-q:v", "3", str(out)],
        check=False,
    )
    if out.exists():
        print(f"  poster   {out.relative_to(ROOT)}  ({out.stat().st_size // 1024} KB)")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("--shot", choices=sorted(SHOTS), help="which prompt to use")
    ap.add_argument("--source", help="still image to animate")
    ap.add_argument("--name", help="output basename (default: the shot name)")
    ap.add_argument("--seconds", type=int, default=4)
    ap.add_argument("--steps", type=int, default=8)
    ap.add_argument("--list", action="store_true", help="show the shots and exit")
    args = ap.parse_args()

    if args.list or not args.shot:
        print("\n  Shots:\n")
        for k, v in sorted(SHOTS.items()):
            print(f"    {k:<14} {v['note']}")
            print(f"    {'':<14} \033[2m{v['prompt'][:78]}…\033[0m\n")
        print("  python3 tools/brand-video.py --shot <name> --source <image>\n")
        return

    if not args.source:
        die("--source is required. Point it at the still you want to animate.")

    tok = token()
    shot = SHOTS[args.shot]
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    try:
        from gradio_client import Client, handle_file
    except ImportError:
        die("gradio-client is missing.  pip install gradio-client pillow")

    tmp = prepare(Path(args.source))
    print(f"  shot     {args.shot}")
    print(f"  space    {SPACE}")

    client = Client(SPACE, hf_token=tok)
    # If this errors on api_name, the Space changed its endpoint:
    #   print(client.view_api())
    result = client.predict(
        input_image=handle_file(str(tmp)),
        prompt=shot["prompt"],
        duration_seconds=args.seconds,
        steps=args.steps,
        randomize_seed=True,
        api_name="/generate_video",
    )

    video = result[0] if isinstance(result, (list, tuple)) else result
    if isinstance(video, dict):
        video = video.get("video") or video.get("path")
    if not video:
        die(f"The Space returned no video. Raw result: {result!r}")

    dest = OUT_DIR / f"{args.name or args.shot}.mp4"
    shutil.copy(video, dest)
    tmp.unlink(missing_ok=True)

    size_kb = dest.stat().st_size // 1024
    print(f"  video    {dest.relative_to(ROOT)}  ({size_kb} KB)")
    poster(dest)

    if size_kb > 2048:
        print(
            f"\n  {size_kb} KB is heavy for a hero. Compress before shipping:\n"
            f"    ffmpeg -i {dest.relative_to(ROOT)} -vcodec libx264 -crf 30 "
            f"-preset slow -an -movflags +faststart out.mp4"
        )

    print(
        "\n  Before this goes on the site — watch it once, at full size:\n"
        "    - does any text warp, morph or become unreadable?\n"
        "    - does it imply a result, a customer or a number that is not real?\n"
        "  If either is true, it does not ship. Re-roll or drop the shot.\n"
    )


if __name__ == "__main__":
    main()
