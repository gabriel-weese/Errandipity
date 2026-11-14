import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { addDays, describeRecurrence, formatDayHeading, sortDayTasks, type TaskDto } from '@errandipity/shared';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useApp, useCompletedTasks, usePendingTasks } from './context';
import { cardClass, CompletedBox, DetailLine, mutedClass, NotesLine, rowClass, TaskList } from './TaskRow';

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h2 className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
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

/** Tasks whose day has passed, with one-click rescheduling. Renders nothing when there are none. */
function OverdueSection({ tasks }: { tasks: TaskDto[] }) {
  const { today, reschedule } = useApp();
  const overdue = tasks.filter((t) => t.dueDate < today);
  if (overdue.length === 0) return null;
  return (
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
  );
}

/** How many more days the Upcoming list gains each time the end comes near. */
const UPCOMING_PAGE_DAYS = 30;

/**
 * Every day from today onward, without end. Only the days near the viewport are
 * rendered; the list grows by a page whenever scrolling approaches its last day.
 */
export function UpcomingView() {
  const { today } = useApp();
  const query = usePendingTasks();
  const tasks = query.data ?? [];
  const [dayCount, setDayCount] = useState(UPCOMING_PAGE_DAYS);

  const byDate = useMemo(() => {
    const map = new Map<string, TaskDto[]>();
    for (const task of tasks) map.set(task.dueDate, [...(map.get(task.dueDate) ?? []), task]);
    return map;
  }, [tasks]);

  // The list starts below the header and the overdue section, whose height varies.
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  useLayoutEffect(() => {
    if (!listRef.current) return;
    const top = listRef.current.getBoundingClientRect().top + window.scrollY;
    setScrollMargin((current) => (Math.abs(current - top) < 1 ? current : top));
  });

  const virtualizer = useWindowVirtualizer({
    count: dayCount,
    estimateSize: () => 110,
    overscan: 5,
    scrollMargin,
  });
  const days = virtualizer.getVirtualItems();
  const lastVisible = days[days.length - 1]?.index ?? 0;
  useEffect(() => {
    if (lastVisible >= dayCount - 7) setDayCount((count) => count + UPCOMING_PAGE_DAYS);
  }, [lastVisible, dayCount]);

  return (
    <QueryState query={query}>
      <div className="space-y-6">
        <OverdueSection tasks={tasks} />
        <div ref={listRef} className="relative" style={{ height: virtualizer.getTotalSize() }}>
          {days.map((day) => {
            const date = addDays(today, day.index);
            return (
              <div
                key={date}
                data-index={day.index}
                ref={virtualizer.measureElement}
                className="absolute left-0 top-0 w-full pb-6"
                style={{ transform: `translateY(${day.start - scrollMargin}px)` }}
              >
                <Section title={formatDayHeading(date, today)}>
                  <TaskList tasks={sortDayTasks(byDate.get(date) ?? [])} addDate={date} />
                </Section>
              </div>
            );
          })}
        </div>
      </div>
    </QueryState>
  );
}

export function TodayView() {
  const { today } = useApp();
  const query = usePendingTasks();
  const tasks = query.data ?? [];

  return (
    <QueryState query={query}>
      <div className="space-y-6">
        <OverdueSection tasks={tasks} />
        <Section title={formatDayHeading(today, today)}>
          <TaskList tasks={sortDayTasks(tasks.filter((t) => t.dueDate === today))} addDate={today} />
        </Section>
      </div>
    </QueryState>
  );
}

const PRIORITY_HEADINGS: Record<number, string> = {
  1: 'Priority 1 (highest)',
  2: 'Priority 2',
  3: 'Priority 3',
  4: 'Priority 4',
  5: 'Priority 5 (lowest)',
};

/** Every pending task grouped by priority, with no dates shown. */
export function AllTasksView() {
  const query = usePendingTasks();
  const tasks = query.data ?? [];
  // Within a priority, soonest first, so the order is stable even though dates are hidden.
  const inGroupOrder = (a: TaskDto, b: TaskDto) =>
    a.dueDate.localeCompare(b.dueDate) ||
    (a.dueTime ?? '99').localeCompare(b.dueTime ?? '99') ||
    a.title.localeCompare(b.title);

  return (
    <QueryState query={query}>
      <div className="space-y-6">
        {tasks.length === 0 && <p className={`text-sm ${mutedClass}`}>No tasks yet.</p>}
        {[1, 2, 3, 4, 5].map((priority) => {
          const group = tasks.filter((t) => t.priority === priority).sort(inGroupOrder);
          if (group.length === 0) return null;
          return (
            <Section key={priority} title={PRIORITY_HEADINGS[priority] ?? `Priority ${priority}`}>
              <TaskList tasks={group} hideSchedule />
            </Section>
          );
        })}
      </div>
    </QueryState>
  );
}

function CompletedRow({ task }: { task: TaskDto }) {
  const { undoComplete } = useApp();
  return (
    <li className={rowClass}>
      <CompletedBox priority={task.priority} />
      <div className="min-w-40 flex-1">
        <div className={`text-sm font-medium line-through ${mutedClass}`}>{task.title}</div>
        <DetailLine
          parts={[
            task.completedAt &&
              `Completed ${new Date(task.completedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`,
            describeRecurrence(task.recurrence),
          ]}
        />
        <NotesLine notes={task.notes} />
      </div>
      <button
        type="button"
        onClick={() => undoComplete(task.id)}
        className="self-center rounded border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
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
