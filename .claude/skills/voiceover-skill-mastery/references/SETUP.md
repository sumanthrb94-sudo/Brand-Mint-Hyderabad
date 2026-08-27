# Setup

Everything below runs offline once installed. **No API keys anywhere** — the
voice comes from outside (ElevenLabs, or a human at a microphone), so the
pipeline never generates speech. It only needs to *read* speech back to get
timings.

Run `bash scripts/setup.sh` to do all of it, then `python3 scripts/doctor.py`
to confirm.

## Requirements

| | |
|---|---|
| Python | 3.10 or newer |
| Node | 18 or newer |
| Disk | ~1.2 GB (mostly the ASR model and the browser). Add 1.3 GB for the optional second model. |
| Network | `github.com` and `raw.githubusercontent.com` must be reachable. Hugging Face is **not** needed. |

## Python packages

```bash
pip install imageio-ffmpeg sherpa-onnx pillow numpy
```

| Package | Why | Size |
|---|---|---|
| `imageio-ffmpeg` | Ships a **static ffmpeg binary**. No system install, no apt, no codec hunting. Get the path with `imageio_ffmpeg.get_ffmpeg_exe()`. | ~30 MB |
| `sherpa-onnx` | Offline speech recognition with per-token timestamps. This is what makes captions land on the syllable. | ~50 MB |
| `pillow` | Frame comparison in the verifier, contact sheets. | small |
| `numpy` | Audio cross-correlation, RMS envelopes. | ~20 MB |

## Node packages

```bash
npm install playwright motion@13
npx playwright install chromium
```

| Package | Why | Size |
|---|---|---|
| `playwright` | Drives the HTML template frame by frame and screenshots each one at 1080×1920. This *is* the renderer. | ~10 MB |
| `chromium` (browser) | The engine those screenshots come from. | ~450 MB |
| `motion@13` | Framer Motion's engine. Its UMD build gets inlined into the HTML, because artifact CSPs block CDNs. | ~2 MB |

If Chromium is already present in the image (common in CI containers), skip the
browser download and point at it:

```bash
export CHROMIUM_PATH=/opt/pw-browsers/chromium
```

## The speech model

From GitHub releases. **Required.**

```bash
mkdir -p models && cd models
curl -sSL -O https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-zipformer-gigaspeech-2023-12-12.tar.bz2
tar xjf sherpa-onnx-zipformer-gigaspeech-2023-12-12.tar.bz2
```

**~310 MB to download, 341 MB on disk.** A Zipformer transducer trained on
GigaSpeech. It is the one that gives per-token timestamps, which is the whole
reason it is here.

### Optional second model

```bash
curl -sSL -O https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-small.en.tar.bz2
tar xjf sherpa-onnx-whisper-small.en.tar.bz2
```

**~636 MB to download — but 1.3 GB on disk once unpacked**, which more than
doubles the footprint. Whisper small.en reads *wording* far more accurately, but
gives no timestamps. You only need it if you receive audio whose script you do
not have. In the daily loop the director writes the script, so **skip this**
unless you are transcribing something unknown. `setup.sh` leaves it out by
default; pass `--whisper` if you want it.

## Sound effects

```bash
bash scripts/fetch_sfx.sh sfx
```

Ten samples, ~500 KB total, pulled from Sonic Pi's sample library on GitHub.
Its own README states every sample there is public domain (CC0), so they are
cleared for commercial use. No attribution required, though it costs nothing to
give it.

## What you do NOT need

- **No TTS.** The voice arrives as a file. No ElevenLabs key, no Piper, no
  local speech synthesis.
- **No Hugging Face.** Every model here comes from GitHub releases. HF is
  blocked on many managed runners; this pipeline is built to not care.
- **No system ffmpeg.** The static binary comes with the pip package.
- **No GPU.** A 40-second read decodes in about 20 seconds on 4 CPU threads.
- **No paid service of any kind.**

## Verify

```bash
python3 scripts/doctor.py
```

Prints a row per dependency and exits non-zero if anything is missing, so it
can gate CI. Run it before the first build in a new environment.
