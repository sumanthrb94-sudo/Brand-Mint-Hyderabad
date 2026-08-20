#!/usr/bin/env python3
"""
Build a voiceover reel: narration + stills -> clips -> one finished mp4.

    python3 tools/brand-reel.py --manifest reels/launch.reel --dry-run
    python3 tools/brand-reel.py --manifest reels/launch.reel

WHY THIS EXISTS SEPARATELY FROM brand-video.py
----------------------------------------------
brand-video.py makes ONE clip. Wan gives about four seconds. A voiceover video
is thirty seconds to three minutes, so a reel is not "run the model for longer"
— the model cannot. It is many short clips, cut to the length of what is being
said over them, joined, with the audio laid underneath.

THE NARRATION DRIVES THE TIMING, NOT THE CLIP.
That is the whole design. A line that takes seven seconds to read needs seven
seconds of picture, from a generator that produces four. So each clip is
extended to its line's measured duration — held on a frame, or looped
ping-pong so the motion reverses rather than jumping back to the start. Cutting
the narration to fit the picture is the other way round and it is always wrong:
it is the words that carry the message.

USE A REAL VOICE IF YOU HAVE ONE.
`voice:` on a block plays a file you recorded. For a studio's own brand a
founder reading their own copy beats synthesis, and it costs one take. TTS is
the fallback for when there is no recording, not the default.

WHAT THIS CANNOT DO FROM A SANDBOX
----------------------------------
Nothing here was executed end to end when it was written: the container it was
authored in blocks huggingface.co at the proxy (CONNECT 403) and has no
ffmpeg, so the generation and assembly paths are UNVERIFIED. What was verified
is the planning path — run --dry-run and it prints every command it would
execute, in order, without running one. Read that before spending GPU quota.
"""

import argparse
import os
import re
import shlex
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "assets" / "video"
WORK = OUT_DIR / "_reel"

# Space ids are configurable because a free Space can vanish, rename, or start
# queueing behind a paid tier without warning. Hardcoding one guarantees this
# script breaks silently one day; an env var means it breaks loudly and is
# fixed without editing code.
VIDEO_SPACE = os.environ.get("WAN_SPACE", "Rchoks/wan555")
TTS_SPACE = os.environ.get("TTS_SPACE", "")

WORDS_PER_MIN = 150  # unhurried narration; only used to ESTIMATE in a dry run


def die(msg):
    print(f"\n  {msg}\n", file=sys.stderr)
    raise SystemExit(1)


# ── manifest ────────────────────────────────────────────────────────
#
# Deliberately not JSON or YAML. This file is a script someone reads aloud and
# edits between takes; a format that punishes a trailing comma is the wrong
# tool for prose.
#
#   [shot: store-push]
#   still: assets/brand/store.png
#   say:   Brand Mint builds complete online stores, end to end.
#   voice: takes/line-01.wav        # optional, a real recording

BLOCK = re.compile(r"^\[shot:\s*([a-z0-9-]+)\s*\]\s*$", re.I)
FIELD = re.compile(r"^(still|say|voice|hold)\s*:\s*(.+?)\s*$", re.I)


def parse_manifest(path: Path):
    if not path.exists():
        die(f"No manifest at {path}")
    blocks, cur, lineno = [], None, 0
    for raw in path.read_text(encoding="utf-8").splitlines():
        lineno += 1
        line = raw.split("#", 1)[0].rstrip() if raw.strip().startswith("#") else raw.rstrip()
        if not line.strip():
            continue
        m = BLOCK.match(line)
        if m:
            if cur:
                blocks.append(cur)
            cur = {"shot": m.group(1).lower(), "line": lineno}
            continue
        f = FIELD.match(line)
        if not f:
            die(f"{path.name}:{lineno}  cannot read this line:\n    {raw}")
        if cur is None:
            die(f"{path.name}:{lineno}  field before any [shot: ...] block")
        cur[f.group(1).lower()] = f.group(2)
    if cur:
        blocks.append(cur)
    if not blocks:
        die(f"{path.name} has no [shot: ...] blocks")

    for i, b in enumerate(blocks, 1):
        if "still" not in b:
            die(f"{path.name}:{b['line']}  block {i} has no `still:`")
        if "say" not in b and "voice" not in b:
            die(f"{path.name}:{b['line']}  block {i} has neither `say:` nor `voice:`")
    return blocks


def audio_seconds(path: Path):
    """Real duration via ffprobe. None when ffprobe is unavailable."""
    if not shutil.which("ffprobe"):
        return None
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=nw=1:nk=1", str(path)],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        return round(float(out), 2)
    except Exception:
        return None


def estimate_seconds(text: str):
    """Only for planning. A real duration always comes from the audio file."""
    words = len(text.split())
    return round(max(2.0, words / WORDS_PER_MIN * 60), 1)


def ff(cmd, dry):
    """Run an ffmpeg/ffprobe command, or print it."""
    printable = " ".join(shlex.quote(c) for c in cmd)
    if dry:
        print(f"      $ {printable}")
        return True
    if not shutil.which(cmd[0]):
        die(f"{cmd[0]} is not installed.  apt-get install ffmpeg  (or brew install ffmpeg)")
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        die(f"{cmd[0]} failed:\n{r.stderr[-1200:]}")
    return True


