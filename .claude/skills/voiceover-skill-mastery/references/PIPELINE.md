# Pipeline

Every step runs offline. Nothing here needs an API key.

## One-time setup

```bash
pip install --quiet imageio-ffmpeg sherpa-onnx pillow numpy
npm  install motion@13                      # Framer Motion's engine, UMD build

# ASR models — GitHub is reachable, Hugging Face usually is not.
mkdir -p models && cd models
curl -sSL -O https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-zipformer-gigaspeech-2023-12-12.tar.bz2
tar xjf sherpa-onnx-zipformer-gigaspeech-2023-12-12.tar.bz2
# Optional, for reading an unknown script back:
curl -sSL -O https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-small.en.tar.bz2
tar xjf sherpa-onnx-whisper-small.en.tar.bz2
```

`ffmpeg` comes from `imageio_ffmpeg.get_ffmpeg_exe()` — a static binary, no
system install.

## 1 · Transcribe and align

The script is known, so only the **timings** are needed. The Zipformer
transducer gives per-token timestamps; the known script is aligned onto them
with `difflib`, which fixes ASR mishearings while keeping true timing.

```bash
python3 scripts/transcribe_align.py vo.wav "$(cat script.txt)" out/
# → out/words.json   [{w, s, e}, …]   and out/meta.json {duration}
```

Sanity check: the phrase boundaries it produces should match an RMS-envelope
pass on the same audio to within a few hundredths of a second. If they do not,
the alignment is wrong — do not proceed.

Reads over 30 s must be chunked on silence; the models have length limits.

## 2 · Write the scene spec

`out/scenes.json` — see `SCENES.md`. Each scene claims a word range, so scene
boundaries are word boundaries and can never fall mid-phrase.

## 3 · Extract clip frames

Chromium in a container usually lacks H.264. Composite from JPEGs instead.

```bash
for i in 1 2 3; do
  "$FF" -y -i clip$i.mp4 \
    -vf "fps=30,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
    -q:v 3 out/clip$i/f_%04d.jpg
done
```

## 4 · Render frames

```bash
node scripts/render.mjs out/
```

Drives `template/reel.html?render=1` through `window.__seek(t, frameSrc)` one
frame at a time at 30 fps, screenshotting 1080×1920. Deterministic: the same
input always produces the same frames. Writes `out/render-log.json`, which the
verifier reads.

## 5 · Sound

```bash
bash    scripts/fetch_sfx.sh            # CC0 samples, once
python3 scripts/build_mix.py out/       # cue sheet → mixed WAV
```

Cues are placed at `scene_start + element_delay`, so a tick lands with its own
row. Voice sits at 1.0; effects between 0.2 and 0.75.

`alimiter` protects the peak but delays everything by its 5 ms lookahead —
`atrim=start_sample=240` after it puts the voice back. Skip that and the whole
film drifts 5 ms off the captions.

## 6 · Encode

```bash
bash scripts/encode.sh out/
```

`libx264 -crf 18 -preset slow -pix_fmt yuv420p -profile:v high`, AAC 192 kbps
48 kHz, `+faststart`. Instagram re-encodes anyway; give it clean input.

## 7 · Verify

```bash
python3 scripts/verify.py out/
```

Measures the encoded file, not the sources. Cross-correlates the MP4's audio
against the original voiceover for offset, compares decoded frames against the
rendered PNGs, and replays the render log against the word timings.

Ship only on a clean report.
