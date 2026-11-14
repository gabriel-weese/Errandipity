import { addDays, dayOfWeek, type IsoDate } from './dates';
import type { Recurrence } from './schemas';

/** What a line of quick-add text asks for. Fields are absent unless a symbol set them. */
export interface QuickAddResult {
  title: string;
  priority?: number;
  /** A weekday (0 = Sunday) or a number of days from today, replacing the row's date. */
  date?: { weekday: number } | { daysFromToday: number };
  /** "HH:mm" */
  dueTime?: string;
  /** Weekly without `daysOfWeek` means "on the weekday of the task's date". */
  repeat?: { type: 'daily' } | { type: 'weekly'; daysOfWeek?: number[] };
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
  read: (value: string, result: QuickAddResult) => boolean;
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
function readTime(value: string): string | null {
  const match = /^(\d{1,2})(?::(\d{2}))?(?:([ap])\.?(?:m\.?)?)?$/i.exec(value);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const half = match[3]?.toLowerCase();
  if (minute > 59) return null;
  if (half) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (half === 'p' ? 12 : 0);
  } else if (hour > 23) {
    return null; // Without AM or PM the hour is read on the 24-hour clock.
  }
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

const SYMBOLS: QuickAddSymbol[] = [
  {
    prefix: '!!',
    label: 'Priority',
    description: 'Sets the priority, from 1 (highest) to 5 (lowest). Without it the priority is 3.',
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
      const time = readTime(value);
      if (!time) return false;
      result.dueTime = time;
      return true;
    },
  },
  {
    prefix: '$$',
    label: 'Repeat',
    description:
      'Makes the task repeat, starting on its date. For chosen days use the letters M T W H F S U, where H is Thursday and U is Sunday; if the date is not one of them, the task starts on the next one that is.',
    forms: ['$$Daily', '$$Weekly', '$$Weekly:MWF', '$$Weekly:SU'],
    examples: [
      { input: 'Vitamins $$Daily', result: '"Vitamins" every day' },
      { input: 'Gym $$Weekly:MWF', result: '"Gym" every Monday, Wednesday and Friday' },
      { input: 'Review **Fri $$Weekly', result: '"Review" every Friday, starting next Friday' },
    ],
    read: (value, result) => {
      if (/^daily$/i.test(value)) {
        result.repeat = { type: 'daily' };
        return true;
      }
      const weekly = /^weekly(?::([mtwhfsu]+))?$/i.exec(value);
      if (!weekly) return false;
      const letters = weekly[1]?.toLowerCase();
      result.repeat = letters
        ? { type: 'weekly', daysOfWeek: [...new Set([...letters].map((l) => DAY_LETTERS[l]!))].sort() }
        : { type: 'weekly' };
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
 * Symbols may appear anywhere; when one is repeated the last occurrence wins.
 */
export function parseQuickAdd(text: string): QuickAddResult {
  const result: QuickAddResult = { title: '' };
  const titleWords: string[] = [];
  for (const word of text.trim().split(/\s+/)) {
    const symbol = SYMBOLS.find((s) => word.startsWith(s.prefix));
    if (!symbol?.read(word.slice(symbol.prefix.length), result)) titleWords.push(word);
  }
  result.title = titleWords.join(' ');
  return result;
}

export interface QuickAddTask {
  title: string;
  dueDate: IsoDate;
  dueTime: string | null;
  priority?: number;
  recurrence: Recurrence;
}

/**
 * Turns parsed quick-add text into the task to create.
 * `rowDate` is the day of the list being typed in; a day symbol replaces it.
 */
export function resolveQuickAdd(parsed: QuickAddResult, rowDate: IsoDate, today: IsoDate): QuickAddTask {
  let dueDate = rowDate;
  if (parsed.date && 'daysFromToday' in parsed.date) {
    dueDate = addDays(today, parsed.date.daysFromToday);
  } else if (parsed.date) {
    // The next occurrence strictly after today.
    dueDate = nextOnOrAfter(addDays(today, 1), [parsed.date.weekday]);
  }

  let recurrence: Recurrence = { type: 'none' };
  if (parsed.repeat?.type === 'daily') {
    recurrence = { type: 'daily' };
  } else if (parsed.repeat?.type === 'weekly') {
    const daysOfWeek = parsed.repeat.daysOfWeek ?? [dayOfWeek(dueDate)];
    // Start on a day the task actually repeats on.
    dueDate = nextOnOrAfter(dueDate, daysOfWeek);
    recurrence = { type: 'weekly', daysOfWeek };
  }

  return { title: parsed.title, dueDate, dueTime: parsed.dueTime ?? null, priority: parsed.priority, recurrence };
}

function nextOnOrAfter(date: IsoDate, weekdays: number[]): IsoDate {
  for (let i = 0; i < 7; i++) {
    const candidate = addDays(date, i);
    if (weekdays.includes(dayOfWeek(candidate))) return candidate;
  }
  return date;
}
