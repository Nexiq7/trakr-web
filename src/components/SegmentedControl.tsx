interface SegmentedOption<T extends string> {
  id: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Stretch segments to share the full width evenly, rather than hugging their labels. */
  fill?: boolean;
  /**
   * Let segments flow onto more rows instead of squeezing onto one. Use when
   * there are more options than fit the container — labels stay readable and
   * every option stays one tap away.
   */
  wrap?: boolean;
  label: string;
  className?: string;
}

/**
 * A single-choice pill group. Modelled as a radiogroup rather than buttons so
 * screen readers announce it as one control with a current selection, which is
 * what it looks like.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  fill = false,
  wrap = false,
  label,
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`${fill || wrap ? 'flex w-full' : 'inline-flex'} ${
        wrap ? 'flex-wrap' : ''
      } p-1 gap-1 rounded-2xl bg-surface border border-white/8 ${className}`}
    >
      {options.map((option) => {
        const isActive = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.id)}
            // A 28% basis fits three per row before wrapping; flex-1 then shares
            // out the slack, so a trailing row of two splits the width evenly.
            // Wrapped segments trade some padding for label room, which is what
            // keeps the longest label intact on a 320px screen.
            className={`${
              wrap ? 'flex-1 basis-[28%] min-w-0 px-2.5' : `${fill ? 'flex-1 min-w-0' : ''} px-3.5`
            } truncate py-2 rounded-xl text-[13px] font-medium transition-colors duration-300 ease-apple ${
              isActive ? 'bg-white/12 text-white' : 'text-white/50 hover:text-white/80'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
