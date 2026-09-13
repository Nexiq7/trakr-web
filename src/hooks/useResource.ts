import { useCallback, useEffect, useEffectEvent, useState, useSyncExternalStore } from 'react';
import { getEntry, isStale, load, subscribe } from '../lib/tvdb';

interface ResourceState<T> {
  data: T | null;
  /** True only when there's nothing to show yet — a stale refresh isn't loading. */
  isLoading: boolean;
  error: Error | null;
  reload: () => void;
}

interface Options {
  /** Skip the request entirely, e.g. a search with no term yet. */
  enabled?: boolean;
}

/**
 * Read a cached resource, refreshing it in the background when it's stale.
 *
 * The cache is an external store, so it's read through `useSyncExternalStore`
 * rather than mirrored into component state. That's what makes the second visit
 * to a page instant: cached data is already there on the first render, so
 * navigating back paints content instead of flashing skeletons, and any other
 * component holding the same key re-renders when fresh data lands.
 */
export function useResource<T>(
  key: string,
  fetcher: () => Promise<T>,
  { enabled = true }: Options = {},
): ResourceState<T> {
  const entry = useSyncExternalStore(
    useCallback((onChange) => subscribe(key, onChange), [key]),
    useCallback(() => getEntry<T>(key), [key]),
  );

  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);

  // A new key is a new request; the previous one's failure says nothing about
  // it. Adjusting during render rather than in an effect means the component
  // never paints one key's data under another key's error.
  const [errorKey, setErrorKey] = useState(key);
  if (errorKey !== key) {
    setErrorKey(key);
    setError(null);
  }
  const reload = useCallback(() => setNonce((current) => current + 1), []);

  // The fetcher is nearly always an inline arrow, so it's a new function every
  // render. Reading it through an effect event lets the request fire with the
  // current one without making it a dependency that restarts the effect.
  const run = useEffectEvent(() => fetcher());

  useEffect(() => {
    if (!enabled) return;
    // Fresh cache and nothing asked for a refresh: nothing to do.
    if (!isStale(getEntry(key)) && nonce === 0) return;

    let cancelled = false;
    load(key, () => run())
      .then(() => {
        if (!cancelled) setError(null);
      })
      .catch((cause: unknown) => {
        // A background refresh that fails leaves the reader with the old data,
        // which beats replacing a working page with an error.
        if (cancelled || getEntry(key)) return;
        setError(cause instanceof Error ? cause : new Error(String(cause)));
      });

    return () => {
      cancelled = true;
    };
  }, [key, enabled, nonce]);

  return {
    data: enabled && entry ? entry.data : null,
    isLoading: enabled && !entry && error === null,
    error,
    reload,
  };
}
