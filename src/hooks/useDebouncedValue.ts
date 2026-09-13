import { useEffect, useState } from 'react';

/**
 * A value that settles after `delay` ms of quiet.
 *
 * Search runs as you type, and every keystroke would be a request unless
 * something absorbs the burst. Debouncing the *value* rather than the request
 * keeps the input perfectly responsive — the field updates on every key, only
 * the fetch waits.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  // Clearing the field takes effect at once: waiting on the timer would leave
  // stale results sitting under an empty input.
  const cleared = typeof value === 'string' && value.trim() === '';
  return cleared ? value : settled;
}
