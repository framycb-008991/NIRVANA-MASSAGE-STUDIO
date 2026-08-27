/**
 * GET /api/account
 *
 * Member-facing account summary. Requires a Supabase Auth access token
 * (magic-link sign-in on the frontend) as `Authorization: Bearer <jwt>`.
 *
 * Ensures the members row exists for the auth user (created on first call),
 * then returns the member's current subscription, session-credit balance,
 * and booking history.
 *
 * Responses:
 *   200 {
 *     member: { id, email, fullName },
 *     subscription: { tierId, status, monthlyPricePLN, creditsPerCycle,
 *                     currentPeriodEnd } | null,
 *     creditBalance: number,
 *     bookings: [{ id, treatmentName, date, timeSlot, status, paymentStatus }]
 *   }
 *   401 { error } — not signed in / invalid token
 */

import { getSupabase } from './_lib/supabase.js';
import { verifyMemberRequest } from './_lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabase();
    const user = await verifyMemberRequest(supabase, req);
    if (!user || !user.email) {
      return res.status(401).json({ error: 'Please sign in to view your account.' });
    }

    // Ensure the members row exists (created lazily on first sign-in).
    const { data: member, error: memberError } = await supabase
      .from('members')
      .upsert({ id: user.id, email: user.email }, { onConflict: 'id' })
      .select('id, email, full_name')
      .single();
    if (memberError) throw memberError;

    // Current subscription: active/past_due wins; otherwise the most recent.
    const { data: subs, error: subsError } = await supabase
      .from('subscriptions')
      .select('tier_id, status, monthly_price_pln, credits_per_cycle, current_period_end, created_at')
      .eq('member_id', user.id)
      .order('created_at', { ascending: false });
    if (subsError) throw subsError;

    const current =
      (subs || []).find((s) => s.status === 'active' || s.status === 'past_due') ||
      (subs || [])[0] ||
      null;

    // Credit balance = SUM(delta) over the append-only ledger.
    const { data: ledger, error: ledgerError } = await supabase
      .from('credit_ledger')
      .select('delta')
      .eq('member_id', user.id);
    if (ledgerError) throw ledgerError;
    const creditBalance = (ledger || []).reduce((sum, row) => sum + row.delta, 0);

    // Booking history: member-linked rows plus any made with the same email.
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, treatment_name, booking_date, start_time, status, payment_status')
      .or(`member_id.eq.${user.id},client_email.eq.${user.email}`)
      .order('booking_date', { ascending: false })
      .limit(50);
    if (bookingsError) throw bookingsError;

    return res.status(200).json({
      member: { id: member.id, email: member.email, fullName: member.full_name },
      subscription: current
        ? {
            tierId: current.tier_id,
            status: current.status,
            monthlyPricePLN: current.monthly_price_pln,
            creditsPerCycle: current.credits_per_cycle,
            currentPeriodEnd: current.current_period_end,
          }
        : null,
      creditBalance,
      bookings: (bookings || []).map((b) => ({
        id: b.id,
        treatmentName: b.treatment_name,
        date: b.booking_date,
        timeSlot: b.start_time,
        status: b.status,
        paymentStatus: b.payment_status,
      })),
    });
  } catch (error) {
    console.error('[account] failed:', error);
    return res.status(500).json({ error: 'Failed to load your account.' });
  }
}
