---
name: voiceover-skill-mastery
description: Produce a Brand Mint vertical campaign film (9:16 MP4) from a voiceover recording and three real-world clips. Use whenever the user supplies a voiceover WAV/MP3 for a reel, asks for the next film in the campaign, sends clip1/clip2/clip3, or asks for the daily script and shot prompts. Handles transcription, word-level caption sync, animation, sound design, rendering and verification.
---

# Voiceover Skill Mastery

Turns a voiceover into a finished, verified 1080×1920 MP4 with word-synced
captions, animated scenes, three real-world cutaways and a sound-effect bed.

The film is the same machine every day. **Only the script and the three clips
change.** Everything else — the design system, the scene grammar, the pipeline,
the checks — is fixed, and is what makes the output look like one campaign
rather than a series of one-offs.

## The loop

```
Day N
  1. Director writes  →  voiceover script + 3 clip prompts   (you)
  2. Human generates  →  ElevenLabs WAV + clip1/2/3.mp4      (them)
  3. You build        →  transcribe · align · render · mix · verify
  4. Deliver          →  MP4 + contact sheet + verification numbers
```

When the user says "next script", do step 1 only and stop. When they send
audio and clips, do steps 3–4.

## Non-negotiables

These are the rules that separate this from an amateur reel. Do not relax them.

1. **Never show the same words twice.** A scene is either `type` (the spoken
   line *is* the typography, captions hidden) or `support`/`broll` (visuals add
   information the voice does not say, captions shown). Mixing them is the single
   most amateurish thing this format can do. Verified by check **G**.
2. **Every frame is a computed in-between.** Animation is driven from each
   scene's own clock, never "set visible on enter". A rendered frame at t=5.10
   must show the card half-populated, not fully. Verified by the motion proof.
3. **Three clips, three jobs, three places.** Never bunch them. See *Clip slots*.
4. **Word-level sync or it does not ship.** Captions are cut to timestamps
   transcribed from the actual recording, never estimated. Verified by check D.
5. **Verify the delivered file, not the source.** Every number in the report is
   measured from the encoded MP4.

## Clip slots

Three real-world clips, at three points, doing three different jobs. This
rhythm is what stops a motion-graphics film feeling like a slide deck.

| Slot | Lands at | Job | Feel |
|---|---|---|---|
| **A** | ~15–25% in | Establish the world the problem lives in | Still, observational |
| **B** | ~45–60% | The turn — the evidence or the consequence | Movement, unresolved |
| **C** | ~75–90% | Resolution, or the product in use | Warm, ordered, calm |

Slot C must feel visually opposite to slot A. That contrast is the argument.

## Writing the daily script

Target **60–70 words ≈ 30–33 seconds** at the client's read pace (~2.05 words
per second — measure it from their last file and adjust).

Structure that works:

```
HOOK          one line that contradicts itself or names a loss
SETUP         the concrete situation, with a number
ESCALATION    2–3 short beats, each adding a cost or a consequence
THE NUMBER    the total. This is the peak of the film.
NAME IT       give the problem a word the viewer can search
THE QUESTION  something answerable in one word  ← this is the engagement
CTA           "Comment X. I'll send Y."
```

The question outperforms the CTA. "Do you know your number?" gets replies from
people telling you they have the problem. Write for the reply, not the like.

**Do not put statistics in the script.** An agency publishing a number invites
"source?" and that argument is not the engagement you want. Ask for the
viewer's number instead. If a figure must appear, use a named client's own
data.

Blank lines in the script are scene cuts. Keep them.

## Writing the three clip prompts

Every prompt ends with this, verbatim:

```
1080×1920 vertical, 5 seconds. No people, no faces, no hands. No text of any
kind anywhere in the frame — no text overlay, no captions, no subtitles, no
watermarks, no logos, no signage, no labels on packaging, no readable screens,
no handwriting, no numbers. Objects and spaces only.
```

The text clause is long deliberately. The animation layer owns every word on
screen, so a clip carrying its own text collides with the captions and has to be
regenerated — spell out every form of it, and check each clip before using it.

Append this palette line to all three so they cut together:

> *muted desaturated palette, deep forest green and warm kraft brown, soft
> overcast daylight from one side, shallow depth of field, subtle film grain,
> no text or branding anywhere*

Specify camera move explicitly (slow push in / drift sideways / pull back /
handheld sway). "Cinematic" is not a camera move.

## Building

See `references/PIPELINE.md` for exact commands and `references/DESIGN.md` for
the visual system. In short:

```bash
bash    scripts/setup.sh                             # once per environment
python3 scripts/doctor.py                            # confirms it; non-zero if not
python3 scripts/transcribe_align.py <vo.wav> "<script text>" out/
node    scripts/render.mjs           out/            # 1080×1920 PNG sequence
python3 scripts/build_mix.py         out/            # voice + SFX bed
bash    scripts/encode.sh            out/            # H.264 + AAC
python3 scripts/verify.py            out/            # the report
```

Write `out/scenes.json` before rendering — the scene spec, documented in
`references/SCENES.md`. Fourteen scenes is the house length; vary it with the
script, but keep the alternation.

## Reporting

Give the user these numbers, measured from the MP4, every time:

```
A  voice offset, source → MP4        must be 0 samples
B  MP4 frame == rendered frame       compression noise only (<12/255)
D  words highlighted at midpoint     must be n/n
E  spoken word on screen             must be n/n
F  caption gaps                      must be 0 frames
G  caption over a type scene         must be 0 frames
    peak level                       must be under 0 dBFS
```

If any check fails, fix it and re-render. Do not ship with a caveat on these.

## Assets

Sound effects are CC0, from Sonic Pi's sample library (public domain, cleared
for commercial use). `scripts/fetch_sfx.sh` pulls them. Cue them to each
element's own animation delay, not to the scene start — a tick should land with
the row it belongs to.

## Failure modes seen in production

- **Chromium here cannot decode H.264.** Extract the clips to JPEG frames with
  ffmpeg and composite those; never rely on a `<video>` element rendering.
  `scripts/prep_clip.sh` does this.
- **Generated clips carry a watermark** in the bottom-right that no prompt
  removes. `prep_clip.sh` crops the bottom 13% to take it out. The grade will not
  hide it — the grade is semi-transparent and the mark is solid.
- **TTS voice arrives at 0 dBFS**, leaving no headroom for the effects bed, so
  the master rides the limiter and risks clipping once AAC adds inter-sample
  peaks. `build_mix.py` measures the voice peak and ducks it to −1.5 dBFS. It
  only ever attenuates.
- **`alimiter` delays audio by about its 5 ms lookahead** and the voice drifts
  off the captions. Trim it back — but *measure* the delay, do not compute it:
  5 ms at 48 kHz is 240 samples and ffmpeg 7.0 delays 239. `build_mix.py`
  measures it each run.
- **Check the offset at 48 kHz, not lower.** At 24 kHz a one-sample error rounds
  to zero and the report reads clean when it is not.
- **Whisper caps at 30 s.** Chunk on silence for longer reads.
- **`vw` units inside the fixed stage overflow.** Use `cqw` — the stage is a
  container.
- **A scene with no captions must not reserve caption space**, or it renders
  with a dead lower third.
