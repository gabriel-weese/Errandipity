import { describeRecurrence, formatTime12, type TaskDto } from '@errandipity/shared';
import { Fragment, type ReactNode } from 'react';
import { useApp } from './context';
import { QuickAdd } from './QuickAdd';

/** Checkbox outline colours by priority (1 = highest). */
export const PRIORITY_BOX: Record<number, string> = {
  1: 'border-red-500 bg-red-500/10 hover:bg-red-500/40',
  2: 'border-orange-500 bg-orange-500/10 hover:bg-orange-500/40',
  3: 'border-amber-400 bg-amber-400/10 hover:bg-amber-400/40',
  4: 'border-blue-500 bg-blue-500/10 hover:bg-blue-500/40',
  5: 'border-slate-400 bg-slate-400/10 hover:bg-slate-400/40',
};
const PRIORITY_FILLED: Record<number, string> = {
  1: 'border-red-500 bg-red-500',
  2: 'border-orange-500 bg-orange-500',
  3: 'border-amber-400 bg-amber-400',
  4: 'border-blue-500 bg-blue-500',
  5: 'border-slate-400 bg-slate-400',
};

export const cardClass = 'rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800';
export const rowClass =
  'flex flex-wrap items-start gap-3 border-b border-slate-100 px-3 py-2 last:border-b-0 dark:border-slate-700';
export const mutedClass = 'text-slate-500 dark:text-slate-400';

/** The completed counterpart of a task's checkbox: ticked and filled with its priority colour. */
export function CompletedBox({ priority }: { priority: number }) {
  return (
    <span
      role="img"
      aria-label={`Completed, priority ${priority}`}
      title={`Priority ${priority}`}
      className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border-2 text-white ${PRIORITY_FILLED[priority] ?? ''}`}
    >
      <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}

/** The line under a title: its parts separated by dots, or nothing when there are none. */
export function DetailLine({ parts }: { parts: (ReactNode | false | null | undefined)[] }) {
  const shown = parts.filter(Boolean);
  if (shown.length === 0) return null;
  return (
    <div className={`text-xs ${mutedClass}`}>
      {shown.map((part, index) => (
        <Fragment key={index}>
          {index > 0 && <span aria-hidden="true"> · </span>}
          {part}
        </Fragment>
      ))}
    </div>
  );
}

/** The first line of a task's notes, cut off with an ellipsis when there is more. */
export function NotesLine({ notes }: { notes: string }) {
  const text = notes.trim();
  if (!text) return null;
  const [firstLine = '', ...rest] = text.split(/\r?\n/);
  return (
    // `truncate` adds the ellipsis when the line is too wide; the explicit one covers further lines.
    <div className={`truncate text-xs ${mutedClass}`} title={text}>
      {firstLine}
      {rest.length > 0 && '…'}
    </div>
  );
}

interface TaskRowProps {
  task: TaskDto;
  /** Show the due date under the title (for lists that mix dates). */
  showDate?: boolean;
  /** Hide the time, the date and the reschedule controls. */
  hideSchedule?: boolean;
}

/** A pending task. The checkbox colour shows its priority; clicking the title opens the edit dialog. */
export function TaskRow({ task, showDate = false, hideSchedule = false }: TaskRowProps) {
  const { today, openEditor, complete, reschedule } = useApp();
  const overdue = task.dueDate < today;

  return (
    <li className={rowClass}>
      <input
        type="checkbox"
        aria-label={`Complete ${task.title}, priority ${task.priority}`}
        title={`Priority ${task.priority}`}
        checked={false}
        onChange={() => complete(task)}
        className={`mt-0.5 size-4 shrink-0 cursor-pointer appearance-none rounded border-2 ${PRIORITY_BOX[task.priority] ?? ''}`}
      />
      <button type="button" onClick={() => openEditor(task)} className="min-w-40 flex-1 text-left">
        <div className="text-sm font-medium hover:underline">{task.title}</div>
        <DetailLine
          parts={[
            showDate && !hideSchedule && `Due ${task.dueDate}`,
            !hideSchedule && task.dueTime && formatTime12(task.dueTime),
            describeRecurrence(task.recurrence),
            task.timesRescheduled > 0 && (
              <span className="text-amber-700 dark:text-amber-400">Rescheduled {task.timesRescheduled}×</span>
            ),
          ]}
        />
        <NotesLine notes={task.notes} />
      </button>
      {overdue && !hideSchedule && (
        <div className="flex items-center gap-2 self-center">
          <button
            type="button"
            onClick={() => reschedule([task.id], today)}
            className="rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700"
          >
            Move to today
          </button>
          <input
            type="date"
            aria-label={`Reschedule ${task.title}`}
            className="rounded border border-slate-300 bg-transparent px-1 py-0.5 text-xs dark:border-slate-600"
            min={today}
            value=""
            onChange={(e) => e.target.value && reschedule([task.id], e.target.value)}
          />
        </div>
      )}
    </li>
  );
}

interface TaskListProps extends Omit<TaskRowProps, 'task'> {
  tasks: TaskDto[];
  /** Adds a quick-add row at the bottom that creates tasks on this date. */
  addDate?: string;
}

export function TaskList({ tasks, addDate, ...rowProps }: TaskListProps) {
  return (
    <ul className={cardClass}>
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} {...rowProps} />
      ))}
      {addDate && (
        <li className="border-b border-slate-100 last:border-b-0 dark:border-slate-700">
          <QuickAdd date={addDate} />
        </li>
      )}
    </ul>
  );
}
