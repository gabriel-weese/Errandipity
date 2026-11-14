import { describe, expect, it } from 'vitest';
import { parseQuickAdd, resolveQuickAdd } from './quickAdd';

describe('parseQuickAdd: priority', () => {
  it('reads !! followed by 1-5 as the priority', () => {
    expect(parseQuickAdd('Test task !!1')).toEqual({ title: 'Test task', priority: 1 });
    expect(parseQuickAdd('Test task !!5')).toEqual({ title: 'Test task', priority: 5 });
  });

  it('keeps !! without a number in the title', () => {
    expect(parseQuickAdd('Test Task !!')).toEqual({ title: 'Test Task !!' });
  });

  it('keeps out-of-range or malformed values in the title', () => {
    expect(parseQuickAdd('Pay rent !!7')).toEqual({ title: 'Pay rent !!7' });
    expect(parseQuickAdd('Pay rent !!0')).toEqual({ title: 'Pay rent !!0' });
    expect(parseQuickAdd('Pay rent !!12')).toEqual({ title: 'Pay rent !!12' });
    expect(parseQuickAdd('Pay rent !!1a')).toEqual({ title: 'Pay rent !!1a' });
    expect(parseQuickAdd('Wow!!1')).toEqual({ title: 'Wow!!1' });
  });

  it('accepts the symbol anywhere in the text', () => {
    expect(parseQuickAdd('!!2 Call the bank')).toEqual({ title: 'Call the bank', priority: 2 });
    expect(parseQuickAdd('Call !!2 the bank')).toEqual({ title: 'Call the bank', priority: 2 });
  });

  it('uses the last priority when several are given', () => {
    expect(parseQuickAdd('Task !!1 !!4')).toEqual({ title: 'Task', priority: 4 });
  });

  it('returns an empty title when only a symbol is typed', () => {
    expect(parseQuickAdd('  !!1 ')).toEqual({ title: '', priority: 1 });
    expect(parseQuickAdd('   ')).toEqual({ title: '' });
  });
});

describe('parseQuickAdd: day', () => {
  it('reads weekday names and abbreviations in any case', () => {
    expect(parseQuickAdd('Dentist **Thu').date).toEqual({ weekday: 4 });
    expect(parseQuickAdd('Dentist **thursday').date).toEqual({ weekday: 4 });
    expect(parseQuickAdd('Dentist **THURS').date).toEqual({ weekday: 4 });
    expect(parseQuickAdd('Dentist **sun').date).toEqual({ weekday: 0 });
    expect(parseQuickAdd('Dentist **Tues').title).toBe('Dentist');
  });

  it('reads today and tomorrow', () => {
    expect(parseQuickAdd('Call **Today').date).toEqual({ daysFromToday: 0 });
    expect(parseQuickAdd('Call **TOMORROW').date).toEqual({ daysFromToday: 1 });
  });

  it('keeps anything else in the title', () => {
    expect(parseQuickAdd('Read **bold** text')).toEqual({ title: 'Read **bold** text' });
    expect(parseQuickAdd('Note **Funday')).toEqual({ title: 'Note **Funday' });
    expect(parseQuickAdd('Stars **')).toEqual({ title: 'Stars **' });
  });
});

describe('parseQuickAdd: time', () => {
  const time = (text: string) => parseQuickAdd(`Task ${text}`).dueTime;

  it('reads a bare hour or hour:minute on the 24-hour clock', () => {
    expect(time('%%9')).toBe('09:00');
    expect(time('%%9:00')).toBe('09:00');
    expect(time('%%3')).toBe('03:00');
    expect(time('%%15')).toBe('15:00');
    expect(time('%%21:30')).toBe('21:30');
    expect(time('%%0')).toBe('00:00');
    expect(time('%%12')).toBe('12:00');
  });

  it('reads AM and PM in their common spellings', () => {
    for (const form of ['%%9AM', '%%9am', '%%9A.M', '%%9a.m.', '%%9a', '%%9A', '%%9:00AM']) {
      expect(time(form)).toBe('09:00');
    }
    for (const form of ['%%9PM', '%%9p.m.', '%%9p', '%%9:00pm']) {
      expect(time(form)).toBe('21:00');
    }
    expect(time('%%9:30PM')).toBe('21:30');
    expect(time('%%12AM')).toBe('00:00');
    expect(time('%%12PM')).toBe('12:00');
  });

  it('keeps invalid times in the title', () => {
    for (const form of ['%%25', '%%24', '%%9:75', '%%13PM', '%%0AM', '%%9:5', '%%', '%%nine', '%%9x']) {
      expect(parseQuickAdd(`Task ${form}`)).toEqual({ title: `Task ${form}` });
    }
  });
});

