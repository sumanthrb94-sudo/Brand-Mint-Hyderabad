# Palette audit — the live marketing site

**Nothing was changed.** This is a report, as asked. The site is live and
`index.html`, `styles.css`, `favicon.svg` and `og-image.*` are all on
CLAUDE.md §5's do-not-touch list.

Measured in a real browser against the rendered page — computed styles and
resolved ancestor backgrounds, not stylesheet reading. Where a number looked
wrong I went and looked at the pixels, and two of my own findings did not
survive that. Those are recorded below too, because a palette audit that only
lists hits is not an audit.

---

## The verdict

**Keep the palette.** It is a good one and it does not need replacing.

The greens and the ink are strong in both directions and clear AA comfortably
in every combination the site actually leans on:

| Pair | Ratio | |
|---|---|---|
| `--ink` on `--bg` — body copy | **15.91:1** | AAA |
| `--cream` on `--ink` | **16.37:1** | AAA |
| `--mint-2` on `--ink` | **12.96:1** | AAA |
| `--ink-2` on `--bg` | **9.08:1** | AAA |
| `--mint-3` on `--bg` | **9.02:1** | AAA |
| `--gold` on `--ink` — dark bands | **7.62:1** | AAA |
| `--mint` on `--ink` | **6.76:1** | AA |
| `--ink` on `--mint` — primary button | **6.76:1** | AA |
| `--muted` on `--bg` | **4.73:1** | AA, thin |

There is no colour here that needs to change. What follows is about **where
two of them are used**, and about **how many palettes exist**.

---

## Two real contrast failures

Both are gold used as small text on a light surface. Gold is a dark-band
colour — 7.62:1 on `--ink` — and it collapses on white.

### 1. `.leader-role` — 2.25:1 · confirmed visually

`#c9a961` at **11.5px, weight 400, on `#ffffff`**. Two instances, in the
Leadership section: *STRATEGY · CLIENT LEAD* and *DESIGN · ENGINEERING*.

Against a 4.5:1 requirement this is less than half. In the screenshot it reads
as visibly washed out next to the black heading directly above it. This is the
one finding I would act on.

**Fix without touching a token:** use `--mint-3` (`#064e3b`, 9.02:1 on white)
for this element, or `--muted` (`#5d7368`, ~4.6:1 on white). Both are existing
brand colours. One line of CSS.

### 2. `.kicker--gold` — 4.30:1 · marginal

`#8a7234` on `#f5f7f4` at 12.5px. That hex is a hardcoded darkened gold that
exists nowhere else in the palette. It is only 0.2 short of the floor, and it
is a decorative eyebrow ("How we work") rather than content — but it is text,
and 12.5px text has to clear 4.5.

**Fix:** darken to about `#7a6428`, or use `--mint-3`.

---

## Two findings that did not survive checking

Recorded so this file is trustworthy rather than alarming.

- **`.unit` — reported 1.76:1, actually fine.** My ancestor walk resolved the
  background to `--ink` for the *3–5**wk*** / *50**/50*** / *30**day*** row.
  The screenshot shows those units are deep green on a **white card** — around
  9:1 and perfectly legible. Cause: a gradient sets `background-image`, not
  `background-color`, so a naive walk sails past white cards and lands on a
  dark ancestor.
- **`.bm-card__meta-label` — reported 3.5:1, actually 16.73:1.** Cream on the
  dark case-study band. Same class of resolution error.

The lesson generalises: **automated contrast sweeps over gradient-heavy pages
produce false positives, and the only cure is looking.**

---

## The structural problem — four palettes, not one

This matters more than either contrast finding, because it is the thing that
will keep generating new ones.

| # | Where | Green | Gold | Cream/paper |
|---|---|---|---|---|
| 1 | `styles.css` — marketing | `#10b981` | `#c9a961` | `#fbfaf2` |
| 2 | `assets/bm-app.css` — portal | `#10b981` | `#c9a961` | `#fbfaf2` |
| 3 | `index.html` inline `.bm-clients` | **`#00c897`** | **`#c9a14a`** | **`#f5f1ea`** |
| 4 | `brand-kit/BRAND-GUIDELINES.md` | `#10B981` + `#00C897` | `#C9A14A` | `#F5F1EA` |

