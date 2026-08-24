/**
 * Shared Supabase client for all serverless API routes.
 *
 * Uses the SERVICE ROLE key, which bypasses Row Level Security — this module
 * must only ever run server-side (Vercel functions under /api). Never import
 * it from frontend code or expose the key to the client bundle.
 */

import { createClient } from '@supabase/supabase-js';

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let cachedClient = null;

/**
 * Returns a memoized Supabase client authenticated with the service role key.
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 * @throws {Error} when SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set.
 */
export function getSupabase() {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase is not configured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY ' +
        'environment variables must be set (see .env.example).'
    );
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: {
      // Server-side client: no user session to persist or refresh.
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}
