#!/usr/bin/env node
/**
 * Burned-in karaoke subtitles for the Reels cuts.
 *
 *   node marketing/video/subtitles.mjs --audio out/vo-charon.wav \
 *        --script brand --out out/brand.ass
 *
 * Karaoke captions — each word changing colour as it is spoken — are the
 * dominant short-form subtitle style in 2026, and they beat static subtitles
 * on completion and share rate. The mechanism is simple: most Reels autoplay
 * silently, and a moving highlight gives the eye something to track instead of
 * reading ahead and waiting for the audio.
 *
 * TIMING WITHOUT A TRANSCRIPTION API
 * The voiceover is scripted, so the words are already known — only the clock
 * is missing. ffmpeg's silencedetect gives the pauses, which for a read with
 * "a real pause at every full stop" are the phrase boundaries. Phrases are
 * then matched to those segments by expected duration, and each word inside a
 * phrase gets a share of it weighted by syllable count. No speech-to-text, no
 * API, nothing to go down mid-edit.
 *
 * SAFE ZONE
 * Meta consolidated Stories and Reels onto one 9:16 safe zone in March 2026:
 * 14% off the top, 6% each side and up to 35% off the bottom. On 1080x1920
 * that puts the floor at y=1248, so the subtitle block sits above it — low
 * enough to be in the lower-middle third where the eye expects it, high enough
 * that the caption, the like button and the audio credit never land on it.
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : d;
};
const FFMPEG = execFileSync("python3",
  ["-c", "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"]).toString().trim();

/* ------------------------------------------------------------------ scripts
   Spoken text only. The direction that opens each prompt in gen-vo.mjs ("read
   this as a calm, warm Indian English voiceover...") is an instruction to the
   model, never spoken, and must not appear on screen. A "|" marks a phrase
   break the reader will actually take — a comma in a list is a pause, a comma
   inside a clause usually is not. */
const SCRIPTS = {
  brand: `Your customers are already looking for you.|
    They find a phone number,| a WhatsApp,| and nothing else.|
    So you answer the same four questions all day.|
    We build the thing that answers them for you.|
    An online store,| on your own domain.|
    UPI,| cash on delivery,| GST invoices,| orders straight to WhatsApp.|
    Fixed price, in writing, before anyone starts.|
    Brand Mint.| Hyderabad.`,
  ugc: `Okay — if you run a shop in Hyderabad| and you're still taking orders on WhatsApp,| watch this.|
    Same four questions.| All day.| Price.| Timing.| Do you deliver.|
    You're not running a business.| You're running a reply machine.|
    So — a proper store.| Your own domain.| UPI, cash on delivery, GST invoice,| automatic.|
    Fixed price, in writing, before anyone starts.|
    Brand Mint.| Hyderabad.`,
};

/** Rough syllable count. Vowel groups, minus a silent trailing e, floor of 1.
 *  It only has to be RELATIVELY right — it distributes a known phrase duration
 *  between words, so a consistent bias cancels out. */
const syllables = (w) => {
  const s = w.toLowerCase().replace(/[^a-z]/g, "");
  if (!s) return 1;
  const g = s.replace(/e$/, "").match(/[aeiouy]+/g);
  return Math.max(1, g ? g.length : 1);
};

/** Speech segments in a file: the gaps between detected silences. */
function segments(audio) {
  // ffmpeg reports silencedetect on stderr, and execFileSync hands back
  // stdout — which is empty here and was landing as null.
  const r = spawnSync(FFMPEG,
    ["-hide_banner", "-i", audio, "-af",
     `silencedetect=noise=${arg("noise", "-38")}dB:d=${arg("gap", "0.25")}`, "-f", "null", "-"],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  const out = `${r.stderr || ""}${r.stdout || ""}`;
  if (!out.includes("silence_") && !out.includes("Duration"))
    throw new Error(`ffmpeg produced no analysis for ${audio}:\n${out.slice(0, 400)}`);
  const marks = [...out.matchAll(/silence_(start|end): ([0-9.]+)/g)].map((m) => [m[1], +m[2]]);
  const dur = +(/Duration: (\d+):(\d+):([0-9.]+)/.exec(out) || [])
    .slice(1).reduce((a, v, i) => a + +v * [3600, 60, 1][i], 0);

  const segs = [];
  let speaking = marks.length && marks[0][0] === "end" ? 0 : null;
  for (const [kind, t] of marks) {
    if (kind === "start" && speaking !== null) { segs.push([speaking, t]); speaking = null; }
    else if (kind === "end") speaking = t;
  }
  if (speaking !== null && dur > speaking) segs.push([speaking, dur]);
  return segs.filter(([a, b]) => b - a > 0.12);
}

/** Assign phrases to segments so total syllables land proportionally. A
 *  segment can hold several phrases (the reader ran them together) and a
 *  phrase can span segments (they drew breath mid-clause), so this is a
 *  monotonic alignment rather than a zip. */
function align(phrases, segs) {
  const syl = phrases.map((p) => p.split(/\s+/).filter(Boolean).reduce((a, w) => a + syllables(w), 0));
  const totalSyl = syl.reduce((a, b) => a + b, 0);
  const spoken = segs.reduce((a, [s, e]) => a + (e - s), 0);

  // Walk a single clock through the segments, spending each phrase's share of
  // the total speaking time. Silence between segments is skipped rather than
  // counted, which is what keeps a long pause from dragging a caption with it.
  const flat = [];
  for (const [s, e] of segs) for (let t = s; t < e; t += 0.001) flat.push(t);
  const at = (frac) => flat[Math.min(flat.length - 1, Math.round(frac * (flat.length - 1)))];

  let acc = 0;
  return phrases.map((text, i) => {
    const start = at(acc / totalSyl);
    acc += syl[i];
    const end = at(acc / totalSyl);
    const words = text.split(/\s+/).filter(Boolean);
    const wSyl = words.map(syllables);
    const wTot = wSyl.reduce((a, b) => a + b, 0);
    let t = start;
    const timed = words.map((w, j) => {
      const d = (end - start) * (wSyl[j] / wTot);
      const item = { w, start: t, dur: d };
      t += d;
      return item;
    });
    return { text, start, end, words: timed, spoken };
  });
}

/* --------------------------------------------------------------------- ASS
   Colours are &HBBGGRR, not RGB. PrimaryColour is the word once it has been
   "sung" and SecondaryColour is the word before — so cream before, emerald
   after, and the highlight sweeps left to right with the voice.
   MarginV is measured from the bottom: 1920 - 1248 (the 35% UI floor) leaves
   672, and a little more lifts the block clear of it. */
const W = 1080, H = 1920;
const header = (font) => `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Karaoke,${font},86,&H0097C800,&H00EAF1F5,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,7,4,2,90,90,700,1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
`;

const cs = (t) => {
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60);
  const s = (t % 60).toFixed(2).padStart(5, "0");
  return `${h}:${String(m).padStart(2, "0")}:${s}`;
};

