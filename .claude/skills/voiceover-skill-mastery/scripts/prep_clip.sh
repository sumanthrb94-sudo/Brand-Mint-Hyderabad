#!/usr/bin/env bash
#
# Turn a supplied clip into the JPEG frames the renderer composites.
#
#   bash scripts/prep_clip.sh clip1.mp4 out/clipA          # crops the watermark
#   bash scripts/prep_clip.sh clip1.mp4 out/clipA 0        # keeps the full frame
#
# Two things this exists for.
#
# 1. Containerised Chromium generally cannot decode H.264, so a <video> element
#    renders black and nobody notices until the film is delivered. Frames always
#    work.
#
# 2. Generated clips arrive with a watermark burned into the bottom-right corner
#    — Gemini/Veo stamp a sparkle there, and no prompt wording removes it. The
#    default crops the bottom 13% away before scaling, which loses the bottom
#    edge and 13% of the width but takes the mark with it. Covering it with the
#    grade is not enough: the grade is semi-transparent and the mark is solid.
#
# Pass a third argument of 0 to skip the crop for footage you shot yourself.
#
set -euo pipefail

SRC="${1:?usage: prep_clip.sh <clip.mp4> <out dir> [crop_bottom_pct]}"
DST="${2:?usage: prep_clip.sh <clip.mp4> <out dir> [crop_bottom_pct]}"
PCT="${3:-13}"
FPS="${FPS:-30}"

FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
read -r W H < <("$FF" -hide_banner -i "$SRC" 2>&1 |
  sed -n 's/.*, \([0-9]\{2,\}\)x\([0-9]\{2,\}\).*/\1 \2/p' | head -1)
[ -n "${W:-}" ] || { echo "could not read dimensions from $SRC"; exit 1; }

KEEP=$(( H * (100 - PCT) / 100 ))
KEEP=$(( KEEP / 2 * 2 ))

# Crop the bottom off, then scale to *cover* 1080x1920 and centre-crop the sides.
SCALED_W=$(( 1080 > 0 ? (W * 1920 / KEEP + 1) / 2 * 2 : 0 ))
if [ "$SCALED_W" -lt 1080 ]; then SCALED_W=1080; fi
OFF=$(( (SCALED_W - 1080) / 2 ))

rm -rf "$DST"; mkdir -p "$DST"
"$FF" -y -v error -i "$SRC" \
  -vf "crop=${W}:${KEEP}:0:0,scale=${SCALED_W}:1920:flags=lanczos,crop=1080:1920:${OFF}:0,fps=${FPS}" \
  -q:v 3 "$DST/f_%04d.jpg"

echo "$(ls "$DST" | wc -l) frames in $DST  (source ${W}x${H}, kept top ${KEEP}px, cropped ${PCT}%)"
echo "look at the last frame before using it — confirm the corner is clean"
