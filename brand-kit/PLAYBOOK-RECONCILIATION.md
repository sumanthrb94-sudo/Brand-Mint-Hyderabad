# Brand Mint — Playbook Reconciliation

*Maps the CEO Reels Bible to our existing playbooks. Resolves conflicts, surfaces what's new, flags what to upgrade.*

We now have **three** production reference docs in `brand-kit/`:

1. **`PLAYBOOK-VIRAL-REELS.md`** — analysis-of-15-viral-reels playbook (the 7 mechanics)
2. **`PLAYBOOK-CEO-REELS-BIBLE.md`** — CEO Bible (just added)
3. **`PRODUCTION-WORKFLOW.md`** — the 5-phase production pipeline

This doc reconciles them so the team has **one** truth.

---

## Where the Bible aligns with what we already do

| Bible rule | Already in our playbook? | Notes |
|---|---|---|
| 9:16 vertical 1080×1920 | ✅ `SPACING-GUIDELINES.md` | Same |
| 30fps standard, 60fps for slow-mo | ✅ Both | v14/v15 at 30fps, v16 at 60fps already |
| Captions burned-in, large bold | ⚠️ Partial — we have on-screen text but not always burned-in to v13/v14 | **Upgrade needed** — add burn-in caption layer to all reels |
| Audio at -14 LUFS, peak -1dB | ✅ `PRODUCTION-WORKFLOW.md` Phase 4 | Same target |
| Hook in first 3s (pattern interrupt / text / audio / result-first) | ✅ `PLAYBOOK-VIRAL-REELS.md` mechanic #1 + #3 | Same |
| Faceless / AI presenter (HeyGen) | N/A — brief bans founder face content | Continue voiceless or hire human VO |
| Comment-trigger CTA | ✅ `PLAYBOOK-VIRAL-REELS.md` mechanic #6 | Same — we use `audit` / `POSITION` |
| Cover frame 1080×1350 4:5 | ✅ `PLAYBOOK-VIRAL-REELS.md` posting checklist | Same |
| One signature transition per reel | ✅ Effectively what v16 does | Cinematic uses whip+match consistently |

---

## Where the Bible expands what we have

### 1. **Transitions catalogue** (new)

The Bible's 10 core + 6 advanced transitions give us a vocabulary we didn't have. **Adopt verbatim.** Cross-reference to what's already implemented:

| Bible transition | Where it lives in our code |
|---|---|
| Jump Cut | All v13-v16 (default cut mode) |
| Zoom Transition | `v16` Ken-Burns zoom (zoom_start → zoom_end) |
| Text Wipe | `v16` mask_wipe_text() — used on hook + pain payoff |
| Align/Ghost Match | Not yet implemented |
| Beat Drop Cut | `v16` audio synth places sub-thump per beat boundary |
| Spin/Orbit | Not implemented (needs Higgsfield) |
| Mask Reveal | `v16` mask-wipe at the hero text reveal |
| Speed Ramp | Not implemented in code; CapCut post-process if needed |
| Seamless Loop | Not implemented; could match-cut first and last frames |
| Match Cut | `v16` define→brand match cut (lens flare → mark) |
| Dolly Zoom | Higgsfield only (no native code) |
| Morph Cut | N/A — only for talking-head, which we don't use |
| Strobe Flash | Easy to add — `<rect>` full-bleed white on beat for 1 frame |
| Glitch Data-Burst | `v16` rgb_split() in `glitch_open` beat |
| Paper Tear / Film Burn | Texture overlay — implement when needed |
| 3D Camera Push | Higgsfield only |

### 2. **Creator terminology glossary** (new — adopt)

The 12-term glossary (B-Roll, J-Cut, Keyframing, etc.) is the vocabulary you'll use when briefing a motion designer or freelancer. Reference verbatim when hiring.

### 3. **Tool stack additions** (mostly new — adopt selectively)

Tools in the Bible we DON'T have in our `PRODUCTION-WORKFLOW.md`:

| Tool | What it adds | Should we add? |
|---|---|---|
| **Descript** | Transcript-based editing, auto-clip extraction | ✅ Add — saves 50% of edit time for VO content |
| **HeyGen** | AI avatar presenters | ❌ Skip — brief bans founder face / faux humans feel off-brand |
| **LALAL.AI** | Audio noise removal | ✅ Add — when using Fiverr VO recordings of variable quality |
| **AI Video Cut** | Long-form → viral clip extraction | ⚠️ Maybe — once we have podcast/long-form content |
| **Epidemic Sound** | Trending audio + SFX | ✅ Add as alternative to Musicbed (Indian creator pricing) |

