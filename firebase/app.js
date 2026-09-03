/**
 * Firebase SDK loader — one app, one auth instance, one Firestore.
 *
 * Loaded straight from gstatic as ES modules so the repo keeps its "no build
 * step, no npm" property. Everything is lazy: the SDK is only fetched when a
 * page actually asks for it, so the public marketing site stays light.
 *
 * Two deliberate choices worth knowing about:
 *
 * 1. `initializeAuth` with `browserLocalPersistence` rather than `getAuth`.
 *    Firebase's default persistence prefers IndexedDB, which is async — that
 *    would break the synchronous first-paint preflight the admin and portal
 *    shells rely on to avoid flashing the wrong UI. localStorage is
 *    synchronous, so the hint we cache alongside it can be read before paint.
 *
 * 2. Firestore uses `persistentLocalCache`, which replaces the hand-rolled
 *    localStorage mirror the old Supabase data layer maintained. Reads are
 *    served locally and writes queue offline, which is what that ~120 lines
 *    of custom caching existed to do.
 */

import { firebaseConfig, FIREBASE_SDK_VERSION, isConfigured } from "/firebase/config.js";

const CDN = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;

let _bundle = null;
let _loading = null;

export { isConfigured };

/**
 * Resolves to { app, auth, db, sdk } where `sdk` carries the named exports
 * the rest of the codebase needs, so callers import from here rather than
 * repeating CDN URLs.
 */
export async function getFirebase() {
  if (_bundle) return _bundle;
  if (_loading) return _loading;

  if (!isConfigured()) {
    throw new Error(
      "Firebase is not configured yet — paste your web app config into firebase/config.js. See SETUP-FIREBASE.md."
    );
  }

  _loading = (async () => {
    const [appMod, authMod, storeMod] = await Promise.all([
      import(`${CDN}/firebase-app.js`),
      import(`${CDN}/firebase-auth.js`),
      import(`${CDN}/firebase-firestore.js`),
    ]);

    const app = appMod.initializeApp(firebaseConfig);

    // See note 1 above — synchronous persistence, so the preflight works.
    const auth = authMod.initializeAuth(app, {
      persistence: authMod.browserLocalPersistence,
      popupRedirectResolver: authMod.browserPopupRedirectResolver,
    });

    // See note 2 — this is the old localStorage mirror, done properly.
    let db;
    try {
      db = storeMod.initializeFirestore(app, {
        localCache: storeMod.persistentLocalCache({
          tabManager: storeMod.persistentMultipleTabManager(),
        }),
      });
    } catch (e) {
      // Private browsing, or storage disabled. Memory-only still works.
      console.warn("[firebase] persistent cache unavailable, using memory", e);
      db = storeMod.getFirestore(app);
    }

    _bundle = { app, auth, db, sdk: { ...authMod, ...storeMod } };
    return _bundle;
  })();

  return _loading;
}

/** Convenience accessors so call sites stay short. */
export async function getAuthInstance() {
  return (await getFirebase()).auth;
}

export async function getDb() {
  return (await getFirebase()).db;
}

export async function sdk() {
  return (await getFirebase()).sdk;
}
