# Brand Mint — Image Generation Stack

*Source of truth for which AI image tool to use, when, and at what cost.*
*Version 1.0 · 2026-05-24*

---

## TL;DR

| Use case | Tool | Cost/mo | Driven from this session? |
|---|---|---|---|
| Templated post graphics | **Canva Pro** | ₹500 / $15 | ✅ Yes (Canva MCP) |
| Commercial-safe client deliverables | **Adobe Firefly** | included in CC $55 | ✅ Yes (Adobe MCP) |
| Pitch-deck mood boards + hero shots | **Midjourney v6.1** | $30 | ❌ No — web/Discord manual |
| Real-estate / architecture mockups | **Midjourney + Ideogram + Magnific** | $30 + $20 + $39 | ❌ No — web manual |

**Starting cost (one paid tool):** ₹1,000-2,500/mo (Canva alone)
**Production stack (all four):** ₹9-12K/mo (~$110-140)

---

## 1. Templated post graphics — **Canva Pro**

### What it does
Generates branded carousels, story slides, single statics from your brand kit (logo, fonts, colors) applied to a layout template. Best for: weekly post graphics, IG carousels, story templates, slide decks.

### Cost
- Canva Pro: ₹500/mo (~$15)
- Adds: brand kit storage, background remover, magic resize, AI-generated layouts

### Driven from this session
✅ **Yes** — Canva MCP is loaded. I can:
- `create-design-from-brand-template` — apply your brand kit to a layout
- `generate-design` / `generate-design-structured` — create new designs from a text prompt
- `export-design` — export PNG/PDF/MP4
- `list-brand-kits` — pull your brand kit setup
- `import-design-from-url` — bring in a design from a URL

### Workflow
1. (One-time) Set up Brand Kit in Canva: upload logo SVGs, set palette to `#10B981` mint primary + `#0B1F1A` ink, link Plus Jakarta Sans + JetBrains Mono fonts
2. Ask me to generate a design: "Make a 4-slide carousel about Hyderabad's top builders, mint palette, editorial vibe"
3. I call the Canva MCP, generate it, export it
4. You review in Canva, tweak text, publish

### Skill it replaces
Hand-designing each carousel in Figma — ~3 hrs/post saved.

---

## 2. Commercial-safe client deliverables — **Adobe Firefly**

### What it does
Adobe's AI image generation, trained ONLY on licensed/Adobe Stock images. The output is **commercially indemnified** — Adobe will defend you if a client gets sued over a Firefly-generated image. The other AI tools (Midjourney, Stable Diffusion) do NOT offer this.

For an agency selling work to builders/clients, this is the difference between "AI-assisted" and "AI we can legally bill for."

### Cost
- Included in Adobe Creative Cloud All Apps: $55/mo
- Standalone Firefly plan: $5-30/mo depending on tier

### Driven from this session
✅ **Yes** — Adobe MCP is loaded with deep image editing tools:
- Generative fill (`image_fill_area`)
- Background removal (`image_remove_background`)
- Generative expand (`image_generative_expand`) — extend a photo beyond its edges
- Color overlay (`image_apply_color_overlay`) — recolor any area
- Selection by prompt (`image_select_by_prompt`) — "select the sky and replace with sunset"
- Vectorize photo (`image_vectorize`)
- Adjust exposure / contrast / HSL / saturation / vibrance
- Crop, resize, straighten, halftone, glitch, blur, monochrome tint

