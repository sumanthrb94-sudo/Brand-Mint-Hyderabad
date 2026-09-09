# Brand Mint — 30 videos, 3 months, one paste each

**Budget — corrected from the Flow app itself.** 1050 credits. Omni 1.1 Flash
costs **12 credits per video**, not 30, so the real ceiling is **87 generations**.
All 30 videos cost 360 credits and leave ~57 re-rolls. Nothing here is
credit-constrained. (Veo 3.1 Lite is 10/video and Veo 3.1 Fast is 20 — Omni Flash
at 12 is the sensible default; try one V01 on Veo Fast and compare before
committing.)

**Stills are free.** Nano Banana in the same app reports **0 credits** for image
generation. So do not burn a video credit finding a composition: generate the
opening frame as a still first, re-roll it as many times as you like for nothing,
and only spend 12 credits animating a frame you already like. Order of work per
video: *still (free, iterate) → upload as the asset → animate (12)*.

**Set duration to 10s explicitly.** Flow defaults to 8s. 4/6/8/10 are the options
and every prompt here is written for 10.

**Output is 720p max** (720×1280 at 9:16). The overlay pack renders at 1080×1920,
so composite on a 1080×1920 timeline and let the footage upscale — the type stays
sharp, which is the part that matters. Meta re-encodes anyway.

**Visible watermarking is mandatory in your region** — the toggle in Flow is
locked. Every clip carries it. Do not plan a layout that fights it and do not try
to remove it: synthetic-media labelling is a legal requirement in India, not a
Flow preference. Check which corner it lands in on your first clip and keep the
end-card lock-up and lower third clear of it.

**Every block below is the complete prompt.** Paste it, generate, done. The
`POST:` line underneath is for you in the editor — it never goes to Omni.

**Why single shots.** 10s is one shot's worth. Models asked for four cuts in ten
seconds return mush. Only V01 is multi-beat, because it's the flagship and worth
the re-rolls.

**The no-text rule holds throughout.** AI garbles letterforms and a mangled
₹ price in a paid ad is worse than no ad. Text and logo go on in post.

**Claims permitted, and no others:** 4 brands shipped · 8+ years on every build ·
from ₹49,999 · static site from ₹14,999 · HITEC City, Hyderabad · UPI, COD, GST
invoices, WhatsApp. No revenue figures, no ROI percentages, no client counts
beyond four.

**Cadence:** ~2 a week for 13 weeks. Format 9:16 unless noted.

---

## WHAT V00 ACTUALLY PRODUCED — measured, not assumed

Findings from the delivered file. These override earlier guesses.

- **Resolution varies by generation, so check it every time.** V00 came back
  1080×1920; V02, generated from the same app at the 720p setting, came back
  720×1280. Both 24fps H.264 with AAC. Composite everything on a **1080×1920**
  timeline and upscale any 720p clip 1.5× — scaling the overlays down instead
  costs you resolution on the type, which is the part people read.
- **The no-text constraint held completely.** Nothing rendered a letterform.
  Keep the negative-constraint sentence on every prompt.
- **The Flow watermark is a four-point sparkle at roughly x 830–960, y 1690–1770**
  — lower right of centre, not a corner. The overlay safe band ends at y=1560 so
  the pack clears it, but **burned captions must not sit bottom-right**. Push
  caption blocks left, or above y=1650.
- **The established look is warmer and more olive than the brief asked for**: a
  sage/olive-green wall rather than ink-green #0B1F1A, warm practical lamp left,
  dark walnut desk, soft key from camera left. It reads well. Do not fight it —
  every subsequent prompt should match *this*, because consistency now beats the
  original palette note.

---

## V03 — the order arrives

Same room again, later in the day. V02 ended on nine sealed parcels; this opens
on them still there in the dark. That is a campaign, not three unrelated clips —
and the model has now twice proven it renders this space.

After this, break the pattern: V04 should be a founder cut, so the feed
alternates face / product / face rather than settling into one texture.

**Flow:** 9:16 · **10s** · Omni 1.1 Flash · 12 credits · pick the highest
resolution offered.

