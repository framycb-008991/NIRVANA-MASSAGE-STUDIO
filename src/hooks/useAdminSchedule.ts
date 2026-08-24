/**
 * useAdminSchedule — typed wrappers around the admin schedule/settings API.
 *
 * Every request carries the shared-secret `x-admin-key` header taken from
 * `import.meta.env.VITE_ADMIN_API_KEY` (define it in `.env.local` for dev and
 * in the Vercel project settings for production).
 *
 * All wrappers return the parsed JSON body on success and throw an Error with
 * the server's message on any non-2xx response.
 */

/** One weekday of the weekly schedule (0 = Sunday .. 6 = Saturday). */
export interface WeeklyHoursInput {
  dayOfWeek: number;
  isWorking: boolean;
  startTime: string; // "HH:MM" — required when isWorking
  endTime: string; //   "HH:MM" — required when isWorking
  bufferMinutes?: number;
  slotIncrementMinutes?: number;
}

/** A per-date exception: full day off, or custom opening hours. */
export interface DateOverrideInput {
  date: string; // "YYYY-MM-DD"
  isOff: boolean;
  startTime?: string; // required unless isOff
  endTime?: string; //   required unless isOff
  reason?: string;
}

export interface AdminSettings {
  practitionerEmail: string;
}

export interface UseAdminScheduleResult {
  setWeeklyHours: (hours: WeeklyHoursInput[]) => Promise<{ ok: true }>;
  setDateOverride: (override: DateOverrideInput) => Promise<{ ok: true }>;
  deleteDateOverride: (date: string) => Promise<{ ok: true }>;
  getSettings: () => Promise<AdminSettings>;
  updatePractitionerEmail: (email: string) => Promise<AdminSettings>;
}

/** Reads the admin key without requiring vite/client ambient types. */
function getAdminKey(): string {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return env?.VITE_ADMIN_API_KEY ?? '';
}

interface ErrorPayload {
  error?: string;
}

/**
 * Shared fetch helper: attaches JSON + admin-key headers, parses the body,
 * and throws on non-2xx with the server's error message when available.
 */
async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': getAdminKey(),
      ...(options.headers ?? {}),
    },
  });

  const data = (await res.json().catch(() => ({}))) as ErrorPayload;
  if (!res.ok) {
    throw new Error(data.error || `Admin request failed (${res.status}).`);
  }
  return data as T;
}

export function useAdminSchedule(): UseAdminScheduleResult {
  const setWeeklyHours = (hours: WeeklyHoursInput[]) =>
    adminFetch<{ ok: true }>('/api/admin/set-hours', {
      method: 'POST',
      body: JSON.stringify({ type: 'weekly', hours }),
    });

  const setDateOverride = (override: DateOverrideInput) =>
    adminFetch<{ ok: true }>('/api/admin/set-hours', {
      method: 'POST',
      body: JSON.stringify({ type: 'override', override }),
    });

  const deleteDateOverride = (date: string) =>
    adminFetch<{ ok: true }>('/api/admin/set-hours', {
      method: 'POST',
      body: JSON.stringify({ type: 'override-delete', date }),
    });

  const getSettings = () => adminFetch<AdminSettings>('/api/admin/settings', { method: 'GET' });

  const updatePractitionerEmail = (email: string) =>
    adminFetch<AdminSettings>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ practitionerEmail: email }),
    });

  return { setWeeklyHours, setDateOverride, deleteDateOverride, getSettings, updatePractitionerEmail };
}
