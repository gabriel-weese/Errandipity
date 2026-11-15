import { useWindowVirtualizer } from '@tanstack/react-virtual';
import {
  addDays,
  compareSchedule,
  describeRecurrence,
  formatDayHeading,
  isOverdue,
  PRIORITIES,
  priorityHint,
  sortDayTasks,
  type TaskDto,
} from '@errandipity/shared';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useApp, useCompletedTasks, usePendingTasks } from './context';
import { CompletedBox, DetailLine, LabelTags, NotesLine, TaskList } from './TaskRow';
import { cardClass, QueryState, rowClass } from './ui';

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h2 className="flex-1 text-sm font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Tasks whose day has passed, with one-click rescheduling. Renders nothing when there are none. */
export function OverdueSection({ tasks }: { tasks: TaskDto[] }) {
  const { today, reschedule } = useApp();
  const overdue = tasks.filter((t) => isOverdue(t, today));
  if (overdue.length === 0) return null;
  return (
    <Section
      title={`Overdue (${overdue.length})`}
      action={
        <button
          type="button"
          onClick={() => reschedule(overdue.map((t) => t.id), today)}
          className="text-sm font-medium text-accent-ink hover:underline"
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
/** A guess at one day's height in pixels; real heights are measured once rendered. */
const ESTIMATED_DAY_HEIGHT = 110;

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
    for (const task of tasks) {
      // Tasks without a date have no day to appear under.
      if (task.dueDate) map.set(task.dueDate, [...(map.get(task.dueDate) ?? []), task]);
    }
    return map;
  }, [tasks]);

  // The list starts below the header and the overdue section, whose height varies.
  // The effect runs after every render on purpose: anything above the list can change its offset.
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  useLayoutEffect(() => {
    if (!listRef.current) return;
    const top = listRef.current.getBoundingClientRect().top + window.scrollY;
    setScrollMargin((current) => (Math.abs(current - top) < 1 ? current : top));
  });

  const virtualizer = useWindowVirtualizer({
    count: dayCount,
    estimateSize: () => ESTIMATED_DAY_HEIGHT,
    overscan: 5,
    scrollMargin,
  });
  const days = virtualizer.getVirtualItems();
  const lastVisible = days[days.length - 1]?.index ?? 0;
  // Load another page when the last rendered day is within a week of the end.
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

/** Every pending task grouped by priority, with no dates shown. The only view that lists a task with no date and no project. */
export function AllTasksView() {
  const query = usePendingTasks();
  const tasks = query.data ?? [];
  // Within a priority, soonest first and tasks without a date last, so the order is
  // stable even though dates are hidden.
  const inGroupOrder = (a: TaskDto, b: TaskDto) => compareSchedule(a, b) || a.title.localeCompare(b.title);

  return (
    <QueryState query={query}>
      <div className="space-y-6">
        {tasks.length === 0 && <p className="text-sm text-muted">No tasks yet.</p>}
        {PRIORITIES.map((priority) => {
          const group = tasks.filter((t) => t.priority === priority).sort(inGroupOrder);
          if (group.length === 0) return null;
          return (
            <Section key={priority} title={`Priority ${priority}${priorityHint(priority)}`}>
              <TaskList tasks={group} hideSchedule />
            </Section>
          );
        })}
      </div>
    </QueryState>
  );
}

/** A completed task, with a button that makes it pending again. */
export function CompletedRow({ task }: { task: TaskDto }) {
  const { undoComplete } = useApp();
  return (
    <li className={rowClass}>
      <CompletedBox priority={task.priority} />
      <div className="min-w-40 flex-1">
        <div className="text-sm font-medium text-muted line-through">{task.title}</div>
        <DetailLine
          parts={[
            task.completedAt &&
              `Completed ${new Date(task.completedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`,
            describeRecurrence(task.recurrence),
            task.labels.length > 0 && <LabelTags labels={task.labels} />,
          ]}
        />
        <NotesLine notes={task.notes} />
      </div>
      <button
        type="button"
        onClick={() => undoComplete(task.id)}
        className="self-center rounded border border-line-strong px-2 py-1 text-xs font-medium hover:bg-raised"
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
        <p className="text-sm text-muted">Nothing completed yet.</p>
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
