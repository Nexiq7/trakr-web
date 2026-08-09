import { useEffect, useState } from 'react';
import { PosterCard, PosterCardSkeleton } from '../components/PosterCard';

interface Show {
  id: string | number;
  name: string;
  year: string;
  image: string;
}

interface Genre {
  id: number;
  name: string;
}

const TYPES: { id: 'series' | 'movie'; label: string }[] = [
  { id: 'series', label: 'Series' },
  { id: 'movie', label: 'Movies' },
];

const SORTS: { id: 'trending' | 'score' | 'firstAired' | 'name'; label: string }[] = [
  { id: 'trending', label: 'Trending' },
  { id: 'score', label: 'Popular' },
  { id: 'firstAired', label: 'Newest' },
  { id: 'name', label: 'A–Z' },
];

const PAGE_SIZE = 24;

export const Discover = () => {
  const [type, setType] = useState<'series' | 'movie'>('series');
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [sort, setSort] = useState<'trending' | 'score' | 'firstAired' | 'name'>('trending');
  const [items, setItems] = useState<Show[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(true);

  const genreKey = [...selectedGenres].sort((a, b) => a - b).join(',');

  const toggleGenre = (id: number) => {
    setSelectedGenres((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  };

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/tvdb/genres`)
      .then((res) => res.json())
      .then((json) => setGenres((json.data || []).sort((a: Genre, b: Genre) => a.name.localeCompare(b.name))))
      .catch(() => setGenres([]));
  }, []);

  useEffect(() => {
    const apiType = type === 'movie' ? 'movies' : 'series';
    const params = new URLSearchParams();
    if (sort === 'trending') {
      params.set('trending', '1');
    } else {
      params.set('sort', sort);
      params.set('sortType', sort === 'name' ? 'asc' : 'desc');
    }
    if (genreKey) params.set('genre', genreKey);

    Promise.resolve().then(() => {
      setIsLoading(true);
      setVisibleCount(PAGE_SIZE);
    });

    fetch(`${import.meta.env.VITE_API_URL}/tvdb/browse/${apiType}?${params}`)
      .then((res) => res.json())
      .then((json) => setItems(json.data || []))
      .catch(() => setItems([]))
      .finally(() => setIsLoading(false));
  }, [type, genreKey, sort]);

  const visibleItems = items.slice(0, visibleCount);

  return (
    <div className="min-h-screen pt-28 md:pt-36 pb-24 px-6 md:px-10 lg:px-16">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Discover</h1>
          <p className="text-white/45 text-sm mt-2.5">Browse the full catalog by genre</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="inline-flex p-1 rounded-full bg-surface border border-white/8">
            {TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors duration-300 ease-apple ${
                  type === t.id ? 'bg-white/12 text-white' : 'text-white/50 hover:text-white/80'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="inline-flex p-1 rounded-full bg-surface border border-white/8">
            {SORTS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSort(s.id)}
                className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors duration-300 ease-apple ${
                  sort === s.id ? 'bg-white/12 text-white' : 'text-white/50 hover:text-white/80'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-2 flex-nowrap overflow-x-auto scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0 md:flex-wrap">
            <button
              onClick={() => setSelectedGenres([])}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-colors duration-300 ease-apple ${
                selectedGenres.length === 0
                  ? 'bg-accent/18 border-accent/40 text-[#c3b2ff]'
                  : 'bg-white/5 border-white/8 text-white/55 hover:text-white/80'
              }`}
            >
              All genres
            </button>
            {genres.map((g) => (
              <button
                key={g.id}
                onClick={() => toggleGenre(g.id)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-colors duration-300 ease-apple ${
                  selectedGenres.includes(g.id)
                    ? 'bg-accent/18 border-accent/40 text-[#c3b2ff]'
                    : 'bg-white/5 border-white/8 text-white/55 hover:text-white/80'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
          {selectedGenres.length > 1 && (
            <p className="text-[12px] text-white/35 mt-3">matching all {selectedGenres.length} genres</p>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-5 gap-y-8">
            {Array.from({ length: 12 }).map((_, i) => (
              <PosterCardSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-white/35 text-sm py-16">Nothing found for this filter</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-5 gap-y-8">
              {visibleItems.map((item) => (
                <PosterCard
                  key={item.id}
                  href={`/details/${type}/${item.id}`}
                  name={item.name}
                  subtitle={item.year}
                  image={item.image}
                />
              ))}
            </div>

            {visibleCount < items.length && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                  className="px-5 py-2.5 rounded-full bg-white/8 hover:bg-white/14 border border-white/8 text-[13px] font-medium text-white/80 transition-colors duration-300 ease-apple"
                >
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
