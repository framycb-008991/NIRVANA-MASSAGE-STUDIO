/**
 * Shared availability engine used by both public and admin-facing routes:
 *   - api/availability.js      (GET: list candidate slots for a day)
 *   - api/create-booking.js    (POST: re-verify a slot before inserting)
 *
 * Everything here is pure (no I/O) except `new Date()` defaults, so the logic
 * stays trivially testable and identical between the two routes.
 *
 * The studio operates in Europe/Warsaw; booking_date/start_time are stored as
 * Warsaw wall-clock values, so all comparisons are done by converting Warsaw
 * local date/times to absolute UTC instants before checking overlaps.
 */

/**
 * Fetches everything computeAvailabilitySlots() needs for one date:
 * the weekly working_hours row, any date_overrides row, confirmed bookings,
 * and busy Google Calendar events for the day (Warsaw-local boundaries).
 *
 * Kept here (not in the routes) so availability.js and create-booking.js can
 * never drift apart in how they gather availability inputs.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase service-role client
 * @param {string} date `YYYY-MM-DD`
 * @returns {Promise<{
 *   weeklyHours: object|null,
 *   override: object|null,
 *   bookings: Array<object>,
 *   calendarEvents: Array<{ start: Date, end: Date, summary: string }>,
 * }>}
 */
export async function fetchAvailabilityInputs(supabase, date) {
  // Weekday of the date (timezone-independent: derived from the UTC calendar day).
  const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();

  const [hoursResult, overrideResult, bookingsResult] = await Promise.all([
    supabase.from('working_hours').select('*').eq('day_of_week', dayOfWeek).maybeSingle(),
    supabase.from('date_overrides').select('*').eq('override_date', date).maybeSingle(),
    supabase
      .from('bookings')
      .select('start_time, duration_minutes')
      .eq('booking_date', date)
      .eq('status', 'confirmed'),
  ]);

  if (hoursResult.error) throw hoursResult.error;
  if (overrideResult.error) throw overrideResult.error;
  if (bookingsResult.error) throw bookingsResult.error;

  // Google Calendar busy events spanning the whole Warsaw-local day.
  // Imported lazily so the pure helpers above stay dependency-free and the
  // calendar module's graceful-degradation path applies here too.
  const { getCalendarEvents } = await import('./googleCalendar.js');
  const dayStart = warsawToUtc(date, '00:00');
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const calendarEvents = await getCalendarEvents(dayStart.toISOString(), dayEnd.toISOString());

  return {
    weeklyHours: hoursResult.data,
    override: overrideResult.data,
    bookings: bookingsResult.data || [],
    calendarEvents,
  };
}

/** IANA timezone of the studio. */
export const STUDIO_TIMEZONE = 'Europe/Warsaw';

/** Fixed deposit required for every booking, in PLN. */
export const DEPOSIT_PLN = 50;

/** Slots must start at least this many minutes in the future (same-day rule). */
export const MIN_LEAD_MINUTES = 60;

/** Formatter used to derive Warsaw wall-clock parts from a UTC instant. */
const warsawFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: STUDIO_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  hourCycle: 'h23',
});

/**
 * Validates a strict `YYYY-MM-DD` date string (also rejects impossible dates
 * such as 2025-02-30).
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * Validates a `HH:MM` (or `HH:MM:SS`) 24-hour time string.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidTimeString(value) {
  if (typeof value !== 'string') return false;
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
}

/**
 * Parses a `HH:MM` or `HH:MM:SS` time string into minutes since midnight.
 *
 * @param {string} time
 * @returns {number} minutes since midnight
 */
export function parseTimeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Formats minutes since midnight as `HH:MM`.
 *
 * @param {number} minutes
 * @returns {string}
 */
export function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Returns today's date (`YYYY-MM-DD`) and current time (minutes since
 * midnight) in the studio timezone.
 *
 * @param {Date} [now]
 * @returns {{ date: string, minutes: number }}
 */
export function nowInWarsaw(now = new Date()) {
  const parts = {};
  for (const part of warsawFormatter.formatToParts(now)) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

/**
 * Converts a Warsaw wall-clock date + time to the corresponding UTC instant.
 * Handles DST (CET/CEST) by measuring the zone offset at that moment.
 *
 * @param {string} dateStr  `YYYY-MM-DD`
 * @param {string} timeStr  `HH:MM` or `HH:MM:SS`
 * @returns {Date}
 */
export function warsawToUtc(dateStr, timeStr) {
  const normalized = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  // First guess: interpret the wall-clock as if it were UTC.
  const guessMs = Date.parse(`${dateStr}T${normalized}Z`);
  // What Warsaw wall-clock does that guess actually correspond to?
  const parts = {};
  for (const part of warsawFormatter.formatToParts(new Date(guessMs))) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }
  const warsawAsUtcMs = Date.parse(
    `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`
  );
  // offset = how far Warsaw wall-clock is ahead of UTC at that instant.
  const offsetMs = warsawAsUtcMs - guessMs;
  return new Date(guessMs - offsetMs);
}

