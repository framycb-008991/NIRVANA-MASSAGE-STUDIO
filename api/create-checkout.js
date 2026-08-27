/**
 * POST /api/create-checkout
 *
 * Starts an online payment for a booking: creates a pending_payment booking
 * row, opens a Stripe Checkout Session (card / BLIK / Apple Pay / Google Pay,
 * PLN only), and returns the URL the client should be redirected to.
 *
 * Request body (JSON): everything api/create-booking accepts, plus:
 *   paymentChoice: "deposit" | "full" | "credit"
 *     deposit → charges 30% of the canonical price (rest at the session)
 *     full    → charges the full price
 *     credit  → membership redemption: no Stripe, confirms immediately when
 *               the signed-in member has an active subscription with credits
 * Prices are ALWAYS re-derived server-side via api/_lib/pricing.js.
 *
 * Responses:
 *   200 { checkoutUrl: string, bookingId: string, amountPLN: number }
 *       or { bookedWithCredit: true, bookingId: string, creditBalance: number }
 *   400 { error } — validation failure / unknown treatment
 *   401 / 403 { error } — credit path: not signed in / no membership or credits
 *   409 { error } — slot no longer available
 *   503 { error } — Stripe not configured (frontend should offer pay-at-session)
 *   500 { error } — unexpected failure
 *
 * The booking becomes "confirmed" only when the Stripe webhook reports the
 * Checkout Session completed (see api/stripe-webhook.js). If the session is
 * abandoned/expired, the webhook cancels the pending row and frees the slot.
 */

import { getSupabase } from './_lib/supabase.js';
import {
  computeAvailabilitySlots,
  fetchAvailabilityInputs,
} from './_lib/availabilityCore.js';
import { getPriceCatalog, resolvePrice, depositFor } from './_lib/pricing.js';
import { getStripe, siteBaseUrl } from './_lib/stripe.js';
import { verifyMemberRequest } from './_lib/auth.js';
import { finalizeConfirmedBooking } from './_lib/confirmBooking.js';
import { validateBody } from './create-booking.js';

const ALLOWED_PAYMENT_CHOICES = new Set(['deposit', 'full', 'credit']);

/**
 * Membership credit redemption: books without payment when the signed-in
 * member has an active subscription and at least one session credit.
 * Returns 200 { bookedWithCredit: true, bookingId } on success, or null when
 * the member can't use a credit (caller should surface the error).
 */
