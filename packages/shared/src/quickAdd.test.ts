import { describe, expect, it } from 'vitest';
import { formatQuickEdit, parseQuickAdd, resolveQuickAdd, resolveQuickEdit } from './quickAdd';
import type { Recurrence } from './schemas';

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
    for (const form of ['$$Weekly:MXF', '$$Weekly:', '$$Daily:1', '$$Monthly:', '$$Monthly:32', '$$Monthly:0', '$$Monthly:1,', '$$Monthly:third', '$$X', '$$X:0', '$$X:two', '$$X:3:4', '$$', '$$20']) {
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
      labelIds: [],
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
      labelIds: [],
    });
  });

  it('keeps the date for daily tasks', () => {
    expect(resolve('A $$Daily', '2026-11-19')).toMatchObject({ dueDate: '2026-11-19', recurrence: { type: 'daily' } });
  });
});

const LABELS = [
  { id: 'w', name: 'Work', color: 'gray' as const },
  { id: 'h', name: 'Home Office', color: 'gray' as const },
  { id: 'e', name: 'Errands', color: 'gray' as const },
];

describe('parseQuickAdd: labels', () => {
  it('reads ## followed by a label name, ignoring case', () => {
    expect(parseQuickAdd('Send report ##Work', LABELS)).toEqual({ title: 'Send report', labelIds: ['w'] });
    expect(parseQuickAdd('Send report ##work', LABELS)).toEqual({ title: 'Send report', labelIds: ['w'] });
  });

  it('matches a name with spaces when it is written without them', () => {
    expect(parseQuickAdd('Order desk ##HomeOffice', LABELS)).toEqual({ title: 'Order desk', labelIds: ['h'] });
  });

  it('adds up several labels and ignores a repeated one', () => {
    expect(parseQuickAdd('A ##errands ##work ##Errands', LABELS)).toEqual({ title: 'A', labelIds: ['e', 'w'] });
  });

  it('keeps an unknown name in the title', () => {
    expect(parseQuickAdd('Issue ##42 ##Work', LABELS)).toEqual({ title: 'Issue ##42', labelIds: ['w'] });
    expect(parseQuickAdd('Send report ##Work')).toEqual({ title: 'Send report ##Work' });
  });

  it('passes the labels on to the task', () => {
    expect(resolveQuickAdd(parseQuickAdd('A ##work', LABELS), '2026-11-14', '2026-11-14').labelIds).toEqual(['w']);
  });
});

describe('parseQuickAdd: monthly and every-X-days repeats', () => {
  it('reads monthly days, anchors and mixes of both', () => {
    expect(parseQuickAdd('Rent $$Monthly:10').repeat).toEqual({ type: 'monthly', daysOfMonth: [10], anchors: [] });
    expect(parseQuickAdd('Rent $$monthly:first').repeat).toEqual({ type: 'monthly', daysOfMonth: [], anchors: ['first'] });
    expect(parseQuickAdd('Rent $$Monthly:15,1,15').repeat).toEqual({ type: 'monthly', daysOfMonth: [1, 15], anchors: [] });
    expect(parseQuickAdd('Rent $$Monthly:LAST,10,first').repeat).toEqual({
      type: 'monthly',
      daysOfMonth: [10],
      anchors: ['first', 'last'],
    });
  });

  it('reads monthly without a day', () => {
    expect(parseQuickAdd('Rent $$Monthly').repeat).toEqual({ type: 'monthly', daysOfMonth: [], anchors: [] });
  });

  it('reads $$X followed by a number of days', () => {
    expect(parseQuickAdd('Water plants $$X:3')).toEqual({ title: 'Water plants', repeat: { type: 'interval', intervalDays: 3 } });
    expect(parseQuickAdd('Water plants $$x:14').repeat).toEqual({ type: 'interval', intervalDays: 14 });
  });
});

