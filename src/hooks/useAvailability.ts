/**
 * useAvailability — fetches bookable time slots for a given date + duration
 * from the backend (`GET /api/availability`).
 *
 * Behaviour:
 *  - Fetches whenever `date` or `durationMinutes` changes (no fetch while
 *    `date` is null).
 *  - Aborts the in-flight request when inputs change or the component
 *    unmounts, so stale responses never overwrite fresh state.
 *  - `refetch()` re-runs the request for the current inputs (e.g. after a
 *    failed attempt or after submitting a booking).
 */

import { useCallback, useEffect, useState } from 'react';

/** One candidate start time as returned by the API. */
export interface AvailabilitySlot {
  time: string; // "HH:MM"
  available: boolean;
}

export interface UseAvailabilityResult {
  slots: AvailabilitySlot[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Shape of the success payload from GET /api/availability. */
interface AvailabilityResponse {
  date: string;
  slots: AvailabilitySlot[];
  error?: string;
}

export function useAvailability(
  date: string | null,
  durationMinutes: number
): UseAvailabilityResult {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped by refetch() to retrigger the effect for the same inputs.
  const [refreshIndex, setRefreshIndex] = useState<number>(0);

  const refetch = useCallback(() => {
    setRefreshIndex((index) => index + 1);
  }, []);

  useEffect(() => {
    // No date selected yet: reset to an idle, empty state.
    if (!date) {
      setSlots([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const url = `/api/availability?date=${encodeURIComponent(
      date
    )}&duration=${encodeURIComponent(String(durationMinutes))}`;

    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        const data = (await res.json()) as AvailabilityResponse;
        if (!res.ok) {
          throw new Error(data.error || `Availability request failed (${res.status}).`);
        }
        return data;
      })
      .then((data) => {
        setSlots(Array.isArray(data.slots) ? data.slots : []);
      })
      .catch((err: unknown) => {
        // Aborted requests are expected on input change/unmount — ignore them.
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load availability.');
        setSlots([]);
      })
      .finally(() => {
        // Only the latest, non-aborted request may clear the loading flag.
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [date, durationMinutes, refreshIndex]);

  return { slots, loading, error, refetch };
}
