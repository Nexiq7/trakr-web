import { PlayCircle, Bookmark, CheckCircle2, XCircle, type LucideIcon } from 'lucide-react';

export const STATUS_OPTIONS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'watching', label: 'Watching', icon: PlayCircle },
  { id: 'planning', label: 'Plan to Watch', icon: Bookmark },
  { id: 'completed', label: 'Completed', icon: CheckCircle2 },
  { id: 'dropped', label: 'Dropped', icon: XCircle },
];

interface StatusButtonsProps {
  status: string;
  onChange: (status: string) => void;
}

export function StatusButtons({ status, onChange }: StatusButtonsProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {STATUS_OPTIONS.map((opt) => {
        const active = status === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 ease-apple ${
              active
                ? 'bg-accent-strong text-white shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
                : 'bg-surface-2 text-white/70 hover:bg-white/10'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <opt.icon size={16} />
              {opt.label}
            </span>
            {active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
          </button>
        );
      })}
    </div>
  );
}
