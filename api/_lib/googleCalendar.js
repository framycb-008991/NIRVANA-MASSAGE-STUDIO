/**
 * Google Calendar integration (service account, JWT auth).
 *
 * The calendar is used for two things:
 *   1. Blocking availability: events already on the practitioner's calendar
 *      count as busy time when computing bookable slots.
 *   2. Mirroring bookings: every confirmed booking creates a calendar event;
 *      cancellations delete it.
 *
 * GRACEFUL DEGRADATION: when the GOOGLE_* env vars are absent (e.g. local
 * development), every exported function becomes a safe no-op and a warning is
 * logged once per process. Check isCalendarConfigured() to branch on this.
 */

import { google } from 'googleapis';
import { STUDIO_TIMEZONE, warsawToUtc } from './availabilityCore.js';

/** Studio address used as the event location for in-studio bookings. */
export const STUDIO_ADDRESS = 'Nirvana Massage Studio, ul. Przedmiejska 2/02, 54-201 Wrocław, Poland';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

/** True when all required Google credentials are present. */
export function isCalendarConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY &&
      process.env.GOOGLE_CALENDAR_ID
  );
}

/** @type {import('googleapis').calendar_v3.Calendar | null} */
let cachedCalendar = null;

/**
 * Builds (once) an authenticated Calendar client from the service-account
 * credentials in the environment. Vercel env vars store the private key with
 * literal `\n` sequences, which are converted back to real newlines here.
 *
 * @returns {import('googleapis').calendar_v3.Calendar | null} null when unconfigured
 */
function getCalendar() {
  if (!isCalendarConfigured()) return null;
  if (cachedCalendar) return cachedCalendar;

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes: SCOPES,
  });

  cachedCalendar = google.calendar({ version: 'v3', auth });
  return cachedCalendar;
}

/**
 * Logs a single "not configured" warning per process instead of spamming
 * on every call.
 */
let warned = false;
function warnUnconfigured() {
  if (warned) return;
  warned = true;
  console.warn(
    '[googleCalendar] GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY / GOOGLE_CALENDAR_ID not set — ' +
      'calendar integration disabled (no-op mode).'
  );
}

/**
 * Lists busy events on the studio calendar between two UTC instants.
 *
 * @param {string} startIso inclusive lower bound (ISO 8601)
 * @param {string} endIso   exclusive upper bound (ISO 8601)
 * @returns {Promise<Array<{ start: Date, end: Date, summary: string }>>}
 *          Empty array when unconfigured or when the calendar has no events.
 */
export async function getCalendarEvents(startIso, endIso) {
  const calendar = getCalendar();
  if (!calendar) {
    warnUnconfigured();
    return [];
  }

  const response = await calendar.events.list({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    timeMin: startIso,
    timeMax: endIso,
    singleEvents: true, // expand recurring events into instances
    orderBy: 'startTime',
    // Cancelled instances are returned by list() and must be filtered out.
    showDeleted: false,
  });

  return (response.data.items || [])
    .filter((event) => event.status !== 'cancelled' && event.start && event.end)
    .map((event) => ({
      // dateTime for timed events; date (YYYY-MM-DD) for all-day events.
      start: new Date(event.start.dateTime || `${event.start.date}T00:00:00Z`),
      end: new Date(event.end.dateTime || `${event.end.date}T00:00:00Z`),
      summary: event.summary || '(busy)',
    }));
}

/**
 * Creates a calendar event for a confirmed booking.
 *
 * @param {object} bookingData
 * @param {string} bookingData.firstName
 * @param {string} bookingData.surname
 * @param {string} bookingData.email
 * @param {string} bookingData.phone
 * @param {string} bookingData.treatmentName
 * @param {number} bookingData.durationMinutes
 * @param {string} bookingData.date        `YYYY-MM-DD` (Warsaw wall-clock)
 * @param {string} bookingData.timeSlot    `HH:MM`      (Warsaw wall-clock)
 * @param {'in_studio'|'private'} bookingData.bookingType
 * @param {string|null} [bookingData.location]  client address for outcall
 * @param {string|null} [bookingData.notes]
 * @returns {Promise<object|null>} the created event resource, or null when
 *          the calendar integration is not configured.
 */
export async function createCalendarEvent(bookingData) {
  const calendar = getCalendar();
  if (!calendar) {
    warnUnconfigured();
    return null;
  }

  const start = warsawToUtc(bookingData.date, bookingData.timeSlot);
  const end = new Date(start.getTime() + bookingData.durationMinutes * 60 * 1000);

  const location =
    bookingData.bookingType === 'in_studio'
      ? STUDIO_ADDRESS
      : bookingData.location || 'Client location (private appointment)';

  const descriptionLines = [
    `Client: ${bookingData.firstName} ${bookingData.surname}`,
    `Email: ${bookingData.email}`,
    `Phone: ${bookingData.phone}`,
    `Treatment: ${bookingData.treatmentName} (${bookingData.durationMinutes} min)`,
    `Type: ${bookingData.bookingType === 'in_studio' ? 'In studio' : 'Private / outcall'}`,
  ];
  if (bookingData.notes) descriptionLines.push(`Notes: ${bookingData.notes}`);

  const response = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    requestBody: {
      summary: `${bookingData.treatmentName} — ${bookingData.firstName} ${bookingData.surname}`,
      description: descriptionLines.join('\n'),
      location,
      start: { dateTime: start.toISOString(), timeZone: STUDIO_TIMEZONE },
      end: { dateTime: end.toISOString(), timeZone: STUDIO_TIMEZONE },
    },
  });

  return response.data;
}

/**
 * Deletes the calendar event belonging to a cancelled booking.
 *
 * @param {string} eventId Google Calendar event id (bookings.google_event_id)
 * @returns {Promise<null>} always null; no-op when unconfigured.
 */
export async function deleteCalendarEvent(eventId) {
  const calendar = getCalendar();
  if (!calendar || !eventId) {
    if (!calendar) warnUnconfigured();
    return null;
  }

  await calendar.events.delete({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    eventId,
  });

  return null;
}
