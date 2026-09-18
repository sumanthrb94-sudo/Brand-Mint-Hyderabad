#!/usr/bin/env node
/**
 * Generate the reel voiceover with Gemini TTS.
 *
 *   export GEMINI_API_KEY=...
 *   node marketing/video/gen-vo.mjs            # every voice in VOICES
 *   node marketing/video/gen-vo.mjs sulafat    # just one
 *
 * Writes marketing/video/out/vo-<voice>.wav.
 *
 * WHY NOT ELEVENLABS. BRAND-FILM.md establishes Raj (FwuKjlVpi0N3exead7ji,
 * eleven_multilingual_v2) as the studio voice and the earlier films use it.
 * That is still the right voice — this is a fallback, not a replacement. The
 * account is out of credits: the line below costs 409 and there are 150 left.
 * Top the account up and regenerate with Raj for anything that has to sit
 * beside the existing films.
 *
 * THE SCRIPT. Every claim here is on the live site. No price is spoken: the
 * numbers change, a reel does not, and a stale ₹ figure in a paid ad is the
 * kind of mistake that has to be taken down rather than edited. "Fixed price,
 * in writing" carries the idea without dating the file.
 */

const KEY =
  process.env.GEMINI_API_KEY ||
  (process.argv.includes("--key") ? process.argv[process.argv.indexOf("--key") + 1] : "");

const MODEL = process.env.GEMINI_TTS_MODEL || "gemini-3.1-flash-tts-preview";
const API = "https://generativelanguage.googleapis.com/v1beta";

/** Direction and script in one string — Gemini TTS takes its performance notes
 *  inline rather than as parameters. The em dashes and full stops are doing
 *  real work: they are where the read breathes, and the cut depends on those
 *  pauses landing near the clip boundaries at 8s, 16s and 24s. */
/* LENGTH IS MEASURED, NOT ESTIMATED. The first draft ran 78 words and came
   back at 34.7s — the model paces around 2.2 words per second whatever the
   brief says about duration, so asking for "about twenty-six seconds" does
   nothing on its own. 57 words is what fits. Speeding a long read up with
   atempo was the alternative and it is audible on a voice this exposed. */
const SCRIPTS = {};

/* UGC register. A different job from the brand film: this one is a person
   talking to their own phone, not a narrator. Faster (UGC reads land nearer
   2.6 words a second), first person, contractions, and it opens mid-thought
   because a UGC ad that opens politely gets scrolled past. */
SCRIPTS.ugc = `Read this as a real person talking straight into their phone camera — Indian \
English, casual, quick, slightly amused. Not an announcer. Run the sentences together the way \
people actually talk, and only pause where there is a full stop. Energetic but not shouty.

Okay — if you run a shop in Hyderabad and you're still taking orders on WhatsApp, watch this.

Same four questions. All day. Price. Timing. Do you deliver.

You're not running a business. You're running a reply machine.

So — a proper store. Your own domain. UPI, cash on delivery, GST invoice, automatic.

Fixed price, in writing, before anyone starts.

Brand Mint. Hyderabad.`;

SCRIPTS.brand = `Speak as a male Indian English voiceover artist in his early forties from \
Hyderabad. Telugu is his mother tongue and he was schooled in English medium, so his English \
is fluent, neutral and precise — the register of a university lecturer or a national news \
anchor. This is NOT a performed, thick or comic accent, and never a caricature: the accent is \
simply his, and nothing about the read draws attention to it. Consonants are crisp but not \
exaggerated. Intonation is level — every sentence lands flat and finished, never rising at the \
end, never sing-song. Mid-to-low resonant register. Unhurried: take a real pause at every full \
stop and a longer one at each paragraph break. Warm, but the warmth comes from the pace, not \
from smiling into the microphone. He is stating facts, not selling.

Your customers are already looking for you. They find a phone number, a WhatsApp, and nothing else.

So you answer the same four questions all day.

We build the thing that answers them for you. An online store, on your own domain. UPI, cash on \
delivery, GST invoices, orders straight to WhatsApp.

Fixed price, in writing, before anyone starts.

Brand Mint. Hyderabad.`;

const WHICH = process.argv.includes("--script")
  ? process.argv[process.argv.indexOf("--script") + 1]
  : "brand";
const SCRIPT = SCRIPTS[WHICH];
if (!SCRIPT) { console.error(`Unknown --script "${WHICH}". Try: ${Object.keys(SCRIPTS).join(", ")}`); process.exit(1); }

/** Candidates for the permanent brand voice, per marketing/video/BRAND-VOICE.md.
 *  The brief is an EDUCATED Indian English, not a performed one — "a
 *  professional Indian, English professor kind of", from a Telugu state — so
 *  these are the mature, even, low-register voices rather than the warm or
 *  lively ones. Sulafat and Charon were auditioned and rejected as generic;
 *  they stay listed so the same two are not tried again by accident. */