```
Product advertisement, 9:16 vertical, 10 seconds, single continuous shot with no
cuts. The same room as the previous Brand Mint videos, now at night: the same
dark polished walnut desk, the same deep olive-green wall, the same warm
practical lamp glowing at the left of frame, the same plant softly out of focus
at the right. A neat stack of plain kraft parcels sits at the back of the desk,
already sealed. No person in frame at any point. In the foreground a matte black
smartphone lies face-up on the desk beside a cup of chai with steam rising. The
camera pushes in very slowly and steadily across the whole ten seconds. Three
times, spaced unevenly, the phone vibrates gently against the wood and a soft
blank mint-green glow pulses across its screen and fades. The steam keeps
rising. 85mm lens at T2.0, very shallow depth of field, 24fps. The lamp is the
only warm source; the rest of the room falls into deep green shadow. Filmic, low
midtone contrast, calm and quiet. Colour: dark walnut, deep olive green, warm
lamp gold, kraft brown, and the mint-green screen glow as the single saturated
accent. Match the previous Brand Mint videos exactly — the same room, the same
desk, the same lamp, the same plant, the same grade — treat it as the same
location filmed the same evening. Absolutely no text, letters, numbers, icons,
notifications, user interface, app windows, status bar, logos, watermarks,
labels or printing anywhere in frame — the phone screen is pure blank glowing
colour. No faces, no people.
```

### The edit — 12s timeline, 1080×1920

| In | Out | Layer |
|---|---|---|
| 0.0 | 10.0 | The clip, upscaled to 1080×1920 if it renders at 720p |
| 0.0 | 10.0 | `brandmint-ov-bug.png` — top-left |
| 1.0 | 4.4 | `brandmint-ov-features.png` — UPI · COD · GST · WhatsApp |
| 6.0 | 9.4 | `brandmint-ov-cta.png` |
| 10.0 | 12.0 | `brandmint-endcard-9x16.png`, 0.3s dissolve |

Time each buzz in the clip and land the overlay fades **between** them, not on
them. Two things pulsing at once is noise.

Silent, or one warm sustained pad. No voiceover — the shot is about quiet.

---

## V02 — the second post

Deliberately the opposite texture to V00: no person, no speech, product only. A
feed of nothing but talking heads dies. Shot in **the same room** as V00 rather
than a new workshop, which is the cheapest continuity there is — the model has
already proven it renders that space.

Single continuous shot. V00 proved a 10-second single take works; do not
reintroduce cuts.

**Flow:** 9:16 · **10s** · Omni 1.1 Flash · 12 credits · seed from a free Nano
Banana still of the same desk.

```
Product advertisement, 9:16 vertical, 10 seconds, single continuous shot with no
cuts. The same room as the previous Brand Mint video: a dark polished wooden
desk, a deep olive-green wall behind, one warm practical lamp glowing at the
left of frame, a plant softly out of focus on the right. No person visible.
Opening on a macro close-up of the desk surface. Two hands enter frame and
slowly fold and seal a plain kraft paper parcel with paper tape — fingers and
forearms only, never a face, the movement unhurried and practised. As the seal
completes the camera pulls back smoothly and steadily, revealing nine identical
sealed parcels stacked in a neat grid on the same desk, ready to ship. One
continuous move, slow and controlled, ending with the parcels low in frame and
the olive-green wall filling the upper third. 50mm lens at T2.0, shallow depth
of field, 24fps, natural motion blur. Warm key light from camera left matching
the lamp, soft falloff into green shadow at the right. Filmic, low midtone
contrast, warm and calm. Colour: kraft brown, dark walnut, deep olive green,
warm lamp gold, one small mint-green object as the single saturated accent.
Match the previous Brand Mint video exactly — the same room, the same desk, the
same lamp, the same light direction, the same grade — and treat it as the same
location filmed on the same day. Absolutely no text, letters, numbers, logos,
watermarks, signage, packaging labels, barcodes, printing or screen interfaces
anywhere in frame. Plain unmarked packaging only. No faces.
```

