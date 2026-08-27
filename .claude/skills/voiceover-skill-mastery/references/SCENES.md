# The scene spec

`out/scenes.json` is the whole film. One template renders it; the director only
ever writes this file and the script. Nothing in `template/reel.html` is
film-specific — if you find yourself editing the template to make a film, the
spec is missing a field.

```json
{
  "title": "The ₹1,000 order that made you nothing",
  "gate": "Comment RTO",
  "duration": 33.9,
  "clipSlots": { "A": 1, "B": 6, "C": 13 },
  "scenes": [
    { "words": [0, 4],   "mode": "type", "kicker": "Today",
      "h1": ["You made", "a <em>sale</em> today."] },
    { "words": [21, 27], "mode": "support", "glyph": "parcel-refused" },
    { "at": 31.5, "hold": 2.4, "mode": "type",
      "lockup": { "word": "Brand <em>Mint</em>", "city": "Hyderabad" } }
  ]
}
```

## Film fields

| Field | Meaning |
|---|---|
| `title` | Page title and panel heading. |
| `gate` | Text on the tap-for-sound button in the live preview. |
| `duration` | Length of the finished film — the read *plus* the outro. Also set this in `cues.json`, or the mix ends on the voice's last sample and every outro cue is discarded. |
| `clipSlots` | Which scene index each of the three clips belongs to. Documentation, so the mapping survives to the next day. |
| `rail` | Optional running spine — see below. |

## Scene fields

| Field | Meaning |
|---|---|
| `words` | `[first, last]` index into `words.json`. Scene boundaries are word boundaries, so a scene can never start mid-phrase. |
| `at` | Absolute seconds, for a scene with no words — an outro after the read ends. Use instead of `words`. `hold` sets how long it stays. |
| `mode` | `type`, `support` or `broll`. Decides whether captions show. |
| `clip` | `A`, `B` or `C`. Required on `broll`; frames are read from `out/clip<A>/`. |
| `bg` | Same, but the footage runs *behind* this scene's content instead of replacing it. Use for an outro over film, or wherever the graphics are the payoff and must not be given up. The scene gets its own scrim so type stays legible. |
| `clipStart` | Seconds into the clip to begin. Default 0. |
| `kicker` | Small uppercase label above the content. |
| `sub` | A quiet line under the block. |
| `center`, `flash` | Centre the scene; invert to the mint ground. `number` implies both. |
| plus one content block | See below. |

## Modes

- **`type`** — the spoken line *is* the typography. **Captions hidden.** Use for
  the hook, the peak, the one-word turns, the outro. If a card restates the
  sentence — a ledger row reading "Shipping ₹200" while the voice says
  "shipping, two hundred" — that scene is `type`, not `support`.
- **`support`** — visuals carry information the voice does not say. **Captions
  shown.** Never restate the sentence here.
- **`broll`** — a real clip fills the frame, graded, with captions over it.

Alternate them. Two `support` scenes in a row is acceptable; three is a slide
deck.

## Content blocks

One per scene.

| Block | Shape | Use |
|---|---|---|
| `h1` | `["line one", "line <em>two</em>"]` | Hero type. Each line masked in separately. `<em>` is the mint accent. |
| `rows` | `[["label","value"], …]` | A ledger or spec card. See row options below. |
| `cells` | `[["01","Prepaid nudges"], …]` | 2×N grid of small facts. |
| `pills` | `["Razorpay","UPI","COD"]` | A capability list. |
| `number` | `{"value":"₹440","note":"gone."}` | Full-bleed slam on mint, digits counting up underneath. **The peak — use once.** |
| `split` | `{"a":["To start","50%"],"b":["When live","50%"]}` | Two-part bar, grows from both ends. |
| `strikes` | `["Retainer","Lock-in"]` | Struck through a beat after each lands. |
| `glyph` | `"parcel-refused"`, `"crowd"`, `"one-way"` | A pictorial beat, shapes only. |
| `mark` | `{}` or `{"delay":0.1}` | The monogram, drawn on. Use once, and not in the same film as a `lockup.mark`. |
| `lockup` | `{"word":"Brand <em>Mint</em>","city":"Hyderabad","follow":{"text":"Follow to know more","handle":"@brandmint.studios"}}` | Wordmark, rule sweep, city, and the follow ask. |
| `endcard` | `{"cta":"Comment “RTO”","hint":"…","strip":["8 weeks","@handle"]}` | The ask. |

