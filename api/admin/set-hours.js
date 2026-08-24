/**
 * POST /api/admin/set-hours
 *
 * Admin endpoint for managing the studio schedule. Protected by a shared
 * secret: the `x-admin-key` header must equal the ADMIN_API_KEY env var.
 *
 * Body variants:
 *   { type: "weekly", hours: [{ dayOfWeek, isWorking, startTime, endTime,
 *                               bufferMinutes?, slotIncrementMinutes? }] }
 *     -> upserts working_hours rows (one per weekday).
 *
 *   { type: "override", override: { date, isOff, startTime?, endTime?, reason? } }
 *     -> upserts a date_overrides row for that date.
 *
 *   { type: "override-delete", date: "YYYY-MM-DD" }
 *     -> deletes the override for that date (no error if none exists).
 *
 * Responses:
 *   200 { ok: true }
 *   400 { error: string } — validation failure
 *   401 { error: string } — missing/wrong admin key
 *   500 { error: string } — unexpected server/DB failure
 */

import { getSupabase } from '../_lib/supabase.js';
import { isValidDateString, isValidTimeString } from '../_lib/availabilityCore.js';

/** Constant-shape admin key check (401 on mismatch or missing env config). */
function isAuthorized(req) {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) return false; // safer to lock the endpoint than to leave it open
  return req.headers['x-admin-key'] === expected;
}

/** Validates and normalizes one weekly-hours entry. Returns error string or row. */
function parseWeeklyHoursEntry(entry) {
  if (!entry || typeof entry !== 'object') return 'Each hours entry must be an object.';

  const dayOfWeek = Number(entry.dayOfWeek);
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return 'dayOfWeek must be an integer between 0 (Sunday) and 6 (Saturday).';
  }

  const isWorking = Boolean(entry.isWorking);

  const row = {
    day_of_week: dayOfWeek,
    is_working: isWorking,
    start_time: null,
    end_time: null,
    buffer_minutes: 30,
    slot_increment_minutes: 90,
  };

  if (isWorking) {
    if (!isValidTimeString(entry.startTime) || !isValidTimeString(entry.endTime)) {
      return `startTime and endTime (HH:MM) are required for working day ${dayOfWeek}.`;
    }
    if (entry.endTime <= entry.startTime) {
      return `endTime must be after startTime for day ${dayOfWeek}.`;
    }
    row.start_time = entry.startTime;
    row.end_time = entry.endTime;
  }

  if (entry.bufferMinutes != null) {
    const buffer = Number(entry.bufferMinutes);
    if (!Number.isInteger(buffer) || buffer < 0) return 'bufferMinutes must be a non-negative integer.';
    row.buffer_minutes = buffer;
  }

  if (entry.slotIncrementMinutes != null) {
    const increment = Number(entry.slotIncrementMinutes);
    if (!Number.isInteger(increment) || increment <= 0) {
      return 'slotIncrementMinutes must be a positive integer.';
    }
    row.slot_increment_minutes = increment;
  }

  return row;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    const supabase = getSupabase();
    const body = req.body && typeof req.body === 'object' ? req.body : {};

    switch (body.type) {
      // ---- Replace/merge the weekly schedule ------------------------------
      case 'weekly': {
        if (!Array.isArray(body.hours) || body.hours.length === 0) {
          return res.status(400).json({ error: 'hours must be a non-empty array.' });
        }
        if (body.hours.length > 7) {
          return res.status(400).json({ error: 'hours may contain at most 7 entries (one per weekday).' });
        }

        const seenDays = new Set();
        const rows = [];
        for (const entry of body.hours) {
          const parsed = parseWeeklyHoursEntry(entry);
          if (typeof parsed === 'string') return res.status(400).json({ error: parsed });
          if (seenDays.has(parsed.day_of_week)) {
            return res.status(400).json({ error: `Duplicate dayOfWeek ${parsed.day_of_week}.` });
          }
          seenDays.add(parsed.day_of_week);
          rows.push({ ...parsed, updated_at: new Date().toISOString() });
        }

        const { error } = await supabase
          .from('working_hours')
          .upsert(rows, { onConflict: 'day_of_week' });
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }

      // ---- Add/replace a single-date override ------------------------------
      case 'override': {
        const override = body.override && typeof body.override === 'object' ? body.override : {};
        if (!isValidDateString(override.date)) {
          return res.status(400).json({ error: 'override.date must be a valid YYYY-MM-DD date.' });
        }

        const isOff = Boolean(override.isOff);
        const row = {
          override_date: override.date,
          is_off: isOff,
          start_time: null,
          end_time: null,
          reason: typeof override.reason === 'string' ? override.reason.trim() || null : null,
        };

        if (!isOff) {
          // Custom hours replace the weekly schedule for this date.
          if (!isValidTimeString(override.startTime) || !isValidTimeString(override.endTime)) {
            return res
              .status(400)
              .json({ error: 'override.startTime and override.endTime (HH:MM) are required unless isOff is true.' });
          }
          if (override.endTime <= override.startTime) {
            return res.status(400).json({ error: 'override.endTime must be after override.startTime.' });
          }
          row.start_time = override.startTime;
          row.end_time = override.endTime;
        }

        const { error } = await supabase
          .from('date_overrides')
          .upsert(row, { onConflict: 'override_date' });
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }

      // ---- Remove a single-date override ------------------------------------
      case 'override-delete': {
        if (!isValidDateString(body.date)) {
          return res.status(400).json({ error: 'date must be a valid YYYY-MM-DD date.' });
        }
        const { error } = await supabase
          .from('date_overrides')
          .delete()
          .eq('override_date', body.date);
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }

      default:
        return res
          .status(400)
          .json({ error: "type must be one of 'weekly', 'override', 'override-delete'." });
    }
  } catch (error) {
    console.error('[admin/set-hours] failed:', error);
    return res.status(500).json({ error: 'Failed to update the schedule.' });
  }
}
