/**
 * GET /api/admin/memberships
 *   -> { members: [{ id, email, fullName, stripeCustomerId, createdAt,
 *                    subscription: {...}|null, creditBalance: number }] }
 *
 * POST /api/admin/memberships
 *   body: { memberId: string, adjust: number, reasonNote?: string }
 *   -> adds a manual credit_ledger 'admin_adjust' row (±N credits)
 *   -> 200 { creditBalance: number }
 *
 * Admin-only (Bearer session token or legacy x-admin-key), like /api/admin/*.
 */

import { getSupabase } from '../_lib/supabase.js';
import { verifyAdminRequest } from '../_lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!verifyAdminRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    const supabase = getSupabase();

    if (req.method === 'GET') {
      const { data: members, error } = await supabase
        .from('members')
        .select('id, email, full_name, stripe_customer_id, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const { data: subs, error: subsError } = await supabase
        .from('subscriptions')
        .select('id, member_id, tier_id, status, monthly_price_pln, credits_per_cycle, current_period_end')
        .order('created_at', { ascending: false });
      if (subsError) throw subsError;

      const { data: ledger, error: ledgerError } = await supabase
        .from('credit_ledger')
        .select('member_id, delta');
      if (ledgerError) throw ledgerError;

      const balances = new Map();
      for (const row of ledger || []) {
        balances.set(row.member_id, (balances.get(row.member_id) || 0) + row.delta);
      }

      const result = (members || []).map((m) => {
        const memberSubs = (subs || []).filter((s) => s.member_id === m.id);
        const current =
          memberSubs.find((s) => s.status === 'active' || s.status === 'past_due') ||
          memberSubs[0] ||
          null;
        return {
          id: m.id,
          email: m.email,
          fullName: m.full_name,
          stripeCustomerId: m.stripe_customer_id,
          createdAt: m.created_at,
          subscription: current
            ? {
                tierId: current.tier_id,
                status: current.status,
                monthlyPricePLN: current.monthly_price_pln,
                creditsPerCycle: current.credits_per_cycle,
                currentPeriodEnd: current.current_period_end,
              }
            : null,
          creditBalance: balances.get(m.id) || 0,
        };
      });

      return res.status(200).json({ members: result });
    }

    if (req.method === 'POST') {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const memberId = typeof body.memberId === 'string' ? body.memberId : '';
      const adjust = Number(body.adjust);

      if (!memberId) return res.status(400).json({ error: 'memberId is required.' });
      if (!Number.isInteger(adjust) || adjust === 0 || Math.abs(adjust) > 40) {
        return res.status(400).json({ error: 'adjust must be a non-zero integer between -40 and 40.' });
      }

      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('id')
        .eq('id', memberId)
        .maybeSingle();
      if (memberError) throw memberError;
      if (!member) return res.status(404).json({ error: 'Unknown member.' });

      const { error: insertError } = await supabase.from('credit_ledger').insert({
        member_id: memberId,
        delta: adjust,
        reason: 'admin_adjust',
      });
      if (insertError) throw insertError;

      const { data: ledger, error: ledgerError } = await supabase
        .from('credit_ledger')
        .select('delta')
        .eq('member_id', memberId);
      if (ledgerError) throw ledgerError;
      const creditBalance = (ledger || []).reduce((sum, row) => sum + row.delta, 0);

      return res.status(200).json({ creditBalance });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[admin/memberships] failed:', error);
    return res.status(500).json({ error: 'Failed to process the memberships request.' });
  }
}
