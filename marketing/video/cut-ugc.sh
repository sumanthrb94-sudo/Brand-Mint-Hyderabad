#!/usr/bin/env bash
# Cut the UGC clips into a fast-rhythm vertical ad.
#
#   ./marketing/video/cut-ugc.sh [out.mp4] [vo.wav]
#
# Different edit from cut-30.sh on purpose. That one holds each shot for its
# full 8 seconds because it is a brand film. This cuts every ~4 seconds,
# because that is the rhythm the format runs at and an 8-second hold in a UGC
# ad reads as a stock clip.
#
# EDL is explicit rather than derived. Each entry is "file:start:length", so
# one 8s generation yields two usable shots when the camera has moved across
# it — which is how this gets a six-cut ad out of two clips while the Veo
# quota is exhausted. Add the remaining clips to the list when it resets.
#
#   scroll  0.0 +4.0     the reply machine, top of the scroll
#   counter 0.0 +4.0     the counter, phone down
#   scroll  4.0 +4.0     same clip, thumb now moving
#   counter 4.0 +4.0     same clip, hand reaching in
#   endcard     +6.0
#                        ------
#                        22.0s
set -euo pipefail

cd "$(dirname "$0")/../.."
OUT="${1:-marketing/video/out/brandmint-ugc.mp4}"
VO="${2:-marketing/video/out/vo-ugc-zubenelgenubi.wav}"
IN=marketing/video/out
EC=marketing/video/assets/brandmint-endcard-9x16.png
BED_VOL="${BED_VOL:-0.22}"

EDL=(
  "$IN/ugc-scroll.mp4:0.0:4.0"
  "$IN/ugc-counter.mp4:0.0:4.0"
  "$IN/ugc-scroll.mp4:4.0:4.0"
  "$IN/ugc-counter.mp4:4.0:4.0"
)
ECDUR=6.0

FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")

INPUTS=() ; VCHAIN="" ; ACHAIN="" ; VLABELS="" ; ALABELS="" ; i=0
for e in "${EDL[@]}"; do
  f="${e%%:*}" ; rest="${e#*:}" ; ss="${rest%%:*}" ; len="${rest#*:}"
  [ -f "$f" ] || { echo "missing: $f  (run gen-veo.mjs --set ugc first)" >&2; exit 1; }
  # -ss before -i seeks fast and keeps the trim exact enough at 24fps.
  INPUTS+=(-ss "$ss" -t "$len" -i "$f")
  VCHAIN="${VCHAIN}[$i:v]scale=1080:1920:flags=lanczos,fps=24,format=yuv420p,setpts=PTS-STARTPTS[v$i];"
  ACHAIN="${ACHAIN}[$i:a]aresample=48000,aformat=channel_layouts=stereo,asetpts=PTS-STARTPTS[a$i];"
  VLABELS="${VLABELS}[v$i]" ; ALABELS="${ALABELS}[a$i]"
  i=$((i+1))
done

EC_IDX=$i
INPUTS+=(-framerate 24 -loop 1 -t "$ECDUR" -i "$EC")
VCHAIN="${VCHAIN}[$EC_IDX:v]scale=1080:1920,fps=24,format=yuv420p,fade=t=in:st=0:d=0.4,setpts=PTS-STARTPTS[vec];"
VLABELS="${VLABELS}[vec]"
NV=$((i+1))

TOTAL=$(python3 -c "
edl='''${EDL[*]}'''.split()
print(f\"{sum(float(e.split(':')[2]) for e in edl) + $ECDUR:.2f}\")")

# The end card is a still with no audio, so the bed is padded to length rather
# than concatenated with a silent input — mapping a nonexistent [n:a] fails
# outright, which is the trap compose.sh documents.
VO_IN=() ;
if [ -f "$VO" ]; then
  VO_IN=(-i "$VO")
  VO_IDX=$((NV))
  AUDIO="${ACHAIN}${ALABELS}concat=n=$i:v=0:a=1,apad=whole_dur=$TOTAL,volume=$BED_VOL[bed];\
[$VO_IDX:a]aresample=48000,aformat=channel_layouts=stereo,apad=whole_dur=$TOTAL[vo];\
[bed][vo]amix=inputs=2:duration=first:normalize=0,afade=t=out:st=$(python3 -c "print(f'{$TOTAL-1.2:.2f}')"):d=1.2,loudnorm=I=-14:TP=-1.5:LRA=11[aout]"
  echo "  voiceover: $VO  (bed at $BED_VOL)"
else
  AUDIO="${ACHAIN}${ALABELS}concat=n=$i:v=0:a=1,apad=whole_dur=$TOTAL,afade=t=out:st=$(python3 -c "print(f'{$TOTAL-1.2:.2f}')"):d=1.2,loudnorm=I=-14:TP=-1.5:LRA=11[aout]"
  echo "  no voiceover at $VO — clip audio only"
fi

"$FF" -y -hide_banner -loglevel error \
  "${INPUTS[@]}" "${VO_IN[@]}" \
  -filter_complex "${VCHAIN}${VLABELS}concat=n=$NV:v=1:a=0[vout];${AUDIO}" \
  -map "[vout]" -map "[aout]" \
  -c:v libx264 -profile:v high -level 4.1 -preset slow -crf 20 \
  -pix_fmt yuv420p -r 24 -g 48 \
  -c:a aac -b:a 128k -ar 48000 -ac 2 \
  -movflags +faststart -t "$TOTAL" \
  "$OUT"

# `ffmpeg -i` with no output always exits 1 — a probe, not a failure.
DUR=$("$FF" -hide_banner -i "$OUT" 2>&1 | sed -n 's/.*Duration: \([0-9:.]*\).*/\1/p' || true)
echo "  ok  $OUT  $(( $(stat -c%s "$OUT") / 1024 )) KB  duration $DUR  (${#EDL[@]} cuts + end card)"