describe('parseQuickAdd: repeat', () => {
  it('reads daily and weekly', () => {
    expect(parseQuickAdd('Vitamins $$Daily')).toEqual({ title: 'Vitamins', repeat: { type: 'daily' } });
    expect(parseQuickAdd('Review $$weekly')).toEqual({ title: 'Review', repeat: { type: 'weekly' } });
  });

  it('reads day letters, where H is Thursday and U is Sunday', () => {
    expect(parseQuickAdd('Gym $$Weekly:MWF').repeat).toEqual({ type: 'weekly', daysOfWeek: [1, 3, 5] });
    expect(parseQuickAdd('All $$Weekly:MTWHFSU').repeat).toEqual({ type: 'weekly', daysOfWeek: [0, 1, 2, 3, 4, 5, 6] });
    expect(parseQuickAdd('Rest $$weekly:us').repeat).toEqual({ type: 'weekly', daysOfWeek: [0, 6] });
    expect(parseQuickAdd('Odd $$Weekly:HHM').repeat).toEqual({ type: 'weekly', daysOfWeek: [1, 4] });
  });

  it('keeps invalid repeat words in the title', () => {
    for (const form of ['$$Weekly:MXF', '$$Weekly:', '$$Monthly', '$$', '$$20']) {
      expect(parseQuickAdd(`Task ${form}`)).toEqual({ title: `Task ${form}` });
    }
  });
});

describe('resolveQuickAdd', () => {
  // 2026-11-14 is a Saturday.
  const today = '2026-11-14';
  const resolve = (text: string, rowDate = today) => resolveQuickAdd(parseQuickAdd(text), rowDate, today);

  it('uses the row date and defaults when there are no symbols', () => {
    expect(resolve('Plain task', '2026-11-20')).toEqual({
      title: 'Plain task',
      dueDate: '2026-11-20',
      dueTime: null,
      priority: undefined,
      recurrence: { type: 'none' },
    });
  });

  it('moves to the next occurrence of a weekday, overriding the row date', () => {
    expect(resolve('A **Mon', '2026-11-20').dueDate).toBe('2026-11-16');
    expect(resolve('A **Fri').dueDate).toBe('2026-11-20');
    expect(resolve('A **Sun').dueDate).toBe('2026-11-15');
  });

  it("treats today's weekday as a week from today", () => {
    expect(resolve('A **Sat').dueDate).toBe('2026-11-21');
  });

  it('resolves today and tomorrow from today, not the row date', () => {
    expect(resolve('A **today', '2026-11-20').dueDate).toBe('2026-11-14');
    expect(resolve('A **tomorrow', '2026-11-20').dueDate).toBe('2026-11-15');
  });

  it('repeats weekly on the weekday of the task date when no days are given', () => {
    expect(resolve('A $$Weekly', '2026-11-18')).toMatchObject({
      dueDate: '2026-11-18',
      recurrence: { type: 'weekly', daysOfWeek: [3] },
    });
    expect(resolve('A **Fri $$Weekly')).toMatchObject({
      dueDate: '2026-11-20',
      recurrence: { type: 'weekly', daysOfWeek: [5] },
    });
  });

  it('starts a weekly task on the next listed day when its date is not one', () => {
    // Saturday → Monday; Tuesday → Wednesday; a listed day stays put.
    expect(resolve('A $$Weekly:MWF').dueDate).toBe('2026-11-16');
    expect(resolve('A $$Weekly:MWF', '2026-11-17').dueDate).toBe('2026-11-18');
    expect(resolve('A $$Weekly:MWF', '2026-11-18').dueDate).toBe('2026-11-18');
  });

  it('combines every symbol', () => {
    expect(resolve('Team sync **Mon %%9:30 $$Weekly:MWF !!2', '2026-11-25')).toEqual({
      title: 'Team sync',
      dueDate: '2026-11-16',
      dueTime: '09:30',
      priority: 2,
      recurrence: { type: 'weekly', daysOfWeek: [1, 3, 5] },
    });
  });

  it('keeps the date for daily tasks', () => {
    expect(resolve('A $$Daily', '2026-11-19')).toMatchObject({ dueDate: '2026-11-19', recurrence: { type: 'daily' } });
  });
});
