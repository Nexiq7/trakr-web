import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Hero } from '../components/Hero';
import { PosterCard, PosterCardSkeleton, resolveImage } from '../components/PosterCard';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface Show {
  id: string | number;
  name: string;
  year: string;
  image: string;
}

interface WatchlistItem {
  mediaId: string;
  type: string;
  status: string;
  details?: { name: string; image: string };
}

function Row({ title, items, loading, type }: { title: string; items: Show[]; loading: boolean; type: 'series' | 'movie' }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => scrollRef.current?.scrollBy({ left: dir * 480, behavior: 'smooth' });

  if (!loading && items.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[22px] font-semibold tracking-tight">{title}</h2>
        <div className="hidden md:flex gap-2">
          <button onClick={() => scroll(-1)} className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/14 flex items-center justify-center transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => scroll(1)} className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/14 flex items-center justify-center transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide">
        {loading
          ? Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-none w-[150px] md:w-[170px]">
                <PosterCardSkeleton />
              </div>
            ))
          : items.map((show) => (
              <div key={show.id} className="flex-none w-[150px] md:w-[170px]">
                <PosterCard
                  href={`/details/${type}/${show.id}`}
                  name={show.name}
                  subtitle={show.year}
                  image={show.image}
                />
              </div>
            ))}
      </div>
    </section>
  );
}

const HERO_ROTATE_MS = 8000;

export const Home = () => {
  const { token } = useAuth();
  const [popularSeries, setPopularSeries] = useState<Show[]>([]);
  const [popularMovies, setPopularMovies] = useState<Show[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(true);
  const [moviesLoading, setMoviesLoading] = useState(true);
  const [trendingSeries, setTrendingSeries] = useState<Show[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<Show[]>([]);
  const [trendingSeriesLoading, setTrendingSeriesLoading] = useState(true);
  const [trendingMoviesLoading, setTrendingMoviesLoading] = useState(true);
  const [featuredList, setFeaturedList] = useState<any[]>([]);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [continueWatchingRaw, setContinueWatchingRaw] = useState<WatchlistItem[]>([]);
  const continueWatching = token ? continueWatchingRaw : [];

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/tvdb/popular/series`)
      .then((res) => res.json())
      .then((json) => {
        setPopularSeries((json.data || []).slice(0, 20));
        setSeriesLoading(false);
      });

    fetch(`${import.meta.env.VITE_API_URL}/tvdb/popular/movies`)
      .then((res) => res.json())
      .then((json) => {
        setPopularMovies((json.data || []).slice(0, 20));
        setMoviesLoading(false);
      });

    fetch(`${import.meta.env.VITE_API_URL}/tvdb/browse/series?trending=1`)
      .then((res) => res.json())
      .then((json) => {
        const list = (json.data || []).slice(0, 20);
        setTrendingSeries(list);
        setTrendingSeriesLoading(false);

        // Hydrate the top few trending shows with full details (backdrop art,
        // genres, trailer) so the hero can rotate through them.
        Promise.all(
          list.slice(0, 5).map((item: Show) =>
            fetch(`${import.meta.env.VITE_API_URL}/tvdb/details/series/${item.id}`)
              .then((res) => res.json())
              .then((detail) => ({ ...detail.data, __type: 'series' }))
              .catch(() => null)
          )
        ).then((results) => setFeaturedList(results.filter(Boolean)));
      });

    fetch(`${import.meta.env.VITE_API_URL}/tvdb/browse/movies?trending=1`)
      .then((res) => res.json())
      .then((json) => {
        setTrendingMovies((json.data || []).slice(0, 20));
        setTrendingMoviesLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!token) return;
    apiFetch('/api/watchlist-details')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: WatchlistItem[]) => {
        setContinueWatchingRaw((data || []).filter((item) => item.status === 'watching' && item.details?.name));
      })
      .catch(() => setContinueWatchingRaw([]));
  }, [token]);

  useEffect(() => {
    if (featuredList.length <= 1) return;
    const interval = setInterval(() => {
      setFeaturedIndex((i) => (i + 1) % featuredList.length);
    }, HERO_ROTATE_MS);
    return () => clearInterval(interval);
  }, [featuredList.length]);

  const featured = featuredList[featuredIndex];

  return (
    <div>
      {featured ? (
        <Hero
          item={featured}
          type={featured.__type}
          dotCount={featuredList.length}
          activeDot={featuredIndex}
          onDotClick={setFeaturedIndex}
        />
      ) : (
        <div className="relative h-[78vh] min-h-[560px] w-full art-placeholder art-loading" />
      )}

      <div className="max-w-[1400px] mx-auto px-6 md:px-10 lg:px-16 py-14 space-y-14">
        {continueWatching.length > 0 && (
          <section>
            <h2 className="text-[22px] font-semibold tracking-tight mb-5">Continue watching</h2>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide">
              {continueWatching.map((item) => {
                const actualId = item.mediaId.includes('-') ? item.mediaId.split('-')[1] : item.mediaId;
                const routeType = item.type === 'movie' ? 'movie' : 'series';
                return (
                  <div key={item.mediaId} className="flex-none w-[220px] md:w-[260px]">
                    <Link to={`/details/${routeType}/${actualId}`} className="group block">
                      <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/8 bg-surface shadow-[0_10px_26px_rgba(0,0,0,0.5)]">
                        {resolveImage(item.details?.image) ? (
                          <img
                            src={resolveImage(item.details?.image)!}
                            alt={item.details?.name}
                            className="w-full h-full object-cover transition-transform duration-500 ease-apple group-hover:scale-110"
                          />
                        ) : (
                          <div className="absolute inset-0 art-placeholder" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                      </div>
                      <h3 className="mt-2.5 text-[13.5px] font-medium text-white/90 truncate">{item.details?.name}</h3>
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <Row title="Trending Series" items={trendingSeries} loading={trendingSeriesLoading} type="series" />
        <Row title="Trending Movies" items={trendingMovies} loading={trendingMoviesLoading} type="movie" />
        <Row title="Popular Series" items={popularSeries} loading={seriesLoading} type="series" />
        <Row title="Popular Movies" items={popularMovies} loading={moviesLoading} type="movie" />
      </div>
    </div>
  );
};
