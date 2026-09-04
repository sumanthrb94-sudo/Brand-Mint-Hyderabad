#!/usr/bin/env node
/**
 * One-shot Firebase setup for Brand Mint. Zero dependencies — Node 18+.
 *
 *   node scripts/setup-firebase.mjs --key /path/to/service-account.json --admin you@gmail.com
 *
 * Does, idempotently:
 *   1. Registers a web app (if none) and writes its config into firebase/config.js
 *   2. Creates the Firestore database (if none) in --region, Native mode
 *   3. Deploys firestore.rules
 *   4. Adds the site + localhost to Auth's authorized domains
 *   5. Makes --admin an admin: creates the auth user if needed, writes profiles/{uid}.role
 *   6. Reports whether Google sign-in is enabled (that switch is console-only)
 *
 * The service-account key is read from --key or $GOOGLE_APPLICATION_CREDENTIALS
 * and is never written anywhere. Delete the key in the Google Cloud console
 * once you've run this; nothing in the app needs it afterwards.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { createSign } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ------------------------------------------------------------------ args */

const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, all) =>
    a.startsWith("--") ? [a.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] == null ? true : all[i + 1]] : []
  ).filter((p) => p.length)
);

const KEY_PATH = args.key || process.env.GOOGLE_APPLICATION_CREDENTIALS;
const ADMIN_EMAIL = typeof args.admin === "string" ? args.admin.trim().toLowerCase() : null;
const REGION = typeof args.region === "string" ? args.region : "asia-south1";
const SITE = typeof args.site === "string" ? args.site : "brand-mint-sdmk.vercel.app";
const DRY = !!args["dry-run"];

if (!KEY_PATH) {
  console.error("Need --key <service-account.json> (or GOOGLE_APPLICATION_CREDENTIALS).");
  process.exit(2);
}

const sa = JSON.parse(readFileSync(KEY_PATH, "utf8"));
const PID = sa.project_id;
if (!PID || !sa.private_key || !sa.client_email) {
  console.error("That file doesn't look like a service-account key.");
  process.exit(2);
}

/* ---------------------------------------------------------------- auth */

const SCOPES = [
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/firebase",
  "https://www.googleapis.com/auth/datastore",
  "https://www.googleapis.com/auth/identitytoolkit",
].join(" ");

async function accessToken() {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: sa.client_email, scope: SCOPES, aud: sa.token_uri, iat: now, exp: now + 3600,
  })}`;
  const sig = createSign("RSA-SHA256").update(unsigned).sign(sa.private_key, "base64url");
  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${sig}`,
    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`token: ${res.status} ${JSON.stringify(j)}`);
  return j.access_token;
}

let TOKEN;
async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  return { ok: res.ok, status: res.status, json };
}

