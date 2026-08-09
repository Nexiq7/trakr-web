import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  PlayCircle, CheckCircle2, Bookmark,
  XCircle, LayoutGrid, Loader2, Library
} from 'lucide-react';
import { PosterCard } from '../components/PosterCard';
import { apiFetch } from '../lib/api';

const STATUS_TABS = [
  { id: 'all', label: 'All', icon: LayoutGrid },
  { id: 'watching', label: 'Watching', icon: PlayCircle },
  { id: 'planning', label: 'Planned', icon: Bookmark },
  { id: 'completed', label: 'Completed', icon: CheckCircle2 },
  { id: 'dropped', label: 'Dropped', icon: XCircle },
];

interface WatchlistEntry {
  id: number;
  mediaId: string;
  type: string;
  status: string;
  score: number;
  details?: { name: string; image: string };
}

export const Watchlist = () => {
  const [list, setList] = useState<WatchlistEntry[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;

    const fetchWatchlist = async () => {
      setIsLoading(true);
      try {
        const res = await apiFetch('/api/watchlist-details');
        setList(res.ok ? await res.json() : []);
      } catch (error) {
        console.error("Failed to load watchlist:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWatchlist();
  }, [token]);

  const handleRemove = async (mediaId: string) => {
    const previous = list;
    setList((l) => l.filter((i) => i.mediaId !== mediaId));

    try {
      const res = await apiFetch(`/api/track/${mediaId}`, { method: 'DELETE' });
      if (!res.ok) setList(previous);
    } catch (error) {
      console.error("Failed to remove from collection:", error);
      setList(previous);
    }
  };

  const filteredList = activeTab === 'all'
    ? list
    : list.filter(item => item.status === activeTab);

  const scored = list.filter((i) => i.score > 0);
  const avgScore = scored.length > 0
    ? (scored.reduce((sum, i) => sum + i.score, 0) / scored.length).toFixed(1)
    : null;

  if (!token) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center gap-3 px-6 text-center">
        <Library size={32} className="text-white/25" />
        <p className="text-white/70 font-medium">Sign in to see your collection</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-white/30" size={28} />
        <span className="text-white/40 font-medium text-[10px] uppercase tracking-[0.25em]">Loading collection</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-28 md:pt-36 pb-24 px-6 md:px-10 lg:px-16">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Collection</h1>
          <p className="text-white/45 text-sm mt-2.5">
            {list.length} title{list.length === 1 ? '' : 's'}
            {avgScore && <> · avg score {avgScore}</>}
          </p>
        </div>

        <div className="flex overflow-x-auto scrollbar-hide gap-1.5 pb-8">
          {STATUS_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = tab.id === 'all'
              ? list.length
              : list.filter(i => i.status === tab.id).length;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-colors duration-300 ease-apple whitespace-nowrap ${
                  isActive
                    ? 'bg-white/12 text-white'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-white/15' : 'bg-white/8 text-white/40'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {filteredList.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
            <Library size={40} className="mx-auto text-white/20 mb-4" />
            <p className="text-white/60 font-medium text-sm">No items in this category</p>
            <p className="text-white/30 text-xs mt-2">Time to start tracking some new shows!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-8">
            {filteredList.map((item) => {
              const actualId = item.mediaId.includes('-') ? item.mediaId.split('-')[1] : item.mediaId;
              const type = item.type || 'series';

              return (
                <PosterCard
                  key={item.id}
                  href={`/details/${type}/${actualId}`}
                  name={item.details?.name || 'Untitled'}
                  score={item.score}
                  statusLabel={activeTab === 'all' ? item.status : undefined}
                  image={item.details?.image}
                  onRemove={() => handleRemove(item.mediaId)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
