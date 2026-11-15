import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** A choice inside a dropdown; `active` marks the current value. */
export const optionClass = (active: boolean) =>
  `flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
    active ? 'bg-accent-soft font-semibold text-accent-ink' : 'hover:bg-raised'
  }`;

/**
 * An icon button with a dropdown anchored to it. The dropdown is rendered at the
 * top of the page with fixed positioning so that neighbouring rows cannot cover it.
 */
export function ActionMenu(props: {
  label: string;
  icon: ReactNode;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const { open, onClose } = props;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  // Below the icon and right-aligned to it; above when there is no room below.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current || !panelRef.current) return setPosition(null);
    const anchor = buttonRef.current.getBoundingClientRect();
    const { offsetWidth: width, offsetHeight: height } = panelRef.current;
    const margin = 8;
    let top = anchor.bottom + 4;
    if (top + height > window.innerHeight - margin) top = Math.max(margin, anchor.top - height - 4);
    const left = Math.min(Math.max(margin, anchor.right - width), window.innerWidth - width - margin);
    setPosition({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const inside = (target: EventTarget | null) =>
      target instanceof Node && (panelRef.current?.contains(target) || buttonRef.current?.contains(target));
    const onPointer = (event: MouseEvent) => !inside(event.target) && onClose();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
      buttonRef.current?.focus();
    };
    // The dropdown does not follow the page, so close it when the page moves.
    const onScroll = (event: Event) => !inside(event.target) && onClose();
    document.addEventListener('mousedown', onPointer);
    // Capture phase, so Escape closes only this menu and nothing behind it.
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onClose);
    };
  }, [open, onClose]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={props.label}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={props.label}
        onClick={props.onToggle}
        className={`rounded p-1 hover:bg-raised hover:text-ink ${open ? 'bg-raised text-ink' : 'text-faint'}`}
      >
        {props.icon}
      </button>
      {open &&
        createPortal(
          // Rendered invisibly at first so its size can be measured, then placed and shown.
          <div
            ref={panelRef}
            role="dialog"
            aria-label={props.label}
            style={{ top: position?.top ?? 0, left: position?.left ?? 0, opacity: position ? 1 : 0 }}
            className="fixed z-50 rounded-lg border border-line bg-surface p-2 text-ink shadow-lg"
          >
            {props.children}
          </div>,
          document.body,
        )}
    </>
  );
}
