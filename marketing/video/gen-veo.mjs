#!/usr/bin/env node
/**
 * Generate the three clips for the 30-second Instagram promo, using Veo
 * through the Gemini API — the same key api/wa-hook.js already uses.
 *
 *   export GEMINI_API_KEY=...
 *   node marketing/video/gen-veo.mjs --list
 *   node marketing/video/gen-veo.mjs --all
 *   node marketing/video/gen-veo.mjs before          # re-roll one beat
 *
 * Writes marketing/video/out/<id>.mp4. Compose with cut-30.sh afterwards.
 *
 * WHY THREE CLIPS AND AN END CARD. Veo caps a generation at 8 seconds, so
 * 3 x 8 = 24s of footage. The last 6s is the end card, which is where the
 * call to action belongs anyway and costs nothing to produce.
 *
 * THE RULES BELOW COME FROM marketing/video/OMNI-30-VIDEO-PLAN.md, which was
 * written from clips that were actually delivered. They are findings, not
 * preferences:
 *
 *   - NO TEXT ANYWHERE IN FRAME. Generative models garble letterforms, and a
 *     mangled ₹ price in a paid ad is worse than no ad. Every word and the
 *     logo go on in post, from marketing/video/assets/.
 *   - MATCH THE ESTABLISHED ROOM. Sage/olive wall, dark walnut desk, one warm
 *     practical lamp at camera left, soft key from the left. Earlier clips
 *     drifted warmer and more olive than the original brief; the plan's own
 *     conclusion was to stop fighting it, because consistency across a series
 *     beats a palette note.
 *   - FACES ARE FINE HERE, under the rule the carousels settled on: a
 *     generated person is stock photography and nobody believes the woman in
 *     a bank's billboard banks there. What is never allowed is a generated
 *     person doing EVIDENTIARY work — presented as studio staff, as a named
 *     client, or saying "this worked for me". The voiceover is a narrator,
 *     not the founder, so nothing here claims to be anyone. (The UGC set
 *     below still has no face, and that is not this rule applied blindly —
 *     a UGC ad IS a person saying "this worked for me", which is exactly the
 *     fabricated testimonial we will not make.)
 *   - ONE CONTINUOUS SHOT PER CLIP. Asking for cuts inside 8 seconds returns
 *     mush.
 *
 * CLAIMS. Nothing in these prompts states a number, because nothing in frame
 * is allowed to be text. Every claim lives on the end card and the overlays,
 * and must match the live site: brandmintstudios.in, +91 77999 34943, HITEC
 * City. No revenue figures and no ROI percentages, ever.
 */

const KEY =
  process.env.GEMINI_API_KEY ||
  (process.argv.includes("--key") ? process.argv[process.argv.indexOf("--key") + 1] : "");

const MODEL = process.env.VEO_MODEL || "veo-3.1-fast-generate-preview";
const API = "https://generativelanguage.googleapis.com/v1beta";

/** Appended to every prompt. The negative constraints matter more than the
 *  positive ones — this is the sentence that keeps letterforms out. */
const HOUSE =
  "Premium commercial brand film, 9:16 vertical, shot on a 50mm at T2.0, 24fps, " +
  "clean and bright with a soft filmic grade — a D2C brand campaign, not " +
  "documentary reportage and not a stock library. " +
  "MODERN INDIAN BUSINESS, NOT A STREET STALL: contemporary Indian retail and " +
  "studios — a designer boutique, a jewellery showroom, a specialty cafe, a " +
  "clean packing room, a bright modern high street. Hyderabad and Indian in " +
  "people, dress and styling, but well-designed and well-lit throughout. Never " +
  "a crowded bazaar, never a cluttered kirana shop, nothing that reads as " +
  "run-down. " +
  "Generous soft daylight through large windows, pale wood, off-white walls, a " +
  "little greenery, one small emerald-green accent somewhere in frame. Real " +
  "Indian people with real skin texture, never CGI or plastic. " +
  "ONE SINGLE CONTINUOUS SHOT, no cuts, no split screen, no seam or band " +
  "across the frame, no second image composited in. " +
  "Absolutely no text, letters, numbers, words, signage, icons, notifications, " +
  "user interface, logos, watermarks or printing anywhere in frame, and no " +
  "legible phone or laptop screens.";

