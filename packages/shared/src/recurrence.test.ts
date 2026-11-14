import { describe, expect, it } from 'vitest';
import { formatDayHeading, formatUsDate } from './dates';
import { nextDueDate } from './recurrence';
import { recurrenceSchema, type Recurrence } from './schemas';
import { sortDayTasks } from './sort';

describe('nextDueDate', () => {
  it('returns null for non-recurring tasks', () => {
    expect(nextDueDate({ type: 'none' }, { dueDate: '2026-11-14', completedOn: '2026-11-14' })).toBeNull();
  });

  it('counts interval tasks from the completion date, not the due date', () => {
    const rule: Recurrence = { type: 'interval', intervalDays: 3 };
    expect(nextDueDate(rule, { dueDate: '2026-11-10', completedOn: '2026-11-14' })).toBe('2026-11-17');
    expect(nextDueDate(rule, { dueDate: '2026-11-20', completedOn: '2026-11-14' })).toBe('2026-11-17');
  });

  it('finds the next matching weekday', () => {
    // 2026-11-14 is a Saturday. Mon = 1, Thu = 4.
    const rule: Recurrence = { type: 'weekly', daysOfWeek: [1, 4] };
    expect(nextDueDate(rule, { dueDate: '2026-11-14', completedOn: '2026-11-14' })).toBe('2026-11-16');
    expect(nextDueDate(rule, { dueDate: '2026-11-16', completedOn: '2026-11-16' })).toBe('2026-11-19');
  });

  it('skips missed weekly occurrences when completed late', () => {
    const rule: Recurrence = { type: 'weekly', daysOfWeek: [1] };
    expect(nextDueDate(rule, { dueDate: '2026-11-02', completedOn: '2026-11-14' })).toBe('2026-11-16');
  });

  it('does not repeat the same day when completed early', () => {
    const rule: Recurrence = { type: 'weekly', daysOfWeek: [1] };
    expect(nextDueDate(rule, { dueDate: '2026-11-16', completedOn: '2026-11-14' })).toBe('2026-11-23');
  });

  it('finds the next matching day of the month', () => {
    const rule: Recurrence = { type: 'monthly', daysOfMonth: [1, 15], anchors: [] };
    expect(nextDueDate(rule, { dueDate: '2026-11-14', completedOn: '2026-11-14' })).toBe('2026-11-15');
    expect(nextDueDate(rule, { dueDate: '2026-11-15', completedOn: '2026-11-15' })).toBe('2026-12-01');
  });

  it('uses the last day of a short month', () => {
    const rule: Recurrence = { type: 'monthly', daysOfMonth: [31], anchors: [] };
    expect(nextDueDate(rule, { dueDate: '2027-01-31', completedOn: '2027-01-31' })).toBe('2027-02-28');
    expect(nextDueDate(rule, { dueDate: '2028-01-31', completedOn: '2028-01-31' })).toBe('2028-02-29');
    expect(nextDueDate(rule, { dueDate: '2026-11-30', completedOn: '2026-11-30' })).toBe('2026-12-31');
  });

  it('moves a daily task to the next calendar day', () => {
    const rule: Recurrence = { type: 'daily' };
    expect(nextDueDate(rule, { dueDate: '2026-11-14', completedOn: '2026-11-14' })).toBe('2026-11-15');
    // Late: missed days are skipped. Early: the due day is not repeated.
    expect(nextDueDate(rule, { dueDate: '2026-11-10', completedOn: '2026-11-14' })).toBe('2026-11-15');
    expect(nextDueDate(rule, { dueDate: '2026-11-15', completedOn: '2026-11-14' })).toBe('2026-11-16');
  });

  it('takes whichever monthly anchor comes next', () => {
    const rule: Recurrence = { type: 'monthly', daysOfMonth: [], anchors: ['first', 'last'] };
    expect(nextDueDate(rule, { dueDate: '2026-11-14', completedOn: '2026-11-14' })).toBe('2026-11-30');
    expect(nextDueDate(rule, { dueDate: '2026-11-30', completedOn: '2026-11-30' })).toBe('2026-12-01');
    expect(nextDueDate(rule, { dueDate: '2026-12-01', completedOn: '2026-12-01' })).toBe('2026-12-31');
  });

  it('puts the middle of the month at half its length, rounded up', () => {
    const rule: Recurrence = { type: 'monthly', daysOfMonth: [], anchors: ['middle'] };
    const next = (from: string) => nextDueDate(rule, { dueDate: from, completedOn: from });
    expect(next('2027-02-01')).toBe('2027-02-14'); // 28 days
    expect(next('2028-02-01')).toBe('2028-02-15'); // 29 days
    expect(next('2026-11-01')).toBe('2026-11-15'); // 30 days
    expect(next('2026-12-01')).toBe('2026-12-16'); // 31 days
    expect(next('2026-11-15')).toBe('2026-12-16');
  });

  it('combines specific days with anchors', () => {
    const rule: Recurrence = { type: 'monthly', daysOfMonth: [10], anchors: ['last'] };
    expect(nextDueDate(rule, { dueDate: '2026-11-14', completedOn: '2026-11-14' })).toBe('2026-11-30');
    expect(nextDueDate(rule, { dueDate: '2026-11-30', completedOn: '2026-11-30' })).toBe('2026-12-10');
  });

  it('rejects a monthly rule with no days', () => {
    expect(recurrenceSchema.safeParse({ type: 'monthly' }).success).toBe(false);
    expect(recurrenceSchema.safeParse({ type: 'monthly', anchors: ['first'] }).success).toBe(true);
  });
});

describe('date formatting', () => {
  it('labels today and tomorrow and omits the label for other days', () => {
    expect(formatDayHeading('2026-11-14', '2026-11-14')).toBe('November 14 - Today - Saturday');
    expect(formatDayHeading('2026-11-15', '2026-11-14')).toBe('November 15 - Tomorrow - Sunday');
    expect(formatDayHeading('2026-11-20', '2026-11-14')).toBe('November 20 - Friday');
    expect(formatDayHeading('2026-11-10', '2026-11-14')).toBe('November 10 - Tuesday');
  });

  it('adds the year when it differs from the current year', () => {
    expect(formatDayHeading('2027-01-03', '2026-11-14')).toBe('January 3, 2027 - Sunday');
  });

  it('formats US dates', () => {
    expect(formatUsDate('2026-11-17')).toBe('11/17/2026');
  });
});

describe('sortDayTasks', () => {
  it('lists timed tasks chronologically, then untimed tasks by priority', () => {
    const sorted = sortDayTasks([
      { title: 'untimed low', priority: 5, dueTime: null },
      { title: 'afternoon', priority: 5, dueTime: '15:00' },
      { title: 'untimed high', priority: 1, dueTime: null },
      { title: 'morning', priority: 3, dueTime: '08:30' },
    ]);
    expect(sorted.map((t) => t.title)).toEqual(['morning', 'afternoon', 'untimed high', 'untimed low']);
  });
});
