/**
 * POST /api/stripe-webhook
 *
 * Receives Stripe events with a RAW body (bodyParser disabled below) and a
 * verified signature. This endpoint is the ONLY place bookings become
 * "confirmed" after an online payment — never trust the redirect alone.
 *
 * Handled events (booking payments):
 *   checkout.session.completed → confirm the pending booking, record the
 *                                payment, fire calendar + email side effects
 *   checkout.session.expired   → cancel the pending booking, freeing the slot
 * (Subscription events are handled here too — see the switch below.)
 *
 * Configure in Stripe: endpoint URL https://<site>/api/stripe-webhook with
 * STRIPE_WEBHOOK_SECRET set. Local dev: stripe listen --forward-to ...
 *
 * Always answers 200 quickly for events we don't care about; a non-2xx tells
 * Stripe to retry, so only genuine processing failures return 500.
 */

import { getSupabase } from './_lib/supabase.js';
import { getStripe } from './_lib/stripe.js';
import { finalizeConfirmedBooking } from './_lib/confirmBooking.js';
import { getTiers } from './_lib/tiers.js';
import {
  sendSubscriptionWelcome,
  sendSubscriptionRenewal,
  sendSubscriptionPaymentFailed,
} from './_lib/email.js';

export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

/**
 * Confirms a pending booking after its Checkout Session completed.
 * Idempotent: an already-confirmed booking is acknowledged without redoing
 * side effects (Stripe may deliver the event more than once).
 */
async function handleBookingPaymentCompleted(supabase, session) {
  const sessionId = session.id;

  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('stripe_session_id', sessionId)
    .maybeSingle();

  if (error) throw error;
  if (!booking) {
    console.warn('[stripe-webhook] no booking for session', sessionId);
    return;
  }
  if (booking.status === 'confirmed') return; // duplicate delivery

  const amountPLN =
    typeof session.amount_total === 'number' ? Math.round(session.amount_total / 100) : null;
  const paymentStatus =
    booking.payment_choice === 'full' ? 'paid_full' : 'deposit_paid';

  const { data: updated, error: updateError } = await supabase
    .from('bookings')
    .update({
      status: 'confirmed',
      payment_status: paymentStatus,
      amount_paid_pln: amountPLN,
    })
    .eq('id', booking.id)
    .eq('status', 'pending_payment') // guard against races with a duplicate event
    .select()
    .maybeSingle();

  if (updateError) throw updateError;
  if (!updated) return; // another concurrent delivery confirmed it first

  await supabase.from('payments').insert({
    booking_id: booking.id,
    stripe_object_id: sessionId,
    kind: booking.payment_choice === 'full' ? 'booking_full' : 'booking_deposit',
    amount_pln: amountPLN ?? 0,
    status: 'paid',
  });

  await finalizeConfirmedBooking(supabase, updated);
}

/**
 * Cancels a pending booking whose Checkout Session expired unpaid, so the
 * time slot becomes bookable again.
 */
async function handleBookingCheckoutExpired(supabase, session) {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('stripe_session_id', session.id)
    .eq('status', 'pending_payment');
  if (error) throw error;
}

/* ---------------------------------------------------------------------------
 * Subscription (membership) events
 * ------------------------------------------------------------------------- */

/** Credit balance for a member: SUM(delta) over the append-only ledger. */
async function getCreditBalance(supabase, memberId) {
  const { data, error } = await supabase
    .from('credit_ledger')
    .select('delta')
    .eq('member_id', memberId);
  if (error) throw error;
  return (data || []).reduce((sum, row) => sum + row.delta, 0);
}

async function getMemberEmail(supabase, memberId) {
  const { data } = await supabase
    .from('members')
    .select('email, full_name')
    .eq('id', memberId)
    .maybeSingle();
  return data || null;
}

/**
 * First subscription payment completed: create the subscription row and grant
 * the first cycle's credits. Idempotent on stripe_subscription_id.
 */
async function handleSubscriptionCheckoutCompleted(supabase, stripe, session) {
  const { tierId, memberId } = session.metadata || {};
  if (!tierId || !memberId) {
    console.warn('[stripe-webhook] subscription checkout missing metadata', session.id);
    return;
  }

  const stripeSub = await stripe.subscriptions.retrieve(session.subscription);

  const tiers = await getTiers(supabase);
  const tier = tiers.find((t) => t.id === tierId) || {
    name: tierId,
    monthlyPricePLN: 0,
    sessionsPerCycle: 1,
  };

  const row = {
    member_id: memberId,
    tier_id: tierId,
    status: 'active',
    stripe_subscription_id: stripeSub.id,
    monthly_price_pln: tier.monthlyPricePLN,
    credits_per_cycle: tier.sessionsPerCycle,
    current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
    current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
  };

  const { data: inserted, error } = await supabase
    .from('subscriptions')
    .upsert(row, { onConflict: 'stripe_subscription_id' })
    .select('id')
    .single();
  if (error) throw error;

  // Grant first-cycle credits only once (guard: a cycle_grant already logged
  // for this subscription means this is a duplicate delivery).
  const { data: existing } = await supabase
    .from('credit_ledger')
    .select('id')
    .eq('subscription_id', inserted.id)
    .eq('reason', 'cycle_grant')
    .limit(1);
  if (existing && existing.length > 0) return;

  await supabase.from('credit_ledger').insert({
    member_id: memberId,
    subscription_id: inserted.id,
    delta: tier.sessionsPerCycle,
    reason: 'cycle_grant',
  });

  await supabase.from('payments').insert({
    member_id: memberId,
    stripe_object_id: session.id,
    kind: 'subscription',
    amount_pln: tier.monthlyPricePLN,
    status: 'paid',
  });

  const member = await getMemberEmail(supabase, memberId);
  if (member) {
    await sendSubscriptionWelcome({
      email: member.email,
      fullName: member.full_name,
      tierName: tier.name,
      monthlyPricePLN: tier.monthlyPricePLN,
      creditsPerCycle: tier.sessionsPerCycle,
      periodEnd: row.current_period_end,
    });
  }
}

