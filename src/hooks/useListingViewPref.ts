import { useCallback, useEffect, useState } from 'react';
import { loadUiPreference, saveUiPreference } from '../lib/uiPreferences';

export function useListingViewPref(
  prefKey: string,
  fallback: 'grid' | 'list' = 'grid',
): readonly ['grid' | 'list', (view: 'grid' | 'list') => void] {
  const [view, setView] = useState<'grid' | 'list'>(fallback);

  useEffect(() => {
    let cancelled = false;
    void loadUiPreference<string>(prefKey).then((stored) => {
      if (cancelled) return;
      if (stored === 'list' || stored === 'grid') setView(stored);
    });
    return () => {
      cancelled = true;
    };
  }, [prefKey]);

  const setViewPersisted = useCallback(
    (next: 'grid' | 'list') => {
      setView(next);
      void saveUiPreference(prefKey, next);
    },
    [prefKey],
  );

  return [view, setViewPersisted] as const;
}
