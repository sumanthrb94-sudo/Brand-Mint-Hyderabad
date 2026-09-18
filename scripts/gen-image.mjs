#!/usr/bin/env node
/**
 * Generate site imagery with the Gemini image models.
 *
 * The studio already pays for a Gemini key (api/wa-hook.js uses it for the
 * WhatsApp replies), so image generation costs nothing extra and has no daily
 * cap to run into.
 *
 *   export GEMINI_API_KEY=...
 *   node scripts/gen-image.mjs --list
 *   node scripts/gen-image.mjs who
 *   node scripts/gen-image.mjs --all --key AQ...
 *
 * Writes PNG to images/<id>.png. Convert to JPG afterwards with
 * brand-kit/templates/render-og.cjs, which re-encodes through Chromium —
 * there is no ImageMagick or sharp in this repo and no package.json to add
 * one to.
 *
 * RULES THAT ARE NOT STYLE PREFERENCES:
 *   - No people and no faces. A stock-looking stranger on a page that says
 *     "an operator with eight years" reads as a lie about who you are.
 *   - No legible text on any screen or sign. A generated word is a claim,
 *     and generated words are usually misspelled anyway.
 *   - Nothing that could pass as a screenshot of a client's site. The four
 *     images in work/ must be real captures; see work/README.md.
 */

const KEY =
  process.env.GEMINI_API_KEY ||
  (process.argv.includes("--key") ? process.argv[process.argv.indexOf("--key") + 1] : "");

const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image";
const API = "https://generativelanguage.googleapis.com/v1beta/models";

/** The palette, repeated into every prompt so the set looks like one studio
 *  shot it rather than four different stock libraries. */
const PALETTE =
  "Palette: warm cream #f5f1ea, deep forest green #0b1f1a, emerald #00c897, " +
  "a single muted gold #c9a14a accent. Warm, calm, editorial, expensive. " +
  "No people, no faces, no hands. No legible text, words, letters, numbers, " +
  "logos or signage anywhere in the frame.";

const SHOTS = {
  who: {
    file: "studio-desk",
    aspect: "4:3",
    where: "index.html #who — 'an operator with eight years, not an intern with a template'",
    prompt:
      "Documentary photograph of a working desk in a small design studio, low " +
      "three-quarter angle. On the matte dark surface: an open laptop angled away " +
      "so its screen is not readable, a paper notebook with pencil wireframe " +
      "sketches reduced to plain boxes and lines, a mechanical pencil, a colour " +
      "swatch fan, and a cup of chai on a saucer. One shaft of late-afternoon " +
      "window light from the left, soft long shadows, shallow depth of field. " +
      "Worked-in, not staged.",
  },
  crm: {
    file: "crm-flow",
    aspect: "16:9",
    where: "platform.html #included — eight things, one login",
    prompt:
      "Minimal isometric conceptual illustration of a scattered inbox becoming an " +
      "ordered list. LEFT: a loose disordered cloud of small rounded speech " +
      "bubbles at many angles and sizes, tumbling. RIGHT: one large cream card " +
      "tilted in isometric view, holding a single vertical stack of eight " +
      "FULL-WIDTH HORIZONTAL ROWS, one above the other like an inbox — each row a " +
      "long rounded bar spanning the card's width, with a small circle at its left " +
      "end where an avatar would sit. Not a grid, not a keypad: one column of wide " +
      "rows. The bubbles stream toward the card and the nearest ones flatten into " +
      "the top rows. Three rows tinted emerald, the rest cream. Every surface " +
      "blank — no text or symbols. Deep forest green ground, soft shadow under " +
      "the card, generous empty space at the upper right.",
  },
  ship: {
    file: "packing-bench",
    aspect: "4:3",
    where: "index.html #how — from first message to live store",
    prompt:
      "Overhead photograph of a small brand's packing bench: two kraft parcels " +
      "taped and ready, a roll of tape, a stack of blank unprinted cards, scissors, " +
      "and a phone lying face down beside them. Cream paper surface, deep green " +
      "cloth at one edge, soft diffused daylight. Nothing branded, nothing written " +
      "on the cards or parcels.",
  },
};


