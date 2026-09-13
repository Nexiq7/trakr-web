import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, SlidersHorizontal, X } from 'lucide-react';
import { PosterCard, PosterCardSkeleton } from '../components/PosterCard';
import { Segmented } from '../components/ui/Segmented';
import { useResource } from '../hooks/useResource';
import {
  browseKey,
  fetchBrowse,
  fetchGenres,
  genresKey,
  type Genre,
  type MediaType,
  type SortId,
  type Title,
} from '../lib/tvdb';

const TYPES: { id: MediaType; label: string }[] = [
  { id: 'series', label: 'Series' },
  { id: 'movie', label: 'Movies' },
];

const SORTS: { id: SortId; label: string }[] = [
  { id: 'trending', label: 'Trending' },
  { id: 'score', label: 'Popular' },
  { id: 'firstAired', label: 'Newest' },
  { id: 'name', label: 'A–Z' },
];

const PAGE_SIZE = 30;

/** Poster width at the widest column, used to pick an artwork source. */
const CARD_WIDTH = 190;

function parseSort(value: string | null): SortId {
  return SORTS.some((sort) => sort.id === value) ? (value as SortId) : 'trending';
}

function parseGenres(value: string | null): number[] {
  if (!value) return [];
  return value
    .split(',')
    .map((part) => Number.parseInt(part, 10))
    .filter((id) => Number.isFinite(id));
}

/**
 * Browse the whole catalog.
 *
 * Every filter lives in the URL rather than in component state, so a set of
 * filters is a link: shareable, bookmarkable, and still there when you come
 * back from a details page.
 */
export function Discover() {
  const [searchParams, setSearchParams] = useSearchParams();

  const type: MediaType = searchParams.get('type') === 'movie' ? 'movie' : 'series';
  const sort = parseSort(searchParams.get('sort'));
  const selectedGenres = useMemo(() => parseGenres(searchParams.get('genres')), [searchParams]);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const genresState = useResource<Genre[]>(genresKey, fetchGenres);
  const genres = genresState.data ?? [];

  const key = browseKey({ type, sort, genres: selectedGenres });
  const { data, isLoading } = useResource<Title[]>(key, () =>
    fetchBrowse({ type, sort, genres: selectedGenres }),
  );
  const items = data ?? [];

  // Any change of filter is a new result set, so paging starts over. Adjusting
  // during render keeps the grid from painting page 3 of the previous filter.
  const [pagedKey, setPagedKey] = useState(key);
  if (pagedKey !== key) {
    setPagedKey(key);
    setVisibleCount(PAGE_SIZE);
  }

  const patchParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);
      for (const [param, value] of Object.entries(patch)) {
        if (value === null || value === '') next.delete(param);
        else next.set(param, value);
      }
      // Filters replace rather than push: Back should leave Discover, not walk
      // backwards through every chip you tapped.
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const toggleGenre = (id: number) => {
    const next = selectedGenres.includes(id)
      ? selectedGenres.filter((genreId) => genreId !== id)
      : [...selectedGenres, id];
    patchParams({ genres: next.join(',') });
  };

  // Infinite scroll: a sentinel below the grid pages in the next batch as it
  // comes into view, so browsing is one continuous scroll.
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMore = visibleCount < items.length;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisibleCount((count) => count + PAGE_SIZE);
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, items.length]);

  const visibleItems = items.slice(0, visibleCount);
  const activeFilterCount = selectedGenres.length;

  return (
    <div className="min-h-screen pt-28 md:pt-32 pb-24">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 lg:px-16">
        <header className="mb-7">
          <h1 className="text-[34px] md:text-[46px] font-semibold tracking-tight">Discover</h1>
          <p className="text-white/45 text-[14.5px] mt-2">
            {isLoading
              ? 'Loading the catalog…'
              : `${items.length} ${type === 'movie' ? 'movies' : 'series'} to browse`}
          </p>
        </header>
      </div>

      {/* Stays where it sits in the page rather than following the scroll, so
          it never covers the posters. */}
      <div className="py-3 -my-1">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 lg:px-16">
          <div className="inline-flex max-w-full flex-wrap items-center gap-2.5 p-2 rounded-[20px] glass-panel shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
            <Segmented
              options={TYPES}
              value={type}
              onChange={(next) => patchParams({ type: next === 'series' ? null : next })}
              label="Media type"
            />
            <Segmented
              options={SORTS}
              value={sort}
              onChange={(next) => patchParams({ sort: next === 'trending' ? null : next })}
              label="Sort order"
            />

            <button
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-medium transition-colors duration-300 ease-apple ${
                filtersOpen || activeFilterCount > 0
                  ? 'bg-accent/20 text-accent-soft border border-accent/35'
                  : 'bg-white/6 text-white/60 hover:text-white border border-white/8'
              }`}
            >
              <SlidersHorizontal size={14} />
              Genres
              {activeFilterCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10.5px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {activeFilterCount > 0 && (
              <button
                onClick={() => patchParams({ genres: null })}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-medium text-white/45 hover:text-white transition-colors duration-300"
              >
                <X size={13} /> Clear
              </button>
            )}
          </div>

          {filtersOpen && (
            <div className="mt-2 p-3 rounded-[20px] glass-panel shadow-[0_10px_30px_rgba(0,0,0,0.4)] animate-scale-in origin-top max-w-3xl">
              {genresState.isLoading ? (
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 14 }).map((_, index) => (
                    <div key={index} className="h-8 w-24 rounded-full skeleton" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-[38vh] overflow-y-auto scrollbar-hide">
                  {genres.map((genre) => {
                    const active = selectedGenres.includes(genre.id);
                    return (
                      <button
                        key={genre.id}
                        onClick={() => toggleGenre(genre.id)}
                        aria-pressed={active}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-all duration-300 ease-apple active:scale-95 ${
                          active
                            ? 'bg-accent/20 border-accent/40 text-accent-soft'
                            : 'bg-white/5 border-white/8 text-white/55 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {active && <Check size={12} strokeWidth={3} />}
                        {genre.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedGenres.length > 1 && (
                <p className="text-[12px] text-white/35 mt-3 px-1">
                  Showing titles that match all {selectedGenres.length} genres.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-10 lg:px-16 mt-7">
        {isLoading ? (
          <Grid>
            {Array.from({ length: 18 }).map((_, index) => (
              <PosterCardSkeleton key={index} />
            ))}
          </Grid>
        ) : items.length === 0 ? (
          <div className="text-center py-24 rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
            <p className="text-white/70 font-medium text-[15px]">Nothing matches those filters</p>
            <p className="text-white/35 text-[13px] mt-2">
              Try removing a genre, or switch the sort order.
            </p>
            {activeFilterCount > 0 && (
              <button
                onClick={() => patchParams({ genres: null })}
                className="mt-6 px-5 py-2.5 rounded-full bg-white text-black text-[13px] font-semibold hover:bg-white/90 transition-colors duration-300"
              >
                Clear genres
              </button>
            )}
          </div>
        ) : (
          <>
            <Grid>
              {visibleItems.map((item, index) => (
                <PosterCard
                  key={item.id}
                  type={type}
                  id={item.id}
                  name={item.name}
                  subtitle={item.year}
                  image={item.image}
                  displayWidth={CARD_WIDTH}
                  priority={index < 12}
                />
              ))}
            </Grid>

            {hasMore && (
              <>
                <div ref={sentinelRef} aria-hidden className="h-px" />
                <Grid className="mt-8">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <PosterCardSkeleton key={index} />
                  ))}
                </Grid>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Grid({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-9 ${className}`}
    >
      {children}
    </div>
  );
}