const VOICES = {
  gacrux: "Gacrux",               // mature       — brand film candidate
  rasalgethi: "Rasalgethi",       // informative  — brand film candidate
  iapetus: "Iapetus",             // clear        — brand film candidate
  alnilam: "Alnilam",             // firm         — brand film candidate
  sadaltager: "Sadaltager",       // knowledgeable— brand film candidate
  schedar: "Schedar",             // even         — brand film candidate
  orus: "Orus",                   // firm         — brand film candidate
  sulafat: "Sulafat",             // warm         — REJECTED, generic
  charon: "Charon",               // measured     — REJECTED, generic
  puck: "Puck",                   // upbeat       — UGC
  zubenelgenubi: "Zubenelgenubi", // casual       — UGC
  sadachbia: "Sadachbia",         // lively       — UGC
};

/** Gemini TTS returns headerless signed 16-bit little-endian PCM. Written
 *  straight to disk it is a file no player will open, so it needs a 44-byte
 *  RIFF header. Sample rate comes from the response mime type
 *  ("audio/L16;codec=pcm;rate=24000") rather than being assumed. */
function wav(pcm, rate) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16); // PCM chunk size
  h.writeUInt16LE(1, 20); // format = PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); // byte rate = rate * channels * 2
  h.writeUInt16LE(2, 32); // block align
  h.writeUInt16LE(16, 34); // bits per sample
  h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

async function speak(id) {
  const voiceName = VOICES[id];
  if (!voiceName) throw new Error(`Unknown voice "${id}". Try: ${Object.keys(VOICES).join(", ")}`);

  // curl, not fetch. Node's fetch cannot hold this connection open through the
  // Claude Code sandbox's egress gateway — it answers 503 text/plain "upstream
  // connect error ... connection timeout" every time, while curl with the same
  // body succeeds every time. Identical problem to marketing/video/gen-veo.mjs.
  // The response carries base64 audio, so the read buffer has to be generous.
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const fsSync = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");

  const tmp = path.join(os.tmpdir(), `vo-${id}-${Date.now()}.json`);
  fsSync.writeFileSync(
    tmp,
    JSON.stringify({
      contents: [{ parts: [{ text: SCRIPT }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    })
  );

  let stdout;
  try {
    ({ stdout } = await promisify(execFile)(
      "curl",
      ["-sS", "--max-time", "300", "-X", "POST",
       `${API}/models/${MODEL}:generateContent?key=${KEY}`,
       "-H", "Content-Type: application/json",
       "--data-binary", `@${tmp}`,
       "-w", "\n%{http_code}"],
      { maxBuffer: 256 * 1024 * 1024 }
    ));
  } finally {
    try { fsSync.unlinkSync(tmp); } catch {}
  }

  const nl = stdout.lastIndexOf("\n");
  const status = parseInt(stdout.slice(nl + 1).trim(), 10);
  let j = {};
  try { j = JSON.parse(stdout.slice(0, nl)); } catch {}
  if (status !== 200) {
    throw new Error(`${status} ${j?.error?.message || stdout.slice(0, 300)}`);
  }

  const part = (j?.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData?.data);
  if (!part) {
    const why = j?.candidates?.[0]?.finishReason || "no inlineData";
    throw new Error(`no audio returned (${why})`);
  }

  const rate = parseInt(/rate=(\d+)/.exec(part.inlineData.mimeType || "")?.[1] || "24000", 10);
  const pcm = Buffer.from(part.inlineData.data, "base64");
  const fs = await import("node:fs");
  fs.mkdirSync("marketing/video/out", { recursive: true });
  const out = `marketing/video/out/vo-${WHICH}-${id}.wav`;
  fs.writeFileSync(out, wav(pcm, rate));
  const secs = (pcm.length / 2 / rate).toFixed(1);
  console.log(`  ok  ${out}  ${secs}s  ${rate} Hz mono  (${voiceName})`);
  return out;
}

// --script and --key both take a value, so drop the word after each of them
// or it gets read as a voice id.
const _argv = process.argv.slice(2);
const _skip = new Set();
_argv.forEach((a, i) => { if (a === "--script" || a === "--key") _skip.add(i + 1); });
const ids = _argv.filter((a, i) => !a.startsWith("--") && !_skip.has(i));
if (!KEY) {
  console.error("No GEMINI_API_KEY (or --key).");
  process.exit(1);
}
let failed = 0;
for (const id of ids.length ? ids : Object.keys(VOICES)) {
  try {
    await speak(id);
  } catch (e) {
    console.error(`  FAIL  ${id}: ${e.message}`);
    failed += 1;
  }
}
process.exit(failed ? 1 : 0);