/* ---------------------------- PRESENTER AVATARS ---------------------------
   These deliberately break the "no people, no faces" rule above, and the
   distinction matters.

   A generated person saying "Brand Mint built my store and it doubled my
   orders" is a fabricated testimonial — an endorsement from a customer who
   does not exist. That is never made.

   A presenter speaking AS the studio, delivering the studio's own copy, is
   what an actor does in any advertisement. That is what these are for. They
   must never be captioned, framed or scripted as a client, a customer or a
   member of staff, and they must never say "I" about work the studio did.

   ANY VIDEO USING ONE OF THESE CARRIES A VISIBLE AI-GENERATED LABEL.
   marketing/video/OMNI-30-VIDEO-PLAN.md records that synthetic-media
   labelling is a legal requirement in India, not a preference, and a
   synthetic human on screen is the case it exists for.

   The chosen still becomes the reference frame for Veo image-to-video, which
   is what keeps one face across every clip instead of a new stranger each
   generation. Re-roll these as many times as you like — stills are cheap and
   video is not. */
const PRESENTER =
  "Photographic portrait for a video advertisement, vertical 9:16, medium " +
  "close-up from mid-chest up, eye level, subject looking straight down the " +
  "lens with a calm open expression and the faintest smile — mid-sentence, " +
  "about to speak, not posed. Soft daylight from a large window at camera " +
  "left, gentle falloff, 50mm lens at f2.0, shallow but not extreme depth of " +
  "field. Background: a real working studio wall in soft focus, sage olive " +
  "green, with one out-of-focus plant. Natural skin texture, no retouching, " +
  "no beauty filter, no makeup sheen. Centred with headroom above and clear " +
  "space at the bottom third for captions. " +
  "No text, letters, logos or watermarks anywhere in frame.";

const AVATARS = {
  "host-a": { file: "avatar-host-a", aspect: "9:16", where: "presenter option A",
    prompt: "An Indian man in his early thirties, short neat black hair, trimmed " +
      "stubble, warm and unpolished rather than corporate. Plain dark forest-green " +
      "crew-neck t-shirt. Looks like a founder who does the work, not a spokesman." },
  "host-b": { file: "avatar-host-b", aspect: "9:16", where: "presenter option B",
    prompt: "An Indian woman in her early thirties, dark hair tied back loosely, " +
      "small gold stud earrings, direct and friendly. Plain cream linen shirt, " +
      "sleeves rolled. Calm, capable, the person who actually runs things." },
  "host-c": { file: "avatar-host-c", aspect: "9:16", where: "presenter option C",
    prompt: "An Indian man in his late thirties, slight grey at the temples, " +
      "clean-shaven, quietly authoritative and easy. Charcoal shirt, top button " +
      "open, no tie. The senior person you would want on the call." },
  "host-d": { file: "avatar-host-d", aspect: "9:16", where: "presenter option D",
    prompt: "An Indian woman in her late twenties, shoulder-length hair worn down, " +
      "bright and quick, a little more energy than the others — closer to a creator " +
      "than a presenter. Muted sage green sweatshirt." },
};


/* --------------------------- SCALE HOOK COVERS ----------------------------
   The format in the viral prompt-pack carousels: one person rendered at
   impossible scale against real architecture. It works because the eye cannot
   resolve it at thumbnail size, so the thumb stops.

   Borrowed as a MECHANIC, not as content. Those posts give away an AI prompt
   because their audience is designers. This audience is shop owners in
   Hyderabad, and the giveaway has to be the thing they actually want — the
   prices, the checklist, the straight answer. The surreal image only buys the
   first second.

   Hyderabad landmarks on purpose. A giant man on the Arc de Triomphe says
   nothing to a boutique in Kukatpally; Charminar and the HITEC City towers
   say "this is for you" before a word is read.

   The person is deliberately generic and never presented as a client, a
   customer or the studio's staff — the rule that governs AVATARS above
   applies here too. */
