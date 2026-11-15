import { addDays, dayOfMonth, dayOfWeek, pad2, type IsoDate } from './dates';
import { nextDueDate } from './recurrence';
import {
  DEFAULT_PRIORITY,
  labelKey,
  monthlyAnchorSchema,
  type LabelDto,
  type MonthlyAnchor,
  type Recurrence,
  type TaskDto,
  type UpdateTaskInput,
} from './schemas';

/** What a line of quick-add text asks for. Fields are absent unless a symbol set them. */
export interface QuickAddResult {
  title: string;
  priority?: number;
  /** A weekday (0 = Sunday) or a number of days from today, replacing the row's date. */
  date?: { weekday: number } | { daysFromToday: number };
  /** "HH:mm" */
  dueTime?: string;
  repeat?: QuickAddRepeat;
  /** Every label named with ##, in the order given. */
  labelIds?: string[];
}

/**
 * A repeat as typed. Weekly without `daysOfWeek`, and monthly with neither days nor
 * anchors, mean "on the day of the task's date" (see ruleFor).
 */
type QuickAddRepeat =
  | { type: 'daily' }
  | { type: 'weekly'; daysOfWeek?: number[] }
  | { type: 'monthly'; daysOfMonth: number[]; anchors: MonthlyAnchor[] }
  | { type: 'interval'; intervalDays: number };

/** What a symbol may look up while reading its value. */
interface QuickAddContext {
  labels: readonly LabelDto[];
}

/**
 * A quick-add symbol: a standalone word made of `prefix` followed by a value.
 * `read` applies the value and returns true, or returns false to leave the whole
 * word in the title as ordinary text. Matching is case-insensitive.
 *
 * The help fields are shown on the Help page, so documenting a new symbol only
 * takes adding it to SYMBOLS.
 */
interface QuickAddSymbol {
  prefix: string;
  label: string;
  description: string;
  forms: string[];
  examples: { input: string; result: string }[];
  read: (value: string, result: QuickAddResult, context: QuickAddContext) => boolean;
}

const WEEKDAY_NAMES: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};
const RELATIVE_DAYS: Record<string, number> = { today: 0, tomorrow: 1 };

/** Day letters for `$$Weekly:`; H is Thursday and U is Sunday. */
const DAY_LETTERS: Record<string, number> = { u: 0, m: 1, t: 2, w: 3, h: 4, f: 5, s: 6 };

/** "9", "9:30", "21:30", "9am", "9A.M.", "9:30p" → "HH:mm", or null if it is not a time. */
export function parseTimeText(value: string): string | null {
  const match = /^(\d{1,2})(?::(\d{2}))?(?:([ap])\.?(?:m\.?)?)?$/i.exec(value);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const half = match[3]?.toLowerCase();
  if (minute > 59) return null;
  if (half) {
    if (hour < 1 || hour > 12) return null;
    // 12 AM is hour 0 and 12 PM is hour 12, hence the modulo before adding the afternoon offset.
    hour = (hour % 12) + (half === 'p' ? 12 : 0);
  } else if (hour > 23) {
    return null; // Without AM or PM the hour is read on the 24-hour clock.
  }
  return `${pad2(hour)}:${pad2(minute)}`;
}

/** In the order they are written. */
const ANCHOR_WORDS: readonly MonthlyAnchor[] = monthlyAnchorSchema.options;

/** Reads what follows $$: "weekly:mwf", "monthly:10,last", "x:3". Null if it is not a repeat. */
function parseRepeat(value: string): QuickAddRepeat | null {
  const [kind, detail, ...rest] = value.toLowerCase().split(':');
  if (rest.length > 0 || detail === '') return null;
  switch (kind) {
    case 'daily':
      return detail === undefined ? { type: 'daily' } : null;
    case 'weekly':
      if (detail === undefined) return { type: 'weekly' };
      if (!/^[mtwhfsu]+$/.test(detail)) return null;
      // Default (string) sort is safe here: the values are single digits 0-6.
      return { type: 'weekly', daysOfWeek: [...new Set([...detail].map((l) => DAY_LETTERS[l]!))].sort() };
    case 'monthly': {
      const days = new Set<number>();
      const anchors = new Set<string>();
      for (const item of detail?.split(',') ?? []) {
        if ((ANCHOR_WORDS as readonly string[]).includes(item)) anchors.add(item);
        else if (/^\d{1,2}$/.test(item) && Number(item) >= 1 && Number(item) <= 31) days.add(Number(item));
        else return null;
      }
      return {
        type: 'monthly',
        daysOfMonth: [...days].sort((a, b) => a - b),
        anchors: ANCHOR_WORDS.filter((anchor) => anchors.has(anchor)),
      };
    }
    case 'x':
      return detail !== undefined && /^[1-9]\d{0,4}$/.test(detail)
        ? { type: 'interval', intervalDays: Number(detail) }
        : null;
    default:
      return null;
  }
}

