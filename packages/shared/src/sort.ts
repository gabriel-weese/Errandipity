import type { IsoDate } from './dates';
import type { ProjectSort } from './schemas';

interface Sortable {
  title: string;
  priority: number;
  dueTime: string | null;
}

/**
 * Order for a single day's list: tasks with a time first, chronologically;
 * then tasks without a time, by priority (1 = highest).
 */
export function sortDayTasks<T extends Sortable>(tasks: readonly T[]): T[] {
  return [...tasks].sort((a, b) => {
    if (a.dueTime !== null && b.dueTime !== null) {
      return (
        a.dueTime.localeCompare(b.dueTime) || a.priority - b.priority || a.title.localeCompare(b.title)
      );
    }
    if (a.dueTime !== null) return -1;
    if (b.dueTime !== null) return 1;
    return a.priority - b.priority || a.title.localeCompare(b.title);
  });
}

interface Scheduled {
  dueDate: IsoDate | null;
  dueTime: string | null;
}

/** Soonest first; tasks without a date, and then without a time, come last. */
export function compareSchedule(a: Scheduled, b: Scheduled): number {
  // '9' sorts after any real date or time.
  return (a.dueDate ?? '9').localeCompare(b.dueDate ?? '9') || (a.dueTime ?? '9').localeCompare(b.dueTime ?? '9');
}

/**
 * Order for a project's task lists, which mix days and tasks without a date:
 * "priority" is priority, then due date and time; "date" is the reverse.
 */
export function sortProjectTasks<T extends Sortable & Scheduled>(tasks: readonly T[], order: ProjectSort): T[] {
  return [...tasks].sort((a, b) => {
    const byPriority = a.priority - b.priority;
    const bySchedule = compareSchedule(a, b);
    return (order === 'priority' ? byPriority || bySchedule : bySchedule || byPriority) || a.title.localeCompare(b.title);
  });
}
