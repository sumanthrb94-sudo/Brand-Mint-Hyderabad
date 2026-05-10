# 07 · Launch Sprint — 48 Hours to Live

Adapted from Kimi's Google AI Studio playbook, rewritten for Brand Mint's actual stack (Plus Jakarta Sans, `#10B981`, Vercel, Anthropic).

The premise: **a complete brand and live site can ship in two working days** with a senior operator, AI tooling, and tight scope. We've already proven it for ourselves (this site shipped in 36 hours). We use this same sprint to land founder-stage clients who need something live before a fundraise.

## When to use this

- Pre-seed founder needs site before a pitch
- D2C brand with a 2-week launch window
- Internal launch / new product line
- Our own annual rebrand (every Dec)

**Not for:** anything that needs research, custom illustration, or 10+ pages.

---

## Day 0 — pre-flight (2 hours, async)

Before the clock starts, the buyer fills a single Notion form:

- One-line "what" — what is this thing?
- One-line "who" — who's it for?
- One number — what does success look like? (revenue, signups, traffic)
- 5 brands they admire (sites OK to link)
- 3 things they hate ("don't make it look like X")
- Logo files (if any) + copy for hero, services, about

If any field is missing, **reschedule the sprint**. Sprints fail because of bad inputs, not bad output.

---

## Day 1 — Strategy + Identity (8 hours)

### Hours 1–2 · Mint workshop call (90 min)

Buyer + lead. Output: 1-page brief with positioning, ICP, voice, 3 must-have outcomes, 3 must-not-haves.

### Hours 3–4 · Strategy artefact

Lead writes the positioning statement, voice rubric, and headline in markdown. Send for buyer approval as a Loom (10 min walkthrough).

### Hours 5–6 · Logo & palette

Use **Imagen 4** (paid, ~₹50/generation) or **Nano Banana Pro** for logo concepts. Prompt template — see `08-AI-TOOLSTACK.md`. Generate 12 directions, narrow to 3, share Loom for buyer pick.

Once direction is locked, hand-draw final mark in Figma at vector quality. AI-generated logos almost never ship as-is — they're directional, not final.

### Hours 7–8 · Type & colour system

Pick from the brand-kit defaults (Plus Jakarta + Inter + JetBrains Mono) or one custom direction. Lock primary + 2 accents. Token sheet rendered as `colors/palette.svg` (steal from our brand kit).

**End of Day 1 deliverable:** Approved positioning statement + final logo + colour tokens + type system. Three files. One Loom walkthrough.

---

## Day 2 — Site + Launch (8 hours)

### Hours 9–10 · IA & wireframe

Decide page count (1-3 max for a sprint). Section list per page in markdown. No wireframe tool — write it as headings in a doc.

### Hours 11–14 · Build

Clone the **brand-mint** repo as a starter. Strip the site to skeleton. Replace tokens with new brand. Drop in copy. This is the "compounding" benefit of having a strong template — the first sprint takes 36 hours, every sprint after takes 16.

Stack:
- Next.js or static HTML (this site is static; ships under 60 KB)
- Vercel auto-deploy
- Formspree for forms
- Cloudflare for DNS

### Hour 15 · OG image

Edit `og-image.svg`, render to PNG with cairosvg. Update meta tags.

### Hour 16 · QA + launch

- Lighthouse: must hit ≥90 on all 4 axes
- Manual mobile + desktop walkthrough
- Test contact form ends-to-end
- Verify OG card on Facebook Debugger + WhatsApp preview
- Deploy to production domain

**End of Day 2 deliverable:** Live URL + working contact form + OG card + mobile-tested + Lighthouse-clean.

---

## Hour-by-hour AI assist

| Hour | Tool | Use |
|---|---|---|
| 1-4 | Claude (Anthropic) | Voice analysis, headline drafts, positioning rewrites |
| 5-6 | Imagen 4 / Nano Banana | Logo concept exploration |
| 5-6 | Claude / Gemini | Colour psychology + cultural context check |
| 11-14 | Claude (with site context loaded) | Code generation, CSS calibration, copy in voice |
| 15 | cairosvg + Plus Jakarta TTFs | OG image render |
| 16 | Lighthouse CI + PageSpeed | Performance audit |

---

## What can ruin a sprint

- **Buyer changes positioning mid-sprint.** Lock it in writing at hour 4. If they want to change after, pause sprint and reschedule.
- **Logo doesn't land in 3 directions.** Don't push to 6. Pause sprint, do a paid workshop, restart.
- **Stakeholder list larger than 1.** A sprint needs one decision-maker. If there's a committee, abandon — quote a 4-week engagement instead.
- **Photography/illustration dependency.** Can't ship in 2 days. Use type-driven layouts and monogram tiles instead.

---

## Pricing the sprint

We sell the 48-hour sprint at a premium because of the speed:

| Tier | Pages | Price |
|---|---|---|
| Sprint Solo | 1 page (landing only) | ₹2.5 L |
| Sprint Pair | 2-3 pages | ₹4 L |
| Sprint Brand | 1 page + brand book + OG | ₹5 L |

50% advance Day 0, 50% on launch. No revisions during sprint; one round of polish in the 7 days after launch.

If we miss the 48-hour deadline due to our delay, we refund 25% automatically.

---

## Self-launch playbook (the studio's own annual refresh)

Every December the studio runs this sprint on itself. It is the single most important thing we do for our brand: it forces us to use our own toolkit, and the resulting case study (with timestamps) is our best sales artefact.

The 2026 launch (this site) ran:
- Hour 0: empty repo, blank palette
- Hour 36: live URL, 6 sections, contact form, OG card, INR pricing, brand kit, brand-mint-admin folder
- Hour 48: 4 client-facing case studies drafted, 30-day content calendar queued

Track timestamps every year. They are the proof.
