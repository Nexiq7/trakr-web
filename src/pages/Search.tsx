import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock, Search as SearchIcon, Sparkles } from 'lucide-react';
import { PosterCard, PosterCardSkeleton } from '../components/PosterCard';
import { SearchBar } from '../components/SearchBar';
import { Segmented } from '../components/ui/Segmented';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useRecentSearches } from '../hooks/useRecentSearches';
import { useResource } from '../hooks/useResource';
import { fetchSearch, searchKey, type SearchResult } from '../lib/tvdb';

type Filter = 'all' | 'series' | 'movie';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'series', label: 'Series' },
  { id: 'movie', label: 'Movies' },
];

const SUGGESTIONS = [
  'Breaking Bad',
  'Severance',
  'Dune',
  'The Bear',
  'Arcane',
  'Interstellar',
];

export function Search() {
  // The URL owns the query: a search handed over from the home page runs on
  // arrival, and any search can be linked or bookmarked. Keystrokes replace the
  // history entry instead of pushing, so Back leaves the page once rather than
  // unwinding the term a letter at a time.
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const setQuery = (value: string) =>
    setSearchParams(value ? { q: value } : {}, { replace: true });

  const [filter, setFilter] = useState<Filter>('all');
  const { recent, remember, clear } = useRecentSearches();

  const term = useDebouncedValue(query.trim(), 320);
  const active = term.length > 0;

  const { data, isLoading } = useResource<SearchResult[]>(
    searchKey(term),
    () => fetchSearch(term),
    { enabled: active },
  );

  // Remember only searches that found something — a half-typed term isn't
  // worth offering back later.
  useEffect(() => {
    if (active && !isLoading && (data?.length ?? 0) > 0) remember(term);
  }, [active, isLoading, data, term, remember]);

  const results = useMemo(() => data ?? [], [data]);
  const filtered = useMemo(
    () => (filter === 'all' ? results : results.filter((item) => item.type === filter)),
    [results, filter],
  );

  const counts = useMemo(
    () => ({
      all: results.length,
      series: results.filter((item) => item.type === 'series').length,
      movie: results.filter((item) => item.type === 'movie').length,
    }),
    [results],
  );

  const settled = active && !isLoading;
  // A term typed but not yet debounced should still show the spinner, or the
  // page looks like it stopped responding mid-keystroke.
  const pending = query.trim() !== '' && (isLoading || query.trim() !== term);

  return (
    <div className="min-h-screen pt-28 md:pt-32 pb-24 px-6 md:px-10 lg:px-16">
      <div className="max-w-2xl mx-auto">
        <SearchBar
          autoFocus
          value={query}
          onChange={setQuery}
          isLoading={pending}
          placeholder="Search movies and shows…"
        />
      </div>

      {active && results.length > 0 && (
        <div className="flex justify-center mt-5">
          <Segmented
            options={FILTERS.map((option) => ({
              ...option,
              label: `${option.label} ${counts[option.id]}`,
            }))}
            value={filter}
            onChange={setFilter}
            label="Filter results"
          />
        </div>
      )}

      <div className="max-w-[1400px] mx-auto mt-10">
        {!active ? (
          <div className="max-w-lg mx-auto text-center">
            <span className="w-14 h-14 mx-auto rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-5">
              <SearchIcon size={22} className="text-white/30" />
            </span>
            <p className="text-white/80 font-medium text-[16px]">Find something to watch</p>
            <p className="text-white/35 text-[13.5px] mt-1.5">
              Search the whole catalog, then save it in one tap.
            </p>

            {recent.length > 0 && (
              <div className="mt-9">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Clock size={12} className="text-white/25" />
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/30">
                    Recent
                  </span>
                  <button
                    onClick={clear}
                    className="text-[11.5px] text-white/25 hover:text-white/70 transition-colors duration-300"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {recent.map((item) => (
                    <button
                      key={item}
                      onClick={() => setQuery(item)}
                      className="px-3.5 py-1.5 rounded-full bg-white/8 border border-white/10 text-[13px] text-white/70 hover:text-white hover:bg-white/14 transition-colors duration-300 ease-apple"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-9">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Sparkles size={12} className="text-white/25" />
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/30">
                  Try one of these
                </span>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((item) => (
                  <button
                    key={item}
                    onClick={() => setQuery(item)}
                    className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/8 text-[13px] text-white/55 hover:text-white hover:bg-white/10 transition-colors duration-300 ease-apple"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : pending && results.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-9">
            {Array.from({ length: 12 }).map((_, index) => (
              <PosterCardSkeleton key={index} />
            ))}
          </div>
        ) : settled && filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/70 font-medium text-[15px]">No results for “{term}”</p>
            <p className="text-white/35 text-[13px] mt-2">
              Check the spelling, or try a shorter title.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-9">
            {filtered.map((item, index) => (
              <PosterCard
                key={`${item.type}-${item.tvdb_id}`}
                type={item.type}
                id={item.tvdb_id}
                name={item.name}
                subtitle={[item.year, item.type === 'movie' ? 'Movie' : 'Series']
                  .filter(Boolean)
                  .join(' · ')}
                image={item.image_url}
                displayWidth={190}
                priority={index < 12}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
