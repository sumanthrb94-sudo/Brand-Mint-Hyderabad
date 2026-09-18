/**
 * Find generated images with a hard horizontal seam across them.
 *
 *   NODE_PATH=$(npm root -g) node scripts/seamcheck.cjs images/ppl-*.png
 *
 * Asking an image model to keep "the bottom 40 percent calm and uncluttered"
 * so a headline can sit on it sometimes gets taken literally: it renders a
 * second, unrelated, out-of-focus plane below that line and splices the two
 * together. The join is invisible in a thumbnail and obvious at 1080px, and
 * once a scrim is laid over it, it reads as the photograph being cut in half.
 *
 * Detection: mean row brightness down the image, then the largest single
 * row-to-row jump. A photograph changes gradually; a splice does not.
 */
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");

(async () => {
  const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const bad = [];

  for (const f of files) {
    const b64 = fs.readFileSync(f).toString("base64");
    const r = await page.evaluate(async (dataUrl) => {
      const img = new Image(); img.src = dataUrl; await img.decode();
      const W = img.naturalWidth, H = img.naturalHeight;
      const c = document.createElement("canvas");
      c.width = W; c.height = H;
      const cx = c.getContext("2d", { willReadFrequently: true });
      cx.drawImage(img, 0, 0);
      const d = cx.getImageData(0, 0, W, H).data;
      const rows = new Float64Array(H);
      const sharp = new Float64Array(H);   // mean |horizontal gradient| per row
      for (let y = 0; y < H; y++) {
        let sum = 0;
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          sum += 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
        }
        rows[y] = sum / W;
        let g = 0;
        for (let x = 1; x < W; x++) {
          const i = (y * W + x) * 4, j = (y * W + x - 1) * 4;
          g += Math.abs((0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2])
                      - (0.299*d[j] + 0.587*d[j+1] + 0.114*d[j+2]));
        }
        sharp[y] = g / (W - 1);
      }
      // A plane spliced in below the subject is usually rendered out of focus
      // rather than darker, so brightness alone cannot see it. Detail density
      // can: compare the mean sharpness of a band above a candidate row with
      // the band below it, and a sudden collapse is a splice.
      const band = Math.max(8, Math.floor(H / 40));
      let blurAt = 0, blurRatio = 1;
      for (let y = Math.floor(H / 5); y < H - Math.floor(H / 5); y++) {
        let a = 0, b = 0;
        for (let k = 1; k <= band; k++) { a += sharp[y - k]; b += sharp[y + k]; }
        const ratio = (b / band) / Math.max(0.5, a / band);
        if (ratio < blurRatio) { blurRatio = ratio; blurAt = y / H; }
      }
      // Ignore the top and bottom eighth: real vignetting lives there.
      let jump = 0, at = 0, row = 0;
      for (let y = Math.floor(H / 8) + 1; y < H - Math.floor(H / 8); y++) {
        const diff = Math.abs(rows[y] - rows[y-1]);
        if (diff > jump) { jump = diff; at = y / H; row = y; }
      }
      // A splice is the giveaway, not the size of the jump: a real edge in a
      // photograph follows an object and so only crosses some columns, while
      // a spliced-on plane changes EVERY column at the same row. A bright
      // shop fascia meeting dark glass scores a bigger jump than any splice
      // and is perfectly legitimate.
      let crossed = 0;
      for (let x = 0; x < W; x++) {
        const a = (row * W + x) * 4, b = ((row - 1) * W + x) * 4;
        const la = 0.299*d[a] + 0.587*d[a+1] + 0.114*d[a+2];
        const lb = 0.299*d[b] + 0.587*d[b+1] + 0.114*d[b+2];
        if (Math.abs(la - lb) > 6) crossed++;
      }
      return { jump: +jump.toFixed(2), at: +(at * 100).toFixed(1),
               width: +(crossed / W).toFixed(2),
               blur: +blurRatio.toFixed(2), blurAt: +(blurAt * 100).toFixed(1) };
    }, `data:image/png;base64,${b64}`);
    const name = path.basename(f, ".png");
    // A real scene rarely jumps more than ~3 levels between adjacent rows.
    const spliced = r.jump >= 4 && r.width >= 0.80;
    const blurred = r.blur <= 0.42;
    if (spliced || blurred) {
      bad.push(name);
      const why = spliced
        ? `brightness jumps ${r.jump} across ${Math.round(r.width*100)}% of the width at ${r.at}%`
        : `detail collapses to ${Math.round(r.blur*100)}% at ${r.blurAt}% down`;
      console.log(`  SEAM  ${name.padEnd(16)} ${why}`);
    }
  }
  await browser.close();
  console.log(`\n  ${bad.length} of ${files.length} images have a seam`);
  if (bad.length) console.log("  " + bad.join(" "));
})();
