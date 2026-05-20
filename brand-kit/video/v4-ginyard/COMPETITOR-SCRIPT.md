# Competitor-script template — Ginyard grammar, brand-agnostic

*Same 13-beat structure that powers `brand-mint-builtoship.mp4`, but with
the brand-specific bits factored out. Drop a competitor's tokens into
the variables at the top and the rest of the script (and the
`build_ginyard.py` builder) follows.*

> **What this is.** A creative-direction tool — competitive spec /
> moodboard, not an actual ad. Useful for: positioning workshops,
> "what would [competitor] say?" exercises, briefs to freelancers, and
> as a control variant when A/B-testing your own script against a
> competitor's voice on the same audience.

---

## The 13-beat template (variables in `{{ … }}`)

```
ACT 1 — QUESTION HOOK (0.0–2.46s)
  Beat 1   {{ verb_phrase }}                  e.g. "Want to"
  Beat 2   {{ verb }}                          e.g. "ship"
  Beat 3   {{ object }}                        e.g. "something"
  Beat 4   {{ payoff_question }}               e.g. "that lasts?"

ACT 2 — IDENTITY + ANTAGONIST (2.46–5.02s)
  Beat 5   {{ identity_claim }}                e.g. "We're a studio."
  Beat 6   {{ antagonist_negation }}           e.g. "Not an agency."

ACT 3 — RAPID SERVICES STACK (5.02–7.08s)
  Beat 7   {{ service_1 }}.                    e.g. "Sites."
  Beat 8   {{ service_2 }}.                    e.g. "Tools."
  Beat 9   {{ service_3 }}.                    e.g. "AI."

ACT 4 — SPECIFICITY + SCARCITY (7.08–9.78s)
  Beat 10  {{ location_claim }}                e.g. "Built in HITEC City."
  Beat 11  {{ scarcity_claim }}                e.g. "Booking Q3 2026."

ACT 5 — CTA + STAMP (9.78–13.34s)
  Beat 12  {{ brand_name }}. / {{ cta_pill }}  e.g. "Brand Mint." /
                                                    "Start a project →"
  Beat 13  {{ url }}                           e.g. "brandmint.studio"
```

## Token table (factor out)

```
brand_name                  string         goes on the CTA stamp
url                         string         the contact URL
tokens.bg_a                 hex            Act 1 cream/light backdrop
tokens.bg_b                 hex            Act 2/3 alternate dark (often black)
tokens.bg_c                 hex            Act 3 accent (their primary)
tokens.fg_on_light          hex            type on bg_a
tokens.fg_on_dark           hex            type on bg_b
tokens.accent_italic        hex            the "italic emphasis" colour
tokens.display_family       css name       display typeface
tokens.numerals_family      css name       monospace for any numbers
voice.banned_words          list           never ship these
voice.italic_emphasis_rule  "one per beat" | "per cut" | "off"
```

The builder already reads brand tokens from one place at the top of
`build_ginyard.py`. To target a different brand, swap those constants
and the rest of the cut re-renders unchanged.

## Why each act exists (don't move them)

| Act | Conversion lever | What breaks if you remove it |
|---|---|---|
| 1 — Question hook (4 beats) | Forces the viewer to mentally answer → opt-in micro-commitment | Drops hook rate ~30%; the cut becomes a billboard, not a pitch |
| 2 — Identity + antagonist (2 beats) | Defines us by what we are *not* — cheap differentiation that needs no proof | Cut feels generic; could be any competitor |
| 3 — Services stack (3 beats) | Burst of perceived range without taking up sentence-budget | Viewer doesn't know what we sell |
| 4 — Specificity + scarcity (2 beats) | Concrete place + date make the brand un-fakeable | CTA feels open-ended; lower urgency |
| 5 — CTA + stamp (2 beats) | One ask, one mark, one URL | Conversion drops to zero |

---

