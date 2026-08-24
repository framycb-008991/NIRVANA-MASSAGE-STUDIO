/**
 * GET /api/admin/settings          -> { practitionerEmail: string }
 * PUT /api/admin/settings  { practitionerEmail: string } -> { practitionerEmail: string }
 *
 * Admin-only settings endpoint. Both methods are protected by the shared
 * secret: the `x-admin-key` header must equal the ADMIN_API_KEY env var.
 *
 * Responses:
 *   200 { practitionerEmail: string }
 *   400 { error: string } — invalid email on PUT
 *   401 { error: string } — missing/wrong admin key
 *   405 { error: string } — unsupported method
 *   500 { error: string } — unexpected server/DB failure
 */

import { getSupabase } from '../_lib/supabase.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SETTINGS_KEY = 'practitioner_email';
const DEFAULT_PRACTITIONER_EMAIL = 'heorhiievaalina@gmail.com';

/** Constant-shape admin key check (401 on mismatch or missing env config). */
function isAuthorized(req) {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) return false;
  return req.headers['x-admin-key'] === expected;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    const supabase = getSupabase();

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', SETTINGS_KEY)
        .maybeSingle();
      if (error) throw error;

      // Fall back to env/default if the row was never seeded.
      const practitionerEmail =
        (data && data.value) || process.env.PRACTITIONER_EMAIL || DEFAULT_PRACTITIONER_EMAIL;
      return res.status(200).json({ practitionerEmail });
    }

    if (req.method === 'PUT') {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const practitionerEmail =
        typeof body.practitionerEmail === 'string' ? body.practitionerEmail.trim() : '';

      if (!EMAIL_PATTERN.test(practitionerEmail)) {
        return res.status(400).json({ error: 'practitionerEmail must be a valid email address.' });
      }

      const { error } = await supabase.from('settings').upsert(
        { key: SETTINGS_KEY, value: practitionerEmail, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
      if (error) throw error;

      return res.status(200).json({ practitionerEmail });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[admin/settings] failed:', error);
    return res.status(500).json({ error: 'Failed to process the settings request.' });
  }
}