### The edit — 12s timeline, 1080×1920, no scaling needed

| In | Out | Layer |
|---|---|---|
| 0.0 | 10.0 | The clip, dropped in at native size |
| 0.0 | 10.0 | `brandmint-ov-bug.png` — top-left, away from the watermark |
| 0.8 | 3.6 | `brandmint-ov-hook.png` — fade in 0.4s |
| 5.4 | 9.2 | `brandmint-ov-price.png` — fade in 0.4s, hold to the cut |
| 10.0 | 12.0 | `brandmint-endcard-9x16.png`, 0.3s dissolve |

No speech in this one, so no captions. If you want a voice, Sarvam `bulbul:v2`,
`en-IN`, pace 0.9, over 0.5–9.0:

> Online stores for Indian brands. U-P-I, cash on delivery, G-S-T invoices...
> from forty-nine thousand nine hundred ninety-nine rupees. Brand Mint. Hyderabad.

Otherwise let it run silent under a warm sustained pad. Silence with good type
outperforms a bad voiceover.

---

## START HERE — V00, the avatar opener

Shoot this one first. It is the checkout cut from V11, promoted to the front
because a founder saying something specific is a better first post than product
b-roll from an account nobody knows yet.

**Flow settings:** 9:16 · 720p · **10s** (not the 8s default) · Omni 1.1 Flash ·
12 credits · seed from `brandmint-set-founder`.

```
Talking-head advertisement, 9:16 vertical, 10 seconds, using my avatar. Seated
at a dark wooden desk in a calm Hyderabad studio, one warm practical lamp
visible behind, deep ink-green wall softly defocused. 50mm lens at T2.0,
chest-up framing, locked-off camera, very slight push in across the ten seconds.
Direct address to lens. Calm and unhurried, a small forward lean on the final
line, one open-handed gesture and no more. Speaks this script verbatim: "Most
Indian stores lose the order at the last screen. No U-P-I. No cash on delivery.
We build the checkout first, and the pretty part second. Brand Mint, Hyderabad."
Colour: deep green-black background, warm key light from camera left, one
mint-green accent. Filmic, low midtone contrast. Match the uploaded Brand Mint
reference assets exactly — the same studio, the same light direction, the same
grade — and treat it as the same physical room as every other Brand Mint video.
Absolutely no on-screen text, captions, subtitles, logos, watermarks, lower
thirds or graphics in the render.
```

### The edit — 12s timeline, 1080×1920

Ten seconds of footage plus a two-second tail. Upscale the 720p clip to fill;
the type stays sharp, which is the half that shows.

| In | Out | Layer |
|---|---|---|
| 0.0 | 10.0 | The generated clip, scaled to 1080×1920 |
| 0.0 | 10.0 | `brandmint-ov-bug.png` — corner mark, top-left, keeps the brand present while a stranger decides whether to keep watching |
| 0.6 | 4.2 | `brandmint-ov-lower-third.png` — slide in from left over 0.3s, hold, fade |
| 0.4 | 9.6 | **Burned captions.** Not optional — Meta autoplays muted, and a silent talking head is a stranger mouthing nothing |
| 10.0 | 12.0 | `brandmint-endcard-9x16.png`, cross-dissolve 0.3s |

Caption text is the script, broken on the beats:
`Most Indian stores lose the order` / `at the last screen.` / `No UPI.` /
`No cash on delivery.` / `We build the checkout first —` / `and the pretty part second.`

Do **not** add the price overlay to this one. It is an introduction; the number
belongs on the b-roll cuts where it can sit still and be read.

---

## MONTH 1 — the offer (V01–V10)