### Workflow
1. Upload a base image (a builder's project photo, a stock building shot, etc.)
2. Ask me: "Remove the sky and replace with golden-hour Hyderabad skyline" or "Expand this 1080×1080 image to 1920×1080 with matching background"
3. I drive Adobe MCP through the operations
4. Output is yours — commercially safe for client delivery

### When it's the right tool
- Builder photo retouching for case-study posts
- Sky replacements, weather changes
- Background removal for logo isolations
- Generative expand to fix awkward crops
- Brand recolors (turn any photo into the Brand Mint mint palette)

---

## 3. Pitch-deck mood boards + hero shots — **Midjourney v6.1**

### What it does
The agency-tier AI image generator. Highest aesthetic ceiling — when you see those Pentagram-style mood boards on Behance, they're usually Midjourney. Not commercially indemnified (use for moodboards/internal/pitches, NOT for ship-to-client deliverables unless the client signs an AI-use clause).

### Cost
$30/mo (Standard plan, 15 hrs fast generation/mo)

### Driven from this session
❌ **No** — Midjourney has no public API. You generate in their web app or Discord, save the JPGs, drop them in the repo.

### Workflow
1. Subscribe at midjourney.com ($30/mo)
2. In their web app, prompt: `/imagine editorial photograph of a Hyderabad skyline at golden hour, anamorphic, 35mm film grain, premium real-estate brochure --ar 9:16 --style raw --v 6.1`
3. Generate 4 options, pick the best one, upscale
4. Download JPG → drop into `brand-kit/video/v<X>/_assets/moodboard/`
5. I can then use it in a reel (Higgsfield camera move on it, or as a still in a carousel)

### Killer prompts for Brand Mint
```
editorial photograph of <subject>, anamorphic, 35mm film grain,
warm-black mood, premium real-estate brochure --ar 9:16 --style raw --v 6.1

minimal poster design, warm-black ground, mint accent #10B981,
Plus Jakarta Sans typography, --ar 4:5 --style raw --v 6.1

architectural rendering of <building/project> at twilight,
cinematic depth of field, soft mint reflections, premium development
brochure --ar 16:9 --style raw --v 6.1
```

### When to use
- Client pitch decks (mood boards)
- Hero shots for cinematic reels (then animated via Higgsfield)
- Behance / Dribbble case study covers
- Brand exploration phases
- Inspiration walls

---

## 4. Real-estate / architecture mockups — **Midjourney + Ideogram + Magnific**

### What each does
- **Midjourney** — generates the scene (the building, the street, the skyline)
- **Ideogram 2.0** ($20/mo) — generates the readable TEXT on the hoarding/billboard (Midjourney can't do clean text)
- **Magnific.ai** ($39/mo) — upscales the final composite to 4-8K for print-quality

### Cost (when actively used)
$30 + $20 + $39 = $89/mo. Only pay for months when you're actively pitching real-estate clients.

### Driven from this session
❌ **No** — all three are web tools.

### Workflow
1. **Midjourney**: generate the building/scene
   ```
   photograph of a luxury Hyderabad real-estate billboard
   beside ORR highway, dusk, cinematic, anamorphic
   --ar 16:9 --style raw --v 6.1
   ```
2. **Ideogram**: generate the readable text overlay
   ```
   billboard text "AGARTHA · ROOTS OF EARTH" in Plus Jakarta Sans
   ExtraBold, white on mint #10B981 ground --ar 16:9
   ```
3. **Photoshop / Figma**: composite the text from Ideogram onto the Midjourney scene
4. **Magnific**: upscale 4× for client deck
5. Drop into `brand-kit/_assets/mockups/`

### When to use
- Builder pitch decks (show them what their brand could look like on a hoarding)
- Speculative work for new clients
- Case-study before/after

---

## What to buy first (priority order for cold-start)

### Month 1 — ₹1,500-3,500/mo
- **Canva Pro** ₹500 — for IG carousels + story slides + post templates

### Month 2 — ₹5,000-7,000/mo total
- Add **Adobe CC** ($55, ~₹4,700) — gets you Firefly + Photoshop + Premiere + AE
- Add **Musicbed** ($30, ~₹2,500) — music license for reels (from PRODUCTION-WORKFLOW)

### Month 3 — ₹10,000-12,000/mo total
- Add **Midjourney** ($30, ~₹2,500) — when starting client pitches

### Month 4-6 — ₹14-16K/mo
- Add **Ideogram** + **Magnific** ($59, ~₹5,000) — only when doing real-estate mockups for a paying client

---

## Two demos I can run right now

### Demo A — Canva post graphic
Tell me a post topic and I'll generate a carousel via Canva MCP using your brand kit. Example: "Generate a 4-slide carousel about the 5 emerging Hyderabad builders, mint palette, editorial vibe."

### Demo B — Adobe Firefly photo edit
Upload any base image (your headshot for a removal test, a project photo, a competitor's website screenshot). I'll demonstrate background removal, generative expand, or color recolor.

Pick one and I'll show what's possible from this session.

---

## File-system reference

```
brand-kit/
├── IMAGE-GENERATION-STACK.md   ← this doc
├── _assets/
│   ├── moodboard/              # Midjourney generations (manual drops)
│   ├── mockups/                # Real-estate mockup composites
│   └── stock/                  # Adobe Stock / Artgrid downloads
├── canva-templates/            # Brand-locked Canva template URLs
└── logo/                       # Source SVG marks (use these in any AI prompt)
```

---

*This document is versioned. Update when adding new tools to the stack.*
