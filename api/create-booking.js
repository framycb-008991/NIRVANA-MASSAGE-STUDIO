/**
 * POST /api/create-booking
 *
 * Creates a confirmed booking after re-verifying the requested slot.
 *
 * Request body (JSON):
 *   {
 *     firstName: string, surname: string, email: string, phone: string,
 *     treatmentId: string, treatmentName: string,
 *     durationMinutes: 60|90, pricePLN: number, depositPLN?: number,
 *     date: "YYYY-MM-DD", timeSlot: "HH:MM",
 *     bookingType: "in_studio"|"private",
 *     location?: string|null,   // required for "private"
 *     notes?: string|null,
 *     locale?: string           // defaults to "en"
 *   }
 *
 * Responses:
 *   201 { bookingId: string, status: "confirmed" }
 *   400 { error: string } — validation failure
 *   409 { error: string } — slot no longer available
 *   500 { error: string } — unexpected server/DB failure
 *
 * Side effects (each individually fault-tolerant, failures logged only):
 *   - Google Calendar event created; its id stored on the booking row.
 *   - Practitioner notification email (recipient from settings table).
 *   - Client confirmation email.
 * The booking succeeds as long as the DB insert succeeded.
 */

import { getSupabase } from './_lib/supabase.js';
import {
  computeAvailabilitySlots,
  fetchAvailabilityInputs,
  isValidDateString,
  isValidTimeString,
  nowInWarsaw,
  DEPOSIT_PLN,
} from './_lib/availabilityCore.js';
import { createCalendarEvent } from './_lib/googleCalendar.js';
import { sendPractitionerNotification, sendClientConfirmation } from './_lib/email.js';

