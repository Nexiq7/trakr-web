import { useEffect, useRef, useState, type ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  /** Stagger within a group, in ms. */
  delay?: number;
  className?: string;
}

/**
 * Fades its children up the first time they scroll into view. The page's plain
 * `animate-fade-up` fires on load, so anything below the fold would finish its
 * entrance long before you reached it.
 */
export function Reveal({ children, delay = 0, className = '' }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Where motion is unwelcome there's nothing to animate towards, so start
  // shown and never observe anything.
  const [shown, setShown] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        observer.disconnect();
      },
      // Hold off until the element is a little way into the viewport, so it
      // animates while you're looking at it rather than at the very edge.
      { rootMargin: '0px 0px -12% 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [shown]);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-apple ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      } ${className}`}
    >
      {children}
    </div>
  );
}
