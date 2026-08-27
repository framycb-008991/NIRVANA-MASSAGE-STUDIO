// Membership subscription tiers (session-credit passes).
//
// The tier list is PUBLIC content: the backend exposes it as a JSON string
// array in the `subscription_tiers` content slot (via /api/content, cached
// locally by services/content.ts). When the slot is empty or unreachable,
// the built-in DEFAULT_TIERS below apply — keep them in sync with the
// server-side fallback in api/_lib.
//
// Admin edits (Admin Panel → Settings → Membership tiers) go through the
// admin settings API exactly like `custom_treatments` (see treatments.ts).

import { getContentOverride, setContentOverrides } from './content';
import { getAdminToken } from './auth';

export interface SubscriptionTier {
  id: string;
  name: string;
  focus: string;
  persona: string;
  sessionsPerCycle: number;
  sessionMinutes: number;
  monthlyPricePLN: number;
}

/** Built-in tiers, used when the content slot is missing/empty. */
export const DEFAULT_TIERS: SubscriptionTier[] = [
  {
    id: 'recovery_pass',
    name: 'Recovery Pass',
    focus: 'Rehabilitation & pain relief',
    persona: 'For focused recovery after injury or surgery',
    sessionsPerCycle: 2,
    sessionMinutes: 60,
    monthlyPricePLN: 350,
  },
  {
    id: 'performance_pass',
    name: 'Performance Pass',
    focus: 'Sports recovery & mobility',
    persona: 'For athletes and active bodies in training',
    sessionsPerCycle: 4,
    sessionMinutes: 60,
    monthlyPricePLN: 660,
  },
  {
    id: 'neuro_rehab_pass',
    name: 'Neuro-Rehab Pass',
    focus: 'Neurological rehabilitation',
    persona: 'For ongoing neurological rehabilitation support',
    sessionsPerCycle: 6,
    sessionMinutes: 45,
    monthlyPricePLN: 950,
  },
  {
    id: 'desk_detox_pass',
    name: 'Desk Detox Pass',
    focus: 'Posture & desk-work tension',
    persona: 'For office workers with neck, back and shoulder tension',
    sessionsPerCycle: 2,
    sessionMinutes: 60,
    monthlyPricePLN: 260,
  },
  {
    id: 'lymphatic_care_pass',
    name: 'Lymphatic Care Pass',
    focus: 'Lymphatic drainage & swelling',
    persona: 'For lymphatic care and post-operative swelling',
    sessionsPerCycle: 3,
    sessionMinutes: 60,
    monthlyPricePLN: 570,
  },
  {
    id: 'maternity_journey',
    name: 'Maternity Journey',
    focus: 'Pregnancy & postnatal care',
    persona: 'For expecting and new mothers',
    sessionsPerCycle: 2,
    sessionMinutes: 60,
    monthlyPricePLN: 380,
  },
];

function isValidTier(item: unknown): item is SubscriptionTier {
  const c = item as SubscriptionTier;
  return Boolean(
    c &&
    typeof c === 'object' &&
    typeof c.id === 'string' &&
    c.id.trim().length > 0 &&
    typeof c.name === 'string' &&
    c.name.trim().length > 0 &&
    Number.isInteger(c.sessionsPerCycle) &&
    c.sessionsPerCycle > 0 &&
    Number.isInteger(c.sessionMinutes) &&
    c.sessionMinutes > 0 &&
    typeof c.monthlyPricePLN === 'number' &&
    c.monthlyPricePLN >= 0
  );
}

/**
 * Current tier list: parsed from the cached `subscription_tiers` content
 * slot, falling back to DEFAULT_TIERS when missing, empty, or invalid.
 */
export function getSubscriptionTiers(): SubscriptionTier[] {
  const raw = getContentOverride('subscription_tiers');
  if (!raw) return DEFAULT_TIERS;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_TIERS;
    const valid = parsed.filter(isValidTier);
    return valid.length > 0 ? valid : DEFAULT_TIERS;
  } catch {
    return DEFAULT_TIERS;
  }
}

/** Tier by id, or undefined when unknown. */
export function getTierById(id: string): SubscriptionTier | undefined {
  return getSubscriptionTiers().find((tier) => tier.id === id);
}

/**
 * Persists the tier list via the admin settings API. Falls back to a
 * local-only mirror when the backend is unreachable (offline dev).
 */
export async function saveSubscriptionTiers(list: SubscriptionTier[]): Promise<void> {
  const json = JSON.stringify(list);

  try {
    const token = getAdminToken();
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ content: { subscription_tiers: json } }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || `Save failed (${res.status}).`);
    }
  } catch (err) {
    // Network failure only (backend not deployed) — keep a local mirror.
    if (!(err instanceof TypeError)) throw err;
  }

  setContentOverrides({ subscription_tiers: json });
}
