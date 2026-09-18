#!/usr/bin/env bash
# Cut the shippable 30s Instagram reel from the footage that actually exists.
#
#   ./marketing/video/cut-reel.sh [out.mp4] [vo.wav]
#
# WHY THIS EXISTS ALONGSIDE cut-30.sh
# cut-30.sh is the six-Veo-shot plan: look, pass, call, wait, tape, lift. The
# first three are shot. The last three are beat 3 — "we build the thing that
# answers them for you" — and they are blocked on the Veo daily quota.
#
# They are also the beat the video model keeps failing. Two attempts at it have
# already been thrown away: a parcel that morphed through four shapes mid
# handover, and a phone that vanished out of a woman's hand. That is not bad
# luck. Beat 3 is the beat that has to show a PRODUCT, and cut-screen.sh says
# why that never works: "asking a video model to draw a product always produces
# something that reads as fake, because it is."
#
# So beat 3 is the real product instead — brandmint-screen.mp4, Playwright
# driving the live site at phone size inside a phone frame. Actual pages,
# actual prices, nothing generated. It is a better beat 3 than wait/tape/lift
# were ever going to be, and it needs no quota.
#
# THE ARITHMETIC, cut to the voiceover's OWN pauses rather than a 4s grid.
# silencedetect on vo-alnilam-tight.wav finds 17 speech segments; subtitles.mjs
# maps the 15 scripted phrases onto them. The paragraph breaks land at 6.89,
# 10.41, 21.34 and 25.15 — NOT at the 8/16/24 the old plan assumed. Cutting on
# the assumed grid put the end card up in the middle of a sentence.
#
#   look     3.10    0.00 ->  3.10   "Your customers are already looking for you."
#   pass     3.99    3.10 ->  7.09   "They find a phone number, a WhatsApp, and nothing else."
#   call     3.51    7.09 -> 10.60   "So you answer the same four questions all day."
#   screen  14.75   10.60 -> 25.35   "We build the thing..." -> "...before anyone starts."
#   endcard  4.65   25.35 -> 30.00   "Brand Mint. Hyderabad."
#                        ----------
#                        30.00 exactly
#
# Every cut falls inside a gap between speech segments, so no line is ever
# split across a scene change.
#
# The screen clip is 21s internally — home 5, tiers 5, pricing 5, then its own
# end card 6. Exactly its 15s of content is used and its end card trimmed off,
# so this film has one end card, not two. That puts the live PRICING page on
# screen under "Fixed price, in writing, before anyone starts." — the real
# numbers, on the real page, under the line that makes the claim. The end card
# carries no price text, so that line would have had nothing to sit on there.
#
# Plain concat, end card fading up on its own. xfade was tried and is not worth
# it here: it demands both inputs share a timebase AND be constant frame rate,
# concat emits 1/1000000 while a looped still arrives at 1/24, and settb=AVTB
# reconciles the timebase only to strip the frame rate, at which point xfade
# rejects the input as variable. All of it surfaces as "Error reinitializing
# filters!". Concat needs none of it and makes the total exact.
set -euo pipefail

cd "$(dirname "$0")/../.."
OUT="${1:-marketing/video/out/brandmint-reel-30s.mp4}"
VO="${2:-marketing/video/out/vo-alnilam-tight.wav}"
IN=marketing/video/out
EC=marketing/video/assets/brandmint-endcard-9x16.png

for f in "$IN/look.mp4" "$IN/pass.mp4" "$IN/call.mp4" "$IN/brandmint-screen.mp4" "$EC" "$VO"; do
  [ -f "$f" ] || { echo "missing: $f" >&2; exit 1; }
done

FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")

# Veo returns 720x1280; the screen film is already 1080x1920. Both are scaled
# to 1080x1920 so the concat inputs match — scaling the end card's type DOWN
# instead would cost resolution on the only part of the reel anyone reads.
V="scale=1080:1920:flags=lanczos,fps=24,format=yuv420p,setsar=1,setpts=PTS-STARTPTS"

