import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Check, Info, Star } from 'lucide-react';
import { Artwork } from './Artwork';
import { useWatchlist } from '../context/WatchlistContext';
import { useTrackSheet } from '../context/TrackSheetContext';
import { prefetchImage, resolveImage } from '../lib/images';
import type { MediaType, Title } from '../lib/tvdb';

interface SpotlightProps {
  items: Title[];
  type: MediaType;
  isLoading: boolean;
}

/** Long enough to read the blurb, short enough that the page feels alive. */
const SLIDE_MS = 7000;
const MAX_SLIDES = 5;

/**
 * The rotating feature at the top of the home page.
 *
 * Artwork does the work: the poster is blown up and blurred behind the copy, so
 * each slide is tinted by the title it's showing without needing a separate
 * backdrop image the API doesn't give us. Save and Details sit right in the
 * slide, which is the whole point — discovery and collecting are one gesture.
 */
export function Spotlight({ items, type, isLoading }: SpotlightProps) {
  const slides = items.slice(0, MAX_SLIDES);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const { entryFor } = useWatchlist();
  const { openTracker } = useTrackSheet();
  const progressRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % slides.length), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [index, paused, slides.length]);

  // The slide after this one is decoded while the current one is on screen, so
  // the crossfade never reveals a half-loaded image.
  useEffect(() => {
    const next = slides[(index + 1) % slides.length];
    if (next) prefetchImage(resolveImage(next.image));
  }, [index, slides]);

  // Restart the progress bar on every slide, including one you clicked to.
  useEffect(() => {
    const bar = progressRef.current;
    if (!bar) return;
    bar.style.transition = 'none';
    bar.style.transform = 'scaleX(0)';
    void bar.offsetWidth;
    bar.style.transition = `transform ${SLIDE_MS}ms linear`;
    bar.style.transform = paused ? 'scaleX(0)' : 'scaleX(1)';
  }, [index, paused]);

  if (isLoading || slides.length === 0) return <SpotlightSkeleton />;

  const current = slides[index]!;
  const saved = entryFor(type, current.id) !== undefined;

  return (
    <section
      className="relative w-full min-h-[600px] md:h-[76vh] md:min-h-[620px] md:max-h-[760px] overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured titles"
    >
      {slides.map((slide, slideIndex) => (
        <div
          key={slide.id}
          aria-hidden={slideIndex !== index}
          className={`absolute inset-0 transition-opacity duration-[1200ms] ease-apple ${
            slideIndex === index ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Artwork
            image={slide.image}
            alt=""
            displayWidth={680}
            priority={slideIndex === 0}
            className="absolute inset-0 w-full h-full"
            imgClassName="scale-[1.6] blur-[64px] saturate-[1.5] opacity-55 animate-subtle-zoom"
          />
        </div>
      ))}

      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/70" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/25 to-transparent" />

      <div className="relative z-10 h-full max-w-[1400px] mx-auto px-6 md:px-10 lg:px-16 pt-32 pb-14 md:py-0 flex items-center">
        <div className="w-full flex items-center gap-12">
          <div key={current.id} className="flex-1 min-w-0 max-w-xl flex flex-col gap-5 animate-fade-up">
            <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-soft">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Trending now
            </span>

            <h1 className="text-[38px] md:text-[58px] leading-[1.02] font-semibold tracking-tight text-white text-balance">
              {current.name}
            </h1>

            <div className="flex flex-wrap items-center gap-2.5 text-[13px] text-white/55">
              {current.year && <span className="font-medium">{current.year}</span>}
              {current.status?.name && (
                <>
                  <span aria-hidden className="w-1 h-1 rounded-full bg-white/25" />
                  <span>{current.status.name}</span>
                </>
              )}
              {current.averageRuntime ? (
                <>
                  <span aria-hidden className="w-1 h-1 rounded-full bg-white/25" />
                  <span>{current.averageRuntime} min</span>
                </>
              ) : null}
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/8 border border-white/8 text-white/70 font-medium">
                <Star size={11} className="text-accent-soft" fill="currentColor" />
                {type === 'movie' ? 'Movie' : 'Series'}
              </span>
            </div>

            {current.overview && (
              <p className="text-[14.5px] md:text-[15.5px] leading-relaxed text-white/60 line-clamp-3 max-w-lg">
                {current.overview}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-1">
              <Link
                to={`/details/${type}/${current.id}`}
                className="flex items-center gap-2 px-5 py-3 rounded-full bg-white text-black text-[14px] font-semibold transition-all duration-300 ease-apple hover:bg-white/90 active:scale-95 shadow-[0_8px_28px_rgba(0,0,0,0.5)]"
              >
                <Info size={16} /> Details
              </Link>

              <button
                onClick={() =>
                  openTracker({
                    type,
                    id: current.id,
                    name: current.name,
                    image: current.image,
                    year: current.year,
                  })
                }
                className={`flex items-center gap-2 px-5 py-3 rounded-full text-[14px] font-semibold transition-all duration-300 ease-apple active:scale-95 border ${
                  saved
                    ? 'bg-accent text-white border-white/15 shadow-[0_8px_28px_rgba(124,92,255,0.4)]'
                    : 'bg-white/8 text-white border-white/12 hover:bg-white/16 backdrop-blur-xl'
                }`}
              >
                {saved ? <Check size={16} strokeWidth={3} /> : <Bookmark size={15} />}
                {saved ? 'In collection' : 'Save'}
              </button>
            </div>

            {slides.length > 1 && (
              <div className="flex items-center gap-2 mt-4">
                {slides.map((slide, slideIndex) => (
                  <button
                    key={slide.id}
                    onClick={() => setIndex(slideIndex)}
                    aria-label={`Show ${slide.name}`}
                    aria-current={slideIndex === index}
                    className="group/dot h-6 flex items-center"
                  >
                    <span
                      className={`block h-[3px] rounded-full overflow-hidden transition-all duration-500 ease-apple ${
                        slideIndex === index
                          ? 'w-12 bg-white/25'
                          : 'w-5 bg-white/18 group-hover/dot:bg-white/40'
                      }`}
                    >
                      {slideIndex === index && (
                        <span
                          ref={progressRef}
                          className="block h-full w-full bg-white origin-left"
                          style={{ transform: 'scaleX(0)' }}
                        />
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* The crisp poster, as the object the blurred wash behind is made of. */}
          <Link
            to={`/details/${type}/${current.id}`}
            className="hidden lg:block w-[260px] xl:w-[300px] shrink-0 group/poster"
            aria-hidden
            tabIndex={-1}
          >
            <Artwork
              key={current.id}
              image={current.image}
              alt=""
              displayWidth={300}
              priority
              className="aspect-[2/3] rounded-[26px] border border-white/12 shadow-[0_40px_90px_rgba(0,0,0,0.75)] transition-transform duration-700 ease-apple group-hover/poster:-translate-y-2 group-hover/poster:scale-[1.02] animate-scale-in"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}

function SpotlightSkeleton() {
  return (
    <section className="relative w-full min-h-[600px] md:h-[76vh] md:min-h-[620px] md:max-h-[760px] overflow-hidden">
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-surface/60 to-black" />
      <div className="relative z-10 h-full max-w-[1400px] mx-auto px-6 md:px-10 lg:px-16 pt-32 pb-14 md:py-0 flex items-center">
        <div className="w-full flex items-center gap-12">
          <div className="flex-1 max-w-xl flex flex-col gap-5">
            <div className="h-3 w-28 rounded-full skeleton" />
            <div className="h-11 w-4/5 rounded-2xl skeleton" />
            <div className="h-11 w-3/5 rounded-2xl skeleton" />
            <div className="h-3 w-48 rounded-full skeleton" />
            <div className="flex flex-col gap-2">
              <div className="h-3 w-full rounded-full skeleton" />
              <div className="h-3 w-5/6 rounded-full skeleton" />
            </div>
            <div className="flex gap-3 mt-1">
              <div className="h-12 w-32 rounded-full skeleton" />
              <div className="h-12 w-28 rounded-full skeleton" />
            </div>
          </div>
          <div className="hidden lg:block w-[260px] xl:w-[300px] shrink-0 aspect-[2/3] rounded-[26px] art-placeholder art-loading border border-white/8" />
        </div>
      </div>
    </section>
  );
}