### V01 · Flagship · 10s · multi-beat
```
A 10-second cinematic advertisement, 9:16 vertical, 50mm lens at T2.0, shallow
depth of field, 24fps, natural motion blur. A small artisan workshop table in
Hyderabad, India: warm cream linen, kraft-brown packaging, dried botanicals.
Soft morning window light from camera left, dust motes visible. 0-2.5s: extreme
macro, two hands fold and seal a kraft parcel, fingers only, no faces. 2.5-5s:
the hands set a smartphone face-up beside it, screen a soft defocused mint-green
glow, completely blank. 5-7.5s: slow dolly back, nine identical sealed parcels
now stacked in a grid. 7.5-10s: camera keeps pulling back and rises, settling
with deep dark green-black negative space filling the upper two thirds. Colour:
mint green #10B981 the only saturated accent, cream #F5F1EA surfaces, ink green
#0B1F1A shadows. Muted, filmic, low midtone contrast. Slow controlled motion, no
whip pans or speed ramps. Absolutely no text, letters, numbers, logos,
watermarks, signage, packaging labels or screen interfaces anywhere in frame. No
faces. No stock-photo offices.
```
`POST: "Your product deserves a *real* store." → "UPI · COD · GST · WhatsApp" → "From ₹49,999" → logo + brandmintstudios.in`

### V02 · The tap · 10s
```
10-second cinematic close-up, 9:16 vertical, 85mm macro, T2.0, 24fps. A hand
holds a smartphone over a small cream-coloured payment terminal on a wooden shop
counter in India. As the phone nears, a soft mint-green light pulse blooms
outward across the counter surface and fades. Single continuous shot, slow push
in. Warm afternoon light, shallow focus, the background shop shelves fully
defocused. Colour: mint #10B981 accent, cream and warm wood. Absolutely no text,
letters, numbers, logos, watermarks, signage or screen interfaces anywhere — the
phone screen and terminal display are blank dark glass. No faces.
```
`POST: "UPI. Cards. In two taps." → "From ₹49,999"`

### V03 · Cash at the door · 10s
```
10-second cinematic shot, 9:16 vertical, 35mm, T2.2, 24fps, handheld with subtle
natural sway. A doorway in an Indian residential building, warm evening light
from inside. Two pairs of hands exchange a plain kraft parcel and folded Indian
rupee notes. Waist-down framing, fingers and forearms only, no faces. The
exchange is unhurried and warm. Shallow focus on the hands, the corridor behind
softly blurred. Colour: warm cream, kraft brown, deep green shadow. Absolutely no
text, letters, numbers, logos, watermarks, signage or labels anywhere — the
parcel is unmarked and the currency is out of focus and unreadable. No faces.
```
`POST: "Cash on delivery, handled properly." → "From ₹49,999"`

### V04 · The shelf · 10s
```
10-second cinematic shot, 9:16 vertical, 50mm, T2.0, 24fps, slow lateral dolly
right. A wooden shelf in a small Indian brand's studio holds a neat row of
identical unlabelled amber glass jars. A hand enters frame and adjusts one jar
into alignment. Soft north-facing daylight, gentle shadows, dust in the air.
Colour: amber glass, cream wall, mint green #10B981 as a single reflected accent.
Absolutely no text, letters, numbers, logos, watermarks, labels or signage
anywhere — the jars are completely blank. No faces.
```
`POST: "Eight products or eight hundred." → "Online stores from ₹49,999"`

### V05 · Dawn to dusk · 10s
```
10-second timelapse, 9:16 vertical, locked-off tripod, 24fps playback. A packing
table in a small Indian workshop seen from a high three-quarter angle. Over the
shot, daylight travels across the surface from warm morning gold to cool evening
blue, while a growing stack of plain kraft parcels accumulates in fast motion.
Hands blur in and out of frame. The final second settles as the light goes deep
and the stack is tall. Colour: cream, kraft, deepening to ink green #0B1F1A.
Absolutely no text, letters, numbers, logos, watermarks, labels or clock faces
anywhere in frame. No identifiable faces.
```
`POST: "One day's orders." → "Built to take them."`

### V06 · Fabric · 10s
```
10-second cinematic macro, 9:16 vertical, 100mm, T2.8, 24fps, slow push in. Hands
fold a length of fine handwoven Indian textile on a cream surface — the weave
catching soft side light, threads visible. The fold is slow and practised. Warm
natural light, very shallow depth of field. Colour: natural undyed fabric, one
mint green #10B981 thread catching the light. Absolutely no text, letters,
numbers, logos, watermarks, labels or tags anywhere. No faces.
```
`POST: "For brands that make things properly." → "brandmintstudios.in"`

