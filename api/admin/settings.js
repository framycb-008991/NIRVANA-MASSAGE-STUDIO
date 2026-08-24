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
/** custom_treatments stores a JSON array of service objects — needs more room. */
const MAX_TREATMENTS_LENGTH = 20000;

/** Slots whose value must be a valid email address. */
const EMAIL_KEYS = new Set(['practitioner_email', 'contact_email']);

/** Validates the custom_treatments JSON payload. Returns an error string or null. */
function validateCustomTreatments(value) {
  if (value === '') return null; // empty = no custom services
  let list;
  try {
    list = JSON.parse(value);
  } catch {
    return 'custom_treatments must be valid JSON.';
  }
  if (!Array.isArray(list) || list.length > 20) {
    return 'custom_treatments must be an array of at most 20 services.';
  }
  for (const item of list) {
    if (!item || typeof item !== 'object') return 'Each custom treatment must be an object.';
    if (typeof item.id !== 'string' || !/^[a-z0-9_]{2,60}$/.test(item.id)) {
      return 'Each custom treatment needs an id of 2-60 lowercase letters, digits or underscores.';
    }
    if (typeof item.name !== 'string' || item.name.trim().length === 0 || item.name.length > 120) {
      return 'Each custom treatment needs a name (max 120 characters).';
    }
    for (const field of ['category', 'shortDesc', 'fullDesc']) {
      if (item[field] != null && (typeof item[field] !== 'string' || item[field].length > 2000)) {
        return `custom_treatments field ${field} must be a string of at most 2000 characters.`;
      }
    }
    if (item.image != null && (typeof item.image !== 'string' || !item.image.startsWith('/assets/'))) {
      return 'custom_treatments image must be a bundled asset path (/assets/...).';
    }
    if (!Array.isArray(item.durations) || item.durations.length < 1 || item.durations.length > 4) {
      return 'Each custom treatment needs 1-4 duration options.';
    }
    for (const d of item.durations) {
      if (!d || typeof d !== 'object' ||
          !Number.isInteger(d.minutes) || d.minutes < 10 || d.minutes > 480 ||
          typeof d.pricePLN !== 'number' || d.pricePLN < 0 ||
          typeof d.priceEUR !== 'number' || d.priceEUR < 0) {
        return 'Each duration needs minutes (10-480), pricePLN and priceEUR numbers.';
      }
    }
  }
  return null;
}

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
  if (key === 'custom_treatments') {
    if (typeof value !== 'string') return 'custom_treatments must be a JSON string.';
    if (value.length > MAX_TREATMENTS_LENGTH) {
      return `custom_treatments is too long (max ${MAX_TREATMENTS_LENGTH} characters).`;
    }
    return validateCustomTreatments(value);
  }
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