# look.mp4 CAME BACK LETTERBOXED and nothing upstream noticed. Veo reported it
# as 720x1280 like the others, but cropdetect says the picture is only
# 720x1084 at y=98 — 98px of baked-in black top and bottom. Scaling that to
# 1080x1920 like the clean clips does not remove the bars, it enlarges them,
# and the reel opened on a letterboxed shot.
#
#   ffmpeg -ss 2 -t 0.5 -i out/look.mp4 -vf cropdetect=limit=24:round=2 -f null -
#
# Run that on any new clip before trusting it. pass.mp4 and call.mp4 both
# report the full 720:1280:0:0 and go through V unchanged.
#
# The bars are cropped off first, which leaves 720x1084 — 0.664 wide where the
# frame wants 0.5625. force_original_aspect_ratio=increase scales it to cover
# (1275x1920) and the centre 1080 is kept, so it fills without stretching. The
# subject is centre-left and survives the ~98px taken off each side; check her
# framing again if this shot is ever regenerated.
V_LOOK="crop=720:1084:0:98,scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,fps=24,format=yuv420p,setsar=1,setpts=PTS-STARTPTS"

# THE CLIPS' OWN AUDIO IS NEVER ROUTED IN. Veo 3.1 generates native audio and
# what it generated here was not room tone, it was synthetic DIALOGUE —
# "Yes, absolutely. We can have that shipped out by Tuesday." Two invented
# voices under the read, one making a delivery promise this studio never made,
# quiet enough to pass as mumbling rather than be recognised as words. There is
# no [N:a] anywhere in this graph, so there is nothing to leak through later.
#
# That leaves voice over silence, which is the right default for Reels anyway:
# add music in the Instagram composer where it is licensed for the platform and
# viewers can mute it.
"$FF" -y -hide_banner -loglevel error \
  -t 3.10 -i "$IN/look.mp4" \
  -t 3.99 -i "$IN/pass.mp4" \
  -t 3.51 -i "$IN/call.mp4" \
  -t 14.75 -i "$IN/brandmint-screen.mp4" \
  -framerate 24 -loop 1 -t 4.65 -i "$EC" \
  -i "$VO" \
  -filter_complex "\
[0:v]$V_LOOK[v0];[1:v]$V[v1];[2:v]$V[v2];[3:v]$V[v3];\
[4:v]scale=1080:1920,fps=24,format=yuv420p,setsar=1,fade=t=in:st=0:d=0.5,setpts=PTS-STARTPTS[v4];\
[v0][v1][v2][v3][v4]concat=n=5:v=1:a=0[vout];\
[5:a]aresample=48000,aformat=channel_layouts=stereo,apad=whole_dur=30,\
afade=t=out:st=28.6:d=1.4,loudnorm=I=-14:TP=-1.5:LRA=11[aout]" \
  -map "[vout]" -map "[aout]" \
  -c:v libx264 -profile:v high -level 4.1 -preset slow -crf 20 \
  -pix_fmt yuv420p -r 24 -g 48 \
  -c:a aac -b:a 128k -ar 48000 -ac 2 \
  -movflags +faststart -t 30 \
  "$OUT"

# `ffmpeg -i` with no output always exits 1 — it is a probe, not a failure.
# Under `set -e -o pipefail` that killed this script AFTER the reel was written,
# so a good render looked like a silent failure.
DUR=$("$FF" -hide_banner -i "$OUT" 2>&1 | sed -n 's/.*Duration: \([0-9:.]*\).*/\1/p' || true)
SZ=$(( $(stat -c%s "$OUT") / 1024 ))
echo "  ok  $OUT  ${SZ} KB  duration $DUR"
echo "      1080x1920 · 24fps · H.264 high · AAC 128k — Instagram Reels ready"
