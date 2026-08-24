/**
 * GET /api/photos
 *
 * Public endpoint: returns the practitioner's uploaded photo overrides as a
 * map of slot id -> public URL. Slots without an override are simply absent
 * from the map; the frontend falls back to its bundled default asset.
 *
 * Response: 200 { photos: { [slotId]: string } }
 *           500 { error }
 *
 * Cached briefly at the CDN edge — photo changes may take up to a minute to
 * appear publicly.
 */

import { getSupabase } from './_lib/supabase.js';
import { PHOTO_BUCKET, isValidSlot } from './_lib/photoSlots.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('photo_slots')
      .select('slot_id, storage_path');
    if (error) throw error;

    const photos = {};
    for (const row of data || []) {
      if (!isValidSlot(row.slot_id) || !row.storage_path) continue;
      const { data: pub } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(row.storage_path);
      if (pub && pub.publicUrl) photos[row.slot_id] = pub.publicUrl;
    }

    return res.status(200).json({ photos });
  } catch (error) {
    console.error('[photos] failed:', error);
    return res.status(500).json({ error: 'Failed to load photos.' });
  }
}
