/**
 * Contrast, computed.
 *
 *   node --test tests/contrast.test.mjs
 *
 * CLAUDE.md §4: "Minimum contrast 4.5:1 on anything interactive. Compute it,
 * do not eyeball it." That rule existed and nothing enforced it, which is how
 * two invisible buttons shipped and how the Sign in CTA went out at 1.03:1.
 * A non-negotiable with no test is a preference.
 *
 * The values are read out of assets/bm-app.css rather than copied here — a
 * test that asserts against its own copy of the palette passes forever while
 * the stylesheet drifts underneath it.
 *
 * Two things this gets right that eyeballing cannot:
 *
 *   - `--bm-line` is translucent, so a pill's real background is that colour
 *     COMPOSITED over the card. Reading the token alone overstates contrast.
 *   - `--ink` and `--cream` swap meaning between themes, so every pair is
 *     checked in both. That swap is exactly what made the CTA invisible.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CSS = fs.readFileSync(
  path.join(path.resolve(import.meta.dirname, ".."), "assets/bm-app.css"),
  "utf8"
);

/* ── read the palettes out of the stylesheet ──────────────────── */

function tokensIn(block) {
  const out = {};
  for (const m of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

function blockAfter(selector) {
  const at = CSS.indexOf(selector);
  assert.notEqual(at, -1, `missing block: ${selector}`);
  const open = CSS.indexOf("{", at);
  let depth = 0;
  for (let i = open; i < CSS.length; i += 1) {
    if (CSS[i] === "{") depth += 1;
    else if (CSS[i] === "}") {
      depth -= 1;
      if (depth === 0) return CSS.slice(open + 1, i);
    }
  }
  throw new Error(`unbalanced braces after ${selector}`);
}

const LIGHT = tokensIn(blockAfter(":root {"));
const DARK = { ...LIGHT, ...tokensIn(blockAfter(':root[data-theme="dark"]')) };

/* ── colour maths ─────────────────────────────────────────────── */

function parse(css) {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(css.trim());
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = [...h].map((c) => c + c).join("");
    return { rgb: [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)), a: 1 };
  }
  const rgba = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\s*\)$/i.exec(css.trim());
  if (rgba) {
    return {
      rgb: [rgba[1], rgba[2], rgba[3]].map((n) => Math.round(Number(n))),
      a: rgba[4] === undefined ? 1 : Number(rgba[4]),
    };
  }
  throw new Error(`cannot parse colour: ${css}`);
}

/** Alpha-composite fg over an opaque backdrop. This is the step that gets
 *  skipped, and it is where the muted pill was hiding a 4.00:1. */
function composite(css, backdrop) {
  const { rgb, a } = parse(css);
  if (a >= 1) return rgb;
  return rgb.map((c, i) => Math.round(a * c + (1 - a) * backdrop[i]));
}

function luminance(rgb) {
  const s = rgb.map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
}

