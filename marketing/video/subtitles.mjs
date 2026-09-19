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
  /* A "|" marks a pause the reader ACTUALLY TAKES, not every place a comma
     could go. This script had 17 markers and the read only pauses 10 times —
     its own direction says "run the sentences together the way people
     actually talk, and only pause where there is a full stop" — so the
     matcher had to spread 17 phrases over 9 detected segments and pushed the
     opening line from 0.0s to 4.5s. Marked to the read, not to the grammar.
     Long phrases still break into readable lines via --words/--chars. */
  story: `The shop opens at nine.|
    By quarter past, the same four questions have been asked four times.|
    Price.| Size.| Do you deliver.| Is it in stock.|
    A customer waits at the rail while the answers are typed.|
    Then she puts the dress back,| and leaves.|
    So one evening, the thing that keeps getting put off gets done.|
    Photographs.| Sizes.| Prices.| Written down once.|
    A store, on your own domain.| UPI,| cash on delivery,| GST invoices.|
    Orders arriving on WhatsApp,| already answered.|
    The shop still opens at nine.| The phone still lights up.|
    You are simply no longer the one who has to answer it.|
    Fixed price, in writing, before anyone starts.|
    Brand Mint.| Hyderabad.`,
  ugc: `Okay — if you run a shop in Hyderabad and you're still taking orders on WhatsApp,| watch this.|
    Same four questions. All day.| Price. Timing. Do you deliver.|
    You're not running a business. You're running a reply machine.|
    So — a proper store. Your own domain.|
    UPI, cash on delivery, GST invoice, automatic.|
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
  // A FILE THAT BEGINS WITH SPEECH LOSES ITS FIRST RUN WITHOUT THIS.
  // silencedetect only reports silences, so a read that starts talking
  // immediately emits its first mark as silence_start at t>0 — there is no
  // preceding silence_end to open a segment with, and the opening run was
  // dropped entirely, sliding every later phrase late by its length.
  // vo-alnilam-tight.wav happens to begin with 0.28s of silence, which is why
  // the brand film never showed this; the UGC read starts on the first frame
  // and lost its opening 4.2 seconds — the hook.
  // A leading silence still opens with silence_start at ~0, and that case
  // must stay null or the silence itself gets treated as speech.
  let speaking = marks.length && marks[0][0] === "start" && marks[0][1] > 0.05 ? 0 : null;
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

  // THE SEGMENTS ARE THE TRUTH; SYLLABLES ARE ONLY A FALLBACK.
  // This used to spend each phrase's syllable share of the TOTAL speaking
  // time against a single flattened clock, and never looked at where the
  // speech runs actually were. Syllable count is a decent predictor of how
  // long a phrase takes and a poor one: a held word, an emphasis, a breath
  // inside a clause all cost time the count does not know about, and because
  // the clock is cumulative every error pushes everything after it. Measured
  // on the UGC read, "automatic." was landing 3.6s from its onset.
  //
  // A silence between two phrases IS the boundary between them. When the
  // reader took exactly as many pauses as the script marks — which is what
  // the "|" markers are for — the mapping is one phrase per run and needs no
  // estimation at all.
  let bounds;
  if (phrases.length === segs.length) {
    bounds = segs.map(([s, e]) => [s, e]);
  } else if (phrases.length < segs.length) {
    // THE READER TOOK MORE PAUSES THAN THE SCRIPT MARKS — a breath inside a
    // clause, a beat for emphasis. Every phrase still starts and ends on a
    // run, but some phrases own SEVERAL consecutive runs, and which ones
    // cannot be guessed from a running total: fitting proportionally put
    // "UPI," on the 0.38s of silence before it and gave its actual run to
    // "cash on delivery,".
    //
    // So choose the grouping properly. Each phrase takes a contiguous block
    // of runs, blocks are in order and cover every run, and the split is the
    // one whose durations best match the phrases' syllable shares. Small
    // enough (15 x 17 here) that exact beats clever.
    const n = phrases.length, m = segs.length;
    const dsum = [0];
    for (const [s0, e0] of segs) dsum.push(dsum[dsum.length - 1] + (e0 - s0));
    const totalDur = dsum[m];
    const share = syl.map((v) => v / totalSyl);

    const INF = Infinity;
    const dp = Array.from({ length: n + 1 }, () => new Float64Array(m + 1).fill(INF));
    const back = Array.from({ length: n + 1 }, () => new Int32Array(m + 1).fill(-1));
    dp[0][0] = 0;
    for (let i = 1; i <= n; i++) {
      for (let j = i; j <= m - (n - i); j++) {          // leave >=1 run per remaining phrase
        for (let k = i - 1; k < j; k++) {
          if (dp[i - 1][k] === INF) continue;
          const cost = dp[i - 1][k] + Math.abs((dsum[j] - dsum[k]) / totalDur - share[i - 1]);
          if (cost < dp[i][j]) { dp[i][j] = cost; back[i][j] = k; }
        }
      }
    }
    const cut = new Array(n + 1);
    cut[n] = m;
    for (let i = n; i > 0; i--) cut[i - 1] = back[i][cut[i]];
    bounds = phrases.map((_, i) => [segs[cut[i]][0], segs[cut[i + 1] - 1][1]]);
  } else {
    // More phrases than runs: several ran together inside one breath. Split
    // each run between the phrases that share it, by syllable weight.
    const per = Math.ceil(phrases.length / segs.length);
    bounds = phrases.map((_, i) => {
      const seg = segs[Math.min(segs.length - 1, Math.floor(i / per))];
      const group = phrases.filter((_, k) => Math.floor(k / per) === Math.floor(i / per));
      const gSyl = group.map((g) => g.split(/\s+/).filter(Boolean)
        .reduce((x, w) => x + syllables(w), 0));
      const gTot = gSyl.reduce((x, y) => x + y, 0) || 1;
      const idx = i % per;
      const before = gSyl.slice(0, idx).reduce((x, y) => x + y, 0);
      const span = seg[1] - seg[0];
      return [seg[0] + span * (before / gTot),
              seg[0] + span * ((before + gSyl[idx]) / gTot)];
    });
  }

  return phrases.map((text, i) => {
    const [start, end] = bounds[i];
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
    // Dropping only what STARTS after the handover is not enough: a chunk
    // beginning at 22.98 and running to 24.78 sits on the end card for nearly
    // a second, across the WhatsApp number. Clamp the end instead, so the
    // subtitle simply stops at the cut. The karaoke sweep freezes mid-phrase,
    // which nobody sees — the frame changes underneath it at the same moment.
    if (until && ln.end > until) ln.end = until;
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
