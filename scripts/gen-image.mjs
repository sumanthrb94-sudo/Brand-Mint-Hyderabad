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
  "Ultra-realistic editorial photograph, vertical 4:5, shot on a 50mm lens at " +
  "f/2, natural light. Real Indian people with real skin texture and real " +
  "fabric — documentary photography in the style of an Indian magazine " +
  "portrait, not a stock library, not CGI, no plastic or rendered look, no " +
  "beauty retouching. " +
  "SETTING IS ALWAYS INDIA: Hyderabad and Telangana — the shops, streets, " +
  "clothing, signage shapes and light of a South Indian city. Never a " +
  "European or American storefront. " +
  "COMPOSITION IS STRICT: the person's head sits in the TOP THIRD of the " +
  "frame, well above centre, looking toward or just past the camera. The " +
  "bottom 45 percent is quiet and dark — floor, shadow, counter surface or " +
  "blurred depth — because a headline is laid over it. " +
  "EXPOSURE: the face is clearly lit and clearly readable. Shadows are deep " +
  "but the subject is not underexposed. " +
  "Colour grade: deep forest green and near-black shadows, warm amber " +
  "practical lights, one small emerald accent. Cinematic and muted. " +
  "The photograph fills the entire frame edge to edge, full bleed. No border, " +
  "no matte, no white bars, no letterboxing, no vignette ring, no frame. " +
  "No text, letters, numbers, words, signage, logos, price tags, watermarks " +
  "or legible phone or laptop screens anywhere in frame. No distorted hands, " +
  "no extra fingers, no duplicated people.";

const PEOPLE = {
  "ppl-reply":     "An Indian man in his thirties behind the counter of his small shop in the evening, phone held up near his face mid-reply, faintly tired. A warm bulb above him, the shop dark behind.",
  "ppl-own":       "An Indian woman in her late twenties standing in the doorway of her own small clothing boutique at dusk, arms loosely folded, looking straight at the camera, calm and proprietorial.",
  "ppl-fixed":     "Two Indian men either side of a shop counter, mid-conversation, one leaning in slightly. A single sheet of paper on the counter between them, angled so nothing on it is readable.",
  "ppl-before":    "An Indian man in his forties looking down at his phone with a sceptical, weighing expression, one eyebrow slightly raised, as if reading a quote he does not quite believe.",
  "ppl-inside":    "A young Indian shopkeeper reaching up to straighten stock on a high shelf, caught mid-movement, half-turned toward the camera, a small tidy shop around him.",
  "ppl-store":     "An Indian boutique owner folding a garment into a parcel on a wooden table, hands in frame and in focus, looking up at the camera as she works.",
  "ppl-quote":     "An Indian man at a cluttered back-office desk holding a printed bill at arm's length, frowning at it, a desk lamp raking across from one side.",
  "ppl-crm":       "An Indian woman in a small back office at a laptop, leaning back from the screen with one hand on the desk, thinking. The laptop screen is dark and shows nothing.",
  "ppl-work":      "A young Indian man on a Hyderabad street holding his phone up toward the camera to show someone something on it, pleased. The phone screen is blank and dark.",
  "ppl-change":    "An older Indian shopkeeper looking up and slightly off-camera with a faint, unforced smile, his shop soft and out of focus behind him.",
  "ppl-yes":       "Two Indian men shaking hands across a shop counter, both partly in frame, warm and unstaged, shot slightly from the side. Not a corporate handshake.",
  "ppl-need":      "An Indian woman photographing a product on a plain table with her phone, bent slightly over it, concentrating. The phone screen is not visible.",
  "ppl-search":    "An Indian woman standing on a busy Hyderabad street at dusk looking down at her phone, other pedestrians blurred around her, city lights behind. Phone screen dark.",
  "ppl-catalogue": "An Indian man sitting on a stool in his shop thumbing through photos on his phone, a stack of unsent parcels beside him, evening light.",
  "ppl-diwali":    "An Indian shopkeeper standing in the doorway of a small shop strung with warm Diwali lights and clay oil lamps at night, looking at the camera, proud and a little tired.",
  "ppl-check":     "An Indian woman holding a printed sheet of paper, reading down it with a pen in her other hand, half-lit by a window. Nothing on the page is readable.",
};

