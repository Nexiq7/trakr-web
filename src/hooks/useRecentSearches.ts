import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'trakr:recent-searches';
const MAX_ENTRIES = 6;

function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    // Private mode, blocked storage, or a value someone else wrote — an empty
    // history is a fine answer, a thrown error in a render is not.
    return [];
  }
}

/**
 * The last few things this browser searched for, so an empty search field has
 * something better to offer than a blank panel.
 */
export function useRecentSearches() {
  const [recent, setRecent] = useState<string[]>(read);

  // Two search surfaces can be mounted at once (the palette and the search
  // page); a write in one should show up in the other.
  useEffect(() => {
    const sync = () => setRecent(read());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const remember = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;

    setRecent((previous) => {
      const next = [
        trimmed,
        ...previous.filter((item) => item.toLowerCase() !== trimmed.toLowerCase()),
      ].slice(0, MAX_ENTRIES);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Keeping it in memory for this session is still better than failing.
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setRecent([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nothing to clean up */
    }
  }, []);

  return { recent, remember, clear };
}
