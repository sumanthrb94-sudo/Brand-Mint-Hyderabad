# 08 · AI Toolstack

The studio runs on AI augmentation. This doc lists every AI tool we use, what for, and the prompt patterns that work.

## The stack

| Tool | Provider | What we use it for | Monthly cost |
|---|---|---|---|
| **Claude Opus / Sonnet** | Anthropic | Code generation, voice rewrites, strategic thinking | ₹8-15 K |
| **Gemini 3 Flash / 2.5 Flash** | Google | Quick image-aware tasks, free tier reasoning | ₹0-3 K |
| **Imagen 4** | Google AI Studio | Logo concept exploration, mood-board imagery | ₹4-8 K |
| **Nano Banana Pro** | Google | Text-accurate logos | Included in Imagen |
| **Veo 3.1** | Google | Brand films, social video (sparingly) | ₹2-5 K |
| **Cursor IDE / Claude Code** | Anthropic | Day-to-day engineering | ₹2-3 K |
| **Helicone or Langfuse** | Self-hosted | LLM observability for client integrations | Free |
| **Promptfoo** | Self-hosted | Eval suites for AI features we ship to clients | Free |

Total: **₹15-30 K/month studio-wide**. Pass-through API costs to client engagements are billed separately.

## Model selection rules

| Task | Default model | Why |
|---|---|---|
| Long-form code (a feature, a refactor) | Claude Opus 4.7 | Best at architectural reasoning |
| Quick code (a function, a tweak) | Claude Sonnet 4.6 | Faster, cheaper, still excellent |
| Strategy / writing in our voice | Claude Opus | Best at voice-matching |
| Image gen (logo, mood) | Imagen 4 | Crisper than alternatives |
| Logo with text | Nano Banana Pro | Only model that gets text right consistently |
| Copy with cultural / Indian context | Gemini 2.5 Flash | Better Hindi/regional grounding |
| Cheap eval / linting / bulk text | Gemini Flash (free tier) | Free, good enough |

## Temperature settings (calibrated)

| Task | Temp | Notes |
|---|---|---|
| Code generation | 0.3 | Reproducibility |
| Headline writing | 0.7 | Variety with control |
| Logo concepting (Imagen) | 1.0 | Maximum exploration |
| Logo refinement (conversational) | 0.4 | Precision over creativity |
| Copy in our voice | 0.5 | Tight to rubric |
| Strategy doc drafting | 0.4 | Rigorous, not creative |
| Social caption ideation | 0.8 | Want variance |
| Pricing calculator | 0.0 | Deterministic only |

## System prompts (copy-paste ready)

### Brand Mint voice agent — for ANY copy generation

```
You are Brand Mint's senior copywriter. Brand Mint is a Hyderabad studio
that builds custom websites, internal tools, brand systems, and AI
integrations for founder-led Indian and Gulf companies.

Voice rules — non-negotiable:
1. Confident without arrogance.
2. Specific over abstract — every claim has a number.
3. Warm but not buddy-buddy.
4. Editorial, never salesy.
5. Founder-to-founder always.

Format rules:
- One italic emphasis per headline, never two.
- All numerals in JetBrains Mono context (the reader will style them).
- Sentences average 12-18 words. Paragraphs max 3 sentences.
- No emojis, ever.

Vocabulary blacklist (never use):
innovative, solutions, cutting-edge, disruptive, synergy, holistic,
leverage, paradigm, game-changer, world-class, best-in-class, next-gen,
scalable, seamless, turnkey, end-to-end, craftsmanship, forward-thinking,
ecosystem, transform, empower, unlock, reimagine.

Indian context:
- Use INR (₹) for amounts. Use lakh / crore conventions where natural.
- Reference Hyderabad / HITEC City when location-relevant.
- Be aware of GST / Indian business norms.

Output format:
- 3 variations of any requested copy, each labelled (a), (b), (c).
- After variations, one-line reasoning per choice.
```

