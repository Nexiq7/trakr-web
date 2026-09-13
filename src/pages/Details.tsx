import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Link2,
  Play,
  ShieldAlert,
  Star,
  Tv,
  Users,
} from 'lucide-react';
import { Artwork } from '../components/Artwork';
import { PosterCard, PosterCardSkeleton } from '../components/PosterCard';
import { Rail, RailItem } from '../components/Rail';
import { Segmented } from '../components/ui/Segmented';
import { useWatchlist } from '../context/WatchlistContext';
import { useTrackSheet } from '../context/TrackSheetContext';
import { useToast } from '../context/ToastContext';
import { useResource } from '../hooks/useResource';
import {
  browseKey,
  detailsKey,
  fetchBrowse,
  fetchDetails,
  pickBackdrop,
  pickLogo,
  type Episode,
  type MediaDetails,
  type MediaType,
  type Title,
} from '../lib/tvdb';

const RELATED_COUNT = 14;

function formatDate(value?: string) {
  if (!value) return 'TBA';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? 'TBA'
    : parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function Details() {
  const { type: rawType, id } = useParams();
  const navigate = useNavigate();
  const type: MediaType = rawType === 'movie' ? 'movie' : 'series';

  const { entryFor } = useWatchlist();
  const { openTracker } = useTrackSheet();
  const { toast } = useToast();

  const { data: media, isLoading } = useResource<MediaDetails>(
    detailsKey(type, id ?? ''),
    () => fetchDetails(type, id ?? ''),
    { enabled: Boolean(id) },
  );

  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [overviewOpen, setOverviewOpen] = useState(false);

  // A different title is a different page; anything the reader opened on the
  // last one must not carry over.
  const mediaId = `${type}-${id}`;
  const [viewedId, setViewedId] = useState(mediaId);
  if (viewedId !== mediaId) {
    setViewedId(mediaId);
    setSelectedSeason(null);
    setOverviewOpen(false);
  }

  const episodesBySeason = useMemo(() => {
    const map = new Map<number, Episode[]>();
    for (const episode of media?.episodes ?? []) {
      const list = map.get(episode.seasonNumber) ?? [];
      list.push(episode);
      map.set(episode.seasonNumber, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.number - b.number);
    return map;
  }, [media]);

  const seasonNumbers = useMemo(
    () =>
      [...episodesBySeason.keys()].sort((a, b) => {
        if (a === 0) return 1; // specials last
        if (b === 0) return -1;
        return a - b;
      }),
    [episodesBySeason],
  );

  const activeSeason = selectedSeason ?? seasonNumbers[0] ?? null;
  const seasonEpisodes = activeSeason !== null ? episodesBySeason.get(activeSeason) ?? [] : [];

  const genres = media?.genres ?? [];
  const primaryGenre = genres[0]?.id;

  // "More like this" is the same genre from the browse endpoint — the API has
  // no recommendations of its own, and titles that share a genre and a
  // popularity band are a defensible stand-in.
  const relatedKey = primaryGenre
    ? browseKey({ type, sort: 'score', genres: [primaryGenre] })
    : 'related:none';
  const { data: relatedRaw, isLoading: relatedLoading } = useResource<Title[]>(
    relatedKey,
    () => fetchBrowse({ type, sort: 'score', genres: [primaryGenre!] }),
    { enabled: primaryGenre != null },
  );

  const related = (relatedRaw ?? [])
    .filter((item) => String(item.id) !== String(id))
    .slice(0, RELATED_COUNT);

  if (isLoading || !media) return <DetailsSkeleton />;

  const logo = pickLogo(media);
  const backdrop = pickBackdrop(media);
  const rating = media.contentRatings?.find((item) => item.country === 'usa')?.name;
  const network = media.originalNetwork?.name;
  const runtime = media.averageRuntime || media.runtime;
  const trailer = media.trailers?.find((item) => item.language === 'eng')?.url;
  const tags = media.tags?.map((tag) => tag.name) ?? [];
  const cast = [...(media.characters ?? [])]
    .filter((person) => person.image)
    .sort((a, b) => a.sort - b.sort)
    .slice(0, 12);

  const entry = entryFor(type, id ?? '');
  const saved = entry !== undefined;

  const track = () =>
    openTracker({
      type,
      id: id ?? '',
      name: media.name,
      image: media.image,
      year: media.year,
    });

  const share = async () => {
    const url = window.location.href;
    try {
      // The native sheet where there is one; otherwise the clipboard, which is
      // what a desktop browser can actually offer.
      if (navigator.share) {
        await navigator.share({ title: media.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast('Link copied');
    } catch {
      // A dismissed share sheet is a normal outcome, not a failure to report.
    }
  };

  return (
    <div className="min-h-screen">
      <header className="relative min-h-[540px] md:h-[70vh] md:min-h-[560px] w-full overflow-hidden">
        <Artwork
          image={backdrop ?? media.image}
          alt=""
          kind={backdrop ? 'backdrop' : 'poster'}
          displayWidth={1600}
          priority
          // The zooming image is composited on its own layer, and while the page
          // slides in, its clip and the gradient's round differently at the
          // bottom edge — a hairline of image showed under the fade. Fading the
          // image itself to transparent there leaves nothing to show through.
          className="absolute inset-0 w-full h-full [mask-image:linear-gradient(to_top,transparent,black_22%)]"
          imgClassName="animate-subtle-zoom"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/25" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/20 to-transparent" />

        <div className="relative z-10 h-full max-w-[1400px] mx-auto px-6 md:px-10 lg:px-16 pt-28 pb-10 md:pb-14 flex flex-col justify-end">
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center gap-2.5 text-white/60 hover:text-white transition-colors duration-300 w-fit mb-auto"
          >
            <span className="w-9 h-9 rounded-full glass-panel flex items-center justify-center transition-transform duration-300 ease-apple group-hover:-translate-x-0.5">
              <ArrowLeft size={15} />
            </span>
            <span className="text-[13px] font-medium">Back</span>
          </button>

          <div className="flex items-end gap-8 mt-10">
            <Artwork
              image={media.image}
              alt=""
              displayWidth={190}
              priority
              className="hidden md:block w-[190px] shrink-0 aspect-[2/3] rounded-2xl border border-white/12 shadow-[0_28px_70px_rgba(0,0,0,0.75)]"
            />

            <div className="min-w-0 flex flex-col gap-4 animate-fade-up">
              {logo ? (
                <img
                  src={logo}
                  alt={media.name}
                  loading="eager"
                  decoding="async"
                  className="h-16 md:h-24 w-auto max-w-full object-contain object-left drop-shadow-2xl"
                />
              ) : (
                <h1 className="text-[34px] md:text-[56px] font-semibold tracking-tight leading-[1.03] text-balance">
                  {media.name}
                </h1>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Chip>{media.status?.name || 'Released'}</Chip>
                {media.year && (
                  <Chip icon={Calendar}>{media.year}</Chip>
                )}
                {runtime ? <Chip icon={Clock}>{runtime} min</Chip> : null}
                {network && <Chip icon={Tv}>{network}</Chip>}
                {rating && <Chip icon={ShieldAlert}>{rating}</Chip>}
                {entry != null && entry.score > 0 && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/20 border border-accent/35 text-[12px] font-semibold text-accent-soft">
                    <Star size={11} fill="currentColor" /> {entry.score}/10
                  </span>
                )}
              </div>

              {genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {genres.map((genre) => (
                    <Link
                      key={genre.id}
                      to={`/discover?type=${type}&genres=${genre.id}`}
                      className="px-2.5 py-1 rounded-full bg-white/6 border border-white/8 text-[12px] font-medium text-white/60 hover:text-white hover:bg-white/12 transition-colors duration-300 ease-apple"
                    >
                      {genre.name}
                    </Link>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2.5 mt-1">
                <button
                  onClick={track}
                  className={`flex items-center gap-2 px-5 py-3 rounded-full text-[14px] font-semibold transition-all duration-300 ease-apple active:scale-95 ${
                    saved
                      ? 'bg-accent-strong text-white'
                      : 'bg-white text-black hover:bg-white/90 shadow-[0_8px_28px_rgba(0,0,0,0.5)]'
                  }`}
                >
                  {saved ? <Check size={16} strokeWidth={3} /> : <Bookmark size={15} />}
                  {saved ? STATUS_TEXT[entry!.status] ?? 'In collection' : 'Save'}
                </button>

                {trailer && (
                  <a
                    href={trailer}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-5 py-3 rounded-full glass-panel text-[14px] font-semibold text-white hover:bg-white/16 transition-colors duration-300 ease-apple"
                  >
                    <Play size={15} fill="currentColor" /> Trailer
                  </a>
                )}

                <button
                  onClick={share}
                  aria-label="Share this title"
                  className="w-11 h-11 rounded-full glass-panel flex items-center justify-center text-white/70 hover:text-white hover:bg-white/16 transition-colors duration-300 ease-apple"
                >
                  <Link2 size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 md:px-10 lg:px-16 py-12 md:py-14 flex flex-col gap-14">
        {media.overview && (
          <section className="max-w-3xl">
            <SectionLabel>Overview</SectionLabel>
            <p
              className={`text-white/75 text-[15.5px] md:text-[16.5px] leading-relaxed mt-3.5 ${
                overviewOpen ? '' : 'line-clamp-4'
              }`}
            >
              {media.overview}
            </p>
            {media.overview.length > 320 && (
              <button
                onClick={() => setOverviewOpen((open) => !open)}
                className="flex items-center gap-1.5 mt-3 text-[13px] font-medium text-white/50 hover:text-white transition-colors duration-300"
              >
                {overviewOpen ? 'Show less' : 'Read more'}
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-300 ease-apple ${
                    overviewOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            )}
          </section>
        )}

        {seasonNumbers.length > 0 && (
          <section>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <h2 className="text-[20px] md:text-[22px] font-semibold tracking-tight">
                {activeSeason === 0 ? 'Specials' : `Season ${activeSeason}`}
                <span className="ml-2.5 text-[13px] font-medium text-white/35">
                  {seasonEpisodes.length} episode{seasonEpisodes.length === 1 ? '' : 's'}
                </span>
              </h2>

              {seasonNumbers.length > 1 && (
                <div className="max-w-full overflow-x-auto scrollbar-hide">
                  <Segmented
                    options={seasonNumbers.map((number) => ({
                      id: String(number),
                      label: number === 0 ? 'Specials' : `S${number}`,
                    }))}
                    value={String(activeSeason)}
                    onChange={(next) => setSelectedSeason(Number(next))}
                    label="Season"
                  />
                </div>
              )}
            </div>

            <ol className="rounded-3xl overflow-hidden border border-white/8 bg-white/[0.025]">
              {seasonEpisodes.map((episode) => (
                <li
                  key={episode.id}
                  className="flex items-center gap-4 px-3.5 md:px-4 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/[0.03] transition-colors duration-300"
                >
                  <span className="w-7 text-center text-[13px] font-semibold text-white/25 shrink-0 tabular-nums">
                    {episode.number}
                  </span>
                  <Artwork
                    image={episode.image}
                    alt=""
                    kind="backdrop"
                    displayWidth={112}
                    className="w-[92px] md:w-28 shrink-0 aspect-video rounded-xl border border-white/8"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-white/90 truncate">
                      {episode.name || `Episode ${episode.number}`}
                    </p>
                    <p className="text-[12px] text-white/40 mt-0.5">{formatDate(episode.aired)}</p>
                  </div>
                  {episode.runtime ? (
                    <span className="text-[12px] text-white/35 shrink-0 tabular-nums">
                      {episode.runtime}m
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        )}

        {cast.length > 0 && (
          <section>
            <SectionLabel icon={Users}>Top cast</SectionLabel>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-5 mt-4">
              {cast.map((person) => (
                <div key={person.id} className="flex items-center gap-3.5 min-w-0">
                  <Artwork
                    image={person.image}
                    alt=""
                    displayWidth={44}
                    className="w-11 h-11 rounded-full border border-white/10 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium text-white/90 truncate">
                      {person.personName}
                    </p>
                    <p className="text-[12px] text-white/40 truncate">{person.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {tags.length > 0 && (
          <section>
            <SectionLabel>Themes</SectionLabel>
            <div className="flex flex-wrap gap-2 mt-4">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/8 text-[12.5px] font-medium text-white/55"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>

      {(relatedLoading || related.length > 0) && primaryGenre != null && (
        <div className="pb-12">
          <Rail
            title="More like this"
            seeAll={`/discover?type=${type}&genres=${primaryGenre}&sort=score`}
          >
            {relatedLoading
              ? Array.from({ length: 8 }).map((_, index) => (
                  <RailItem key={index}>
                    <PosterCardSkeleton />
                  </RailItem>
                ))
              : related.map((item) => (
                  <RailItem key={item.id}>
                    <PosterCard
                      type={type}
                      id={item.id}
                      name={item.name}
                      subtitle={item.year}
                      image={item.image}
                      displayWidth={168}
                    />
                  </RailItem>
                ))}
          </Rail>
        </div>
      )}
    </div>
  );
}

const STATUS_TEXT: Record<string, string> = {
  watching: 'Watching',
  planning: 'Planned',
  completed: 'Completed',
  dropped: 'Dropped',
};

function Chip({ children, icon: Icon }: { children: React.ReactNode; icon?: typeof Calendar }) {
  return (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/8 border border-white/8 text-[12px] font-medium text-white/75">
      {Icon && <Icon size={12} className="text-white/40" />}
      {children}
    </span>
  );
}

function SectionLabel({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: typeof Users;
}) {
  return (
    <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
      {Icon && <Icon size={13} />}
      {children}
    </h2>
  );
}

function DetailsSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="relative min-h-[540px] md:h-[70vh] md:min-h-[560px] overflow-hidden art-placeholder art-loading">
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
        <div className="relative z-10 h-full max-w-[1400px] mx-auto px-6 md:px-10 lg:px-16 pt-28 pb-10 md:pb-14 flex items-end">
          <div className="flex items-end gap-8 w-full">
            <div className="hidden md:block w-[190px] shrink-0 aspect-[2/3] rounded-2xl skeleton border border-white/8" />
            <div className="flex-1 flex flex-col gap-4 max-w-xl">
              <div className="h-12 w-3/4 rounded-2xl skeleton" />
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-7 w-20 rounded-lg skeleton" />
                ))}
              </div>
              <div className="flex gap-2.5 mt-1">
                <div className="h-12 w-32 rounded-full skeleton" />
                <div className="h-12 w-28 rounded-full skeleton" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-10 lg:px-16 py-14 flex flex-col gap-10">
        <div className="flex flex-col gap-2.5 max-w-3xl">
          <div className="h-3 w-24 rounded-full skeleton" />
          {[100, 96, 88, 60].map((width) => (
            <div key={width} className="h-3.5 rounded-full skeleton" style={{ width: `${width}%` }} />
          ))}
        </div>

        <div className="rounded-3xl overflow-hidden border border-white/8">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 px-4 py-3 border-b border-white/5 last:border-b-0">
              <div className="w-7 h-3 rounded-full skeleton shrink-0" />
              <div className="w-[92px] md:w-28 aspect-video rounded-xl skeleton shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-3.5 w-1/2 rounded-full skeleton" />
                <div className="h-3 w-24 rounded-full skeleton" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
