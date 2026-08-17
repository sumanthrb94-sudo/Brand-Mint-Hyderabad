#!/usr/bin/env bash
# Build every voiceover into a finished, verified film.
#   bash build_all.sh <lane> <total>     # lane 0..total-1, so lanes run in parallel
set -uo pipefail

LANE="${1:-0}"; LANES="${2:-1}"
SKILL=/home/user/Brand-Mint-Hyderabad/.claude/skills/voiceover-skill-mastery
export SFX_DIR=/tmp/sfx
export ZIPFORMER_DIR=/tmp/asr/sherpa-onnx-zipformer-gigaspeech-2023-12-12
export MOTION=/tmp/fm/node_modules/motion/dist/motion.js
export CHROMIUM_PATH=/opt/pw-browsers/chromium
export NODE_PATH=/opt/node22/lib/node_modules
mkdir -p /tmp/films /tmp/deliver

i=0
for wav in /tmp/vo30/A*.wav; do
  i=$((i+1))
  [ $(( (i-1) % LANES )) -eq "$LANE" ] || continue

  stem=$(basename "$wav" .wav)                 # A09-brandmint-admin-works-iapetus-en-IN
  tag=${stem%%-*}                              # A09
  topic=$(echo "$stem" | sed 's/^A[0-9]*-brandmint-//; s/-iapetus-en-IN$//')
  out=/tmp/films/$tag
  [ -f "/tmp/deliver/$tag-$topic.mp4" ] && { echo "[$tag] already delivered"; continue; }

  mkdir -p "$out"; cp -f "$wav" "$out/vo.wav"
  script=$(python3 -c "import json;print(json.load(open('/tmp/vo30/txt/$stem.json'))['text'])")
  # The CTA word is whatever the read asks people to comment.
  cta=$(python3 -c "
import re,sys
m=re.search(r'comment\s+([A-Za-z]+)', '''$script''', re.I)
print((m.group(1) if m else 'STORE').upper())")
  title=$(python3 -c "print('$topic'.replace('-',' ').title())")

  echo "[$tag] $topic"
  python3 "$SKILL/scripts/transcribe_align.py" "$out/vo.wav" "$script" "$out" 2>&1 | tail -1 || continue
  python3 /tmp/vo30/autodirect.py "$out" "$title" "$cta" || continue
  node "$SKILL/scripts/render.mjs" "$out" > "$out/render.log" 2>&1 || { echo "[$tag] render FAILED"; continue; }
  python3 "$SKILL/scripts/build_mix.py" "$out" > /dev/null 2>&1 || { echo "[$tag] mix FAILED"; continue; }
  bash "$SKILL/scripts/encode.sh" "$out" > /dev/null 2>&1 || { echo "[$tag] encode FAILED"; continue; }

  if python3 "$SKILL/scripts/verify.py" "$out" "$out/vo.wav" > "$out/verify.txt" 2>&1; then
    cp "$out/reel.mp4" "/tmp/deliver/$tag-$topic.mp4"
    echo "[$tag] OK  $(grep -E '^A ' "$out/verify.txt" | head -1)"
  else
    echo "[$tag] VERIFY FAILED"; sed -n '1,12p' "$out/verify.txt"
  fi
  rm -rf "$out/frames"                        # ~1.3 GB per film; disk is finite
done
echo "LANE $LANE DONE"
