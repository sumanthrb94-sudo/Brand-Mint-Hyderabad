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
# EDL is explicit rather than derived. Each entry is "file:start:length".
# It used to hold two clips sliced twice each, because the Veo quota ran out
# before book, store, pack and done existed. All six are shot now, so each
# beat gets its own shot and nothing is reused.
#
# CUTS LAND IN THE READ'S OWN GAPS, not on a fixed rhythm. silencedetect on
# vo-ugc-alnilam.wav gives the pauses; every cut below sits inside one, so no
# line is ever split across a shot change:
#
#   scroll   4.40    0.00 ->  4.40   gap 4.25-4.53   "...watch this."
#   counter  5.64    4.40 -> 10.04   gap 9.84-10.24  the same four questions
#   book     3.29   10.04 -> 13.33   gap 13.17-13.49 "not running a business"
#   store    3.12   13.33 -> 16.45   gap 16.31-16.61 "a reply machine"
#   pack     3.99   16.45 -> 20.44   gap 20.25-20.63 "so - a proper store"
#   done     3.41   20.44 -> 23.85   gap 23.62-24.08 "fixed price, in writing"
#   endcard  6.15   23.85 -> 30.00                   "Brand Mint. Hyderabad."
#                          ----------
#                          30.00 exactly
#
set -euo pipefail

cd "$(dirname "$0")/../.."
OUT="${1:-marketing/video/out/brandmint-ugc.mp4}"
# Alnilam is the permanent brand voice; the earlier UGC reads used
# Google's generic voices from before that was settled.
VO="${2:-marketing/video/out/vo-ugc-alnilam.wav}"
IN=marketing/video/out
EC=marketing/video/assets/brandmint-endcard-9x16.png
# THE CLIPS' OWN AUDIO IS DISCARDED. This defaulted to 0.22 when the ad was
# two clips of room tone. With all six shot, scripts/vo-transcribe.py finds a
# human vocalisation in ugc-pack.mp4 — "Yah!" — and errors out on book, store
# and done, so those three are unchecked rather than clean. Veo invents voices:
# the brand film's clips turned out to contain "we can have that shipped out by
# Tuesday", a delivery promise this studio never made, quiet enough to pass as
# mumbling. At 0.22 a stray "Yah!" sits right under the read.
#
# Raise this above 0 only after transcribing every clip in the EDL and
# confirming there is no voice in any of them:
#   python3 scripts/vo-transcribe.py <clip.wav>
BED_VOL="${BED_VOL:-0}"

EDL=(
  "$IN/ugc-scroll.mp4:0.0:4.40"
  "$IN/ugc-counter.mp4:0.0:5.64"
  "$IN/ugc-book.mp4:0.0:3.29"
  "$IN/ugc-store.mp4:0.0:3.12"
  "$IN/ugc-pack.mp4:0.0:3.99"
  "$IN/ugc-done.mp4:0.0:3.41"
)
ECDUR=6.15

FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")

INPUTS=() ; VCHAIN="" ; ACHAIN="" ; VLABELS="" ; ALABELS="" ; i=0
for e in "${EDL[@]}"; do
  f="${e%%:*}" ; rest="${e#*:}" ; ss="${rest%%:*}" ; len="${rest#*:}"
  [ -f "$f" ] || { echo "missing: $f  (run gen-veo.mjs --set ugc first)" >&2; exit 1; }
  # -ss before -i seeks fast and keeps the trim exact enough at 24fps.
  INPUTS+=(-ss "$ss" -t "$len" -i "$f")
  # Veo returns letterboxed clips without saying so — two of the six brand
  # shots came back with baked-in black from separate runs. Detect per clip.
  det=$("$FF" -hide_banner -ss 1 -t 0.5 -i "$f" -vf cropdetect=limit=24:round=2 \
        -f null - 2>&1 | grep -o "crop=[0-9:]*" | tail -1)
  IFS=: read -r cw ch cx cy <<< "${det#crop=}"
  if [ "$cw" = "720" ] && [ "$ch" = "1280" ]; then
    VF="scale=1080:1920:flags=lanczos"
  else
    echo "  letterbox: $(basename "$f") is ${cw}x${ch} at ${cx},${cy} — cropping" >&2
    VF="crop=$cw:$ch:$cx:$cy,scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920"
  fi
  VCHAIN="${VCHAIN}[$i:v]$VF,fps=24,format=yuv420p,setsar=1,setpts=PTS-STARTPTS[v$i];"
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
