/**
 * Shared "booking is confirmed" side effects — Google Calendar event plus
 * practitioner/client emails — used by every path that confirms a booking:
 *   - api/create-booking.js   (pay-at-session bookings)
 *   - api/stripe-webhook.js   (online payment succeeded)
 *   - credit redemptions      (membership bookings, no payment)
 *
 * Each side effect is individually fault-tolerant: failures are logged, never
 * thrown, so a calendar or email outage can never un-confirm a booking.
 */

import { createCalendarEvent } from './googleCalendar.js';
import { sendPractitionerNotification, sendClientConfirmation } from './email.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_PRACTITIONER_EMAIL = 'heorhiievaalina@gmail.com';

/**
 * Resolves the practitioner notification email: settings table first, then
 * the PRACTITIONER_EMAIL env var, then the hard-coded studio default.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<string>}
 */
export async function resolvePractitionerEmail(supabase) {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'practitioner_email')
      .maybeSingle();
    if (!error && data && EMAIL_PATTERN.test(data.value)) return data.value;
    if (error) console.warn('[confirmBooking] settings lookup failed:', error.message);
  } catch (err) {
    console.warn('[confirmBooking] settings lookup threw:', err);
  }
  return process.env.PRACTITIONER_EMAIL || DEFAULT_PRACTITIONER_EMAIL;
}

/**
 * Runs the calendar + email side effects for a confirmed booking row.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} booking full bookings row (needs id, treatment_name,
 *   duration_minutes, booking_date, start_time, booking_type, location,
 *   client_* fields, client_notes)
 */
export async function finalizeConfirmedBooking(supabase, booking) {
  // --- Google Calendar event (best effort) ----------------------------------
  try {
    const event = await createCalendarEvent({
      firstName: booking.client_first_name,
      surname: booking.client_surname,
      email: booking.client_email,
      phone: booking.client_phone,
      treatmentName: booking.treatment_name,
      durationMinutes: booking.duration_minutes,
      date: booking.booking_date,
      timeSlot: booking.start_time,
      bookingType: booking.booking_type,
      location: booking.location,
      notes: booking.client_notes,
    });
    if (event && event.id) {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ google_event_id: event.id })
        .eq('id', booking.id);
      if (updateError) {
        console.error('[confirmBooking] storing google_event_id failed:', updateError);
      }
    }
  } catch (calendarError) {
    // Calendar sync failing must not fail the booking — the DB row is truth.
    console.error('[confirmBooking] calendar event creation failed:', calendarError);
  }

  // --- Emails (best effort, independently) -----------------------------------
  try {
    const practitionerEmail = await resolvePractitionerEmail(supabase);
    await sendPractitionerNotification(booking, practitionerEmail);
  } catch (emailError) {
    console.error('[confirmBooking] practitioner notification failed:', emailError);
  }

  try {
    await sendClientConfirmation(booking);
  } catch (emailError) {
    console.error('[confirmBooking] client confirmation failed:', emailError);
  }
}
