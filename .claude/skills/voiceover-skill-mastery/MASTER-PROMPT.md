# Master prompt

Copy everything between the rules and give it to the agent that will build the
skill in another repo. It is self-contained.

---

You are building a repeatable pipeline that turns a daily voiceover recording
into a finished, verified 9:16 Instagram film. Package it as a Claude Code skill
called **voiceover-skill-mastery**.

## What it makes

A 1080×1920, 30 fps, H.264 + AAC MP4, roughly 30 seconds, containing:

- word-synced captions cut to timestamps transcribed from the actual recording
- animated typographic scenes rendered from HTML with Framer Motion
- **three real-world clips** cut in at three different points
- a sound-effect bed placed against the animation, not sprinkled over it

## The daily loop

The only inputs that change are the script and the three clips.

1. **Agent** writes the voiceover script and three clip prompts, and stops.
2. **Human** generates the voice (ElevenLabs) and the three clips, and sends them.
3. **Agent** builds: transcribe → align → render → mix → encode → verify.
4. **Agent** delivers the MP4, a contact sheet, and the verification numbers.

## Non-negotiable rules

1. **Never show the same words twice.** Each scene is either `type` — the spoken
   line *is* the typography, captions hidden — or `support`/`broll`, where the
   visuals add information the voice does not say and captions are shown. Mixing
   the two is the single most amateurish thing this format can do. Assert it: no
   rendered frame may carry a caption on a `type` scene.
2. **Every frame is a computed in-between.** Drive all animation from each
   scene's own clock — `progress = ease((t - sceneStart - delay) / duration)` —
   applied per element, per frame. Never "set visible on enter". If you render by
   screenshotting, a frame partway through an entrance must show the half state.
   This is the difference between a film and a slideshow, and it is easy to get
   wrong without noticing.
3. **Three clips, three jobs, three places.** Slot A at 15–25% establishes the
   world; slot B at 45–60% is the turn; slot C at 75–90% is the resolution and
   must feel visually opposite to A. Never bunch them.
4. **Word-level sync or it does not ship.** Never estimate timings from word
   counts. Transcribe the real audio.
5. **Verify the delivered file, not the sources.**

## What to install

Everything is a public package or a GitHub release. No account, no key, no paid
service — the voice is supplied from outside, so nothing here synthesises speech.

```bash
pip install imageio-ffmpeg sherpa-onnx pillow numpy   # ffmpeg ships inside the first
npm install playwright motion@13
npx playwright install chromium                       # ~450 MB; skip if the image has one

mkdir -p models && cd models                          # ~310 MB, required
curl -sSL -O https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-zipformer-gigaspeech-2023-12-12.tar.bz2
tar xjf sherpa-onnx-zipformer-gigaspeech-2023-12-12.tar.bz2
```

Budget ~1.2 GB of disk. Hugging Face is **not** needed and is blocked on many
managed runners; every model here comes from GitHub releases, deliberately. Ship
a `doctor` script that checks each of these and exits non-zero, and run it before
the first build in any new environment.

## Pipeline

Everything runs offline; no API keys.

- **ffmpeg** — `pip install imageio-ffmpeg`, then
  `imageio_ffmpeg.get_ffmpeg_exe()`. A static binary; no system install.
- **ASR** — `pip install sherpa-onnx` plus a Zipformer transducer from GitHub
  releases (`k2-fsa/sherpa-onnx`, tag `asr-models`). Hugging Face is commonly
  blocked; GitHub usually is not. The transducer gives per-token timestamps.
  The script is already known, so align it onto those timings with `difflib` —
  that keeps true timing and discards mishearings.
- **Animation** — `npm i motion@13` (Framer Motion's engine), inlined into the
  HTML as a UMD bundle. Artifact CSPs block CDNs.
- **Rendering** — Playwright drives `template.html?render=1` through
  `window.__seek(t)` one frame at a time at 30 fps, screenshotting 1080×1920.
  Deterministic and reproducible.
- **Sound** — CC0 samples from Sonic Pi's library
  (`sonic-pi-net/sonic-pi/etc/samples`, public domain per its README). Mix with
  `adelay` + `amix` + `alimiter`.

## Traps that will cost you a day

- **Containerised Chromium usually cannot decode H.264.** Do not rely on a
  `<video>` element rendering. Extract each clip to JPEG frames with ffmpeg and
  composite those per render frame.
- **`alimiter` delays audio by roughly its 5 ms lookahead** and the whole film
  drifts off the captions. Follow it with an `atrim`, but **measure the delay
  rather than computing it** — 5 ms at 48 kHz is 240 samples and ffmpeg 7.0
  actually delays 239. Push noise through the filter alone, cross-correlate, use
  that number. And run the final offset check at the delivery rate: at 24 kHz a
  one-sample error rounds to zero and the report lies to you.
- **Whisper caps at 30 seconds** and transducers can crash on long input. Chunk
  on silence for anything longer.
- **`vw` units inside a fixed-width stage overflow.** Use container queries
  (`cqw`) with `container-type: inline-size` on the stage.
- **A scene with no captions must not reserve caption space**, or it renders with
  a dead lower third.
- **Scene switching must be start-based** — a scene runs until the *next* scene's
  first word. An end-based hold-over overlaps the following phrase and leaves the
  previous caption on screen while its first word is being spoken.

## Verification report

Measure all of this from the encoded MP4 and print it every run:

```
A  voice offset, source → MP4        must be 0 samples
B  decoded frame == rendered frame   compression noise only (<12/255)
D  words highlighted at midpoint     must be n/n
E  spoken word on screen             must be n/n
F  caption gaps mid-speech           must be 0 frames
G  caption over a type scene         must be 0 frames
   peak level                        must be below 0 dBFS
```

Exit non-zero on any failure. Never ship with a caveat on these.

## Writing the daily script

60–70 words ≈ 30–33 seconds. Measure the client's actual words-per-second from
their last recording and adjust.

```
HOOK          contradicts itself or names a loss
SETUP         the concrete situation, with a number
ESCALATION    2–3 short beats, each adding a cost
THE NUMBER    the total — the peak of the film
NAME IT       give the problem a searchable word
THE QUESTION  answerable in one word  ← this is the engagement
CTA           "Comment X. I'll send Y."
```

The question outperforms the CTA: it produces replies from people identifying
themselves as having the problem. **Do not put statistics in the script** — an
agency publishing a figure invites "source?", and that argument is not the
engagement you want. Ask for the viewer's number instead.

Blank lines are scene cuts.

## Writing the three clip prompts

Every prompt ends with: `1080×1920 vertical, 5 seconds, no people, no faces, no
hands, no text, no logos, no readable screens.` Objects and spaces only.

Append the same palette line to all three so they cut together, and state the
camera move explicitly — "cinematic" is not a camera move.

---
