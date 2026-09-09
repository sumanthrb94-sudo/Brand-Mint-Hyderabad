#!/usr/bin/env bash
# Composite a raw Flow clip into a finished 12s post.
#
#   ./compose.sh <clip.mp4> <talking|broll|night> <out.mp4> [captions.ass] [fontsdir]
#
# ffmpeg comes from pip: `pip install imageio-ffmpeg`. No system package needed.
#
# Two traps encoded here:
#
#  1. A PNG passed with a bare -i is one frame at t=0, so an alpha fade with
#     st>0 is evaluated before its own start and pins the overlay at zero
#     opacity. The render succeeds, warns about nothing, and every overlay is
#     silently absent. Each still therefore gets a real 12s timeline.
#
#  2. Flow returns some clips with no audio stream at all. Mapping [0:a] then
#     fails outright, so silence is generated when the input has none.
set -euo pipefail

CLIP="${1:?clip.mp4}" ; MODE="${2:?talking|broll|night}" ; OUT="${3:?out.mp4}"
ASS="${4:-}" ; FONTS="${5:-}"
FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
A="$(cd "$(dirname "$0")/assets" && pwd)"

HAS_AUDIO=$("$FF" -hide_banner -i "$CLIP" 2>&1 | grep -c "Stream.*Audio" || true)
SILENT_IN=() ; AFILTER="[0:a]apad=whole_dur=12,afade=t=out:st=11.2:d=0.8[a]"
if [ "$HAS_AUDIO" -eq 0 ]; then
  SILENT_IN=(-f lavfi -t 12 -i "anullsrc=r=48000:cl=stereo")
  AFILTER=""   # the generated silence is mapped directly
fi

SUB="" ; [ -n "$ASS" ] && SUB=",subtitles=${ASS}${FONTS:+:fontsdir=$FONTS}"
# 720p clips are upscaled rather than scaling the type down: the footage is soft
# either way, but the words are what get read.
BASE="[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,\
tpad=stop_mode=clone:stop_duration=2,fps=24,setpts=PTS-STARTPTS${SUB}[base]"
BUG="[1:v]format=rgba,fade=t=in:st=0.3:d=0.5:alpha=1,fade=t=out:st=9.4:d=0.5:alpha=1[bug]"
EC="scale=1080:1920,format=rgba,fade=t=in:st=10.0:d=0.35:alpha=1,setpts=PTS-STARTPTS[ec]"
ov () { echo "[$1:v]format=rgba,fade=t=in:st=$2:d=0.4:alpha=1,fade=t=out:st=$3:d=0.4:alpha=1[$4]"; }

case "$MODE" in
  talking) L2="$A/brandmint-ov-lower-third.png" ; L3="" ;
           F2=$(echo "[2:v]format=rgba,fade=t=in:st=0.6:d=0.35:alpha=1,fade=t=out:st=3.9:d=0.35:alpha=1[o2]") ; F3="" ;;
  broll)   L2="$A/brandmint-ov-hook.png" ; L3="$A/brandmint-ov-price.png" ;
           F2=$(ov 2 0.8 3.2 o2) ; F3=$(ov 3 5.4 8.8 o3) ;;
  night)   L2="$A/brandmint-ov-features.png" ; L3="$A/brandmint-ov-cta.png" ;
           # fades land in the gaps between the phone's glow pulses
           F2=$(ov 2 0.8 3.1 o2) ; F3=$(ov 3 5.7 8.3 o3) ;;
  *) echo "mode must be talking|broll|night" >&2 ; exit 1 ;;
esac

INPUTS=(-i "$CLIP" -loop 1 -framerate 24 -t 12 -i "$A/brandmint-ov-bug.png"
        -loop 1 -framerate 24 -t 12 -i "$L2")
CHAIN="$BASE;$BUG;[base][bug]overlay=0:0:shortest=0[b1];$F2;[b1][o2]overlay=0:0:shortest=0[b2]"
LAST=b2 ; ECIDX=3
if [ -n "$L3" ]; then
  INPUTS+=(-loop 1 -framerate 24 -t 12 -i "$L3")
  CHAIN="$CHAIN;$F3;[b2][o3]overlay=0:0:shortest=0[b3]" ; LAST=b3 ; ECIDX=4
fi
INPUTS+=(-loop 1 -framerate 24 -t 12 -i "$A/brandmint-endcard-9x16.png")
CHAIN="$CHAIN;[$ECIDX:v]$EC;[$LAST][ec]overlay=0:0:enable='gte(t,9.9)':shortest=0[v]"

if [ "$HAS_AUDIO" -eq 0 ]; then
  AIDX=$((ECIDX+1))
  "$FF" -y -loglevel error "${INPUTS[@]}" "${SILENT_IN[@]}" -filter_complex "$CHAIN" \
    -map "[v]" -map "$AIDX:a" -t 12 -r 24 -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
    -c:a aac -b:a 128k "$OUT"
else
  "$FF" -y -loglevel error "${INPUTS[@]}" -filter_complex "$CHAIN;$AFILTER" \
    -map "[v]" -map "[a]" -t 12 -r 24 -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
    -c:a aac -b:a 160k "$OUT"
fi
echo "wrote $OUT"
