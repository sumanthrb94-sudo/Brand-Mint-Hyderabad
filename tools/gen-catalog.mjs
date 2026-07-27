#!/usr/bin/env node
/**
 * Generates assets/bm-catalog.js from the commerce-skeleton feature registry.
 *
 * There is ONE source of truth for what Brand Mint sells and what it costs:
 * commerce-skeleton/src/config/features.ts. The portal cannot import a
 * TypeScript file — it has no build step and must not gain one — so this
 * script compiles that registry into a plain ES module the browser can load.
 *
 *   node tools/gen-catalog.mjs
 *
 * Run it after changing features.ts or the day rate. The header of the
 * generated file records where it came from, so nobody edits it by hand.
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const SKELETON = process.env.SKELETON_DIR || "/workspace/commerce-skeleton";
const OUT = path.resolve(import.meta.dirname, "../assets/bm-catalog.js");

if (!fs.existsSync(SKELETON)) {
  console.error(`commerce-skeleton not found at ${SKELETON}`);
  console.error("Clone it, or set SKELETON_DIR.");
  process.exit(1);
}

// Compile the registry so we read the same objects the quote CLI reads.
execSync("npx tsc -p tsconfig.config.json", { cwd: SKELETON, stdio: "inherit" });

const features = await import(`${SKELETON}/dist/src/config/features.js`);
const pricing = await import(`${SKELETON}/dist/src/config/pricing.js`);

const payload = {
  generatedFrom: "commerce-skeleton/src/config/features.ts",
  dayRate: pricing.DAY_RATE,
  floorDayRate: pricing.FLOOR_DAY_RATE,
  minimumEngagement: pricing.MINIMUM_ENGAGEMENT,
  terms: pricing.TERMS,
  scaleMultiplier: pricing.SCALE_MULTIPLIER,
  scaleLabels: pricing.SCALE_LABELS,
  categories: features.FEATURE_CATEGORIES,
  categoryLabels: features.CATEGORY_LABELS,
  presets: pricing.PRESETS,
  features: features.FEATURES.map((f) => ({
    id: f.id,
    label: f.label,
    category: f.category,
    summary: f.summary,
    buildDays: f.buildDays,
    monthlyDays: f.monthlyDays ?? 0,
    needsServer: !!f.needsServer,
    readiness: f.readiness ?? "ready",
    evidence: f.evidence ?? [],
    delivers: f.delivers ?? [],
    requires: f.requires ?? [],
    modules: f.modules ?? [],
    thirdPartyCost: f.thirdPartyCost ?? [],
    dependsOn: f.dependsOn ?? [],
    stack: f.stack ?? "",
    howToBuild: f.howToBuild ?? "",
  })),
};

const src = `// GENERATED FILE — DO NOT EDIT BY HAND.
// Source: ${payload.generatedFrom}
// Regenerate: node tools/gen-catalog.mjs
//
// One source of truth for what we sell and what it costs. The quote CLI and
// this portal read the same numbers, so a price shown to a client here can
// never disagree with one computed on the command line.

export const CATALOG = ${JSON.stringify(payload, null, 2)};

export const FEATURES = CATALOG.features;
export const FEATURES_BY_ID = Object.fromEntries(FEATURES.map((f) => [f.id, f]));
export const DAY_RATE = CATALOG.dayRate;
export const FLOOR_DAY_RATE = CATALOG.floorDayRate;
export const CATEGORY_LABELS = CATALOG.categoryLabels;
export const PRESETS = CATALOG.presets;
export const TERMS = CATALOG.terms;
export const SCALE_MULTIPLIER = CATALOG.scaleMultiplier;
export const SCALE_LABELS = CATALOG.scaleLabels;

const roundPrice = (n) => Math.round(n / 500) * 500;

/** Pull in everything a selection depends on. Same rule as the CLI. */
export function withDependencies(ids) {
  const out = new Set();
  const visit = (id) => {
    if (out.has(id)) return;
    const f = FEATURES_BY_ID[id];
    if (!f) return;
    out.add(id);
    (f.dependsOn || []).forEach(visit);
  };
  ids.forEach(visit);
  return [...out];
}

/** Price a selection. Mirrors quote() in the skeleton. */
export function quote(ids, scale = "standard") {
  const all = withDependencies(ids);
  const implied = all.filter((id) => !ids.includes(id));
  const mult = SCALE_MULTIPLIER[scale] ?? 1;
  const lines = all.map((id) => {
    const f = FEATURES_BY_ID[id];
    const days = f.buildDays * mult;
    return { feature: f, days, amount: roundPrice(days * DAY_RATE), implied: implied.includes(id) };
  });
  const buildDays = lines.reduce((s, l) => s + l.days, 0);
  const oneOff = lines.reduce((s, l) => s + l.amount, 0);
  const monthlyDays = lines.reduce((s, l) => s + (l.feature.monthlyDays || 0) * mult, 0);
  return {
    lines, impliedIds: implied, scale,
    buildDays: Math.round(buildDays * 10) / 10,
    oneOff,
    gst: Math.round(oneOff * TERMS.gstRate),
    monthly: roundPrice(monthlyDays * DAY_RATE),
    monthlyDays: Math.round(monthlyDays * 10) / 10,
    needsServer: lines.some((l) => l.feature.needsServer),
    thirdPartyCosts: [...new Set(lines.flatMap((l) => l.feature.thirdPartyCost))],
    clientRequirements: lines.flatMap((l) =>
      l.feature.requires.map((requirement) => ({ feature: l.feature.label, requirement }))
    ),
    buildModules: [...new Set(lines.flatMap((l) => l.feature.modules))],
  };
}

/** The margin gate. Never sign below the floor. */
export function checkPrice(agreedPrice, q) {
  const impliedDayRate = q.buildDays > 0 ? agreedPrice / q.buildDays : Infinity;
  const verdict = impliedDayRate >= DAY_RATE ? "healthy"
    : impliedDayRate >= FLOOR_DAY_RATE ? "thin" : "below-floor";
  return {
    agreedPrice, impliedDayRate, verdict,
    floorPrice: roundPrice(q.buildDays * FLOOR_DAY_RATE),
    listPrice: q.oneOff,
    daysNeededAtFloor: agreedPrice / FLOOR_DAY_RATE,
    sellable: verdict !== "below-floor",
  };
}
`;

fs.writeFileSync(OUT, src);
console.log(`${payload.features.length} services -> ${path.relative(process.cwd(), OUT)}`);
console.log(`day rate ₹${payload.dayRate.toLocaleString("en-IN")} · floor ₹${payload.floorDayRate.toLocaleString("en-IN")}`);
