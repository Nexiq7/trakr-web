import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Check, Info, TriangleAlert } from 'lucide-react';

type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  toast: (message: string, options?: { tone?: ToastTone; action?: Toast['action'] }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VISIBLE_MS = 4000;
/** More than a few at once stops being feedback and starts being a wall. */
const MAX_VISIBLE = 3;

const TONE_STYLES: Record<ToastTone, { icon: typeof Check; className: string }> = {
  success: { icon: Check, className: 'text-emerald-300' },
  error: { icon: TriangleAlert, className: 'text-red-300' },
  info: { icon: Info, className: 'text-white/60' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback<ToastContextValue['toast']>(
    (message, { tone = 'success', action } = {}) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-(MAX_VISIBLE - 1)), { id, message, tone, action }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), VISIBLE_MS),
      );
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Above the mobile tab bar, out of the way of the desktop navbar. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[104px] md:bottom-8 z-[200] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => {
          const { icon: Icon, className } = TONE_STYLES[t.tone];
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex items-center gap-3 max-w-[92vw] pl-3.5 pr-2 py-2.5 rounded-full glass-panel shadow-[0_16px_44px_rgba(0,0,0,0.6)] animate-toast-in"
            >
              <Icon size={15} className={`shrink-0 ${className}`} />
              <span className="text-[13.5px] font-medium text-white/90 truncate">{t.message}</span>
              {t.action && (
                <button
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                  className="shrink-0 px-3 py-1 rounded-full bg-white/10 hover:bg-white/18 text-[12.5px] font-semibold text-white transition-colors duration-200"
                >
                  {t.action.label}
                </button>
              )}
              {!t.action && <span className="w-1" />}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside a ToastProvider');
  return ctx;
}