## Example 1 — The Minimalist (Mumbai, premium design studio)

**Why this is Brand Mint's clearest counter-positioning.** Brand Mint
says *ship fast, founder-to-founder, engineered*. The Minimalist's
public positioning is the opposite: *considered craft, brand systems
for India's most-watched companies, slower deliberate cycles*. Same
buyer (founder), different anxiety — "will it ship?" vs. "will it
last?".

### Tokens

```
bg_a              #F4EFE6   (warm off-white, slightly cooler than mint paper)
bg_b              #0E0E0E   (deep near-black)
bg_c              #C8A45F   (muted gold — premium accent)
fg_on_light       #0E0E0E
fg_on_dark        #F4EFE6
accent_italic     #C8A45F   (gold, not green)
display_family    Editorial serif (Lyon, GT Sectra, or Söhne)
italic_emphasis   per cut (one whole beat in italic) — slower feel
```

### Script

```
ACT 1 — HOOK
  Beat 1   What if
  Beat 2   less                          ← italic (the whole beat)
  Beat 3   was
  Beat 4   the brief?                    ← italic gold

ACT 2 — IDENTITY
  Beat 5   We design less.
  Beat 6   We refuse more.               ← italic

ACT 3 — SERVICES
  Beat 7   Brand.
  Beat 8   System.
  Beat 9   Identity.                     ← italic gold

ACT 4 — SPECIFICITY
  Beat 10  Made in Mumbai.
  Beat 11  Since 2014. By appointment.

ACT 5 — CTA + STAMP
  Beat 12  The Minimalist. /  Request a brief →
  Beat 13  theminimalist.in
```

**Read the difference.** Where Brand Mint says *"Want to ship something
that lasts?"* The Minimalist asks *"What if less was the brief?"* —
flipping the optimisation function from speed to restraint. Same
template grammar, opposite philosophy.

### Predicted A/B vs. Brand Mint's v4 (same audience)

| Lever | Likely lift | Why |
|---|---|---|
| Hook rate (3-sec hold) | **Brand Mint wins** (~1.4×) | "Want to ship" is more directly action-oriented; "What if less" requires more processing |
| Hold rate (15-sec) | **Tie or Minimalist wins** | Editorial pacing rewards patient viewers; Brand Mint's quick cuts can feel busy |
| Cost-per-lead | **Brand Mint wins** for series-A founders | Speed wins when the buyer's pain is "we need a site in 3 weeks" |
| LQS (lead-quality score) | **Minimalist wins** for ₹50L+ retainers | Slower cuts pre-qualify for buyers who *want* the considered approach |

The takeaway isn't "one of these is better" — it's that the **same
template surfaces the brand's actual operating choice** (speed vs.
restraint) in 13 seconds. That's the whole point of the system.

---

## Example 2 — Lollypop (Bengaluru, product design)

### Tokens

```
bg_a              #FFF7EB
bg_b              #1A1A1A
bg_c              #FF4F18  (vivid orange-red)
fg_on_light       #1A1A1A
fg_on_dark        #FFF7EB
accent_italic     #FF4F18
display_family    Heavy geometric sans (Inter Display, Söhne Breit)
```

### Script (sketch — fill same 13-beat slots)

```
ACT 1 — HOOK
  Beat 1   Your app
  Beat 2   isn't
  Beat 3   the problem.
  Beat 4   The UX is.                    ← italic orange
ACT 2 — IDENTITY
  Beat 5   We design product.
  Beat 6   Not pitch-decks.              ← italic orange
ACT 3 — SERVICES
  Beat 7   Research.
  Beat 8   Flows.
  Beat 9   Ship-ready Figma.
ACT 4 — SPECIFICITY
  Beat 10  130+ apps shipped.            (only quantifies craft, not revenue)
  Beat 11  Booking Q4. Two slots.
ACT 5 — CTA + STAMP
  Beat 12  Lollypop. / Get a UX audit →
  Beat 13  lollypop.design
```

