# The scene spec

`out/scenes.json` is the whole film. One template renders it; the director only
ever writes this file and the script.

```json
{
  "title": "The ₹1,000 order that made you nothing",
  "clips": { "A": 1, "B": 3, "C": 5 },
  "scenes": [
    { "words": [0, 9],  "mode": "broll",   "clip": "A" },
    { "words": [10, 15],"mode": "type",    "kicker": "The maths",
      "h1": ["You made a sale.", "And <em>lost money</em> on it."] },
    { "words": [16, 24],"mode": "support", "kicker": "The order",
      "rows": [["Order value", "₹1,000"], ["Payment", "Cash on delivery"]] }
  ]
}
```

## Scene fields

| Field | Meaning |
|---|---|
| `words` | `[first, last]` index into `words.json`. Scene boundaries are word boundaries — a scene can never start mid-phrase. |
| `mode` | `type`, `support` or `broll`. Decides whether captions show. |
| `clip` | `A`, `B` or `C`. Required on `broll`. |
| `kicker` | Small uppercase label above the content. |
| plus one content block | See below. |

## Modes

- **`type`** — the spoken line *is* the typography. **Captions hidden.** Use for
  the hook, the peak, the one-word turns, the outro.
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
| `rows` | `[["label","value"], …]` | A ledger or spec card. Rows stagger in; values can be a `"✓"` tick. |
| `cells` | `[["LABEL","Value"], …]` | 2×N grid of small facts. |
| `pills` | `["Razorpay","UPI","COD"]` | A capability list. |
| `number` | `{"value":"₹440","note":"cost of one refused parcel"}` | Full-bleed slam. This is the peak — use once. |
| `split` | `{"a":["To start","50%"],"b":["When live","50%"]}` | Two-part bar, grows from both ends. |
| `strikes` | `["Retainer","Lock-in"]` | Struck through a beat after each lands. |
| `lockup` | `{"city":"Hyderabad"}` | Wordmark, rule sweep, city. Outro A. |
| `endcard` | `{"cta":"Comment “RTO”","hint":"…","strip":["8 weeks","Fixed price","@handle"]}` | Outro B. |

## The spine

If the script names a sequence — Day 1 → Week 8, or a running total — set
`"rail"` on the scenes it spans and the template draws a vertical rail that
fills continuously across them, with a node per milestone:

```json
{ "rail": { "scenes": [2,3,4,6], "nodes": ["Day 1","Week 1","Week 4","Week 8"] } }
```

Only the milestone currently reached is labelled; showing all of them at once
collides with the cards.

## House length

Fourteen scenes at ~32 seconds. The shape that works:

```
1  broll A      the world
2  type         the hook
3  support      the setup, with a number
4  support      escalation
5  broll B      the turn
6  support      the consequence
7  number       THE PEAK
8  type         name the problem
9  support      the insight
10 type         the question — silence, no captions
11 support      the fixes
12 broll C      resolution
13 lockup       wordmark
14 endcard      the ask
```
