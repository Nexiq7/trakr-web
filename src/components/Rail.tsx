import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface RailProps {
  title: string;
  /** Where the heading leads — the full list for this rail. Headings without one aren't links. */
  seeAll?: string;
  children: ReactNode;
}

/**
 * A horizontally scrolling row of cards.
 *
 * The arrows only appear once there's something in that direction to scroll to,
 * so a short row doesn't advertise controls that do nothing. Scroll snapping
 * keeps a card aligned to the left edge after a swipe rather than leaving a
 * sliver of the previous one showing.
 */
export function Rail({ title, seeAll, children }: RailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setEdges({
      start: el.scrollLeft > 8,
      end: maxScroll > 8 && el.scrollLeft < maxScroll - 8,
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    measure();
    el.addEventListener('scroll', measure, { passive: true });

    // Cards arrive after the data does, which changes scrollWidth without any
    // scroll or resize event to notice it by.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of el.children) observer.observe(child);

    return () => {
      el.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [measure, children]);

  // Where an arrow-started scroll is heading. A second click while the first is
  // still animating pages on from there, not from wherever the animation is.
  const pendingLeft = useRef<number | null>(null);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Move exactly one screen of whole cards.
   *
   * Paging by a fraction of the width skipped or repeated cards depending on
   * the window size. Instead this counts the cards that are fully visible and
   * moves by that many, so a click to the right starts with the first card that
   * was cut off, and a click to the left undoes it exactly.
   */
  const page = (direction: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    const items = Array.from(el.children) as HTMLElement[];
    if (items.length === 0) return;

    const style = getComputedStyle(el);
    const padStart = parseFloat(style.paddingLeft) || 0;
    const padEnd = parseFloat(style.paddingRight) || 0;
    const containerLeft = el.getBoundingClientRect().left;

    // Card positions in scroll coordinates: where scrollLeft must be for the
    // card's left edge to sit at the container's left edge.
    const lefts = items.map((item) => item.getBoundingClientRect().left - containerLeft + el.scrollLeft);
    const widths = items.map((item) => item.getBoundingClientRect().width);

    const from = pendingLeft.current ?? el.scrollLeft;
    const viewStart = from + padStart;
    const viewEnd = from + el.clientWidth - padEnd;

    const first = Math.max(0, lefts.findIndex((left) => left >= viewStart - 1));
    const perPage = Math.max(
      1,
      lefts.filter((left, i) => left >= viewStart - 1 && left + widths[i]! <= viewEnd + 1).length,
    );

    const targetIndex = Math.min(items.length - 1, Math.max(0, first + direction * perPage));
    const maxScroll = el.scrollWidth - el.clientWidth;
    const target = Math.min(maxScroll, Math.max(0, lefts[targetIndex]! - padStart));

    pendingLeft.current = target;
    if (pendingTimer.current) clearTimeout(pendingTimer.current);
    pendingTimer.current = setTimeout(() => {
      pendingLeft.current = null;
    }, 700);

    el.scrollTo({ left: target, behavior: 'smooth' });
  };

  return (
    <section className="flex flex-col gap-4">
      {/* Headers and cards share the page column the hero's copy and every
          other section use, so a rail's first poster starts on the same line
          as the hero's title. Without it the rails sat at the window's own
          gutter and everything else indented past them on a wide display. */}
      <div className="w-full max-w-[1400px] mx-auto flex items-center justify-between gap-4 px-6 md:px-10 lg:px-16">
        {/* The heading is the way into the full list — a separate "See all"
            next to it said the same thing twice. The chevron waits for a
            hover, so the row reads as a title until you reach for it. */}
        <h2 className="text-[20px] md:text-[22px] font-semibold tracking-tight">
          {seeAll ? (
            <Link
              to={seeAll}
              className="group/title inline-flex items-baseline gap-1.5 text-white/95 hover:text-white transition-colors duration-300 ease-apple"
            >
              {title}
              <ChevronRight
                size={18}
                aria-hidden
                className="self-center opacity-0 -translate-x-1 transition-all duration-300 ease-apple group-hover/title:opacity-55 group-hover/title:translate-x-0"
              />
            </Link>
          ) : (
            title
          )}
        </h2>

        <div className="hidden md:flex items-center gap-1.5">
          {[
            { dir: -1 as const, icon: ChevronLeft, enabled: edges.start, label: 'Scroll left' },
            { dir: 1 as const, icon: ChevronRight, enabled: edges.end, label: 'Scroll right' },
          ].map(({ dir, icon: Icon, enabled, label }) => (
            <button
              key={label}
              onClick={() => page(dir)}
              disabled={!enabled}
              aria-label={label}
              className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/16 flex items-center justify-center transition-all duration-300 ease-apple disabled:opacity-25 disabled:pointer-events-none active:scale-90"
            >
              <Icon size={16} />
            </button>
          ))}
        </div>
      </div>

      {/* The gutter is the wrapper's, not the scroller's. With the padding
          inside the scroll box, cards slid through it and showed a clipped
          sliver out in the margin, left of the heading; with it outside, the
          row starts and ends on the column's edges, so the first card lines up
          under the heading and the last one under the arrows. */}
      <div className="w-full max-w-[1400px] mx-auto px-6 md:px-10 lg:px-16">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2"
        >
          {children}
        </div>
      </div>
    </section>
  );
}

/** Fixed-width slot so rails keep their rhythm whatever the card inside is. */
export function RailItem({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div
      className={`flex-none snap-start ${wide ? 'w-[260px] md:w-[300px]' : 'w-[142px] md:w-[168px]'}`}
    >
      {children}
    </div>
  );
}
