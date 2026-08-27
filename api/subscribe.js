/**
 * POST /api/subscribe
 *
 * Starts a membership purchase: creates a Stripe Checkout Session in
 * subscription mode for the chosen tier and returns the redirect URL.
 * Requires member sign-in (`Authorization: Bearer <supabase-jwt>`).
 *
 * Request body (JSON): { tierId: string, fullName?: string, locale?: string }
 *
 * Responses:
 *   200 { checkoutUrl: string }
 *   400 { error } — unknown tier
 *   401 { error } — not signed in
 *   409 { error } — already has an active subscription
 *   503 { error } — Stripe not configured
 *
 * The subscription row and first credits are created by the webhook
 * (checkout.session.completed, kind = 'subscription'), NOT here.
 */

import { getSupabase } from './_lib/supabase.js';
import { verifyMemberRequest } from './_lib/auth.js';
import { getStripe, siteBaseUrl } from './_lib/stripe.js';
import { getTiers, ensureStripePrice } from './_lib/tiers.js';

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
    if (!user || !user.email) {
      return res.status(401).json({ error: 'Please sign in before subscribing.' });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const tierId = typeof body.tierId === 'string' ? body.tierId.trim() : '';
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : null;
    const locale = typeof body.locale === 'string' && body.locale ? body.locale : 'en';

    const tiers = await getTiers(supabase);
    const tier = tiers.find((t) => t.id === tierId);
    if (!tier) {
      return res.status(400).json({ error: 'Unknown membership tier.' });
    }

    // One active membership per member.
    const { data: existing, error: existingError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('member_id', user.id)
      .in('status', ['active', 'past_due'])
      .limit(1);
    if (existingError) throw existingError;
    if (existing && existing.length > 0) {
      return res
        .status(409)
        .json({ error: 'You already have an active membership. Manage it from your account page.' });
    }

    // Ensure member row + Stripe customer.
    const { data: member, error: memberError } = await supabase
      .from('members')
      .upsert(
        { id: user.id, email: user.email, ...(fullName ? { full_name: fullName } : {}) },
        { onConflict: 'id' }
      )
      .select('id, stripe_customer_id')
      .single();
    if (memberError) throw memberError;

    let customerId = member.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        ...(fullName ? { name: fullName } : {}),
        metadata: { memberId: user.id },
      });
      customerId = customer.id;
      await supabase.from('members').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }

    const tierWithPrice = await ensureStripePrice(supabase, stripe, tier);

    const base = siteBaseUrl(req);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [{ price: tierWithPrice.stripePriceId, quantity: 1 }],
      metadata: { kind: 'subscription', tierId: tier.id, memberId: user.id },
      subscription_data: {
        metadata: { tierId: tier.id, memberId: user.id },
      },
      success_url: `${base}/${locale}/account?subscribed=1`,
      cancel_url: `${base}/${locale}/membership`,
    });

    return res.status(200).json({ checkoutUrl: session.url });
  } catch (error) {
    console.error('[subscribe] failed:', error);
    return res.status(500).json({ error: 'Failed to start the subscription. Please try again.' });
  }
}