function ratio(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/* ── the pairs that must clear the floor ──────────────────────── */
//
// `on` names the surface the pair sits on, because a translucent background
// means nothing until you know what is behind it.

const PAIRS = [
  { name: "primary button (Sign in, Save, Pay now)", fg: "--bm-btn-fg", bg: "--bm-btn-bg", on: null },
  { name: "ghost button label on a card", fg: "--ink", bg: "--bm-white", on: null },
  { name: "danger button", fg: "--bm-red", bg: "--bm-red-bg", on: null },
  { name: "scope pill: Agreed (a BUTTON on /studio)", fg: "--bm-pill-muted-fg", bg: "--bm-line", on: "--bm-white" },
  { name: "scope pill: Building", fg: "--bm-amber", bg: "--bm-amber-bg", on: null },
  { name: "scope pill: Delivered / Accepted", fg: "--bm-green", bg: "--bm-green-bg", on: null },
  { name: "unpaid / overdue pill", fg: "--bm-red", bg: "--bm-red-bg", on: null },
  { name: "status message: error", fg: "--bm-red", bg: "--bm-red-bg", on: null },
  { name: "status message: ok", fg: "--bm-green", bg: "--bm-green-bg", on: null },
  { name: "body text on the page background", fg: "--ink", bg: "--bg", on: null },
  { name: "body text on a card", fg: "--ink", bg: "--bm-white", on: null },
  { name: "secondary text (bm-row-sub) on a card", fg: "--bm-muted", bg: "--bm-white", on: null },
  { name: "secondary text on the page background", fg: "--bm-muted", bg: "--bg", on: null },
];

const FLOOR = 4.5;

for (const [themeName, T] of [["light", LIGHT], ["dark", DARK]]) {
  for (const pair of PAIRS) {
    test(`${themeName}: ${pair.name} clears ${FLOOR}:1`, () => {
      assert.ok(T[pair.fg], `${pair.fg} is not defined in the ${themeName} palette`);
      assert.ok(T[pair.bg], `${pair.bg} is not defined in the ${themeName} palette`);
      const backdrop = pair.on ? parse(T[pair.on]).rgb : null;
      const bg = pair.on ? composite(T[pair.bg], backdrop) : parse(T[pair.bg]).rgb;
      const fg = composite(T[pair.fg], bg);
      const r = ratio(fg, bg);
      assert.ok(
        r >= FLOOR,
        `${pair.name} is ${r.toFixed(2)}:1 in ${themeName} — below ${FLOOR}:1. ` +
          `fg ${pair.fg}=${T[pair.fg]}, bg ${pair.bg}=${T[pair.bg]}` +
          (pair.on ? ` over ${pair.on}=${T[pair.on]}` : "")
      );
    });
  }
}

/* ── the trap that caused this rule to exist ──────────────────── */

test("--ink and --cream really do swap, so a fixed pair is required for the CTA", () => {
  // Not a style opinion: if the primary button used --ink on --cream it would
  // be legible in one theme and invisible in the other. The fixed pair is why
  // it is safe in both, and this asserts the swap is still real.
  assert.notEqual(LIGHT["--ink"], DARK["--ink"], "--ink no longer flips between themes");
  assert.equal(LIGHT["--bm-btn-bg"], DARK["--bm-btn-bg"], "the CTA pair became theme-adaptive again");
  assert.equal(LIGHT["--bm-btn-fg"], DARK["--bm-btn-fg"], "the CTA pair became theme-adaptive again");
});

test("the two dark palettes stay identical, or half the screen goes dark", () => {
  // Declared twice on purpose — once under prefers-color-scheme, once under
  // [data-theme="dark"] — so an explicit choice can beat the system setting.
  // Drift between them ships a half-dark screen.
  const media = tokensIn(blockAfter(':root:not([data-theme="light"])'));
  const explicit = tokensIn(blockAfter(':root[data-theme="dark"]'));
  assert.deepEqual(
    Object.keys(media).sort(),
    Object.keys(explicit).sort(),
    "the two dark blocks define different tokens"
  );
  for (const k of Object.keys(media)) {
    assert.equal(media[k], explicit[k], `${k} differs between the two dark blocks`);
  }
});

test("every interactive pill tone is covered by a pair above", () => {
  // A new .bm-pill--x with no entry in PAIRS would ship unmeasured, which is
  // exactly how the muted pill sat at 4.00:1 without anyone noticing.
  const tones = [...CSS.matchAll(/\.bm-pill--(\w+)\s*\{/g)].map((m) => m[1]);
  const covered = new Set(
    PAIRS.flatMap((p) => [p.fg, p.bg]).map((t) => t.replace("--bm-", "").replace("-bg", "").replace("-fg", ""))
  );
  for (const tone of new Set(tones)) {
    const key = tone === "muted" ? "pill-muted" : tone;
    assert.ok(
      [...covered].some((c) => c.includes(key) || key.includes(c)),
      `.bm-pill--${tone} has no measured pair in tests/contrast.test.mjs`
    );
  }
});