const SYMBOLS: QuickAddSymbol[] = [
  {
    prefix: '!!',
    label: 'Priority',
    description: `Sets the priority, from 1 (highest) to 5 (lowest). Without it the priority is ${DEFAULT_PRIORITY}.`,
    forms: ['!!1', '!!2', '!!3', '!!4', '!!5'],
    examples: [
      { input: 'Call the bank !!1', result: '"Call the bank" at priority 1' },
      { input: 'Wow !!', result: '"Wow !!", because with no number it stays in the title' },
    ],
    read: (value, result) => {
      if (!/^[1-5]$/.test(value)) return false;
      result.priority = Number(value);
      return true;
    },
  },
  {
    prefix: '**',
    label: 'Day',
    description:
      'Sets the date, replacing the day of the list you are typing in. A weekday means its next occurrence after today, so the name of today\'s weekday means a week from today.',
    forms: ['**Today', '**Tomorrow', '**Mon', '**Monday', '**Tue', '**Wed', '**Thu', '**Fri', '**Sat', '**Sun'],
    examples: [
      { input: 'Dentist **Thu', result: '"Dentist" on the next Thursday' },
      { input: 'Send invoice **tomorrow', result: '"Send invoice" tomorrow' },
    ],
    read: (value, result) => {
      const name = value.toLowerCase();
      if (name in RELATIVE_DAYS) result.date = { daysFromToday: RELATIVE_DAYS[name]! };
      else if (name in WEEKDAY_NAMES) result.date = { weekday: WEEKDAY_NAMES[name]! };
      else return false;
      return true;
    },
  },
  {
    prefix: '%%',
    label: 'Time',
    description:
      'Sets the time of day. With AM or PM the hour is 1 to 12; without, it is read on the 24-hour clock, so %%9 is 9:00 AM and %%15 is 3:00 PM.',
    forms: ['%%9', '%%9:30', '%%21:30', '%%9AM', '%%9A.M.', '%%9a', '%%9:30PM'],
    examples: [
      { input: 'Standup %%9:30', result: '"Standup" at 9:30 AM' },
      { input: 'Dinner %%7pm', result: '"Dinner" at 7:00 PM' },
    ],
    read: (value, result) => {
      const time = parseTimeText(value);
      if (!time) return false;
      result.dueTime = time;
      return true;
    },
  },
  {
    prefix: '$$',
    label: 'Repeat',
    description:
      'Makes the task repeat, starting on its date. Weekly takes day letters M T W H F S U, where H is Thursday and U is Sunday. Monthly takes days of the month and the words first, middle and last, separated by commas. X takes a number of days, counted from the day the task is completed. Without days, weekly and monthly use the day of the task\'s date. If the date is not one of the chosen days, the task starts on the next one that is.',
    forms: [
      '$$Daily',
      '$$Weekly',
      '$$Weekly:MWF',
      '$$Weekly:SU',
      '$$Monthly',
      '$$Monthly:10',
      '$$Monthly:1,15',
      '$$Monthly:first',
      '$$Monthly:10,last',
      '$$X:3',
    ],
    examples: [
      { input: 'Vitamins $$Daily', result: '"Vitamins" every day' },
      { input: 'Gym $$Weekly:MWF', result: '"Gym" every Monday, Wednesday and Friday' },
      { input: 'Review **Fri $$Weekly', result: '"Review" every Friday, starting next Friday' },
      { input: 'Pay rent $$Monthly:first', result: '"Pay rent" on the first day of every month' },
      { input: 'Invoices $$Monthly:10,last', result: '"Invoices" on the 10th and the last day of every month' },
      { input: 'Water plants $$X:3', result: '"Water plants" again 3 days after each time it is completed' },
    ],
    read: (value, result) => {
      const repeat = parseRepeat(value);
      if (!repeat) return false;
      result.repeat = repeat;
      return true;
    },
  },
  {
    prefix: '##',
    label: 'Label',
    description:
      'Adds one of your labels, which are created in Settings. Write the label\'s name without spaces; capitals do not matter. Use it more than once to add several labels. A name that is not one of your labels stays in the title.',
    forms: ['##Work', '##HomeOffice'],
    examples: [
      { input: 'Send report ##Work', result: '"Send report" with the label Work' },
      { input: 'Fix shelf ##Home ##Weekend', result: '"Fix shelf" with the labels Home and Weekend' },
      { input: 'Order desk ##homeoffice', result: '"Order desk" with the label Home Office' },
    ],
    read: (value, result, { labels }) => {
      const label = labels.find((l) => labelKey(l.name) === value.toLowerCase());
      if (!label) return false;
      if (!result.labelIds?.includes(label.id)) result.labelIds = [...(result.labelIds ?? []), label.id];
      return true;
    },
  },
];

