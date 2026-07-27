// Builds stub Firebase ES modules served in place of the gstatic CDN, which
// this sandbox blocks. The stub implements only the surface bm-app.js uses,
// backed by an in-memory copy of the real seed data, so every page renders
// exactly as it will in production.

export function firebaseAppStub() {
  return `
    globalThis.__BM = globalThis.__BM || {};
    export function initializeApp(cfg) { return { name: "[DEFAULT]", options: cfg }; }
  `;
}

export function firebaseAuthStub() {
  return `
    export function getAuth() {
      return { get currentUser() { return globalThis.__BM_USER || null; } };
    }
    export function onAuthStateChanged(auth, cb) {
      queueMicrotask(() => cb(globalThis.__BM_USER || null));
      return () => {};
    }
    export async function signInWithEmailAndPassword(auth, email) {
      const err = new Error("auth/invalid-credential"); err.code = "auth/invalid-credential";
      throw err;
    }
    export async function signOut() { globalThis.__BM_USER = null; }
  `;
}

/** `data` is the seeded store: { organisations, users, projects, invoices, leads, catalog, sub } */
export function firestoreStub(data) {
  return `
    const DB = ${JSON.stringify(data)};

    // Timestamps must expose toDate()/toMillis() — the pages call both.
    function reviveTs(v) {
      if (v && typeof v === "object" && v.__ts) {
        const d = new Date(v.__ts);
        return { toDate: () => d, toMillis: () => d.getTime(), __isTs: true };
      }
      if (Array.isArray(v)) return v.map(reviveTs);
      if (v && typeof v === "object") {
        const o = {}; for (const k in v) o[k] = reviveTs(v[k]); return o;
      }
      return v;
    }
    for (const coll in DB) DB[coll] = reviveTs(DB[coll]);

    export function getFirestore() { return { __db: true }; }
    export function collection(db, ...path) { return { __path: path.join("/"), __isColl: true }; }
    export function doc(db, ...path) {
      // doc(collectionRef) with no path = auto-id
      if (db && db.__isColl) return { __path: db.__path + "/auto-" + Math.random().toString(36).slice(2, 8) };
      return { __path: path.join("/") };
    }
    export function query(coll, ...cs) { return { __path: coll.__path, __where: cs.filter(Boolean) }; }
    export function where(field, op, value) { return { field, op, value }; }

    function bucket(path) { return DB[path] || {}; }

    // ---- firestore.rules, enforced ----
    // Without this the stub would hand every document to everyone, and
    // /tenancy-check would report a LEAK that does not exist in production.
    const ADMIN_EMAIL = "admin@brandmintstudios.in";
    function me() {
      const u = globalThis.__BM_USER;
      return u ? (DB.users || {})[u.uid] : null;
    }
    function isAdmin() {
      const u = globalThis.__BM_USER;
      return !!u && u.email === ADMIN_EMAIL;
    }
    function myOrg() { return me()?.orgId ?? null; }
    function deny(path) {
      const e = new Error("Missing or insufficient permissions. (" + path + ")");
      e.code = "permission-denied";
      throw e;
    }
    function mayReadDoc(coll, id) {
      const u = globalThis.__BM_USER;
      if (!u) return false;
      if (isAdmin()) return true;
      if (coll === "users") return id === u.uid;
      if (coll === "organisations") return id === myOrg();
      if (coll === "projects") return (bucket("projects")[id] || {}).orgId === myOrg();
      if (coll === "invoices") return (bucket("invoices")[id] || {}).orgId === myOrg();
      if (coll === "leads" || coll === "catalog") return false;
      // Subcollections: projects/{pid}/...
      if (coll.startsWith("projects/")) {
        const pid = coll.split("/")[1];
        return (bucket("projects")[pid] || {}).orgId === myOrg();
      }
      return false;
    }
    function mayReadColl(coll) {
      if (isAdmin()) return true;
      if (coll.startsWith("projects/")) {
        const pid = coll.split("/")[1];
        return (bucket("projects")[pid] || {}).orgId === myOrg();
      }
      // A client may query projects/invoices filtered to their own org.
      return coll === "projects" || coll === "invoices";
    }

    export async function getDoc(ref) {
      const parts = ref.__path.split("/");
      const id = parts.pop();
      const coll = parts.join("/");
      if (!mayReadDoc(coll, id)) deny(ref.__path);
      const val = bucket(coll)[id];
      return { id, exists: () => val !== undefined, data: () => val };
    }

    export async function getDocs(q) {
      if (!mayReadColl(q.__path)) deny(q.__path);
      let entries = Object.entries(bucket(q.__path));
      for (const c of (q.__where || [])) {
        entries = entries.filter(([, v]) => v[c.field] === c.value);
      }
      // A client's unfiltered listing is still scoped to their own org, the
      // way a rules-compatible query must be.
      if (!isAdmin()) {
        entries = entries.filter(([id, v]) =>
          q.__path.startsWith("projects/") ? true : v.orgId === myOrg()
        );
      }
      return { docs: entries.map(([id, v]) => ({ id, data: () => v })) };
    }

    export async function setDoc(ref, val) {
      const parts = ref.__path.split("/"); const id = parts.pop();
      (DB[parts.join("/")] = DB[parts.join("/")] || {})[id] = val;
    }
    export async function addDoc(coll, val) {
      const id = "new-" + Math.random().toString(36).slice(2, 8);
      (DB[coll.__path] = DB[coll.__path] || {})[id] = val;
      return { id };
    }
    export async function updateDoc(ref, patch) {
      const parts = ref.__path.split("/"); const id = parts.pop();
      const b = (DB[parts.join("/")] = DB[parts.join("/")] || {});
      b[id] = { ...(b[id] || {}), ...patch };
    }
    export async function deleteDoc(ref) {
      const parts = ref.__path.split("/"); const id = parts.pop();
      delete (DB[parts.join("/")] || {})[id];
    }
    export function writeBatch() {
      const ops = [];
      return {
        set(ref, val) { ops.push([ref, val]); },
        async commit() { for (const [r, v] of ops) await setDoc(r, v); },
      };
    }
    export function serverTimestamp() {
      const d = new Date();
      return { toDate: () => d, toMillis: () => d.getTime(), __isTs: true };
    }
  `;
}
