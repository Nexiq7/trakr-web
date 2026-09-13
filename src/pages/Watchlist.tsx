import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutGrid,
  Library,
  List,
  Pencil,
  Search as SearchIcon,
  Sparkles,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { Artwork } from '../components/Artwork';
import { PosterCard, PosterCardSkeleton } from '../components/PosterCard';
import { Segmented } from '../components/ui/Segmented';
import { useAuth } from '../context/AuthContext';
import { useWatchlist } from '../context/WatchlistContext';
import { useTrackSheet } from '../context/TrackSheetContext';
import { useSlidingIndicator } from '../hooks/useSlidingIndicator';
import { idFromMediaKey, type MediaType, type WatchStatus, type WatchlistEntry } from '../lib/tvdb';

type Tab = 'all' | WatchStatus;
type SortId = 'recent' | 'score' | 'name';
type View = 'grid' | 'list';

const VIEW_KEY = 'trakr:collection-view';

// The layout someone picks is a preference, not a one-off: it should still be
// their layout next visit. Storage can be unavailable, so fall back quietly.
function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

function storeView(view: View) {
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {
    /* the choice still holds for this visit */
  }
}

type Kind = 'all' | MediaType;

const KINDS: { id: Kind; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'series', label: 'Series' },
  { id: 'movie', label: 'Movies' },
];

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'watching', label: 'Watching' },
  { id: 'planning', label: 'Planned' },
  { id: 'completed', label: 'Completed' },
  { id: 'dropped', label: 'Dropped' },
];

function kindOf(entry: WatchlistEntry): MediaType {
  return entry.type === 'movie' ? 'movie' : 'series';
}

const SORTS: { id: SortId; label: string }[] = [
  { id: 'recent', label: 'Recent' },
  { id: 'score', label: 'Score' },
  { id: 'name', label: 'A–Z' },
];

function sortEntries(entries: WatchlistEntry[], sort: SortId) {
  const sorted = [...entries];

  if (sort === 'name') {
    return sorted.sort((a, b) => (a.details?.name ?? '').localeCompare(b.details?.name ?? ''));
  }
  if (sort === 'score') {
    return sorted.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }
  // Rows added before `createdAt` existed have none; keep them last rather than
  // letting an invalid date shuffle them randomly through the list.
  return sorted.sort((a, b) => {
    const left = a.createdAt ? Date.parse(a.createdAt) : 0;
    const right = b.createdAt ? Date.parse(b.createdAt) : 0;
    return right - left;
  });
}