async function waitOp(base, opName, label) {
  for (let i = 0; i < 60; i++) {
    const r = await api("GET", `${base}/${opName}`);
    if (r.json?.done) {
      if (r.json.error) throw new Error(`${label}: ${JSON.stringify(r.json.error)}`);
      return r.json.response;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`${label}: timed out waiting for operation`);
}

const ok = (s) => console.log(`  ✓ ${s}`);
const info = (s) => console.log(`  · ${s}`);
const warn = (s) => console.log(`  ! ${s}`);

/* --------------------------------------------------------------- steps */

async function stepWebApp() {
  console.log("\n1. Web app config");
  const FB = "https://firebase.googleapis.com/v1beta1";
  let list = await api("GET", `${FB}/projects/${PID}/webApps`);
  if (!list.ok) throw new Error(`list webApps: ${list.status} ${JSON.stringify(list.json)}`);
  let app = (list.json.apps || [])[0];

  if (!app) {
    if (DRY) { warn("no web app registered — would create one"); return null; }
    const create = await api("POST", `${FB}/projects/${PID}/webApps`, { displayName: "Brand Mint site" });
    if (!create.ok) throw new Error(`create webApp: ${create.status} ${JSON.stringify(create.json)}`);
    const resp = await waitOp(FB, create.json.name, "create webApp");
    app = resp;
    ok(`registered web app ${app.appId}`);
  } else {
    ok(`web app already registered: ${app.displayName || app.appId}`);
  }

  const cfg = await api("GET", `${FB}/projects/${PID}/webApps/${app.appId}/config`);
  if (!cfg.ok) throw new Error(`get config: ${cfg.status} ${JSON.stringify(cfg.json)}`);
  const c = cfg.json;

  const file = resolve(ROOT, "firebase/config.js");
  const src = readFileSync(file, "utf8");
  const out = src
    .replace(/apiKey:\s*"[^"]*"/, `apiKey: "${c.apiKey}"`)
    .replace(/authDomain:\s*"[^"]*"/, `authDomain: "${c.authDomain}"`)
    .replace(/projectId:\s*"[^"]*"/, `projectId: "${c.projectId}"`)
    .replace(/storageBucket:\s*"[^"]*"/, `storageBucket: "${c.storageBucket}"`)
    .replace(/messagingSenderId:\s*"[^"]*"/, `messagingSenderId: "${c.messagingSenderId}"`)
    .replace(/appId:\s*"[^"]*"/, `appId: "${c.appId}"`);
  if (out === src) info("firebase/config.js already up to date");
  else if (DRY) info("would write firebase/config.js");
  else { writeFileSync(file, out); ok("wrote firebase/config.js (apiKey, senderId, appId, bucket)"); }
  return c;
}

async function stepFirestore() {
  console.log("\n2. Firestore database");
  const FS = "https://firestore.googleapis.com/v1";
  const list = await api("GET", `${FS}/projects/${PID}/databases`);
  if (!list.ok) throw new Error(`list databases: ${list.status} ${JSON.stringify(list.json)}`);
  const dbs = list.json.databases || [];
  const def = dbs.find((d) => d.name.endsWith("/databases/(default)"));
  if (def) { ok(`(default) exists in ${def.locationId} · ${def.type}`); return; }
  if (DRY) { warn(`no database — would create (default) in ${REGION}`); return; }
  const create = await api("POST", `${FS}/projects/${PID}/databases?databaseId=(default)`, {
    type: "FIRESTORE_NATIVE",
    locationId: REGION,
  });
  if (!create.ok) throw new Error(`create database: ${create.status} ${JSON.stringify(create.json)}`);
  await waitOp(FS, create.json.name, "create database");
  ok(`created (default) in ${REGION}, Native mode`);
}

async function stepRules() {
  console.log("\n3. Security rules");
  const RULES = "https://firebaserules.googleapis.com/v1";
  const content = readFileSync(resolve(ROOT, "firestore.rules"), "utf8");
  if (DRY) { info(`would deploy firestore.rules (${content.length} bytes)`); return; }

  const rs = await api("POST", `${RULES}/projects/${PID}/rulesets`, {
    source: { files: [{ name: "firestore.rules", content }] },
  });
  if (!rs.ok) throw new Error(`create ruleset: ${rs.status} ${JSON.stringify(rs.json)}`);
  const rulesetName = rs.json.name;

  const releaseName = `projects/${PID}/releases/cloud.firestore`;
  let rel = await api("PATCH", `${RULES}/${releaseName}`, { release: { name: releaseName, rulesetName } });
  if (rel.status === 404) {
    rel = await api("POST", `${RULES}/projects/${PID}/releases`, { name: releaseName, rulesetName });
  }
  if (!rel.ok) throw new Error(`release rules: ${rel.status} ${JSON.stringify(rel.json)}`);
  ok(`deployed firestore.rules → ${rulesetName.split("/").pop()}`);
}

async function stepAuthDomains() {
  console.log("\n4. Auth authorized domains");
  const IT = "https://identitytoolkit.googleapis.com/admin/v2";
  const cfg = await api("GET", `${IT}/projects/${PID}/config`);
  if (!cfg.ok) throw new Error(`get auth config: ${cfg.status} ${JSON.stringify(cfg.json)}`);
  const have = new Set(cfg.json.authorizedDomains || []);
  const want = ["localhost", SITE, `${PID}.firebaseapp.com`, `${PID}.web.app`];
  const missing = want.filter((d) => !have.has(d));
  if (!missing.length) { ok(`authorized domains already include ${SITE}`); return cfg.json; }
  if (DRY) { info(`would add ${missing.join(", ")}`); return cfg.json; }
  const upd = await api("PATCH", `${IT}/projects/${PID}/config?updateMask=authorizedDomains`, {
    authorizedDomains: [...have, ...missing],
  });
  if (!upd.ok) throw new Error(`patch auth config: ${upd.status} ${JSON.stringify(upd.json)}`);
  ok(`added ${missing.join(", ")}`);
  return upd.json;
}

async function stepGoogleProvider() {
  console.log("\n5. Google sign-in");
  const IT = "https://identitytoolkit.googleapis.com/admin/v2";
  const r = await api("GET", `${IT}/projects/${PID}/defaultSupportedIdpConfigs`);
  const google = (r.json?.defaultSupportedIdpConfigs || []).find((c) => c.name.endsWith("/google.com"));
  if (google?.enabled) { ok("Google provider is enabled"); return true; }
  warn("Google sign-in is NOT enabled. This one is console-only (Firebase auto-provisions the OAuth client):");
  warn(`  https://console.firebase.google.com/project/${PID}/authentication/providers → Google → Enable → Save`);
  return false;
}

async function stepAdmin() {
  console.log("\n6. First admin");
  if (!ADMIN_EMAIL) { info("no --admin given; skipping"); return; }
  const IT = "https://identitytoolkit.googleapis.com/v1";
  const FS = "https://firestore.googleapis.com/v1";

  let look = await api("POST", `${IT}/projects/${PID}/accounts:lookup`, { email: [ADMIN_EMAIL] });
  let user = (look.json?.users || [])[0];
  if (!user) {
    if (DRY) { info(`would create auth user ${ADMIN_EMAIL} and mark admin`); return; }
    // Pre-create the account so the very first Google sign-in with this
    // address lands on a profile that is already admin. Firebase links the
    // Google credential to the existing account by email.
    const mk = await api("POST", `${IT}/projects/${PID}/accounts`, { email: ADMIN_EMAIL, emailVerified: true });
    if (!mk.ok) throw new Error(`create user: ${mk.status} ${JSON.stringify(mk.json)}`);
    user = { localId: mk.json.localId };
    ok(`created auth user for ${ADMIN_EMAIL}`);
  } else {
    ok(`auth user exists for ${ADMIN_EMAIL}`);
  }

  if (DRY) { info(`would set profiles/${user.localId}.role = admin`); return; }
  const docUrl =
    `${FS}/projects/${PID}/databases/(default)/documents/profiles/${user.localId}` +
    `?updateMask.fieldPaths=role&updateMask.fieldPaths=email&updateMask.fieldPaths=updatedAt`;
  const w = await api("PATCH", docUrl, {
    fields: {
      role: { stringValue: "admin" },
      email: { stringValue: ADMIN_EMAIL },
      updatedAt: { stringValue: new Date().toISOString() },
    },
  });
  if (!w.ok) throw new Error(`write profile: ${w.status} ${JSON.stringify(w.json)}`);
  ok(`profiles/${user.localId}.role = admin`);
}

/* ----------------------------------------------------------------- main */

console.log(`Brand Mint · Firebase setup · project ${PID}${DRY ? " · DRY RUN" : ""}`);
try {
  TOKEN = await accessToken();
  ok(`authenticated as ${sa.client_email}`);
  const cfg = await stepWebApp();
  await stepFirestore();
  await stepRules();
  await stepAuthDomains();
  const googleOn = await stepGoogleProvider();
  await stepAdmin();

  console.log("\nDone.");
  if (cfg) console.log(`  apiKey ${cfg.apiKey.slice(0, 10)}…  appId ${cfg.appId}`);
  if (!googleOn) console.log("  → Enable Google sign-in in the console (link above), then sign in at /login.");
  console.log(`  → Now delete this service-account key in Google Cloud (IAM → Service accounts → ${sa.client_email} → Keys).`);
} catch (e) {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
}
