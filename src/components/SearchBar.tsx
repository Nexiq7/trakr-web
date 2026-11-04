import type { InputHTMLAttributes } from 'react';
import { Loader2, Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  /**
   * Called with the trimmed term when the field is submitted. There is no
   * submit button to press — Enter is the gesture, and a field that answers
   * as you type has its own list to reach for.
   */
  onSubmit?: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Shows a spinner in place of the submit affordance. */
  isLoading?: boolean;
  /** Passed straight to the input — keyboard handling for a field that suggests as you type. */
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search movies and shows…',
  autoFocus = false,
  isLoading = false,
  inputProps,
  className = '',
}: SearchBarProps) {
  const trimmed = value.trim();
  // The right slot holds one thing at a time: the spinner while the first
  // matches load, otherwise a way to empty the field.
  const showClear = value.length > 0 && !isLoading;

  return (
    <form
      role="search"
      className={`group relative w-full ${className}`}
      onSubmit={(event) => {
        event.preventDefault();
        if (trimmed) onSubmit?.(trimmed);
      }}
    >
      <Search
        size={17}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none transition-colors duration-300 group-focus-within:text-white/60"
      />

      <input
        {...inputProps}
        type="search"
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => onChange(event.target.value)}
        // The native search clear button is suppressed in favour of the one
        // below: WebKit pins it to the edge where it collides with the controls
        // here, and Firefox draws none at all. Right padding stays reserved so
        // long text never runs under whichever control is showing.
        // A flat, solid surface rather than the usual glass: this field sits
        // over the landing page's poster wall as often as over a black page,
        // and glass meant it looked like a different control on each.
        className="w-full py-4 pl-11 pr-14 rounded-2xl border border-white/10 bg-[#121216] text-[16.5px] text-white placeholder:text-white/30 outline-none transition-all duration-300 ease-apple focus:border-white/25 [&::-webkit-search-cancel-button]:appearance-none"
      />

      {isLoading && (
        <Loader2
          className="absolute right-5 top-1/2 -translate-y-1/2 text-white/35 animate-spin"
          size={18}
        />
      )}

      {showClear && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors duration-300 ease-apple"
        >
          <X size={16} />
        </button>
      )}
    </form>
  );
}
