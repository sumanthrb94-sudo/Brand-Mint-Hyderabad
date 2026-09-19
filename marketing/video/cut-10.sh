#!/usr/bin/env bash
# The 10-second paid-ad cutdown, per marketing/video/OMNI-10S-AD.md.
#
#   ./marketing/video/cut-10.sh [out.mp4]
#
# NO WORD IS SPOKEN BY THE PICTURE. The plates are generated deliberately
# empty — the house style forbids text, numerals, logos, labels and screen
# interfaces — and every piece of type is composited here. That is not
# fussiness: a video model garbles letterforms, and a garbled price in a PAID
# ad is a takedown rather than an edit.
#
# Four beats of 2.5s. Veo accepts 4, 6 or 8 seconds and rejects 2.5 outright
# ("out of bound"), so each plate is generated at 4s and trimmed here. That is
# the right way round — trimming a good take is free.
#
#   fold   2.5   0.0 ->  2.5   hands seal a kraft parcel
#   glow   2.5   2.5 ->  5.0   a phone, face up, blank mint glow
#   nine   2.5   5.0 ->  7.5   one parcel has become nine
#   land   2.5   7.5 -> 10.0   pull back into empty negative space
#                     ---------
#                     10.00 exactly
#
# THE PRICE IS READ, NOT TYPED. shared/services.js is the same source the
# home page and /pricing render from, so this cannot drift from the site the
# way a hardcoded figure would. JetBrains Mono has no rupee glyph, which is
# why the sign is drawn from the text face and only the digits from the mono.
set -euo pipefail

cd "$(dirname "$0")/../.."
OUT="${1:-marketing/video/out/brandmint-10s.mp4}"
IN=marketing/video/out
F=marketing/video/fonts

for s in fold glow nine; do
  [ -f "$IN/spot-$s.mp4" ] || { echo "missing: $IN/spot-$s.mp4  (gen-veo.mjs --set spot $s)" >&2; exit 1; }
done

# BEAT 4 PREFERS THE PLATE AND FALLS BACK TO THE END CARD.
# spot-land is the composite plate: a pull-back into deep ink-green negative
# space, generated empty so the lock-up can be drawn onto it. It has not been
# shot — the Veo daily quota ran out at ten clips — and the end card IS that
# frame already: same ink green, same lock-up, same URL. So the spot lands on
# brand either way, and shooting the plate later needs no edit here.
EC=marketing/video/assets/brandmint-endcard-9x16.png
if [ -f "$IN/spot-land.mp4" ]; then
  LAND_PLATE=1; echo "  beat 4: spot-land.mp4"
else
  LAND_PLATE=0; echo "  beat 4: end card (spot-land.mp4 not shot yet)"
fi

FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")

PRICE=$(node -e 'import("./shared/services.js").then(m=>{
  const s=m.SERVICES.find(x=>x.id==="store");
  process.stdout.write(s.from.toLocaleString("en-IN"));
})')
echo "  price from shared/services.js: ${PRICE}"

# Veo returns letterboxed clips without saying so — two of the six brand shots
# came back with baked-in black from separate runs. Detect per plate.
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

V=""; CAT=""; INPUTS=(); i=0
BEATS=(fold glow nine)
[ "$LAND_PLATE" = "1" ] && BEATS+=(land)
for s in "${BEATS[@]}"; do
  INPUTS+=(-t 2.5 -i "$IN/spot-$s.mp4")
  V="${V}[$i:v]$(vfilter "$IN/spot-$s.mp4"),fps=24,format=yuv420p,setsar=1,setpts=PTS-STARTPTS[v$i];"
  CAT="${CAT}[v$i]"
  i=$((i+1))
done
if [ "$LAND_PLATE" = "0" ]; then
  INPUTS+=(-framerate 24 -loop 1 -t 2.5 -i "$EC")
  V="${V}[$i:v]scale=1080:1920,fps=24,format=yuv420p,setsar=1,fade=t=in:st=0:d=0.5,setpts=PTS-STARTPTS[v$i];"
  CAT="${CAT}[v$i]"
  i=$((i+1))
fi
V="${V}${CAT}concat=n=$i:v=1:a=0[raw];"

