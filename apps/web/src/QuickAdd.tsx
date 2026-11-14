import { useState, type FormEvent } from 'react';
import { useApp } from './context';

/** A one-line "add task" row for the bottom of a day's list. */
export function QuickAdd({ date }: { date: string }) {
  const { openEditor, quickAdd } = useApp();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    setOpen(false);
    setTitle('');
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
      >
        <span aria-hidden="true">+</span> Add task
      </button>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const name = title.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      await quickAdd(name, date);
      setTitle('');
    } catch {
      // The failure is reported as a toast; keep the text so it can be retried.
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && !title.trim() && close()}
      className="flex items-center gap-2 px-3 py-1.5"
    >
      <input
        autoFocus
        aria-label={`Task name for ${date}`}
        placeholder="Task name"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && close()}
        className="min-w-0 flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
      />
      <button
        type="button"
        aria-label="Open the full task form"
        title="More options"
        onClick={() => {
          openEditor(undefined, { title: title.trim(), dueDate: date });
          close();
        }}
        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </form>
  );
}
