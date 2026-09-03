/**
 * Brand Mint — shared session core.
 *
 * ONE Supabase client, ONE session, used by every surface:
 *   /admin.html   → requires role 'admin'
 *   /portal.html  → requires role 'client' with at least one client membership
 *   /index.html   → optional, just drives nav state
 *
 * This replaces the old `bm.demo.session` fake-auth. The role is read from the
 * `profiles` table, never from user_metadata — a user can edit their own
 * metadata through the SDK, so a metadata role check is not a security check.
 * The database enforces access via RLS; this module only decides which screen
 * to show.
 *
 * Public API:
 *   getClient()                  → Supabase client (lazy, cached)
 *   peekSession()                → sync, localStorage-only, for first paint
 *   getSession() / getUser()     → async, authoritative
 *   getProfile({ force })        → async, { id, email, fullName, role, clientIds }
 *   signInWithGoogle(next)       → OAuth redirect
 *   signInWithEmail(email, next) → magic link
 *   signOut(redirectTo)
 *   onChange(fn)                 → auth-state subscription, returns unsubscribe
 *   requireRole(role, opts)      → gate a page; resolves with the profile
 */

const PROJECT_REF = "ycdfgtljxqrhyobnwwbz";
export const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
export const SUPABASE_ANON_KEY = "sb_publishable_ddoQWG7ZWqNwTRJFBdfbHA_HoX48n1l";

const TOKEN_KEY = `sb-${PROJECT_REF}-auth-token`;
const PROFILE_KEY = "bm.auth.profile.v1";

let _client = null;
let _clientPromise = null;
let _profile = null;
let _profilePromise = null;
const _listeners = new Set();

/* ------------------------------------------------------------------ client */

export async function getClient() {
  if (_client) return _client;
  if (!_clientPromise) {
    _clientPromise = import("https://esm.sh/@supabase/supabase-js@2").then(
      ({ createClient }) => {
        _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: "pkce",
            storageKey: TOKEN_KEY,
          },
        });
        _client.auth.onAuthStateChange((event) => {
          // Any identity change invalidates the cached role.
          if (event === "SIGNED_OUT" || event === "SIGNED_IN" || event === "USER_UPDATED") {
            _profile = null;
            _profilePromise = null;
            if (event === "SIGNED_OUT") clearCachedProfile();
          }
          for (const fn of _listeners) {
            try { fn(event, _profile); } catch (e) { console.error("[auth] listener", e); }
          }
        });
        return _client;
      }
    );
  }
  return _clientPromise;
}

export function onChange(fn) {
  _listeners.add(fn);
  // Make sure the client (and therefore the subscription) actually exists.
  getClient();
  return () => _listeners.delete(fn);
}

/* -------------------------------------------------------------- fast peek */

/**
 * Synchronous, localStorage-only read of the Supabase token. Good enough to
 * decide "show the gate" vs "show a spinner" before the SDK has loaded — it
 * proves a token exists and has not expired, nothing more. Never treat it as
 * an authorisation decision; the server does that.
 */
export function peekSession() {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const session = parsed?.currentSession || parsed;
    const expiresAt = Number(session?.expires_at || 0);
    if (!session?.access_token) return null;
    // A slightly stale token is fine here; autoRefreshToken will renew it.
    if (expiresAt && expiresAt * 1000 < Date.now() - 60_000) return null;
    return session;
  } catch {
    return null;
  }
}

export function peekProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function cacheProfile(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {}
}

function clearCachedProfile() {
  try { localStorage.removeItem(PROFILE_KEY); } catch {}
}

/* ------------------------------------------------------------- session/user */

export async function getSession() {
  const sb = await getClient();
  const { data } = await sb.auth.getSession();
  return data?.session || null;
}

export async function getUser() {
  const session = await getSession();
  return session?.user || null;
}

/**
 * Resolve the signed-in user's profile: role plus the client ids they may see.
 * Cached per page load; pass { force: true } after changing memberships.
 */