### V07 · The seal · 10s
```
10-second extreme macro, 9:16 vertical, 100mm, T2.8, 24fps, locked off. A thumb
presses a strip of paper tape along the seam of a kraft parcel, slowly, left to
right across frame. The texture of the paper and the grain of the tape are
sharply visible. Single continuous take. Warm directional light from camera
right. Colour: kraft brown, cream, deep green shadow. Absolutely no text,
letters, numbers, logos, watermarks or printing on the tape or box — completely
blank. No faces.
```
`POST: "Every order, sealed and tracked." → "From ₹49,999"`

### V08 · Nine phones · 10s
```
10-second cinematic overhead shot, 9:16 vertical, 50mm, T2.8, 24fps, slow rise.
Nine smartphones lie face-down in a three-by-three grid on a warm cream linen
surface. One by one, in sequence, they are flipped face-up by unseen hands, each
revealing a soft blank mint-green glow. By the final second all nine glow
together. Overhead top-down framing throughout. Colour: cream, matte black
phones, mint #10B981 glow. Absolutely no text, letters, numbers, logos,
watermarks, icons or user interfaces — the screens are pure blank glowing
colour. No faces.
```
`POST: "Your store. Every screen." → "Mobile-first, always"`

### V09 · HITEC City · 10s
```
10-second cinematic establishing shot, 9:16 vertical, 24mm, T4, 24fps, very slow
push in. Glass office towers in HITEC City, Hyderabad, India at early morning —
low golden sun raking across the facades, a few birds crossing frame, faint haze.
Calm and still, no traffic chaos. Colour: warm gold on glass, deep green-blue
sky. Absolutely no text, letters, numbers, logos, signage, billboards, hoardings
or company names on any building. No readable vehicle number plates. No faces.
```
`POST: "HITEC City, Hyderabad. In person." → "8+ years on every build"`

### V10 · The desk · 10s
```
10-second cinematic shot, 9:16 vertical, 35mm, T2.0, 24fps, slow lateral drift
left. A dark wooden studio desk at night, two monitors facing away from camera
casting a soft mint-green glow across the surface, a keyboard, a cup of chai
steaming. Hands rest on the keyboard, framed from behind and to the side. The
room beyond is dark and calm. Colour: ink green #0B1F1A dark, mint #10B981 screen
glow, one warm lamp. Absolutely no text, letters, numbers, code, logos,
watermarks or user interfaces visible on the screens — they are blank glowing
panels seen from behind. No faces.
```
`POST: "The person who pitches you is the person who builds."`

---

## MONTH 2 — founder, on camera (V11–V18)

**Different prompt shape.** These use your avatar, so they carry speech and
lip-sync. Setting and delivery are directed; the script is spoken verbatim.
Still no on-screen text — captions burn in during post, and Meta autoplays muted
so captions are not optional.

Each script is ~9 seconds at a measured pace. Read the claim rules above: none of
these say anything the site cannot back.

### V11 · Checkout
```
Talking-head advertisement, 9:16 vertical, 10 seconds. Founder avatar seated at a
dark wooden desk in a calm Hyderabad studio, warm lamp light from camera left,
deep green-black background softly defocused. 50mm lens, T2.0, chest-up framing,
locked-off camera. Direct address to lens, calm and unhurried, slight forward
lean on the last line. Natural hand gesture once, not constant. Spoken script,
verbatim: "Most Indian stores lose the order at the last screen. No U-P-I. No
cash on delivery. No G-S-T invoice. We build the checkout first, and the pretty
part second." Absolutely no on-screen text, captions, logos, watermarks or
graphics in the render.
```
`POST: burn captions. End card: logo + brandmintstudios.in`

