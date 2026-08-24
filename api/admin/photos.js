/**
 * POST   /api/admin/photos   — upload/replace the image for a photo slot
 * DELETE /api/admin/photos   — remove the override, reverting the slot to its
 *                              bundled default asset
 *
 * Admin-only: requires `Authorization: Bearer <session-token>` (see
 * /api/admin/login) or the legacy `x-admin-key` header.
 *
 * POST body: {
 *   slot: string,          // one of the registry slots (api/_lib/photoSlots.js)
 *   fileName: string,      // original file name (used for the extension)
 *   contentType: string,   // image/jpeg | image/png | image/webp
 *   dataBase64: string,    // raw file bytes, base64-encoded (max ~10 MB decoded)
 *   alt?: string           // optional alt text stored with the override
 * }
 * POST response:   200 { slot, url }
 * DELETE body:     { slot: string }
 * DELETE response: 200 { ok: true }
 * Errors: 400 validation · 401 unauthorized · 413 too large · 500 server
 */

import { getSupabase } from '../_lib/supabase.js';
import { verifyAdminRequest } from '../_lib/auth.js';
import { PHOTO_BUCKET, isValidSlot } from '../_lib/photoSlots.js';

const ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB decoded

/** Strips a directory traversal / odd chars from an uploaded file name. */
function safeFileName(name) {
  const base = String(name || 'photo').split(/[\\/]/).pop() || 'photo';
  return base.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-80);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!verifyAdminRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    const supabase = getSupabase();
    const body = req.body && typeof req.body === 'object' ? req.body : {};

    // ---- Upload / replace -------------------------------------------------
    if (req.method === 'POST') {
      const { slot, fileName, contentType, dataBase64, alt } = body;

      if (!isValidSlot(slot)) {
        return res.status(400).json({ error: 'Unknown photo slot.' });
      }
      const ext = ALLOWED_TYPES[contentType];
      if (!ext) {
        return res.status(400).json({ error: 'contentType must be image/jpeg, image/png, or image/webp.' });
      }
      if (typeof dataBase64 !== 'string' || dataBase64.length === 0) {
        return res.status(400).json({ error: 'dataBase64 is required.' });
      }

      let buffer;
      try {
        buffer = Buffer.from(dataBase64, 'base64');
      } catch {
        return res.status(400).json({ error: 'dataBase64 is not valid base64.' });
      }
      if (buffer.length === 0) {
        return res.status(400).json({ error: 'Uploaded file is empty.' });
      }
      if (buffer.length > MAX_BYTES) {
        return res.status(413).json({ error: 'Image is too large (max 10 MB).' });
      }

      const storagePath = `${slot}/${Date.now()}-${safeFileName(fileName)}`;

      const { error: uploadError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(storagePath, buffer, { contentType, upsert: false });
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('photo_slots').upsert(
        {
          slot_id: slot,
          storage_path: storagePath,
          alt_text: typeof alt === 'string' ? alt.trim() || null : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'slot_id' }
      );
      if (dbError) throw dbError;

      const { data: pub } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(storagePath);
      return res.status(200).json({ slot, url: pub.publicUrl });
    }

    // ---- Reset to default ---------------------------------------------------
    if (req.method === 'DELETE') {
      const { slot } = body;
      if (!isValidSlot(slot)) {
        return res.status(400).json({ error: 'Unknown photo slot.' });
      }

      // Look up the current override so the file can be removed best-effort.
      const { data: existing, error: readError } = await supabase
        .from('photo_slots')
        .select('storage_path')
        .eq('slot_id', slot)
        .maybeSingle();
      if (readError) throw readError;

      const { error: deleteError } = await supabase
        .from('photo_slots')
        .delete()
        .eq('slot_id', slot);
      if (deleteError) throw deleteError;

      if (existing && existing.storage_path) {
        const { error: storageError } = await supabase.storage
          .from(PHOTO_BUCKET)
          .remove([existing.storage_path]);
        if (storageError) console.warn('[admin/photos] file cleanup failed:', storageError.message);
      }

      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[admin/photos] failed:', error);
    return res.status(500).json({ error: 'Failed to process the photo request.' });
  }
}
