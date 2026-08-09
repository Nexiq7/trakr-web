import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';

interface HeroItem {
  id: number | string;
  name: string;
  overview?: string;
  year?: string;
  averageRuntime?: number;
  runtime?: number;
  genres?: { name: string }[];
  artworks?: { type: number; image: string }[];
  image?: string;
  trailers?: { url: string; language: string }[];
}

interface HeroProps {
  item: HeroItem;
  type: 'series' | 'movie';
  dotCount?: number;
  activeDot?: number;
  onDotClick?: (index: number) => void;
}

export const Hero = ({ item, type, dotCount = 0, activeDot = 0, onDotClick }: HeroProps) => {
  const backdrop = item.artworks?.find((a) => a.type === 3)?.image || item.image;
  const genres = item.genres?.map((g) => g.name).slice(0, 3).join(' · ');
  const runtime = item.averageRuntime || item.runtime;
  const trailer = item.trailers?.find((t) => t.language === 'eng')?.url;
  const detailsHref = `/details/${type}/${item.id}`;

  return (
    <div className="relative h-[78vh] min-h-[560px] w-full overflow-hidden">
      {backdrop && (
        <img src={backdrop} alt="" className="absolute inset-0 w-full h-full object-cover animate-subtle-zoom" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/25 to-transparent" />

      <div className="relative z-10 h-full max-w-[1400px] mx-auto px-6 md:px-10 lg:px-16 flex flex-col justify-end pb-20">
        <div key={item.id} className="max-w-xl flex flex-col gap-4 animate-fade-up">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2.5 py-1 rounded-md bg-accent/18 border border-accent/40 text-[11px] font-semibold tracking-wide text-[#b8a5ff] uppercase">
              Trending
            </span>
            <span className="text-[13px] text-white/60">
              {[item.year, genres, runtime ? `${runtime}m` : null].filter(Boolean).join(' · ')}
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.02]">
            {item.name}
          </h1>

          {item.overview && (
            <p className="text-[15px] leading-relaxed text-white/70 line-clamp-3">{item.overview}</p>
          )}

          <div className="flex gap-2.5 pt-2">
            {trailer ? (
              <a
                href={trailer}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent-strong text-white text-sm font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.35)] hover:brightness-110 transition"
              >
                <Play size={16} fill="currentColor" /> Watch Trailer
              </a>
            ) : (
              <Link
                to={detailsHref}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent-strong text-white text-sm font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.35)] hover:brightness-110 transition"
              >
                <Play size={16} fill="currentColor" /> View Details
              </Link>
            )}
          </div>

          {dotCount > 1 && (
            <div className="flex items-center gap-2 pt-4">
              {Array.from({ length: dotCount }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => onDotClick?.(i)}
                  aria-label={`Show featured title ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-500 ease-apple ${
                    i === activeDot ? 'w-6 bg-accent' : 'w-1.5 bg-white/25 hover:bg-white/45'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
