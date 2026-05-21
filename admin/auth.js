/**
 * Brand Mint Admin — Auth.
 *
 * Supabase email + password with an `admins` allowlist gate. A user can only
 * enter the admin panel if (a) they sign in successfully AND (b) their
 * auth.uid() exists in public.admins (verified server-side by RLS — the
 * .single() call below will return PGRST116 if they're not in the table).
 *
 * Exposes:
 *   auth.bootstrap()    -> resolves the current state on page load
 *   auth.signIn(email, password)
 *   auth.signOut()
 *   auth.getUser()      -> { id, email } or null
 *   auth.isAdmin()      -> boolean (cached after sign-in)
 */

import { getClient, isConfigured } from "/admin/supabase.js";

let _user = null;
let _isAdmin = false;

async function refreshAdminFlag() {
  if (!_user) {
    _isAdmin = false;
    return false;
  }
  const sb = await getClient();
  if (!sb) {
    _isAdmin = false;
    return false;
  }
  const { data, error } = await sb
    .from("admins")
    .select("user_id")
    .eq("user_id", _user.id)
    .maybeSingle();
  _isAdmin = !error && !!data;
  return _isAdmin;
}

export const auth = {
  async bootstrap() {
    if (!isConfigured()) {
      return { user: null, isAdmin: false, configured: false };
    }
    const sb = await getClient();
    const { data } = await sb.auth.getSession();
    _user = data.session?.user
      ? { id: data.session.user.id, email: data.session.user.email }
      : null;
    await refreshAdminFlag();

    // Keep cached state in sync with token refresh / sign-out from other tabs.
    sb.auth.onAuthStateChange(async (_event, session) => {
      _user = session?.user
        ? { id: session.user.id, email: session.user.email }
        : null;
      await refreshAdminFlag();
    });

    return { user: _user, isAdmin: _isAdmin, configured: true };
  },

  async signIn(email, password) {
    const sb = await getClient();
    if (!sb) throw new Error("Supabase not configured.");
    const { data, error } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    _user = { id: data.user.id, email: data.user.email };
    const isAdmin = await refreshAdminFlag();
    if (!isAdmin) {
      // Sign out immediately so a non-admin can't sit on a half-session.
      await sb.auth.signOut();
      _user = null;
      throw new Error(
        "This account isn't authorised for admin. Contact the owner."
      );
    }
    return _user;
  },

  async signOut() {
    const sb = await getClient();
    if (sb) await sb.auth.signOut();
    _user = null;
    _isAdmin = false;
  },

  getUser() {
    return _user;
  },

  isAdmin() {
    return _isAdmin;
  },
};
