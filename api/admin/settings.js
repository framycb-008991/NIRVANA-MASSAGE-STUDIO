/**
 * GET /api/admin/settings
 *   -> { practitionerEmail: string, content: { [key]: string } }
 *
 * PUT /api/admin/settings
 *   body: { practitionerEmail?: string, content?: { [key]: string } }
 *   -> same shape as GET (after upserting)
 *
 * Admin-only settings endpoint. Manages every editable site-content slot
 * (contact phone/email/address, Instagram handle) plus the practitioner
 * notification email. Protected by admin auth: an
 * `Authorization: Bearer <session-token>` header (see /api/admin/login)
 * or the legacy `x-admin-key` shared-secret header.
 *
 * Responses:
 *   200 { practitionerEmail, content }
 *   400 { error: string } — invalid key/value on PUT
 *   401 { error: string } — missing/wrong credentials
 *   405 { error: string } — unsupported method
 *   500 { error: string } — unexpected server/DB failure
 */

import { getSupabase } from '../_lib/supabase.js';
import { verifyAdminRequest } from '../_lib/auth.js';
import { CONTENT_SLOTS, isContentKey, getContentDefault } from '../_lib/contentSlots.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_VALUE_LENGTH = 300;

/** Slots whose value must be a valid email address. */
const EMAIL_KEYS = new Set(['practitioner_email', 'contact_email']);

/** Reads all slots from the DB and returns them merged over the defaults. */
async function loadAllSettings(supabase) {
  const { data, error } = await supabase.from('settings').select('key, value');
  if (error) throw error;

  const overrides = new Map((data || []).map((row) => [row.key, row.value]));

  const content = {};
  for (const slot of CONTENT_SLOTS) {
    if (slot.key === 'practitioner_email') continue;
    content[slot.key] = overrides.get(slot.key) || getContentDefault(slot.key);
  }

  return {
    practitionerEmail:
      overrides.get('practitioner_email') ||
      process.env.PRACTITIONER_EMAIL ||
      getContentDefault('practitioner_email'),
    content,
  };
}

/** Validates one content entry. Returns an error string or null. */
function validateContentEntry(key, value) {
  if (!isContentKey(key)) return `Unknown settings key: ${key}`;
  if (typeof value !== 'string' || value.trim().length === 0) {
    return `Value for ${key} must be a non-empty string.`;
  }
  if (value.length > MAX_VALUE_LENGTH) {
    return `Value for ${key} is too long (max ${MAX_VALUE_LENGTH} characters).`;
  }
  if (EMAIL_KEYS.has(key) && !EMAIL_PATTERN.test(value.trim())) {
    return `Value for ${key} must be a valid email address.`;
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!verifyAdminRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    const supabase = getSupabase();

    if (req.method === 'GET') {
      return res.status(200).json(await loadAllSettings(supabase));
    }

    if (req.method === 'PUT') {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const rows = [];
      const now = new Date().toISOString();

      // Legacy single-field form: { practitionerEmail }
      if (body.practitionerEmail != null) {
        const err = validateContentEntry('practitioner_email', body.practitionerEmail);
        if (err) return res.status(400).json({ error: err });
        rows.push({ key: 'practitioner_email', value: body.practitionerEmail.trim(), updated_at: now });
      }

      // Content map form: { content: { key: value, ... } }
      if (body.content != null) {
        if (typeof body.content !== 'object' || Array.isArray(body.content)) {
          return res.status(400).json({ error: 'content must be an object of key/value pairs.' });
        }
        for (const [key, value] of Object.entries(body.content)) {
          const err = validateContentEntry(key, value);
          if (err) return res.status(400).json({ error: err });
          rows.push({ key, value: String(value).trim(), updated_at: now });
        }
      }

      if (rows.length === 0) {
        return res.status(400).json({ error: 'Nothing to update: provide practitionerEmail and/or content.' });
      }

      const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' });
      if (error) throw error;

      return res.status(200).json(await loadAllSettings(supabase));
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[admin/settings] failed:', error);
    return res.status(500).json({ error: 'Failed to process the settings request.' });
  }
}
