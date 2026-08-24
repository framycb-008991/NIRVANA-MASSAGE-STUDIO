// Photo slot registry and override management.
//
// Every manageable image on the site has a slot id and a bundled default
// asset. When the practitioner uploads a replacement (Admin Panel → Photos),
// the override URL (Supabase Storage public URL, or a local data-URL in
// offline dev) is cached here and `getPhoto` returns it instead of the
// default. Server-side mirror: api/_lib/photoSlots.js — keep in sync.

import { getAdminToken } from './auth';

export interface PhotoSlotDef {
  slot: string;
  defaultSrc: string;
  label: string;
}

export const PHOTO_SLOTS: PhotoSlotDef[] = [
  // Home page hero carousel
  { slot: 'home-hero-1', defaultSrc: '/assets/alina-portrait-back.jpg', label: 'Home hero — slide 1 (portrait)' },
  { slot: 'home-hero-2', defaultSrc: '/assets/alina-stretching-leg.jpg', label: 'Home hero — slide 2 (stretching)' },
  { slot: 'home-hero-3', defaultSrc: '/assets/treatment-blade-iastm.jpg', label: 'Home hero — slide 3 (IASTM)' },
  { slot: 'home-hero-4', defaultSrc: '/assets/treatment-cupping.jpg', label: 'Home hero — slide 4 (cupping)' },
  { slot: 'home-hero-5', defaultSrc: '/assets/hero.jpg', label: 'Home hero — slide 5 (studio)' },

  // Therapist card carousel (home + about pages)
  { slot: 'therapist-card-1', defaultSrc: '/assets/alina-portrait-back.jpg', label: 'Therapist card — slide 1' },
  { slot: 'therapist-card-2', defaultSrc: '/assets/alina-stretching-leg.jpg', label: 'Therapist card — slide 2' },
  { slot: 'therapist-card-3', defaultSrc: '/assets/treatment-blade-iastm.jpg', label: 'Therapist card — slide 3' },
  { slot: 'therapist-card-4', defaultSrc: '/assets/treatment-cupping.jpg', label: 'Therapist card — slide 4' },

  // About page gallery grid
  { slot: 'about-gallery-1', defaultSrc: '/assets/alina-portrait-back.jpg', label: 'About gallery — card 1' },
  { slot: 'about-gallery-2', defaultSrc: '/assets/alina-stretching-leg.jpg', label: 'About gallery — card 2' },
  { slot: 'about-gallery-3', defaultSrc: '/assets/treatment-blade-iastm.jpg', label: 'About gallery — card 3' },
  { slot: 'about-gallery-4', defaultSrc: '/assets/treatment-cupping.jpg', label: 'About gallery — card 4' },

  // Booking flow
  { slot: 'booking-avatar', defaultSrc: '/assets/therapist.jpg', label: 'Booking page — practitioner avatar' },

  // Treatment catalog images (slot id mirrors the treatment id)
  { slot: 'treatment-masaz_profilaktyczny', defaultSrc: '/assets/alina-portrait-back.jpg', label: 'Treatment — Masaż profilaktyczny' },
  { slot: 'treatment-drenaz_limfatyczny', defaultSrc: '/assets/treatment-cupping.jpg', label: 'Treatment — Drenaż limfatyczny' },
  { slot: 'treatment-masaz_stretchingowy', defaultSrc: '/assets/alina-stretching-leg.jpg', label: 'Treatment — Masaż stretchingowy' },
  { slot: 'treatment-masaz_sportowy', defaultSrc: '/assets/treatment-blade-iastm.jpg', label: 'Treatment — Masaż sportowy' },
  { slot: 'treatment-masaz_antystresowy', defaultSrc: '/assets/alina-portrait-back.jpg', label: 'Treatment — Masaż antystresowy' },
];

const OVERRIDES_KEY = 'nirvana_photo_overrides';

const slotIndex = new Map(PHOTO_SLOTS.map((s) => [s.slot, s]));

function readOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    if (raw) return JSON.parse(raw) as Record<string, string>;
  } catch {
    // corrupted storage — start clean
  }
  return {};
}

function writeOverrides(overrides: Record<string, string>): void {
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    // data-URL overrides can exceed storage quota; fail silently
  }
}

/**
 * Resolves the current image URL for a slot: practitioner override when one
 * exists, otherwise the bundled default asset.
 */
export function getPhoto(slot: string): string {
  const override = readOverrides()[slot];
  if (override) return override;
  return slotIndex.get(slot)?.defaultSrc ?? slot;
}

export function getPhotoOverrideMap(): Record<string, string> {
  return readOverrides();
}

/**
 * Pulls the latest overrides from the public API and caches them locally.
 * Silent no-op when the backend is unreachable (dev / static hosting).
 */
export async function fetchPhotoOverrides(): Promise<void> {
  try {
    const res = await fetch('/api/photos');
    if (!res.ok) return;
    const data = (await res.json()) as { photos?: Record<string, string> };
    if (data.photos && typeof data.photos === 'object') {
      writeOverrides(data.photos);
    }
  } catch {
    // backend not reachable — keep cached overrides
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a replacement image for a slot via the admin API. Falls back to a
 * local data-URL override when the backend is unreachable (offline dev), so
 * the feature still works before deployment.
 */
export async function uploadPhoto(slot: string, file: File): Promise<string> {
  if (!slotIndex.has(slot)) throw new Error('Unknown photo slot.');

  const dataUrl = await readFileAsDataUrl(file);
  const dataBase64 = dataUrl.split(',')[1] || '';

  try {
    const token = getAdminToken();
    const res = await fetch('/api/admin/photos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        slot,
        fileName: file.name,
        contentType: file.type,
        dataBase64,
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || `Upload failed (${res.status}).`);
    }
    const data = (await res.json()) as { url: string };
    const overrides = readOverrides();
    overrides[slot] = data.url;
    writeOverrides(overrides);
    return data.url;
  } catch (err) {
    // Network failure only (backend not deployed) — keep a local override.
    if (err instanceof TypeError) {
      const overrides = readOverrides();
      overrides[slot] = dataUrl;
      writeOverrides(overrides);
      return dataUrl;
    }
    throw err;
  }
}

/** Removes the override for a slot, reverting it to the bundled default. */
export async function resetPhoto(slot: string): Promise<void> {
  if (!slotIndex.has(slot)) throw new Error('Unknown photo slot.');

  try {
    const token = getAdminToken();
    await fetch('/api/admin/photos', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ slot }),
    });
  } catch {
    // backend unreachable — removing the local override is enough
  }

  const overrides = readOverrides();
  delete overrides[slot];
  writeOverrides(overrides);
}