const ALLOWED_DURATIONS = new Set([60, 90]);
const ALLOWED_BOOKING_TYPES = new Set(['in_studio', 'private']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_PRACTITIONER_EMAIL = 'heorhiievaalina@gmail.com';

/**
 * Validates the request body. Returns either { errors: [...] } describing all
 * problems found, or { value: {...} } with normalized, trimmed fields.
 */
function validateBody(body) {
  const errors = [];
  const b = body && typeof body === 'object' ? body : {};

  const str = (v) => (typeof v === 'string' ? v.trim() : '');

  const firstName = str(b.firstName);
  const surname = str(b.surname);
  const email = str(b.email);
  const phone = str(b.phone);
  const treatmentId = str(b.treatmentId);
  const treatmentName = str(b.treatmentName);
  const date = str(b.date);
  const timeSlot = str(b.timeSlot);
  const bookingType = str(b.bookingType);
  const location = typeof b.location === 'string' ? b.location.trim() : null;
  const notes = typeof b.notes === 'string' ? b.notes.trim() : null;
  const locale = str(b.locale) || 'en';

  const durationMinutes = Number(b.durationMinutes);
  const pricePLN = Number(b.pricePLN);
  const depositPLN = b.depositPLN == null ? DEPOSIT_PLN : Number(b.depositPLN);

  if (!firstName) errors.push('firstName is required.');
  if (!surname) errors.push('surname is required.');
  if (!EMAIL_PATTERN.test(email)) errors.push('email is missing or invalid.');
  if (!phone) errors.push('phone is required.');
  if (!treatmentId) errors.push('treatmentId is required.');
  if (!treatmentName) errors.push('treatmentName is required.');
  if (!ALLOWED_DURATIONS.has(durationMinutes)) errors.push('durationMinutes must be 60 or 90.');
  if (!Number.isFinite(pricePLN) || pricePLN < 0) errors.push('pricePLN must be a non-negative number.');
  if (!Number.isFinite(depositPLN) || depositPLN < 0) errors.push('depositPLN must be a non-negative number.');
  if (!isValidDateString(date)) {
    errors.push('date must be a valid YYYY-MM-DD date.');
  } else if (date < nowInWarsaw().date) {
    errors.push('date cannot be in the past.');
  }
  if (!isValidTimeString(timeSlot)) errors.push('timeSlot must be a valid HH:MM time.');
  if (!ALLOWED_BOOKING_TYPES.has(bookingType)) {
    errors.push("bookingType must be 'in_studio' or 'private'.");
  } else if (bookingType === 'private' && !location) {
    errors.push('location is required for private (outcall) bookings.');
  }

  if (errors.length > 0) return { errors };

  return {
    value: {
      firstName,
      surname,
      email,
      phone,
      treatmentId,
      treatmentName,
      durationMinutes,
      pricePLN,
      depositPLN,
      date,
      timeSlot,
      bookingType,
      location: bookingType === 'private' ? location : null,
      notes,
      locale,
    },
  };
}

/**
 * Resolves the practitioner notification email: settings table first, then
 * the PRACTITIONER_EMAIL env var, then the hard-coded studio default.
 */
async function resolvePractitionerEmail(supabase) {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'practitioner_email')
      .maybeSingle();
    if (!error && data && EMAIL_PATTERN.test(data.value)) return data.value;
    if (error) console.warn('[create-booking] settings lookup failed:', error.message);
  } catch (err) {
    console.warn('[create-booking] settings lookup threw:', err);
  }
  return process.env.PRACTITIONER_EMAIL || DEFAULT_PRACTITIONER_EMAIL;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // --- 1. Validate --------------------------------------------------------
    const parsed = validateBody(req.body);
    if (parsed.errors) {
      return res.status(400).json({ error: parsed.errors.join(' ') });
    }
    const input = parsed.value;

    const supabase = getSupabase();

    // --- 2. Re-verify the slot is still available ---------------------------
    const inputs = await fetchAvailabilityInputs(supabase, input.date);
    const slots = computeAvailabilitySlots({
      date: input.date,
      durationMinutes: input.durationMinutes,
      ...inputs,
    });
    const requested = slots.find((slot) => slot.time === input.timeSlot);
    if (!requested || !requested.available) {
      return res
        .status(409)
        .json({ error: 'The selected time slot is no longer available. Please choose another time.' });
    }

    // --- 3. Insert the booking ----------------------------------------------
    const bookingRow = {
      client_first_name: input.firstName,
      client_surname: input.surname,
      client_email: input.email,
      client_phone: input.phone,
      treatment_id: input.treatmentId,
      treatment_name: input.treatmentName,
      duration_minutes: input.durationMinutes,
      price_pln: input.pricePLN,
      deposit_pln: input.depositPLN,
      booking_date: input.date,
      start_time: input.timeSlot,
      booking_type: input.bookingType,
      location: input.location,
      client_notes: input.notes,
      locale: input.locale,
      status: 'confirmed',
    };

    const { data: inserted, error: insertError } = await supabase
      .from('bookings')
      .insert(bookingRow)
      .select()
      .single();

    if (insertError) {
      console.error('[create-booking] insert failed:', insertError);
      return res.status(500).json({ error: 'Failed to save the booking. Please try again.' });
    }

    // --- 4. Google Calendar event (best effort) -----------------------------
    try {
      const event = await createCalendarEvent({
        firstName: input.firstName,
        surname: input.surname,
        email: input.email,
        phone: input.phone,
        treatmentName: input.treatmentName,
        durationMinutes: input.durationMinutes,
        date: input.date,
        timeSlot: input.timeSlot,
        bookingType: input.bookingType,
        location: input.location,
        notes: input.notes,
      });
      if (event && event.id) {
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ google_event_id: event.id })
          .eq('id', inserted.id);
        if (updateError) {
          console.error('[create-booking] storing google_event_id failed:', updateError);
        }
      }
    } catch (calendarError) {
      // Calendar sync failing must not fail the booking — the DB row is truth.
      console.error('[create-booking] calendar event creation failed:', calendarError);
    }

    // --- 5. Emails (best effort, independently) -----------------------------
    try {
      const practitionerEmail = await resolvePractitionerEmail(supabase);
      await sendPractitionerNotification(inserted, practitionerEmail);
    } catch (emailError) {
      console.error('[create-booking] practitioner notification failed:', emailError);
    }

    try {
      await sendClientConfirmation(inserted);
    } catch (emailError) {
      console.error('[create-booking] client confirmation failed:', emailError);
    }

    return res.status(201).json({ bookingId: inserted.id, status: 'confirmed' });
  } catch (error) {
    console.error('[create-booking] failed:', error);
    return res.status(500).json({ error: 'Failed to create the booking. Please try again.' });
  }
}
