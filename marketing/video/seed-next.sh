#!/usr/bin/env bash
# Pull the last clean frame of a fragment, to seed the next one in Flow.
#
#   ./seed-next.sh F1.mp4 seeds/f2-seed.png [trim_seconds]
#
# Grabs slightly before the true end by default: the final frames of a
# generation are often the softest, and a soft seed propagates that softness
# into the whole next shot.
set -euo pipefail
CLIP="${1:?clip.mp4}" ; OUT="${2:?out.png}" ; TRIM="${3:-0.15}"
FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
DUR=$("$FF" -hide_banner -i "$CLIP" 2>&1 | grep -o 'Duration: [0-9:.]*' | cut -d' ' -f2 \
      | awk -F: '{print ($1*3600)+($2*60)+$3}')
AT=$(python3 -c "print(max(0, $DUR - $TRIM))")
mkdir -p "$(dirname "$OUT")"
"$FF" -y -loglevel error -ss "$AT" -i "$CLIP" -frames:v 1 -vf "scale=1080:1920:flags=lanczos" "$OUT"
echo "seed at ${AT}s -> $OUT"
