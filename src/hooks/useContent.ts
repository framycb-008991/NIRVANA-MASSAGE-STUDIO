/**
 * useContent — resolves editable site-content slots for public components.
 *
 * Loads cached values immediately (instant paint), then refreshes from
 * /api/content in the background. `version` increments whenever values
 * change so consumers re-render.
 */

import { useCallback, useEffect, useState } from 'react';
import { fetchContent, getContent } from '../services/content';

export interface UseContentResult {
  /** Current value of a content slot (override or built-in default). */
  content: (key: string) => string;
  /** Re-fetch values from the backend and bump the render version. */
  refresh: () => Promise<void>;
  /** Increments on every content refresh — use as a render dependency. */
  version: number;
}

export function useContent(): UseContentResult {
  const [version, setVersion] = useState(0);

  const refresh = useCallback(async () => {
    await fetchContent();
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const content = useCallback((key: string) => getContent(key), []);

  return { content, refresh, version };
}
