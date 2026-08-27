/**
 * Subscription tier registry.
 *
 * Tier definitions live in the settings table under `subscription_tiers`
 * (JSON array, admin-editable via api/admin/settings.js), seeded by
 * supabase/migrations/001_payments.sql:
 *   { id, name, focus, persona, sessionsPerCycle, sessionMinutes,
 *     monthlyPricePLN, stripeProductId?, stripePriceId? }
 *
 * Stripe Product/Price ids are attached LAZILY: the first purchase of a tier
 * creates them (test or live, matching the active keys) and persists them back
 * into the settings JSON, so admin price edits only take effect for NEW
 * subscribers (existing subscriptions keep their Stripe price).
 */

/** @returns default tiers, used when the settings row is missing/unreadable */
export const DEFAULT_TIERS = [
  { id: 'recovery_pass', name: 'Recovery Pass', focus: 'Sports, deep tissue & trigger point massage', sessionsPerCycle: 2, sessionMinutes: 60, monthlyPricePLN: 350, persona: 'Amateur athletes, desk workers, stress relief' },
  { id: 'performance_pass', name: 'Performance Pass', focus: 'Sports massage, IASTM & functional mobility', sessionsPerCycle: 4, sessionMinutes: 60, monthlyPricePLN: 660, persona: 'Serious athletes, crossfitters, runners' },
  { id: 'neuro_rehab_pass', name: 'Neuro-Rehab Pass', focus: 'Therapeutic & rehabilitative massage, lymphatic drainage', sessionsPerCycle: 6, sessionMinutes: 45, monthlyPricePLN: 950, persona: 'Post-stroke recovery, neuromuscular care' },
  { id: 'desk_detox_pass', name: 'Desk Detox Pass', focus: 'Deep tissue with neck & shoulder focus', sessionsPerCycle: 2, sessionMinutes: 60, monthlyPricePLN: 260, persona: 'Remote workers, office staff' },
  { id: 'lymphatic_care_pass', name: 'Lymphatic Care Pass', focus: 'Manual lymphatic drainage (MLD)', sessionsPerCycle: 3, sessionMinutes: 60, monthlyPricePLN: 570, persona: 'Post-surgery recovery, swelling management' },
  { id: 'maternity_journey', name: 'Maternity Journey', focus: 'Prenatal & postpartum bodywork', sessionsPerCycle: 2, sessionMinutes: 60, monthlyPricePLN: 380, persona: 'Expectant and new mothers' },
];

/**
 * Loads tier definitions from the settings table (defaults on failure).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<Array<object>>}
 */
export async function getTiers(supabase) {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'subscription_tiers')
      .maybeSingle();
    if (!error && data && typeof data.value === 'string') {
      const tiers = JSON.parse(data.value);
      if (Array.isArray(tiers) && tiers.length > 0) return tiers;
    }
    if (error) console.warn('[tiers] settings lookup failed:', error.message);
  } catch (err) {
    console.warn('[tiers] settings parse failed:', err);
  }
  return DEFAULT_TIERS;
}

/**
 * Validates a tier list for admin saves. Returns { error } or { value }.
 * Caps and shape rules mirror the custom_treatments validation style.
 */
export function validateTiers(value) {
  let tiers = value;
  if (typeof value === 'string') {
    try {
      tiers = JSON.parse(value);
    } catch {
      return { error: 'subscription_tiers must be valid JSON.' };
    }
  }
  if (!Array.isArray(tiers) || tiers.length === 0 || tiers.length > 20) {
    return { error: 'subscription_tiers must be an array of 1-20 tiers.' };
  }
  const seen = new Set();
  for (const t of tiers) {
    if (!t || typeof t !== 'object') return { error: 'Each tier must be an object.' };
    if (!/^[a-z0-9_]{2,60}$/.test(t.id || '')) return { error: `Invalid tier id: ${t.id}` };
    if (seen.has(t.id)) return { error: `Duplicate tier id: ${t.id}` };
    seen.add(t.id);
    if (!t.name || typeof t.name !== 'string') return { error: `Tier ${t.id} needs a name.` };
    if (!Number.isInteger(t.sessionsPerCycle) || t.sessionsPerCycle < 1 || t.sessionsPerCycle > 40) {
      return { error: `Tier ${t.id}: sessionsPerCycle must be 1-40.` };
    }
    if (![30, 45, 60, 90].includes(t.sessionMinutes)) {
      return { error: `Tier ${t.id}: sessionMinutes must be 30, 45, 60 or 90.` };
    }
    if (!Number.isInteger(t.monthlyPricePLN) || t.monthlyPricePLN < 1) {
      return { error: `Tier ${t.id}: monthlyPricePLN must be a positive integer.` };
    }
  }
  return { value: tiers };
}

/**
 * Ensures a tier has a live Stripe recurring Price, creating the Product and
 * Price on first use and persisting the ids back into the settings JSON.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {import('stripe').Stripe} stripe
 * @param {object} tier one tier from getTiers()
 * @returns {Promise<object>} the tier, with stripePriceId guaranteed
 */
export async function ensureStripePrice(supabase, stripe, tier) {
  if (tier.stripePriceId) return tier;

  const product = await stripe.products.create({
    name: `${tier.name} — Nirvana membership`,
    metadata: { tierId: tier.id },
  });
  const price = await stripe.prices.create({
    product: product.id,
    currency: 'pln',
    unit_amount: tier.monthlyPricePLN * 100,
    recurring: { interval: 'month' },
    metadata: { tierId: tier.id },
  });

  // Persist ids back so the next purchase reuses them.
  const tiers = await getTiers(supabase);
  const updated = tiers.map((t) =>
    t.id === tier.id ? { ...t, stripeProductId: product.id, stripePriceId: price.id } : t
  );
  const { error } = await supabase
    .from('settings')
    .upsert({ key: 'subscription_tiers', value: JSON.stringify(updated, null, 2) });
  if (error) console.warn('[tiers] failed to persist Stripe ids:', error.message);

  return { ...tier, stripeProductId: product.id, stripePriceId: price.id };
}
