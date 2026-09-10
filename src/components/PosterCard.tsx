import { Link } from 'react-router-dom';
import { Bookmark, Check, Star } from 'lucide-react';
import { Artwork } from './Artwork';
import { useWatchlist } from '../context/WatchlistContext';
import { useTrackSheet } from '../context/TrackSheetContext';
import { prefetchImage, resolveImage } from '../lib/images';
import type { MediaType } from '../lib/tvdb';

interface PosterCardProps {
  type: MediaType;
  id: string | number;
  name: string;
  subtitle?: string;
  image?: string | null;
  /** Poster width in CSS pixels at the widest breakpoint, for source selection. */
  displayWidth?: number;
  /** Above-the-fold cards load eagerly rather than waiting on the observer. */
  priority?: boolean;
  /** Show the score the user gave it, rather than the save control. */
  showUserScore?: boolean;
  statusLabel?: string;
}

const STATUS_TINT: Record<string, string> = {
  watching: 'bg-emerald-400',
  planning: 'bg-accent',
  completed: 'bg-sky-400',
  dropped: 'bg-white/40',
};

/**
 * One title in a grid or rail.
 *
 * The card does two jobs at once: it's a link to the details page, and it's the
 * fastest way to save something. The save control is a real button layered over
 * the link, so tapping it never navigates — which is what makes browsing a
 * grid and building a collection the same gesture instead of a round trip
 * through a details page for every title.
 */
export function PosterCard({
  type,
  id,
  name,
  subtitle,
  image,
  displayWidth = 190,
  priority = false,
  showUserScore = false,
  statusLabel,
}: PosterCardProps) {
  const { entryFor } = useWatchlist();
  const { openTracker } = useTrackSheet();

  const entry = entryFor(type, id);
  const saved = entry !== undefined;
  const status = entry?.status;

  return (
    <div className="group relative w-full">
      <Link
        to={`/details/${type}/${id}`}
        className="flex flex-col gap-2.5 w-full outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-4 focus-visible:ring-offset-black rounded-2xl"
        // By the time the details page mounts, its hero artwork is already in
        // the browser cache — the transition lands on an image, not a shimmer.
        onMouseEnter={() => prefetchImage(resolveImage(image))}
      >
        <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-white/8 bg-surface shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-transform duration-500 ease-apple group-hover:-translate-y-1.5 group-hover:shadow-[0_22px_44px_rgba(0,0,0,0.65)]">
          <Artwork
            image={image}
            alt={name}
            displayWidth={displayWidth}
            priority={priority}
            className="absolute inset-0"
            imgClassName="transition-transform duration-[900ms] ease-apple group-hover:scale-[1.08]"
          />

          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-60 pointer-events-none"
          />

          {status && (
            <span
              aria-hidden
              className={`absolute left-0 right-0 bottom-0 h-[3px] ${STATUS_TINT[status] ?? 'bg-accent'}`}
            />
          )}

          {statusLabel && (
            <span className="absolute bottom-2.5 left-2.5 px-2 py-1 rounded-md bg-black/65 backdrop-blur-md border border-white/10 text-[9px] font-semibold uppercase tracking-wider text-white/80">
              {statusLabel}
            </span>
          )}

          {showUserScore && entry != null && entry.score > 0 && (
            <span className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/65 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-accent-soft">
              <Star size={10} fill="currentColor" /> {entry.score}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <h3 className="text-[13px] font-medium text-white/90 tracking-tight truncate group-hover:text-white transition-colors duration-300">
            {name}
          </h3>
          {subtitle && <p className="text-[11.5px] text-white/45 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </Link>

      {/* Layered over the link rather than nested inside it: a button inside an
          anchor is invalid, and nesting means every save is also a navigation. */}
      <button
        type="button"
        onClick={() => openTracker({ type, id, name, image, year: subtitle })}
        aria-label={saved ? `Edit ${name} in your collection` : `Save ${name} to your collection`}
        className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center border backdrop-blur-md transition-all duration-300 ease-apple active:scale-90 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 ${
          saved
            ? 'bg-accent text-white border-white/20 opacity-100 shadow-[0_4px_14px_rgba(124,92,255,0.5)]'
            : 'bg-black/55 text-white/80 border-white/12 hover:bg-black/80 hover:text-white opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 max-md:opacity-100'
        }`}
      >
        {saved ? <Check size={15} strokeWidth={3} /> : <Bookmark size={14} />}
      </button>
    </div>
  );
}

export function PosterCardSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 w-full">
      <div className="aspect-[2/3] rounded-2xl border border-white/8 art-placeholder art-loading" />
      <div className="h-3 w-3/4 rounded-full skeleton" />
      <div className="h-2.5 w-1/3 rounded-full skeleton" />
    </div>
  );
}
