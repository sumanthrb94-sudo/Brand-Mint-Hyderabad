/**
 * Firestore, read through the CALLER's own token. No Admin SDK, no service
 * account, no root credential anywhere in this deployment.
 *
 * WHY THIS EXISTS
 * ---------------
 * A payment endpoint must never trust an amount sent by the browser, or a
 * client can pay ₹1 for a ₹80,000 invoice. So the server has to read the
 * invoice itself. The obvious way is the Firebase Admin SDK — which needs a
 * service account private key in an environment variable, a credential that
 * bypasses every rule in firestore.rules and never expires.
 *
 * CLAUDE.md contradicts itself here: §3 says that key must never go in an env
 * var and that nothing here needs it; §9 lists "Admin SDK server-side" as a
 * sanctioned option. This file is the way out of that contradiction rather
 * than a ruling on it.
 *
 * Instead, the browser sends its Firebase ID token and the server uses THAT
 * against the Firestore REST API. Consequences, all good:
 *
 *   - firestore.rules still decides everything. The server gets exactly what
 *     the signed-in user is allowed to see and not one document more.
 *   - The token is verified by Firestore itself. A forged or expired token
 *     produces a 401 from Google, so no JWT-verification code lives here and
 *     no signing keys need fetching or caching.
 *   - There is no credential to leak. If this whole deployment were dumped to
 *     a public bucket, the worst it would contain is the Razorpay key, which
 *     is scoped to one merchant account and can be rotated in a click.
 *
 * The cost: the server can only act with a user's authority, never above it.
 * That is a constraint on what can be built, and it is the right one — see
 * reconcile.js for how invoices get marked paid without a privileged writer.
 */

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "brandmintstudios-a5eb7";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/** Pulls the bearer token off the request. Returns null rather than throwing. */
function bearer(req) {
  const h = req.headers.authorization || req.headers.Authorization || "";
  const m = /^Bearer\s+(.+)$/i.exec(String(h).trim());
  return m ? m[1] : null;
}

async function firestoreGet(path, idToken) {
  const res = await fetch(`${BASE}/${path}`, {
    headers: { Authorization: `Bearer ${idToken}` },
    signal: AbortSignal.timeout(10000),
  });
  if (res.status === 401 || res.status === 403) {
    const err = new Error("forbidden");
    err.status = 403;
    throw err;
  }
  if (res.status === 404) {
    const err = new Error("not_found");
    err.status = 404;
    throw err;
  }
  if (!res.ok) {
    const err = new Error("firestore_error");
    err.status = 502;
    throw err;
  }
  return res.json();
}

/** Reads one document and returns plain JS, or throws with .status set. */
async function getDoc(collection, id, idToken) {
  const doc = await firestoreGet(`${collection}/${encodeURIComponent(id)}`, idToken);
  return decode(doc.fields || {});
}

/**
 * True when the caller is the admin.
 *
 * Deliberately asks Firestore rather than parsing the token's email claim.
 * The rules already say `isAdmin()` means one specific email on the token, and
 * `leads` is readable by nobody else — so a successful read IS the proof. One
 * source of truth for who is admin, and it is the security boundary itself
 * rather than a copy of it living in this file.
 */
async function isAdmin(idToken) {
  if (!idToken) return false;
  try {
    const res = await fetch(`${BASE}/leads?pageSize=1`, {
      headers: { Authorization: `Bearer ${idToken}` },
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Firestore's typed-value JSON -> plain JS. */
function decode(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    const kind = Object.keys(v)[0];
    if (kind === "integerValue") out[k] = Number(v.integerValue);
    else if (kind === "doubleValue") out[k] = Number(v.doubleValue);
    else if (kind === "booleanValue") out[k] = v.booleanValue;
    else if (kind === "nullValue") out[k] = null;
    else if (kind === "timestampValue") out[k] = v.timestampValue;
    else if (kind === "mapValue") out[k] = decode(v.mapValue.fields || {});
    else if (kind === "arrayValue") out[k] = (v.arrayValue.values || []).map((x) => decode({ x }).x);
    else out[k] = v[kind];
  }
  return out;
}

module.exports = { bearer, getDoc, isAdmin, decode, PROJECT_ID };
