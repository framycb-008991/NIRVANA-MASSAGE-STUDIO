// Admin-managed extra massage services.
//
// The built-in catalog lives in TREATMENTS (services/storage.ts). Extra
// services added in Admin Panel → Settings are stored as a JSON array in the
// `custom_treatments` content slot (Supabase `settings` table, validated by
// api/admin/settings.js) and cached locally by services/content.ts via the
// public /api/content endpoint. getAllTreatments() merges both lists.
//
// Custom entries reuse the Treatment shape by putting plain text into the
// *Key fields — getTranslation() returns the key itself when no translation
// matches, so the raw text renders unchanged in every locale.

import { Treatment, TreatmentDuration } from '../types';
import { TREATMENTS } from './storage';
import { getContentOverride, setContentOverrides } from './content';
import { getAdminToken } from './auth';
import { hasPhotoSlot } from './photos';

export interface CustomTreatment {
  id: string;
  name: string;
  category: string;
  shortDesc: string;
  fullDesc: string;
  durations: TreatmentDuration[];
  image: string; // bundled asset path (/assets/...)
  featured?: boolean;
}

/** Bundled assets offered as cover images for custom services. */
export const CUSTOM_TREATMENT_IMAGES = [
  { value: '/assets/alina-portrait-back.jpg', label: 'Portrait (back)' },
  { value: '/assets/alina-stretching-leg.jpg', label: 'Stretching' },
  { value: '/assets/treatment-blade-iastm.jpg', label: 'IASTM / blade' },
  { value: '/assets/treatment-cupping.jpg', label: 'Cupping' },
  { value: '/assets/hero.jpg', label: 'Studio' },
] as const;

function isValidCustomTreatment(item: unknown): item is CustomTreatment {
  const c = item as CustomTreatment;
  return Boolean(
    c &&
    typeof c === 'object' &&
    typeof c.id === 'string' &&
    typeof c.name === 'string' &&
    c.name.trim().length > 0 &&
    Array.isArray(c.durations) &&
    c.durations.length > 0
  );
}

/** Custom services currently cached locally ([] when none / not fetched yet). */
export function getCustomTreatments(): CustomTreatment[] {
  const raw = getContentOverride('custom_treatments');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidCustomTreatment);
  } catch {
    return [];
  }
}

function toTreatment(c: CustomTreatment): Treatment {
  return {
    id: c.id,
    nameKey: c.name,
    shortDescKey: c.shortDesc || c.name,
    fullDescKey: c.fullDesc || c.shortDesc || c.name,
    categoryKey: c.category || '',
    durations: c.durations,
    image: c.image || CUSTOM_TREATMENT_IMAGES[0].value,
    featured: c.featured,
  };
}

/** Built-in catalog plus admin-added custom services. */
export function getAllTreatments(): Treatment[] {
  return [...TREATMENTS, ...getCustomTreatments().map(toTreatment)];
}

/**
 * Cover image for a treatment card: the photo-slot override for built-in
 * treatments, the chosen bundled asset for custom ones.
 */
export function treatmentImageSrc(treatment: Treatment, photo: (slot: string) => string): string {
  const slot = `treatment-${treatment.id}`;
  return hasPhotoSlot(slot) ? photo(slot) : treatment.image;
}

/** Slugifies a service name into a unique `custom_*` treatment id. */
export function generateCustomTreatmentId(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'service';
  const taken = new Set(getAllTreatments().map((t) => t.id));
  let id = `custom_${base}`;
  let n = 2;
  while (taken.has(id)) id = `custom_${base}_${n++}`;
  return id;
}

/**
 * Persists the custom services list via the admin settings API. Falls back
 * to a local-only mirror when the backend is unreachable (offline dev).
 */
export async function saveCustomTreatments(list: CustomTreatment[]): Promise<void> {
  const json = JSON.stringify(list);

  try {
    const token = getAdminToken();
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ content: { custom_treatments: json } }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || `Save failed (${res.status}).`);
    }
  } catch (err) {
    // Network failure only (backend not deployed) — keep a local mirror.
    if (!(err instanceof TypeError)) throw err;
  }

  setContentOverrides({ custom_treatments: json });
}
