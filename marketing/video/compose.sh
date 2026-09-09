#!/usr/bin/env bash
# Composite a raw Flow clip into a finished 12s post.
#
#   ./compose.sh <clip.mp4> <talking|broll> <out.mp4> [captions.ass] [fontsdir]
#
# ffmpeg comes from pip: `pip install imageio-ffmpeg`. No system package needed.
#
# The one trap: a PNG passed with a bare -i is a single frame at t=0, so any
# alpha fade with st>0 evaluates before its own start and holds the overlay at
# zero opacity — the composite renders and looks completely clean, with every
# overlay silently invisible. Each still therefore gets `-loop 1 -framerate 24
# -t 12` to give it a real timeline.
set -euo pipefail

CLIP="${1:?clip.mp4}" ; MODE="${2:?talking|broll}" ; OUT="${3:?out.mp4}"
ASS="${4:-}" ; FONTS="${5:-}"
FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
A="$(cd "$(dirname "$0")/assets" && pwd)"

# 720p clips are upscaled to 1080x1920 rather than scaling the type down: the
# footage is soft either way, but the words stay sharp.
SUB=""
[ -n "$ASS" ] && SUB=",subtitles=${ASS}${FONTS:+:fontsdir=$FONTS}"
BASE="[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,\
tpad=stop_mode=clone:stop_duration=2,fps=24,setpts=PTS-STARTPTS${SUB}[base]"
BUG="[1:v]format=rgba,fade=t=in:st=0.3:d=0.5:alpha=1,fade=t=out:st=9.4:d=0.5:alpha=1[bug]"
AUD="[0:a]apad=whole_dur=12,afade=t=out:st=11.2:d=0.8[a]"
EC="scale=1080:1920,format=rgba,fade=t=in:st=10.0:d=0.35:alpha=1,setpts=PTS-STARTPTS[ec]"

if [ "$MODE" = "talking" ]; then
  "$FF" -y -loglevel error -i "$CLIP" \
    -loop 1 -framerate 24 -t 12 -i "$A/brandmint-ov-bug.png" \
    -loop 1 -framerate 24 -t 12 -i "$A/brandmint-ov-lower-third.png" \
    -loop 1 -framerate 24 -t 12 -i "$A/brandmint-endcard-9x16.png" \
    -filter_complex "$BASE;$BUG;[base][bug]overlay=0:0:shortest=0[b1];\
[2:v]format=rgba,fade=t=in:st=0.6:d=0.35:alpha=1,fade=t=out:st=3.9:d=0.35:alpha=1[lt];\
[b1][lt]overlay=0:0:shortest=0[b2];[3:v]$EC;\
[b2][ec]overlay=0:0:enable='gte(t,9.9)':shortest=0[v];$AUD" \
    -map "[v]" -map "[a]" -t 12 -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
    -c:a aac -b:a 160k "$OUT"
else
  "$FF" -y -loglevel error -i "$CLIP" \
    -loop 1 -framerate 24 -t 12 -i "$A/brandmint-ov-bug.png" \
    -loop 1 -framerate 24 -t 12 -i "$A/brandmint-ov-hook.png" \
    -loop 1 -framerate 24 -t 12 -i "$A/brandmint-ov-price.png" \
    -loop 1 -framerate 24 -t 12 -i "$A/brandmint-endcard-9x16.png" \
    -filter_complex "$BASE;$BUG;[base][bug]overlay=0:0:shortest=0[b1];\
[2:v]format=rgba,fade=t=in:st=0.8:d=0.4:alpha=1,fade=t=out:st=3.2:d=0.4:alpha=1[hook];\
[b1][hook]overlay=0:0:shortest=0[b2];\
[3:v]format=rgba,fade=t=in:st=5.4:d=0.4:alpha=1,fade=t=out:st=8.8:d=0.4:alpha=1[price];\
[b2][price]overlay=0:0:shortest=0[b3];[4:v]$EC;\
[b3][ec]overlay=0:0:enable='gte(t,9.9)':shortest=0[v];$AUD" \
    -map "[v]" -map "[a]" -t 12 -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
    -c:a aac -b:a 160k "$OUT"
fi
echo "wrote $OUT"
