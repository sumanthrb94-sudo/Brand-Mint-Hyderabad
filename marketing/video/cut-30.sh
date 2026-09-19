#!/usr/bin/env bash
# Cut the three Veo clips and the end card into one 30.00s Instagram reel.
#
#   ./marketing/video/cut-30.sh [out.mp4]
#
# ffmpeg comes from pip (`pip install imageio-ffmpeg`), same as compose.sh —
# there is no system ffmpeg on this box and no package.json to add one to.
#
# THE ARITHMETIC, cut to the voiceover's OWN pauses, not a 4s grid.
# silencedetect on vo-alnilam-tight.wav gives the phrase gaps. On a plain
# 4s grid FIVE of the six cuts land mid-phrase, so the timings below are
# pulled to the nearest gap instead. Every shot is <= its 4.00s source.
#
#   look    3.10    0.00 ->  3.10   gap 2.89-3.27
#   pass    3.99    3.10 ->  7.09   gap 6.89-7.29
#   call    3.51    7.09 -> 10.60   gap 10.41-10.79
#   wait    3.99   10.60 -> 14.59   gap 14.59-14.94
#   tape    3.46   14.59 -> 18.05   gap 18.05-18.41
#   lift    3.50   18.05 -> 21.55   gap 21.34-21.74
#   endcard 8.45   21.55 -> 30.00
#                        ----------
#                        30.00 exactly
#
# The end card is long because the footage runs out: six 4s shots is 24s of
# material and the read does not finish until 27.56s. It is not holding
# silence — "fixed price, in writing, before anyone starts" and "Brand Mint.
# Hyderabad." both play over it.
#
# A plain four-way concat, with the end card fading up on its own rather than
# crossfading from the footage. xfade was the first attempt and it is not worth
# the trouble here: it demands that both inputs share a timebase AND be
# constant frame rate, concat emits 1/1000000 while a looped still arrives at
# 1/24, and settb=AVTB reconciles the timebase only to strip the frame rate, at
# which point xfade rejects the input as variable ("current rate of 1/0 is
# invalid"). Every one of those surfaces as the same unhelpful line, "Error
# reinitializing filters!". Concat needs none of it and makes the total exact.
#
# Hard cuts between the three clips on purpose: they are three different
# scenes, and dissolving between them would read as a slideshow.
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

SHOTS=(look pass call wait tape lift)
for i in "${SHOTS[@]}"; do
  [ -f "$IN/$i.mp4" ] || { echo "missing: $IN/$i.mp4  (run gen-veo.mjs $i)" >&2; exit 1; }
done
[ -f "$EC" ] || { echo "missing: $EC" >&2; exit 1; }

FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")

# Veo has returned every clip with an audio stream so far, but compose.sh was
# bitten by clips that had none — mapping [0:a] on a silent input fails
# outright. Check rather than assume.
for i in "${SHOTS[@]}"; do
  n=$("$FF" -hide_banner -i "$IN/$i.mp4" 2>&1 | grep -c "Stream.*Audio" || true)
  [ "$n" -eq 0 ] && { echo "$i.mp4 has no audio stream; add anullsrc handling" >&2; exit 1; }
done

# VEO RETURNS LETTERBOXED CLIPS AND DOES NOT SAY SO. look.mp4 reported
# 720x1280 with 98px of black baked in top and bottom; lift.mp4 came back the
# same way with 110px. Two of six, from separate runs — it recurs, so the crop
# is detected per clip rather than hardcoded. A clean clip reports
# 720:1280:0:0 and goes through untouched; a letterboxed one is cropped to its
# real picture, scaled to COVER 1080x1920 and centre-cropped, so it fills the
# frame without stretching.
DUR=(3.10 3.99 3.51 3.99 3.46 3.50)
vfilter () {                       # $1 = clip path
  local det w h x y
  det=$("$FF" -hide_banner -ss 2 -t 0.5 -i "$1" -vf cropdetect=limit=24:round=2 \
        -f null - 2>&1 | grep -o "crop=[0-9:]*" | tail -1)
  IFS=: read -r w h x y <<< "${det#crop=}"
  if [ "$w" = "720" ] && [ "$h" = "1280" ]; then
    echo "scale=1080:1920:flags=lanczos,fps=24,format=yuv420p,setsar=1,setpts=PTS-STARTPTS"
  else
    echo "  letterbox: $(basename "$1") is ${w}x${h} at ${x},${y} — cropping" >&2
    echo "crop=$w:$h:$x:$y,scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,fps=24,format=yuv420p,setsar=1,setpts=PTS-STARTPTS"
  fi
}

