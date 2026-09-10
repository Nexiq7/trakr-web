import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Compass, CornerDownLeft, Library, Loader2, Search, X } from 'lucide-react';
import { Artwork } from './Artwork';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useRecentSearches } from '../hooks/useRecentSearches';
import { useResource } from '../hooks/useResource';
import { fetchSearch, searchKey, type SearchResult } from '../lib/tvdb';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const QUICK_LINKS = [
  { to: '/discover', label: 'Discover', hint: 'Browse by genre', icon: Compass },
  { to: '/watchlist', label: 'My collection', hint: 'Everything you track', icon: Library },
];

/** Enough to be useful, few enough to stay scannable without scrolling. */
const MAX_RESULTS = 7;

/**
 * Search without leaving the page you're on.
 *
 * The fastest path from "I heard about a show" to "it's in my collection" used
 * to be four navigations. Here it's a keystroke: ⌘K anywhere, type, Enter. The
 * palette overlays whatever you were doing and hands it back when you dismiss.
 */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  // Mounted only while open, so every session starts with an empty field and a
  // reset selection without an effect to clear them.
  if (!open) return null;
  return <PaletteDialog onClose={onClose} />;
}

function PaletteDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const { recent, remember, clear } = useRecentSearches();

  const term = useDebouncedValue(query.trim(), 260);
  const { data, isLoading } = useResource<SearchResult[]>(
    searchKey(term),
    () => fetchSearch(term),
    { enabled: term.length > 1 },
  );

  const results = useMemo(() => (data ?? []).slice(0, MAX_RESULTS), [data]);
  const searching = term.length > 1;

  // One flat list of everything Enter could land on, so arrow keys walk results
  // and quick links with the same index.
  const rows = useMemo(
    () =>
      searching
        ? results.map((item) => ({
            key: `${item.type}-${item.tvdb_id}`,
            run: () => {
              remember(item.name);
              navigate(`/details/${item.type}/${item.tvdb_id}`);
            },
          }))
        : QUICK_LINKS.map((link) => ({ key: link.to, run: () => navigate(link.to) })),
    [searching, results, navigate, remember],
  );

  // A fresh term is a fresh list; the highlight belongs on its first row.
  const [highlightedFor, setHighlightedFor] = useState(term);
  if (highlightedFor !== term) {
    setHighlightedFor(term);
    setActive(0);
  }

  useEffect(() => {
    const { body } = document;
    const previous = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => {
      body.style.overflow = previous;
    };
  }, []);

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (rows.length === 0) return;
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setActive((current) => (current + step + rows.length) % rows.length);
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const row = rows[active];
        if (row) {
          row.run();
          onClose();
        } else if (query.trim()) {
          // Nothing highlighted yet — fall through to the full results page.
          remember(query.trim());
          navigate(`/search?q=${encodeURIComponent(query.trim())}`);
          onClose();
        }
      }
    },
    [rows, active, onClose, query, navigate, remember],
  );

  return (
    <div className="fixed inset-0 z-[250] flex items-start justify-center px-4 pt-[12vh]">
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-lg animate-fade-in"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search trakr"
        onKeyDown={onKeyDown}
        className="relative w-full max-w-[560px] rounded-[24px] glass-panel shadow-[0_30px_90px_rgba(0,0,0,0.75)] overflow-hidden animate-scale-in"
      >
        <div className="flex items-center gap-3 px-4 h-[58px] border-b border-white/8">
          {isLoading && searching ? (
            <Loader2 size={18} className="shrink-0 text-white/40 animate-spin" />
          ) : (
            <Search size={18} className="shrink-0 text-white/40" />
          )}
          <input
            // The dialog mounts on open, so the attribute fires exactly once
            // per session — no ref and no focus effect needed.
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search movies and shows…"
            aria-label="Search movies and shows"
            className="flex-1 bg-transparent text-[16px] text-white placeholder:text-white/30 outline-none"
          />
          <button
            onClick={onClose}
            aria-label="Close search"
            className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors duration-300"
          >
            <X size={15} />
          </button>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto scrollbar-hide p-2">
          {searching ? (
            <>
              {results.map((item, index) => (
                <button
                  key={`${item.type}-${item.tvdb_id}`}
                  data-active={index === active}
                  onMouseMove={() => setActive(index)}
                  onClick={() => {
                    rows[index]?.run();
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3.5 p-2 rounded-2xl text-left transition-colors duration-200 ${
                    index === active ? 'bg-white/10' : 'hover:bg-white/6'
                  }`}
                >
                  <Artwork
                    image={item.image_url}
                    alt=""
                    displayWidth={40}
                    className="w-10 shrink-0 aspect-[2/3] rounded-lg border border-white/10"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium text-white truncate">
                      {item.name}
                    </span>
                    <span className="block text-[12px] text-white/40 mt-0.5">
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

              {!isLoading && results.length === 0 && (
                <p className="text-center text-[13.5px] text-white/40 py-10">
                  Nothing matches “{term}”
                </p>
              )}

              {results.length > 0 && (
                <button
                  onClick={() => {
                    remember(term);
                    navigate(`/search?q=${encodeURIComponent(term)}`);
                    onClose();
                  }}
                  className="w-full mt-1 py-2.5 rounded-2xl text-[13px] font-medium text-white/50 hover:text-white hover:bg-white/6 transition-colors duration-200"
                >
                  See all results for “{term}”
                </button>
              )}
            </>
          ) : (
            <>
              {recent.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center justify-between px-2 pt-1 pb-1.5">
                    <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/30">
                      Recent
                    </span>
                    <button
                      onClick={clear}
                      className="text-[11.5px] text-white/30 hover:text-white/70 transition-colors duration-200"
                    >
                      Clear
                    </button>
                  </div>
                  {recent.map((item) => (
                    <button
                      key={item}
                      onClick={() => setQuery(item)}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left hover:bg-white/6 transition-colors duration-200"
                    >
                      <Clock size={14} className="shrink-0 text-white/30" />
                      <span className="text-[13.5px] text-white/70 truncate">{item}</span>
                    </button>
                  ))}
                </div>
              )}

              <span className="block px-2 pt-1 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/30">
                Jump to
              </span>
              {QUICK_LINKS.map((link, index) => (
                <button
                  key={link.to}
                  data-active={index === active}
                  onMouseMove={() => setActive(index)}
                  onClick={() => {
                    navigate(link.to);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-xl text-left transition-colors duration-200 ${
                    index === active ? 'bg-white/10' : 'hover:bg-white/6'
                  }`}
                >
                  <link.icon size={15} className="shrink-0 text-white/45" />
                  <span className="text-[13.5px] font-medium text-white/85">{link.label}</span>
                  <span className="text-[12px] text-white/30 ml-auto">{link.hint}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
