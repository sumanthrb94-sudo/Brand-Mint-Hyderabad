#!/usr/bin/env bash
#
# Turn a supplied clip into the JPEG frames the renderer composites.
#
#   bash scripts/prep_clip.sh clip1.mp4 out/clipA           # badge over the watermark
#   BADGE= bash scripts/prep_clip.sh own.mp4 out/clipA      # your own footage, no badge
#   CROP=13 bash scripts/prep_clip.sh clip1.mp4 out/clipA   # crop it off instead
#
# Two things this exists for.
#
# 1. Containerised Chromium generally cannot decode H.264, so a <video> element
#    renders black and nobody notices until the film is delivered. Frames always
#    work.
#
# 2. Generated clips arrive with a watermark burned into the bottom-right corner
#    — Gemini and Veo stamp a solid sparkle there and no prompt wording removes
#    it. By default this lays the Brand Mint monogram over that exact spot, which
#    covers the mark and brands the footage in one move. Covering beats cropping:
#    a crop costs the bottom of the frame and 13% of the width to an upscale.
#
#    Do not try to hide the mark with the film's grade — the grade is
#    semi-transparent and the mark is solid.
#
# The badge position is measured, not guessed: on a 1080x1920 frame the mark
# occupies roughly x 848-935, y 1703-1781. Re-measure if a generator moves it.
#
set -euo pipefail

SRC="${1:?usage: prep_clip.sh <clip.mp4> <out dir>}"
DST="${2:?usage: prep_clip.sh <clip.mp4> <out dir>}"
CROP="${CROP:-0}"                # percent off the bottom; 0 = keep the frame
FPS="${FPS:-30}"
WM_CX="${WM_CX:-891}"            # measured centre of the watermark, 1080x1920
WM_CY="${WM_CY:-1742}"
BADGE_SIZE="${BADGE_SIZE:-120}"

HERE="$(cd "$(dirname "$0")" && pwd)"
FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")

# BADGE unset -> build one. BADGE set to empty -> deliberately no badge.
if [ "${BADGE-unset}" = "unset" ]; then
  BADGE="$(dirname "$DST")/badge.png"
  python3 "$HERE/make_badge.py" "$BADGE" "$BADGE_SIZE" >/dev/null
fi

read -r W H < <("$FF" -hide_banner -i "$SRC" 2>&1 |
  sed -n 's/.*, \([0-9]\{2,\}\)x\([0-9]\{2,\}\).*/\1 \2/p' | head -1)
[ -n "${W:-}" ] || { echo "could not read dimensions from $SRC"; exit 1; }

KEEP=$(( H * (100 - CROP) / 100 )); KEEP=$(( KEEP / 2 * 2 ))
SCALED_W=$(( (W * 1920 / KEEP + 1) / 2 * 2 ))
[ "$SCALED_W" -lt 1080 ] && SCALED_W=1080
OFF=$(( (SCALED_W - 1080) / 2 ))
CHAIN="crop=${W}:${KEEP}:0:0,scale=${SCALED_W}:1920:flags=lanczos,crop=1080:1920:${OFF}:0,fps=${FPS}"

rm -rf "$DST"; mkdir -p "$DST"
if [ -n "${BADGE:-}" ]; then
  read -r BW BH < <(python3 -c "
from PIL import Image; im=Image.open('$BADGE'); print(im.size[0], im.size[1])")
  X=$(( WM_CX - BW / 2 )); Y=$(( WM_CY - BH / 2 ))
  "$FF" -y -v error -i "$SRC" -i "$BADGE" \
    -filter_complex "[0:v]${CHAIN}[v];[v][1:v]overlay=${X}:${Y}:format=auto" \
    -q:v 3 "$DST/f_%04d.jpg"
  echo "$(ls "$DST" | wc -l) frames in $DST  (${W}x${H} source, badge ${BW}x${BH} at ${X},${Y})"
else
  "$FF" -y -v error -i "$SRC" -vf "$CHAIN" -q:v 3 "$DST/f_%04d.jpg"
  echo "$(ls "$DST" | wc -l) frames in $DST  (${W}x${H} source, no badge, ${CROP}% cropped)"
fi
echo "look at a processed frame's corner before building — confirm the mark is gone"
