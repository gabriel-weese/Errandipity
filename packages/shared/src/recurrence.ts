import { addDays, dayOfMonth, dayOfWeek, daysInMonth, WEEKDAYS_SHORT, type IsoDate } from './dates';
import type { MonthlyAnchor, Recurrence } from './schemas';

/**
 * The due date of the task that replaces one that was just completed (or skipped),
 * or null if the task does not recur.
 *
 * - interval: counted from the completion date.
 * - daily / weekly / monthly: the first matching day after both the completion date and
 *   the task's own due date, so finishing early never re-creates the same day
 *   and finishing late never creates a task that is already overdue.
 */
export function nextDueDate(
  rule: Recurrence,
  current: { dueDate: IsoDate; completedOn: IsoDate },
): IsoDate | null {
  if (rule.type === 'none') return null;
  if (rule.type === 'interval') return addDays(current.completedOn, rule.intervalDays);

  const base = current.dueDate > current.completedOn ? current.dueDate : current.completedOn;

  if (rule.type === 'daily') return addDays(base, 1);

  if (rule.type === 'weekly') {
    for (let i = 1; i <= 7; i++) {
      const candidate = addDays(base, i);
      if (rule.daysOfWeek.includes(dayOfWeek(candidate))) return candidate;
    }
    return null;
  }

  // Monthly: the earliest upcoming day that matches any specific day or anchor.
  // 62 days always covers two whole months, so every day-of-month and anchor comes up at least once.
  for (let i = 1; i <= 62; i++) {
    const candidate = addDays(base, i);
    const lastDay = daysInMonth(candidate);
    const day = dayOfMonth(candidate);
    // A requested day past the end of the month falls on its last day.
    if (rule.daysOfMonth.some((d) => Math.min(d, lastDay) === day)) return candidate;
    if (rule.anchors.some((anchor) => anchorDay(anchor, lastDay) === day)) return candidate;
  }
  return null;
}

/** The middle of a month is half its length, rounded up: 14, 15, 15, 16 for 28-31 days. */
export function anchorDay(anchor: MonthlyAnchor, lastDay: number): number {
  switch (anchor) {
    case 'first':
      return 1;
    case 'middle':
      return Math.ceil(lastDay / 2);
    case 'last':
      return lastDay;
  }
}

const ANCHOR_ORDER: MonthlyAnchor[] = ['first', 'middle', 'last'];

/** A short label for a rule, such as "Weekly: Mon, Wed", or null if the task does not repeat. */
export function describeRecurrence(rule: Recurrence): string | null {
  switch (rule.type) {
    case 'none':
      return null;
    case 'weekly':
      // Default (string) sort is safe here: the values are single digits 0-6.
      return `Weekly: ${[...rule.daysOfWeek].sort().map((d) => WEEKDAYS_SHORT[d]).join(', ')}`;
    case 'daily':
      return 'Daily';
    case 'monthly': {
      const parts: string[] = ANCHOR_ORDER.filter((a) => rule.anchors.includes(a));
      if (rule.daysOfMonth.length) parts.push(`day ${[...rule.daysOfMonth].sort((a, b) => a - b).join(', ')}`);
      return `Monthly: ${parts.join(', ')}`;
    }
    case 'interval':
      return rule.intervalDays === 1 ? 'Every day' : `Every ${rule.intervalDays} days`;
  }
}
