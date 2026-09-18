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

/* ONE ACTION PER SHOT, FOUR SECONDS EACH.
 *
 * This film was three eight-second takes and both of its continuity failures
 * came from that: a parcel that morphed through four different objects while
 * being handed over, and a phone that vanished from a woman's hand between
 * 9s and 11s. An eight-second take asks the model to hold every object, every
 * garment and every prop steady for eight seconds, and it will not.
 *
 * So six shots of four seconds, each containing exactly one action, cut
 * together. Two rules fall out of the failures:
 *
 *   - ONE ACTION. Not "she looks at her phone, then looks up, then walks on".
 *     One verb, for four seconds.
 *   - ANY OBJECT THAT MUST PERSIST is held continuously by one person for the
 *     whole shot, or is not in the shot at all. Nothing is picked up, put
 *     down, passed over or produced from off-screen mid-take.
 *
 * Veo takes 4, 6 or 8 seconds; 5 is rejected. 6 x 4 = 24s of footage, plus
 * the 6s end card, is the 30.00s reel.
 */
const SHOTS = {
  // Beat 1, over "Your customers are already looking for you. They find a
  // phone number, a WhatsApp, and nothing else."
  look: { n: 1, seconds: 4, title: "Looking for you",
    prompt:
      "A young Indian woman stands still on a clean modern Indian shopping " +
      "street at golden hour, reading something on the phone she is holding in " +
      "both hands. She holds the phone the entire time and never lowers it, " +
      "puts it away or changes her grip. Her only movement is a small shake of " +
      "the head. Well-designed shopfronts blurred behind her. Phone screen dark." },
  pass: { n: 2, seconds: 4, title: "And moves on",
    prompt:
      "A young Indian woman walks away from camera down a clean modern Indian " +
      "shopping street at golden hour, seen from behind, unhurried. She carries " +
      "nothing in her hands and holds nothing at any point. Shopfronts and a few " +
      "passers-by on either side. One continuous walk, no turning back." },

  // Beat 2, over "So you answer the same four questions all day."
  call: { n: 3, seconds: 4, title: "On the phone again",
    prompt:
      "An Indian woman in her thirties stands behind the pale wood counter of a " +
      "bright modern clothing boutique, talking on a phone she holds to her ear " +
      "with her right hand. The phone stays pressed to her ear for the entire " +
      "shot — it never leaves her hand, never disappears, never moves to the " +
      "other hand and is never put down. Her free hand rests on the counter and " +
      "stays there. Rails of clothes, a plant, one emerald cushion behind her." },
  wait: { n: 4, seconds: 4, title: "Someone is waiting",
    prompt:
      "Inside a bright modern clothing boutique, a customer stands at a rail of " +
      "clothes with her back half to camera, holding one garment on its hanger " +
      "out in front of her and looking at it, then glancing off toward the " +
      "counter. She holds the same single hanger throughout and picks up nothing " +
      "else. Nobody else is in frame. Warm daylight, pale wood, one emerald " +
      "cushion on a bench." },

  // Beat 3, over "We build the thing that answers them for you... orders
  // straight to WhatsApp."
  tape: { n: 5, seconds: 4, title: "Packed",
    prompt:
      "Close on a pale wood bench in a bright packing room: a woman's hands fold " +
      "the flaps of ONE rigid brown corrugated cardboard box closed and press a " +
      "strip of tape along the seam. Hands and forearms only, no face. The box " +
      "is firm and cubic with square corners and keeps its exact shape, size and " +
      "colour for every frame — it never becomes soft, flat, thin or a bag. Two " +
      "identical closed boxes sit beside it, unmoving. A small emerald vase at " +
      "the edge of frame. Warm daylight." },
  lift: { n: 6, seconds: 4, title: "And gone",
    prompt:
      "In a bright packing room a young Indian man in a plain dark polo shirt " +
      "lifts ONE rigid brown corrugated cardboard box off a pale wood bench with " +
      "both hands and turns away from camera carrying it. He is the only person " +
      "in frame and nobody hands him anything — the box is on the bench, then in " +
      "his hands. It is firm and cubic and keeps its exact shape and size " +
      "throughout. NO helmet, no insulated food-delivery backpack, no branded or " +
      "bright blue uniform. Warm golden daylight, pale wood, a small emerald " +
      "vase on the bench." },
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
const SECONDS = 8;                       // default; a shot may override it
/** Veo accepts 4, 6 or 8 — 5 is rejected as "out of bound". */
const secondsFor = (shot) => shot.seconds || SECONDS;

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
        durationSeconds: secondsFor(shot),
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
  console.log(`  ok  ${out}  ${kb} KB  ${secondsFor(shot)}s ${AR}  (${shot.title})`);
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
  console.log(`Model: ${MODEL}   ${AR}\n`);
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