### Logo concepting — Imagen / Nano Banana

```
Create a minimalist logo for [BRAND]. The logo should feature [SYMBOL
DESCRIPTION] integrated with the [LETTER OR WORDMARK] in a geometric,
modern sans-serif typeface.

Color palette: [PRIMARY HEX] on [BACKGROUND HEX] background.

Style: Premium, editorial, Swiss design influence. The icon should feel
like it could be embossed on business cards. Include subtle negative
space. No gradients. Flat vector aesthetic. High resolution. Clean edges.

The logo will be embroidered on premium polo shirts, embossed on 350gsm
cotton paper business cards, and rendered at 16px favicon size.

Do not include: drop shadows, bevels, gradients, multiple colours,
illustrative details that won't survive at 16px.
```

### Code generation — Claude (when adding a section to a marketing site)

```
You are extending the Brand Mint marketing site. Stack: vanilla HTML +
CSS, no framework. Tokens defined in :root in styles.css. Existing
components follow these patterns:
- Sections wrap in <section class="section"> with <div class="section-head">
- Card grids use CSS grid with clamp() spacing
- Display headings: var(--display), font-weight 600, letter-spacing -0.02em
- Body: var(--sans), Inter, 17px

Constraints:
- Match existing component shape; don't introduce new patterns
- All sizing via clamp() for responsiveness
- WCAG AA contrast minimum
- No JS unless the feature genuinely requires it
- Mobile-first; test at 375px and 1440px
```

### Strategy document — Claude

```
You are Brand Mint's CEO writing for the studio's own internal admin
folder. The document should be production-ready — written so a future
employee can pick it up and execute on Monday morning without further
context.

Format:
- Markdown with heading hierarchy (## for sections, ### for sub)
- Tables wherever comparison or structure helps
- Concrete numbers in INR with lakh/crore where natural
- 200-400 lines per document; never bloat

Voice: same as Brand Mint client voice but more direct. Internal docs
can be opinionated — they should be opinionated.
```

## Prompt patterns we reuse

### The "constrain by example" pattern

Always ship 1-2 examples of the desired output inside the prompt. Five sentences of instruction + one example beats ten sentences of instruction alone.

### The "iterate, don't restart" pattern

Conversational refinement beats one-shot generation 90% of the time. Save logo Imagen sessions and iterate; don't generate fresh batches.

### The "voice calibration" pattern

Before any high-stakes copy task, paste the voice rubric AND 3 published Brand Mint examples (a hero, a section H2, a client email). The model anchors to specifics, not abstractions.

### The "self-critique then revise" pattern

For any output >100 words, ask the model to critique its own draft against the voice rubric, then revise. Two-step prompting catches 70% of voice drift.

```
Step 1: Draft the copy.
Step 2: Score your draft against each of the 5 voice principles 1-10.
Step 3: Revise to lift any score below 8.
Return only the final revision.
```

## What we don't use AI for

- **Discovery calls.** Humans only. The buyer is reading us.
- **Final logo polish.** AI gets us 80% of the way; the last 20% is hand-vector work.
- **Pricing decisions.** Models will under-price out of helpfulness. Use the deterministic calculator in `finance/pricing-calculator.md`.
- **Apologies / refunds / hard conversations.** Never AI. The reader can tell.

## Eval discipline

For any AI feature we ship to a client, we ship an eval suite. Promptfoo + 20-50 test cases minimum. The eval suite is part of the deliverable, not an internal artefact. Without evals, the integration drifts when the model updates and we get the blame.

## Cost monitoring

Helicone or Langfuse on every client integration. Per-request logging. Alert if monthly burn exceeds quote by 20%. The client sees the dashboard from day 1 — radical transparency builds trust.

## Versioning AI features

Every prompt is versioned (`v1`, `v2`, ...) and stored in git alongside its eval results. We never silently change a prompt in production. Prompt changes go through a 24-hour stagger: ship to staging, run evals, ship to production.
