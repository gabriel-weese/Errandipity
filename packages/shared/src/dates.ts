/**
 * Calendar dates are handled as "YYYY-MM-DD" strings (the user's local date),
 * which compare correctly with plain string comparison. Arithmetic goes through
 * UTC so daylight-saving changes can never shift a date.
 */
export type IsoDate = string;

const pad = (n: number) => String(n).padStart(2, '0');

function toUtc(date: IsoDate): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtc(date: Date): IsoDate {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

/** 0 = Sunday … 6 = Saturday */
export function dayOfWeek(date: IsoDate): number {
  return toUtc(date).getUTCDay();
}

export function dayOfMonth(date: IsoDate): number {
  return toUtc(date).getUTCDate();
}

export function daysInMonth(date: IsoDate): number {
  const d = toUtc(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Heading for a day's task list: "November 14 - Today - Saturday",
 * "November 15 - Tomorrow - Sunday", or "November 20 - Friday" for any other day.
 * The year is added only when it differs from the current one.
 */
export function formatDayHeading(date: IsoDate, today: IsoDate): string {
  const d = toUtc(date);
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  const day = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}${sameYear ? '' : `, ${d.getUTCFullYear()}`}`;
  const relative = date === today ? 'Today' : date === addDays(today, 1) ? 'Tomorrow' : null;
  return [day, relative, WEEKDAYS[d.getUTCDay()]].filter(Boolean).join(' - ');
}

/** "Mon, Nov 16" */
export function formatShortDate(date: IsoDate): string {
  const d = toUtc(date);
  return `${WEEKDAYS[d.getUTCDay()]!.slice(0, 3)}, ${MONTHS[d.getUTCMonth()]!.slice(0, 3)} ${d.getUTCDate()}`;
}

/** "MM/DD/YYYY" */
export function formatUsDate(date: IsoDate): string {
  const [y, m, d] = date.split('-');
  return `${m}/${d}/${y}`;
}

/** "09:00" → "9:00 AM", "14:30" → "2:30 PM" */
export function formatTime12(time: string): string {
  const [h = 0, m = 0] = time.split(':').map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Local midnight at the start of the given moment's day. */
export function startOfLocalDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Local midnight on the Monday of the given moment's week (weeks run Monday to Sunday). */
export function startOfLocalWeek(now: Date): Date {
  const daysSinceMonday = (now.getDay() + 6) % 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);
}

/** Today's date in the machine's local timezone. */
export function todayLocal(now: Date = new Date()): IsoDate {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