const SCALE =
  "Ultra-realistic surreal lifestyle photograph, vertical 4:5 composition. " +
  "Extreme low-angle wide-angle perspective from street level, 20-24mm, so the " +
  "architecture converges dramatically toward the sky and the giant figure " +
  "dominates the upper half of the frame. Photorealistic skin and fabric, " +
  "realistic atmospheric depth, subtle film grain, overcast cinematic daylight, " +
  "high-fashion street photography treatment. Real vehicles and pedestrians far " +
  "below for scale. " +
  "No text, letters, numbers, words, signage, logos, watermarks, hats, caps or " +
  "sunglasses anywhere in frame. No distorted anatomy, no duplicated people, no " +
  "CGI plastic look — the surreal effect must come only from the difference in " +
  "scale.";

const HOOKS = {
  "hook-charminar": { file: "hook-charminar", aspect: "4:5", where: "carousel cover — scale hook, Charminar",
    prompt: "A young Indian man at impossible giant scale, sitting casually on the " +
      "upper gallery of Charminar in Hyderabad as if the monument were a bench, both " +
      "legs hanging over the edge toward the camera. He wears a plain dark forest-green " +
      "t-shirt and light-wash relaxed jeans, relaxed and nonchalant, looking slightly " +
      "down toward the lens. The old city market streets, traffic and crowds are far " +
      "below at normal size. Warm late-afternoon haze." },
  "hook-hitec": { file: "hook-hitec", aspect: "4:5", where: "carousel cover — scale hook, HITEC City",
    prompt: "A young Indian woman at impossible giant scale, sitting on the edge of a " +
      "glass-and-steel office tower in HITEC City Hyderabad as if the building were a " +
      "seat, legs hanging over the edge. She wears a plain cream linen shirt and light " +
      "jeans, calm and confident. Far below at street level, at normal human size, the " +
      "same woman stands on the pavement looking up at her gigantic self. Both must " +
      "clearly be the same person. Wide modern boulevard, glass reflections." },
  "hook-shop": { file: "hook-shop", aspect: "4:5", where: "carousel cover — scale hook, the shop",
    prompt: "A young Indian man at impossible giant scale, kneeling on one knee in a " +
      "Hyderabad street and reaching down with one hand toward a single small " +
      "ordinary shopfront that comes up only to his knee — a modest neighbourhood " +
      "boutique with a plain awning and no signage. He wears a dark green t-shirt and " +
      "light jeans, his expression careful and protective rather than threatening. " +
      "Other buildings on the street are normal size around him." },
};


/* --------------------------- CAROUSEL COVER PLATES ------------------------
   Backgrounds for the loud covers in marketing/social/. These are not
   pictures with type added — they are plates built to be typed on, which is a
   different brief:

     - DARK AND LOW CONTRAST. The type is cream and emerald at 248px. Anything
       bright or busy under it turns the headline into noise.
     - INTEREST ON THE RIGHT, AIR ON THE LEFT. The type block is left-aligned
       and fills the left two thirds, so the photograph has to carry its
       subject to the right of frame or it gets covered up.
     - NO PEOPLE FACING CAMERA. A face under a headline fights it, and this is
       not the presenter slot.

   4:5 to match the slide. carousel.html lays a two-ended scrim over the top
   regardless, so these can afford to be a stop brighter than feels right. */
const COVER =
  "Vertical 4:5 photograph, cinematic and underexposed, deep shadow across the " +
  "left half of the frame with the subject and what light there is pushed to " +
  "the right third. Muted desaturated palette of deep forest green, near-black " +
  "and warm lamp amber, with one small emerald-green light source. Shallow " +
  "depth of field, soft film grain, no hard highlights. Quiet, still, " +
  "atmospheric — a backdrop, not a picture that wants attention. " +
  "The photograph fills the entire frame edge to edge, full bleed — no border, " +
  "no frame, no matte, no letterboxing, no grey bars, no vignette ring. " +
  "No text, letters, numbers, words, signage, logos or watermarks anywhere in " +
  "frame. No faces, no person looking at the camera.";

