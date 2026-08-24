/**
 * GET /api/availability?date=YYYY-MM-DD&duration=60|90
 *
 * Returns the bookable time slots for one day:
 *   200 { date: "YYYY-MM-DD", slots: [{ time: "HH:MM", available: boolean }] }
 *   400 { error: string }  — missing/invalid params, or a past date
 *   500 { error: string }  — unexpected server/DB failure
 *
 * Resolution rules (implemented in _lib/availabilityCore.js):
 *   - date_overrides replace the weekly schedule for the date; is_off blocks it.
 *   - Candidate starts step from opening by slot_increment_minutes while
 *     start + duration fits before closing.
 *   - Confirmed bookings and Google Calendar events block candidates,
 *     expanded by buffer_minutes (30) on both sides.
 *   - Same-day slots starting within 60 minutes of now are hidden.
 */

import { getSupabase } from './_lib/supabase.js';
import {
  computeAvailabilitySlots,
  fetchAvailabilityInputs,
  isValidDateString,
  nowInWarsaw,
} from './_lib/availabilityCore.js';

const ALLOWED_DURATIONS = new Set([60, 90]);

export default async function handler(req, res) {
  // Availability is always computed live — never let any layer cache it.
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { date, duration } = req.query;

    // --- Input validation --------------------------------------------------
    if (!isValidDateString(date)) {
      return res.status(400).json({ error: 'Invalid or missing "date" (expected YYYY-MM-DD).' });
    }

    const durationMinutes = Number(duration);
    if (!ALLOWED_DURATIONS.has(durationMinutes)) {
      return res.status(400).json({ error: 'Invalid or missing "duration" (expected 60 or 90).' });
    }

    // Past dates are never bookable (comparison in studio local time).
    if (date < nowInWarsaw().date) {
      return res.status(400).json({ error: 'Cannot request availability for a past date.' });
    }

    // --- Compute slots ------------------------------------------------------
    const supabase = getSupabase();
    const inputs = await fetchAvailabilityInputs(supabase, date);
    const slots = computeAvailabilitySlots({ date, durationMinutes, ...inputs });

    return res.status(200).json({ date, slots });
  } catch (error) {
    console.error('[availability] failed:', error);
    return res.status(500).json({ error: 'Failed to load availability.' });
  }
}
