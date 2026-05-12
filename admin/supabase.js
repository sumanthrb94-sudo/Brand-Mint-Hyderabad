/**
 * Brand Mint Admin — Supabase client singleton.
 *
 * Loads supabase-js v2 from esm.sh (no build step needed). Falls back to a
 * no-op stub if config is missing so the admin still works offline-only.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "/admin/config.js";

let _client = null;
let _loadPromise = null;

export function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export async function getClient() {
  if (!isConfigured()) return null;
  if (_client) return _client;
  if (!_loadPromise) {
    _loadPromise = import("https://esm.sh/@supabase/supabase-js@2").then(
      ({ createClient }) => {
        _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false },
        });
        return _client;
      }
    );
  }
  return _loadPromise;
}