const COVERS = {
  "bg-reply": { file: "bg-reply", aspect: "4:5", where: "cover plate — reply machine",
    prompt: "A small shop counter late at night, lit only by a phone lying face-up " +
      "on the wood at the right of frame, its blank screen throwing hard green-white " +
      "light upward. Beside it an impossibly tall, precarious stack of small paper " +
      "order chits, leaning. The rest of the shop falls away into darkness." },
  "bg-own": { file: "bg-own", aspect: "4:5", where: "cover plate — own it or rent it",
    prompt: "A modest closed shopfront at night with its metal shutter half down, " +
      "seen from across a wet empty street at the right of frame. A single unplugged " +
      "cable hangs loose from the wall beside it. Everything else is darkness and " +
      "reflected light on wet ground. Abandoned, quiet, slightly ominous." },
  "bg-price": { file: "bg-price", aspect: "4:5", where: "cover plate — fixed price",
    prompt: "A single printed agreement lying on a dark walnut desk at the right of " +
      "frame, one warm lamp raking across it from the far right, a pen resting on " +
      "top. The paper is angled away so nothing on it is readable. Deep shadow " +
      "everywhere else. Calm, serious, settled." },
};

function usage() {
  console.log("Shots:\n");
  for (const [id, s] of Object.entries({ ...SHOTS, ...AVATARS, ...HOOKS, ...COVERS })) {
    console.log(`  ${id.padEnd(6)} images/${s.file}.png  (${s.aspect})  ${s.where}`);
  }
  console.log("\n  node scripts/gen-image.mjs <id> [<id>...]   |   --all");
}

