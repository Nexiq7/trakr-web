import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Library, Loader2, Search, Star, Unlock } from 'lucide-react';
import { Artwork } from './Artwork';
import { StatusButtons } from './StatusButtons';
import { ScoreBar } from './ScoreBar';
import { GithubIcon } from './GithubIcon';
import { Reveal } from './Reveal';
import { API_REPO_URL, REPO_URL } from '../lib/constants';

const API = import.meta.env.VITE_API_URL;

/** Enough to overrun the tile at any width, so the shelf reads as continuing. */
const SHELF_SIZE = 10;
const SEED_QUERY = 'the last';

/** Shown as chips if the genre list has them; ids come from the API. */
const PREFERRED_GENRES = ['Drama', 'Science Fiction', 'Comedy', 'Thriller', 'Animation'];

interface BentoPoster {
  id: string | number;
  name: string;
  image?: string;
}

interface Genre {
  id: number;
  name: string;
}

interface SearchResult {
  tvdb_id: string;
  name: string;
  year?: string;
  type: 'series' | 'movie';
  image_url?: string;
}

interface BentoProps {
  /** Trending artwork for the Discover tile's resting state. */
  posters?: BentoPoster[];
}

function Tile({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-3xl border border-white/8 bg-white/[0.035] p-6 md:p-7 transition-colors duration-500 ease-apple hover:border-white/16 ${className}`}
    >
      {/* Lit top edge — the same glass treatment the navbar uses. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />
      {children}
    </div>
  );
}

function Eyebrow({ icon: Icon, children }: { icon: typeof Compass; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-accent">
      <Icon size={14} />
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em]">{children}</span>
    </div>
  );
}

function Title({ children }: { children: ReactNode }) {
  return <h3 className="mt-3.5 text-[19px] font-semibold tracking-tight text-white">{children}</h3>;
}

function Body({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-[13.5px] leading-relaxed text-white/45">{children}</p>;
}

/** Poster art with the hatch showing through whenever there's nothing to show. */
function Thumb({ image, className = '' }: { image?: string | null; className?: string }) {
  return (
    <Artwork
      image={image}
      alt=""
      displayWidth={120}
      className={`border border-white/8 shrink-0 ${className}`}
    />
  );
}

export function Bento({ posters = [] }: BentoProps) {
  // ── Discover tile: genre chips drive the shelf ───────────────────────────
  const [genres, setGenres] = useState<Genre[]>([]);
  const [activeGenre, setActiveGenre] = useState<number | null>(null);
  const [genreItems, setGenreItems] = useState<BentoPoster[] | null>(null);
  const [shelfLoading, setShelfLoading] = useState(false);
  const shelfCache = useRef(new Map<number, BentoPoster[]>());
  const shelfRequest = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/tvdb/genres`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setGenres(json.data || []);
      })
      .catch(() => {
        if (!cancelled) setGenres([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Chips render immediately and light up as their ids arrive, so the row
  // doesn't pop into place after the genre list lands.
  const chips = PREFERRED_GENRES.map((name) => ({
    name,
    id: genres.find((g) => g.name === name)?.id,
  }));

  // Fetching from the handler rather than an effect keeps the request tied to
  // the click that asked for it.
  const selectGenre = async (id: number | null) => {
    setActiveGenre(id);
    shelfRequest.current += 1;
    const request = shelfRequest.current;

    if (id === null) {
      setGenreItems(null);
      setShelfLoading(false);
      return;
    }

    const cached = shelfCache.current.get(id);
    if (cached) {
      setGenreItems(cached);
      setShelfLoading(false);
      return;
    }

    setGenreItems(null);
    setShelfLoading(true);
    try {
      const res = await fetch(`${API}/tvdb/browse/series?trending=1&genre=${id}`);
      const json = await res.json();
      const items = (json.data || []).slice(0, SHELF_SIZE) as BentoPoster[];
      shelfCache.current.set(id, items);
      // A slower earlier request must not overwrite the current genre.
      if (request === shelfRequest.current) setGenreItems(items);
    } catch {
      if (request === shelfRequest.current) setGenreItems([]);
    } finally {
      if (request === shelfRequest.current) setShelfLoading(false);
    }
  };

  const shelfSource = activeGenre === null ? posters : genreItems ?? [];
  // Real artwork is never padded out with empty frames; the null run is only for
  // the loading and pre-fetch states, where it holds the row's height open.
  const shelf: (BentoPoster | null)[] =
    shelfSource.length > 0
      ? shelfSource.slice(0, SHELF_SIZE)
      : Array.from({ length: SHELF_SIZE }, () => null);
  // A genre that genuinely came back empty gets a message, not a row of frames.
  const shelfEmpty = activeGenre !== null && !shelfLoading && shelfSource.length === 0;

  // ── Search tile: the real endpoint, debounced as you type ────────────────
  const [query, setQuery] = useState(SEED_QUERY);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (!term) return;

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${API}/tvdb/search?q=${encodeURIComponent(term)}`);
        const json = await res.json();
        if (!cancelled) setResults(json.data || []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  const shownResults = query.trim() ? results.slice(0, 3) : [];

  // ── Collection + Scores tiles: the real controls, local state ────────────
  const [status, setStatus] = useState('watching');
  const [score, setScore] = useState(8);

  return (
    <section className="max-w-[1400px] mx-auto px-6 md:px-10 lg:px-16 pt-14 md:pt-20 pb-20 md:pb-28">
      <Reveal className="max-w-2xl">
        <h2 className="text-[34px] md:text-[44px] leading-[1.08] font-semibold tracking-tight text-white">
          A tracker that feels like
          <br className="hidden md:block" /> part of the show.
        </h2>
        <p className="mt-4 text-[15.5px] md:text-[17px] leading-relaxed text-white/45">
          Every other tracker is a spreadsheet with posters bolted on. trakr is built the other way
          round — artwork first, and the bookkeeping stays out of your way until you want it. Have a
          go at the tiles below; they're the real thing, not screenshots.
        </p>
      </Reveal>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-6 gap-4">
        {/* ── Discover ─────────────────────────────────────────────────── */}
        <Reveal className="md:col-span-4 flex" delay={0}>
          <Tile className="w-full">
            <Eyebrow icon={Compass}>Discover</Eyebrow>
            <Title>Find your next watch</Title>
            <Body>
              A hero that rotates through what's actually trending, rails of popular series and
              movies, and the full catalog filtered by genre.
            </Body>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => selectGenre(null)}
                aria-pressed={activeGenre === null}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium border transition-colors duration-300 ease-apple ${
                  activeGenre === null
                    ? 'bg-accent-strong border-transparent text-white'
                    : 'bg-white/5 border-white/8 text-white/50 hover:text-white/80 hover:bg-white/10'
                }`}
              >
                Trending
              </button>

              {chips.map((chip) => {
                const active = chip.id != null && chip.id === activeGenre;
                return (
                  <button
                    key={chip.name}
                    type="button"
                    disabled={chip.id == null}
                    onClick={() => selectGenre(chip.id ?? null)}
                    aria-pressed={active}
                    className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium border transition-colors duration-300 ease-apple disabled:opacity-40 disabled:cursor-default ${
                      active
                        ? 'bg-accent-strong border-transparent text-white'
                        : 'bg-white/5 border-white/8 text-white/50 enabled:hover:text-white/80 enabled:hover:bg-white/10'
                    }`}
                  >
                    {chip.name}
                  </button>
                );
              })}
            </div>

            {/* Fixed height so switching genre never jolts the grid. Bleeds off
                the right edge and fades, to read as a shelf that keeps going. */}
            <div className="relative mt-auto pt-7 -mr-6 md:-mr-7 h-[132px] md:h-[156px] box-content">
              {shelfEmpty ? (
                <p className="h-full flex items-center text-[13px] text-white/35">
                  Nothing trending in that genre right now.
                </p>
              ) : (
              <div className="flex gap-3 h-full mask-no-repeat mask-[linear-gradient(to_right,#000_45%,transparent_97%)]">
                {shelf.map((poster, i) => {
                  const key = poster?.id ?? `slot-${i}`;
                  const className = `h-full aspect-[2/3] rounded-xl shadow-[0_10px_26px_rgba(0,0,0,0.5)] ${
                    shelfLoading ? 'art-loading' : ''
                  }`;

                  return poster ? (
                    <Link
                      key={key}
                      to={`/details/series/${poster.id}`}
                      title={poster.name}
                      aria-label={poster.name}
                      className="h-full shrink-0 transition-transform duration-500 ease-apple hover:-translate-y-1.5"
                    >
                      <Thumb image={poster.image} className={className} />
                    </Link>
                  ) : (
                    <Thumb key={key} className={className} />
                  );
                })}
              </div>
              )}
            </div>
          </Tile>
        </Reveal>

        {/* ── Status ───────────────────────────────────────────────────── */}
        <Reveal className="md:col-span-2 flex" delay={80}>
          <Tile className="w-full">
            <Eyebrow icon={Library}>Collection</Eyebrow>
            <Title>Track it in one tap</Title>
            <Body>Four states, no forms, no modals stacked on modals. Try it.</Body>

            <div className="mt-auto pt-6">
              <StatusButtons status={status} onChange={setStatus} />
            </div>
          </Tile>
        </Reveal>

        {/* ── Score ────────────────────────────────────────────────────── */}
        <Reveal className="md:col-span-2 flex" delay={0}>
          <Tile className="w-full">
            <Eyebrow icon={Star}>Scores</Eyebrow>
            <Title>Keep your own score</Title>
            <Body>Rate anything out of ten. It rides along on the poster wherever it shows up.</Body>

            <div className="mt-auto pt-6">
              <ScoreBar score={score} onChange={setScore} />
            </div>
          </Tile>
        </Reveal>

        {/* ── Search ───────────────────────────────────────────────────── */}
        <Reveal className="md:col-span-2 flex" delay={80}>
          <Tile className="w-full">
            <Eyebrow icon={Search}>Search</Eyebrow>
            <Title>Results as you type</Title>
            <Body>No submit button, no waiting. This one is live — type something.</Body>

            <div className="mt-auto pt-6">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Try a title..."
                  aria-label="Search movies and shows"
                  className="w-full bg-surface/70 border border-white/10 focus:border-accent/50 py-3 pl-10 pr-10 rounded-2xl text-[14px] text-white placeholder:text-white/30 outline-none transition-colors duration-300 ease-apple focus:shadow-[0_0_0_4px_rgba(124,92,255,0.14)] [&::-webkit-search-cancel-button]:appearance-none"
                />
                {searching && (
                  <Loader2
                    size={15}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35 animate-spin"
                  />
                )}
              </div>

              {/* Held open at three rows so results landing don't shift the grid. */}
              <div className="mt-2 h-[156px] overflow-hidden">
                {shownResults.map((result) => (
                  <Link
                    key={result.tvdb_id}
                    to={`/details/${result.type}/${result.tvdb_id}`}
                    className="group/row flex items-center gap-3 px-1.5 py-2 rounded-lg hover:bg-white/6 transition-colors duration-300 ease-apple"
                  >
                    <Thumb image={result.image_url} className="w-7 h-10 rounded-md" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-white/85 truncate group-hover/row:text-white">
                        {result.name}
                      </p>
                      <p className="text-[11px] text-white/35">
                        {[result.year, result.type === 'movie' ? 'Movie' : 'Series']
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                  </Link>
                ))}

                {!searching && query.trim() !== '' && shownResults.length === 0 && (
                  <p className="px-1.5 py-2 text-[13px] text-white/35">No results for "{query}"</p>
                )}
              </div>
            </div>
          </Tile>
        </Reveal>

        {/* ── No account ───────────────────────────────────────────────── */}
        <Reveal className="md:col-span-2 flex" delay={160}>
          <Tile className="w-full">
            <Eyebrow icon={Unlock}>No wall</Eyebrow>
            <Title>Browse signed out</Title>
            <Body>
              Discover, search and every detail page work with no account at all. Signing in only
              buys you somewhere to keep what you've watched.
            </Body>

            <Link
              to="/discover"
              className="mt-auto pt-6 flex items-center gap-3.5 group/link"
            >
              <span
                aria-hidden
                className="w-12 h-12 shrink-0 rounded-full bg-accent/12 border border-accent/25 flex items-center justify-center text-accent transition-colors duration-300 ease-apple group-hover/link:bg-accent/20"
              >
                <Unlock size={20} />
              </span>
              <span className="text-[19px] leading-tight font-semibold tracking-tight text-white">
                Start browsing
                <br />
                <span className="text-[13px] font-medium text-white/40">No sign-in needed</span>
              </span>
            </Link>
          </Tile>
        </Reveal>

        {/* ── Open source ──────────────────────────────────────────────── */}
        <Reveal className="md:col-span-6" delay={0}>
          <Tile className="w-full p-0!">
            <div className="relative flex flex-col md:flex-row md:items-center gap-8 p-8 md:p-10">
              <div
                aria-hidden
                className="pointer-events-none absolute -left-24 -top-24 w-[420px] aspect-square rounded-full bg-accent/12 blur-[130px]"
              />

              <div className="relative flex-1 min-w-0">
                <Eyebrow icon={Star}>Open source</Eyebrow>
                <h3 className="mt-3.5 text-[24px] md:text-[30px] font-semibold tracking-tight text-white">
                  Built in the open, self-hostable end to end.
                </h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-white/45 max-w-xl">
                  Both halves are MIT licensed and on GitHub: this{' '}
                  <a
                    href={REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/70 underline decoration-white/20 underline-offset-2 hover:text-white hover:decoration-white/40 transition-colors duration-300 ease-apple"
                  >
                    React client
                  </a>{' '}
                  and the{' '}
                  <a
                    href={API_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/70 underline decoration-white/20 underline-offset-2 hover:text-white hover:decoration-white/40 transition-colors duration-300 ease-apple"
                  >
                    Hono API
                  </a>{' '}
                  behind it — clone both and{' '}
                  <code className="px-1.5 py-0.5 rounded bg-white/8 text-white/70 text-[13px]">
                    docker compose up
                  </code>{' '}
                  runs the whole thing on your own hardware, no account required. If trakr saved you
                  from another spreadsheet, a star is how more people find it.
                </p>
              </div>

              <div className="relative flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full bg-white text-black text-[14px] font-semibold hover:bg-white/90 transition-colors duration-300 ease-apple"
                >
                  <GithubIcon size={17} />
                  Star on GitHub
                </a>
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white/8 border border-white/10 text-[14px] font-semibold text-white/85 hover:bg-white/14 hover:text-white transition-colors duration-300 ease-apple"
                >
                  Start tracking
                </Link>
              </div>
            </div>
          </Tile>
        </Reveal>
      </div>
    </section>
  );
}
