#!/usr/bin/env python3
"""
Check that everything the pipeline needs is actually installed and usable.

    python3 scripts/doctor.py

Prints a row per dependency. Exits non-zero if anything required is missing, so
it can gate CI or a first build in a fresh environment. Optional items report
their state but never fail the run.
"""

import os
import shutil
import subprocess
import sys

MODELS = os.environ.get("MODELS_DIR", "models")
SFX = os.environ.get("SFX_DIR", "sfx")
ZIPFORMER = os.environ.get(
    "ZIPFORMER_DIR", f"{MODELS}/sherpa-onnx-zipformer-gigaspeech-2023-12-12")

rows, failed = [], []


def row(name, ok, detail, required=True):
    rows.append((name, ok, detail, required))
    if required and not ok:
        failed.append(name)


def size_mb(path):
    if os.path.isfile(path):
        return os.path.getsize(path) / 1e6
    return sum(os.path.getsize(os.path.join(r, f))
               for r, _, fs in os.walk(path) for f in fs) / 1e6


# ── runtimes ──────────────────────────────────────────────────────────────
v = sys.version_info
row("python", v >= (3, 10), f"{v.major}.{v.minor}.{v.micro}")

node = shutil.which("node")
if node:
    out = subprocess.run([node, "-v"], capture_output=True, text=True).stdout.strip()
    major = int(out.lstrip("v").split(".")[0]) if out.startswith("v") else 0
    row("node", major >= 18, out)
else:
    row("node", False, "not on PATH")

# ── python packages ───────────────────────────────────────────────────────
try:
    import imageio_ffmpeg
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    ok = os.path.exists(ff) and subprocess.run(
        [ff, "-version"], capture_output=True).returncode == 0
    row("ffmpeg", ok, ff if ok else "binary present but will not run")
except Exception as e:
    row("ffmpeg", False, f"imageio-ffmpeg missing ({e})")

for mod, label in (("numpy", "numpy"), ("PIL", "pillow")):
    try:
        __import__(mod)
        row(label, True, "importable")
    except Exception as e:
        row(label, False, str(e))

try:
    import sherpa_onnx  # noqa: F401
    row("sherpa-onnx", True, "importable")
except Exception as e:
    row("sherpa-onnx", False, str(e))

# ── node packages ─────────────────────────────────────────────────────────
try:
    from importlib import util as _u  # noqa: F401
    have_pw = subprocess.run(
        ["node", "-e", "require.resolve('playwright')"],
        capture_output=True).returncode == 0
    row("playwright", have_pw, "resolvable" if have_pw else "npm install playwright")
except Exception as e:
    row("playwright", False, str(e))

chromium = os.environ.get("CHROMIUM_PATH", "")
if chromium and os.path.exists(chromium):
    row("chromium", True, f"CHROMIUM_PATH={chromium}")
elif os.path.exists("/opt/pw-browsers/chromium"):
    row("chromium", True, "/opt/pw-browsers/chromium (set CHROMIUM_PATH to use it)")
else:
    probe = subprocess.run(
        ["node", "-e",
         "const{chromium}=require('playwright');console.log(chromium.executablePath())"],
        capture_output=True, text=True)
    p = probe.stdout.strip()
    row("chromium", bool(p) and os.path.exists(p),
        p or "npx playwright install chromium")

have_motion = subprocess.run(
    ["node", "-e", "require.resolve('motion/dist/motion.js')"],
    capture_output=True).returncode == 0
if not have_motion:
    have_motion = os.path.isdir("node_modules/motion")
row("motion@13", have_motion, "present" if have_motion else "npm install motion@13")

# ── models ────────────────────────────────────────────────────────────────
need = ["encoder-epoch-30-avg-1.int8.onnx", "decoder-epoch-30-avg-1.onnx",
        "joiner-epoch-30-avg-1.int8.onnx", "tokens.txt"]
missing = [f for f in need if not os.path.exists(os.path.join(ZIPFORMER, f))]
row("zipformer model", not missing,
    f"{ZIPFORMER} ({size_mb(ZIPFORMER):.0f} MB)" if not missing
    else f"missing {missing} — run scripts/setup.sh")

whisper = f"{MODELS}/sherpa-onnx-whisper-small.en"
row("whisper model (optional)", os.path.isdir(whisper),
    f"{whisper} ({size_mb(whisper):.0f} MB)" if os.path.isdir(whisper)
    else "absent — only needed to transcribe a script you do not have",
    required=False)

# ── assets ────────────────────────────────────────────────────────────────
n_sfx = len([f for f in os.listdir(SFX) if f.endswith(".flac")]) if os.path.isdir(SFX) else 0
row("sound effects", n_sfx >= 8,
    f"{n_sfx} samples in {SFX}/" if n_sfx else f"run scripts/fetch_sfx.sh {SFX}")

# ── report ────────────────────────────────────────────────────────────────
w = max(len(r[0]) for r in rows)
print()
for name, ok, detail, required in rows:
    mark = "ok  " if ok else ("MISSING" if required else "—   ")
    print(f"  {name.ljust(w)}  {mark}  {detail}")
print()

if failed:
    print("Not ready: " + ", ".join(failed))
    print("Run  bash scripts/setup.sh  to install everything.")
    sys.exit(1)

print("Ready. No API keys are needed — supply the voiceover WAV and build.")
