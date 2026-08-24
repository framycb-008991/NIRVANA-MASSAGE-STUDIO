/**
 * GET /api/hours
 *
 * Public endpoint: returns the studio's weekly working hours (one row per
 * weekday, 0 = Sunday .. 6 = Saturday) from the working_hours table. Used by
 * the public site to render the opening-hours display and by the booking
 * calendar to generate slots. Falls back to the seeded defaults when the
 * table is empty.
 *
 * Response: 200 { hours: [{ dayOfWeek, isWorking, startTime, endTime,
 *                           bufferMinutes, slotIncrementMinutes }] }
 *           500 { error }
 */

import { getSupabase } from './_lib/supabase.js';

// Seeded defaults — must match supabase/schema.sql and src/services/hours.ts.
const DEFAULT_HOURS = [
  { dayOfWeek: 0, isWorking: true, startTime: '09:00', endTime: '21:00' }, // Sunday
  { dayOfWeek: 1, isWorking: true, startTime: '08:00', endTime: '14:00' }, // Monday
  { dayOfWeek: 2, isWorking: true, startTime: '14:30', endTime: '22:00' }, // Tuesday
  { dayOfWeek: 3, isWorking: true, startTime: '14:30', endTime: '22:00' }, // Wednesday
  { dayOfWeek: 4, isWorking: true, startTime: '14:30', endTime: '22:00' }, // Thursday
  { dayOfWeek: 5, isWorking: true, startTime: '08:00', endTime: '14:00' }, // Friday
  { dayOfWeek: 6, isWorking: true, startTime: '09:00', endTime: '21:00' }, // Saturday
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('working_hours')
      .select('day_of_week, is_working, start_time, end_time, buffer_minutes, slot_increment_minutes');
    if (error) throw error;

    const rows = new Map((data || []).map((row) => [row.day_of_week, row]));

    const hours = DEFAULT_HOURS.map((def) => {
      const row = rows.get(def.dayOfWeek);
      if (!row) return { ...def, bufferMinutes: 30, slotIncrementMinutes: 90 };
      return {
        dayOfWeek: row.day_of_week,
        isWorking: row.is_working,
        startTime: row.start_time ? String(row.start_time).slice(0, 5) : def.startTime,
        endTime: row.end_time ? String(row.end_time).slice(0, 5) : def.endTime,
        bufferMinutes: row.buffer_minutes ?? 30,
        slotIncrementMinutes: row.slot_increment_minutes ?? 90,
      };
    });

    return res.status(200).json({ hours });
  } catch (error) {
    console.error('[hours] failed:', error);
    return res.status(500).json({ error: 'Failed to load working hours.' });
  }
}
