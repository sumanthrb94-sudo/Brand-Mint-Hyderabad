# 30-Reel Content Calendar — Brand Mint Studios

One month of Reels. Editorial brand voice throughout. No financial content.
Three layout templates rotate (M = Manifesto / P = Process / C = Comparison).
All 10–12s, 1080×1920, mint/ink/paper palette.

Posting cadence: Tuesday + Thursday weekly, plus weekend bonuses where useful.
DM keyword auto-replies recommended per the call-to-action of each reel.

## Week 1 — AWARENESS (who we are)

| # | Slug | Hook | Layout | CTA |
|---|---|---|---|---|
| 01 | design-thinks | Design that thinks. | M | Follow @brandmint.studios |
| 02 | editorial-engineered | Editorial × Engineered. | M | DM 'studio' |
| 03 | senior-studio | Hyderabad's senior digital studio. | M | brandmintstudios.in |
| 04 | partner-no-handoffs | Partner-led. No handoffs. | M | Book a strategy workshop |
| 05 | three-disciplines | Strategy · Design · Engineering. | M | Start a project |
| 06 | mint-tagline | We mint brands that compound. | M | brandmintstudios.in |
| 07 | one-principle | One principle at a time. | M | Follow for more |

## Week 2 — PROCESS (how we work)

| # | Slug | Hook | Layout | CTA |
|---|---|---|---|---|
| 08 | five-step-process | How we build a brand. | P | Start a project |
| 09 | listen-first | We listen before we design. | M | DM 'listen' |
| 10 | public-records | Public records over assumptions. | M | Follow for editorial work |
| 11 | sharper-pixels | Fewer pixels. Sharper ones. | M | brandmintstudios.in |
| 12 | reviewed-live | Reviewed live. Not in email. | M | Book a project call |
| 13 | editorial-cadence | Editorial cadence — Tuesday and Thursday. | M | Follow @brandmint.studios |
| 14 | label-opinion | We label what's opinion. | M | brandmintstudios.in |

## Week 3 — CAPABILITY (what we make)

| # | Slug | Hook | Layout | CTA |
|---|---|---|---|---|
| 15 | custom-websites | Custom websites. | M | Start a project |
| 16 | bespoke-tools | Bespoke internal tools. | M | DM 'tools' |
| 17 | brand-systems | Brand identity systems. | M | brandmintstudios.in |
| 18 | performance-media | Performance media. | M | DM 'ads' |
| 19 | seo-engines | SEO + content engines. | M | DM 'SEO' |
| 20 | ai-integration | AI integration. | M | DM 'AI' |
| 21 | brand-films | Brand films + ads. | M | DM 'film' |

## Week 4 — WHY (principles + outcomes)

| # | Slug | Hook | Layout | CTA |
|---|---|---|---|---|
| 22 | brands-compound | Brands compound. | M | Follow for the long game |
| 23 | quiet-studio | Quiet studio. Loud work. | M | brandmintstudios.in |
| 24 | name-sources | We name our sources. | M | Follow for editorial work |
| 25 | more-of-what-matters | We believe in more of what matters. | M | brandmintstudios.in |
| 26 | longer-relationships | Fewer clients. Longer relationships. | M | DM 'studio' |
| 27 | cost-of-waiting | The cost of waiting. | C | Book a Q3 workshop |
| 28 | tuesday-or-thursday | Tuesday or Thursday — book your call. | M | Pick a slot |
| 29 | reels-cadence | Editorial reels — every Tuesday + Thursday. | M | Follow @brandmint.studios |
| 30 | built-in-hyderabad | Built in Hyderabad. Scaled for the world. | M | brandmintstudios.in |

## Layout reference

**M = Manifesto** (most reels, ~10s)
- Eyebrow (mono kicker)
- HOOK (big display caps, 2 lines)
- 2–3 supporting body lines
- CTA pill

**P = Process** (one reel — `#08 five-step-process`, ~15s)
- HOOK + persistent mint progress bar
- 5 numbered steps
- Brand lockup CTA

**C = Comparison** (one reel — `#27 cost-of-waiting`, ~15s)
- HOOK
- Side-by-side comparison
- Brand lockup CTA

## Render workflow

```
cd brand-kit/video/v46-30-reels
python3 build_30.py           # renders ALL 30 to out/*.mp4
python3 build_30.py --only 03 # render just reel #03
python3 build_30.py --from 11 --to 20  # render reels 11-20
```

Each output: `out/reel-NN-{slug}-15s-60fps.mp4` (silent). Add audio per-reel
after first render — IG's built-in audio library is the fastest path.

## Posting workflow

1. Pick reel from the calendar by day
2. Upload MP4 to IG Reels
3. **First frame is your auto-cover** — all 30 frame-0s are clean brand intros
4. Paste caption from `brand-kit/content/posts-ready/post-NN/` (when generated)
5. Drop hashtag block as first comment
6. Set DM auto-reply if reel uses a DM keyword

---

*Brand Mint Studios · 30-day content calendar · v46*
