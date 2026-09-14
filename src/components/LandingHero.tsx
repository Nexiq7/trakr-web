import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Artwork } from './Artwork';
import { GithubIcon } from './GithubIcon';
import { SearchBar } from './SearchBar';
import { REPO_URL } from '../lib/constants';
import type { Title } from '../lib/tvdb';

interface LandingHeroProps {
  /** Artwork for the drifting wall behind the pitch. */
  posters: Title[];
}

/** Enough columns to span a wide desktop; narrow screens hide the outer ones. */
const COLUMNS = 7;
const PER_COLUMN = 4;

/** Which breakpoint each column past the second appears at. */
const COLUMN_VISIBILITY = [
  '',
  '',
  'hidden sm:flex',
  'hidden md:flex',
  'hidden lg:flex',
  'hidden xl:flex',
  'hidden 2xl:flex',
];

/**
 * The first screen for someone who hasn't signed in.
 *
 * The wall behind is real artwork from the catalog, drifting slowly under a
 * heavy scrim — the page shows what the product is about before a word of copy
 * is read. It's decorative, so it's built from the same thumbnails the rails
 * below already load: no extra bytes, and it stays out of the accessibility
 * tree entirely.
 */
export function LandingHero({ posters }: LandingHeroProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const columns = useMemo(() => {
    const usable = posters.filter((item) => item.image).slice(0, COLUMNS * PER_COLUMN);
    if (usable.length === 0) return [];

    return Array.from({ length: COLUMNS }, (_, column) =>
      Array.from({ length: PER_COLUMN }, (_, row) => usable[(column * PER_COLUMN + row) % usable.length]!),
    );
  }, [posters]);

  return (
    <section className="relative w-full overflow-hidden flex items-center justify-center px-6 pt-32 pb-20 min-h-[640px] md:min-h-[round(down,92vh,1px)]">
      {columns.length > 0 && (
        <div
          aria-hidden
          // Stops 4px short of the bottom edge and clips itself. The drifting
          // columns are composited on their own layer, which rounds its clip at
          // that edge differently from the scrims painted over it, so on some
          // loads a one-pixel line of posters showed below the fade. Ending the
          // wall above the edge leaves nothing there to show.
          className="pointer-events-none absolute inset-x-0 top-0 bottom-1 overflow-hidden flex justify-center gap-3 md:gap-4 opacity-[0.72]"
        >
          {columns.map((column, columnIndex) => (
            <div
              key={columnIndex}
              className={`flex flex-col w-[130px] md:w-[176px] shrink-0 ${
                columnIndex % 2 === 0 ? 'animate-drift-up' : 'animate-drift-down'
              } ${COLUMN_VISIBILITY[columnIndex]}`}
              // Each column starts at a different point in the same loop, so the
              // wall drifts as a crowd rather than as one moving block.
              style={{ animationDelay: `${columnIndex * -7}s` }}
            >
              {[...column, ...column].map((item, itemIndex) => (
                <Artwork
                  key={`${item.id}-${itemIndex}`}
                  image={item.image}
                  alt=""
                  displayWidth={176}
                  // Spacing lives on the items, not as a container `gap`: the
                  // loop translates exactly -50%, which only lands seamlessly
                  // when every slot including the last carries its own gap.
                  className="w-full aspect-[2/3] rounded-2xl border border-white/6 shrink-0 mb-3 md:mb-4"
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Three scrims, in order: an overall dim so nothing competes with the
          copy, a pool of darkness under the text itself, and a vertical fade
          that blends the wall into the black page above and below it. */}
      <div aria-hidden className="absolute inset-0 bg-black/45" />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_58%_48%_at_50%_46%,rgba(0,0,0,0.94)_0%,rgba(0,0,0,0.78)_42%,transparent_76%)]"
      />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
      {/* The navbar is transparent until the page scrolls, so the strip it sits
          in needs to be dark on its own account. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/90 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[14%] -translate-x-1/2 w-[760px] max-w-[150vw] aspect-square rounded-full bg-accent/14 blur-[150px]"
      />

      <div className="relative z-10 w-full max-w-xl flex flex-col items-center text-center gap-6 animate-fade-up">
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 pl-3 pr-3.5 py-1.5 rounded-full glass-panel text-[12.5px] font-medium text-white/60 hover:text-white hover:border-white/25 transition-colors duration-300 ease-apple"
        >
          <GithubIcon size={13} />
          Open source
          <span aria-hidden className="w-px h-3 bg-white/15" />
          MIT
        </a>

        <h1 className="text-[68px] md:text-[88px] leading-[0.95] font-semibold tracking-tight text-white">
          trakr
        </h1>

        <p className="text-[17px] md:text-[20px] leading-relaxed text-white/60 max-w-md text-balance">
          Everything you watch, in one place. Find it, save it, pick up where you left off.
        </p>

        <SearchBar
          className="mt-1"
          value={query}
          onChange={setQuery}
          onSubmit={(term) => navigate(`/search?q=${encodeURIComponent(term)}`)}
        />

        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-1">
          <Link
            to="/discover"
            className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-[13.5px] font-semibold transition-all duration-300 ease-apple hover:bg-white/90 active:scale-95"
          >
            <Sparkles size={15} />
            Start discovering
            <ArrowRight
              size={14}
              className="transition-transform duration-300 ease-apple group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            to="/login"
            className="px-5 py-2.5 rounded-full bg-white/8 border border-white/12 backdrop-blur-xl text-[13.5px] font-semibold text-white/80 hover:text-white hover:bg-white/14 transition-colors duration-300 ease-apple"
          >
            Create an account
          </Link>
        </div>
      </div>
    </section>
  );
}
