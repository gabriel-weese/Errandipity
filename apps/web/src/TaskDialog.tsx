import { useEffect, useState, type FormEvent } from 'react';
import type { EditScope, MonthlyAnchor, Recurrence, TaskDto } from '@errandipity/shared';
import { api } from './api';
import type { TaskDraft } from './context';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ANCHORS: { value: MonthlyAnchor; label: string }[] = [
  { value: 'first', label: 'First' },
  { value: 'middle', label: 'Middle' },
  { value: 'last', label: 'Last' },
];

const field =
  'rounded border border-slate-300 bg-white px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-400 ' +
  'dark:border-slate-600 dark:bg-slate-900 dark:disabled:bg-slate-800 dark:disabled:text-slate-500';
const label = 'flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300';
const hint = 'text-xs text-slate-500 dark:text-slate-400';
const toggle = (active: boolean) =>
  `rounded px-2 py-1 text-sm disabled:opacity-50 ${
    active ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700'
  }`;

interface Props {
  /** The task being edited, or null to create a new one. */
  task: TaskDto | null;
  /** Starting values for a new task. */
  draft?: TaskDraft;
  today: string;
  onClose: () => void;
  /** Called after any successful save or delete. */
  onSaved: () => void;
}

export function TaskDialog({ task, draft, today, onClose, onSaved }: Props) {
  const initial: Recurrence = task?.recurrence ?? draft?.recurrence ?? { type: 'none' };
  const isRecurring = task !== null && task.recurrence.type !== 'none';
  const initialAnchors = initial.type === 'monthly' ? initial.anchors : [];

  const [title, setTitle] = useState(task?.title ?? draft?.title ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [priority, setPriority] = useState(task?.priority ?? draft?.priority ?? 3);
  const [dueDate, setDueDate] = useState(task?.dueDate ?? draft?.dueDate ?? today);
  const [dueTime, setDueTime] = useState(task?.dueTime ?? draft?.dueTime ?? '');
  const [scope, setScope] = useState<EditScope>('occurrence');
  const [type, setType] = useState<Recurrence['type']>(initial.type);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(initial.type === 'weekly' ? initial.daysOfWeek : []);
  const [monthlyMode, setMonthlyMode] = useState<'days' | 'anchors'>(initialAnchors.length ? 'anchors' : 'days');
  const [daysOfMonth, setDaysOfMonth] = useState(
    initial.type === 'monthly' && initial.daysOfMonth.length ? initial.daysOfMonth.join(', ') : '1',
  );
  const [anchors, setAnchors] = useState<MonthlyAnchor[]>(initialAnchors);
  const [intervalDays, setIntervalDays] = useState(initial.type === 'interval' ? initial.intervalDays : 2);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A one-off task has nothing but its series, so edits always apply to it.
  const effectiveScope: EditScope = isRecurring ? scope : 'series';
  const recurrenceLocked = task !== null && effectiveScope === 'occurrence';

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function buildRecurrence(): Recurrence | string {
    switch (type) {
      case 'none':
      case 'daily':
        return { type };
      case 'weekly':
        return daysOfWeek.length ? { type, daysOfWeek } : 'Pick at least one weekday.';
      case 'monthly': {
        if (monthlyMode === 'anchors') {
          return anchors.length
            ? { type, daysOfMonth: [], anchors }
            : 'Pick at least one of First, Middle or Last.';
        }
        const days = daysOfMonth
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isInteger(n) && n >= 1 && n <= 31);
        return days.length ? { type, daysOfMonth: days, anchors: [] } : 'Enter days of the month, e.g. 1, 15.';
      }
      case 'interval':
        return intervalDays >= 1 ? { type, intervalDays } : 'Interval must be at least 1 day.';
    }
  }

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const recurrence = buildRecurrence();
    if (typeof recurrence === 'string') return setError(recurrence);
    const fields = { title, notes, priority, dueDate, dueTime: dueTime || null };
    if (!task) return run(() => api.create({ ...fields, recurrence }));
    return run(() =>
      api.update(task.id, effectiveScope, recurrenceLocked ? fields : { ...fields, recurrence }),
    );
  }

  const dateChanged = task !== null && dueDate !== task.dueDate;

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 dark:bg-black/60"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label={task ? 'Edit task' : 'New task'}
        onSubmit={handleSubmit}
        className="mt-16 w-full max-w-lg space-y-4 rounded-lg bg-white p-5 shadow-xl dark:bg-slate-800 dark:ring-1 dark:ring-slate-600"
      >
        <h2 className="text-lg font-semibold">{task ? 'Edit task' : 'New task'}</h2>

        {isRecurring && (
          <fieldset className="flex flex-wrap gap-4 rounded border border-slate-200 p-3 text-sm dark:border-slate-600">
            <legend className="px-1 text-xs font-medium text-slate-600 dark:text-slate-300">Apply changes to</legend>
            <label className="flex items-center gap-2">
              <input type="radio" name="scope" checked={scope === 'occurrence'} onChange={() => setScope('occurrence')} />
              This task only
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="scope" checked={scope === 'series'} onChange={() => setScope('series')} />
              This and all future tasks
            </label>
          </fieldset>
        )}

        <label className={label}>
          Title
          <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
        </label>
        <label className={label}>
          Notes
          <textarea className={field} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        <div className="flex flex-wrap gap-3">
          <label className={label}>
            Date
            <input type="date" className={field} value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </label>
          <label className={label}>
            Time (optional)
            <input type="time" className={field} value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
          </label>
          <label className={label}>
            Priority
            <select className={field} value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((p) => (
                <option key={p} value={p}>
                  {p}
                  {p === 1 ? ' (highest)' : p === 5 ? ' (lowest)' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
        {dateChanged && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Changing the date counts as a reschedule{effectiveScope === 'series' && isRecurring ? ' and moves this task only' : ''}.
          </p>
        )}

        <div className="space-y-2">
          <div className="flex flex-wrap gap-3">
            <label className={label}>
              Repeat
              <select
                className={field}
                value={type}
                disabled={recurrenceLocked}
                onChange={(e) => setType(e.target.value as Recurrence['type'])}
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="interval">Every X days</option>
              </select>
            </label>
            {type === 'monthly' && (
              <label className={label}>
                On
                <select
                  className={field}
                  value={monthlyMode}
                  disabled={recurrenceLocked}
                  onChange={(e) => setMonthlyMode(e.target.value as 'days' | 'anchors')}
                >
                  <option value="days">Specific day(s)</option>
                  <option value="anchors">First, middle or last</option>
                </select>
              </label>
            )}
          </div>
          {recurrenceLocked && (
            <p className={hint}>Choose "This and all future tasks" to change how this task repeats.</p>
          )}
          {type === 'weekly' && (
            <div className="flex flex-wrap gap-1">
              {WEEKDAYS.map((name, day) => {
                const active = daysOfWeek.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={recurrenceLocked}
                    aria-pressed={active}
                    onClick={() => setDaysOfWeek(active ? daysOfWeek.filter((d) => d !== day) : [...daysOfWeek, day])}
                    className={toggle(active)}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          )}
          {type === 'monthly' && monthlyMode === 'days' && (
            <label className="flex items-center gap-2 text-sm">
              Day(s) of the month
              <input
                className={field}
                disabled={recurrenceLocked}
                value={daysOfMonth}
                onChange={(e) => setDaysOfMonth(e.target.value)}
                placeholder="1, 15"
              />
            </label>
          )}
          {type === 'monthly' && monthlyMode === 'anchors' && (
            <div className="space-y-1">
              <div className="flex flex-wrap gap-1">
                {ANCHORS.map(({ value, label: name }) => {
                  const active = anchors.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={recurrenceLocked}
                      aria-pressed={active}
                      onClick={() => setAnchors(active ? anchors.filter((a) => a !== value) : [...anchors, value])}
                      className={toggle(active)}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
              <p className={hint}>Pick one or more. Middle is the 14th to 16th, depending on the month's length.</p>
            </div>
          )}
          {type === 'interval' && (
            <label className="flex items-center gap-2 text-sm">
              Every
              <input
                type="number"
                min={1}
                disabled={recurrenceLocked}
                className={`${field} w-20`}
                value={intervalDays}
                onChange={(e) => setIntervalDays(Number(e.target.value))}
              />
              days after it is completed
            </label>
          )}
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {confirmingDelete && task ? (
          <div className="flex flex-wrap items-center gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm dark:border-red-800 dark:bg-red-950">
            <span className="flex-1 text-red-800 dark:text-red-200">Delete this task?</span>
            {isRecurring && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => api.remove(task.id, 'occurrence'))}
                className="rounded bg-red-600 px-2 py-1 font-medium text-white hover:bg-red-700"
              >
                This task only
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => api.remove(task.id, 'series'))}
              className="rounded bg-red-600 px-2 py-1 font-medium text-white hover:bg-red-700"
            >
              {isRecurring ? 'This and all future tasks' : 'Delete'}
            </button>
            <button type="button" onClick={() => setConfirmingDelete(false)} className="px-2 py-1 text-slate-600 dark:text-slate-300">
              Keep
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {task && (
              <button type="button" onClick={() => setConfirmingDelete(true)} className="text-sm text-red-600 hover:underline dark:text-red-400">
                Delete
              </button>
            )}
            <span className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="rounded px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {task ? 'Save changes' : 'Add task'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
