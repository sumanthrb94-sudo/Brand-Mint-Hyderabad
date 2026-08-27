# The visual system

Fixed across every film. Consistency is what makes a daily output read as a
campaign instead of a series of experiments.

## Colour

```
--ink      #0A2117   ground
--ink-2    #0F2E20   raised surfaces
--mint     #7BF2A8   accent, one per frame
--mint-2   #3FC97A   gradient partner on the rail
--cream    #F4EFE4   headline type
--muted    #87A296   labels, secondary
--alert    #E0483C   strikes and refusals only
```

The mint is the brand's own green pushed brighter, because this is watched at
arm's length in daylight, not read on a desk. **One mint moment per frame.** If
two things are mint, neither reads.

## Type

Two faces, opposed on purpose:

- **Georgia (serif)** for hero lines and the wordmark — editorial, considered.
- **system-ui at 800/900** for captions, labels and numbers — phone-native.

That collision is the identity: loud captions over precise typography, which is
what an agency selling "fixed scope, fixed price" should look like.

All sizes in **`cqw`** — the stage is a container. `vw` overflows the frame on
wide screens. Labels get `.16–.26em` letter-spacing and uppercase. Numbers get
`font-variant-numeric: tabular-nums` so they do not jitter as they count.

## Captions

Lower third, 3–4 words at a time, never a whole sentence. Spoken words at full
opacity, unspoken at .26, the active word in mint.

Over a mint full-bleed scene, invert: ink text, active word on a white
highlighter drawn with `box-shadow` so the pill cannot reflow the line.

## Motion

One curve for almost everything — expo-out, `1 - 2^(-10p)`. Fast departure,
long settle. A small back-overshoot only on pops and the peak number.

Entrances, by block:

| Block | Movement |
|---|---|
| Hero line | masked upward per line, 104% → 0 |
| Row | fade + 26px from the right, staggered ~.14s |
| Cell | scale .9 → 1 with overshoot |
| Number | scale .62 → 1, hard |
| Bar | grows from both ends |
| Strike | word arrives, line drawn through it .26s later |
| Rule | width 0 → 46% |

Everything is computed from the scene's own clock. Nothing is "switched on".

## Frame furniture

- A single mint hairline of progress across the top. Not segmented bars.
- A slow-drifting radial wash behind everything, so no frame is completely still.
- Grain at .2 overlay, vignette at the edges. Both subtle — they stop flat
  colour fields looking like slides.
- Footage gets a top-and-bottom gradient so captions never fight the image.

## Grid

Margin `8cqw`. Rail scenes indent content to `17cqw`. Captions reserve
`46cqw` at the bottom — and scenes without captions must drop that reserve to
`16cqw`, or they render with a dead lower third.
