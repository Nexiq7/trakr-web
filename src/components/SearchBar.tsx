import { ArrowRight, Loader2, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  /**
   * Called with the trimmed term on submit. Omit where results update as you
   * type — without it the field is a live filter and shows no submit button.
   */
  onSubmit?: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Shows a spinner in place of the submit affordance. */
  isLoading?: boolean;
  /** Extra classes for the form element, e.g. spacing at the call site. */
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search for movies or shows...',
  autoFocus = false,
  isLoading = false,
  className = '',
}: SearchBarProps) {
  const trimmed = value.trim();
  const canSubmit = trimmed.length > 0 && !isLoading;
  // Only one control occupies the right slot at a time. Clearing fills in
  // wherever the submit arrow isn't — on a live-filter field it's always the
  // one shown, and whitespace-only input stays clearable even where it can't
  // be submitted.
  const showClear = value.length > 0 && !isLoading && !(onSubmit && canSubmit);

  return (
    <form
      role="search"
      className={`relative w-full ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (trimmed) onSubmit?.(trimmed);
      }}
    >

      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => onChange(e.target.value)}
        // The native search clear button is suppressed in favour of the one
        // below: WebKit pins it to the edge where it collides with the controls
        // here, and Firefox draws none at all. Right padding stays reserved so
        // long text never runs under whichever control is showing.
        className="w-full bg-surface/70 backdrop-blur-xl border border-white/10 focus:border-accent/50 py-4 pl-4 pr-14 rounded-2xl text-[17px] text-white placeholder:text-white/30 outline-none transition-colors duration-300 ease-apple focus:shadow-[0_0_0_4px_rgba(124,92,255,0.14)] [&::-webkit-search-cancel-button]:appearance-none"
      />

      {isLoading && (
        <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 text-white/35 animate-spin" size={18} />
      )}

      {/* Clearing is only offered where there's no submit arrow to show instead,
          so the slot never holds two controls at once. */}
      {showClear && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/85 hover:bg-white/10 transition-colors duration-300 ease-apple"
        >
          <X size={16} />
        </button>
      )}

      {onSubmit && (
        <button
          type="submit"
          aria-label="Search"
          tabIndex={canSubmit ? 0 : -1}
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-accent-strong text-white flex items-center justify-center transition-all duration-300 ease-apple hover:brightness-110 ${
            canSubmit ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
          }`}
        >
          <ArrowRight size={16} />
        </button>
      )}
    </form>
  );
}
