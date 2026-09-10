import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { SessionExpiredError } from '../lib/api';
import {
  fetchWatchlist,
  mediaKey,
  trackMedia,
  untrackMedia,
  type WatchStatus,
  type WatchlistEntry,
} from '../lib/tvdb';

interface SaveInput {
  type: string;
  id: string | number;
  status?: WatchStatus;
  score?: number;
  /** Title and artwork for the optimistic row, so it renders before the server replies. */
  details?: { name?: string; image?: string; year?: string };
}

interface WatchlistContextValue {
  entries: WatchlistEntry[];
  isLoading: boolean;
  /** Look up one title's entry — what every poster card and details page asks. */
  entryFor: (type: string, id: string | number) => WatchlistEntry | undefined;
  save: (input: SaveInput) => Promise<void>;
  remove: (type: string, id: string | number) => Promise<void>;
  refresh: () => void;
}

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

/** What a one-tap save means when the user didn't pick a status. */
const DEFAULT_STATUS: WatchStatus = 'planning';

/** One shared empty list, so a signed-out render doesn't churn the context value. */
const EMPTY: WatchlistEntry[] = [];

const STATUS_LABELS: Record<WatchStatus, string> = {
  watching: 'Watching',
  planning: 'Plan to watch',
  completed: 'Completed',
  dropped: 'Dropped',
};

/**
 * One copy of the signed-in user's collection, shared by every view.
 *
 * Before this, each page fetched the list for itself, so saving on a details
 * page left the collection page showing something else until it remounted. A
 * single store also means a poster card anywhere can offer "save" and have the
 * whole app agree about it a frame later — the write is applied locally first
 * and rolled back only if the server disagrees.
 */
export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const { toast } = useToast();

  const [rows, setRows] = useState<WatchlistEntry[]>([]);
  // Which session's list `rows` holds. Deriving the visible list and the
  // loading flag from this — rather than clearing state when the token changes
  // — means signing out never shows the previous account's titles, even for the
  // frame before an effect could run.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((current) => current + 1), []);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    fetchWatchlist()
      .then((list) => {
        if (cancelled) return;
        setRows(list);
        setLoadedFor(token);
      })
      .catch(() => {
        if (cancelled) return;
        setRows([]);
        setLoadedFor(token);
      });

    return () => {
      cancelled = true;
    };
  }, [token, nonce]);

  const entries = token && loadedFor === token ? rows : EMPTY;
  const isLoading = Boolean(token) && loadedFor !== token;

  const entryFor = useCallback(
    (type: string, id: string | number) => {
      const key = mediaKey(type, id);
      return entries.find((entry) => entry.mediaId === key);
    },
    [entries],
  );

  const save = useCallback<WatchlistContextValue['save']>(
    async ({ type, id, status, score, details }) => {
      const key = mediaKey(type, id);
      const previous = entries;
      const existing = previous.find((entry) => entry.mediaId === key);

      const nextStatus = status ?? existing?.status ?? DEFAULT_STATUS;
      const nextScore = score ?? existing?.score ?? 0;

      // Paint the change now. The request is the confirmation, not the trigger.
      const optimistic: WatchlistEntry = {
        id: existing?.id ?? -Date.now(),
        mediaId: key,
        type,
        status: nextStatus,
        score: nextScore,
        createdAt: existing?.createdAt,
        details: { ...existing?.details, ...details },
      };

      setRows(
        existing
          ? previous.map((entry) => (entry.mediaId === key ? optimistic : entry))
          : [...previous, optimistic],
      );

      try {
        const saved = await trackMedia({
          mediaId: key,
          type,
          status: nextStatus,
          score: nextScore,
        });
        setRows((list) =>
          list.map((entry) =>
            entry.mediaId === key
              ? { ...optimistic, id: saved.id ?? optimistic.id, createdAt: saved.createdAt ?? optimistic.createdAt }
              : entry,
          ),
        );

        if (!existing) {
          toast(`Added to ${STATUS_LABELS[nextStatus]}`);
        } else if (status && status !== existing.status) {
          toast(`Moved to ${STATUS_LABELS[nextStatus]}`);
        } else if (score != null) {
          toast(`Scored ${score}/10`);
        }
      } catch (error) {
        setRows(previous);
        if (!(error instanceof SessionExpiredError)) {
          toast("Couldn't save that", { tone: 'error' });
        }
      }
    },
    [entries, toast],
  );

  const remove = useCallback<WatchlistContextValue['remove']>(
    async (type, id) => {
      const key = mediaKey(type, id);
      const previous = entries;
      const removed = previous.find((entry) => entry.mediaId === key);
      if (!removed) return;

      setRows(previous.filter((entry) => entry.mediaId !== key));

      try {
        await untrackMedia(key);
        toast('Removed from collection', {
          tone: 'info',
          // Undo restores the row rather than re-adding a fresh one, so the
          // status and score the user had chosen survive a misclick.
          action: {
            label: 'Undo',
            onClick: () => {
              setRows((list) => [...list, removed]);
              trackMedia({
                mediaId: key,
                type,
                status: removed.status,
                score: removed.score ?? 0,
              }).catch(() => setRows((list) => list.filter((e) => e.mediaId !== key)));
            },
          },
        });
      } catch (error) {
        setRows(previous);
        if (!(error instanceof SessionExpiredError)) {
          toast("Couldn't remove that", { tone: 'error' });
        }
      }
    },
    [entries, toast],
  );

  const value = useMemo(
    () => ({ entries, isLoading, entryFor, save, remove, refresh }),
    [entries, isLoading, entryFor, save, remove, refresh],
  );

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error('useWatchlist must be used inside a WatchlistProvider');
  return ctx;
}
