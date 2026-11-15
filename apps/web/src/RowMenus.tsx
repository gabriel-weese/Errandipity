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

// The contents of the dropdowns opened from a task row (see RowActions).

export function PriorityMenu({ task, onPick }: { task: TaskDto; onPick: (priority: number) => void }) {
  return (
    <div className="w-44">
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
  task: TaskDto;
  today: IsoDate;
  onPick: (date: IsoDate) => void;
  /** Offers "No date" when given. */
  onClear?: () => void;
}

/**
 * A month calendar. Any day can be picked, including past ones (the task is then overdue).
 * It opens on the month of the task's date, or the current month for a task without one.
 */
export function DateMenu({ task, today, onPick, onClear }: DateMenuProps) {
  const shownFrom = task.dueDate ?? today;
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
  const navClass = 'rounded px-2 py-1 text-muted hover:bg-raised hover:text-ink';

  return (
    <div className="w-60">
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
              aria-pressed={date === task.dueDate}
              onClick={() => onPick(date)}
              className={`m-0.5 rounded py-1 ${
                date === task.dueDate
                  ? 'bg-accent font-semibold text-on-accent'
                  : `hover:bg-raised ${date === today ? 'font-semibold ring-1 ring-accent' : ''} ${date < today ? 'text-faint' : ''}`
              }`}
            >
              {Number(date.slice(8))}
            </button>
          ),
        )}
      </div>
      <div className="mt-2 flex gap-2 border-t border-line pt-2">
        <button type="button" onClick={() => onPick(today)} className="flex-1 rounded px-2 py-1 text-sm hover:bg-raised">
          Today
        </button>
        <button type="button" onClick={() => onPick(addDays(today, 1))} className="flex-1 rounded px-2 py-1 text-sm hover:bg-raised">
          Tomorrow
        </button>
        {onClear && (
          <button type="button" onClick={onClear} className="flex-1 rounded px-2 py-1 text-sm hover:bg-raised">
            No date
          </button>
        )}
      </div>
    </div>
  );
}

/** "00:00", "00:30" … "23:30" */
const HALF_HOURS = Array.from({ length: 48 }, (_, i) => `${pad2(Math.floor(i / 2))}:${i % 2 ? '30' : '00'}`);

/** Half-hour choices, a box for any other time, and "No time". */
export function TimeMenu({ task, onPick }: { task: TaskDto; onPick: (time: string | null) => void }) {
  const [text, setText] = useState('');
  const [invalid, setInvalid] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Start the list at the task's time, or at 9:00 AM when it has none.
  useLayoutEffect(() => {
    const list = listRef.current;
    // Round the task's time down to the hour to find a row that exists in the list.
    const startTime = `${(task.dueTime ?? '09:00').slice(0, 2)}:00`;
    const start = list?.querySelector<HTMLElement>(`[data-time="${startTime}"]`);
    if (list && start) list.scrollTop = start.offsetTop - list.offsetTop;
  }, [task.dueTime]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const time = parseTimeText(text.trim().replace(/\s+/g, ''));
    if (time) onPick(time);
    else setInvalid(true);
  }

  return (
    <div className="w-48">
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
          className={`min-w-0 flex-1 rounded border bg-field px-2 py-1 text-sm ${invalid ? 'border-danger' : 'border-line-strong'}`}
        />
        <button type="submit" className={`rounded px-2 text-sm ${accentButtonClass}`}>
          Set
        </button>
      </form>
      {invalid && <p className="mb-2 text-xs text-danger">Not a time. Try 9:30, 2pm or 14:15.</p>}
      <div ref={listRef} className="max-h-52 overflow-y-auto">
        <button type="button" aria-pressed={task.dueTime === null} onClick={() => onPick(null)} className={optionClass(task.dueTime === null)}>
          No time
        </button>
        {HALF_HOURS.map((time) => (
          <button
            key={time}
            type="button"
            data-time={time}
            aria-pressed={task.dueTime === time}
            onClick={() => onPick(time)}
            className={optionClass(task.dueTime === time)}
          >
            {formatTime12(time)}
          </button>
        ))}
      </div>
    </div>
  );
}
