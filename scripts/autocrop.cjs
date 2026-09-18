/**
 * Trim the flat border Gemini draws around a generated image.
 *
 *   NODE_PATH=$(npm root -g) node scripts/autocrop.cjs images/ppl-*.png
 *
 * Whatever the prompt says about full bleed, the image models keep returning
 * a picture matted inside a uniform frame — sometimes a hairline, sometimes
 * white bars taking 13% of the width. carousel.html used to hide a hairline
 * with transform:scale(1.05), but that is a guess, it crops the picture even
 * when there is no border to remove, and it cannot save an image that arrives
 * properly letterboxed.
 *
 * This measures instead. It reads the corner colour, walks in from each edge
 * while the row or column is still essentially that flat colour, and rewrites
 * the file cropped to what is left. An image with no border comes out
 * untouched, so it is safe to run over a whole folder.
 *
 * Chromium because there is no sharp, no PIL and no ImageMagick here, and no
 * package.json to add one to. A canvas decodes and re-encodes PNG perfectly
 * well.
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!files.length) {
  console.error("usage: node scripts/autocrop.cjs <file.png> [...]");
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let trimmed = 0;

  for (const file of files) {
    if (!fs.existsSync(file)) { console.log(`  skip  ${file} (missing)`); continue; }
    const b64 = fs.readFileSync(file).toString("base64");

    const out = await page.evaluate(async (dataUrl) => {
      const img = new Image();
      img.src = dataUrl;
      await img.decode();
      const W = img.naturalWidth, H = img.naturalHeight;
      const c = document.createElement("canvas");
      c.width = W; c.height = H;
      const cx = c.getContext("2d", { willReadFrequently: true });
      cx.drawImage(img, 0, 0);
      const d = cx.getImageData(0, 0, W, H).data;
      const at = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i+1], d[i+2]]; };

      // The border colour is whatever all four corners agree on. If they do
      // not agree, the picture already reaches the edge and there is nothing
      // to trim.
      const corners = [at(0,0), at(W-1,0), at(0,H-1), at(W-1,H-1)];
      const near = (a, b, t) => Math.abs(a[0]-b[0]) <= t && Math.abs(a[1]-b[1]) <= t && Math.abs(a[2]-b[2]) <= t;
      if (!corners.every((p) => near(p, corners[0], 10))) return null;
      const bg = corners[0];

      // A line still counts as border while almost all of it matches bg. The
      // 2% allowance is for the compression noise along the matte's inner
      // edge, which would otherwise stop the walk one pixel in.
      const TOL = 14, ALLOW = 0.02;
      const rowIsBorder = (y) => {
        let off = 0;
        for (let x = 0; x < W; x++) if (!near(at(x, y), bg, TOL) && ++off > W * ALLOW) return false;
        return true;
      };
      const colIsBorder = (x) => {
        let off = 0;
        for (let y = 0; y < H; y++) if (!near(at(x, y), bg, TOL) && ++off > H * ALLOW) return false;
        return true;
      };

      let top = 0, bottom = H - 1, left = 0, right = W - 1;
      while (top < bottom && rowIsBorder(top)) top++;
      while (bottom > top && rowIsBorder(bottom)) bottom--;
      while (left < right && colIsBorder(left)) left++;
      while (right > left && colIsBorder(right)) right--;

      // A matte is symmetric — it frames the picture on both sides at once. A
      // one-sided run of flat pixels is the photograph itself: these prompts
      // ask for a dark, empty bottom 45% to lay a headline over, and that
      // band is near-black, so a naive walk happily eats it. Trim an axis
      // only when both of its edges agree, and never more than 15% a side.
      const cap = (t, n) => (t > n * 0.15 ? 0 : t);
      let tT = cap(top, H), tB = cap(H - 1 - bottom, H);
      let tL = cap(left, W), tR = cap(W - 1 - right, W);
      const sym = (a, b) => Math.abs(a - b) <= 4 ? [a, b] : [0, 0];
      [tT, tB] = sym(tT, tB);
      [tL, tR] = sym(tL, tR);
      top = tT; bottom = H - 1 - tB; left = tL; right = W - 1 - tR;

      const w = right - left + 1, h = bottom - top + 1;
      if (w === W && h === H) return null;                 // nothing to do
      if (w < W * 0.5 || h < H * 0.5) return { refused: true, w, h, W, H };

      const o = document.createElement("canvas");
      o.width = w; o.height = h;
      o.getContext("2d").drawImage(c, left, top, w, h, 0, 0, w, h);
      return { data: o.toDataURL("image/png"), w, h, W, H };
    }, `data:image/png;base64,${b64}`);

    const name = path.basename(file);
    if (!out) { console.log(`  ok    ${name} — no border`); continue; }
    if (out.refused) {
      console.log(`  WARN  ${name} — would crop to ${out.w}x${out.h} of ${out.W}x${out.H}; refused, check it by hand`);
      continue;
    }
    fs.writeFileSync(file, Buffer.from(out.data.split(",")[1], "base64"));
    console.log(`  trim  ${name}  ${out.W}x${out.H} -> ${out.w}x${out.h}`);
    trimmed++;
  }

  await browser.close();
  console.log(`  ${trimmed} of ${files.length} trimmed`);
})();