const SHOTS = {
  // Beat 1, over "Your customers are already looking for you. They find a
  // phone number, a WhatsApp, and nothing else."
  before: {
    n: 1,
    title: "Looking for you",
    prompt:
      "A young Indian woman stands on a clean modern Indian shopping street at " +
      "golden hour, looking down at her phone, then lifts her eyes to a shopfront " +
      "just off camera, waits a beat, and walks on out of frame. Well-designed " +
      "shopfronts and a few passers-by softly out of focus behind her. Her phone " +
      "screen is dark and blank. The camera holds nearly still and drifts a few " +
      "centimetres with her. Warm, unhurried, faintly disappointed.",
  },
  // Beat 2, over "So you answer the same four questions all day."
  build: {
    n: 2,
    title: "The same four questions",
    prompt:
      "Inside a bright modern clothing boutique, the owner — an Indian woman in " +
      "her thirties — stands behind a pale wood counter with a phone to her ear, " +
      "mid-conversation, while a customer waits a little way behind her looking at " +
      "a rail. She glances toward the waiting customer, then back down. Large " +
      "windows, rails of clothes, a plant, one emerald cushion on a bench. The " +
      "camera pushes in very slowly. Pulled in two directions at once, not frantic.",
  },
  // Beat 3, over "We build the thing that answers them for you... orders
  // straight to WhatsApp."
  //
  // The first version of this shot handed a parcel from her hands to his, and
  // the parcel did not survive the journey: a floppy blob at 5.8s, a flat slab
  // at 6.4s, a thin disc at 7.0s, a sheet of paper by 7.6s. An object passing
  // between two pairs of hands is the hardest thing to ask of these models —
  // it has to stay the same object while both its supports change. So the
  // handoff is gone. She sets the box down, he lifts it; the box is only ever
  // held by one person at a time, and the prompt nails its shape down hard.
  after: {
    n: 3,
    title: "It runs itself",
    prompt:
      "A bright clean packing room. An Indian woman in her thirties places ONE " +
      "rigid brown corrugated cardboard shipping box, closed and taped, down " +
      "onto a pale wood bench beside three identical finished boxes, and takes " +
      "her hands away. A delivery rider then steps in from the right and lifts " +
      "that same box off the bench. Only one person touches the box at a time — " +
      "she has fully let go before he takes it, and there is no moment where " +
      "both are holding it. " +
      "THE BOX IS RIGID AND KEEPS ITS EXACT SHAPE, SIZE, PROPORTIONS AND COLOUR " +
      "for every frame: a firm cubic cardboard carton with square corners and " +
      "flat faces. It never becomes soft, floppy, flat, thin, a disc, a tray, a " +
      "sheet of paper or a bag, and it never changes size. " +
      "The courier is a young Indian man in plain ordinary clothes — a simple " +
      "dark polo shirt and trousers. NO helmet, NO crash helmet, NO large " +
      "insulated food-delivery backpack, NO bright blue or branded uniform, no " +
      "food-delivery livery of any kind. He is collecting a parcel, not " +
      "delivering a meal. What he wears stays identical throughout; nothing " +
      "appears or disappears. " +
      "She is working, not posing — she places her box, straightens the row and " +
      "turns back to the next one. " +
      "The room is the warm premium one from the rest of this film: generous " +
      "golden daylight through a large window, pale wood bench, off-white walls, " +
      "greenery, one small emerald-green glass vase on the bench. Warm and " +
      "inviting, never a cold white clinical warehouse, never flat bright " +
      "fluorescent light. " +
      "The camera pulls back slowly, opening the frame. Calm and ordered.",
  },
};


/* ------------------------------ UGC SHOT SET ------------------------------
   A different film entirely: phone-shot, handheld, daylight, no grade. Cut at
   about four seconds a shot rather than eight, because that is the rhythm the
   format runs at.

   No face here either, and that is not the no-faces house rule being applied
   blindly — it is the whole reason this is POV. A UGC ad is normally a person
   to camera saying "this worked for me", and a generated person saying that
   about Brand Mint is a fabricated testimonial. POV is the other native UGC
   grammar and it costs nothing in authenticity. */