### 4. **Content formulas** (new — adopt)

The 6 formulas (Contrarian / Process / Listicle / Reaction / Transformation / POV) extend our 6 content pillars. Map:

| Bible formula | Our pillar (per `INSTAGRAM-BRIEF.md`) |
|---|---|
| Contrarian | Brand positioning · Hot takes |
| Process | Behind-the-scenes |
| Listicle | Industry intel · Brand positioning |
| Reaction | Engagement |
| Transformation | Builder spotlights · Lifestyle |
| POV | Brand positioning · BTS |

### 5. **CEO execution checklist** (new — adopt)

Especially these two we weren't doing:
- **Batch film 10 clips in 2 hours** — when we eventually do live-action, batch the shoot
- **One signature transition per reel** — pick one (whip-pan, match-cut, glitch) and use it consistently. Brand consistency > variety

---

## Conflicts to resolve

### Length

| Source | Recommendation |
|---|---|
| Original `INSTAGRAM-BRIEF.md` (cold-start) | Under 20s (because 6s view time on EP01) |
| `PLAYBOOK-VIRAL-REELS.md` | 18-25s |
| `CEO BIBLE` | **7-15s for virality, 30-60s for education** |

**Resolution:** Honor the Bible's split. **7-15s for cold-start engagement reels.** **15-25s for editorial / brand reels** (v15, v16, EP01-04). **30-60s only for case studies / educational deep dives.** Update `INSTAGRAM-BRIEF.md` cadence accordingly.

### Cuts per second

| Source | Recommendation |
|---|---|
| `PLAYBOOK-VIRAL-REELS.md` | Cuts every 1.0-1.5s |
| `CEO BIBLE` | Jump cut every 1.5-3s |

**Resolution:** Bible is more conservative. Adopt **1.5-2.5s per cut as default**. Tighter (1.0-1.5s) only for high-energy beat-drop reels.

### Safe zones (vertical text-safe area)

| Source | Top margin | Bottom margin |
|---|---|---|
| `SPACING-GUIDELINES.md` | 250px | **340px** |
| `CEO BIBLE` | 250px | **130px** |

**Resolution:** Bible's 130px is the strict Reels UI overlap zone. Our 340px is more conservative (also accounts for caption overflow + audio attribution bar in some IG versions). **Keep our 340px as default for editorial reels. Use 130px only for high-energy reels where we need more vertical real estate.**

### Captions

| Source | Recommendation |
|---|---|
| Current build scripts | On-screen typography baked into the SVG; no separate caption layer |
| `CEO BIBLE` | Burned-in captions, 72pt min, white + black stroke |

**Resolution:** Our on-screen text IS the captions for our motion-graphics reels (v13-v16) — that's fine. **For any reel with a VO** (future when we hire a human), add a burned-in caption layer over the bottom 30% of the frame using CapCut auto-captions.

---

## Action items (incorporated into roadmap)

1. **Burn-in captions** for v14 awareness reel — only matters if/when we add VO. Skip for now (we're shipping voiceless).
2. **Add Descript** to the tool stack — defer to Month 3 (only matters once we have VO-heavy long-form content)
3. **Add LALAL.AI** — defer to when we have Fiverr VO recordings
4. **Add strobe-flash transition primitive** to `v16` codebase — easy add (1 hour). Useful for high-energy moments.
5. **Update `INSTAGRAM-BRIEF.md` cadence section** with Bible's 7-15 / 15-25 / 30-60 length tiers
6. **Update `PRODUCTION-WORKFLOW.md` tool stack table** with Descript + LALAL.AI + Epidemic Sound alternatives

---

## The unified one-page truth (for hires + freelancers)

When briefing a motion designer or VO actor, send them these 4 docs:

1. `BRAND-GUIDELINES.md` — brand identity rules
2. `INSTAGRAM-BRIEF.md` — audience, pillars, voice
3. `PLAYBOOK-CEO-REELS-BIBLE.md` — production standards + vocabulary
4. `PRODUCTION-WORKFLOW.md` — the 5-phase pipeline

Tell them: **"Honor all four. If anything conflicts, this `PLAYBOOK-RECONCILIATION.md` decides."**

---

*Maintained as the canonical source of truth when the Bible and our existing playbooks disagree.*