describe('resolveQuickAdd: monthly and every-X-days repeats', () => {
  const TODAY = '2026-11-14';
  const resolve = (text: string, rowDate = TODAY) => resolveQuickAdd(parseQuickAdd(text), rowDate, TODAY);

  it('repeats monthly on the day of the task date when none is given', () => {
    expect(resolve('A $$Monthly', '2026-11-20')).toMatchObject({
      dueDate: '2026-11-20',
      recurrence: { type: 'monthly', daysOfMonth: [20], anchors: [] },
    });
  });

  it('starts a monthly task on the next chosen day when its date is not one', () => {
    expect(resolve('A $$Monthly:10').dueDate).toBe('2026-12-10');
    expect(resolve('A $$Monthly:14').dueDate).toBe('2026-11-14');
    expect(resolve('A $$Monthly:20').dueDate).toBe('2026-11-20');
    expect(resolve('A $$Monthly:first').dueDate).toBe('2026-12-01');
    expect(resolve('A $$Monthly:10,last').dueDate).toBe('2026-11-30');
    expect(resolve('A $$Monthly:middle')).toMatchObject({
      dueDate: '2026-11-15',
      recurrence: { type: 'monthly', daysOfMonth: [], anchors: ['middle'] },
    });
  });

  it('keeps the date for every-X-days tasks', () => {
    expect(resolve('A $$X:3', '2026-11-19')).toMatchObject({
      dueDate: '2026-11-19',
      recurrence: { type: 'interval', intervalDays: 3 },
    });
  });
});

describe('formatQuickEdit', () => {
  const base = { title: 'Gym', priority: 3, dueDate: '2026-11-18', dueTime: null, labels: [] };
  const withRule = (recurrence: Recurrence) => formatQuickEdit({ ...base, recurrence });

  it('writes the title and priority for a plain task', () => {
    expect(withRule({ type: 'none' })).toBe('Gym !!3');
  });

  it('writes the time, repeat and labels', () => {
    expect(
      formatQuickEdit({
        ...base,
        priority: 2,
        dueTime: '09:30',
        recurrence: { type: 'weekly', daysOfWeek: [5, 1, 3] },
        labels: [{ id: 'h', name: 'Home Office', color: 'gray' as const }, { id: 'w', name: 'Work', color: 'gray' as const }],
      }),
    ).toBe('Gym !!2 %%9:30 $$Weekly:MWF ##HomeOffice ##Work');
    expect(formatQuickEdit({ ...base, dueTime: '14:05', recurrence: { type: 'none' } })).toBe('Gym !!3 %%14:05');
  });

  it('writes every kind of repeat', () => {
    expect(withRule({ type: 'daily' })).toBe('Gym !!3 $$Daily');
    expect(withRule({ type: 'weekly', daysOfWeek: [0, 6] })).toBe('Gym !!3 $$Weekly:SU');
    expect(withRule({ type: 'monthly', daysOfMonth: [15, 1], anchors: ['last'] })).toBe('Gym !!3 $$Monthly:1,15,last');
    expect(withRule({ type: 'monthly', daysOfMonth: [], anchors: ['last', 'first'] })).toBe('Gym !!3 $$Monthly:first,last');
    expect(withRule({ type: 'interval', intervalDays: 3 })).toBe('Gym !!3 $$X:3');
  });
});

