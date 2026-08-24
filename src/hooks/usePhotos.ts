/**
 * usePhotos — resolves photo slot images for public components.
 *
 * Loads cached overrides immediately (instant paint), then refreshes from
 * /api/photos in the background. `version` increments whenever overrides
 * change so consumers re-render with the new URLs.
 */

import { useCallback, useEffect, useState } from 'react';
import { fetchPhotoOverrides, getPhoto } from '../services/photos';

export interface UsePhotosResult {
  /** Current image URL for a slot (override or bundled default). */
  photo: (slot: string) => string;
  /** Re-fetch overrides from the backend and bump the render version. */
  refresh: () => Promise<void>;
  /** Increments on every override change — use as a render dependency. */
  version: number;
}

export function usePhotos(): UsePhotosResult {
  const [version, setVersion] = useState(0);

  const refresh = useCallback(async () => {
    await fetchPhotoOverrides();
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const photo = useCallback((slot: string) => getPhoto(slot), []);

  return { photo, refresh, version };
}
