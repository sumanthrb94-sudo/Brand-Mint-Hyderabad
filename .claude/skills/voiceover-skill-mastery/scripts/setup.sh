#!/usr/bin/env bash
#
# One-time setup. Idempotent — safe to re-run; it skips whatever is already
# present. No API keys are involved at any point: the voice arrives as a file
# from outside, so nothing here generates speech.
#
#   bash scripts/setup.sh            # everything except the optional model
#   bash scripts/setup.sh --whisper  # also fetch Whisper (unknown scripts only)
#
set -euo pipefail

WANT_WHISPER=0
[ "${1:-}" = "--whisper" ] && WANT_WHISPER=1

MODELS="${MODELS_DIR:-models}"
SFX="${SFX_DIR:-sfx}"
REL="https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models"

say() { printf '\n\033[1m· %s\033[0m\n' "$1"; }

say "Python packages"
python3 -m pip install --quiet --upgrade imageio-ffmpeg sherpa-onnx pillow numpy
python3 - <<'PY'
import imageio_ffmpeg
print("  ffmpeg:", imageio_ffmpeg.get_ffmpeg_exe())
PY

say "Node packages"
[ -f package.json ] || npm init -y >/dev/null
npm install --silent --no-fund --no-audit playwright motion@13

# A container image often ships Chromium already. Downloading a second copy
# costs 450 MB for nothing, so look before fetching.
if [ -n "${CHROMIUM_PATH:-}" ] && [ -x "${CHROMIUM_PATH}" ]; then
  echo "  chromium: using CHROMIUM_PATH=$CHROMIUM_PATH"
elif [ -x /opt/pw-browsers/chromium ]; then
  echo "  chromium: found /opt/pw-browsers/chromium — export CHROMIUM_PATH to use it"
else
  npx --yes playwright install chromium
fi

say "Speech model — Zipformer gigaspeech (required, ~310 MB)"
mkdir -p "$MODELS"
Z="$MODELS/sherpa-onnx-zipformer-gigaspeech-2023-12-12"
if [ -d "$Z" ]; then
  echo "  already present"
else
  curl -sSL --retry 3 -o "$MODELS/z.tar.bz2" "$REL/sherpa-onnx-zipformer-gigaspeech-2023-12-12.tar.bz2"
  tar xjf "$MODELS/z.tar.bz2" -C "$MODELS"
  rm -f "$MODELS/z.tar.bz2"
  echo "  installed to $Z"
fi

if [ "$WANT_WHISPER" = 1 ]; then
  say "Speech model — Whisper small.en (optional, ~636 MB)"
  W="$MODELS/sherpa-onnx-whisper-small.en"
  if [ -d "$W" ]; then
    echo "  already present"
  else
    curl -sSL --retry 3 -o "$MODELS/w.tar.bz2" "$REL/sherpa-onnx-whisper-small.en.tar.bz2"
    tar xjf "$MODELS/w.tar.bz2" -C "$MODELS"
    rm -f "$MODELS/w.tar.bz2"
    echo "  installed to $W"
  fi
fi

say "Sound effects — CC0, ~500 KB"
bash "$(dirname "$0")/fetch_sfx.sh" "$SFX"

say "Checking"
python3 "$(dirname "$0")/doctor.py"
