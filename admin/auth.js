/**
 * Auth — single-passcode gate.
 *
 * On first run, the default passcode is "brandmint2026" and is treated as
 * the active one until the CEO sets a new one via Settings. We store only
 * the SHA-256 hash in localStorage, never the cleartext.
 */

const HASH_KEY = "bm.admin.v1.passhash";
const SESSION_KEY = "bm.admin.v1.session";
const DEFAULT_PASS = "brandmint2026";
const SESSION_HOURS = 12;

async function sha256(str) {
  const buf = new TextEncoder().encode(str);
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const auth = {
  async isPasscodeSet() {
    return !!localStorage.getItem(HASH_KEY);
  },
  async setPasscode(plain) {
    const hash = await sha256(plain);
    localStorage.setItem(HASH_KEY, hash);
  },
  async verify(plain) {
    const stored = localStorage.getItem(HASH_KEY);
    const compareTo = stored || (await sha256(DEFAULT_PASS));
    // Mobile keyboards often add a trailing space or autocapitalize the first
    // letter. Try the literal input first, then forgiving variants.
    const candidates = [plain, plain.trim(), plain.trim().toLowerCase()];
    for (const c of candidates) {
      if ((await sha256(c)) === compareTo) return true;
    }
    return false;
  },
  resetToDefault() {
    localStorage.removeItem(HASH_KEY);
  },
  startSession() {
    const expires = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
    localStorage.setItem(SESSION_KEY, String(expires));
  },
  isSessionValid() {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    return Number(raw) > Date.now();
  },
  endSession() {
    localStorage.removeItem(SESSION_KEY);
    // Clear the demo-auth session too so admin sign-out fully signs out the
    // user, not just locks the admin module.
    localStorage.removeItem("bm.demo.session");
  },
};