/** The symbols and how to use them, for the Help page. */
export const QUICK_ADD_HELP = SYMBOLS.map(({ prefix, label, description, forms, examples }) => ({
  prefix,
  label,
  description,
  forms,
  examples,
}));

/**
 * Splits quick-add text into a title and the settings given by its symbols.
 * Symbols may appear anywhere; when one is repeated the last occurrence wins,
 * except labels, which add up. `labels` are the user's labels, for ##.
 */
export function parseQuickAdd(text: string, labels: readonly LabelDto[] = []): QuickAddResult {
  const result: QuickAddResult = { title: '' };
  const titleWords: string[] = [];
  for (const word of text.trim().split(/\s+/)) {
    const symbol = SYMBOLS.find((s) => word.startsWith(s.prefix));
    if (!symbol?.read(word.slice(symbol.prefix.length), result, { labels })) titleWords.push(word);
  }
  result.title = titleWords.join(' ');
  return result;
}

export interface QuickAddTask {
  title: string;
  /** null = no date. */
  dueDate: IsoDate | null;
  dueTime: string | null;
  priority?: number;
  recurrence: Recurrence;
  labelIds: string[];
}

/** The date a day symbol asks for, or null when there is none. */
function requestedDate(date: QuickAddResult['date'], today: IsoDate): IsoDate | null {
  if (!date) return null;
  if ('daysFromToday' in date) return addDays(today, date.daysFromToday);
  // The next occurrence strictly after today.
  return nextOnOrAfter(addDays(today, 1), [date.weekday]);
}

/** The recurrence rule a typed repeat stands for, on a task due on `date`. */
function ruleFor(repeat: QuickAddRepeat | undefined, date: IsoDate): Recurrence {
  if (!repeat) return { type: 'none' };
  switch (repeat.type) {
    case 'weekly':
      return { type: 'weekly', daysOfWeek: repeat.daysOfWeek ?? [dayOfWeek(date)] };
    case 'monthly': {
      const unspecified = repeat.daysOfMonth.length + repeat.anchors.length === 0;
      return { ...repeat, daysOfMonth: unspecified ? [dayOfMonth(date)] : repeat.daysOfMonth };
    }
    default:
      return repeat;
  }
}

/**
 * Turns parsed quick-add text into the task to create.
 * `rowDate` is the day of the list being typed in; a day symbol replaces it. In a list
 * without a day (null) the task has no date, unless it repeats: then it starts today.
 */