const UGC_HOUSE =
  "Shot on a phone held in one hand: natural handheld micro-shake, vertical 9:16, " +
  "daylight from a window, no colour grade, slightly blown highlights, ordinary " +
  "amateur framing that is a little off-centre. It should look filmed by the person " +
  "it is happening to, not by a crew. " +
  "Absolutely no text, letters, numbers, words, signage, icons, notifications, " +
  "readable user interface, logos or watermarks anywhere in frame. No faces, no " +
  "people visible above the wrist — hands only.";

const UGC = {
  scroll: { n: 1, title: "The reply machine", prompt:
    "Handheld point-of-view looking down at a hand holding a phone. On the screen, a " +
    "long column of blank grey and pale-green message bubbles, no readable text in any " +
    "of them, and a thumb flicking upward fast so the column blurs. The other hand is " +
    "half in frame holding a pen. Cluttered counter underneath, daylight." },
  counter: { n: 2, title: "Juggling", prompt:
    "Handheld point-of-view over a small shop counter in daylight: stacked cardboard " +
    "cartons of stock, a roll of tape, a calculator, and a phone lying face-up with a " +
    "blank screen. A hand reaches in, picks the phone up, puts it down again, then " +
    "picks up the pen instead. Slightly rushed camera movement." },
  book: { n: 3, title: "The order book", prompt:
    "Handheld point-of-view straight down onto a paper order book on a counter, its " +
    "pages covered in dense illegible out-of-focus handwriting. A hand flips two pages " +
    "back and forth quickly looking for something, then taps the page with a pen. " +
    "Daylight, a little camera wobble." },
  store: { n: 4, title: "The store", prompt:
    "Handheld point-of-view of two hands holding a phone in daylight. The screen shows " +
    "a clean, simple shop layout: a grid of soft blank product tiles and one rounded " +
    "mint-green button near the bottom, all of it wordless with no readable text. A " +
    "thumb scrolls the grid slowly and steadily. Calm after the earlier rush." },
  pack: { n: 5, title: "Going out", prompt:
    "Handheld point-of-view down onto a counter as two hands pull a strip of tape from " +
    "a tape gun and press it across a brown paper parcel, then slide it onto a neat " +
    "stack of identical parcels. Quick, practised, unfussy. Daylight." },
  done: { n: 6, title: "Done", prompt:
    "Handheld point-of-view of a hand placing a phone face-up onto a clear counter " +
    "beside a stack of wrapped parcels, screen glowing a soft blank mint green with " +
    "nothing written on it, then the hand withdraws out of frame. The camera settles " +
    "and steadies for the first time. Daylight, calm." },
};

const AR = "9:16";
const SECONDS = 8;

const SET = process.argv.includes("--set")
  ? process.argv[process.argv.indexOf("--set") + 1]
  : "film";
const SHOTSETS = { film: { shots: SHOTS, house: HOUSE, prefix: "" },
                   ugc:  { shots: UGC,   house: UGC_HOUSE, prefix: "ugc-" } };
if (!SHOTSETS[SET]) { console.error(`Unknown --set "${SET}". Try: film, ugc`); process.exit(1); }
const ACTIVE = SHOTSETS[SET];

/** Veo answers 503 with an empty body under load, often enough that a single
 *  attempt is not a fair test of a prompt. Three tries with backoff; anything
 *  that is not a 5xx fails immediately, because a bad prompt or a bad key will
 *  not fix itself on the next attempt. */
/** POSTs go through curl, not fetch.
 *
 *  Node's fetch to :predictLongRunning fails every time from inside the Claude
 *  Code sandbox — the egress gateway answers
 *      503 text/plain  "upstream connect error or disconnect/reset before
 *                       headers ... reset reason: connection timeout"
 *  which is the proxy talking, not Google. curl with a byte-identical body
 *  succeeds every time. Polling and downloading are ordinary GETs and work on
 *  fetch, so only this one call is shelled out.
 *
 *  The body goes via a temp file rather than the command line: it is over a
 *  kilobyte of prose and would otherwise be visible in the process list and
 *  subject to shell quoting. */