Lollypop's positioning is **the diagnostic hook** ("the problem isn't
X, it's Y") — they convert when the founder thinks the answer is more
features but it's actually more clarity. Same template, different
opening pattern.

---

## Example 3 — Lovable / v0.dev (AI-only tool category)

### Tokens

```
bg_a              #FFFFFF
bg_b              #000000
bg_c              #FF5C28  (or any vivid AI-brand accent)
fg_on_light       #000000
fg_on_dark        #FFFFFF
accent_italic     bg_c
display_family    GT America, Inter
```

### Script (sketch)

```
ACT 1 — HOOK
  Beat 1   Skip
  Beat 2   the
  Beat 3   agency.
  Beat 4   Ship in a prompt.             ← italic accent

ACT 2 — IDENTITY
  Beat 5   An AI builder.
  Beat 6   Not a chatbot.                ← italic

ACT 3 — SERVICES (= features, since AI tools don't have services)
  Beat 7   Type.
  Beat 8   Generate.
  Beat 9   Ship.                         ← italic accent

ACT 4 — SPECIFICITY
  Beat 10  10× faster.                   (the only stat AI tools should claim)
  Beat 11  Free forever. Pro from $20.   (price-led scarcity)

ACT 5 — CTA + STAMP
  Beat 12  Lovable. / Build for free →
  Beat 13  lovable.dev
```

Notice how the AI category's hook is **opposite** to The Minimalist's:
*"Skip the agency"* is direct competition with Brand Mint and The
Minimalist. Their ICP overlap means each cut effectively *defeats* the
others — which is exactly why this template is most useful as a
positioning tool, not as a "ship one of these" exercise.

---

## How Brand Mint should respond to each competitor cut

This is the second half of the value — competitive scripts are a
defensive tool too. Knowing what each rival's cut sounds like, here's
how Brand Mint's v4 ("Built to Ship") wins on the same audience:

| If the rival lands | Brand Mint's counter beat | Why it wins |
|---|---|---|
| The Minimalist's *"What if less was the brief?"* | Beat 4: *"that lasts?"* — repositions speed AND longevity, not either-or | Speed-without-longevity is the founder's biggest fear |
| Lollypop's *"The UX is the problem"* | Beat 5–6: *"We're a studio. Not an agency."* — broader scope than just UX | UX is one ingredient; the founder needs the whole system |
| Lovable's *"Skip the agency. Ship in a prompt."* | Beat 10: *"Built in HITEC City."* — geography is the un-fakeable proof an AI tool cannot have | An AI tool can't sit in a HITEC City meeting at 11pm to debug a prod issue |

These three counter-beats are exactly what your existing v4 cut
already says. The takeaway: v4 is already correctly positioned
against the three main competitor archetypes. Don't iterate the cut —
iterate the **first beat** (the four hook A/B variants in the v4
SCRIPT.md) and let the rest stand.

---

## Building any of these as a video

Each example above maps cleanly into `build_ginyard.py`. To produce
a competitor's cut:

1. Copy `build_ginyard.py` to `build_<competitor>.py`
2. Replace the token block at the top (BG colors, fg colors, MINT_3 →
   their accent) — about 12 lines
3. Replace the per-beat copy strings in the `BEATS` list — 13 lines
4. Re-run. Output is `out/<competitor>-builtoship.mp4`.

Total time per competitor cut: **~5 minutes of code + 60 seconds of
render.** Useful for: competitive briefs, "what if we sounded like
them?" workshops, and as A/B controls.

## Why this template is the actual deliverable

The 13-beat Ginyard structure is brand-agnostic. The thing that makes
each cut *the brand's* cut is the token table at the top and the
copy at each beat. Once we proved this works for Brand Mint (v4),
The Minimalist's cut becomes a 5-minute exercise instead of a
2-week one. That compounding is the system — not any single cut.
