import { describeRecurrence, type TaskDto } from '@errandipity/shared';
import { useApp } from './context';
import { QuickAdd } from './QuickAdd';

const PRIORITY_STYLES: Record<number, string> = {
  1: 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200',
  2: 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200',
  3: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
  4: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200',
  5: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

export const cardClass = 'rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800';
export const rowClass =
  'flex flex-wrap items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-b-0 dark:border-slate-700';
export const mutedClass = 'text-slate-500 dark:text-slate-400';

export function PriorityBadge({ priority }: { priority: number }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[priority] ?? ''}`}>
      P{priority}
    </span>
  );
}

/** A pending task. Clicking the title opens the edit dialog. */
export function TaskRow({ task, showDate = false }: { task: TaskDto; showDate?: boolean }) {
  const { today, openEditor, complete, reschedule } = useApp();
  const recurrence = describeRecurrence(task.recurrence);
  const overdue = task.dueDate < today;

  return (
    <li className={rowClass}>
      <input
        type="checkbox"
        className="size-4"
        aria-label={`Complete ${task.title}`}
        checked={false}
        onChange={() => complete(task)}
      />
      {/* Stays in place when there is no time so titles line up. */}
      <span className={`w-12 text-sm tabular-nums ${mutedClass}`}>{task.dueTime}</span>
      <PriorityBadge priority={task.priority} />
      <button type="button" onClick={() => openEditor(task)} className="min-w-40 flex-1 text-left">
        <div className="text-sm font-medium hover:underline">{task.title}</div>
        <div className={`flex flex-wrap gap-x-3 text-xs ${mutedClass}`}>
          {showDate && <span>Due {task.dueDate}</span>}
          {recurrence && <span>{recurrence}</span>}
          {task.timesRescheduled > 0 && (
            <span className="text-amber-700 dark:text-amber-400">Rescheduled {task.timesRescheduled}×</span>
          )}
        </div>
      </button>
      {overdue && (
        <>
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
        </>
      )}
    </li>
  );
}

interface TaskListProps {
  tasks: TaskDto[];
  showDate?: boolean;
  /** Adds a quick-add row at the bottom that creates tasks on this date. */
  addDate?: string;
}

export function TaskList({ tasks, showDate, addDate }: TaskListProps) {
  return (
    <ul className={cardClass}>
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} showDate={showDate} />
      ))}
      {addDate && (
        <li className="border-b border-slate-100 last:border-b-0 dark:border-slate-700">
          <QuickAdd date={addDate} />
        </li>
      )}
    </ul>
  );
}
