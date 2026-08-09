import { useEffect, useState } from 'react';
import { Search as SearchIcon, Loader2 } from 'lucide-react';
import { PosterCard } from '../components/PosterCard';

interface Result {
  tvdb_id: string;
  name: string;
  year?: string;
  type: 'series' | 'movie';
  image_url?: string;
}

const FILTERS: { id: 'all' | 'series' | 'movie'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'series', label: 'Series' },
  { id: 'movie', label: 'Movies' },
];

const SUGGESTIONS = ['Breaking Bad', 'Stranger Things', 'Inception', 'The Bear', 'Dune', 'Squid Game'];

export const Search = () => {
  const [query, setQuery] = useState('');
  const [rawResults, setRawResults] = useState<Result[] | null>(null);
  const [filter, setFilter] = useState<'all' | 'series' | 'movie'>('all');
  const [isLoading, setIsLoading] = useState(false);

  const trimmedQuery = query.trim();

  useEffect(() => {
    if (!trimmedQuery) return;

    const timeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/tvdb/search?q=${encodeURIComponent(trimmedQuery)}`);
        const json = await res.json();
        setRawResults(json.data || []);
      } catch {
        setRawResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [trimmedQuery]);

  const results = trimmedQuery ? rawResults ?? [] : [];
  const filtered = filter === 'all' ? results : results.filter((r) => r.type === filter);
  const searched = trimmedQuery !== '' && !isLoading && rawResults !== null;

  return (
    <div className="min-h-screen pt-28 md:pt-36 pb-24 px-6">
      <div className="max-w-2xl mx-auto mb-3">
        <form onSubmit={(e) => e.preventDefault()} className="relative">
          <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-white/35" size={18} />
          <input
            type="text"
            autoFocus
            value={query}
            placeholder="Search for movies or TV shows..."
            className="w-full bg-surface border border-white/10 focus:border-accent/50 py-4 pl-13 pr-5 rounded-2xl text-lg text-white placeholder:text-white/30 outline-none transition-colors duration-300 ease-apple focus:shadow-[0_0_0_4px_rgba(124,92,255,0.14)]"
            onChange={(e) => setQuery(e.target.value)}
          />
          {isLoading && (
            <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 text-white/35 animate-spin" size={18} />
          )}
        </form>
      </div>

      {results.length > 0 && (
        <div className="max-w-2xl mx-auto mb-12 flex gap-2 flex-wrap justify-center">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-colors duration-300 ease-apple ${
                filter === f.id
                  ? 'bg-accent/18 border-accent/40 text-[#c3b2ff]'
                  : 'bg-white/5 border-white/8 text-white/55 hover:text-white/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      <div className="max-w-[1400px] mx-auto">
        {!trimmedQuery ? (
          <div className="max-w-md mx-auto text-center pt-12">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-5">
              <SearchIcon size={22} className="text-white/30" />
            </div>
            <p className="text-white/75 font-medium text-[15px]">Find something to watch</p>
            <p className="text-white/35 text-[13.5px] mt-1.5">Search across movies and TV shows</p>
            <div className="flex flex-wrap justify-center gap-2 mt-7">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setQuery(s)}
                  className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/8 text-[13px] text-white/55 hover:text-white/85 hover:bg-white/10 transition-colors duration-300 ease-apple"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {searched && (
              <p className="text-[13px] font-medium text-white/40 mb-6 text-center">
                {filtered.length} result{filtered.length === 1 ? '' : 's'}
              </p>
            )}

            {searched && filtered.length === 0 ? (
              <p className="text-center text-white/35 text-sm py-16">No results for "{query}"</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-5 gap-y-8">
                {filtered.map((item) => (
                  <PosterCard
                    key={item.tvdb_id}
                    href={`/details/${item.type}/${item.tvdb_id}`}
                    name={item.name}
                    subtitle={[item.year, item.type === 'movie' ? 'Movie' : 'Series'].filter(Boolean).join(' · ')}
                    image={item.image_url}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
