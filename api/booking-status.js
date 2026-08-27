/**
 * GET /api/booking-status?session_id=cs_...
 *
 * Lets the post-payment success page check whether the webhook has already
 * confirmed the booking. Keyed by the Stripe Checkout Session id (which only
 * the paying client and Stripe know), and deliberately returns no personal
 * data beyond the booking's own details.
 *
 * Responses:
 *   200 { status: "pending_payment"|"confirmed"|"cancelled",
 *         paymentStatus: string, treatmentName: string, date: string,
 *         timeSlot: string, amountPaidPLN: number|null }
 *   400 { error } — missing session_id
 *   404 { error } — unknown session
 */

import { getSupabase } from './_lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sessionId = typeof req.query.session_id === 'string' ? req.query.session_id : '';
  if (!/^cs_(test|live)_/.test(sessionId)) {
    return res.status(400).json({ error: 'Invalid or missing "session_id".' });
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('bookings')
      .select('status, payment_status, treatment_name, booking_date, start_time, amount_paid_pln')
      .eq('stripe_session_id', sessionId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Unknown checkout session.' });

    return res.status(200).json({
      status: data.status,
      paymentStatus: data.payment_status,
      treatmentName: data.treatment_name,
      date: data.booking_date,
      timeSlot: data.start_time,
      amountPaidPLN: data.amount_paid_pln,
    });
  } catch (error) {
    console.error('[booking-status] failed:', error);
    return res.status(500).json({ error: 'Failed to load the booking status.' });
  }
}
