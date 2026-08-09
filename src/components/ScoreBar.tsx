interface ScoreBarProps {
  score: number;
  onChange: (score: number) => void;
  disabled?: boolean;
}

export function ScoreBar({ score, onChange, disabled }: ScoreBarProps) {
  return (
    <div className="rounded-2xl bg-surface-2 p-4">
      <div className="flex items-baseline justify-between mb-3.5">
        <span className="text-xs text-white/55">Your score</span>
        <span className="text-2xl font-semibold tracking-tight">
          {score}
          <span className="text-sm font-medium text-white/35">/10</span>
        </span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(n)}
            aria-label={`Rate ${n} out of 10`}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ease-apple ${
              score >= n ? 'bg-accent' : 'bg-white/10 hover:bg-white/20'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