# A SCRIM, BECAUSE THE PLATES ARE BRIGHT WHERE THE TYPE GOES. The spec
# assumes "mint on ink", but these are daylight plates — a sunlit window sits
# exactly where the features line lands, and cream-on-cream does not read at
# a glance on a phone. Rather than move the type off the beat it belongs to,
# the top of the frame is darkened by a gradient that is strongest at the very
# top and gone by 40% down, so it reads as the plate's own falloff instead of
# a caption bar. Beat 4 is the end card and needs none, but the ramp is
# invisible against ink anyway.
V="${V}color=c=0x0B1F1A:s=1080x1920:d=10,format=rgba,\
geq=r=11:g=31:b=26:a='clip(200*(1-Y/760),0,200)'[scrim];\
[raw][scrim]overlay=0:0:format=auto[bed];"

# TYPE IS DRAWN WITH LIBASS, NOT DRAWTEXT. The pip ffmpeg (imageio-ffmpeg) is
# built without libfreetype, so the drawtext filter does not exist in it at
# all — "No such filter: 'drawtext'". libass is present, which is what every
# other cut in this folder already burns subtitles with, and it also gives
# per-span font and colour switching, which the price line needs: JetBrains
# Mono has no rupee glyph, so the sign is set in the text face and only the
# digits in the mono.
#
# Times are OMNI-10S-AD.md section 3. The last beat is the composite plate,
# which is why its upper two thirds were generated empty.
ASS=marketing/video/out/spot.ass
CREAM='&HEAF1F5&'; MINT='&H81B910&'        # ASS colour is &HBBGGRR, not RGB
{
  echo "[Script Info]"
  echo "ScriptType: v4.00+"
  echo "PlayResX: 1080"
  echo "PlayResY: 1920"
  echo "WrapStyle: 2"
  echo ""
  echo "[V4+ Styles]"
  echo "Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding"
  echo "Style: Spot,BrandMint Display,74,${CREAM},${CREAM},&H1A1F0B&,&H64000000&,1,0,0,0,100,100,0,0,1,0,3,8,60,60,60,1"
  echo ""
  echo "[Events]"
  echo "Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text"
  echo "Dialogue: 0,0:00:00.60,0:00:02.40,Spot,,0,0,0,,{\\an8\\pos(540,250)}Your product deserves\\N{\\c${MINT}}a real store."
  echo "Dialogue: 0,0:00:03.00,0:00:05.20,Spot,,0,0,0,,{\\an8\\pos(540,260)\\fnBrandMint Text\\fs46}UPI · COD · GST invoices · WhatsApp"
  echo "Dialogue: 0,0:00:05.60,0:00:07.40,Spot,,0,0,0,,{\\an8\\pos(540,250)\\fnBrandMint Text\\fs54}From {\\c${MINT}\\fs84}₹{\\fnBrandMint Mono}${PRICE}"
  if [ "$LAND_PLATE" = "1" ]; then
    # Only onto a bare plate — the end card already carries the lock-up.
    echo "Dialogue: 0,0:00:07.80,0:00:10.00,Spot,,0,0,0,,{\\an8\\pos(540,470)\\fs88}Brand Mint\\N{\\c${MINT}\\fnBrandMint Text\\fs46}brandmintstudios.in"
  fi
} > "$ASS"

"$FF" -y -hide_banner -loglevel error \
  "${INPUTS[@]}" \
  -filter_complex "${V}[bed]subtitles=${ASS}:fontsdir=${F}[vout]" \
  -map "[vout]" -an \
  -c:v libx264 -profile:v high -level 4.1 -preset slow -crf 19 \
  -pix_fmt yuv420p -r 24 -g 48 -movflags +faststart -t 10 \
  "$OUT"

DUR=$("$FF" -hide_banner -i "$OUT" 2>&1 | sed -n 's/.*Duration: \([0-9:.]*\).*/\1/p' || true)
SZ=$(( $(stat -c%s "$OUT") / 1024 ))
echo "  ok  $OUT  ${SZ} KB  duration $DUR"
echo "      1080x1920 · 24fps · H.264 high · SILENT — add music in the composer"
