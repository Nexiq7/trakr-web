import { useSlidingIndicator } from '../../hooks/useSlidingIndicator';

interface SegmentedProps<T extends string> {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  className?: string;
}

/**
 * A single-choice pill group. A radiogroup rather than a row of buttons, so it
 * is announced as one control with a current selection — which is what it
 * looks like.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className = '',
}: SegmentedProps<T>) {
  const activeIndex = options.findIndex((option) => option.id === value);
  const { containerRef, box } = useSlidingIndicator(activeIndex, [options.length, value]);

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={label}
      className={`relative inline-flex p-1 rounded-full bg-white/6 border border-white/8 ${className}`}
    >
      {box && (
        <span
          aria-hidden
          className="absolute top-1 bottom-1 rounded-full bg-white/14 border border-white/8 transition-all duration-[420ms] ease-spring"
          style={{ left: box.left, width: box.width }}
        />
      )}

      {options.map((option, index) => (
        <button
          key={option.id}
          data-index={index}
          role="radio"
          aria-checked={option.id === value}
          onClick={() => onChange(option.id)}
          className={`relative px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors duration-300 ease-apple ${
            option.id === value ? 'text-white' : 'text-white/50 hover:text-white/85'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
