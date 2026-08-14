export type AuthProfile = { id: string; role: string } | null | undefined;

/**
 * Decides which profile a session may act on.
 *
 * The auth.me query is cached under a single react-query key for every
 * account — the key carries no account identity — so after a sign-out and a
 * sign-in as somebody else, the previous profile is still in the cache while
 * the new one is being fetched. Reading it during that window renders one
 * person's session with another person's role, which is how a client account
 * reached the CEO dashboard.
 *
 * The profile is therefore only honoured when it belongs to the Firebase
 * account currently signed in. Anything else is treated as not-yet-loaded.
 */
export function resolveSessionProfile<T extends { id: string }>(firebaseUid: string | null | undefined, profile: T | null | undefined): T | null {
  if (!firebaseUid || !profile) return null;
  return profile.id === firebaseUid ? profile : null;
}

export function isProfileStale(firebaseUid: string | null | undefined, profile: AuthProfile): boolean {
  return Boolean(firebaseUid && profile && profile.id !== firebaseUid);
}
