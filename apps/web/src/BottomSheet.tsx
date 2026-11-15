import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  /** The sheet's accessible name, also shown as its heading. */
  label: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * A panel that slides over the bottom of the screen, for phones: what a dropdown shows on
 * a wider screen. Tapping outside it or pressing Escape (Android's back gesture does not
 * reach the page) closes it.
 */
export function BottomSheet({ label, onClose, children }: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
    };
    // Capture phase, so Escape closes only the sheet and not a dialog behind it.
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end bg-overlay"
      // Clicks inside the sheet reach this handler too, through React's tree; only the backdrop itself closes.
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-ink shadow-xl"
      >
        <div className="mb-3 flex items-center gap-2">
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{label}</h2>
          <button type="button" onClick={onClose} className="rounded px-3 py-2 text-sm text-soft hover:bg-raised">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
