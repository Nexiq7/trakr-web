import { useEffect, useRef, type ReactNode } from 'react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}

/**
 * A modal that arrives the way the platform expects: sliding up from the bottom
 * edge on a phone, scaling into the centre on a pointer device.
 *
 * Both share the same scrim and the same dismissals — Escape, a click outside,
 * and (on the sheet) the grab handle — so there's never a state you can't back
 * out of.
 */
export function Sheet({ open, onClose, label, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    // The page behind must not scroll under the scrim. Padding replaces the
    // scrollbar's width so the layout doesn't jump sideways as it locks.
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    // Focus moves into the panel so a keyboard user is already inside the
    // dialog rather than tabbing there from the page behind it.
    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center">
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-md animate-fade-in"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="relative w-full sm:w-[420px] max-h-[88vh] overflow-y-auto scrollbar-hide rounded-t-[28px] sm:rounded-[28px] glass-panel shadow-[0_-20px_70px_rgba(0,0,0,0.7)] sm:shadow-[0_30px_80px_rgba(0,0,0,0.7)] outline-none animate-sheet-up sm:animate-scale-in"
      >
        <div aria-hidden className="sm:hidden flex justify-center pt-3 pb-1">
          <span className="w-9 h-1 rounded-full bg-white/25" />
        </div>
        {children}
        {/* Clears the home indicator on a phone. */}
        <div aria-hidden className="h-3 sm:h-0" />
      </div>
    </div>
  );
}
