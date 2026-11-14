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
