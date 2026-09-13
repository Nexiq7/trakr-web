import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Check, Info } from 'lucide-react';
import { Artwork } from './Artwork';
import { useWatchlist } from '../context/WatchlistContext';
import { useTrackSheet } from '../context/TrackSheetContext';
import { useResource } from '../hooks/useResource';
import { prefetchImage, resolveImage } from '../lib/images';
import {
  detailsKey,
  fetchDetails,
  pickBackdrop,
  pickLogo,
  type MediaDetails,
  type MediaType,
  type Title,
} from '../lib/tvdb';

interface SpotlightProps {
  items: Title[];
  type: MediaType;
  isLoading: boolean;
}

const MAX_SLIDES = 5;

/**
 * The extended record for one slide.
 *
 * The browse list only carries a poster; the wide background and the title logo
 * live on the details record. Each slide asks for its own through the shared
 * cache, so the requests are made once, in parallel, and the details page is
 * already loaded by the time someone clicks through to it.
 */
function useSlideDetails(type: MediaType, id: string | number) {
  return useResource<MediaDetails>(detailsKey(type, String(id)), () =>
    fetchDetails(type, String(id)),
  ).data;
}

/**
 * The rotating feature at the top of the signed-in home page.
 *
 * Built like a streaming app's hero rather than a card: the title's own
 * background art fills the frame, its logo sits over it, and the rest of the
 * rotation waits along the bottom as wide cards you can jump to. Save and
 * Details are right in the slide, so discovering and collecting stay one
 * gesture.
 */