/**
 * Generates candidate slot start times (`HH:MM`) stepping from `openMin`
 * by `incrementMin`, keeping only starts where start + duration <= closeMin.
 *
 * @param {number} openMin      opening time, minutes since midnight
 * @param {number} closeMin     closing time, minutes since midnight
 * @param {number} durationMin  treatment duration in minutes
 * @param {number} incrementMin step between candidate starts
 * @returns {string[]}
 */
export function generateCandidateSlots(openMin, closeMin, durationMin, incrementMin) {
  const slots = [];
  for (let start = openMin; start + durationMin <= closeMin; start += incrementMin) {
    slots.push(minutesToTime(start));
  }
  return slots;
}

/**
 * Half-open interval overlap test: [aStart, aEnd) vs [bStart, bEnd).
 *
 * @param {Date} aStart @param {Date} aEnd @param {Date} bStart @param {Date} bEnd
 * @returns {boolean}
 */
export function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Computes the full availability picture for one date.
 *
 * Resolution order for the day's opening hours:
 *   1. date_overrides row: is_off -> closed; otherwise its custom start/end.
 *   2. working_hours row for the weekday (is_working=false -> closed).
 *   3. No row at all -> closed.
 *
 * A candidate slot is unavailable when it overlaps ANY busy interval
 * (confirmed booking or Google Calendar event) expanded by `buffer_minutes`
 * on both sides. Same-day slots starting within MIN_LEAD_MINUTES of now are
 * hidden entirely (not returned).
 *
 * @param {object} input
 * @param {string} input.date               `YYYY-MM-DD` (already validated, not in the past)
 * @param {number} input.durationMinutes    60 or 90
 * @param {object|null} input.weeklyHours   working_hours row for the weekday (or null)
 * @param {object|null} input.override      date_overrides row for the date (or null)
 * @param {Array<{start_time: string, duration_minutes: number}>} input.bookings
 *                                          confirmed bookings for the date
 * @param {Array<{start: Date, end: Date}>} input.calendarEvents busy Google events
 * @param {Date}   [input.now]              current instant (injectable for tests)
 * @returns {Array<{ time: string, available: boolean }>}
 */
export function computeAvailabilitySlots({
  date,
  durationMinutes,
  weeklyHours,
  override,
  bookings,
  calendarEvents,
  now = new Date(),
}) {
  // --- 1. Resolve the day's opening hours ----------------------------------
  let openTime = null;
  let closeTime = null;
  let bufferMinutes = 30;
  let incrementMinutes = 90;

  if (override) {
    if (override.is_off) return []; // whole day blocked
    openTime = override.start_time;
    closeTime = override.end_time;
  }

  if (weeklyHours) {
    bufferMinutes = weeklyHours.buffer_minutes ?? bufferMinutes;
    incrementMinutes = weeklyHours.slot_increment_minutes ?? incrementMinutes;
    if (!override) {
      if (!weeklyHours.is_working) return []; // regular day off
      openTime = weeklyHours.start_time;
      closeTime = weeklyHours.end_time;
    }
  }

  if (!openTime || !closeTime) return []; // not a working day

  const openMin = parseTimeToMinutes(openTime);
  const closeMin = parseTimeToMinutes(closeTime);
  if (closeMin <= openMin) return [];

  // --- 2. Build busy intervals as absolute UTC instants, ± buffer ----------
  const bufferMs = bufferMinutes * 60 * 1000;
  /** @type {Array<{ start: Date, end: Date }>} */
  const busy = [];

  for (const booking of bookings || []) {
    const startMs = warsawToUtc(date, booking.start_time).getTime();
    busy.push({
      start: new Date(startMs - bufferMs),
      end: new Date(startMs + booking.duration_minutes * 60 * 1000 + bufferMs),
    });
  }

  for (const event of calendarEvents || []) {
    busy.push({
      start: new Date(event.start.getTime() - bufferMs),
      end: new Date(event.end.getTime() + bufferMs),
    });
  }

  // --- 3. Generate candidates and test each against busy intervals ---------
  const candidates = generateCandidateSlots(openMin, closeMin, durationMinutes, incrementMinutes);

  // Same-day lead-time rule: hide slots starting less than 60 min from now.
  const warsawNow = nowInWarsaw(now);
  const earliestStartMin = date === warsawNow.date ? warsawNow.minutes + MIN_LEAD_MINUTES : -1;

  const slots = [];
  for (const time of candidates) {
    const startMin = parseTimeToMinutes(time);
    if (startMin < earliestStartMin) continue; // hidden, not merely unavailable

    const slotStart = warsawToUtc(date, time);
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);
    const blocked = busy.some((b) => intervalsOverlap(slotStart, slotEnd, b.start, b.end));
    slots.push({ time, available: !blocked });
  }

  return slots;
}