**Palettes 1 and 2 are byte-identical today** — no drift. But they are two
independent copies of the same seven tokens, so drift is a matter of time, and
the portal already carries a dark theme the marketing site does not.

**Palette 3 is live on the same page as palette 1.** The "Selected Work"
section uses a different green and a different gold from the rest of
`index.html`. Side by side, `#00c897` and `#10b981` are close enough to look
like a rendering inconsistency rather than a choice.

**Palette 4 — the documented brand kit — disagrees with the live site.** It
calls `#00C897` "BM Emerald" and `#C9A14A` "Gold", which is palette 3, not
palette 1. So the brand kit documents the section that looks like the odd one
out.

**Nothing here is broken. But there is no single answer to "what green is Brand
Mint".** Picking one is a branding decision, not an engineering one, which is
why this is a report.

---

## The honest weakness in the brand colour

`brand-kit/BRAND-GUIDELINES.md` already records it:

> Mint 3 on Paper: **3.4:1** — pass AA only at 18px+
> White on Mint 3: **3.0:1** — buttons must be ≥16px and bold

**`#10b981` cannot carry an accessible button on its own**, in either
direction. The portal already works around this: `assets/bm-app.css` routes the
primary CTA through a fixed `--bm-btn-bg`/`--bm-btn-fg` pair
(`#0b1f1a` on `#fbfaf2`) at 16.37:1, and never pairs mint with text.

So if you ever *did* want a better palette, this is the only argument for one:
**a primary brand colour that can be a button by itself.** Darkening the brand
green toward `#0f9d76` would clear 4.5:1 against white and let the CTA use the
brand colour directly.

**I am not recommending it.** `#10b981` is on the favicon, the OG image, both
stylesheets, the brand kit and the live site. Changing it is a rebrand, and the
workaround already in place costs nothing. Recording the reasoning so the
question does not have to be reopened from scratch.

---

## Not a colour problem, but found while looking

**The contact address on the live site is wrong.**

`index.html` shows **`hello@brandmint.studio`**. Every other place in this repo
— 69 occurrences across `assets/`, `docs/` and `CLAUDE.md` — uses
**`hello@brandmintstudios.in`**.

`brandmint.studio` is the domain from the legacy `admin/db.js` seed that
CLAUDE.md calls *"a museum of what not to do"*. A prospect who reads the
address off the site and emails it is not reaching the studio.

This is worth more than everything else on this page combined, and it is one
word. `index.html` is on the §5 do-not-touch list so it has not been changed —
but it should be, and quickly.

---

## Also worth knowing

- `styles.css` carries **~90 hardcoded colours** outside the token system —
  about 21 hex and 70 rgba values — including a danger red
  (`rgba(226,59,59,…)`) that exists nowhere else in the file.
- **The marketing site has no automated contrast enforcement.** The portal does
  (`tests/contrast.test.mjs`, 29 assertions, both themes). Extending that to
  `styles.css` is possible but of limited value while ~90 colours bypass the
  tokens it would read.
- `styles.css:513-517` defines `.bm-auth-status` — a portal-prefixed class
  living in the marketing stylesheet. Residue from the deleted Supabase auth
  path. Dead.
- Several selectors I expected (`.press-eyebrow`, `.featured-badge`,
  `.case-body--featured .tag`) no longer render — consistent with `PLAN.md`'s
  note that 19 unsubstantiated strings and the fake press strip were removed.
  Their CSS rules are still in `styles.css`. Dead too.

---

## If you want anything acted on

In the order I would do them:

1. **Fix `hello@brandmint.studio` → `hello@brandmintstudios.in`.** One word.
   Costs nothing, and right now the site's contact route is broken.
2. **`.leader-role` gold → `--mint-3`.** One CSS line, 2.25:1 → 9.02:1.
3. **`.kicker--gold` darken.** One CSS line, 4.30:1 → clears the floor.
4. Decide which green is canonical, then reconcile the inline `.bm-clients`
   block and the brand kit. A branding call, not a code change.

1–3 all touch `index.html`/`styles.css` and therefore need an explicit override
of CLAUDE.md §5. Say the word.
