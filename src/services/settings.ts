// Practitioner-configurable studio settings.
// Persisted locally (localStorage) as a dev-mode mirror; the serverless
// backend stores the same values in the Supabase `settings` table and the
// Admin Panel settings tab keeps both in sync.

const SETTINGS_KEY = 'nirvana_settings';

export const DEFAULT_PRACTITIONER_EMAIL = 'heorhiievaalina@gmail.com';

interface StudioSettings {
  practitionerEmail?: string;
}

function readSettings(): StudioSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw) as StudioSettings;
  } catch {
    // corrupted or unavailable storage — fall through to defaults
  }
  return {};
}

/**
 * Email address that receives new-booking notification copies.
 * Defaults to the studio owner's Gmail until changed in the Admin Panel.
 */
export function getPractitionerEmail(): string {
  return readSettings().practitionerEmail || DEFAULT_PRACTITIONER_EMAIL;
}

export function setPractitionerEmail(email: string): void {
  const settings = readSettings();
  settings.practitionerEmail = email;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
