/**
 * Render the film to a PNG sequence.
 *
 *   node scripts/render.mjs out/
 *
 * Reads out/words.json, out/scenes.json and out/meta.json, builds the page from
 * template/reel.html, then drives it through window.__seek(t) one frame at a
 * time at 30 fps. Deterministic — the same inputs always produce the same
 * frames, which is what lets verify.py compare the MP4 against them.
 *
 * Footage is composited as JPEG frames, never as a <video> element: containerised
 * Chromium generally cannot decode H.264, and a silently black clip is worse
 * than a build failure.
 *
 * env:
 *   TEMPLATE      path to reel.html          (default: ../template/reel.html)
 *   MOTION        path to motion UMD bundle  (optional; inlined if present)
 *   CHROMIUM_PATH chromium executable        (default: playwright's own)
 *   FPS           frames per second          (default: 30)
 *   SCENES        re-render only these scenes, e.g. "5" or "5,9" — the rest of
 *                 the frames and their log entries are kept. Rendering is
 *                 deterministic, so untouched frames are already correct and
 *                 re-shooting them is pure cost. Only valid when a full render
 *                 already exists.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Playwright may be installed next to the skill, in the host project, or
// globally. Try each rather than assuming a layout.
let chromium;
for (const id of ['playwright', '@playwright/test', 'playwright-core']) {
  try { ({ chromium } = require(id)); break; } catch { /* keep looking */ }
}
if (!chromium) {
  console.error('playwright not found — run scripts/setup.sh');
  process.exit(1);
}

const OUT = path.resolve(process.argv[2] || 'out');
const FPS = Number(process.env.FPS || 30);
const TEMPLATE = process.env.TEMPLATE || path.join(HERE, '..', 'template', 'reel.html');

const read = (p) => JSON.parse(fs.readFileSync(path.join(OUT, p), 'utf8'));
const words = read('words.json');
const spec = read('scenes.json');
const meta = read('meta.json');

// The film runs to the end of the read, plus whatever the outro claims.
const last = spec.scenes[spec.scenes.length - 1];
const duration = spec.duration
  ?? Math.max(meta.duration, last.at != null ? last.at + (last.hold ?? 2.4) : 0);
const N = Math.round(duration * FPS);

let motion = '';
const motionPath = process.env.MOTION || path.join(HERE, '..', 'node_modules', 'motion', 'dist', 'motion.js');
if (fs.existsSync(motionPath)) motion = fs.readFileSync(motionPath, 'utf8');

const audioSrc = fs.existsSync(path.join(OUT, 'vo.wav')) ? 'file://' + path.join(OUT, 'vo.wav') : '';
const html = fs.readFileSync(TEMPLATE, 'utf8')
  .replace('/*__MOTION__*/', () => motion)
  .replace('__WORDS_JSON__', () => JSON.stringify(words))
  .replace('__SCENES_JSON__', () => JSON.stringify(spec))
  .replace('__DURATION__', () => String(duration))
  .replace('__AUDIO_SRC__', () => audioSrc)
  .replace('__VIDEO_SRC__', () => '');

const pagePath = path.join(OUT, 'reel.html');
fs.writeFileSync(pagePath, html);
fs.mkdirSync(path.join(OUT, 'frames'), { recursive: true });

// Which scenes carry footage, and how far into each clip they start.
const bRoll = {};
spec.scenes.forEach((s, i) => {
  const clip = s.clip || s.bg;          // `bg` runs footage behind the scene's content
  if (clip) bRoll[i] = { start: s.clipStart || 0, dir: path.join(OUT, 'clip' + clip) };
});
const clipFrames = {};
for (const [i, v] of Object.entries(bRoll)) {
  clipFrames[i] = fs.existsSync(v.dir)
    ? fs.readdirSync(v.dir).filter(f => f.endsWith('.jpg')).sort()
    : [];
  if (!clipFrames[i].length) console.warn(`scene ${i}: no frames in ${v.dir} — rendering without footage`);
}

const launchOpts = { args: ['--no-sandbox', '--disable-gpu', '--force-device-scale-factor=1'] };
if (process.env.CHROMIUM_PATH) launchOpts.executablePath = process.env.CHROMIUM_PATH;
const browser = await chromium.launch(launchOpts);
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', e => { console.error('PAGEERROR', String(e)); process.exitCode = 1; });

await page.goto('file://' + pagePath + '?render=1');
await page.waitForFunction(() => typeof window.__seek === 'function');
await page.waitForTimeout(300);

const phrases = (await page.evaluate(() => window.__meta)).phrases;
const sceneAt = (t) => { for (let k = phrases.length - 1; k >= 1; k--) if (t >= phrases[k][0]) return k; return 0; };

// Re-rendering a single scene: keep the existing log and replace only the
// frames that scene owns.
const only = process.env.SCENES
  ? new Set(process.env.SCENES.split(',').map(s => Number(s.trim())))
  : null;
let log = [];
if (only) {
  const prev = path.join(OUT, 'render-log.json');
  if (!fs.existsSync(prev)) {
    console.error('SCENES= needs a completed full render to update; none found');
    process.exit(1);
  }
  log = JSON.parse(fs.readFileSync(prev, 'utf8'));
  console.log(`updating scenes ${[...only].join(', ')} only`);
}

let shot = 0;
for (let i = 0; i < N; i++) {
  const t = i / FPS;
  const scene = sceneAt(t);
  if (only && !only.has(scene)) continue;
  let frameSrc = '';
  if (bRoll[scene] && clipFrames[scene]?.length) {
    const into = bRoll[scene].start + (t - phrases[scene][0]);
    const idx = Math.min(clipFrames[scene].length - 1, Math.max(0, Math.round(into * FPS)));
    frameSrc = 'file://' + path.join(bRoll[scene].dir, clipFrames[scene][idx]);
  }
  const state = await page.evaluate(([tt, src]) => window.__seek(tt, src), [t, frameSrc]);
  await page.screenshot({ path: path.join(OUT, 'frames', String(i).padStart(5, '0') + '.png') });
  shot++;
  if (shot % 60 === 1) {
    console.log(`frame ${i}/${N}  t=${t.toFixed(2)}  scene=${state.scene}  ${JSON.stringify(state.active)}`);
  }
  const entry = { i, t: +t.toFixed(3), scene: state.scene, caption: state.caption, active: state.active };
  if (only) log[i] = entry; else log.push(entry);
}

if (log.length !== N || log.some(r => !r)) {
  console.error(`render log has ${log.filter(Boolean).length} of ${N} frames — refusing to write a partial log`);
  process.exit(1);
}
fs.writeFileSync(path.join(OUT, 'render-log.json'), JSON.stringify(log));
console.log(`shot ${shot} frames of ${N} over ${duration.toFixed(2)}s`);
await browser.close();