async function handleCreditBooking(req, res, input) {
  const supabase = getSupabase();
  const user = await verifyMemberRequest(supabase, req);
  if (!user) {
    res.status(401).json({ error: 'Please sign in to use membership credits.' });
    return;
  }

  const { data: sub, error: subError } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('member_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (subError) throw subError;
  if (!sub) {
    res.status(403).json({ error: 'No active membership found. Credits require an active subscription.' });
    return;
  }

  const { data: ledger, error: ledgerError } = await supabase
    .from('credit_ledger')
    .select('delta')
    .eq('member_id', user.id);
  if (ledgerError) throw ledgerError;
  const balance = (ledger || []).reduce((sum, row) => sum + row.delta, 0);
  if (balance < 1) {
    res.status(403).json({ error: 'No session credits left this cycle. You can pay per session instead.' });
    return;
  }

  // Re-verify slot + resolve canonical price (same rules as paid bookings).
  const inputs = await fetchAvailabilityInputs(supabase, input.date);
  const slots = computeAvailabilitySlots({
    date: input.date,
    durationMinutes: input.durationMinutes,
    ...inputs,
  });
  const requested = slots.find((slot) => slot.time === input.timeSlot);
  if (!requested || !requested.available) {
    res.status(409).json({ error: 'The selected time slot is no longer available. Please choose another time.' });
    return;
  }

  const catalog = await getPriceCatalog(supabase);
  const resolved = resolvePrice(catalog, input.treatmentId, input.durationMinutes);
  if (!resolved) {
    res.status(400).json({ error: 'Unknown treatment or duration. Please pick a service from the list.' });
    return;
  }
  const treatmentName = input.treatmentName || resolved.catalogName || input.treatmentId;

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
    payment_choice: 'credit',
    payment_status: 'credit',
    amount_paid_pln: 0,
    member_id: user.id,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('bookings')
    .insert(bookingRow)
    .select()
    .single();
  if (insertError) throw insertError;

  const { error: redeemError } = await supabase.from('credit_ledger').insert({
    member_id: user.id,
    subscription_id: sub.id,
    delta: -1,
    reason: 'redeem',
    booking_id: inserted.id,
  });
  if (redeemError) {
    // Roll the booking back rather than give a free session on ledger failure.
    console.error('[create-checkout] credit redeem failed, cancelling booking:', redeemError);
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', inserted.id);
    res.status(500).json({ error: 'Failed to redeem the credit. Please try again.' });
    return;
  }

  await finalizeConfirmedBooking(supabase, inserted);
  res.status(200).json({ bookedWithCredit: true, bookingId: inserted.id, creditBalance: balance - 1 });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const paymentChoiceRaw =
    typeof req.body === 'object' && req.body ? String(req.body.paymentChoice) : '';

  // Membership credit bookings never touch Stripe — handle before the
  // Stripe-configured check so they also work when payments are not set up.
  if (paymentChoiceRaw === 'credit') {
    try {
      const parsed = validateBody(req.body);
      if (parsed.errors) {
        return res.status(400).json({ error: parsed.errors.join(' ') });
      }
      return await handleCreditBooking(req, res, parsed.value);
    } catch (error) {
      console.error('[create-checkout] credit booking failed:', error);
      return res.status(500).json({ error: 'Failed to create the booking. Please try again.' });
    }
  }

  const stripe = getStripe();
  if (!stripe) {
    return res
      .status(503)
      .json({ error: 'Online payment is not configured. Please choose pay at session.' });
  }

  try {
    // --- 1. Validate (same rules as create-booking, plus paymentChoice) ------
    const parsed = validateBody(req.body);
    if (parsed.errors) {
      return res.status(400).json({ error: parsed.errors.join(' ') });
    }
    const input = parsed.value;

    const paymentChoice = typeof req.body === 'object' && req.body ? String(req.body.paymentChoice) : '';
    if (!ALLOWED_PAYMENT_CHOICES.has(paymentChoice)) {
      return res.status(400).json({ error: "paymentChoice must be 'deposit' or 'full'." });
    }

    const supabase = getSupabase();

    // --- 2. Re-verify the slot is still available ----------------------------
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

    // --- 3. Resolve canonical price and charge amount -------------------------
    const catalog = await getPriceCatalog(supabase);
    const resolved = resolvePrice(catalog, input.treatmentId, input.durationMinutes);
    if (!resolved) {
      return res
        .status(400)
        .json({ error: 'Unknown treatment or duration. Please pick a service from the list.' });
    }
    const treatmentName = input.treatmentName || resolved.catalogName || input.treatmentId;
    const amountPLN =
      paymentChoice === 'deposit' ? depositFor(resolved.pricePLN) : resolved.pricePLN;

    // --- 4. Insert the pending_payment booking --------------------------------
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
      status: 'pending_payment',
      payment_choice: paymentChoice,
      payment_status: 'unpaid',
    };

    const { data: inserted, error: insertError } = await supabase
      .from('bookings')
      .insert(bookingRow)
      .select()
      .single();

    if (insertError) {
      console.error('[create-checkout] insert failed:', insertError);
      return res.status(500).json({ error: 'Failed to save the booking. Please try again.' });
    }

    // --- 5. Create the Stripe Checkout Session --------------------------------
    const base = siteBaseUrl(req);
    const locale = input.locale || 'en';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'blik'],
      customer_email: input.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'pln',
            unit_amount: amountPLN * 100,
            product_data: {
              name:
                paymentChoice === 'deposit'
                  ? `${treatmentName} — booking deposit (30%)`
                  : `${treatmentName} — full payment`,
              description: `${input.durationMinutes} min on ${input.date} at ${input.timeSlot} (Europe/Warsaw)`,
            },
          },
        },
      ],
      metadata: {
        kind: 'booking',
        bookingId: inserted.id,
        paymentChoice,
      },
      success_url: `${base}/${locale}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/${locale}/booking/cancelled`,
      // Checkout sessions auto-expire after 30 minutes minimum; the webhook
      // cancels the pending booking on checkout.session.expired.
    });

    const { error: linkError } = await supabase
      .from('bookings')
      .update({ stripe_session_id: session.id })
      .eq('id', inserted.id);
    if (linkError) {
      console.error('[create-checkout] storing stripe_session_id failed:', linkError);
    }

    return res
      .status(200)
      .json({ checkoutUrl: session.url, bookingId: inserted.id, amountPLN });
  } catch (error) {
    console.error('[create-checkout] failed:', error);
    return res.status(500).json({ error: 'Failed to start the payment. Please try again.' });
  }
}
