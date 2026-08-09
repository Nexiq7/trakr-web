import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Loader2, Clock, Calendar, ShieldAlert, Tv, Users, Tag, Play, CalendarPlus,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { ScoreBar } from '../components/ScoreBar';
import { StatusButtons } from '../components/StatusButtons';
import { resolveImage } from '../components/PosterCard';
import { apiFetch, SessionExpiredError } from '../lib/api';

interface Episode {
  id: number;
  name: string;
  overview?: string;
  seasonNumber: number;
  number: number;
  aired?: string;
  runtime?: number;
  image?: string;
}

export const Details = () => {
  const { type, id } = useParams();
  const navigate = useNavigate();

  const [series, setSeries] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [userScore, setUserScore] = useState(0);
  const [addedAt, setAddedAt] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);

  const apiType = type === 'movie' ? 'movies' : type;

  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const mediaKey = `${type}-${id}`;

      try {
        const [seriesRes, watchlistRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/tvdb/details/${apiType}/${id}`),
          // An expired session shouldn't stop the page rendering — the title
          // still loads, just without the viewer's tracking state.
          token
            ? apiFetch('/api/watchlist-details').catch(() => null)
            : Promise.resolve(null),
        ]);

        const seriesJson = await seriesRes.json();
        setSeries(seriesJson.data);

        if (watchlistRes?.ok) {
          const watchlistData = await watchlistRes.json();
          const currentEntry = watchlistData.find((item: any) => item.mediaId === mediaKey);

          if (currentEntry) {
            setStatus(currentEntry.status);
            setUserScore(currentEntry.score || 0);
            setAddedAt(currentEntry.createdAt || null);
          }
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();
  }, [id, type, apiType]);

  const episodesBySeason = useMemo(() => {
    const map = new Map<number, Episode[]>();
    ((series?.episodes || []) as Episode[]).forEach((ep) => {
      const list = map.get(ep.seasonNumber) || [];
      list.push(ep);
      map.set(ep.seasonNumber, list);
    });
    for (const list of map.values()) list.sort((a, b) => a.number - b.number);
    return map;
  }, [series]);

  const seasonNumbers = useMemo(() => {
    return [...episodesBySeason.keys()].sort((a, b) => {
      if (a === 0) return 1; // specials last
      if (b === 0) return -1;
      return a - b;
    });
  }, [episodesBySeason]);

  const effectiveSeason = selectedSeason ?? seasonNumbers[0] ?? null;

  const seasonScrollRef = useRef<HTMLDivElement>(null);
  const [seasonOverflow, setSeasonOverflow] = useState(false);

  useEffect(() => {
    const el = seasonScrollRef.current;
    if (!el) return;
    const check = () => setSeasonOverflow(el.scrollWidth > el.clientWidth + 4);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [seasonNumbers]);

  const scrollSeasons = (dir: number) => seasonScrollRef.current?.scrollBy({ left: dir * 240, behavior: 'smooth' });

  const handleTrack = async (newStatus?: string, newScore?: number) => {
    setIsSyncing(true);
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      setIsSyncing(false);
      return;
    }

    const payload = {
      mediaId: `${type}-${id}`,
      type: type,
      status: newStatus || status,
      score: newScore ?? userScore
    };

    try {
      const response = await apiFetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const saved = await response.json();
        if (newStatus) setStatus(newStatus);
        if (newScore !== undefined) setUserScore(newScore);
        if (saved.createdAt) setAddedAt(saved.createdAt);
      }
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        navigate('/login');
        return;
      }
      console.error("Failed to sync tracking:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRemove = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setIsSyncing(true);
    try {
      const response = await apiFetch(`/api/track/${type}-${id}`, { method: 'DELETE' });

      if (response.ok) {
        setStatus('');
        setUserScore(0);
        setAddedAt(null);
      }
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        navigate('/login');
        return;
      }
      console.error("Failed to remove from collection:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading || !series) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-white/30" size={28} />
        <span className="text-white/40 font-medium tracking-[0.25em] text-[10px] uppercase">Synchronizing</span>
      </div>
    );
  }

  const logo = series.artworks?.find((a: any) => a.type === 23)?.image;
  const backdrop = series.artworks?.find((a: any) => a.type === 3)?.image || series.image;
  const poster = resolveImage(series.image);

  const rating = series.contentRatings?.find((r: any) => r.country === 'usa')?.name || '';
  const network = series.originalNetwork?.name || '';
  const genres = series.genres?.map((g: any) => g.name) || [];
  const cast = series.characters?.filter((c: any) => c.image).sort((a: any, b: any) => a.sort - b.sort).slice(0, 9) || [];
  const tags = series.tags?.map((t: any) => t.name) || [];
  const trailer = series.trailers?.find((t: any) => t.language === 'eng')?.url;

  const seasonEpisodes = effectiveSeason !== null ? episodesBySeason.get(effectiveSeason) || [] : [];

  return (
    <div className="min-h-screen bg-black text-white font-sans">

      {/* Hero */}
      <div className="relative h-[64vh] min-h-[460px] w-full overflow-hidden">
        <div className="absolute inset-0">
          {backdrop && (
            <img src={backdrop} className="w-full h-full object-cover animate-subtle-zoom" alt="" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/15" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/10 to-transparent" />
        </div>

        <div className="relative z-10 h-full max-w-[1400px] mx-auto px-6 md:px-10 lg:px-16 flex flex-col justify-end pb-14">
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center gap-2.5 text-white/60 hover:text-white transition-colors w-fit mb-8"
          >
            <div className="w-8 h-8 rounded-full bg-white/8 group-hover:bg-white/14 border border-white/10 flex items-center justify-center">
              <ArrowLeft size={14} />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em]">Back</span>
          </button>

          <div className="flex items-end gap-8">
            {poster && (
              <div className="hidden md:block w-[190px] shrink-0 aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.7)]">
                <img src={poster} className="w-full h-full object-cover" alt="" />
              </div>
            )}

            <div className="max-w-2xl flex flex-col gap-4">
              {logo ? (
                <img src={logo} alt={series.name} className="h-20 md:h-28 object-contain object-left drop-shadow-2xl" />
              ) : (
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.02]">{series.name}</h1>
              )}

              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-md bg-white/10 border border-white/10 text-white">
                  {series.status?.name || 'Released'}
                </span>
                {rating && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/6 text-xs font-medium text-white/70">
                    <ShieldAlert size={13} className="text-white/40" /> {rating}
                  </span>
                )}
                {network && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/6 text-xs font-medium text-white/70">
                    <Tv size={13} className="text-white/40" /> {network}
                  </span>
                )}
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/6 text-xs font-medium text-white/70">
                  <Calendar size={13} className="text-white/40" /> {series.year}
                </span>
                {(series.averageRuntime || series.runtime) && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/6 text-xs font-medium text-white/70">
                    <Clock size={13} className="text-white/40" /> {series.averageRuntime || series.runtime}m
                  </span>
                )}
                {genres.length > 0 && (
                  <span className="text-xs font-medium text-white/50 ml-1">{genres.join(' · ')}</span>
                )}
              </div>

              {trailer && (
                <a
                  href={trailer}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 w-fit px-5 py-2.5 rounded-xl bg-accent-strong text-white text-sm font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.35)] hover:brightness-110 transition"
                >
                  <Play size={15} fill="currentColor" /> Watch Trailer
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 lg:px-16 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-14">

          <div className="lg:col-span-8 flex flex-col gap-14 min-w-0">
            {series.overview && (
              <section className="flex flex-col gap-3.5">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">Overview</h2>
                <p className="text-white/80 text-[16px] md:text-[17px] leading-relaxed">{series.overview}</p>
              </section>
            )}

            {seasonNumbers.length > 0 && (
              <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h2 className="text-xl font-semibold tracking-tight">
                    {effectiveSeason === 0 ? 'Specials' : `Season ${effectiveSeason}`}
                  </h2>
                  <div className="flex items-center gap-3">
                    {seasonEpisodes.length > 0 && (
                      <span className="text-xs font-medium text-white/45 px-2.5 py-1 rounded-full bg-white/6">
                        {seasonEpisodes.length} episodes
                      </span>
                    )}
                    {seasonNumbers.length > 1 && seasonOverflow && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => scrollSeasons(-1)}
                          aria-label="Scroll seasons left"
                          className="w-7 h-7 rounded-full bg-white/8 hover:bg-white/14 flex items-center justify-center transition-colors"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          onClick={() => scrollSeasons(1)}
                          aria-label="Scroll seasons right"
                          className="w-7 h-7 rounded-full bg-white/8 hover:bg-white/14 flex items-center justify-center transition-colors"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {seasonNumbers.length > 1 && (
                  <div ref={seasonScrollRef} className="flex gap-1.5 overflow-x-auto scrollbar-hide scroll-smooth">
                    {seasonNumbers.map((n) => (
                      <button
                        key={n}
                        onClick={() => setSelectedSeason(n)}
                        className={`flex-none px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors duration-300 ease-apple ${
                          effectiveSeason === n ? 'bg-white/12 text-white' : 'text-white/45 hover:text-white/70'
                        }`}
                      >
                        {n === 0 ? 'Specials' : `Season ${n}`}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-0.5 rounded-2xl overflow-hidden bg-surface border border-white/8">
                  {seasonEpisodes.map((ep) => (
                    <div key={ep.id} className="flex items-center gap-4 px-4 py-3.5 border-b border-white/5 last:border-b-0">
                      <span className="w-6 text-center text-[13px] font-semibold text-white/30 shrink-0">{ep.number}</span>
                      <div className="w-24 aspect-video rounded-lg overflow-hidden bg-surface-2 shrink-0 relative">
                        {resolveImage(ep.image) ? (
                          <img src={resolveImage(ep.image)!} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 art-placeholder" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-white/90 truncate">{ep.name || `Episode ${ep.number}`}</p>
                        <p className="text-[12px] text-white/40 mt-0.5">
                          {ep.aired ? new Date(ep.aired).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'TBA'}
                        </p>
                      </div>
                      {ep.runtime ? <span className="text-[12px] text-white/35 shrink-0">{ep.runtime}m</span> : null}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {cast.length > 0 && (
              <section className="flex flex-col gap-4">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                  <Users size={13} /> Top Cast
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                  {cast.map((person: any) => (
                    <div key={person.id} className="flex items-center gap-3.5">
                      {person.image ? (
                        <img
                          src={person.image}
                          alt={person.personName}
                          className="w-11 h-11 rounded-full object-cover border border-white/10 shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#3a3a3e] to-[#1a1a1c] border border-white/10 shrink-0 flex items-center justify-center text-xs font-semibold text-white/50">
                          {person.personName?.[0] ?? '?'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-medium text-white/90 truncate">{person.personName}</p>
                        <p className="text-[12px] text-white/40 truncate">{person.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {tags.length > 0 && (
              <section className="flex flex-col gap-4">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                  <Tag size={13} /> Themes & Elements
                </h2>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag: string) => (
                    <span key={tag} className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-2 border border-white/6 text-xs font-medium text-white/60 transition-colors">
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="lg:col-span-4">
            <div className="rounded-[22px] bg-surface border border-white/8 p-6 flex flex-col gap-5 sticky top-24 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-semibold tracking-tight">Your entry</h3>
                {isSyncing && <Loader2 size={15} className="animate-spin text-white/40" />}
              </div>

              <ScoreBar score={userScore} onChange={(n) => handleTrack(undefined, n)} disabled={isSyncing} />

              <div className="flex flex-col gap-2">
                <span className="text-xs text-white/55">Status</span>
                <StatusButtons status={status} onChange={(s) => handleTrack(s)} />
              </div>

              {addedAt && (
                <div className="flex items-center justify-between pt-4 border-t border-white/8 text-[13px]">
                  <span className="flex items-center gap-1.5 text-white/50"><CalendarPlus size={13} /> Added</span>
                  <span className="font-medium">
                    {new Date(addedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )}

              {status && (
                <button
                  onClick={handleRemove}
                  disabled={isSyncing}
                  className="text-center text-xs font-medium text-white/35 hover:text-red-400 transition-colors -mt-1 disabled:opacity-50"
                >
                  Remove from Collection
                </button>
              )}

              {!localStorage.getItem('token') && (
                <Link
                  to="/login"
                  className="text-center text-xs font-medium text-white/45 hover:text-white/70 transition-colors -mt-1"
                >
                  Sign in to save your progress
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