/** Break a phrase into screenfuls. The 2026 house style is word-by-word or a
 *  SHORT phrase — three or four words — not a whole sentence shrunk to fit.
 *  A sentence on screen invites reading ahead of the audio, which is the exact
 *  habit the moving highlight exists to prevent. */
function chunk(words, maxWords, maxChars) {
  const out = [];
  let cur = [];
  const len = (a) => a.reduce((n, x) => n + x.w.length + 1, -1);
  for (const w of words) {
    if (cur.length && (cur.length >= maxWords || len([...cur, w]) > maxChars)) {
      out.push(cur); cur = [];
    }
    cur.push(w);
  }
  if (cur.length) out.push(cur);
  return out;
}

function ass(lines, font, maxWords, maxChars, until) {
  let out = header(font);
  for (const phrase of lines)
  for (const ln of chunk(phrase.words, maxWords, maxChars).map((ws) => ({
        words: ws, start: ws[0].start, end: ws.at(-1).start + ws.at(-1).dur }))) {
    // The reel hands over to a static end card at 24s, and that card already
    // carries the wordmark, the domain and the number. Subtitling the "Brand
    // Mint. Hyderabad." the voiceover says over it prints the name twice, on
    // top of itself. Anything starting after the handover is dropped.
    if (until && ln.start >= until) continue;
    // \k takes centiseconds. Rounding each word independently drifts the line
    // out of step with the audio, so the remainder is carried forward.
    let carried = 0;
    const body = ln.words.map(({ w, dur }) => {
      const exact = dur * 100 + carried;
      const k = Math.max(1, Math.round(exact));
      carried = exact - k;
      return `{\\k${k}}${w.toUpperCase()} `;
    }).join("").trimEnd();
    out += `Dialogue: 0,${cs(ln.start)},${cs(ln.end)},Karaoke,,0,0,0,,${body}\n`;
  }
  return out;
}

/* -------------------------------------------------------------------- main */
const audio = path.resolve(ROOT, "marketing/video", arg("audio", "out/vo-charon.wav"));
const which = arg("script", "brand");
const outFile = path.resolve(ROOT, "marketing/video", arg("out", `out/${which}.ass`));
const font = arg("font", "Plus Jakarta Sans");

if (!SCRIPTS[which]) { console.error(`Unknown script "${which}". Try: ${Object.keys(SCRIPTS).join(", ")}`); process.exit(1); }
if (!fs.existsSync(audio)) { console.error(`No audio at ${audio}`); process.exit(1); }

const phrases = SCRIPTS[which].split("|").map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
const segs = segments(audio);
const lines = align(phrases, segs);

fs.writeFileSync(outFile, ass(lines, font, +arg("words", 3), +arg("chars", 22), +arg("until", 0)));
console.log(`  ${phrases.length} phrases over ${segs.length} speech segments, ${lines[0].spoken.toFixed(1)}s of speech`);
for (const l of lines) console.log(`  ${l.start.toFixed(2).padStart(6)} → ${l.end.toFixed(2).padStart(6)}  ${l.text}`);
console.log(`\n  wrote ${path.relative(ROOT, outFile)}`);

// --burn does the ffmpeg pass too, so writing the .ass and burning it can
// never drift apart. fontsdir is required: the brand faces are not installed
// system-wide, and libass silently falls back to DejaVu without it.
const burn = arg("burn", "");
if (burn) {
  const vid = path.resolve(ROOT, "marketing/video", burn);
  const dst = vid.replace(/\.mp4$/, "-subs.mp4");
  const fonts = path.resolve(ROOT, "marketing/video/fonts");
  const r = spawnSync(FFMPEG, [
    "-hide_banner", "-loglevel", "error", "-y", "-i", vid,
    "-vf", `subtitles=${outFile}:fontsdir=${fonts}`,
    "-c:v", "libx264", "-preset", "medium", "-crf", "20",
    "-pix_fmt", "yuv420p", "-c:a", "copy", dst,
  ], { encoding: "utf8" });
  if (r.status !== 0) { console.error(r.stderr?.slice(0, 600)); process.exit(1); }
  const mb = (fs.statSync(dst).size / 1048576).toFixed(1);
  console.log(`  burned ${path.relative(ROOT, dst)}  ${mb} MB`);
}
