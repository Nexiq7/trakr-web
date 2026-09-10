import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bookmark,
  CheckCircle2,
  LayoutGrid,
  Library,
  PlayCircle,
  Search as SearchIcon,
  Sparkles,
  Star,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { PosterCard, PosterCardSkeleton } from '../components/PosterCard';
import { Segmented } from '../components/ui/Segmented';
import { useAuth } from '../context/AuthContext';
import { useWatchlist } from '../context/WatchlistContext';
import { idFromMediaKey, type MediaType, type WatchStatus, type WatchlistEntry } from '../lib/tvdb';

type Tab = 'all' | WatchStatus;
type SortId = 'recent' | 'score' | 'name';

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'all', label: 'All', icon: LayoutGrid },
  { id: 'watching', label: 'Watching', icon: PlayCircle },
  { id: 'planning', label: 'Planned', icon: Bookmark },
  { id: 'completed', label: 'Completed', icon: CheckCircle2 },
  { id: 'dropped', label: 'Dropped', icon: XCircle },
];

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

  const [tab, setTab] = useState<Tab>('all');
  const [sort, setSort] = useState<SortId>('recent');
  const [filter, setFilter] = useState('');

  const counts = useMemo(() => {
    const base: Record<Tab, number> = {
      all: entries.length,
      watching: 0,
      planning: 0,
      completed: 0,
      dropped: 0,
    };
    for (const entry of entries) {
      if (entry.status in base) base[entry.status] += 1;
    }
    return base;
  }, [entries]);

  const scored = entries.filter((entry) => (entry.score ?? 0) > 0);
  const averageScore =
    scored.length > 0
      ? (scored.reduce((sum, entry) => sum + (entry.score ?? 0), 0) / scored.length).toFixed(1)
      : null;

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const byTab = tab === 'all' ? entries : entries.filter((entry) => entry.status === tab);
    const byName = needle
      ? byTab.filter((entry) => (entry.details?.name ?? '').toLowerCase().includes(needle))
      : byTab;
    return sortEntries(byName, sort);
  }, [entries, tab, sort, filter]);

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
            <div className="flex gap-2 mb-8">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-9 w-28 rounded-full skeleton" />
              ))}
            </div>
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
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <div className="flex overflow-x-auto scrollbar-hide gap-1.5 -mx-1 px-1">
                {TABS.map((option) => {
                  const active = tab === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setTab(option.id)}
                      aria-pressed={active}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-all duration-300 ease-apple active:scale-95 ${
                        active
                          ? 'bg-white/12 text-white border border-white/10'
                          : 'text-white/50 hover:text-white border border-transparent'
                      }`}
                    >
                      <option.icon size={14} />
                      {option.label}
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          active ? 'bg-white/15 text-white' : 'bg-white/8 text-white/40'
                        }`}
                      >
                        {counts[option.id]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <label className="relative">
                  <SearchIcon
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
                  />
                  <input
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    placeholder="Filter titles"
                    aria-label="Filter your collection"
                    className="w-[150px] focus:w-[200px] bg-white/6 border border-white/8 focus:border-accent/45 rounded-full pl-8 pr-3 py-2 text-[13px] text-white placeholder:text-white/30 outline-none transition-all duration-400 ease-apple"
                  />
                </label>
                <Segmented options={SORTS} value={sort} onChange={setSort} label="Sort collection" />
              </div>
            </div>

            {visible.length === 0 ? (
              <p className="text-center text-white/35 text-[14px] py-20">
                {filter.trim()
                  ? `Nothing in your collection matches “${filter.trim()}”`
                  : 'Nothing in this category yet'}
              </p>
            ) : (
              <Grid>
                {visible.map((entry, index) => {
                  const type: MediaType = entry.type === 'movie' ? 'movie' : 'series';
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
