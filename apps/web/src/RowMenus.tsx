import {
  addDays,
  dayOfWeek,
  daysInMonth,
  formatTime12,
  MONTH_NAMES,
  pad2,
  parseTimeText,
  PRIORITIES,
  priorityHint,
  type IsoDate,
  type TaskDto,
} from '@errandipity/shared';
import { useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { optionClass } from './ActionMenu';
import { PRIORITY_BOX } from './TaskRow';
import { accentButtonClass } from './ui';

// The contents of the dropdowns opened from a task row (see RowActions). The calendar and the
// time list are also the date and time fields of the forms (see PickerFields).

export function PriorityMenu({ task, onPick }: { task: TaskDto; onPick: (priority: number) => void }) {
  return (
    <div className="w-44 max-md:w-full">
      {PRIORITIES.map((priority) => (
        <button
          key={priority}
          type="button"
          aria-pressed={task.priority === priority}
          onClick={() => onPick(priority)}
          className={optionClass(task.priority === priority)}
        >
          <span aria-hidden="true" className={`size-4 shrink-0 rounded border-2 ${PRIORITY_BOX[priority]}`} />
          Priority {priority}
          {priorityHint(priority)}
        </button>
      ))}
    </div>
  );
}

interface DateMenuProps {
  /** The date currently chosen, if any. */
  value: IsoDate | null;
  today: IsoDate;
  onPick: (date: IsoDate) => void;
  /** Offers "No date" when given. */
  onClear?: () => void;
  /** Leave out the Today and Tomorrow buttons. */
  hideShortcuts?: boolean;
}

/**
 * A month calendar. Any day can be picked, including past ones (a task is then overdue).
 * It opens on the month of the chosen date, or the current month when there is none.
 */
export function DateMenu({ value, today, onPick, onClear, hideShortcuts = false }: DateMenuProps) {
  const shownFrom = value ?? today;
  const [year, setYear] = useState(Number(shownFrom.slice(0, 4)));
  const [month, setMonth] = useState(Number(shownFrom.slice(5, 7))); // 1-12
  const first = `${year}-${pad2(month)}-01`;
  // Empty cells push the 1st into the column of its weekday.
  const cells: (IsoDate | null)[] = [
    ...Array<null>(dayOfWeek(first)).fill(null),
    ...Array.from({ length: daysInMonth(first) }, (_, i) => `${year}-${pad2(month)}-${pad2(i + 1)}`),
  ];
  const step = (delta: number) => {
    // Count months from year 0 so stepping past December or January carries into the year.
    const index = year * 12 + (month - 1) + delta;
    setYear(Math.floor(index / 12));
    setMonth((index % 12) + 1);
  };
  const navClass = 'rounded px-2 py-1 text-muted hover:bg-raised hover:text-ink max-md:px-4 max-md:py-2';

  return (
    <div className="w-60 max-md:w-full">
      <div className="mb-1 flex items-center justify-between">
        <button type="button" aria-label="Previous month" onClick={() => step(-1)} className={navClass}>
          ‹
        </button>
        <span className="text-sm font-semibold" aria-live="polite">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button type="button" aria-label="Next month" onClick={() => step(1)} className={navClass}>
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((name, i) => (
          <span key={i} className="py-1 text-faint">
            {name}
          </span>
        ))}
        {cells.map((date, i) =>
          date === null ? (
            <span key={i} />
          ) : (
            <button
              key={date}
              type="button"
              aria-label={date}
              aria-pressed={date === value}
              onClick={() => onPick(date)}
              className={`m-0.5 rounded py-1 max-md:py-2.5 ${
                date === value
                  ? 'bg-accent font-semibold text-on-accent'
                  : `hover:bg-raised ${date === today ? 'font-semibold ring-1 ring-accent' : ''} ${date < today ? 'text-faint' : ''}`
              }`}
            >
              {Number(date.slice(8))}
            </button>
          ),
        )}
      </div>
      {(!hideShortcuts || onClear) && (
        <div className="mt-2 flex gap-2 border-t border-line pt-2">
          {!hideShortcuts && (
            <>
              <button type="button" onClick={() => onPick(today)} className="flex-1 rounded px-2 py-1 text-sm hover:bg-raised max-md:py-2.5">
                Today
              </button>
              <button type="button" onClick={() => onPick(addDays(today, 1))} className="flex-1 rounded px-2 py-1 text-sm hover:bg-raised max-md:py-2.5">
                Tomorrow
              </button>
            </>
          )}
          {onClear && (
            <button type="button" onClick={onClear} className="flex-1 rounded px-2 py-1 text-sm hover:bg-raised max-md:py-2.5">
              No date
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** "00:00", "00:30" … "23:30" */
const HALF_HOURS = Array.from({ length: 48 }, (_, i) => `${pad2(Math.floor(i / 2))}:${i % 2 ? '30' : '00'}`);

/** Half-hour choices, a box for any other time, and "No time". `value` is the time currently chosen. */
export function TimeMenu({ value, onPick }: { value: string | null; onPick: (time: string | null) => void }) {
  const [text, setText] = useState('');
  const [invalid, setInvalid] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Start the list at the chosen time, or at 9:00 AM when there is none.
  useLayoutEffect(() => {
    const list = listRef.current;
    // Round the time down to the hour to find a row that exists in the list.
    const startTime = `${(value ?? '09:00').slice(0, 2)}:00`;
    const start = list?.querySelector<HTMLElement>(`[data-time="${startTime}"]`);
    if (list && start) list.scrollTop = start.offsetTop - list.offsetTop;
  }, [value]);

  function submit(event: FormEvent) {
    event.preventDefault();
    // The menu is drawn outside the page, but React still passes its events to the form it was
    // opened from (the task dialog), which must not be submitted by this one.
    event.stopPropagation();
    const time = parseTimeText(text.trim().replace(/\s+/g, ''));
    if (time) onPick(time);
    else setInvalid(true);
  }

  return (
    <div className="w-48 max-md:w-full">
      <form onSubmit={submit} className="mb-2 flex gap-1">
        <input
          autoFocus
          aria-label="Type a time"
          aria-invalid={invalid}
          placeholder="9:30, 2pm, 14:15"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setInvalid(false);
          }}
          className={`min-w-0 flex-1 rounded border bg-field px-2 py-1 text-sm max-md:py-2 ${invalid ? 'border-danger' : 'border-line-strong'}`}
        />
        <button type="submit" className={`rounded px-2 text-sm ${accentButtonClass}`}>
          Set
        </button>
      </form>
      {invalid && <p className="mb-2 text-xs text-danger">Not a time. Try 9:30, 2pm or 14:15.</p>}
      <div ref={listRef} className="max-h-52 overflow-y-auto">
        <button type="button" aria-pressed={value === null} onClick={() => onPick(null)} className={optionClass(value === null)}>
          No time
        </button>
        {HALF_HOURS.map((time) => (
          <button
            key={time}
            type="button"
            data-time={time}
            aria-pressed={value === time}
            onClick={() => onPick(time)}
            className={optionClass(value === time)}
          >
            {formatTime12(time)}
          </button>
        ))}
      </div>
    </div>
  );
}
