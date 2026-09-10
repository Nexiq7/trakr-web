import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Track the position of the selected child so an indicator can slide to it.
 *
 * The indicator is measured rather than calculated: options are sized by their
 * labels, so "A–Z" and "Trending" are not the same width and any arithmetic
 * that assumes they are drifts off the selection. Measuring also survives a
 * font swap and a container resize, both of which move the targets.
 */
export function useSlidingIndicator(activeIndex: number, deps: unknown[] = []) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ left: number; width: number } | null>(null);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const active = container.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    if (!active) {
      setBox(null);
      return;
    }
    setBox({ left: active.offsetLeft, width: active.offsetWidth });
  }, [activeIndex]);

  useEffect(() => {
    measure();

    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    for (const child of container.children) observer.observe(child);

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, ...deps]);

  return { containerRef, box };
}