### V12 · Shopify
```
Talking-head advertisement, 9:16 vertical, 10 seconds. Founder avatar standing,
arms relaxed, in a bright cream-walled studio with a single plant, soft window
light from camera right. 50mm, T2.0, waist-up, very slow push in. Direct address,
conversational, a small wry smile on the first line. Spoken script, verbatim:
"You do not need a monthly subscription to sell in India. A fixed price, a store
you own, and the payment methods your customers actually use. That is the whole
job." Absolutely no on-screen text, captions, logos, watermarks or graphics.
```
`POST: captions. Overlay "From ₹49,999" at 06s`

### V13 · What it buys
```
Talking-head advertisement, 9:16 vertical, 10 seconds. Founder avatar seated,
leaning slightly forward on a desk, hands loosely clasped. Dark editorial studio,
mint-green rim light from behind camera left. 85mm, T2.0, chest-up, locked off.
Direct address, matter-of-fact, no salesmanship. Spoken script, verbatim: "Forty
nine thousand nine hundred and ninety nine rupees. That is a working store —
payments, invoices, WhatsApp orders, on your own domain. Fixed, agreed before we
start, G-S-T extra." Absolutely no on-screen text, captions, logos, watermarks or
graphics.
```
`POST: captions. Overlay ₹49,999 in JetBrains Mono at 03s`

### V14 · No interns
```
Talking-head advertisement, 9:16 vertical, 10 seconds. Founder avatar standing at
a studio window, half-turned to camera, Hyderabad daylight behind, background
blown out and soft. 50mm, T2.0, waist-up, subtle handheld sway. Direct address,
quiet confidence, steady eye line. Spoken script, verbatim: "Ask who actually
builds it. At most studios the answer is someone you have never met. Here, the
person who pitches you is the person who builds. Eight years, every project."
Absolutely no on-screen text, captions, logos, watermarks or graphics.
```
`POST: captions. End card: "8+ yrs on every build"`

### V15 · Fixed price
```
Talking-head advertisement, 9:16 vertical, 10 seconds. Founder avatar seated in a
dark studio, one warm practical lamp visible behind, deep ink-green background.
85mm, T2.0, chest-up, locked off, very slight push in. Direct address, calm and
plain. Spoken script, verbatim: "We do not bill by the hour. You get one number
before we start, and that is the number. If a cheaper option is the honest answer
for you, we will say so on the call." Absolutely no on-screen text, captions,
logos, watermarks or graphics.
```
`POST: captions. End card: "Fixed prices. GST extra."`

### V16 · COD
```
Talking-head advertisement, 9:16 vertical, 10 seconds. Founder avatar standing in
a small workspace with plain kraft parcels stacked out of focus behind. Soft
overhead daylight. 50mm, T2.2, waist-up, static. Direct address, slightly
animated, one open-handed gesture. Spoken script, verbatim: "Cash on delivery is
not your enemy. Badly handled cash on delivery is. Address checks, order
confirmation on WhatsApp, and returns you can actually see. That is a build
decision." Absolutely no on-screen text, captions, logos, watermarks or graphics.
```
`POST: captions`

### V17 · Instagram
```
Talking-head advertisement, 9:16 vertical, 10 seconds. Founder avatar seated on a
low stool against a warm cream wall, relaxed posture, natural side light. 50mm,
T2.0, chest-up, locked off. Direct address, friendly but direct. Spoken script,
verbatim: "Your Instagram is a shop window. It is not a shop. When a customer
wants to buy at eleven at night, someone has to be awake — or a store has to be
open." Absolutely no on-screen text, captions, logos, watermarks or graphics.
```
`POST: captions. End card: logo + URL`

### V18 · Saying no
```
Talking-head advertisement, 9:16 vertical, 10 seconds. Founder avatar standing,
arms folded loosely, dark editorial studio, single mint-green accent light on the
back wall. 85mm, T2.0, waist-up, static. Direct address, unhurried, a pause
before the last sentence. Spoken script, verbatim: "We turn work down. If you do
not have product photos, or you have not decided what you sell, a store will not
fix that. We will tell you on the call, not after the invoice." Absolutely no
on-screen text, captions, logos, watermarks or graphics.
```
`POST: captions`

