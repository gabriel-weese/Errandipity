import { useState, type FormEvent } from 'react';

interface Props {
  /** The closed state's text and the input's accessible name, such as "Add section". */
  label: string;
  placeholder: string;
  maxLength?: number;
  /** Saves the new name. A rejection keeps the text so it can be corrected. */
  onAdd: (name: string) => Promise<unknown>;
}

/**
 * A one-line "add" row that looks like the quick-add task row: a line of text that turns
 * into an input when clicked. Enter adds and keeps the input open for the next one.
 */
export function AddLine({ label, placeholder, maxLength = 80, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    setOpen(false);
    setText('');
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-faint hover:text-ink"
      >
        <span aria-hidden="true" className="w-4 text-center">+</span> {label}
      </button>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const name = text.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      await onAdd(name);
      setText('');
    } catch {
      // The caller shows the failure.
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-3 px-3 py-1.5">
      <span aria-hidden="true" className="w-4 text-center text-sm text-faint">+</span>
      <input
        autoFocus
        aria-label={label}
        placeholder={placeholder}
        maxLength={maxLength}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && close()}
        onBlur={() => !text.trim() && close()}
        className="min-w-0 flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-faint"
      />
    </form>
  );
}
