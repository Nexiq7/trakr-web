import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface RailProps {
  title: string;
  /** Optional "See all" destination shown beside the heading. */
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

  // Just under a full viewport of cards, so the one at the edge stays visible
  // and gives you your place after the jump.
  const page = (direction: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * (el.clientWidth * 0.82), behavior: 'smooth' });
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 px-6 md:px-10 lg:px-16">
        <h2 className="text-[20px] md:text-[22px] font-semibold tracking-tight">{title}</h2>

        <div className="flex items-center gap-3">
          {seeAll && (
            <Link
              to={seeAll}
              className="group/link flex items-center gap-1 text-[13px] font-medium text-white/45 hover:text-white transition-colors duration-300 ease-apple"
            >
              See all
              <ArrowRight
                size={13}
                className="transition-transform duration-300 ease-apple group-hover/link:translate-x-0.5"
              />
            </Link>
          )}

          <div className="hidden md:flex gap-1.5">
            {[
              { dir: -1, icon: ChevronLeft, enabled: edges.start, label: 'Scroll left' },
              { dir: 1, icon: ChevronRight, enabled: edges.end, label: 'Scroll right' },
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
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-px-6 md:scroll-px-10 lg:scroll-px-16 px-6 md:px-10 lg:px-16 pb-2"
      >
        {children}
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
