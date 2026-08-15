import { chromium } from '/home/user/Brand-Mint-Hyderabad/agency-os/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs';

const FPS = 30, DUR = 41.48;
const N = Math.round(DUR * FPS);
const B_ROLL = { 5: 0.10, 7: 3.40 };

const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--disable-gpu','--force-device-scale-factor=1'] });
const p = await b.newPage({ viewport:{ width:1080, height:1920 } });
p.on('pageerror', e => console.log('PAGEERROR', String(e)));
await p.goto('file://process.env.TEMPLATE || "template/reel.html"?render=1');
await p.waitForFunction(() => typeof window.__seek === 'function');
await p.waitForTimeout(400);

const meta = await p.evaluate(() => window.__meta);
const phrases = meta.phrases;
const log = [];

for (let i = 0; i < N; i++) {
  const t = i / FPS;
  // Which scene is on screen decides whether a footage frame is composited.
  let scene = 0;
  for (let k = phrases.length - 1; k >= 1; k--) {
    if (t >= phrases[k][0]) { scene = k; break; }
  }
  let frameSrc = "";
  if (scene in B_ROLL) {
    const into = B_ROLL[scene] + (t - phrases[scene][0]);
    const idx = Math.min(300, Math.max(1, Math.round(into * 30) + 1));
    frameSrc = `file:///tmp/ugc/bframes/f_${String(idx).padStart(4,'0')}.jpg`;
  }
  const state = await p.evaluate(([tt, src]) => window.__seek(tt, src), [t, frameSrc]);
  await p.screenshot({ path: `process.env.OUT + "/frames/"${String(i).padStart(5,'0')}.png` });
  if (i % 60 === 0) console.log(`frame ${i}/${N} t=${t.toFixed(2)} scene=${state.scene} active=${JSON.stringify(state.active)}`);
  log.push({ i, t:+t.toFixed(3), scene: state.scene, caption: state.caption, active: state.active });
}
fs.writeFileSync('process.env.OUT + "/render-log.json"', JSON.stringify(log));
console.log('rendered', N, 'frames');
await b.close();
