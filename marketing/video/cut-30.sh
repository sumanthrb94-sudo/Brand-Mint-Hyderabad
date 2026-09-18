#!/usr/bin/env bash
# Cut the three Veo clips and the end card into one 30.00s Instagram reel.
#
#   ./marketing/video/cut-30.sh [out.mp4]
#
# ffmpeg comes from pip (`pip install imageio-ffmpeg`), same as compose.sh —
# there is no system ffmpeg on this box and no package.json to add one to.
#
# THE ARITHMETIC, because "about thirty seconds" is what gets a reel cropped:
#
#   before   8.0   0.0  ->  8.0
#   build    8.0   8.0  -> 16.0
#   after    8.0  16.0  -> 24.0
#   endcard  6.6  23.4  -> 30.0     crossfaded in over 0.6s
#                        ---------
#                        30.00 exactly
#
# The crossfade overlaps, so the end card is 6.6s of source to land 6.0s of
# screen time. Hard cuts between the three clips on purpose: they are three
# different scenes, and a dissolve between them would read as a slideshow.
#
# settb=1/24 on both xfade inputs is not decoration. concat hands on a
# 1/1000000 timebase and a looped still arrives at 1/24; xfade refuses to
# configure when they disagree, and reports it only as "Error reinitializing
# filters!". settb=AVTB fixes the mismatch but strips the frame rate, and
# xfade then rejects the input as variable rate ("current rate of 1/0 is
# invalid"), so the timebase has to be pinned to the frame rate, not reset.
#
# Veo returns 720x1280 (checked, every time so far). Everything is composited
# on a 1080x1920 timeline and the footage upscaled, per OMNI-30-VIDEO-PLAN.md:
# scaling the end card's type down instead would cost resolution on the only
# part of the reel anyone actually reads.
set -euo pipefail

# Repo root is two levels up from marketing/video, so the paths below read the
# same whether this is run from the root or from its own directory.
cd "$(dirname "$0")/../.."
OUT="${1:-marketing/video/out/brandmint-30s.mp4}"
IN=marketing/video/out
EC=marketing/video/assets/brandmint-endcard-9x16.png

for f in "$IN/before.mp4" "$IN/build.mp4" "$IN/after.mp4" "$EC"; do
  [ -f "$f" ] || { echo "missing: $f  (run gen-veo.mjs first)" >&2; exit 1; }
done

FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")

# Veo has returned every clip with an audio stream so far, but compose.sh was
# bitten by clips that had none — mapping [0:a] on a silent input fails
# outright. Check rather than assume.
for i in before build after; do
  n=$("$FF" -hide_banner -i "$IN/$i.mp4" 2>&1 | grep -c "Stream.*Audio" || true)
  [ "$n" -eq 0 ] && { echo "$i.mp4 has no audio stream; add anullsrc handling" >&2; exit 1; }
done

V="scale=1080:1920:flags=lanczos,fps=24,format=yuv420p,setpts=PTS-STARTPTS"

"$FF" -y -hide_banner -loglevel error \
  -i "$IN/before.mp4" -i "$IN/build.mp4" -i "$IN/after.mp4" \
  -framerate 24 -loop 1 -t 6 -i "$EC" \
  -filter_complex "\
[0:v]$V[v0];[1:v]$V[v1];[2:v]$V[v2];\
[3:v]scale=1080:1920,fps=24,format=yuv420p,fade=t=in:st=0:d=0.5,setpts=PTS-STARTPTS[v3];\
[v0][v1][v2][v3]concat=n=4:v=1:a=0[vout];\
[0:a][1:a][2:a]concat=n=3:v=0:a=1[ac];\
[ac]apad=whole_dur=30,afade=t=out:st=28.2:d=1.8,aresample=48000[aout]" \
  -map "[vout]" -map "[aout]" \
  -c:v libx264 -profile:v high -level 4.1 -preset slow -crf 20 \
  -pix_fmt yuv420p -r 24 -g 48 \
  -c:a aac -b:a 128k -ar 48000 -ac 2 \
  -movflags +faststart -t 30 \
  "$OUT"

DUR=$("$FF" -hide_banner -i "$OUT" 2>&1 | sed -n 's/.*Duration: \([0-9:.]*\).*/\1/p')
SZ=$(( $(stat -c%s "$OUT") / 1024 ))
echo "  ok  $OUT  ${SZ} KB  duration $DUR"
echo "      1080x1920 · 24fps · H.264 high · AAC 128k — Instagram Reels ready"
