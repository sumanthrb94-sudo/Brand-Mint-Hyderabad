// MasterCut Pro — render back/front caption layers from caption-template.html
// Usage: node render-caps.cjs   (run from the working dir; outputs to ./cap_back and ./cap_front)
const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');
const FPS = 24, N = 240;                       // adjust N to your frame count
const TEMPLATE = path.resolve(__dirname, 'caption-template.html');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  for (const layer of ['back', 'front']) {
    const p = await b.newPage({ viewport: { width: 720, height: 1280 }, deviceScaleFactor: 1 });
    await p.goto(pathToFileURL(TEMPLATE).href + '?l=' + layer, { waitUntil: 'networkidle' });
    await p.evaluate(async (l) => { document.body.dataset.layer = l; await document.fonts.ready; }, layer);
    for (let i = 1; i <= N; i++) {
      await p.evaluate(tt => window.setFrame(tt), (i - 1) / FPS);
      await p.screenshot({ path: './cap_' + layer + '/c_' + String(i).padStart(4, '0') + '.png', omitBackground: true });
    }
    await p.close(); console.log('rendered ' + layer);
  }
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
