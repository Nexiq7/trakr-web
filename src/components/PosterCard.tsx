import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Film, X } from 'lucide-react';

export function resolveImage(image?: string | null) {
  if (!image) return null;
  return image.startsWith('http') ? image : `https://artworks.thetvdb.com${image}`;
}

interface PosterCardProps {
  href: string;
  name: string;
  subtitle?: string;
  image?: string | null;
  score?: number | null;
  statusLabel?: string;
  progressPct?: number;
  onRemove?: () => void;
}

export function PosterCard({ href, name, subtitle, image, score, statusLabel, progressPct, onRemove }: PosterCardProps) {
  const [loaded, setLoaded] = useState(false);
  const src = resolveImage(image);

  return (
    <Link to={href} className="group flex flex-col gap-2.5 w-full">
      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/8 bg-surface shadow-[0_10px_26px_rgba(0,0,0,0.5)]">
        {!loaded && <div className="absolute inset-0 art-placeholder art-loading" />}
        {src ? (
          <img
            src={src}
            alt={name}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
            className={`w-full h-full object-cover transition-transform duration-500 ease-apple group-hover:scale-110 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : (
          <div className="absolute inset-0 art-placeholder flex items-center justify-center text-white/20">
            <Film size={28} />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-70 pointer-events-none" />

        {onRemove && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }}
            aria-label={`Remove ${name} from collection`}
            className="absolute top-2.5 left-2.5 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 opacity-0 group-hover:opacity-100 hover:bg-red-500/80! hover:text-white transition-all duration-300 ease-apple"
          >
            <X size={13} />
          </button>
        )}

        {score != null && score > 0 && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-accent">
            <Star size={10} fill="currentColor" /> {score}
          </div>
        )}

        {statusLabel && (
          <div className="absolute bottom-2.5 left-2.5 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-semibold uppercase tracking-wider text-white/75">
            {statusLabel}
          </div>
        )}

        {progressPct != null && (
          <div className="absolute left-0 right-0 bottom-0 h-[3px] bg-white/15">
            <div className="h-full bg-accent" style={{ width: `${progressPct}%` }} />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <h3 className="text-[13px] font-medium text-white/90 tracking-tight truncate group-hover:text-white transition-colors">
          {name}
        </h3>
        {subtitle && <p className="text-[11.5px] text-white/45 mt-0.5 truncate">{subtitle}</p>}
      </div>
    </Link>
  );
}

export function PosterCardSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 w-full">
      <div className="aspect-[2/3] rounded-2xl border border-white/8 art-placeholder art-loading" />
      <div className="h-3 w-3/4 rounded bg-white/5" />
    </div>
  );
}
