/**
 * Canonical registry of manageable photo slots.
 *
 * Every image displayed on the public site belongs to a slot. A slot always
 * has a built-in default asset (served from /assets/*); when the practitioner
 * uploads a replacement, the `photo_slots` table maps slot_id -> storage path
 * in the Supabase Storage bucket and the public site shows that instead.
 *
 * This list is the server-side source of truth for validation. The frontend
 * mirror lives in `src/services/photos.ts` — keep the two in sync.
 */

export const PHOTO_BUCKET = 'site-photos';

/**
 * Allowed slots and their default (bundled) asset paths.
 * Labels are short English descriptions used by the admin UI fallback.
 */
export const PHOTO_SLOTS = [
  // Home page hero carousel
  { slot: 'home-hero-1', defaultPath: '/assets/alina-portrait-back.jpg', label: 'Home hero — slide 1 (portrait)' },
  { slot: 'home-hero-2', defaultPath: '/assets/alina-stretching-leg.jpg', label: 'Home hero — slide 2 (stretching)' },
  { slot: 'home-hero-3', defaultPath: '/assets/treatment-blade-iastm.jpg', label: 'Home hero — slide 3 (IASTM)' },
  { slot: 'home-hero-4', defaultPath: '/assets/treatment-cupping.jpg', label: 'Home hero — slide 4 (cupping)' },
  { slot: 'home-hero-5', defaultPath: '/assets/hero.jpg', label: 'Home hero — slide 5 (studio)' },

  // Therapist card carousel (home + about pages)
  { slot: 'therapist-card-1', defaultPath: '/assets/alina-portrait-back.jpg', label: 'Therapist card — slide 1' },
  { slot: 'therapist-card-2', defaultPath: '/assets/alina-stretching-leg.jpg', label: 'Therapist card — slide 2' },
  { slot: 'therapist-card-3', defaultPath: '/assets/treatment-blade-iastm.jpg', label: 'Therapist card — slide 3' },
  { slot: 'therapist-card-4', defaultPath: '/assets/treatment-cupping.jpg', label: 'Therapist card — slide 4' },

  // About page gallery grid
  { slot: 'about-gallery-1', defaultPath: '/assets/alina-portrait-back.jpg', label: 'About gallery — card 1' },
  { slot: 'about-gallery-2', defaultPath: '/assets/alina-stretching-leg.jpg', label: 'About gallery — card 2' },
  { slot: 'about-gallery-3', defaultPath: '/assets/treatment-blade-iastm.jpg', label: 'About gallery — card 3' },
  { slot: 'about-gallery-4', defaultPath: '/assets/treatment-cupping.jpg', label: 'About gallery — card 4' },

  // Booking flow
  { slot: 'booking-avatar', defaultPath: '/assets/therapist.jpg', label: 'Booking page — practitioner avatar' },

  // Treatment catalog images (slot id mirrors the treatment id)
  { slot: 'treatment-masaz_profilaktyczny', defaultPath: '/assets/alina-portrait-back.jpg', label: 'Treatment — Masaż profilaktyczny' },
  { slot: 'treatment-drenaz_limfatyczny', defaultPath: '/assets/treatment-cupping.jpg', label: 'Treatment — Drenaż limfatyczny' },
  { slot: 'treatment-masaz_stretchingowy', defaultPath: '/assets/alina-stretching-leg.jpg', label: 'Treatment — Masaż stretchingowy' },
  { slot: 'treatment-masaz_sportowy', defaultPath: '/assets/treatment-blade-iastm.jpg', label: 'Treatment — Masaż sportowy' },
  { slot: 'treatment-masaz_antystresowy', defaultPath: '/assets/alina-portrait-back.jpg', label: 'Treatment — Masaż antystresowy' },
];

const SLOT_IDS = new Set(PHOTO_SLOTS.map((s) => s.slot));

/** True when `slot` is a known, manageable photo slot. */
export function isValidSlot(slot) {
  return typeof slot === 'string' && SLOT_IDS.has(slot);
}
