/**
 * Admin auth — a thin adapter over the shared Firebase session.
 *
 * This file used to hold a single shared passcode whose hash lived in
 * localStorage, which meant anyone who could open devtools could grant
 * themselves access. It is now purely a view onto /auth/session.js; the
 * real check is `requireRole('admin')` at page load, backed by
 * firestore.rules so a forged client-side session gets an empty result set
 * rather than the CRM.
 */

import {
  getProfile,
  signOut as sessionSignOut,
  requireRole,
  onChange,
} from "/auth/session.js";

let _profile = null;

export const auth = {
  /** Gate the page. Resolves with the admin profile, or navigates away. */
  async requireAdmin() {
    _profile = await requireRole("admin", {
      signIn: "/login",
      denied: "/login?denied=1",
    });
    return _profile;
  },

  /** Cached profile for the current page load. */
  profile() {
    return _profile;
  },

  displayName() {
    return _profile?.fullName || _profile?.email || "Admin";
  },

  email() {
    return _profile?.email || "";
  },

  async refresh() {
    _profile = await getProfile({ force: true });
    return _profile;
  },

  onChange,

  /** Sign out everywhere and return to the public site. */
  endSession() {
    return sessionSignOut("/login?signedout=1");
  },
};
