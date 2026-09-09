# Brand Mint — Flow project asset kit

Everything uploaded to the Flow project carries the `brandmint-` prefix so the
whole kit sorts together and nothing gets mixed into another project's assets.

**One caveat I cannot check from here:** I have no way to verify how Flow lets a
prompt *refer* to a named project asset — whether you can call it by name in the
text, or whether it only works as a first-frame seed. The approach below works
either way, because it leans on the seed route, which definitely works: generate
the still, use it as the starting frame, and paste the continuity line as belt
and braces.

---

## 1 · The six world references — you generate these, free

Stills cost **0 credits** in Nano Banana. Generate each one, re-roll until it is
right (still free), then upload it to the Flow project under the name given. These
six define the physical world all 30 videos share: one table, one quality of
light, one parcel, one phone, one street, one studio.

Do this **once**, before video V01. Everything after references them.

### `brandmint-world-table`
```
Photograph of a small artisan workshop table in Hyderabad, India. Warm cream
linen surface, a few sprigs of dried botanicals, kraft-brown paper and a roll of
paper tape. Soft morning window light entering from camera left, gentle falloff
into shadow on the right, faint dust motes in the beam. Shot on a 50mm lens at
T2.0, shallow depth of field, filmic low-contrast grade. Colour: warm cream,
kraft brown, deep ink-green shadow, one small mint-green object as the single
saturated accent. Editorial and calm, not corporate, not a stock photo. No text,
letters, numbers, logos, labels, signage or branding anywhere in frame. No people.
```

### `brandmint-world-shelf`
```
Photograph of a wooden shelf in a small Indian brand's studio, holding a neat row
of identical unlabelled amber glass jars. Soft north-facing daylight, gentle
shadows, cream wall behind. Shot on 50mm at T2.0, shallow depth of field, filmic
low-contrast grade. Colour: amber glass, cream wall, warm wood, one mint-green
reflection. No text, letters, numbers, logos, labels, signage or branding
anywhere — the jars are completely blank. No people.
```

### `brandmint-world-street`
```
Photograph of glass office towers in HITEC City, Hyderabad, India at early
morning. Low golden sun raking across the facades, faint haze, calm and still.
Shot on 24mm at T4, deep focus, filmic low-contrast grade. Colour: warm gold on
glass against deep green-blue sky. No text, letters, numbers, logos, signage,
billboards, hoardings or company names on any building. No readable vehicle
number plates. No people in focus.
```

### `brandmint-prop-parcel`
```
Product photograph of a single sealed kraft paper parcel on warm cream linen,
tied with fine natural cotton twine. Three-quarter angle, soft directional
daylight from camera left. Shot on 85mm at T2.8, shallow depth of field. The
packaging is completely plain. Colour: kraft brown, cream, deep green shadow.
No text, letters, numbers, logos, labels, barcodes, stamps, printing or shipping
marks anywhere on the parcel. No people.
```

### `brandmint-prop-phone`
```
Product photograph of a matte black smartphone lying face-up on warm cream linen.
The screen shows only a soft, evenly defocused mint-green glow — completely
blank. Slight overhead angle, soft daylight from camera left. Shot on 85mm at
T2.8, shallow depth of field. Colour: cream, matte black, mint green #10B981
glow. No text, letters, numbers, icons, user interface, apps, status bar, logos
or branding on the screen or the device. No people.
```

### `brandmint-set-founder`
```
Photograph of an empty calm studio interior in Hyderabad set up for a seated
interview: a dark wooden desk, one warm practical lamp, a plant, deep ink-green
wall softly defocused behind. Soft key light from camera left. Shot on 50mm at
T2.0. Colour: deep green-black, warm lamp glow, one mint-green accent. Editorial
and understated. No text, letters, numbers, logos, signage, posters, artwork or
branding anywhere. No people in frame.
```

---

## 2 · The continuity line

Append this to **every** video prompt in `OMNI-30-VIDEO-PLAN.md`. It is what turns
thirty clips into one campaign.

```
Match the uploaded Brand Mint reference assets exactly: the same warm cream linen
surface, the same soft morning light from camera left, the same kraft packaging,
the same filmic low-contrast grade, the same single mint-green accent. Treat
these as one continuous physical location shot on the same day with the same
lens.
```

Per-video, seed from whichever reference fits: table shots from
`brandmint-world-table`, shelf from `brandmint-world-shelf`, V09 from
`brandmint-world-street`, V11–V18 from `brandmint-set-founder`.

---

## 3 · Already rendered — in `assets/`

Do **not** upload these to Flow. They are editor assets, and anything carrying a
logo tempts the model into drawing letterforms, which every prompt forbids.

| File | Size | Where it goes |
|---|---|---|
| `brandmint-ov-hook.png` | 1080×1920 α | Editor — overlay |
| `brandmint-ov-features.png` | 1080×1920 α | Editor — overlay |
| `brandmint-ov-price.png` | 1080×1920 α | Editor — overlay |
| `brandmint-ov-proof.png` | 1080×1920 α | Editor — overlay |
| `brandmint-ov-cta.png` | 1080×1920 α | Editor — overlay |
| `brandmint-ov-lower-third.png` | 1080×1920 α | Editor — V11–V18 name plate |
| `brandmint-endcard-9x16.png` | 1080×1920 | Editor — Reels/Stories end card |
| `brandmint-endcard-1x1.png` | 1080×1080 | Editor — feed end card |
| `brandmint-endcard-16x9.png` | 1920×1080 | Editor — in-stream end card |
| `brandmint-style-board.png` | 1920×1080 | The one safe Flow upload — palette only, no logo |

---

## 4 · Order of work, per video

1. Generate the opening still in Nano Banana — **0 credits**, re-roll freely.
2. Upload it to the Flow project as `brandmint-v<NN>-frame`.
3. Set **9:16 · 720p · 10s · Omni 1.1 Flash** (12 credits — the default is 8s).
4. Generate from the video prompt + continuity line, seeded on that still.
5. In the editor: composite on a 1080×1920 timeline, drop the overlay, end card,
   burned captions.

Cost per finished video: **12 credits.** All thirty: **360 of your 1050.**

---

## 5 · Naming, so nothing drifts

```
brandmint-world-*     the six shared locations and props (upload once)
brandmint-v01-frame   per-video seed still
brandmint-ov-*        text overlays          (editor only)
brandmint-endcard-*   end cards              (editor only)
brandmint-style-board palette reference
```

When a prompt changes, re-roll only `brandmint-v<NN>-frame`. The world references
stay fixed — that is the whole point, and the reason not to regenerate them
casually. If you ever do replace one, every video made after it will quietly
belong to a slightly different world than the ones before.
