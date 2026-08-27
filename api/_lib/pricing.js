/**
 * Server-side pricing authority.
 *
 * The API NEVER trusts client-supplied prices. This module resolves the
 * canonical PLN price for a (treatmentId, durationMinutes) pair from:
 *   1. the built-in catalog below (mirror of TREATMENTS in
 *      src/services/storage.ts — KEEP IN SYNC when built-in prices change),
 *   2. admin-managed custom treatments stored in the settings table under
 *      the `custom_treatments` key (validated by api/admin/settings.js).
 *
 * Also owns the deposit rule: 30% of the full price, rounded up to whole PLN.
 */

/** Deposit fraction of the full treatment price (business rule). */
export const DEPOSIT_RATE = 0.3;

/**
 * Built-in treatment prices: { [treatmentId]: { [minutes]: pricePLN } }.
 * MIRROR of src/services/storage.ts TREATMENTS — keep in sync.
 */
export const BUILT_IN_PRICES = {
  masaz_profilaktyczny: { 60: 200, 90: 300 },
  drenaz_limfatyczny:   { 60: 200, 90: 300 },
  masaz_stretchingowy:  { 30: 150, 60: 250 },
  masaz_sportowy:       { 30: 150, 60: 250 },
  masaz_antystresowy:   { 60: 200, 90: 300 },
};

/**
 * Loads the full price catalog: built-ins overlaid with admin-managed custom
 * treatments from the settings table. Custom entries may also carry a `name`
 * used for the booking record when the client omits a display name.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase service-role client
 * @returns {Promise<Map<string, { name: string|null, prices: Map<number, number> }>>}
 */
export async function getPriceCatalog(supabase) {
  const catalog = new Map();
  for (const [id, prices] of Object.entries(BUILT_IN_PRICES)) {
    catalog.set(id, { name: null, prices: new Map(Object.entries(prices).map(([m, p]) => [Number(m), p])) });
  }

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'custom_treatments')
      .maybeSingle();
    if (!error && data && typeof data.value === 'string') {
      const customs = JSON.parse(data.value);
      if (Array.isArray(customs)) {
        for (const t of customs) {
          if (!t || typeof t.id !== 'string' || !Array.isArray(t.durations)) continue;
          const prices = new Map();
          for (const d of t.durations) {
            const minutes = Number(d && d.minutes);
            const price = Number(d && d.pricePLN);
            if (Number.isInteger(minutes) && Number.isFinite(price) && price >= 0) {
              prices.set(minutes, price);
            }
          }
          if (prices.size > 0) {
            catalog.set(t.id, { name: typeof t.name === 'string' ? t.name : null, prices });
          }
        }
      }
    }
    if (error) console.warn('[pricing] custom_treatments lookup failed:', error.message);
  } catch (err) {
    console.warn('[pricing] custom_treatments parse failed:', err);
  }

  return catalog;
}

/**
 * Resolves the canonical price for one treatment/duration.
 *
 * @param {Map<string, { name: string|null, prices: Map<number, number> }>} catalog
 * @param {string} treatmentId
 * @param {number} durationMinutes
 * @returns {{ pricePLN: number, catalogName: string|null } | null} null when unknown
 */
export function resolvePrice(catalog, treatmentId, durationMinutes) {
  const entry = catalog.get(treatmentId);
  if (!entry) return null;
  const pricePLN = entry.prices.get(durationMinutes);
  if (pricePLN == null) return null;
  return { pricePLN, catalogName: entry.name };
}

/**
 * Deposit for a given full price: 30%, rounded up to whole PLN.
 *
 * @param {number} pricePLN
 * @returns {number}
 */
export function depositFor(pricePLN) {
  return Math.ceil(pricePLN * DEPOSIT_RATE);
}