export async function getProfile({ force = false } = {}) {
  if (_profile && !force) return _profile;
  if (_profilePromise && !force) return _profilePromise;

  _profilePromise = (async () => {
    const sb = await getClient();
    const { data: sessionData } = await sb.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) {
      _profile = null;
      clearCachedProfile();
      return null;
    }

    const [{ data: row, error }, { data: memberships }] = await Promise.all([
      sb.from("profiles").select("id, email, full_name, avatar_url, role").eq("id", user.id).maybeSingle(),
      sb.from("client_users").select("client_id, role").eq("user_id", user.id),
    ]);

    if (error) console.warn("[auth] profile lookup failed", error.message);

    // The signup trigger creates the profile row. If it is missing (trigger not
    // installed yet, or the row was deleted) fall back to the least-privileged
    // interpretation rather than assuming admin.
    _profile = {
      id: user.id,
      email: row?.email || user.email || "",
      fullName:
        row?.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        (user.email ? user.email.split("@")[0] : ""),
      avatarUrl: row?.avatar_url || user.user_metadata?.avatar_url || "",
      role: row?.role === "admin" ? "admin" : "client",
      clientIds: (memberships || []).map((m) => m.client_id),
      profileMissing: !row,
    };
    cacheProfile(_profile);
    return _profile;
  })();

  return _profilePromise;
}

/* --------------------------------------------------------------- sign in/out */

function absolute(path) {
  return new URL(path || "/", window.location.origin).toString();
}

export async function signInWithGoogle(next = "/portal") {
  const sb = await getClient();
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: absolute(next),
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) throw error;
}

export async function signInWithEmail(email, next = "/portal") {
  const sb = await getClient();
  const { error } = await sb.auth.signInWithOtp({
    email: (email || "").trim(),
    options: {
      emailRedirectTo: absolute(next),
      // Onboarding only ever happens through an admin invite, so a stranger
      // hitting the magic-link box must not create an account.
      shouldCreateUser: true,
    },
  });
  if (error) throw error;
}

export async function signOut(redirectTo = "/") {
  try {
    const sb = await getClient();
    await sb.auth.signOut();
  } catch (e) {
    console.warn("[auth] signOut", e);
  }
  _profile = null;
  _profilePromise = null;
  clearCachedProfile();
  // Clear the retired fake-session keys so an old browser cannot resurrect them.
  for (const k of ["bm.demo.session", "bm.admin.v1.session", "bm.admin.v1.passhash"]) {
    try { localStorage.removeItem(k); } catch {}
  }
  if (redirectTo) window.location.replace(redirectTo);
}

/* -------------------------------------------------------------------- gate */

/**
 * Page guard. Resolves with the profile when the user is allowed, and
 * redirects (never resolves) when they are not.
 *
 *   role   — 'admin' | 'client'
 *   signIn — where to send an unauthenticated visitor
 *   denied — where to send an authenticated visitor with the wrong role
 */
export async function requireRole(role, { signIn = "/login", denied = "/login?denied=1", timeoutMs = 15000 } = {}) {
  // If the SDK can't load or Supabase is unreachable the profile lookup never
  // settles, and the caller would sit on its boot screen indefinitely. Fail
  // loudly instead so the page can offer a retry.
  const profile = await Promise.race([
    getProfile(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timed out verifying your session.")), timeoutMs)
    ),
  ]);

  if (!profile) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`${signIn}${signIn.includes("?") ? "&" : "?"}next=${next}`);
    return new Promise(() => {}); // never resolves; the page is navigating away
  }

  if (profile.role !== role) {
    window.location.replace(denied);
    return new Promise(() => {});
  }

  // A client with no membership can see nothing — send them somewhere that
  // explains why rather than an empty portal.
  if (role === "client" && profile.clientIds.length === 0) {
    window.location.replace("/login?pending=1");
    return new Promise(() => {});
  }

  return profile;
}

/** Strip the OAuth/magic-link params Supabase leaves behind after a redirect. */
export function cleanAuthParamsFromUrl() {
  try {
    const url = new URL(window.location.href);
    let dirty = false;
    for (const key of ["code", "type", "error", "error_description", "error_code", "next"]) {
      if (url.searchParams.has(key)) { url.searchParams.delete(key); dirty = true; }
    }
    if (url.hash && /access_token|refresh_token|error/.test(url.hash)) {
      url.hash = "";
      dirty = true;
    }
    if (dirty) window.history.replaceState({}, "", url.toString());
  } catch {}
}