export function Spotlight({ items, type, isLoading }: SpotlightProps) {
  const slides = items.slice(0, MAX_SLIDES);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // The timer is a CSS animation, which reduced motion shortens to nothing —
  // left running it would flick through every slide at once.
  const [reducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  const next = () => setIndex((current) => (current + 1) % slides.length);

  // Decode the next slide's background while this one is on screen, so the
  // crossfade never reveals a half-loaded image.
  const upcoming = slides[(index + 1) % Math.max(slides.length, 1)];
  const upcomingDetails = useResource<MediaDetails>(
    detailsKey(type, String(upcoming?.id ?? '')),
    () => fetchDetails(type, String(upcoming!.id)),
    { enabled: upcoming != null },
  ).data;
  useEffect(() => {
    prefetchImage(resolveImage(pickBackdrop(upcomingDetails)));
  }, [upcomingDetails]);

  if (isLoading || slides.length === 0) return <SpotlightSkeleton />;

  const current = slides[Math.min(index, slides.length - 1)]!;
  const playState = paused ? 'paused' : 'running';

  return (
    <section
      className="relative w-full h-[86vh] min-h-[620px] max-h-[920px] overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured titles"
    >
      {slides.map((slide, slideIndex) => (
        <SlideBackdrop
          key={slide.id}
          type={type}
          slide={slide}
          active={slideIndex === index}
          priority={slideIndex === 0}
        />
      ))}

      {/* Scrims: dark behind the copy on the left, a floor for the card row,
          and a band under the navbar, which is transparent at the top. */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/45 to-black/5" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/70 to-transparent" />

      {slides.length > 1 && !reducedMotion && (
        // Invisible, but it is the carousel's clock: when this bar finishes, the
        // slide advances. Keyed by slide so each one starts from zero.
        <span
          key={index}
          aria-hidden
          onAnimationEnd={next}
          className="absolute w-px h-px opacity-0 pointer-events-none animate-progress"
          style={{ animationPlayState: playState }}
        />
      )}

      <div className="relative z-10 h-full max-w-[1400px] mx-auto px-6 md:px-10 lg:px-16 pt-28 pb-10 md:pb-12 flex flex-col justify-end gap-10">
        <SlideCopy key={current.id} slide={current} type={type} rank={index + 1} />

        {slides.length > 1 && (
          <>
            <div className="hidden md:grid grid-cols-5 gap-3 lg:gap-4">
              {slides.map((slide, slideIndex) => (
                <UpNextCard
                  key={slide.id}
                  type={type}
                  slide={slide}
                  active={slideIndex === index}
                  animate={!reducedMotion}
                  progressKey={index}
                  playState={playState}
                  onSelect={() => setIndex(slideIndex)}
                />
              ))}
            </div>

            <div className="md:hidden flex items-center gap-2">
              {slides.map((slide, slideIndex) => (
                <button
                  key={slide.id}
                  onClick={() => setIndex(slideIndex)}
                  aria-label={`Show ${slide.name}`}
                  aria-current={slideIndex === index}
                  className="h-6 flex items-center"
                >
                  <span
                    className={`block h-[3px] rounded-full overflow-hidden transition-all duration-500 ease-apple ${
                      slideIndex === index ? 'w-10 bg-white/25' : 'w-4 bg-white/20'
                    }`}
                  >
                    {slideIndex === index && (
                      <span
                        key={index}
                        className={`block h-full w-full bg-white origin-left ${
                          reducedMotion ? '' : 'animate-progress'
                        }`}
                        style={{ animationPlayState: playState }}
                      />
                    )}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function SlideBackdrop({
  type,
  slide,
  active,
  priority,
}: {
  type: MediaType;
  slide: Title;
  active: boolean;
  priority: boolean;
}) {
  const details = useSlideDetails(type, slide.id);
  const backdrop = pickBackdrop(details);

  return (
    <div
      aria-hidden={!active}
      className={`absolute inset-0 transition-opacity duration-[1200ms] ease-apple ${
        active ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {backdrop ? (
        <Artwork
          image={backdrop}
          alt=""
          kind="backdrop"
          displayWidth={1920}
          priority={priority}
          className="absolute inset-0"
          imgClassName="object-[center_25%] animate-subtle-zoom"
        />
      ) : (
        // No background art yet (or none at all): the poster, blown up and
        // blurred, keeps the slide tinted by its title instead of flat black.
        <Artwork
          image={slide.image}
          alt=""
          displayWidth={680}
          priority={priority}
          className="absolute inset-0"
          imgClassName="scale-150 blur-[64px] saturate-150 opacity-60"
        />
      )}
    </div>
  );
}

function SlideCopy({ slide, type, rank }: { slide: Title; type: MediaType; rank: number }) {
  const details = useSlideDetails(type, slide.id);
  const { entryFor } = useWatchlist();
  const { openTracker } = useTrackSheet();

  const logo = pickLogo(details);
  const saved = entryFor(type, slide.id) !== undefined;
  const genres = (details?.genres ?? []).slice(0, 3).map((genre) => genre.name);
  const rating = details?.contentRatings?.find((item) => item.country === 'usa')?.name;
  const runtime = details?.averageRuntime || details?.runtime || slide.averageRuntime;
  const network = details?.originalNetwork?.name;

  const meta = [
    slide.year,
    details?.status?.name ?? slide.status?.name,
    runtime ? `${runtime} min` : null,
    network,
  ].filter(Boolean);

  return (
    <div className="max-w-xl flex flex-col gap-4 animate-fade-up">
      <span className="flex items-center gap-2 text-[12px] font-semibold text-white/70">
        <span className="flex items-center justify-center min-w-6 h-6 px-1.5 rounded-md bg-accent text-white text-[12px] font-bold tabular-nums">
          {rank}
        </span>
        in trending {type === 'movie' ? 'movies' : 'series'}
      </span>

      {logo ? (
        <img
          src={resolveImage(logo)!}
          alt={slide.name}
          decoding="async"
          className="h-20 md:h-28 w-auto max-w-[min(440px,85vw)] object-contain object-left drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
        />
      ) : (
        <h1 className="text-[40px] md:text-[60px] leading-[1.02] font-semibold tracking-tight text-white text-balance">
          {slide.name}
        </h1>
      )}

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13.5px] text-white/70">
        {meta.map((item, itemIndex) => (
          <span key={String(item)} className="flex items-center gap-2.5">
            {itemIndex > 0 && <span aria-hidden className="w-1 h-1 rounded-full bg-white/35" />}
            <span className={itemIndex === 0 ? 'font-medium text-white/85' : ''}>{item}</span>
          </span>
        ))}
        {rating && (
          <span className="px-1.5 py-px rounded border border-white/30 text-[11px] font-semibold text-white/75">
            {rating}
          </span>
        )}
      </div>

      {genres.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {genres.map((genre) => (
            <span
              key={genre}
              className="px-2.5 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-md text-[12px] font-medium text-white/80"
            >
              {genre}
            </span>
          ))}
        </div>
      )}

      {(details?.overview ?? slide.overview) && (
        <p className="text-[14.5px] md:text-[15.5px] leading-relaxed text-white/70 line-clamp-3 max-w-lg">
          {details?.overview ?? slide.overview}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 mt-1">
        <Link
          to={`/details/${type}/${slide.id}`}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-[14px] font-semibold transition-all duration-300 ease-apple hover:bg-white/90 active:scale-95 shadow-[0_8px_28px_rgba(0,0,0,0.5)]"
        >
          <Info size={16} /> Details
        </Link>

        <button
          onClick={() =>
            openTracker({ type, id: slide.id, name: slide.name, image: slide.image, year: slide.year })
          }
          className={`flex items-center gap-2 px-6 py-3 rounded-full text-[14px] font-semibold transition-all duration-300 ease-apple active:scale-95 border ${
            saved
              ? 'bg-accent text-white border-white/15 shadow-[0_8px_28px_rgba(124,92,255,0.4)]'
              : 'bg-white/12 text-white border-white/15 hover:bg-white/20 backdrop-blur-xl'
          }`}
        >
          {saved ? <Check size={16} strokeWidth={3} /> : <Bookmark size={15} />}
          {saved ? 'In collection' : 'Save'}
        </button>

      </div>
    </div>
  );
}

function UpNextCard({
  type,
  slide,
  active,
  animate,
  progressKey,
  playState,
  onSelect,
}: {
  type: MediaType;
  slide: Title;
  active: boolean;
  animate: boolean;
  progressKey: number;
  playState: 'paused' | 'running';
  onSelect: () => void;
}) {
  const details = useSlideDetails(type, slide.id);
  const backdrop = pickBackdrop(details);

  return (
    <button
      onClick={onSelect}
      aria-label={`Show ${slide.name}`}
      aria-current={active}
      className="group text-left min-w-0"
    >
      <div
        className={`relative aspect-video rounded-xl overflow-hidden border transition-all duration-500 ease-apple ${
          active
            ? 'border-white/60 shadow-[0_12px_36px_rgba(0,0,0,0.6)]'
            : 'border-white/10 opacity-60 group-hover:opacity-100 group-hover:border-white/30'
        }`}
      >
        <Artwork
          image={backdrop ?? slide.image}
          alt=""
          kind={backdrop ? 'backdrop' : 'poster'}
          displayWidth={280}
          className="absolute inset-0"
          imgClassName="transition-transform duration-700 ease-apple group-hover:scale-105"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        {active && (
          <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/20">
            <span
              key={progressKey}
              className={`block h-full w-full bg-white origin-left ${animate ? 'animate-progress' : ''}`}
              style={{ animationPlayState: playState }}
            />
          </span>
        )}
      </div>
      <p
        className={`mt-2 text-[12.5px] font-medium truncate transition-colors duration-300 ${
          active ? 'text-white' : 'text-white/45 group-hover:text-white/80'
        }`}
      >
        {slide.name}
      </p>
    </button>
  );
}

function SpotlightSkeleton() {
  return (
    <section className="relative w-full h-[86vh] min-h-[620px] max-h-[920px] overflow-hidden">
      <div aria-hidden className="absolute inset-0 art-placeholder art-loading opacity-60" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60" />
      <div className="relative z-10 h-full max-w-[1400px] mx-auto px-6 md:px-10 lg:px-16 pt-28 pb-10 md:pb-12 flex flex-col justify-end gap-10">
        <div className="max-w-xl flex flex-col gap-4">
          <div className="h-6 w-44 rounded-md skeleton" />
          <div className="h-24 w-80 rounded-2xl skeleton" />
          <div className="h-3.5 w-56 rounded-full skeleton" />
          <div className="flex flex-col gap-2">
            <div className="h-3.5 w-full rounded-full skeleton" />
            <div className="h-3.5 w-4/5 rounded-full skeleton" />
          </div>
          <div className="flex gap-3 mt-1">
            <div className="h-12 w-32 rounded-full skeleton" />
            <div className="h-12 w-28 rounded-full skeleton" />
          </div>
        </div>
        <div className="hidden md:grid grid-cols-5 gap-3 lg:gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="aspect-video rounded-xl skeleton" />
          ))}
        </div>
      </div>
    </section>
  );
}
