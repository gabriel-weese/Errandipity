import { describeRecurrence, formatDayHeading, sortDayTasks, type TaskDto } from '@errandipity/shared';
import type { ReactNode } from 'react';
import { useApp, useCompletedTasks, usePendingTasks } from './context';
import { cardClass, mutedClass, PriorityBadge, rowClass, TaskList } from './TaskRow';

function Section({ title, badge, action, children }: { title: string; badge?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
        {badge && (
          <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-900/60 dark:text-red-200">
            {badge}
          </span>
        )}
        <span className="flex-1" />
        {action}
      </div>
      {children}
    </section>
  );
}

export function QueryState({ query, children }: { query: { isPending: boolean; error: Error | null }; children: ReactNode }) {
  if (query.isPending) return <p className={`text-sm ${mutedClass}`}>Loading…</p>;
  if (query.error) {
    return (
      <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
        Could not load: {query.error.message}
      </p>
    );
  }
  return <>{children}</>;
}

export function TodayView() {
  const { today, reschedule } = useApp();
  const query = usePendingTasks();
  const tasks = query.data ?? [];
  const overdue = tasks.filter((t) => t.dueDate < today);
  const dueToday = sortDayTasks(tasks.filter((t) => t.dueDate === today));

  return (
    <QueryState query={query}>
      <div className="space-y-6">
        {overdue.length > 0 && (
          <Section
            title={`Overdue (${overdue.length})`}
            action={
              <button
                type="button"
                onClick={() => reschedule(overdue.map((t) => t.id), today)}
                className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Move all to today
              </button>
            }
          >
            <TaskList tasks={overdue} showDate />
          </Section>
        )}
        <Section title={formatDayHeading(today, today)}>
          {dueToday.length === 0 && <p className={`mb-2 text-sm ${mutedClass}`}>Nothing due today.</p>}
          <TaskList tasks={dueToday} addDate={today} />
        </Section>
      </div>
    </QueryState>
  );
}

export function AllTasksView() {
  const { today } = useApp();
  const query = usePendingTasks();
  const tasks = query.data ?? [];
  // Today is always listed so there is somewhere to add a task.
  const dates = [...new Set([today, ...tasks.map((t) => t.dueDate)])].sort();

  return (
    <QueryState query={query}>
      <div className="space-y-6">
        {dates.map((date) => (
          <Section key={date} title={formatDayHeading(date, today)} badge={date < today ? 'Overdue' : undefined}>
            <TaskList
              tasks={sortDayTasks(tasks.filter((t) => t.dueDate === date))}
              addDate={date >= today ? date : undefined}
            />
          </Section>
        ))}
      </div>
    </QueryState>
  );
}

function CompletedRow({ task }: { task: TaskDto }) {
  const { undoComplete } = useApp();
  const recurrence = describeRecurrence(task.recurrence);
  return (
    <li className={rowClass}>
      <PriorityBadge priority={task.priority} />
      <div className="min-w-40 flex-1">
        <div className={`text-sm font-medium line-through ${mutedClass}`}>{task.title}</div>
        <div className={`flex flex-wrap gap-x-3 text-xs ${mutedClass}`}>
          {task.completedAt && <span>Completed {new Date(task.completedAt).toLocaleString()}</span>}
          {recurrence && <span>{recurrence}</span>}
        </div>
      </div>
      <button
        type="button"
        onClick={() => undoComplete(task.id)}
        className="rounded border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
      >
        Undo
      </button>
    </li>
  );
}

export function CompletedView() {
  const query = useCompletedTasks();
  const tasks = query.data ?? [];
  return (
    <QueryState query={query}>
      {tasks.length === 0 ? (
        <p className={`text-sm ${mutedClass}`}>Nothing completed yet.</p>
      ) : (
        <ul className={cardClass}>
          {tasks.map((task) => (
            <CompletedRow key={task.id} task={task} />
          ))}
        </ul>
      )}
    </QueryState>
  );
}
