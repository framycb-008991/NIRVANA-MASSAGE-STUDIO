/**
 * POST /api/cancel-subscription
 *
 * Cancels the signed-in member's active subscription at the end of the
 * current paid period (Stripe cancel_at_period_end). Credits remain usable
 * until then. Requires member sign-in.
 *
 * Responses:
 *   200 { status: "canceling", periodEnd: string }
 *   401 { error } — not signed in
 *   404 { error } — no active subscription
 *   503 { error } — Stripe not configured
 */

import { getSupabase } from './_lib/supabase.js';
import { verifyMemberRequest } from './_lib/auth.js';
import { getStripe } from './_lib/stripe.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ error: 'Online payment is not configured.' });
  }

  try {
    const supabase = getSupabase();
    const user = await verifyMemberRequest(supabase, req);
    if (!user) {
      return res.status(401).json({ error: 'Please sign in.' });
    }

    const { data: sub, error } = await supabase
      .from('subscriptions')
      .select('id, stripe_subscription_id, status, current_period_end')
      .eq('member_id', user.id)
      .in('status', ['active', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!sub || !sub.stripe_subscription_id) {
      return res.status(404).json({ error: 'No active membership found.' });
    }

    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    return res.status(200).json({ status: 'canceling', periodEnd: sub.current_period_end });
  } catch (error) {
    console.error('[cancel-subscription] failed:', error);
    return res.status(500).json({ error: 'Failed to cancel the membership. Please try again.' });
  }
}
