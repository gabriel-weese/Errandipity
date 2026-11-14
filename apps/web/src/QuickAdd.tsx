import { useState, type FormEvent } from 'react';
import {
  describeRecurrence,
  formatShortDate,
  formatTime12,
  parseQuickAdd,
  resolveQuickAdd,
} from '@errandipity/shared';
import { Link } from 'react-router';
import { useApp } from './context';
import { DetailLine, PRIORITY_BOX } from './TaskRow';

/**
 * A one-line "add task" row for the bottom of a day's list. Symbols in the text
 * set the priority, day, time and repeat (see parseQuickAdd and the Help page).
 */
export function QuickAdd({ date }: { date: string }) {
  const { today, openEditor, quickAdd } = useApp();
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
        <span aria-hidden="true" className="w-4 text-center">+</span> Add task
      </button>
    );
  }

  const task = resolveQuickAdd(parseQuickAdd(text), date, today);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!task.title || busy) return;
    setBusy(true);
    try {
      await quickAdd(task);
      setText('');
    } catch {
      // The failure is reported as a toast; keep the text so it can be retried.
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && !text.trim() && close()}
      className="px-3 py-1.5"
    >
      <div className="flex items-center gap-3">
        {/* Previews the checkbox colour once a priority symbol is recognised. */}
        <span
          aria-hidden="true"
          title={task.priority ? `Priority ${task.priority}` : undefined}
          className={`size-4 shrink-0 rounded border-2 ${
            task.priority ? PRIORITY_BOX[task.priority] : 'border-dashed border-line-strong'
          }`}
        />
        <input
          autoFocus
          aria-label={`Task name for ${date}`}
          placeholder="Task name"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && close()}
          className="min-w-0 flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-faint"
        />
        <Link
          to="/help"
          aria-label="Quick-add symbols help"
          title="Symbols: !! priority, ** day, %% time, $$ repeat"
          className="rounded px-1.5 text-sm font-semibold text-faint hover:bg-raised hover:text-ink"
        >
          ?
        </Link>
        <button
          type="button"
          aria-label="Open the full task form"
          title="More options"
          onClick={() => {
            openEditor(undefined, task);
            close();
          }}
          className="rounded p-1 text-faint hover:bg-raised hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
      {/* What the symbols typed so far will set. */}
      <div className="pl-7" aria-live="polite">
        <DetailLine
          parts={[
            task.dueDate !== date && formatShortDate(task.dueDate),
            task.dueTime && formatTime12(task.dueTime),
            describeRecurrence(task.recurrence),
          ]}
        />
      </div>
    </form>
  );
}