describe('resolveQuickEdit', () => {
  const TODAY = '2026-11-14'; // a Saturday
  const task = {
    title: 'Gym',
    priority: 2,
    dueDate: '2026-11-18', // a Wednesday
    dueTime: '09:30',
    recurrence: { type: 'weekly', daysOfWeek: [1, 3] } as Recurrence,
    labels: [{ id: 'w', name: 'Work', color: 'gray' as const }],
  };
  const START = 'Gym !!2 %%9:30 $$Weekly:MW ##Work';
  const edit = (text: string, of = task) => resolveQuickEdit(parseQuickAdd(text, LABELS), of, TODAY);

  it('starts from text that changes nothing', () => {
    expect(formatQuickEdit(task)).toBe(START);
    expect(edit(START)).toEqual({});
  });

  it('changes nothing for the untouched text of any kind of repeat', () => {
    const rules: Recurrence[] = [
      { type: 'none' },
      { type: 'daily' },
      { type: 'weekly', daysOfWeek: [6, 0] },
      { type: 'monthly', daysOfMonth: [31, 1], anchors: ['middle'] },
      { type: 'monthly', daysOfMonth: [], anchors: ['last', 'first'] },
      { type: 'interval', intervalDays: 1000 },
    ];
    for (const recurrence of rules) {
      const other = { ...task, recurrence, labels: [LABELS[1]!, LABELS[0]!] };
      expect(edit(formatQuickEdit(other), other)).toEqual({});
    }
  });

  it('renames the task', () => {
    expect(edit('Gym session !!2 %%9:30 $$Weekly:MW ##Work')).toEqual({ title: 'Gym session' });
  });

  it('keeps the title when it is deleted', () => {
    expect(edit('!!2 %%9:30 $$Weekly:MW ##Work')).toEqual({});
  });

  it('changes a field when its symbol is changed', () => {
    expect(edit('Gym !!1 %%18:00 $$Monthly:first ##Work')).toEqual({
      priority: 1,
      dueTime: '18:00',
      recurrence: { type: 'monthly', daysOfMonth: [], anchors: ['first'] },
    });
    expect(edit('Gym !!2 %%9:30 $$X:3 ##Work')).toEqual({ recurrence: { type: 'interval', intervalDays: 3 } });
  });

  it('clears a field when its symbol is taken out', () => {
    expect(edit('Gym !!2 $$Weekly:MW ##Work')).toEqual({ dueTime: null });
    expect(edit('Gym !!2 %%9:30 ##Work')).toEqual({ recurrence: { type: 'none' } });
    expect(edit('Gym !!2 %%9:30 $$Weekly:MW')).toEqual({ labelIds: [] });
    expect(edit('Gym %%9:30 $$Weekly:MW ##Work')).toEqual({ priority: 3 });
  });

  it('replaces the labels with the ones named', () => {
    expect(edit('Gym !!2 %%9:30 $$Weekly:MW ##Work ##errands')).toEqual({ labelIds: ['w', 'e'] });
    expect(edit('Gym !!2 %%9:30 $$Weekly:MW ##errands')).toEqual({ labelIds: ['e'] });
  });

  it('moves the task only when a day symbol is added', () => {
    expect(edit(`${START} **tomorrow`)).toEqual({ dueDate: '2026-11-15' });
    expect(edit(`${START} **Wed`)).toEqual({});
  });

  it('uses the day of the task, or of its new date, for a repeat without days', () => {
    expect(edit('Gym !!2 %%9:30 $$Weekly ##Work')).toEqual({ recurrence: { type: 'weekly', daysOfWeek: [3] } });
    expect(edit('Gym !!2 %%9:30 $$Monthly ##Work')).toEqual({
      recurrence: { type: 'monthly', daysOfMonth: [18], anchors: [] },
    });
    expect(edit('Gym !!2 %%9:30 **Fri $$Weekly ##Work')).toEqual({
      dueDate: '2026-11-20',
      recurrence: { type: 'weekly', daysOfWeek: [5] },
    });
  });
});

describe('tasks without a date', () => {
  const TODAY = '2026-11-14'; // a Saturday
  const add = (text: string) => resolveQuickAdd(parseQuickAdd(text), null, TODAY);
  const undated = {
    title: 'Research',
    priority: 3,
    dueDate: null,
    dueTime: null,
    recurrence: { type: 'none' } as Recurrence,
    labels: [],
  };
  const edit = (text: string) => resolveQuickEdit(parseQuickAdd(text), undated, TODAY);

  it('adds a task with no date in a list without a day', () => {
    expect(add('Research !!2')).toMatchObject({ title: 'Research', dueDate: null, recurrence: { type: 'none' } });
  });

  it('still takes a date from a day symbol', () => {
    expect(add('Research **tomorrow').dueDate).toBe('2026-11-15');
  });

  it('starts a repeating task today, or on the first day it repeats on', () => {
    expect(add('Standup $$Daily')).toMatchObject({ dueDate: TODAY, recurrence: { type: 'daily' } });
    expect(add('Review $$Weekly:M')).toMatchObject({ dueDate: '2026-11-16', recurrence: { type: 'weekly', daysOfWeek: [1] } });
  });

  it('edits without giving the task a date', () => {
    expect(formatQuickEdit(undated)).toBe('Research !!3');
    expect(edit('Research !!3')).toEqual({});
    expect(edit('Research !!1 %%9')).toEqual({ priority: 1, dueTime: '09:00' });
  });

  it('gives the task a date when a day symbol is added', () => {
    expect(edit('Research !!3 **today')).toEqual({ dueDate: TODAY });
  });

  it("gives the task today's date when it is made to repeat", () => {
    expect(edit('Research !!3 $$Daily')).toEqual({ recurrence: { type: 'daily' }, dueDate: TODAY });
    expect(edit('Research !!3 $$Daily **tomorrow')).toEqual({ recurrence: { type: 'daily' }, dueDate: '2026-11-15' });
  });
});
