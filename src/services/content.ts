// Editable site-content slots (contact info and other values that change
// from time to time). Each slot has a built-in default; practitioner edits
// (Admin Panel → Settings) are stored server-side and mirrored in
// localStorage. Server-side mirror: api/_lib/contentSlots.js — keep in sync.

const CONTENT_KEY = 'nirvana_site_content';

export interface ContentSlotDef {
  key: string;
  defaultValue: string;
  label: string;
}

/** Public slots shown on the site (editable from the admin panel). */
export const CONTENT_SLOTS: ContentSlotDef[] = [
  { key: 'contact_phone', defaultValue: '+48 731 920 280', label: 'Phone number' },
  { key: 'contact_email', defaultValue: 'contact@nirvanamassage.pl', label: 'Public contact email' },
  { key: 'contact_address', defaultValue: 'ul. Przedmiejska 2/02, 54-201 Wrocław, Poland', label: 'Studio address' },
  { key: 'instagram_handle', defaultValue: '@nirvana_massage.studio', label: 'Instagram handle' },
];

const slotIndex = new Map(CONTENT_SLOTS.map((s) => [s.key, s]));

function readOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CONTENT_KEY);
    if (raw) return JSON.parse(raw) as Record<string, string>;
  } catch {
    // corrupted storage — start clean
  }
  return {};
}

function writeOverrides(overrides: Record<string, string>): void {
  try {
    localStorage.setItem(CONTENT_KEY, JSON.stringify(overrides));
  } catch {
    // storage unavailable — overrides simply won't persist
  }
}

/** Current value of a content slot: saved override or built-in default. */
export function getContent(key: string): string {
  const override = readOverrides()[key];
  if (override) return override;
  return slotIndex.get(key)?.defaultValue ?? key;
}

/**
 * Pulls the latest public content values from the API and caches them.
 * Silent no-op when the backend is unreachable (dev / static hosting).
 */
export async function fetchContent(): Promise<void> {
  try {
    const res = await fetch('/api/content');
    if (!res.ok) return;
    const data = (await res.json()) as { content?: Record<string, string> };
    if (data.content && typeof data.content === 'object') {
      writeOverrides(data.content);
    }
  } catch {
    // backend not reachable — keep cached values
  }
}

/** Mirrors a saved content map into the local cache (after an admin edit). */
export function setContentOverrides(content: Record<string, string>): void {
  const merged = { ...readOverrides(), ...content };
  writeOverrides(merged);
}