async function generate(id) {
  // PEOPLE entries are bare prompt strings — the file name is the id and the
  // ratio is always 4:5, so there is nothing else worth repeating sixteen
  // times. Everything else carries its own {file, aspect, prompt}.
  const shot = SHOTS[id] || AVATARS[id] || HOOKS[id] || COVERS[id]
    || (PEOPLE[id] ? { file: id, aspect: "4:5", prompt: PEOPLE[id] } : null)
    || (SCENES[id] ? { file: id, aspect: "4:5", prompt: SCENES[id] } : null);
  if (!shot) throw new Error(`Unknown shot "${id}". Try --list.`);

  const house = AVATARS[id] ? PRESENTER : HOOKS[id] ? SCALE
    : COVERS[id] ? COVER : (PEOPLE[id] || SCENES[id]) ? PEOPLE_BASE : PALETTE;
  const body = {
    contents: [{ parts: [{ text: `${shot.prompt}\n\n${house}` }] }],
    generationConfig: {
      responseModalities: ["IMAGE"],
      imageConfig: { aspectRatio: shot.aspect },
    },
  };

  const r = await fetch(`${API}/${MODEL}:generateContent?key=${KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
  });

  const json = await r.json().catch(() => ({}));
  if (!r.ok) {
    // Print Google's own message — it names the actual problem (quota, model
    // not enabled, bad key) far better than any guess made here.
    throw new Error(`${r.status} ${json?.error?.message || JSON.stringify(json).slice(0, 300)}`);
  }

  const parts = json?.candidates?.[0]?.content?.parts || [];
  const img = parts.find((p) => p.inlineData?.data);
  if (!img) {
    const why = json?.candidates?.[0]?.finishReason || "no inlineData in response";
    const text = parts.find((p) => p.text)?.text;
    throw new Error(`no image returned (${why})${text ? `: ${text.slice(0, 200)}` : ""}`);
  }

  const fs = await import("node:fs");
  const out = `images/${shot.file}.png`;
  fs.writeFileSync(out, Buffer.from(img.inlineData.data, "base64"));
  const kb = Math.round(fs.statSync(out).size / 1024);

  // Append to a ledger, because "how much have we spent on images" turned out
  // to be answerable only by reading back through a chat transcript. One line
  // per generation, including the ones that get thrown away — the discarded
  // ones are most of the bill.
  fs.appendFileSync("images/.gen-log.tsv",
    `${new Date().toISOString()}\t${MODEL}\t${id}\t${shot.aspect}\t${kb}\n`);

  console.log(`  ok  ${out}  ${kb} KB  ${shot.aspect}`);
  return out;
}

/* ------------------------- CAROUSEL PEOPLE COVERS -------------------------
   People, on purpose, and the distinction that makes it fine.

   A generated person here is doing the job stock photography has always done:
   mood, attention, a human face at the top of a poster. Nobody has ever
   believed the woman in a bank's billboard banks there. What is NOT allowed,
   ever, is a generated person doing EVIDENTIARY work — captioned as a client,
   quoted as a testimonial, presented as studio staff, or standing in a shop
   described as a client's shop. That is the whole line, and it is the reason
   the SHOTS set above still bans faces: those sit on a page that says "an
   operator with eight years", where a stranger's face IS a claim about who
   you are. A carousel cover makes no such claim.

   Composition is fixed by the template. carousel.html anchors the headline to
   the bottom half under a heavy scrim, so:
     - THE FACE BELONGS IN THE TOP THIRD, and must not be centred low.
     - The bottom 45% is going under near-black. Put nothing there that
       matters.
     - Vertical 4:5.
   Hyderabad and its trades, because a generic Western storefront says nothing
   to a boutique in Kukatpally. */
const PEOPLE_BASE =
  "Premium commercial brand photography, vertical 4:5, 50mm at f/2, styled and " +
  "art-directed like a D2C brand campaign or a fashion lookbook. Bright, clean, " +
  "aspirational and expensive-looking. Real Indian people with real skin " +
  "texture — editorial, never CGI, never a rendered or plastic look, never a " +
  "cheap stock photo. " +
  "MODERN INDIAN BUSINESS, NOT A STREET STALL: contemporary Indian retail and " +
  "studios — a designer boutique, a jewellery showroom, a specialty café, a " +
  "skincare or beverage brand's studio, a clean fulfilment room, a bright " +
  "co-working office. Hyderabad and Indian in styling, people and dress, but " +
  "well-designed and well-lit throughout. Never a crowded bazaar, never a " +
  "cluttered kirana shop, never anything that reads as run-down. " +
  "LIGHT: generous soft daylight through large windows, airy and clean, warm " +
  "neutrals, pale wood, off-white walls, a little greenery. The subject is " +
  "brightly and flatteringly lit. " +
  "COMPOSITION: the person's head sits in the TOP THIRD, well above centre, " +
  "looking toward or just past the camera. The camera is slightly above eye " +
  "level and tilted a little downward, so the floor or the work surface " +
  "recedes naturally through the lower part of the frame and is comparatively " +
  "empty there. " +
  "ONE SINGLE CONTINUOUS PHOTOGRAPH. No seam, no horizontal split, no band, " +
  "no second image spliced in below, no separate panel, no collage, no sudden " +
  "change of focus or brightness partway down. The lower part of the frame is " +
  "the same room, the same light and the same perspective as the top — simply " +
  "emptier. Describing it as a zone for text is forbidden; it is just floor. " +
  "A single small emerald-green accent somewhere in frame. " +
  "The photograph fills the frame edge to edge, full bleed. No border, no " +
  "matte, no white bars, no letterboxing, no frame. " +
  "No text, letters, numbers, words, signage, logos, price tags, watermarks " +
  "or legible phone or laptop screens anywhere. No distorted hands, no extra " +
  "fingers, no duplicated people, no double exposure, no composite.";

/* Sixteen covers across sixteen kinds of business, because the four real
   clients are a couture label, a beverage brand and two B2B platforms — not
   one kirana shop between them. A prospect should be able to find something
   that looks like their own business somewhere in the set. */
const PEOPLE = {
  "ppl-reply":     "A woman in her thirties in her bright modern clothing boutique, phone to her ear mid-conversation, one hand resting on a rail of hanging garments. Racks and pale wood behind her, large window light.",
  "ppl-own":       "The founder of a skincare brand standing in her clean studio behind a table of unbranded bottles and jars, arms loosely folded, looking straight at the camera, calm and proprietorial.",
  "ppl-fixed":     "Two people at a pale wood table in a bright studio office, mid-conversation, one leaning in. A single sheet of paper between them, angled so nothing on it is readable.",
  "ppl-before":    "A man in his forties in a specialty café reading something on a tablet with a sceptical, weighing expression, one eyebrow slightly raised. Tablet screen dark.",
  "ppl-inside":    "A young man arranging stock on open shelves in a small, beautifully merchandised lifestyle store, half-turned toward the camera, warm daylight.",
  "ppl-store":     "The owner of a fashion label folding a garment into premium unbranded packaging on a clean table, hands in frame and in focus, looking up at the camera.",
  "ppl-quote":     "A woman at a tidy modern desk holding a printed invoice down low on the desk in front of her, frowning at it. Her whole face is clearly visible and completely unobscured — the paper is well below her chin and never crosses her face. Soft window light from one side.",
  "ppl-crm":       "A founder in a bright co-working office leaning back from a laptop with one hand on the desk, thinking. The laptop screen is dark and shows nothing.",
  "ppl-work":      "A young man in a modern retail store holding his phone up toward the camera to show someone something on it, pleased. Phone screen blank and dark.",
  "ppl-change":    "The owner of a jewellery showroom standing behind a lit glass display case, looking up at the camera with a faint, unforced smile. Clean, expensive, softly lit.",
  "ppl-yes":       "Two people shaking hands across a pale wood counter in a modern showroom, both partly in frame, warm and unstaged, shot slightly from the side.",
  "ppl-need":      "A woman shooting a styled product flat-lay on a white table with her phone on a small tripod, bent slightly over it, concentrating. No screen visible.",
  "ppl-search":    "A woman on a clean modern Indian high street at golden hour looking down at her phone, well-designed shopfronts blurred behind her. Phone screen dark.",
  "ppl-catalogue": "The owner of a specialty bakery behind a counter of unlabelled pastries, scrolling photos on her phone, a stack of packed boxes beside her.",
  "ppl-diwali":    "The owner of a premium clothing store during the festive season, standing in a bright store dressed with warm string lights and marigold, customers softly blurred behind, looking at the camera.",
  "ppl-check":     "A woman in a bright studio holding a printed sheet, reading down it with a pen in her other hand. Nothing on the page is readable.",
};

/* --------------------------- CAROUSEL INTERIOR SCENES ---------------------
   Statement and CTA slides, behind the same scrim, under the same rule:
   stock photography, never evidence. Reused across carousels on purpose — a
   set posted over six weeks reads as one studio when scenes recur, and as a
   stock subscription when forty-five unrelated photographs do not. List and
   price slides stay clean, because a price over a photograph is a legibility
   gamble worth nothing. */
const SCENES = {
  "sc-walkaway":  "A customer seen from behind walking out of a bright modern boutique, already looking down at their phone. The store behind them is beautifully lit and unattended.",
  "sc-shutter":   "The closed glass frontage of a smart modern Indian store at night, lights off inside, clean pavement in front. Nobody in frame. Quiet, not derelict. The fascia above the window is completely blank — absolutely no shop name, no brand name, no lettering, no logo, no signage of any kind anywhere in the frame.",
  "sc-queue":     "Four or five well-dressed people waiting at the counter of a busy modern store, shot from behind the queue, the one staff member out of reach at the far end.",
  "sc-phonepile": "A phone face up on a clean pale desk beside a notebook and a cup of coffee, late evening, one warm lamp. Screen dark. No person in frame.",
  "sc-emptyshop": "The inside of a beautifully merchandised small store early in the morning before opening, stock neat, nobody there yet, daylight through a large window.",
  "sc-paperwork": "A tidy modern desk shot at a low angle — a small stack of printed papers, a pen, a laptop closed, soft daylight. Nothing readable, no person.",
  "sc-handoff":   "A clearly recognisable brown cardboard shipping box, cubic and obviously a parcel, being handed across a pale wood counter — both pairs of hands in frame, bright warm light, faces partly visible above. It must read unmistakably as a parcel, not a tablet or a flat slab.",
  "sc-market":    "A clean, modern Indian shopping street at golden hour shot straight down its length, well-designed shopfronts both sides, people walking away from camera. One photograph — no portrait, no face, no foreground subject, no double exposure, no composite.",
  "sc-packing":   "A styled packing station — a woman placing folded goods into premium unbranded boxes with tissue paper, clean white table, daylight.",
  "sc-scooter":   "A delivery rider loading parcels onto a scooter outside a smart modern storefront in daylight, shot from the doorway. No signboards, no lettering anywhere in frame.",
  "sc-thinking":  "A founder sitting alone on a stool in her own studio after hours, elbows on knees, looking at nothing in particular. Calm, considered, softly lit.",
  "sc-twohands":  "Two pairs of hands over a pale wood table, one pointing at a sheet of paper the other is holding. Faces out of frame above. Nothing readable.",
  "sc-streetphone":"A young woman on a clean modern Indian street at golden hour looking at her phone, well-designed shopfronts softly blurred around her. Phone screen dark.",
  "sc-shelves":   "Beautifully merchandised open shelving in a modern lifestyle store, shot straight on, warm daylight, generous spacing. No person in frame.",
  "sc-openingup": "A well-dressed shop owner unlocking and opening the glass door of her modern boutique in the early morning, seen from the street, half-turned to the camera.",
  "sc-counter":   "A clean modern checkout counter, empty, one card reader and a small plant on it, soft daylight, the store softly out of focus behind.",
};

const args = process.argv.slice(2).filter((a) => !a.startsWith("--") && a !== KEY);
const ids = process.argv.includes("--all") ? Object.keys(SHOTS)
  : process.argv.includes("--avatars") ? Object.keys(AVATARS)
  : process.argv.includes("--hooks") ? Object.keys(HOOKS)
  : process.argv.includes("--covers") ? Object.keys(COVERS)
  : process.argv.includes("--people") ? Object.keys(PEOPLE)
  : process.argv.includes("--scenes") ? Object.keys(SCENES)
  : args;

if (process.argv.includes("--list") || !ids.length) {
  usage();
  process.exit(0);
}
if (!KEY) {
  console.error("No GEMINI_API_KEY (or --key).");
  process.exit(1);
}

/** $0.134 per 1K-2K image on gemini-3-pro-image, Sept 2026. Imagen 4 Fast is
 *  $0.02 if a run is only about composition and not final quality. */
const USD_PER_IMAGE = Number(process.env.GEMINI_IMAGE_USD || 0.134);

let failed = 0;
for (const id of ids) {
  try {
    await generate(id);
  } catch (e) {
    console.error(`  FAIL  ${id}: ${e.message}`);
    failed += 1;
  }
}
const made = ids.length - failed;
const fsx = await import("node:fs");
const total = fsx.existsSync("images/.gen-log.tsv")
  ? fsx.readFileSync("images/.gen-log.tsv", "utf8").trim().split("\n").filter(Boolean).length
  : made;
console.log(`\n  ${made} generated this run  ~$${(made * USD_PER_IMAGE).toFixed(2)}`);
console.log(`  ${total} in images/.gen-log.tsv all time  ~$${(total * USD_PER_IMAGE).toFixed(2)}`);
process.exit(failed ? 1 : 0);
