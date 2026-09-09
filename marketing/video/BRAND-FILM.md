# Brand Mint — 39-second brand film

VO-first, because Flow caps a generation at ten seconds and that ceiling has
been forcing every idea into a single sentence. Write the narration first and
the film can be any length; the video is cut to fit the words instead of the
words being squeezed into arbitrary ten-second blocks.

**Voice:** Raj — Indian English Ads & Social (`FwuKjlVpi0N3exead7ji`),
`eleven_multilingual_v2`. Two takes generated, 38.8s and 37.4s, $0.12 the pair.
The first choice (Rishab, documentary) needs Creator tier and was refused.

**Cuts land at the four widest pauses**, measured with silencedetect, so no
fragment breaks mid-sentence and none exceeds the ten-second ceiling.

| | Window | Length | On screen |
|---|---|---|---|
| F1 | 0.00 → 9.56 | 9.6s | The hesitation |
| F2 | 9.56 → 19.19 | 9.6s | The build |
| F3 | 19.19 → 28.14 | 9.0s | The making |
| F4 | 28.14 → 34.80 | 6.7s | The shipping |
| End card | 34.80 → 38.78 | 4.0s | Sign-off spoken over it |

Four fragments, 48 credits, one 39-second film. The sign-off needs no footage.

Same room throughout — three clips have now proven the model renders it.

---

## F1 · the hesitation — set 10s, use the first 9.6s

```
Cinematic advertisement fragment, 9:16 vertical, 10 seconds, single continuous
shot with no cuts. A dark polished walnut desk in a quiet Hyderabad studio at
night, a deep olive-green wall behind, one warm practical lamp glowing at the
left of frame, a plant softly out of focus at the right. A matte black
smartphone lies face-up on the desk, its screen a dim, blank, cold grey — no
glow, no colour. A hand enters frame slowly, hovers above the phone without
touching it, hesitates, and withdraws out of frame. The camera holds almost
still, drifting a few centimetres closer across the ten seconds. 85mm lens at
T2.0, very shallow depth of field, 24fps. Filmic, low midtone contrast, quiet
and slightly cold despite the warm lamp. Colour: dark walnut, deep olive green,
warm lamp gold, and the flat grey of the dead screen — no mint, no accent
colour anywhere in this shot. Match the previous Brand Mint videos exactly: the
same room, the same desk, the same lamp, the same plant, the same grade.
Absolutely no text, letters, numbers, icons, notifications, user interface,
logos, watermarks or printing anywhere in frame. No faces.
```
*Deliberately the only clip in the campaign with no mint in it. The colour
arrives when the problem gets solved.*

## F2 · the build — set 10s, use 9.6s

```
Cinematic advertisement fragment, 9:16 vertical, 10 seconds, single continuous
shot with no cuts. The same Hyderabad studio, the same dark walnut desk, the
same deep olive-green wall, the same warm practical lamp at the left. Two
monitors stand on the desk facing away from camera, casting a soft blank
mint-green glow across the wood and the wall. A pair of hands rests on a
keyboard in the foreground, framed from behind and slightly to the side, moving
occasionally and unhurriedly. A cup of chai sits beside them with steam rising.
The camera drifts slowly left to right across the ten seconds. 35mm lens at
T2.0, shallow depth of field, 24fps. Filmic, low midtone contrast, calm.
Colour: deep olive green, dark walnut, warm lamp gold, and the mint-green screen
glow as the single saturated accent. Match the previous Brand Mint videos
exactly — the same room, the same light direction, the same grade. Absolutely no
text, letters, numbers, code, user interface, windows, icons, logos, watermarks
or printing visible on the screens or anywhere in frame — the monitors are blank
glowing panels seen from behind. No faces.
```

## F3 · the making — set 10s, use 9.0s

```
Cinematic advertisement fragment, 9:16 vertical, 10 seconds, single continuous
shot with no cuts. The same Hyderabad studio and the same dark walnut desk, now
in warm daylight. Macro close-up: two hands fold and seal a plain kraft paper
parcel with paper tape, fingers and forearms only, never a face, the movement
practised and unhurried. Beside them sit a few unlabelled amber glass jars and a
small pair of scissors with a mint-green handle. The camera pushes in slowly and
steadily across the ten seconds, ending tight on the sealed seam. 100mm macro at
T2.8, very shallow depth of field, 24fps. Soft directional daylight from camera
left. Filmic, low midtone contrast, warm. Colour: kraft brown, dark walnut,
amber glass, deep olive green shadow, one mint-green accent. Match the previous
Brand Mint videos exactly — the same room, the same surface, the same grade.
Absolutely no text, letters, numbers, logos, watermarks, labels, barcodes,
stamps or printing anywhere; the packaging and jars are completely blank. No
faces.
```

## F4 · the shipping — set 10s, use 6.7s

```
Cinematic advertisement fragment, 9:16 vertical, 10 seconds, single continuous
shot with no cuts. The same Hyderabad studio, the same dark walnut desk, the
same deep olive-green wall and warm practical lamp. A neat grid of identical
sealed kraft parcels covers the desk, ready for dispatch. Beside them a matte
black smartphone lies face-up, its screen glowing a soft blank mint-green. The
camera pulls back slowly and steadily across the ten seconds, revealing the full
spread of parcels and the room around them, ending wide with deep olive-green
negative space filling the upper third. 35mm lens at T2.0, 24fps. Filmic, low
midtone contrast, warm and settled. Colour: kraft brown, dark walnut, deep olive
green, warm lamp gold, mint-green screen glow as the single saturated accent.
Match the previous Brand Mint videos exactly — the same room, the same desk, the
same lamp, the same grade. Absolutely no text, letters, numbers, icons, user
interface, logos, watermarks, labels, barcodes or printing anywhere in frame.
No faces, no people, no hands.
```

---

## Two ways to shoot it

**Independent** — each fragment generated from its prompt alone, cut together
afterwards. Continuity rests entirely on the prompt wording. Any shot can be
re-rolled without disturbing the others, which is why the four Reels were made
this way.

**Continuation** — each fragment seeded with the last frame of the one before,
so shot two physically begins where shot one ended and the camera reads as
travelling through one continuous space. This is the theatrical version.

```bash
./seed-next.sh F1.mp4 seeds/f2-seed.png     # upload that as F2's start frame
```

The grab lands 0.15s before the true end on purpose: the last frames of a
generation are usually its softest, and a soft seed propagates that softness
through the whole next shot.

The cost of continuation is composition. Seeded from a tight macro on a sealed
seam, the next shot must open on that macro — it cannot start wide. So use it
where the film should flow, and a hard cut where it should breathe:

| | | |
|---|---|---|
| F1 → F2 | hard cut | night to day, dead screen to working screen. The cut *is* the argument |
| F2 → F3 | continuation | one continuous move from the desk to the hands |
| F3 → F4 | continuation | tight seam pulling back to the full spread |
| F4 → end card | dissolve | already written |

Seeded fragments still carry their full text prompt. The seed fixes where the
shot starts; the prompt still directs where it goes.

## Assembly

Generate all four at 10s, send them over, and the film is cut here: each
fragment trimmed to its window, joined, the VO laid under, overlays placed in
the gaps, end card on the tail. Nothing needs doing by hand.

Set the highest resolution Flow offers. Everything composites on a 1080×1920
timeline; 720p fragments are upscaled rather than scaling the type down.
