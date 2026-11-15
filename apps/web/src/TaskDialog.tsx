import { useEffect, useState, type FormEvent } from 'react';
import {
  DEFAULT_PRIORITY,
  NEEDS_DATE,
  PRIORITIES,
  priorityHint,
  type EditScope,
  type IsoDate,
  type Recurrence,
  type TaskDto,
} from '@errandipity/shared';
import { api } from './api';
import { useLabels, useProjects, type TaskDraft } from './context';
import { buildRecurrence, draftFromRule, RecurrenceFields, type RecurrenceDraft } from './RecurrenceFields';
import { accentButtonClass, fieldClass, hintClass, labelClass, LabelToggle } from './ui';

interface Props {
  /** The task being edited, or null to create a new one. */
  task: TaskDto | null;
  /** Starting values for a new task. */
  draft?: TaskDraft;
  today: IsoDate;
  onClose: () => void;
  /** Called after any successful save or delete. */
  onSaved: () => void;
}

/** The full form for creating a task, or for editing or deleting an existing one. */
export function TaskDialog({ task, draft, today, onClose, onSaved }: Props) {
  const labels = useLabels().data ?? [];
  const projects = useProjects().data ?? [];
  const isRecurring = task !== null && task.recurrence.type !== 'none';
  const initialRule: Recurrence = task?.recurrence ?? draft?.recurrence ?? { type: 'none' };

  const [title, setTitle] = useState(task?.title ?? draft?.title ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [priority, setPriority] = useState(task?.priority ?? draft?.priority ?? DEFAULT_PRIORITY);
  // An empty string is "no date". A new task starts on today unless the draft says otherwise.
  const [dueDate, setDueDate] = useState((task ? task.dueDate : draft?.dueDate === undefined ? today : draft.dueDate) ?? '');
  const [dueTime, setDueTime] = useState(task?.dueTime ?? draft?.dueTime ?? '');
  const [labelIds, setLabelIds] = useState(task?.labels.map((label) => label.id) ?? draft?.labelIds ?? []);
  const [projectId, setProjectId] = useState(task ? (task.project?.id ?? null) : (draft?.projectId ?? null));
  const [sectionId, setSectionId] = useState(task ? task.sectionId : (draft?.sectionId ?? null));
  const sections = projects.find((project) => project.id === projectId)?.sections ?? [];
  const [scope, setScope] = useState<EditScope>('occurrence');
  const [repeat, setRepeat] = useState(() => draftFromRule(initialRule));
  const changeRepeat = (changes: Partial<RecurrenceDraft>) => setRepeat((current) => ({ ...current, ...changes }));
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

  /** Runs a save or delete, then closes the dialog; a failure is shown and the dialog stays open. */
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
    const result = buildRecurrence(repeat);
    if ('error' in result) return setError(result.error);
    const recurrence = result.rule;
    // When the rule is locked the task keeps the one it has.
    const repeats = (recurrenceLocked ? task.recurrence : recurrence).type !== 'none';
    if (!dueDate && repeats) return setError(NEEDS_DATE);
    const fields = { title, notes, priority, dueDate: dueDate || null, dueTime: dueTime || null, labelIds, projectId, sectionId };
    if (!task) return run(() => api.create({ ...fields, recurrence }));
    return run(() =>
      api.update(task.id, effectiveScope, recurrenceLocked ? fields : { ...fields, recurrence }),
    );
  }

  // Only a move from one day to another counts.
  const dateChanged = task !== null && task.dueDate !== null && dueDate !== '' && dueDate !== task.dueDate;

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-overlay p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label={task ? 'Edit task' : 'New task'}
        onSubmit={handleSubmit}
        className="mt-16 w-full max-w-lg space-y-4 rounded-lg bg-surface p-5 shadow-xl"
      >
        <h2 className="text-lg font-semibold">{task ? 'Edit task' : 'New task'}</h2>

        {isRecurring && (
          <fieldset className="flex flex-wrap gap-4 rounded border border-line p-3 text-sm">
            <legend className="px-1 text-xs font-medium text-soft">Apply changes to</legend>
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

        <label className={labelClass}>
          Title
          <input className={fieldClass} value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
        </label>
        <label className={labelClass}>
          Notes
          <textarea className={fieldClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        <div className="flex flex-wrap gap-3">
          <label className={labelClass}>
            Date (optional)
            <input type="date" className={fieldClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <label className={labelClass}>
            Time (optional)
            <input type="time" className={fieldClass} value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
          </label>
          <label className={labelClass}>
            Priority
            <select className={fieldClass} value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                  {priorityHint(p)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {dateChanged && (
          <p className="text-xs text-warn">
            Changing the date counts as a reschedule{effectiveScope === 'series' && isRecurring ? ' and moves this task only' : ''}.
          </p>
        )}

        {projects.length > 0 && (
          <div className="flex flex-wrap gap-3">
            <label className={labelClass}>
              Project
              <select
                className={fieldClass}
                value={projectId ?? ''}
                onChange={(e) => {
                  setProjectId(e.target.value || null);
                  setSectionId(null);
                }}
              >
                <option value="">None</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            {sections.length > 0 && (
              <label className={labelClass}>
                Section
                <select className={fieldClass} value={sectionId ?? ''} onChange={(e) => setSectionId(e.target.value || null)}>
                  <option value="">No section</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
        {isRecurring && effectiveScope === 'occurrence' && (projectId !== (task.project?.id ?? null) || sectionId !== task.sectionId) && (
          <p className={hintClass}>The project and section apply to this and all future tasks.</p>
        )}

        <fieldset>
          <legend className="mb-1 text-xs font-medium text-soft">Labels</legend>
          {labels.length === 0 ? (
            <p className={hintClass}>Labels are created in Settings.</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {labels.map((label) => {
                const active = labelIds.includes(label.id);
                return (
                  <LabelToggle
                    key={label.id}
                    label={label}
                    active={active}
                    onToggle={() => setLabelIds(active ? labelIds.filter((id) => id !== label.id) : [...labelIds, label.id])}
                  />
                );
              })}
            </div>
          )}
        </fieldset>

        <RecurrenceFields draft={repeat} onChange={changeRepeat} locked={recurrenceLocked} />

        {error && <p className="text-sm text-danger">{error}</p>}

        {confirmingDelete && task ? (
          <div className="flex flex-wrap items-center gap-2 rounded border border-danger-line bg-danger-soft p-3 text-sm">
            <span className="flex-1 text-danger-ink">Delete this task?</span>
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
            <button type="button" onClick={() => setConfirmingDelete(false)} className="px-2 py-1 text-soft">
              Keep
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {task && (
              <button type="button" onClick={() => setConfirmingDelete(true)} className="text-sm text-danger hover:underline">
                Delete
              </button>
            )}
            <span className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="rounded px-3 py-1.5 text-sm text-soft hover:bg-raised"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className={`rounded px-3 py-1.5 text-sm disabled:opacity-50 ${accentButtonClass}`}
            >
              {task ? 'Save changes' : 'Add task'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
