import { Link } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import { Spotlight } from '../components/Spotlight';
import { LandingHero } from '../components/LandingHero';
import { Bento } from '../components/Bento';
import { StarBar } from '../components/StarBar';
import { Rail, RailItem } from '../components/Rail';
import { PosterCard, PosterCardSkeleton } from '../components/PosterCard';
import { Artwork } from '../components/Artwork';
import { Reveal } from '../components/Reveal';
import { useAuth } from '../context/AuthContext';
import { useWatchlist } from '../context/WatchlistContext';
import { useResource } from '../hooks/useResource';
import {
  fetchPopular,
  fetchTrending,
  idFromMediaKey,
  popularKey,
  trendingKey,
  type MediaType,
  type Title,
} from '../lib/tvdb';

/** Skeleton cards per rail — enough to overflow the widest viewport. */
const RAIL_SKELETONS = 8;

function TitleRail({
  title,
  seeAll,
  items,
  isLoading,
  type,
  priority = false,
}: {
  title: string;
  seeAll: string;
  items: Title[] | null;
  isLoading: boolean;
  type: MediaType;
  priority?: boolean;
}) {
  if (!isLoading && (!items || items.length === 0)) return null;

  return (
    <Rail title={title} seeAll={seeAll}>
      {isLoading || !items
        ? Array.from({ length: RAIL_SKELETONS }).map((_, index) => (
            <RailItem key={index}>
              <PosterCardSkeleton />
            </RailItem>
          ))
        : items.slice(0, 20).map((item, index) => (
            <RailItem key={item.id}>
              <PosterCard
                type={type}
                id={item.id}
                name={item.name}
                subtitle={item.year}
                image={item.image}
                displayWidth={168}
                // The first row above the fold shouldn't wait on the lazy
                // observer; everything past the first screen still does.
                priority={priority && index < 6}
              />
            </RailItem>
          ))}
    </Rail>
  );
}

/**
 * The row that gets a returning viewer back into something in one tap.
 *
 * Wide cards rather than posters, because this is the one row where you already
 * know what the titles are — recognition is done, so the artwork can be bigger
 * and the target easier to hit.
 */
function ContinueWatching() {
  const { entries } = useWatchlist();
  const watching = entries.filter((entry) => entry.status === 'watching' && entry.details?.name);

  if (watching.length === 0) return null;

  return (
    <Rail title="Continue watching" seeAll="/watchlist">
      {watching.map((entry) => {
        const id = idFromMediaKey(entry.mediaId);
        const type: MediaType = entry.type === 'movie' ? 'movie' : 'series';

        return (
          <RailItem key={entry.mediaId} wide>
            <Link to={`/details/${type}/${id}`} className="group block">
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/8 bg-surface shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-transform duration-500 ease-apple group-hover:-translate-y-1.5">
                <Artwork
                  image={entry.details?.image}
                  alt={entry.details?.name ?? ''}
                  displayWidth={300}
                  className="absolute inset-0"
                  imgClassName="transition-transform duration-[900ms] ease-apple group-hover:scale-105"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"
                />
                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-apple">
                  <span className="w-12 h-12 rounded-full glass-panel flex items-center justify-center">
                    <Play size={18} fill="currentColor" className="ml-0.5 text-white" />
                  </span>
                </span>
              </div>
              <h3 className="mt-2.5 text-[13.5px] font-medium text-white/90 truncate group-hover:text-white transition-colors duration-300">
                {entry.details?.name}
              </h3>
            </Link>
          </RailItem>
        );
      })}
    </Rail>
  );
}

export function Home() {
  const { token } = useAuth();

  const trendingSeries = useResource<Title[]>(trendingKey('series'), () => fetchTrending('series'));
  const trendingMovies = useResource<Title[]>(trendingKey('movie'), () => fetchTrending('movie'));
  const popularSeries = useResource<Title[]>(popularKey('series'), () => fetchPopular('series'));
  const popularMovies = useResource<Title[]>(popularKey('movie'), () => fetchPopular('movie'));

  // The wall behind the landing pitch wants as much artwork as it can get, and
  // doesn't care where it came from.
  const wallPosters = [...(trendingSeries.data ?? []), ...(popularSeries.data ?? [])];

  return (
    <div className="flex flex-col">
      {token ? (
        <Spotlight
          items={trendingSeries.data ?? []}
          type="series"
          isLoading={trendingSeries.isLoading}
        />
      ) : (
        <LandingHero posters={wallPosters} />
      )}

      <div className="flex flex-col gap-14 py-14">
        {token && <ContinueWatching />}

        <TitleRail
          title="Trending series"
          seeAll="/discover?type=series"
          items={trendingSeries.data}
          isLoading={trendingSeries.isLoading}
          type="series"
          priority
        />

        <TitleRail
          title="Trending movies"
          seeAll="/discover?type=movie"
          items={trendingMovies.data}
          isLoading={trendingMovies.isLoading}
          type="movie"
        />

        <TitleRail
          title="Popular series"
          seeAll="/discover?type=series&sort=score"
          items={popularSeries.data}
          isLoading={popularSeries.isLoading}
          type="series"
        />

        <TitleRail
          title="Popular movies"
          seeAll="/discover?type=movie&sort=score"
          items={popularMovies.data}
          isLoading={popularMovies.isLoading}
          type="movie"
        />

        <Reveal className="px-6 md:px-10 lg:px-16">
          <Link
            to="/discover"
            className="group flex items-center justify-between gap-6 p-6 md:p-8 rounded-3xl border border-white/8 bg-white/[0.035] hover:border-white/16 transition-colors duration-500 ease-apple edge-highlight relative overflow-hidden"
          >
            <div>
              <h3 className="text-[19px] md:text-[22px] font-semibold tracking-tight text-white">
                Still nothing catching your eye?
              </h3>
              <p className="mt-1.5 text-[13.5px] text-white/45">
                Filter the whole catalog by genre and sort it your way.
              </p>
            </div>
            <span className="shrink-0 w-11 h-11 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-white transition-all duration-500 ease-apple group-hover:bg-white group-hover:text-black">
              <ArrowRight size={18} />
            </span>
          </Link>
        </Reveal>
      </div>

      {!token && (
        <>
          <div aria-hidden className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
          <Bento posters={wallPosters} />
        </>
      )}

      {token && <StarBar />}
    </div>
  );
}
