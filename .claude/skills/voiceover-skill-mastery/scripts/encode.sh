#!/usr/bin/env bash
# frames + mixed audio -> delivery MP4
set -euo pipefail
OUT="${1:-out}"
FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
"$FF" -y -v error -stats \
  -framerate 30 -i "$OUT/frames/%05d.png" -i "$OUT/mix.wav" \
  -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -profile:v high -level 4.1 \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest \
  "$OUT/reel.mp4"
echo "wrote $OUT/reel.mp4"
