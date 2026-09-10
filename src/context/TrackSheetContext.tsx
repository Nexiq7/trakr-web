import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, CheckCircle2, PlayCircle, Trash2, XCircle, type LucideIcon } from 'lucide-react';
import { Sheet } from '../components/ui/Sheet';
import { Artwork } from '../components/Artwork';
import { useAuth } from './AuthContext';
import { useWatchlist } from './WatchlistContext';
import type { WatchStatus } from '../lib/tvdb';

export interface TrackTarget {
  type: string;
  id: string | number;
  name: string;
  image?: string | null;
  year?: string;
}

interface TrackSheetContextValue {
  /** Open the tracking sheet for a title, from anywhere it appears. */
  openTracker: (target: TrackTarget) => void;
}

const TrackSheetContext = createContext<TrackSheetContextValue | null>(null);

const STATUS_OPTIONS: { id: WatchStatus; label: string; icon: LucideIcon }[] = [
  { id: 'watching', label: 'Watching', icon: PlayCircle },
  { id: 'planning', label: 'Plan to watch', icon: Bookmark },
  { id: 'completed', label: 'Completed', icon: CheckCircle2 },
  { id: 'dropped', label: 'Dropped', icon: XCircle },
];

/**
 * The one place a title's status and score get set.
 *
 * Hoisting it here is what lets a poster in a rail, a search result and the
 * details page all offer the same full tracking control without any of them
 * owning a dialog — and without a menu inside a card that a grid's overflow
 * would clip.
 */
export function TrackSheetProvider({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<TrackTarget | null>(null);
  const { token } = useAuth();
  const { entryFor, save, remove } = useWatchlist();
  const navigate = useNavigate();

  const openTracker = useCallback(
    (next: TrackTarget) => {
      // Tracking needs an account. Sending them to sign in and back beats
      // opening a sheet whose every control fails.
      if (!token) {
        navigate('/login', { state: { from: window.location.pathname } });
        return;
      }
      setTarget(next);
    },
    [token, navigate],
  );

  const close = useCallback(() => setTarget(null), []);

  const value = useMemo(() => ({ openTracker }), [openTracker]);

  const entry = target ? entryFor(target.type, target.id) : undefined;
  const score = entry?.score ?? 0;

  return (
    <TrackSheetContext.Provider value={value}>
      {children}

      <Sheet open={target !== null} onClose={close} label={`Track ${target?.name ?? ''}`}>
        {target && (
          <div className="p-5 sm:p-6 flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <Artwork
                image={target.image}
                alt=""
                displayWidth={56}
                className="w-14 shrink-0 aspect-[2/3] rounded-xl border border-white/10"
              />
              <div className="min-w-0">
                <h2 className="text-[17px] font-semibold tracking-tight text-white truncate">
                  {target.name}
                </h2>
                <p className="text-[13px] text-white/45 mt-0.5">
                  {[target.year, target.type === 'movie' ? 'Movie' : 'Series']
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
                Status
              </p>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map((option) => {
                  const active = entry?.status === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() =>
                        save({
                          type: target.type,
                          id: target.id,
                          status: option.id,
                          details: { name: target.name, image: target.image ?? undefined },
                        })
                      }
                      aria-pressed={active}
                      className={`flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-[13.5px] font-medium transition-all duration-300 ease-apple active:scale-[0.97] ${
                        active
                          ? 'bg-accent-strong text-white shadow-[0_6px_20px_rgba(107,75,238,0.35)]'
                          : 'bg-white/6 text-white/70 hover:bg-white/12 hover:text-white'
                      }`}
                    >
                      <option.icon size={16} className="shrink-0" />
                      <span className="truncate">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
                  Your score
                </p>
                <p className="text-[15px] font-semibold tabular-nums">
                  {score > 0 ? score : '–'}
                  <span className="text-white/35 font-medium text-[12px]">/10</span>
                </p>
              </div>
              <div className="flex gap-1.5">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    aria-label={`Score ${n} out of 10`}
                    onClick={() =>
                      save({
                        type: target.type,
                        id: target.id,
                        score: n,
                        details: { name: target.name, image: target.image ?? undefined },
                      })
                    }
                    className="group flex-1 h-8 flex items-end"
                  >
                    <span
                      className={`w-full rounded-full transition-all duration-300 ease-apple ${
                        score >= n
                          ? 'h-5 bg-accent'
                          : 'h-1.5 bg-white/12 group-hover:h-3 group-hover:bg-white/25'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {entry && (
              <button
                onClick={() => {
                  remove(target.type, target.id);
                  close();
                }}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 hover:bg-red-500/15 text-[13.5px] font-medium text-white/50 hover:text-red-300 transition-colors duration-300 ease-apple"
              >
                <Trash2 size={15} /> Remove from collection
              </button>
            )}
          </div>
        )}
      </Sheet>
    </TrackSheetContext.Provider>
  );
}

export function useTrackSheet() {
  const ctx = useContext(TrackSheetContext);
  if (!ctx) throw new Error('useTrackSheet must be used inside a TrackSheetProvider');
  return ctx;
}
