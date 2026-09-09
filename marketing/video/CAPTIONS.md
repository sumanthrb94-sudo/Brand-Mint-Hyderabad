# Captions, without guessing the words

Meta autoplays muted. A talking head with no captions is a stranger mouthing
nothing. But captions that do not match the audio are worse than none, so this
never assumes the avatar said the script — it reads what it actually said.

Neither half needs an ML model downloaded locally, which matters: HuggingFace is
blocked from this sandbox, so Whisper and friends cannot fetch weights here.

## 1 · The words — ElevenLabs Scribe via the connector

Extract the audio, upload it, transcribe:

```bash
ffmpeg -i clip.mp4 -vn -ac 1 -ar 16000 -c:a libmp3lame -b:a 64k audio.mp3
```

Then `creative_create_asset_upload` (name, `audio/mpeg`, exact byte size) → PUT
the bytes to the returned `upload_url` with a matching `Content-Type` →
`creative_add_flow_asset_node` (modality `audio`, the `content_asset_id`, a
`flow_id` from `creative_create_flow`) → `creative_transcribe_audio` with that
node as `connect_from` → poll `creative_get_flow_run_status` and read
`transcripts`.

Costs roughly **$0.014 for ten seconds**. Finalizing the upload *without* a
`flow_id` leaves the asset unplaced and it cannot be finalized twice — go
through `creative_add_flow_asset_node` instead of re-finalizing.

## 2 · The timings — ffmpeg, no model

```bash
ffmpeg -i audio.mp3 -af "silencedetect=noise=-38dB:d=0.14" -f null -
```

Speech blocks are the gaps between reported silences. V00 gave five blocks at
both −32dB and −38dB, which matched its five spoken clauses exactly. When the
block count does not match the clause count, loosen `d` before splitting a
block by hand.

## 3 · The subtitle file

`PlayResX/Y` **1080×1920** so sizes mean what they say. `MarginV: 600` is the
number that matters — it clears the lower third at y≈1390 *and* Flow's
watermark at y≈1690. Drop it and captions collide with one or the other.

libass cannot read `.woff2`, and the repo's fonts are all woff2. Convert first:

```python
from fontTools.ttLib import TTFont          # pip install fonttools brotli
f = TTFont("fonts/inter.woff2"); f.flavor = None; f.save("Inter.ttf")
```

The family name comes out **"Inter Variable"** — use that in the ASS style, not
"Inter", or libass silently substitutes a default.

## 4 · Burn it

```bash
./compose.sh clip.mp4 talking out.mp4 captions.ass ./fonts
```