---

## MONTH 3 — education and objections (V19–V30)

### V19 · The list · 10s
```
10-second cinematic overhead macro, 9:16 vertical, 100mm, T2.8, 24fps, locked
off. A hand draws a fountain pen down a sheet of heavy cream paper on a dark
wooden desk, making a short row of small tick marks. Warm raking light from
camera left, paper texture and pen nib sharply detailed. Single continuous take.
Colour: cream paper, black ink, one mint green #10B981 reflection on the pen
barrel. Absolutely no text, words, letters, numbers, printing, logos or
watermarks on the paper — only the abstract tick marks. No faces.
```
`POST: "20 checks before any store goes live." → free checklist CTA`

### V20 · Sand · 10s
```
10-second cinematic macro, 9:16 vertical, 100mm, T2.8, 24fps, locked off. An
hourglass on a dark surface, fine pale sand running through the neck, backlit so
each grain catches the light. Very slow push in. The lower chamber fills
noticeably by the final second. Colour: warm sand, deep ink-green #0B1F1A
background, soft mint #10B981 rim light on the glass. Absolutely no text,
letters, numbers, logos, watermarks or markings on the glass or base. No faces.
```
`POST: "Weeks. Not months." → "From ₹49,999"`

### V21 · Market walk · 10s
```
10-second cinematic shot, 9:16 vertical, 35mm, T2.2, 24fps, smooth gimbal follow
from behind. A person walks through a bustling Indian street market in warm late
afternoon light, holding a phone loosely at their side, screen a soft blank
mint-green glow. Stalls, fabric and produce blur past in shallow focus. Framed
from behind at shoulder height, the subject's face never visible. Colour: warm
market tones, mint #10B981 phone glow. Absolutely no text, letters, numbers,
logos, watermarks, shop signage, hoardings or price boards legible anywhere. No
identifiable faces.
```
`POST: "Most of India shops on a phone, standing up."`

### V22 · The buzz · 10s
```
10-second cinematic macro, 9:16 vertical, 100mm, T2.8, 24fps, locked off. A
smartphone lies face-up on a warm cream linen surface beside a cup of chai. Three
times, the phone vibrates gently, the surface trembling, and a soft blank
mint-green glow pulses across the screen with each buzz. Steam rises from the
chai throughout. Very shallow focus. Colour: cream, mint #10B981, warm chai
brown. Absolutely no text, letters, numbers, logos, watermarks, notifications,
icons or user interface — the screen is pure blank glowing colour. No faces.
```
`POST: "Orders on WhatsApp, while you sleep."`

### V23 · The return · 10s
```
10-second cinematic macro, 9:16 vertical, 85mm, T2.0, 24fps, slow push in. Hands
carefully reopen a slightly travel-worn kraft parcel on a cream surface, folding
back the flaps to reveal soft tissue paper inside. Unhurried, careful movement.
Warm daylight, shallow focus, fingers only. Colour: kraft brown, cream tissue,
deep green shadow. Absolutely no text, letters, numbers, logos, watermarks,
shipping labels, barcodes or printing on the parcel — completely blank. No faces.
```
`POST: "Returns are part of the build, not an afterthought."`

### V24 · Two tables · 10s
```
10-second cinematic shot, 9:16 vertical, 35mm, T2.8, 24fps, slow lateral dolly
left to right. The camera travels past two adjacent work tables. The first is
chaotic — parcels askew, packing material spilling, tape rolls scattered. The
second is calm and ordered — parcels squared in a neat grid, tools aligned. Same
warm daylight across both. Colour: cream and kraft throughout, mint green
#10B981 accent on the ordered table only. Absolutely no text, letters, numbers,
logos, watermarks, labels or signage anywhere. No faces.
```
`POST: "Same products. Different system."`