# THE CLIPS' OWN AUDIO IS DISCARDED WHEN THERE IS A VOICEOVER, and that is not
# a taste call. Veo 3.1 generates native audio, and what it generated here was
# not room tone — it was synthetic DIALOGUE. Transcribed from the three clips:
#
#   "Yes, absolutely. We can have that shipped out by Tuesday. Just one moment
#    please, let me confirm the tracking details." — "Welcome. Here is the
#    first package."
#
# Two invented voices under the read, one of them making a delivery promise
# this studio never made, at a level low enough to be heard as mumbling rather
# than recognised as words. Lowering it does not fix that; it only makes the
# fabrication harder to notice. BED_VOL=0 drops the bed entirely.
#
# Set BED_VOL to something above 0 only after transcribing the clips and
# confirming there is no speech in them:
#   python3 scripts/vo-transcribe.py <clip.wav>
#
# That leaves the reel as voice over silence. For Reels that is the right
# default anyway — add music in the Instagram composer, where it is licensed
# for the platform and viewers can mute it.
VO="${2:-marketing/video/out/vo-alnilam-tight.wav}"
BED_VOL="${BED_VOL:-0}"

# Build the per-clip inputs and filters from the detected crops.
INPUTS=(); VIDEO_FC=""; CONCAT=""
for i in "${!SHOTS[@]}"; do
  INPUTS+=(-t "${DUR[$i]}" -i "$IN/${SHOTS[$i]}.mp4")
  VIDEO_FC="${VIDEO_FC}[$i:v]$(vfilter "$IN/${SHOTS[$i]}.mp4")[v$i];"
  CONCAT="${CONCAT}[v$i]"
done
EC_IDX=${#SHOTS[@]}
VIDEO_FC="${VIDEO_FC}[$EC_IDX:v]scale=1080:1920,fps=24,format=yuv420p,setsar=1,fade=t=in:st=0:d=0.5,setpts=PTS-STARTPTS[v$EC_IDX];"
VIDEO_FC="${VIDEO_FC}${CONCAT}[v$EC_IDX]concat=n=$((EC_IDX+1)):v=1:a=0[vout];"

if [ -f "$VO" ]; then
  VO_IN=(-i "$VO")
  # normalize=0 on amix, or it halves both inputs to avoid clipping and the
  # voice ends up quieter than the bed it is supposed to sit over.
  if [ "$BED_VOL" = "0" ]; then
    # No amix at all: the clips' audio is never routed in, so there is nothing
    # to leak through at some later edit.
    AUDIO_FC="\
[$((EC_IDX+1)):a]aresample=48000,aformat=channel_layouts=stereo,apad=whole_dur=30,\
afade=t=out:st=28.6:d=1.4,loudnorm=I=-14:TP=-1.5:LRA=11[aout]"
    echo "  voiceover: $VO  (clips' own audio discarded)"
  else
    # normalize=0 on amix, or it halves both inputs to avoid clipping and the
    # voice ends up quieter than the bed it is supposed to sit over.
    AUDIO_FC="\
[0:a][1:a][2:a][3:a][4:a][5:a]concat=n=6:v=0:a=1,aresample=48000,aformat=channel_layouts=stereo,\
apad=whole_dur=30,volume=$BED_VOL[bed];\
[$((EC_IDX+1)):a]aresample=48000,aformat=channel_layouts=stereo,apad=whole_dur=30[vo];\
[bed][vo]amix=inputs=2:duration=first:normalize=0,afade=t=out:st=28.6:d=1.4,loudnorm=I=-14:TP=-1.5:LRA=11[aout]"
    echo "  voiceover: $VO  (bed at $BED_VOL — CHECK the clips for speech)"
  fi
else
  VO_IN=()
  AUDIO_FC="\
[0:a][1:a][2:a][3:a][4:a][5:a]concat=n=6:v=0:a=1[ac];\
[ac]apad=whole_dur=30,afade=t=out:st=28.2:d=1.8,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[aout]"
  echo "  no voiceover at $VO — using the clips' own audio"
fi

"$FF" -y -hide_banner -loglevel error \
  "${INPUTS[@]}" \
  -framerate 24 -loop 1 -t 8.45 -i "$EC" \
  "${VO_IN[@]}" \
  -filter_complex "${VIDEO_FC}${AUDIO_FC}" \
  -map "[vout]" -map "[aout]" \
  -c:v libx264 -profile:v high -level 4.1 -preset slow -crf 20 \
  -pix_fmt yuv420p -r 24 -g 48 \
  -c:a aac -b:a 128k -ar 48000 -ac 2 \
  -movflags +faststart -t 30 \
  "$OUT"

# `ffmpeg -i` with no output file always exits 1 — it is a probe, not a
# failure. Under `set -e -o pipefail` that killed the script here, after the
# reel had already been written, so a good render looked like a silent failure.
DUR=$("$FF" -hide_banner -i "$OUT" 2>&1 | sed -n 's/.*Duration: \([0-9:.]*\).*/\1/p' || true)
SZ=$(( $(stat -c%s "$OUT") / 1024 ))
echo "  ok  $OUT  ${SZ} KB  duration $DUR"
echo "      1080x1920 · 24fps · H.264 high · AAC 128k — Instagram Reels ready"
