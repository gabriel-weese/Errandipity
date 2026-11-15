import { describe, expect, it } from 'vitest';
import { createTaskSchema, isOverdue } from './schemas';
import { sortProjectTasks } from './sort';

const task = (title: string, priority: number, dueDate: string | null, dueTime: string | null = null) => ({
  title,
  priority,
  dueDate,
  dueTime,
});
const titles = (tasks: { title: string }[]) => tasks.map((t) => t.title);

describe('sortProjectTasks', () => {
  const tasks = [
    task('undated high', 1, null),
    task('late low', 5, '2026-12-01'),
    task('soon low', 5, '2026-11-20'),
    task('soon high, no time', 1, '2026-11-20'),
    task('soon high, 9am', 1, '2026-11-20', '09:00'),
    task('late high', 1, '2026-12-01'),
  ];

  it('orders by priority, then due date and time, with undated tasks last in their priority', () => {
    expect(titles(sortProjectTasks(tasks, 'priority'))).toEqual([
      'soon high, 9am',
      'soon high, no time',
      'late high',
      'undated high',
      'soon low',
      'late low',
    ]);
  });

  it('orders by due date and time, then priority, with undated tasks last', () => {
    expect(titles(sortProjectTasks(tasks, 'date'))).toEqual([
      'soon high, 9am',
      'soon high, no time',
      'soon low',
      'late high',
      'late low',
      'undated high',
    ]);
  });

  it('falls back to the title and leaves the input untouched', () => {
    const pair = [task('b', 3, null), task('a', 3, null)];
    expect(titles(sortProjectTasks(pair, 'date'))).toEqual(['a', 'b']);
    expect(titles(pair)).toEqual(['b', 'a']);
  });
});

describe('tasks without a date', () => {
  it('are never overdue', () => {
    expect(isOverdue({ dueDate: null }, '2026-11-14')).toBe(false);
    expect(isOverdue({ dueDate: '2026-11-13' }, '2026-11-14')).toBe(true);
    expect(isOverdue({ dueDate: '2026-11-14' }, '2026-11-14')).toBe(false);
  });

  it('cannot repeat', () => {
    expect(createTaskSchema.safeParse({ title: 'Read', dueDate: null }).success).toBe(true);
    expect(createTaskSchema.safeParse({ title: 'Read', dueDate: null, recurrence: { type: 'daily' } }).success).toBe(false);
    expect(createTaskSchema.safeParse({ title: 'Read', dueDate: '2026-11-14', recurrence: { type: 'daily' } }).success).toBe(true);
  });
});