async function curlPost(url, bodyObj) {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");

  const tmp = path.join(os.tmpdir(), `veo-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(tmp, JSON.stringify(bodyObj));
  try {
    const { stdout } = await promisify(execFile)(
      "curl",
      ["-sS", "--max-time", "120", "-X", "POST", url,
       "-H", "Content-Type: application/json",
       "--data-binary", `@${tmp}`,
       "-w", "\n%{http_code}"],
      { maxBuffer: 8 * 1024 * 1024 }
    );
    const nl = stdout.lastIndexOf("\n");
    const status = parseInt(stdout.slice(nl + 1).trim(), 10);
    let json = {};
    try { json = JSON.parse(stdout.slice(0, nl)); } catch {}
    return { status, json, raw: stdout.slice(0, nl) };
  } finally {
    try { fs.unlinkSync(tmp); } catch {}
  }
}

async function start(shot, attempt = 1) {
  const r = await curlPost(`${API}/models/${MODEL}:predictLongRunning?key=${KEY}`, {
      instances: [{ prompt: `${shot.prompt}\n\n${ACTIVE.house}` }],
      parameters: {
        aspectRatio: AR,
        durationSeconds: SECONDS,
        // No personGeneration here. The API rejects "allow_adult" outright —
        // 400 "allow_adult for personGeneration is currently not supported" —
        // and it was redundant anyway: the prompts ask for hands only and the
        // negative list below excludes faces.
        negativePrompt:
          "text, letters, numbers, words, captions, subtitles, signage, logos, " +
          "watermarks, user interface, app screens, notifications, faces, people, " +
          "portraits, cartoon, illustration, oversaturated colour, lens flare",
      },
  });
  if (r.status !== 200) {
    if (r.status >= 500 && attempt < 3) {
      const back = attempt * 20;
      console.log(`  ${r.status} from Veo — retrying in ${back}s`);
      await new Promise((s) => setTimeout(s, back * 1000));
      return start(shot, attempt + 1);
    }
    throw new Error(`${r.status} ${r.json?.error?.message || r.raw.slice(0, 300)}`);
  }
  if (!r.json?.name) throw new Error(`no operation name: ${r.raw.slice(0, 300)}`);
  return r.json.name;
}

/** Veo runs for minutes, not seconds. Poll rather than hold one long request. */
async function wait(op, label) {
  const deadline = Date.now() + 10 * 60 * 1000;
  let waited = 0;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 15000));
    waited += 15;
    const r = await curlGet(`${API}/${op}?key=${KEY}`);
    // The same gateway that breaks POST breaks these polls, so a 5xx here is
    // the proxy rather than a dead job — keep waiting instead of giving up on
    // a generation that is already running and already billed.
    if (r.status !== 200) {
      process.stdout.write(`\r  ${label}: gateway ${r.status}, still waiting… ${waited}s`);
      continue;
    }
    const j = r.json || {};
    if (j.error) throw new Error(`generation failed: ${j.error.message || JSON.stringify(j.error)}`);
    if (j.done) return j;
    process.stdout.write(`\r  ${label}: generating… ${waited}s`);
  }
  throw new Error("timed out after 10 minutes");
}

/** The response shape has moved between Veo revisions, so probe rather than
 *  index blindly — a silent undefined here looks like a network failure. */
function videoUri(done) {
  const r = done.response || {};
  const cand =
    r.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ||
    r.generatedSamples?.[0]?.video?.uri ||
    r.videos?.[0]?.uri ||
    r.predictions?.[0]?.video?.uri;
  if (cand) return cand;
  throw new Error(`no video uri in response: ${JSON.stringify(r).slice(0, 400)}`);
}

/** GET through curl, for the same gateway reason as curlPost. */
async function curlGet(url) {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const { stdout } = await promisify(execFile)(
    "curl",
    ["-sS", "--max-time", "90", url, "-w", "\n%{http_code}"],
    { maxBuffer: 16 * 1024 * 1024 }
  );
  const nl = stdout.lastIndexOf("\n");
  let json = null;
  try { json = JSON.parse(stdout.slice(0, nl)); } catch {}
  return { status: parseInt(stdout.slice(nl + 1).trim(), 10), json, raw: stdout.slice(0, nl) };
}

/** curl writes the mp4 straight to disk. Pulling megabytes of video through
 *  fetch and Buffer would work, but this also sidesteps the gateway's habit of
 *  resetting long Node connections. */
async function download(uri, out) {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const fs = await import("node:fs");
  const url = uri.includes("key=") ? uri : `${uri}${uri.includes("?") ? "&" : "?"}key=${KEY}`;

  const { stdout } = await promisify(execFile)(
    "curl",
    ["-sS", "-L", "--max-time", "600", "-o", out, url, "-w", "%{http_code}"],
    { maxBuffer: 1024 * 1024 }
  );
  const status = parseInt(stdout.trim(), 10);
  if (status !== 200) {
    const peek = fs.existsSync(out) ? fs.readFileSync(out, "utf8").slice(0, 200) : "";
    throw new Error(`download ${status} ${peek}`);
  }
  const size = fs.statSync(out).size;
  // An error page saved as .mp4 is the failure mode worth catching here.
  const head = fs.readFileSync(out).subarray(4, 8).toString("latin1");
  if (head !== "ftyp") throw new Error(`downloaded file is not an mp4 (starts "${head}")`);
  return Math.round(size / 1024);
}

async function make(id) {
  const shot = ACTIVE.shots[id];
  if (!shot) throw new Error(`Unknown shot "${id}" in set ${SET}`);
  const label = `${shot.n}/${Object.keys(ACTIVE.shots).length} ${id}`;
  const op = await start(shot);
  const done = await wait(op, label);
  const uri = videoUri(done);
  const fs = await import("node:fs");
  fs.mkdirSync("marketing/video/out", { recursive: true });
  const out = `marketing/video/out/${ACTIVE.prefix}${id}.mp4`;
  const kb = await download(uri, out);
  process.stdout.write("\r".padEnd(50) + "\r");
  console.log(`  ok  ${out}  ${kb} KB  ${SECONDS}s ${AR}  (${shot.title})`);
}

/** Attach to a generation that is already running and save its result.
 *
 *  A Veo call is billed the moment the operation is created, so an operation
 *  whose name you still have is already paid for — losing the name is what
 *  wastes the money, not the failure that followed. Used when a run dies after
 *  the job started.
 *
 *      node marketing/video/gen-veo.mjs --resume before=models/.../operations/xyz
 */
async function resume(spec) {
  const [id, ...rest] = spec.split("=");
  const op = rest.join("=");
  if (!SHOTS[id] || !op) throw new Error(`--resume takes <id>=<operation name>`);
  const done = await wait(op, `resume ${id}`);
  const uri = videoUri(done);
  const fs = await import("node:fs");
  fs.mkdirSync("marketing/video/out", { recursive: true });
  const out = `marketing/video/out/${id}.mp4`;
  const kb = await download(uri, out);
  process.stdout.write("\r".padEnd(50) + "\r");
  console.log(`  ok  ${out}  ${kb} KB  (resumed)`);
}

const argv = process.argv.slice(2);
const resumeArgs = argv.filter((a) => a.startsWith("--resume=")).map((a) => a.slice(9));
if (resumeArgs.length) {
  if (!KEY) { console.error("No GEMINI_API_KEY."); process.exit(1); }
  let bad = 0;
  for (const spec of resumeArgs) {
    try { await resume(spec); } catch (e) { console.error(`  FAIL  ${spec}: ${e.message}`); bad += 1; }
  }
  process.exit(bad ? 1 : 0);
}
if (argv.includes("--list") || (!argv.length && !argv.includes("--all"))) {
  console.log(`Model: ${MODEL}   ${SECONDS}s each, ${AR}\n`);
  for (const [id, s] of Object.entries(SHOTS)) console.log(`  ${s.n}. ${id.padEnd(7)} ${s.title}`);
  console.log(`\n  node marketing/video/gen-veo.mjs --all   |   <id> [<id>...]`);
  process.exit(0);
}
if (!KEY) {
  console.error("No GEMINI_API_KEY (or --key).");
  process.exit(1);
}

const _skip = new Set();
argv.forEach((a, i) => { if (a === "--set" || a === "--key") _skip.add(i + 1); });
const ids = argv.includes("--all")
  ? Object.keys(ACTIVE.shots)
  : argv.filter((a, i) => !a.startsWith("--") && !_skip.has(i));
let failed = 0;
for (const id of ids) {
  try {
    await make(id);
  } catch (e) {
    console.error(`  FAIL  ${id}: ${e.message}`);
    failed += 1;
  }
}
process.exit(failed ? 1 : 0);
