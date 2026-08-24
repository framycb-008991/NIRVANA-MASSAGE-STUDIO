/**
 * GET /api/content
 *
 * Public endpoint: returns the current values of the public site-content
 * slots (phone, email, address, Instagram handle) as `key -> value`. Slots
 * without a saved override return their built-in default. Admin-only slots
 * (e.g. the practitioner notification email) are never exposed here.
 *
 * Response: 200 { content: { [key]: string } }
 *           500 { error }
 */

import { getSupabase } from './_lib/supabase.js';
import { getPublicContentKeys, getContentDefault } from './_lib/contentSlots.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  try {
    const supabase = getSupabase();
    const publicKeys = getPublicContentKeys();

    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', publicKeys);
    if (error) throw error;

    const overrides = new Map((data || []).map((row) => [row.key, row.value]));

    const content = {};
    for (const key of publicKeys) {
      content[key] = overrides.get(key) || getContentDefault(key);
    }

    return res.status(200).json({ content });
  } catch (error) {
    console.error('[content] failed:', error);
    return res.status(500).json({ error: 'Failed to load site content.' });
  }
}