### V25 · The wall · 10s
```
10-second cinematic shot, 9:16 vertical, 24mm, T4, 24fps, slow pull back. Opening
on a single plain kraft parcel in sharp focus; the camera retreats steadily to
reveal it is the front corner of a large, neatly stacked wall of identical
parcels filling the frame by the final second. Even soft warehouse daylight.
Colour: kraft brown, cream floor, deep green shadow in the depths of the stack.
Absolutely no text, letters, numbers, logos, watermarks, shipping labels or
barcodes on any parcel. No faces.
```
`POST: "One order, or a thousand. Same store."`

### V26 · Festive · 10s
```
10-second cinematic macro, 9:16 vertical, 85mm, T2.0, 24fps, slow lateral drift.
Small clay diya oil lamps burn along the edge of a cream cloth surface, marigold
petals scattered between them, and two plain kraft parcels tied with fine
cotton twine sit among the lamps. Warm flickering firelight, deep shadow beyond,
very shallow focus. Colour: gold flame, marigold orange, kraft, ink green
shadows. Absolutely no text, letters, numbers, logos, watermarks or labels
anywhere. No faces.
```
`POST: "Festive season is decided in August." → run Aug–Oct only`

### V27 · Hands and clay · 10s
```
10-second cinematic macro, 9:16 vertical, 100mm, T2.8, 24fps, locked off. Hands
shape wet clay on a slowly turning potter's wheel, water glistening, fingers
firm and practised. Soft north light, dark background. Single continuous take,
no cuts. Colour: warm grey clay, cream light, deep green-black background.
Absolutely no text, letters, numbers, logos, watermarks or markings anywhere.
No faces.
```
`POST: "You make it. We'll handle the selling."`

### V28 · Morning open · 10s
```
10-second cinematic shot, 9:16 vertical, 35mm, T2.2, 24fps, slow push in. A metal
shutter of a small Indian shop rolls up from inside, revealing warm interior
light spilling onto the street at dawn. Shot from within, silhouette framing, no
people fully visible. Cool blue exterior against warm interior glow. Colour:
blue dawn, warm gold interior, mint #10B981 accent reflection. Absolutely no
text, letters, numbers, logos, watermarks, shop signage or hoardings legible
anywhere. No identifiable faces.
```
`POST: "Open at 6am. Open at midnight." → "An online store never shuts."`

### V29 · Ledger · 10s
```
10-second cinematic macro, 9:16 vertical, 100mm, T2.8, 24fps, slow push in. A
sheet of cream paper slides smoothly out of a small desktop printer onto a dark
wooden desk, catching warm side light as it settles. The paper is completely
blank. Very shallow focus on the emerging edge. Colour: cream paper, dark wood,
one mint green #10B981 indicator glow on the printer body. Absolutely no text,
letters, numbers, printing, logos, watermarks or markings on the paper or the
printer. No faces.
```
`POST: "GST invoices, generated properly, every order."`

### V30 · The landing · 10s
```
10-second cinematic shot, 9:16 vertical, 50mm, T2.0, 24fps, extremely slow rise.
A single plain kraft parcel sits low in frame on a warm cream surface, lit softly
from camera left. The camera rises steadily so that deep dark green-black
negative space fills the upper three quarters of the frame and holds, perfectly
still, for the last three seconds. Colour: kraft, cream, ink green #0B1F1A.
Absolutely no text, letters, numbers, logos, watermarks or labels anywhere. No
faces.
```
`POST: pure end card. Logo lock-up + brandmintstudios.in + WhatsApp. Reusable outro for any cut.`

---

## Posting schedule

| Weeks | Videos | Job |
|---|---|---|
| 1–4 | V01–V10 | Establish the offer. V01 and V02 are your paid-ad candidates. |
| 5–8 | V11–V18 | Founder trust. Organic Reels, not paid — talking heads convert badly cold. |
| 9–13 | V19–V30 | Education and objections. V26 only in festive run-up. V30 is a reusable outro. |

**Generate in order anyway.** Not because credits run out — they do not — but
because the first ten are the ones that sell, and you want them live while you
are still enthusiastic about the other twenty.

**Before any of these run as paid ads:** the render is text-free, so every claim
enters in post — which means the claim rules are enforced by you in the editor,
not by the model. Keep to the permitted list at the top.
