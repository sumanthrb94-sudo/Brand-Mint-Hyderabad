#!/usr/bin/env bash
# Build the product-demo cut: real screen recordings inside a phone frame.
#
#   python3 -m http.server 8000
#   NODE_PATH=$(npm root -g) node marketing/video/rec-screen.cjs
#   NODE_PATH=$(npm root -g) node marketing/video/render-frame.cjs
#   ./marketing/video/cut-screen.sh [out.mp4] [vo.wav]
#
# Nothing in this film is generated. The screen is the actual site at the
# actual prices, captured at phone size by Playwright, so there is no invented
# UI to go wrong and no claim on screen that is not already on brandmintstudios.in.
# That was the problem with the Veo phone shots: asking a video model to draw a
# product always produces something that reads as fake, because it is.
#
#   home     5.0    the hero and the proof panel
#   tiers    5.0    the four store tiers
#   pricing  5.0    every price in full
#   endcard  6.0
#                  ------
#                  21.0s
#
# GEOMETRY IS SHARED WITH phone-frame.html. The screen cutout there is
# 704x1524 at (188,210) on a 1080x1920 canvas; the numbers below have to match
# or the footage sits proud of the bezel.
set -euo pipefail

cd "$(dirname "$0")/../.."
OUT="${1:-marketing/video/out/brandmint-screen.mp4}"
VO="${2:-marketing/video/out/vo-ugc-zubenelgenubi.wav}"
FRAME=marketing/video/assets/phone-frame-9x16.png
EC=marketing/video/assets/brandmint-endcard-9x16.png
SRC=marketing/video/out/screen

SCREEN_W=704 ; SCREEN_H=1524 ; SCREEN_X=188 ; SCREEN_Y=210
TAKES=(home tiers pricing)
SECS=5
ECDUR=6
TOTAL=$(( ${#TAKES[@]} * SECS + ECDUR ))

for t in "${TAKES[@]}"; do
  [ -d "$SRC/$t" ] || { echo "missing frames: $SRC/$t  (run rec-screen.cjs)" >&2; exit 1; }
done
[ -f "$FRAME" ] || { echo "missing: $FRAME  (run render-frame.cjs)" >&2; exit 1; }

FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")

INPUTS=() ; FC="" ; LABELS="" ; i=0
for t in "${TAKES[@]}"; do
  INPUTS+=(-framerate 24 -i "$SRC/$t/f%04d.png")
  # The capture is 1170x2532 (390x844 at DPR 3) and the cutout is 704x1524 —
  # the same 0.462 aspect, so this is a clean downscale with no crop.
  FC="${FC}[$i:v]scale=${SCREEN_W}:${SCREEN_H}:flags=lanczos,format=rgba[s$i];"
  i=$((i+1))
done

FRAME_IDX=$i
INPUTS+=(-framerate 24 -loop 1 -t "$(( ${#TAKES[@]} * SECS ))" -i "$FRAME")
EC_IDX=$((i+1))
INPUTS+=(-framerate 24 -loop 1 -t "$ECDUR" -i "$EC")

# Each take: screen underneath, frame over the top. The frame PNG carries the
# background and the bezel and is transparent only where the screen goes, so
# one overlay finishes the composite.
i=0
for t in "${TAKES[@]}"; do
  FC="${FC}[$FRAME_IDX:v]trim=0:${SECS},setpts=PTS-STARTPTS,format=rgba[fr$i];"
  FC="${FC}color=c=0x06140f:s=1080x1920:d=${SECS}:r=24,format=rgba[bgc$i];"
  FC="${FC}[bgc$i][s$i]overlay=${SCREEN_X}:${SCREEN_Y}:format=auto[sc$i];"
  FC="${FC}[sc$i][fr$i]overlay=0:0:format=auto,fps=24,format=yuv420p,setpts=PTS-STARTPTS[v$i];"
  LABELS="${LABELS}[v$i]"
  i=$((i+1))
done

FC="${FC}[$EC_IDX:v]scale=1080:1920,fps=24,format=yuv420p,fade=t=in:st=0:d=0.4,setpts=PTS-STARTPTS[vec];"
LABELS="${LABELS}[vec]"
NV=$(( ${#TAKES[@]} + 1 ))

# Screen recordings are silent, so there is no bed to duck — the voice is the
# whole track. anullsrc gives loudnorm something to work against for the tail.
VO_IN=()
if [ -f "$VO" ]; then
  VO_IN=(-i "$VO")
  VO_IDX=$((EC_IDX + 1))
  AUDIO="[$VO_IDX:a]aresample=48000,aformat=channel_layouts=stereo,apad=whole_dur=${TOTAL},\
afade=t=out:st=$(( TOTAL - 2 )):d=1.8,loudnorm=I=-14:TP=-1.5:LRA=11[aout]"
  echo "  voiceover: $VO"
else
  VO_IN=(-f lavfi -t "$TOTAL" -i anullsrc=r=48000:cl=stereo)
  VO_IDX=$((EC_IDX + 1))
  AUDIO="[$VO_IDX:a]anull[aout]"
  echo "  no voiceover at $VO — silent track"
fi

"$FF" -y -hide_banner -loglevel error \
  "${INPUTS[@]}" "${VO_IN[@]}" \
  -filter_complex "${FC}${LABELS}concat=n=${NV}:v=1:a=0[vout];${AUDIO}" \
  -map "[vout]" -map "[aout]" \
  -c:v libx264 -profile:v high -level 4.1 -preset slow -crf 19 \
  -pix_fmt yuv420p -r 24 -g 48 \
  -c:a aac -b:a 128k -ar 48000 -ac 2 \
  -movflags +faststart -t "$TOTAL" \
  "$OUT"

# `ffmpeg -i` with no output always exits 1 — a probe, not a failure.
DUR=$("$FF" -hide_banner -i "$OUT" 2>&1 | sed -n 's/.*Duration: \([0-9:.]*\).*/\1/p' || true)
echo "  ok  $OUT  $(( $(stat -c%s "$OUT") / 1024 )) KB  duration $DUR"
