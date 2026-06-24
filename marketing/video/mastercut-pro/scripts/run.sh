#!/usr/bin/env bash
# MasterCut Pro — one-command pipeline runner
# Usage: ./run.sh path/to/raw_omni_clip.mp4
# Produces: ./final.mp4  (main edit + brand outro card)
set -euo pipefail

RAW="${1:?Usage: ./run.sh raw_clip.mp4}"
FPS=24

# Node/Playwright env (adjust to your machine if needed)
export NODE_PATH="${NODE_PATH:-/opt/node22/lib/node_modules}"
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}"
NODE="${NODE:-node}"

rm -rf frames matte cap_back cap_front out
mkdir -p frames matte cap_back cap_front out

echo "[1/6] extract frames"
ffmpeg -y -i "$RAW" -vsync 0 frames/f_%04d.png >/dev/null 2>&1
N=$(ls frames | wc -l); echo "      $N frames"

echo "[2/6] subject matte (rembg u2net_human_seg)"
python3 matte.py

echo "[3/6] detect speech beats (sync reference)"
ffmpeg -y -i "$RAW" -ac 1 -ar 16000 audio.wav >/dev/null 2>&1 || true

echo "[4/6] render caption layers (back/front)"
"$NODE" render-caps.cjs

echo "[5/6] composite (matte + 3D layers + grade, no zoom)"
python3 composite.py

echo "[6/6] render outro card + encode final"
"$NODE" -e "const{chromium}=require('playwright');const{pathToFileURL}=require('url');const path=require('path');(async()=>{const b=await chromium.launch({args:['--no-sandbox']});const p=await b.newPage({viewport:{width:720,height:1280},deviceScaleFactor:2});await p.goto(pathToFileURL(path.resolve('outro.html')).href,{waitUntil:'networkidle'});await p.evaluate(async()=>{await document.fonts.ready;});await p.waitForTimeout(200);await p.screenshot({path:'outro.png'});await b.close();})().catch(e=>{console.error(e.message);process.exit(1);});"
ffmpeg -y -loop 1 -i outro.png -t 2.2 -r $FPS -vf "scale=720:1280,fade=t=in:st=0:d=0.4" -c:v libx264 -pix_fmt yuv420p -crf 17 outro_seg.mp4 >/dev/null 2>&1
ffmpeg -y -i outro_seg.mp4 -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest outro_seg_a.mp4 >/dev/null 2>&1
ffmpeg -y -framerate $FPS -i out/o_%04d.png -i "$RAW" -map 0:v -map 1:a? -c:v libx264 -pix_fmt yuv420p -crf 17 -preset slow -c:a aac -b:a 192k -shortest main.mp4 >/dev/null 2>&1
printf "file 'main.mp4'\nfile 'outro_seg_a.mp4'\n" > concat.txt
ffmpeg -y -f concat -safe 0 -i concat.txt -c:v libx264 -pix_fmt yuv420p -crf 17 -preset slow -c:a aac -b:a 192k final.mp4 >/dev/null 2>&1

echo "DONE -> final.mp4"
