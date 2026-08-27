/**
 * POST /api/create-booking
 *
 * Creates a confirmed booking after re-verifying the requested slot.
 * Prices are ALWAYS re-derived server-side (api/_lib/pricing.js); any
 * client-sent pricePLN/depositPLN values are ignored.
 *
 * Request body (JSON):
 *   {
 *     firstName: string, surname: string, email: string, phone: string,
 *     treatmentId: string, treatmentName?: string,
 *     durationMinutes: 30|45|60|90,
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
} from './_lib/availabilityCore.js';
import { getPriceCatalog, resolvePrice, depositFor } from './_lib/pricing.js';
import { finalizeConfirmedBooking } from './_lib/confirmBooking.js';

const ALLOWED_DURATIONS = new Set([30, 45, 60, 90]);
const ALLOWED_BOOKING_TYPES = new Set(['in_studio', 'private']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates the request body. Returns either { errors: [...] } describing all
 * problems found, or { value: {...} } with normalized, trimmed fields.
 * Exported so api/create-checkout.js validates identically.
 */
export function validateBody(body) {
  const errors = [];
  const b = body && typeof body === 'object' ? body : {};

  const str = (v) => (typeof v === 'string' ? v.trim() : '');

  const firstName = str(b.firstName);
  const surname = str(b.surname);
  const email = str(b.email);
  const phone = str(b.phone);
  const treatmentId = str(b.treatmentId);
  const treatmentName = str(b.treatmentName); // optional display name; catalog name is the fallback
  const date = str(b.date);
  const timeSlot = str(b.timeSlot);
  const bookingType = str(b.bookingType);
  const location = typeof b.location === 'string' ? b.location.trim() : null;
  const notes = typeof b.notes === 'string' ? b.notes.trim() : null;
  const locale = str(b.locale) || 'en';

  const durationMinutes = Number(b.durationMinutes);

  if (!firstName) errors.push('firstName is required.');
  if (!surname) errors.push('surname is required.');
  if (!EMAIL_PATTERN.test(email)) errors.push('email is missing or invalid.');
  if (!phone) errors.push('phone is required.');
  if (!treatmentId) errors.push('treatmentId is required.');
  if (!ALLOWED_DURATIONS.has(durationMinutes)) errors.push('durationMinutes must be 30, 45, 60 or 90.');
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
      date,
      timeSlot,
      bookingType,
      location: bookingType === 'private' ? location : null,
      notes,
      locale,
    },
  };
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

    // --- 3. Resolve the canonical price (client prices are ignored) ---------
    const catalog = await getPriceCatalog(supabase);
    const resolved = resolvePrice(catalog, input.treatmentId, input.durationMinutes);
    if (!resolved) {
      return res
        .status(400)
        .json({ error: 'Unknown treatment or duration. Please pick a service from the list.' });
    }
    const treatmentName = input.treatmentName || resolved.catalogName || input.treatmentId;

    // --- 4. Insert the booking ----------------------------------------------
    const bookingRow = {
      client_first_name: input.firstName,
      client_surname: input.surname,
      client_email: input.email,
      client_phone: input.phone,
      treatment_id: input.treatmentId,
      treatment_name: treatmentName,
      duration_minutes: input.durationMinutes,
      price_pln: resolved.pricePLN,
      deposit_pln: depositFor(resolved.pricePLN),
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

    // --- 5. Calendar + emails (best effort, shared helper) -------------------
    await finalizeConfirmedBooking(supabase, inserted);

    return res.status(201).json({ bookingId: inserted.id, status: 'confirmed' });
  } catch (error) {
    console.error('[create-booking] failed:', error);
    return res.status(500).json({ error: 'Failed to create the booking. Please try again.' });
  }
}
