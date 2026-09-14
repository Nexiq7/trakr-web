import { useCallback, useEffect, useRef, useState } from 'react';

export interface Page<T> {
  data: T[];
  hasMore: boolean;
}

interface Session<T> {
  /** Which list this is — a late page is checked against it before it's added. */
  key: string;
  items: T[];
  nextPage: number;
  hasMore: boolean;
  /** Index of the first item from the latest page; earlier ones don't animate again. */
  freshFrom: number;
  storedAt: number;
}

/**
 * Loaded pages per list, kept for the life of the tab.
 *
 * Going to a details page and pressing Back remounts Discover. Without this it
 * would start again from page one and lose the reader's place several pages
 * down; with it the grid comes back as it was, and the browser's scroll
 * restoration lands on the same poster.
 */
const sessions = new Map<string, Session<unknown>>();

/** Past this a remembered list is dropped and fetched fresh — the server's lists move. */
const SESSION_TTL_MS = 10 * 60 * 1000;

function restore<T>(key: string): Session<T> {
  const session = sessions.get(key) as Session<T> | undefined;
  if (session && Date.now() - session.storedAt < SESSION_TTL_MS) {
    // Already seen, so nothing in it should play an entrance again.
    return { ...session, freshFrom: session.items.length };
  }
  return { key, items: [], nextPage: 1, hasMore: true, freshFrom: 0, storedAt: Date.now() };
}

function append<T extends { id: string | number }>(session: Session<T>, page: Page<T>): Session<T> {
  // Server lists shift between requests, so a title can come back on two
  // pages. The first appearance stays.
  const seen = new Set(session.items.map((item) => String(item.id)));
  return {
    key: session.key,
    items: [...session.items, ...page.data.filter((item) => !seen.has(String(item.id)))],
    nextPage: session.nextPage + 1,
    hasMore: page.hasMore,
    freshFrom: session.items.length,
    storedAt: Date.now(),
  };
}

interface InfiniteList<T> {
  items: T[];
  hasMore: boolean;
  /** Nothing to show yet and the first page is on its way. */
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  /** Index of the first item from the most recent page — where the entrance animation starts. */
  freshFrom: number;
  /** Attach to an element at the end of the list; pages load while it's near the viewport. */
  attachSentinel: (node: HTMLElement | null) => void;
  retry: () => void;
}

/**
 * A list fetched a page at a time as the reader scrolls.
 *
 * Loading is driven entirely by an IntersectionObserver on a sentinel after the
 * last item — including the first page, since an empty list's sentinel is
 * already in view. The observer is recreated after every page, and a new
 * observer reports straight away whether its target is visible, so a page too
 * short to fill the screen (a narrow genre, say) leads straight to the next
 * one without the reader having to nudge the scroll.
 */
export function useInfiniteList<T extends { id: string | number }>(
  key: string,
  fetchPage: (page: number) => Promise<Page<T>>,
): InfiniteList<T> {
  const [session, setSession] = useState<Session<T>>(() => restore<T>(key));
  // Loading and failure are recorded against the list they happened to, so a
  // filter change can't inherit the previous list's spinner or error.
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ key: string; error: Error } | null>(null);
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null);

  // A different filter is a different list. Adjusting during render means the
  // grid never paints the old filter's titles under the new one's controls.
  if (session.key !== key) setSession(restore<T>(key));

  const fetchRef = useRef(fetchPage);
  useEffect(() => {
    fetchRef.current = fetchPage;
  });

  const inFlight = useRef<string | null>(null);

  const current = session.key === key ? session : null;
  const isLoadingMore = loadingKey === key;
  const error = failure?.key === key ? failure.error : null;

  const loadMore = useCallback(() => {
    if (!current?.hasMore) return;
    const requestKey = `${current.key}#${current.nextPage}`;
    if (inFlight.current === requestKey) return;
    inFlight.current = requestKey;

    const base = current;
    setLoadingKey(base.key);

    fetchRef
      .current(base.nextPage)
      .then((page) => {
        const next = append(base, page);
        sessions.set(base.key, next);
        // Lands only if the reader is still on this list; otherwise it waits in
        // the session cache for when they come back to it.
        setSession((shown) => (shown.key === base.key ? next : shown));
      })
      .catch((cause: unknown) => {
        setFailure({ key: base.key, error: cause instanceof Error ? cause : new Error(String(cause)) });
      })
      .finally(() => {
        if (inFlight.current === requestKey) inFlight.current = null;
        setLoadingKey((loading) => (loading === base.key ? null : loading));
      });
  }, [current]);

  useEffect(() => {
    // Paused while a page is loading or after a failure: the reader retries
    // explicitly rather than the observer hammering a failing endpoint.
    if (!sentinel || !current?.hasMore || isLoadingMore || error) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) loadMore();
      },
      // Start well before the end, so the next page is usually there by the
      // time the reader reaches it.
      { rootMargin: '0px 0px 900px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinel, current, isLoadingMore, error, loadMore]);

  const retry = useCallback(() => setFailure(null), []);

  const items = current?.items ?? [];
  return {
    items,
    hasMore: current?.hasMore ?? true,
    isInitialLoading: items.length === 0 && (current?.hasMore ?? true) && !error,
    isLoadingMore,
    error,
    freshFrom: current?.freshFrom ?? 0,
    attachSentinel: setSentinel,
    retry,
  };
}