### Rows

`["label", "value", delay, "class"]` — the last two optional.

- `delay` overrides the automatic `.14 + .12k` stagger. Set earlier rows to `0`
  and only the new one to a real delay, and a ledger reads as *accumulating*
  across scenes rather than rebuilding itself each time.
- `class` is `debit` (red value), `total` (mint, ruled off above), `now` (mint —
  the row that just arrived), `blank` (muted, letter-spaced — a figure that does
  not exist) or `redact` (the value renders as a solid bar).
- **`blank` and `redact` are different arguments.** `blank` is *nobody measures
  this*. `redact` is *somebody measures this and it is not you* — so write the
  real value in the spec (`"Aarav Sharma"`) and let it set the bar's width. The
  text is never visible; it is there to make the bar the right size and to keep
  the row honest.
- A value of `"✓"` renders as a mint tick.

### The outro

Always give `lockup` a `follow`. A wordmark alone tells them who you are and
gives them nothing to do about it — the invitation and the handle are what turn
a view into a follower. The text sits above a pill holding the handle by itself;
putting both inside one chip makes it wider than the wordmark and it wraps.

Budget about 3.3 s of `hold` when there is a follow line. 2.4 s ends the film
before a handle can be read.

### Glyphs

A words-free beat. This is the one place a `support` scene is safe when the
voice is describing exactly what is on screen: shapes cannot duplicate words, so
the captions carry the line and the picture carries the feeling.

`parcel-refused` — a parcel lands, a red line is struck through it, and it
leaves the frame the wrong way past a closed door.

`crowd` — forty identical chips arrive on staggered beats, then one mint sweep
crosses them. Nothing lights up, because nothing there is distinguishable. Do
not be tempted to highlight one: the absence of a highlight is the whole point.

`one-way` — six parcels cross a gate and leave, right to left in index order so
the lane empties just as the line lands. A red stroke reaches back from the
gate, stalls a third of the way, and dies. Nothing returns.

### The mark

`mark` draws the monogram rather than placing it: the disc lands with a back
ease, then the M is stroked on with `stroke-dashoffset`. Set `lockup.mark: true`
to head the outro with it — the wordmark and everything below shift later
automatically, so the mark leads and the name follows.

A film with no footage needs this. Three of the fourteen scenes in a normal film
are carried by real clips; without them the animation has to earn those beats
itself, and a drawn mark plus two pictorial glyphs is what replaces them.

## The spine

If the script names a sequence — Day 1 → Week 8 — set `rail` and the template
draws a vertical rail that fills continuously across those scenes:

```json
{ "rail": { "scenes": [2,3,4,6], "nodes": ["Day 1","Week 1","Week 4","Week 8"] } }
```

Only the milestone currently reached is labelled; showing all of them at once
collides with the cards.

For a *running total* rather than a timeline, do not use the rail — carry the
figures in `rows` with per-row delays, as above. It reads better and needs
nothing extra.

## House length

Fourteen scenes at ~32 seconds. The shape that works:

```
1  broll A / type   the world, or the hook
2  type            the turn of the hook
3  type            the setup, with a number
4  type            escalation
5  type            escalation
6  broll B / glyph  the consequence — the only pictorial beat
7  type            the last cost
8  number          THE PEAK
9  type            name the problem
10 support         the insight
11 type            the question — silence, no captions
12 type            the ask
13 broll C / support the fixes
14 lockup          wordmark
```