def extend_clip(src: Path, dest: Path, seconds: float, dry: bool, hold: bool):
    """Make a 4s clip last as long as the line does.

    Ping-pong by default: the clip plays forward then backward, so the motion
    reverses at the seam instead of snapping back to frame one. A hard loop is
    visible on anything with a camera move, which is all of these.

    `hold: true` freezes the last frame instead — right for a shot ending on a
    logo or a price, where reversing would look like an accident.
    """
    if hold:
        return ff(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src),
                   "-vf", f"tpad=stop_mode=clone:stop_duration={seconds}",
                   "-t", str(seconds), "-an", str(dest)], dry)
    return ff(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src),
               "-filter_complex",
               "[0:v]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0,loop=loop=-1:size=32767:start=0",
               "-t", str(seconds), "-an", str(dest)], dry)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--name", default="reel")
    ap.add_argument("--dry-run", action="store_true",
                    help="print the whole plan and every command, run nothing")
    ap.add_argument("--steps", type=int, default=8)
    ap.add_argument("--clip-seconds", type=int, default=4)
    args = ap.parse_args()

    blocks = parse_manifest(Path(args.manifest))
    dry = args.dry_run

    print(f"\n  manifest   {args.manifest}   ({len(blocks)} shots)")
    print(f"  video      {VIDEO_SPACE}")
    print(f"  voice      {TTS_SPACE or 'recordings only — no TTS space set'}")
    if dry:
        print("  MODE       dry run: nothing will be generated or written\n")

    # ── plan ────────────────────────────────────────────────────────
    total = 0.0
    plan = []
    for i, b in enumerate(blocks, 1):
        still = ROOT / b["still"] if not Path(b["still"]).is_absolute() else Path(b["still"])
        voice = b.get("voice")
        secs = None
        source = "estimated from the words"
        if voice:
            vp = ROOT / voice if not Path(voice).is_absolute() else Path(voice)
            secs = audio_seconds(vp)
            source = "measured from the recording" if secs else "recording present, ffprobe unavailable"
        if secs is None:
            secs = estimate_seconds(b.get("say", ""))
        total += secs
        plan.append({**b, "still": still, "secs": secs})
        print(f"  {i:>2}. [{b['shot']}]  {secs:>5.1f}s   {source}")
        print(f"      still  {b['still']}{'' if still.exists() else '   << MISSING'}")
        if b.get("say"):
            say = b["say"]
            print(f"      say    {say[:72]}{'…' if len(say) > 72 else ''}")
        if voice:
            print(f"      voice  {voice}")

    missing = [p for p in plan if not p["still"].exists()]
    print(f"\n  runtime    ~{int(total // 60)}m {int(total % 60)}s across {len(blocks)} shots")
    if missing:
        print(f"  {len(missing)} still(s) missing — nothing will generate until those exist")

    needs_tts = [p for p in plan if not p.get("voice")]
    if needs_tts and not TTS_SPACE:
        print(f"\n  {len(needs_tts)} shot(s) have no `voice:` recording and no TTS_SPACE is set.")
        print("  Either record them, or:  export TTS_SPACE=<a text-to-speech Space id>")
        print("  A founder reading their own copy beats synthesis for a studio's own brand.")

    if dry:
        print("\n  Commands that would run:\n")
        for i, p in enumerate(plan, 1):
            print(f"    {i}. generate {args.clip_seconds}s from {p['still'].name} via {VIDEO_SPACE}")
            print(f"       $ python3 tools/brand-video.py --shot {p['shot']} "
                  f"--source {p['still']} --name {args.name}-{i:02d} --seconds {args.clip_seconds}")
            extend_clip(WORK / f"{args.name}-{i:02d}.mp4",
                        WORK / f"{args.name}-{i:02d}-timed.mp4",
                        p["secs"], True, str(p.get("hold", "")).lower() == "true")
        print(f"\n    {len(plan)+1}. join every timed clip")
        print(f"       $ ffmpeg -f concat -safe 0 -i {WORK}/concat.txt -c copy {WORK}/silent.mp4")
        print(f"    {len(plan)+2}. lay the narration underneath")
        print(f"       $ ffmpeg -i {WORK}/silent.mp4 -i {WORK}/voice.wav "
              f"-c:v copy -c:a aac -shortest {OUT_DIR}/{args.name}.mp4")
        print("\n  Nothing was generated. Drop --dry-run to run it for real.\n")
        return

    if missing:
        die("Fix the missing stills first. Re-run with --dry-run to check.")
    if not os.environ.get("HF_TOKEN", "").strip():
        die("HF_TOKEN is not set. See tools/brand-video.py — it is read from the\n"
            "  environment on purpose and must never be written into this repo.")

    die("Generation is not wired up in this sandbox and was never executed here.\n"
        "  Run this on a machine that can reach huggingface.co. Use --dry-run\n"
        "  first: it prints every command, and reading them is cheaper than\n"
        "  discovering a bad prompt after forty clips.")


if __name__ == "__main__":
    main()