/**
 * Monthly renewal succeeded: expire unused credits beyond the rollover limit
 * (max 1 carries over), grant the new cycle's credits, refresh period dates.
 * Idempotent on the Stripe invoice id. The first cycle is handled by
 * handleSubscriptionCheckoutCompleted and skipped here.
 */
async function handleSubscriptionRenewal(supabase, invoice) {
  if (invoice.billing_reason === 'subscription_create') return;

  const stripeSubId = invoice.subscription;
  if (!stripeSubId) return;

  // Idempotency: this invoice already processed?
  const { data: seen } = await supabase
    .from('payments')
    .select('id')
    .eq('stripe_object_id', invoice.id)
    .limit(1);
  if (seen && seen.length > 0) return;

  const { data: sub, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', stripeSubId)
    .maybeSingle();
  if (error) throw error;
  if (!sub) {
    console.warn('[stripe-webhook] renewal for unknown subscription', stripeSubId);
    return;
  }

  const balance = await getCreditBalance(supabase, sub.member_id);
  const expiring = Math.max(0, balance - 1); // rollover limit: 1 session
  const ledgerRows = [];
  if (expiring > 0) {
    ledgerRows.push({
      member_id: sub.member_id,
      subscription_id: sub.id,
      delta: -expiring,
      reason: 'expire',
    });
  }
  ledgerRows.push({
    member_id: sub.member_id,
    subscription_id: sub.id,
    delta: sub.credits_per_cycle,
    reason: 'cycle_grant',
  });
  const { error: ledgerError } = await supabase.from('credit_ledger').insert(ledgerRows);
  if (ledgerError) throw ledgerError;

  const periodEnd =
    invoice.lines && invoice.lines.data && invoice.lines.data[0]
      ? new Date(invoice.lines.data[0].period.end * 1000).toISOString()
      : null;
  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      ...(periodEnd ? { current_period_end: periodEnd } : {}),
    })
    .eq('id', sub.id);

  const amountPLN =
    typeof invoice.amount_paid === 'number' ? Math.round(invoice.amount_paid / 100) : 0;
  await supabase.from('payments').insert({
    member_id: sub.member_id,
    stripe_object_id: invoice.id,
    kind: 'subscription',
    amount_pln: amountPLN,
    status: 'paid',
  });

  const member = await getMemberEmail(supabase, sub.member_id);
  if (member) {
    const newBalance = balance - expiring + sub.credits_per_cycle;
    await sendSubscriptionRenewal({
      email: member.email,
      tierName: sub.tier_id,
      creditsGranted: sub.credits_per_cycle,
      creditBalance: newBalance,
      periodEnd: periodEnd || sub.current_period_end,
    });
  }
}

/** Renewal charge failed: mark past_due (credit booking suspended) + email. */
async function handleSubscriptionPaymentFailed(supabase, invoice) {
  const stripeSubId = invoice.subscription;
  if (!stripeSubId) return;

  const { data: sub, error } = await supabase
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', stripeSubId)
    .neq('status', 'canceled')
    .select('id, member_id, tier_id')
    .maybeSingle();
  if (error) throw error;
  if (!sub) return;

  const member = await getMemberEmail(supabase, sub.member_id);
  if (member) {
    await sendSubscriptionPaymentFailed({ email: member.email, tierName: sub.tier_id });
  }
}

/** Stripe-side status sync (plan changes, final cancellation, etc.). */
async function handleSubscriptionUpdated(supabase, stripeSub) {
  const statusMap = {
    active: 'active',
    trialing: 'active',
    past_due: 'past_due',
    unpaid: 'past_due',
    canceled: 'canceled',
    incomplete_expired: 'canceled',
  };
  const status = statusMap[stripeSub.status];
  if (!status) return; // 'incomplete' etc.: wait for payment events

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status,
      current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
      current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
    })
    .eq('stripe_subscription_id', stripeSub.id);
  if (error) throw error;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return res.status(503).json({ error: 'Stripe webhook is not configured.' });
  }

  let event;
  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature.' });
  }

  const supabase = getSupabase();
  const object = event.data && event.data.object;

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        if (object && object.metadata && object.metadata.kind === 'booking') {
          await handleBookingPaymentCompleted(supabase, object);
        } else if (object && object.metadata && object.metadata.kind === 'subscription') {
          await handleSubscriptionCheckoutCompleted(supabase, stripe, object);
        }
        break;
      case 'checkout.session.expired':
        if (object && object.metadata && object.metadata.kind === 'booking') {
          await handleBookingCheckoutExpired(supabase, object);
        }
        break;
      case 'invoice.payment_succeeded':
        if (object && object.subscription) {
          await handleSubscriptionRenewal(supabase, object);
        }
        break;
      case 'invoice.payment_failed':
        if (object && object.subscription) {
          await handleSubscriptionPaymentFailed(supabase, object);
        }
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        if (object) {
          await handleSubscriptionUpdated(supabase, object);
        }
        break;
      default:
        break; // unhandled event types are acknowledged and ignored
    }
  } catch (err) {
    console.error('[stripe-webhook] handler failed for', event.type, err);
    return res.status(500).json({ error: 'Webhook handler failed.' });
  }

  return res.status(200).json({ received: true });
}