export function resolveQuickAdd(parsed: QuickAddResult, rowDate: IsoDate | null, today: IsoDate): QuickAddTask {
  let dueDate = requestedDate(parsed.date, today) ?? rowDate;
  if (dueDate === null && parsed.repeat) dueDate = today;
  const recurrence = ruleFor(parsed.repeat, dueDate ?? today);
  if (dueDate !== null && (recurrence.type === 'weekly' || recurrence.type === 'monthly')) {
    // Start on a day the task actually repeats on: the first one after the day before.
    const dayBefore = addDays(dueDate, -1);
    dueDate = nextDueDate(recurrence, { dueDate: dayBefore, completedOn: dayBefore }) ?? dueDate;
  }

  return {
    title: parsed.title,
    dueDate,
    dueTime: parsed.dueTime ?? null,
    priority: parsed.priority,
    recurrence,
    labelIds: parsed.labelIds ?? [],
  };
}

const DAY_LETTER_ORDER = 'MTWHFSU';

/** A rule as its $$ symbol, or null when the task does not repeat. The reverse of parseRepeat. */
function formatRepeat(rule: Recurrence): string | null {
  switch (rule.type) {
    case 'none':
      return null;
    case 'daily':
      return '$$Daily';
    case 'weekly': {
      const letters = [...DAY_LETTER_ORDER].filter((l) => rule.daysOfWeek.includes(DAY_LETTERS[l.toLowerCase()]!));
      return `$$Weekly:${letters.join('')}`;
    }
    case 'monthly': {
      const days = [...new Set(rule.daysOfMonth)].sort((a, b) => a - b);
      return `$$Monthly:${[...days, ...ANCHOR_WORDS.filter((anchor) => rule.anchors.includes(anchor))].join(',')}`;
    }
    case 'interval':
      return `$$X:${rule.intervalDays}`;
  }
}

type EditableTask = Pick<TaskDto, 'title' | 'priority' | 'dueDate' | 'dueTime' | 'recurrence' | 'labels'>;

/**
 * A task as the quick-add text that describes it, to start an in-place edit from:
 * its title followed by the symbols for its priority, time, repeat and labels.
 * The day is left out, because ** can only say where to move a task to.
 */
export function formatQuickEdit(task: EditableTask): string {
  const [hour = '', minute = ''] = task.dueTime?.split(':') ?? [];
  return [
    task.title,
    `!!${task.priority}`,
    task.dueTime && `%%${Number(hour)}:${minute}`,
    formatRepeat(task.recurrence),
    ...task.labels.map((label) => `##${label.name.replace(/\s+/g, '')}`),
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Turns the text of an in-place edit (see formatQuickEdit) into the changes to save.
 * The text describes the whole task apart from its day: taking a symbol out clears
 * that field (no time, no repeat, no labels, the default priority), and an empty title
 * keeps the current one. A day symbol moves the task, and a task without a date that is
 * made to repeat gets today's. The result is empty when nothing would change.
 */
export function resolveQuickEdit(parsed: QuickAddResult, task: EditableTask, today: IsoDate): UpdateTaskInput {
  const changes: UpdateTaskInput = {};
  if (parsed.title && parsed.title !== task.title) changes.title = parsed.title;

  const priority = parsed.priority ?? DEFAULT_PRIORITY;
  if (priority !== task.priority) changes.priority = priority;

  const dueTime = parsed.dueTime ?? null;
  if (dueTime !== task.dueTime) changes.dueTime = dueTime;

  const dueDate = requestedDate(parsed.date, today);
  if (dueDate && dueDate !== task.dueDate) changes.dueDate = dueDate;

  // Unlike resolveQuickAdd, the task is not moved onto a day it repeats on: that would count as a reschedule.
  const recurrence = ruleFor(parsed.repeat, dueDate ?? task.dueDate ?? today);
  if (formatRepeat(recurrence) !== formatRepeat(task.recurrence)) changes.recurrence = recurrence;
  if (recurrence.type !== 'none' && !dueDate && task.dueDate === null) changes.dueDate = today;

  const labelIds = parsed.labelIds ?? [];
  const current = task.labels.map((label) => label.id);
  if (labelIds.length !== current.length || labelIds.some((id) => !current.includes(id))) changes.labelIds = labelIds;
  return changes;
}

function nextOnOrAfter(date: IsoDate, weekdays: number[]): IsoDate {
  for (let i = 0; i < 7; i++) {
    const candidate = addDays(date, i);
    if (weekdays.includes(dayOfWeek(candidate))) return candidate;
  }
  return date;
}
