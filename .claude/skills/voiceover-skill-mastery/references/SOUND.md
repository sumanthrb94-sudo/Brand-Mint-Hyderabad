# Sound design

Sound effects are part of the story structure, not decoration. Find the visual
beat first, then choose the smallest sound that makes that beat easier to feel.
The voice is always dominant; effects sit underneath it.

## What this format does and does not use

**No trending audio.** These films are voice-led — the read *is* the track, and a
licensed music bed would fight it. Instagram's trending-audio mechanic does not
apply here and should not be bolted on. If a film ever does want a music bed,
check it in the Instagram app in the current session (Reels feed, or Professional
Dashboard → Trending audio) and confirm it is still trending immediately before
publishing; never describe a track as trending from memory.

**Effects are CC0.** `scripts/fetch_sfx.sh` pulls ten samples from Sonic Pi's
library, which its README places in the public domain. That is the whole bed. It
is cleared for commercial and client work, which a file labelled "viral", "free"
or "no copyright" is not.

Keep an asset log if the bed ever grows beyond that set: source URL, licence,
date, attribution requirement, project filename. Never assume.

## One primary effect per beat

Layer a second only when it does a different job — a quiet whoosh for the motion
plus a short pop for the text landing. Stacking impacts, risers and reaction
sounds on every cut is what makes a reel feel noisy and dated within a month.

| Family | Our samples | Best use | Placement |
|---|---|---|---|
| whoosh, swish | `ambi_swoosh`, `perc_swash` | Transitions, scene changes, hero type entering | On the movement, or 2–6 frames before |
| pop, pluck | `elec_pop`, `elec_twip` | Text reveals, a row landing, small punchlines | Exactly on the reveal frame |
| hit, impact | `bd_tek`, `bass_hit_c` | The peak, a number slam, a title card | First frame of the emphasis |
| bright accent | `elec_ping`, `elec_blip` | Ticks, list items, a chip appearing | On the element, not the scene |
| cymbal, shine | `drum_cymbal_open` | The one reveal that matters. Quiet and short | On the reveal, under the impact |

Risers, glitches, record scratches, meme stings: not in this campaign. The films
are teardowns read flat, and a comedy sting undercuts the argument.

## Timing

**Cue to the element's own delay, not the scene start.** A tick belongs to the row
it belongs to. Scene start plus `data-d` is the cue time — that is why
`build_mix.py` takes absolute seconds and the cue sheet is generated from
`scenes.json` rather than typed by hand:

```python
cues = [{"sfx": s, "t": round(scene_start[i] + delay, 3), "gain": g} ...]
```

Put the strongest transient on the exact frame the viewer should notice a change.
Trim long tails unless the tail is deliberately holding atmosphere.

## Mixing

Levels that have worked across the campaign:

```
voice          1.0, ducked to -1.5 dBFS peak before the mix
impacts        0.50 – 0.62
whooshes       0.30 – 0.36
accents/ticks  0.20 – 0.26
```

- **Duck the voice, do not raise the bed.** TTS comes back at 0 dBFS with no room
  for anything. `build_mix.py` measures and attenuates; it never boosts.
- **Keep the master under 0 dBFS true peak.** −1 dBFS or lower, or AAC's
  inter-sample peaks clip what looked clean in PCM.
- **The limiter is a safety net, not a mixing tool.** If it is engaging on more
  than a handful of samples, the bed is too loud.
- Short fades on edits to avoid clicks; longer fades on ambience.
- Do not use stereo movement as a substitute for good timing.

## The test that matters

Play it on phone speakers. **If the first thing you notice is an effect rather
than the message, the effect is too loud.** Then check headphones and a quiet
room. Verify captions still line up after any change to the mix — a change to
the chain can move the whole track (see the limiter note in `PIPELINE.md`).

## Delivery checklist

```
voice offset          0 samples          verify.py check A
peak                  under 0 dBFS       verify.py check A
limiter engagement    near zero samples
one effect per beat   no stacked impacts
phone-speaker test    message first, effects second
rights                CC0 or original, logged
```