/* --------------------------- CAROUSEL INTERIOR SCENES ---------------------
   The covers were only ever 16 of 109 slides. These fill the statement and
   CTA slides behind the same scrim, under the same rule as PEOPLE above:
   stock photography, never evidence.

   Reused across carousels on purpose. A set posted over six weeks reads as
   one studio when scenes recur; forty-five unrelated photographs read as a
   stock subscription. List and price slides stay clean — a four-row list at
   41px, or a price, over a photograph is a legibility gamble worth nothing.

   Same composition contract as PEOPLE: subject in the top half, bottom 45%
   quiet and dark, because the headline sits on it. */
const SCENES = {
  "sc-walkaway":  "A customer seen from behind walking away from a small Indian shopfront at dusk, already looking down at their phone. The shop behind them is lit but unattended.",
  "sc-shutter":   "The closed metal shutter of a small Indian shop at night, one street light raking across it, a narrow empty street in front. Nobody in frame.",
  "sc-queue":     "Four or five people waiting at a small Indian shop counter in the evening, shot from behind the queue, the shopkeeper busy and out of reach at the far end.",
  "sc-phonepile": "An Indian man's hands holding a phone on a shop counter late at night, the screen dark, a ledger and a cold cup of chai beside it. Shot from above his shoulder.",
  "sc-emptyshop": "The inside of a small Indian shop in the early morning before opening, stock neat on the shelves, nobody there yet, light coming in from one side.",
  "sc-paperwork": "A cluttered Indian back-office desk seen at a low angle — a stack of printed papers, a calculator, a pen, one warm desk lamp. No text readable, no person.",
  "sc-handoff":   "An Indian shopkeeper handing a wrapped parcel across a counter to a customer, both hands in frame, warm evening light, faces partly visible.",
  "sc-market":    "A busy Hyderabad market lane at dusk shot straight down its length from standing height, shopfronts on both sides, people moving away from camera, warm lights strung overhead. ONE straightforward photograph — no portrait, no face anywhere, no foreground subject, no double exposure, no composite, no overlaid second image.",
  "sc-packing":   "An Indian woman packing orders into parcels at a table stacked with brown paper and tape, working steadily, looking down at her hands.",
  "sc-scooter":   "A delivery rider on a scooter pulling away down a street at night with parcels bungeed on the back, shot from behind at low angle. Absolutely no signboards, no shop signs, no lettering of any kind anywhere in the frame — plain walls and shutters only.",
  "sc-thinking":  "An Indian shop owner sitting alone on a stool in his own closed shop after hours, elbows on knees, looking at nothing in particular. Quiet, not sad.",
  "sc-twohands":  "Two pairs of Indian hands over a counter, one pointing at a sheet of paper the other is holding. Faces out of frame above. Nothing on the paper is readable.",
  "sc-streetphone":"A young Indian woman on a Hyderabad pavement at night looking at her phone, the lit shopfronts of the street reflected around her. Phone screen dark.",
  "sc-shelves":   "Densely stocked shelves in a small Indian kirana shop, shot straight on, a single bulb above, no person in frame.",
  "sc-openingup": "An Indian shopkeeper in a clean pressed shirt and trousers rolling up the metal shutter of his own shop in the early morning, seen from the street, back half-turned to the camera. A tidy commercial street. He is fully and neatly dressed.",
  "sc-counter":   "An empty Indian shop counter at night lit by one overhead bulb, a phone face down on the wood, the shop dark behind it. Nobody in frame.",
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

let failed = 0;
for (const id of ids) {
  try {
    await generate(id);
  } catch (e) {
    console.error(`  FAIL  ${id}: ${e.message}`);
    failed += 1;
  }
}
process.exit(failed ? 1 : 0);