export function Watchlist() {
  const { token } = useAuth();
  const { entries, isLoading } = useWatchlist();

  const [kind, setKind] = useState<Kind>('all');
  const [tab, setTab] = useState<Tab>('all');
  const [sort, setSort] = useState<SortId>('recent');
  const [view, setView] = useState<View>(readView);
  const [filter, setFilter] = useState('');

  // Status counts follow the type filter, so "Watching 3" under Movies means
  // three movies.
  const ofKind = useMemo(
    () => (kind === 'all' ? entries : entries.filter((entry) => kindOf(entry) === kind)),
    [entries, kind],
  );

  const counts = useMemo(() => {
    const base: Record<Tab, number> = {
      all: ofKind.length,
      watching: 0,
      planning: 0,
      completed: 0,
      dropped: 0,
    };
    for (const entry of ofKind) {
      if (entry.status in base) base[entry.status] += 1;
    }
    return base;
  }, [ofKind]);

  const scored = entries.filter((entry) => (entry.score ?? 0) > 0);
  const averageScore =
    scored.length > 0
      ? (scored.reduce((sum, entry) => sum + (entry.score ?? 0), 0) / scored.length).toFixed(1)
      : null;

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const byTab = tab === 'all' ? ofKind : ofKind.filter((entry) => entry.status === tab);
    const byName = needle
      ? byTab.filter((entry) => (entry.details?.name ?? '').toLowerCase().includes(needle))
      : byTab;
    return sortEntries(byName, sort);
  }, [ofKind, tab, sort, filter]);

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="w-16 h-16 rounded-3xl bg-white/5 border border-white/8 flex items-center justify-center">
          <Library size={26} className="text-white/30" />
        </span>
        <h1 className="text-[22px] font-semibold tracking-tight mt-1">Your collection lives here</h1>
        <p className="text-white/45 text-[14px] max-w-sm">
          Sign in to track what you're watching, score it, and pick up where you left off.
        </p>
        <Link
          to="/login"
          className="mt-3 px-5 py-2.5 rounded-full bg-white text-black text-[13.5px] font-semibold hover:bg-white/90 transition-colors duration-300 ease-apple"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 md:pt-32 pb-24 px-6 md:px-10 lg:px-16">
      <div className="max-w-[1400px] mx-auto">
        <header className="flex flex-wrap items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-[34px] md:text-[46px] font-semibold tracking-tight">Collection</h1>
            <p className="text-white/45 text-[14.5px] mt-2">
              {isLoading
                ? 'Loading your titles…'
                : `${entries.length} title${entries.length === 1 ? '' : 's'} tracked`}
            </p>
          </div>

          {!isLoading && entries.length > 0 && (
            <div className="flex gap-3">
              <Stat label="Watching" value={counts.watching} />
              <Stat label="Completed" value={counts.completed} />
              {averageScore && <Stat label="Avg score" value={averageScore} icon={Star} />}
            </div>
          )}
        </header>

        {isLoading ? (
          <>
            <div className="h-[54px] w-full max-w-[980px] rounded-[20px] skeleton mb-8" />
            <Grid>
              {Array.from({ length: 12 }).map((_, index) => (
                <PosterCardSkeleton key={index} />
              ))}
            </Grid>
          </>
        ) : entries.length === 0 ? (
          <div className="text-center py-24 rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
            <span className="w-14 h-14 mx-auto rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-5">
              <Sparkles size={22} className="text-white/30" />
            </span>
            <p className="text-white/75 font-medium text-[15px]">Nothing tracked yet</p>
            <p className="text-white/35 text-[13px] mt-2 max-w-xs mx-auto">
              Save anything you come across — the bookmark on any poster is all it takes.
            </p>
            <Link
              to="/discover"
              className="inline-block mt-6 px-5 py-2.5 rounded-full bg-white text-black text-[13px] font-semibold hover:bg-white/90 transition-colors duration-300"
            >
              Browse the catalog
            </Link>
          </div>
        ) : (
          <>
            {/* The same glass control bar as Discover, but it stays in place in the
                page rather than following the scroll, so it never sits over
                the rows. */}
            <div className="mb-5">
              <div className="inline-flex max-w-full flex-wrap items-center gap-2.5 p-2 rounded-[20px] glass-panel shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
                <Segmented options={KINDS} value={kind} onChange={setKind} label="Media type" />
                {/* Five options with counts outgrow a phone's width; the group
                    scrolls inside the bar rather than widening the page. */}
                <div className="max-w-full overflow-x-auto scrollbar-hide rounded-full">
                  <Segmented
                    options={TABS.map((option) => ({
                      id: option.id,
                      label: `${option.label} ${counts[option.id]}`,
                    }))}
                    value={tab}
                    onChange={setTab}
                    label="Status"
                  />
                </div>
                <Segmented options={SORTS} value={sort} onChange={setSort} label="Sort collection" />
                <ViewToggle
                  value={view}
                  onChange={(next) => {
                    setView(next);
                    storeView(next);
                  }}
                />
                <label className="relative">
                  <SearchIcon
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none"
                  />
                  <input
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    placeholder="Filter titles"
                    aria-label="Filter your collection"
                    className="w-[150px] focus:w-[190px] bg-white/6 border border-white/8 focus:border-white/20 rounded-full pl-9 pr-3.5 py-2 text-[13px] text-white placeholder:text-white/40 outline-none transition-all duration-300 ease-apple"
                  />
                </label>
              </div>
            </div>

            {visible.length === 0 ? (
              <p className="text-center text-white/35 text-[14px] py-20">
                {filter.trim()
                  ? `Nothing in your collection matches “${filter.trim()}”`
                  : 'Nothing in this category yet'}
              </p>
            ) : (
              view === 'list' ? (
                <CollectionList entries={visible} showStatus={tab === 'all'} />
              ) : (
                <Grid>
                  {visible.map((entry, index) => {
                    const type = kindOf(entry);
                    return (
                      <PosterCard
                        key={entry.mediaId}
                        type={type}
                        id={idFromMediaKey(entry.mediaId)}
                        name={entry.details?.name || 'Untitled'}
                        image={entry.details?.image}
                        displayWidth={190}
                        priority={index < 12}
                        showUserScore
                        statusLabel={tab === 'all' ? entry.status : undefined}
                      />
                    );
                  })}
                </Grid>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-9">
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon?: LucideIcon;
}) {
  return (
    <div className="px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/8 min-w-[92px]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">{label}</p>
      <p className="flex items-center gap-1.5 text-[19px] font-semibold tracking-tight mt-0.5 tabular-nums">
        {Icon && <Icon size={14} className="text-accent-soft" fill="currentColor" />}
        {value}
      </p>
    </div>
  );
}

const VIEWS: { id: View; label: string; icon: LucideIcon }[] = [
  { id: 'grid', label: 'Grid view', icon: LayoutGrid },
  { id: 'list', label: 'List view', icon: List },
];

/** The grid/list switch — the same sliding pill as the other controls, with icons. */
function ViewToggle({ value, onChange }: { value: View; onChange: (view: View) => void }) {
  const activeIndex = VIEWS.findIndex((option) => option.id === value);
  const { containerRef, box } = useSlidingIndicator(activeIndex, [value]);

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label="Layout"
      className="relative inline-flex p-1 rounded-full bg-white/6 border border-white/8"
    >
      {box && (
        <span
          aria-hidden
          className="absolute top-1 bottom-1 rounded-full bg-white/14 border border-white/8 transition-all duration-[420ms] ease-spring"
          style={{ left: box.left, width: box.width }}
        />
      )}
      {VIEWS.map((option, index) => (
        <button
          key={option.id}
          data-index={index}
          role="radio"
          aria-checked={option.id === value}
          aria-label={option.label}
          title={option.label}
          onClick={() => onChange(option.id)}
          className={`relative w-9 h-[30px] flex items-center justify-center rounded-full transition-colors duration-300 ease-apple ${
            option.id === value ? 'text-white' : 'text-white/50 hover:text-white/85'
          }`}
        >
          <option.icon size={15} />
        </button>
      ))}
    </div>
  );
}

const STATUS_STYLE: Record<WatchStatus, { label: string; dot: string }> = {
  watching: { label: 'Watching', dot: 'bg-emerald-400' },
  planning: { label: 'Planned', dot: 'bg-accent-soft' },
  completed: { label: 'Completed', dot: 'bg-sky-400' },
  dropped: { label: 'Dropped', dot: 'bg-white/35' },
};

function formatAdded(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Shared by the header and the rows, so the columns line up at every width. */
const LIST_COLUMNS =
  'grid-cols-[minmax(0,1fr)_40px] md:grid-cols-[minmax(0,1fr)_120px_64px_110px_40px] lg:grid-cols-[minmax(0,1fr)_minmax(0,220px)_120px_64px_110px_40px]';

/**
 * The collection as rows: less artwork, more of what you tracked. Once a
 * collection is long, scanning titles, scores and dates beats scanning posters.
 */
function CollectionList({
  entries,
  showStatus,
}: {
  entries: WatchlistEntry[];
  showStatus: boolean;
}) {
  const { openTracker } = useTrackSheet();

  return (
    <div className="rounded-3xl border border-white/8 bg-white/[0.025] overflow-hidden">
      <div
        aria-hidden
        className={`hidden md:grid ${LIST_COLUMNS} items-center gap-4 px-4 py-2.5 border-b border-white/8 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/30`}
      >
        <span>Title</span>
        <span className="hidden lg:block">Genres</span>
        <span>Status</span>
        <span>Score</span>
        <span>Added</span>
        <span />
      </div>

      <ul>
        {entries.map((entry, index) => {
          const type = kindOf(entry);
          const id = idFromMediaKey(entry.mediaId);
          const name = entry.details?.name || 'Untitled';
          const status = STATUS_STYLE[entry.status];
          const meta = [
            entry.details?.year,
            type === 'movie' ? 'Movie' : 'Series',
            entry.details?.originalNetwork?.name,
          ].filter(Boolean);
          const genres = (entry.details?.genres ?? []).slice(0, 3).map((genre) => genre.name);
          const added = formatAdded(entry.createdAt);

          return (
            <li
              key={entry.mediaId}
              className={`group grid ${LIST_COLUMNS} items-center gap-4 px-4 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/[0.04] transition-colors duration-300`}
            >
              <Link
                to={`/details/${type}/${id}`}
                className="flex items-center gap-4 min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <Artwork
                  image={entry.details?.image}
                  alt=""
                  displayWidth={44}
                  priority={index < 10}
                  className="w-11 shrink-0 aspect-[2/3] rounded-lg border border-white/10"
                />
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium text-white/90 group-hover:text-white truncate transition-colors duration-300">
                    {name}
                  </span>
                  <span className="block text-[12px] text-white/40 mt-0.5 truncate">
                    {meta.join(' · ')}
                  </span>
                  {/* On a phone the columns collapse into this line. */}
                  <span className="md:hidden flex items-center gap-3 text-[12px] text-white/55 mt-1">
                    {showStatus && status && (
                      <span className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                    )}
                    {entry.score > 0 && (
                      <span className="flex items-center gap-1">
                        <Star size={10} fill="currentColor" className="text-white/40" />
                        {entry.score}
                      </span>
                    )}
                  </span>
                </span>
              </Link>

              <span className="hidden lg:block text-[12.5px] text-white/45 truncate">
                {genres.join(', ') || '–'}
              </span>

              <span className="hidden md:flex items-center gap-2 text-[12.5px] text-white/70">
                {status && (
                  <>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dot}`} />
                    {status.label}
                  </>
                )}
              </span>

              <span className="hidden md:flex items-center gap-1.5 text-[13px] font-medium tabular-nums text-white/80">
                {entry.score > 0 ? (
                  <>
                    <Star size={11} fill="currentColor" className="text-white/35" />
                    {entry.score}
                  </>
                ) : (
                  <span className="text-white/25">–</span>
                )}
              </span>

              <span className="hidden md:block text-[12.5px] text-white/40 tabular-nums">
                {added ?? '–'}
              </span>

              <button
                onClick={() =>
                  openTracker({
                    type,
                    id,
                    name,
                    image: entry.details?.image,
                    year: entry.details?.year,
                  })
                }
                aria-label={`Edit ${name}`}
                title="Edit status and score"
                className="justify-self-end w-9 h-9 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors duration-300 ease-apple"
              >
                <Pencil size={14} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
