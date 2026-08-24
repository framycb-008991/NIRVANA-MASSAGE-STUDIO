// Weekly studio working hours — editable from the Admin Panel (Schedule tab).
// Defaults mirror supabase/schema.sql and api/hours.js; admin edits are
// stored server-side (working_hours table) and mirrored in localStorage.

const HOURS_KEY = 'nirvana_working_hours';

export interface WorkingDay {
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday (JS Date.getDay)
  isWorking: boolean;
  startTime: string; // "HH:MM"
  endTime: string; //   "HH:MM"
  bufferMinutes?: number;
  slotIncrementMinutes?: number;
}

export const DEFAULT_WORKING_HOURS: WorkingDay[] = [
  { dayOfWeek: 0, isWorking: true, startTime: '09:00', endTime: '21:00' }, // Sunday
  { dayOfWeek: 1, isWorking: true, startTime: '08:00', endTime: '14:00' }, // Monday
  { dayOfWeek: 2, isWorking: true, startTime: '14:30', endTime: '22:00' }, // Tuesday
  { dayOfWeek: 3, isWorking: true, startTime: '14:30', endTime: '22:00' }, // Wednesday
  { dayOfWeek: 4, isWorking: true, startTime: '14:30', endTime: '22:00' }, // Thursday
  { dayOfWeek: 5, isWorking: true, startTime: '08:00', endTime: '14:00' }, // Friday
  { dayOfWeek: 6, isWorking: true, startTime: '09:00', endTime: '21:00' }  // Saturday
];

function readOverrides(): WorkingDay[] | null {
  try {
    const raw = localStorage.getItem(HOURS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as WorkingDay[];
    }
  } catch {
    // corrupted storage — fall through to defaults
  }
  return null;
}

/** Current weekly hours: saved override or the seeded defaults. */
export function getWorkingHours(): WorkingDay[] {
  return readOverrides() ?? DEFAULT_WORKING_HOURS;
}

/** Hours for one JS weekday (Date.getDay()). */
export function getWorkingDay(dayOfWeek: number): WorkingDay | undefined {
  return getWorkingHours().find((d) => d.dayOfWeek === dayOfWeek);
}

export function setWorkingHours(hours: WorkingDay[]): void {
  try {
    localStorage.setItem(HOURS_KEY, JSON.stringify(hours));
  } catch {
    // storage unavailable — overrides simply won't persist
  }
}

/**
 * Pulls the latest weekly hours from the public API and caches them.
 * Silent no-op when the backend is unreachable (dev / static hosting).
 */
export async function fetchWorkingHours(): Promise<void> {
  try {
    const res = await fetch('/api/hours');
    if (!res.ok) return;
    const data = (await res.json()) as { hours?: WorkingDay[] };
    if (Array.isArray(data.hours) && data.hours.length > 0) {
      setWorkingHours(data.hours);
    }
  } catch {
    // backend not reachable — keep cached values
  }
}
