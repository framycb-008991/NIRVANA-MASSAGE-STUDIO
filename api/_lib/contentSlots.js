/**
 * Registry of editable site-content slots (key/value strings).
 *
 * Each slot has a built-in default used until the practitioner saves an
 * override from the Admin Panel (Settings tab). Overrides live in the
 * Supabase `settings` table; public slots are exposed read-only via
 * /api/content, all slots are manageable via /api/admin/settings.
 *
 * Frontend mirror: src/services/content.ts — keep the two in sync.
 */

export const CONTENT_SLOTS = [
  {
    key: 'contact_phone',
    defaultValue: '+48 731 920 280',
    public: true,
    label: 'Phone number',
  },
  {
    key: 'contact_email',
    defaultValue: 'contact@nirvanamassage.pl',
    public: true,
    label: 'Public contact email',
  },
  {
    key: 'contact_address',
    defaultValue: 'ul. Przedmiejska 2/02, 54-201 Wrocław, Poland',
    public: true,
    label: 'Studio address',
  },
  {
    key: 'instagram_handle',
    defaultValue: '@nirvana_massage.studio',
    public: true,
    label: 'Instagram handle',
  },
  // Admin-managed extra massage services, stored as a JSON array and merged
  // with the built-in catalog on the public site. Public so visitors see
  // them; validated in api/admin/settings.js.
  {
    key: 'custom_treatments',
    defaultValue: '',
    public: true,
    label: 'Custom massage services (JSON)',
  },
  // Admin-only slots (never exposed by the public /api/content endpoint):
  {
    key: 'practitioner_email',
    defaultValue: 'heorhiievaalina@gmail.com',
    public: false,
    label: 'Practitioner notification email',
  },
];

const SLOT_KEYS = new Set(CONTENT_SLOTS.map((s) => s.key));
const PUBLIC_KEYS = CONTENT_SLOTS.filter((s) => s.public).map((s) => s.key);

/** True when `key` is a known editable content slot. */
export function isContentKey(key) {
  return typeof key === 'string' && SLOT_KEYS.has(key);
}

/** Keys safe to expose publicly (no auth required). */
export function getPublicContentKeys() {
  return PUBLIC_KEYS;
}

/** Default value for a slot, or null for unknown keys. */
export function getContentDefault(key) {
  const slot = CONTENT_SLOTS.find((s) => s.key === key);
  return slot ? slot.defaultValue : null;
}
