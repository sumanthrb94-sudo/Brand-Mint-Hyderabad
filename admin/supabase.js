/**
 * Brand Mint Admin — Supabase client.
 *
 * Delegates to the shared session client in /auth/session.js. That matters:
 * the admin used to create its OWN client with `persistSession: false`, which
 * meant every query went out as the anonymous role. Under RLS an anonymous
 * request sees nothing, so the admin has to run on the SAME authenticated
 * client that holds the signed-in user's JWT.
 */

import { getClient as getSharedClient, SUPABASE_URL, SUPABASE_ANON_KEY } from "/auth/session.js";

export function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export async function getClient() {
  if (!isConfigured()) return null;
  return getSharedClient();
}
