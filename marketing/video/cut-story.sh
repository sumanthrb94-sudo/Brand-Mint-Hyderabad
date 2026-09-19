#!/usr/bin/env bash
# The long film. Four acts, sixteen shots, one protagonist.
#
#   ./marketing/video/cut-story.sh [out.mp4] [vo.wav]
#
# The 30s cuts are arguments. This is a story: the same woman is in every
# shot and something changes for her. A customer leaves while she is typing;
# one evening she does the thing she has been avoiding; the same shop opens
# at nine again and the phone no longer owns her.
#
# EVERY CUT SITS IN A PAUSE THE READER ACTUALLY TAKES. silencedetect on
# vo-story-alnilam.wav (64.3s) gives 29 speech runs; the four ~2s pauses at
# 31.5, 44.7, 54.6 and 60.1 are the act breaks. Cutting on a fixed rhythm
# would split lines across shot changes, which is what makes a cut feel like
# a slideshow instead of a film.
#
#   #   shot       in      out     len   serves
#   1   shutter    0.00    2.30    2.30  "The shop opens at nine."
#   2   counter    2.30    7.60    5.30  "...asked four times."
#   3   qprice     7.60    9.50    1.90  "Price."  "Size."
#   4   qdeliver   9.50   13.30    3.80  "Do you deliver." "Is it in stock."
#   5   waiting   13.30   17.40    4.10  "A customer waits at the rail..."
#   6   thumbs    17.40   19.40    2.00  "...while the answers are typed."
#   7   walkout   19.40   22.50    3.10  "Then she puts the dress back, and leaves."
#   8   noticed   22.50   25.60    3.10  (she looks up; nothing is said)
#   9   empty     25.60   31.80    6.20  "So one evening..."
#   10  laptop    31.80   37.20    5.40  "Photographs. Sizes. Prices."
#   11  shoot     37.20   41.00    3.80  "Written down once."
#   12  tape      41.00   45.00    4.00  "A store, on your own domain."
#   13  orders    45.00   50.90    5.90  "UPI, cash on delivery, GST invoices."
#   14  morning2  50.90   55.00    4.10  "Orders arriving on WhatsApp, already answered."
#   15  facedown  55.00   58.50    3.50  "The shop still opens at nine."
#   16  serving   58.50   61.00    2.50  "...no longer the one who has to answer it."
#   --  endcard   61.00   66.00    5.00  "Brand Mint. Hyderabad."
#                                 ------
#                                 66.00 exactly
#
# Shot 14 repeats shot 1's framing deliberately — same street, same light,
# same wide. The only difference is that she is not hurrying. That rhyme is
# the whole point of the film and it is worth reshooting until it matches.
set -euo pipefail

cd "$(dirname "$0")/../.."
OUT="${1:-marketing/video/out/brandmint-story.mp4}"
VO="${2:-marketing/video/out/vo-story-alnilam.wav}"
IN=marketing/video/out
EC=marketing/video/assets/brandmint-endcard-9x16.png

SHOTS=(shutter counter qprice qdeliver waiting thumbs walkout noticed \
       empty laptop shoot tape orders morning2 facedown serving)
DUR=(2.30 5.30 1.90 3.80 4.10 2.00 3.10 3.10 6.20 5.40 3.80 4.00 5.90 4.10 3.50 2.50)

missing=0
for s in "${SHOTS[@]}"; do
  [ -f "$IN/st-$s.mp4" ] || { echo "missing: $IN/st-$s.mp4" >&2; missing=1; }
done
[ "$missing" = "1" ] && { echo "  shoot them: node marketing/video/gen-veo.mjs --set story --all" >&2; exit 1; }
[ -f "$VO" ] || { echo "missing: $VO" >&2; exit 1; }

FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")

# Veo returns letterboxed clips without saying so — two of the six brand shots
# came back with baked-in black from separate runs. Detect per clip.
vfilter () {
  local det w h x y
  det=$("$FF" -hide_banner -ss 1 -t 0.5 -i "$1" -vf cropdetect=limit=24:round=2 \
        -f null - 2>&1 | grep -o "crop=[0-9:]*" | tail -1)
  IFS=: read -r w h x y <<< "${det#crop=}"
  if [ "$w" = "720" ] && [ "$h" = "1280" ]; then
    echo "scale=1080:1920:flags=lanczos"
  else
    echo "  letterbox: $(basename "$1") is ${w}x${h} at ${x},${y} — cropping" >&2
    echo "crop=$w:$h:$x:$y,scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920"
  fi
}

INPUTS=(); V=""; CAT=""
for i in "${!SHOTS[@]}"; do
  f="$IN/st-${SHOTS[$i]}.mp4"
  INPUTS+=(-t "${DUR[$i]}" -i "$f")
  V="${V}[$i:v]$(vfilter "$f"),fps=24,format=yuv420p,setsar=1,setpts=PTS-STARTPTS[v$i];"
  CAT="${CAT}[v$i]"
done
EC_IDX=${#SHOTS[@]}
INPUTS+=(-framerate 24 -loop 1 -t 5.0 -i "$EC")
V="${V}[$EC_IDX:v]scale=1080:1920,fps=24,format=yuv420p,setsar=1,fade=t=in:st=0:d=0.5,setpts=PTS-STARTPTS[v$EC_IDX];"
CAT="${CAT}[v$EC_IDX]"
V="${V}${CAT}concat=n=$((EC_IDX+1)):v=1:a=0[vout];"

# The clips' own audio is never routed in. Veo 3.1 generates native audio and
# what it generated for the brand film was invented DIALOGUE, including a
# delivery promise this studio never made, quiet enough to pass as mumbling.
# There is no [n:a] anywhere in this graph.
VO_IDX=$((EC_IDX+1))
A="[$VO_IDX:a]aresample=48000,aformat=channel_layouts=stereo,apad=whole_dur=66,\
afade=t=out:st=64.6:d=1.4,loudnorm=I=-14:TP=-1.5:LRA=11[aout]"

"$FF" -y -hide_banner -loglevel error \
  "${INPUTS[@]}" -i "$VO" \
  -filter_complex "${V}${A}" \
  -map "[vout]" -map "[aout]" \
  -c:v libx264 -profile:v high -level 4.1 -preset slow -crf 20 \
  -pix_fmt yuv420p -r 24 -g 48 \
  -c:a aac -b:a 128k -ar 48000 -ac 2 \
  -movflags +faststart -t 66 \
  "$OUT"

DUR_OUT=$("$FF" -hide_banner -i "$OUT" 2>&1 | sed -n 's/.*Duration: \([0-9:.]*\).*/\1/p' || true)
SZ=$(( $(stat -c%s "$OUT") / 1024 ))
echo "  ok  $OUT  ${SZ} KB  duration $DUR_OUT"
echo "      1080x1920 · 24fps · H.264 high · AAC 128k"
echo "      subtitles: node marketing/video/subtitles.mjs --script story \\"
echo "        --audio out/vo-story-alnilam.wav --font fonts/brandmint-display.ttf \\"
echo "        --words 3 --chars 22 --until 61 --out out/story.ass"
