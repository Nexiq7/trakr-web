import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, Search } from 'lucide-react';
import { Artwork } from './Artwork';
import { SearchBar } from './SearchBar';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useRecentSearches } from '../hooks/useRecentSearches';
import { useResource } from '../hooks/useResource';
import { fetchSearch, searchKey, type SearchResult } from '../lib/tvdb';

/** Few enough that the panel never covers the page it's floating over. */
const MAX_RESULTS = 5;

interface SearchSuggestProps {
  className?: string;
  placeholder?: string;
}

/**
 * A search field that answers while you type.
 *
 * On the landing page the field used to be a form: type, submit, land on the
 * results page, and only then find out whether the thing you wanted is in the
 * catalog. The matches now arrive under the field as you type, so the common
 * case — you know exactly what you're looking for — is one keystroke shorter
 * than a page load.
 *
 * Enter still goes to the full results page, which is what it does with
 * nothing highlighted; the arrow keys are how you reach into the list.
 */
export function SearchSuggest({ className = '', placeholder }: SearchSuggestProps) {
  const navigate = useNavigate();
  const { remember } = useRecentSearches();
  const wrapper = useRef<HTMLDivElement>(null);
  const listId = useId();

  const [query, setQuery] = useState('');
  /** -1 means nothing is highlighted, so Enter belongs to the form, not a row. */
  const [active, setActive] = useState(-1);
  const [dismissed, setDismissed] = useState(false);

  const term = useDebouncedValue(query.trim(), 260);
  const searching = term.length > 1;

  const { data, isLoading } = useResource<SearchResult[]>(
    searchKey(term),
    () => fetchSearch(term),
    { enabled: searching },
  );

  const results = useMemo(() => (data ?? []).slice(0, MAX_RESULTS), [data]);
  const open = searching && !dismissed;

  // A new term is a new list: it starts with nothing highlighted, and a panel
  // dismissed for the last term shouldn't stay shut for this one.
  const [shownFor, setShownFor] = useState(term);
  if (shownFor !== term) {
    setShownFor(term);
    setActive(-1);
    setDismissed(false);
  }

  // A click anywhere else is a dismissal. Pointerdown rather than click, so the
  // panel is gone before whatever was clicked reacts.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setDismissed(true);
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const openResult = (item: SearchResult) => {
    remember(item.name);
    navigate(`/details/${item.type}/${item.tvdb_id}`);
  };

  const searchEverything = (value: string) => {
    remember(value);
    navigate(`/search?q=${encodeURIComponent(value)}`);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      // A search input clears itself on Escape in WebKit and Chrome. With a
      // list open that's too much: the first Escape should put the list away
      // and leave what was typed, and only a second one clear the field.
      if (open) event.preventDefault();
      setDismissed(true);
      return;
    }

    if (event.key === 'Tab') {
      setDismissed(true);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!open || results.length === 0) return;
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      // The row before the first is "no selection", which is how you get back
      // to searching everything without deleting what you typed.
      setActive((current) => {
        const next = current + step;
        if (next < -1) return results.length - 1;
        if (next >= results.length) return -1;
        return next;
      });
      return;
    }

    if (event.key === 'Enter') {
      const item = results[active];
      // Without a highlighted row the form submits and the full results page
      // takes over, so only a highlighted one needs intercepting.
      if (open && item) {
        event.preventDefault();
        openResult(item);
      }
    }
  };

  return (
    <div ref={wrapper} className={`relative w-full ${className}`}>
      <SearchBar
        value={query}
        onChange={setQuery}
        onSubmit={searchEverything}
        placeholder={placeholder}
        // Only while the first page of matches is on its way: swapping the
        // spinner in on every keystroke makes the control flicker.
        isLoading={searching && isLoading && results.length === 0}
        inputProps={{
          onKeyDown,
          onFocus: () => setDismissed(false),
          'aria-controls': listId,
          'aria-expanded': open,
        }}
      />

      <p className="sr-only" aria-live="polite">
        {open && !isLoading
          ? results.length === 0
            ? `No matches for ${term}`
            : `${results.length} ${results.length === 1 ? 'result' : 'results'} for ${term}`
          : ''}
      </p>

      {open && (
        // Solid rather than the usual glass: this floats over the landing
        // page's own white buttons and poster wall, and even a little of those
        // coming through made the list hard to read. Capped in vh because the
        // hero clips whatever leaves it, with the rows scrolling inside so the
        // last row is the footer rather than something half-covered by it.
        <div
          id={listId}
          className="absolute left-0 right-0 top-full mt-2 z-20 flex flex-col p-1.5 max-h-[min(30vh,340px)] rounded-2xl border border-white/10 bg-[#121216] shadow-[0_26px_80px_rgba(0,0,0,0.7)] text-left animate-scale-in"
        >
          {results.length > 0 && (
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
              {results.map((item, index) => (
                <button
                  key={`${item.type}-${item.tvdb_id}`}
                  type="button"
                  data-active={index === active}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => openResult(item)}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors duration-200 ease-apple ${
                    index === active ? 'bg-white/10' : 'hover:bg-white/6'
                  }`}
                >
                  <Artwork
                    image={item.thumbnail || item.image_url}
                    alt=""
                    displayWidth={40}
                    className="w-10 shrink-0 aspect-[2/3] rounded-lg border border-white/10"
                  />
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-[14px] font-medium text-white truncate">
                      {item.name}
                    </span>
                    <span className="block text-[12px] text-white/45 mt-0.5">
                      {[item.year, item.type === 'movie' ? 'Movie' : 'Series']
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  {index === active && (
                    <CornerDownLeft size={14} className="shrink-0 text-white/30" />
                  )}
                </button>
              ))}
            </div>
          )}

          {!isLoading && results.length === 0 && (
            <p className="px-3 py-6 text-center text-[13.5px] text-white/45">
              Nothing matches “{term}”
            </p>
          )}

          {isLoading && results.length === 0 && (
            <div className="p-2 flex flex-col gap-2" aria-hidden>
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="w-10 shrink-0 aspect-[2/3] rounded-lg skeleton" />
                  <span className="flex-1 flex flex-col gap-2">
                    <span className="h-3 w-2/5 rounded-full skeleton" />
                    <span className="h-2.5 w-1/5 rounded-full skeleton" />
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => searchEverything(term)}
            className={`shrink-0 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-medium text-white/50 hover:text-white hover:bg-white/6 transition-colors duration-200 ease-apple ${
              results.length > 0 ? 'mt-1 border-t border-white/8 rounded-t-none' : ''
            }`}
          >
            <Search size={13} />
            Search everything for “{term}”
          </button>
        </div>
      )}
    </div>
  );
}
