import {
  addDays,
  dayOfWeek,
  daysInMonth,
  formatTime12,
  MONTH_NAMES,
  parseTimeText,
  type TaskDto,
} from '@errandipity/shared';
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from './context';
import { CalendarIcon, ClockIcon, FlagIcon } from './icons';
import { PRIORITY_BOX } from './TaskRow';

type MenuId = 'priority' | 'date' | 'time';

const optionClass = (active: boolean) =>
  `flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
    active ? 'bg-accent-soft font-semibold text-accent-ink' : 'hover:bg-raised'
  }`;

/**
 * An icon button with a dropdown anchored to it. The dropdown is rendered at the
 * top of the page with fixed positioning so that neighbouring rows cannot cover it.
 */
function ActionMenu(props: {
  label: string;
  icon: ReactNode;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const { open, onClose } = props;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  // Below the icon and right-aligned to it; above when there is no room below.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current || !panelRef.current) return setPosition(null);
    const anchor = buttonRef.current.getBoundingClientRect();
    const { offsetWidth: width, offsetHeight: height } = panelRef.current;
    const margin = 8;
    let top = anchor.bottom + 4;
    if (top + height > window.innerHeight - margin) top = Math.max(margin, anchor.top - height - 4);
    const left = Math.min(Math.max(margin, anchor.right - width), window.innerWidth - width - margin);
    setPosition({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const inside = (target: EventTarget | null) =>
      target instanceof Node && (panelRef.current?.contains(target) || buttonRef.current?.contains(target));
    const onPointer = (event: MouseEvent) => !inside(event.target) && onClose();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
      buttonRef.current?.focus();
    };
    // The dropdown does not follow the page, so close it when the page moves.
    const onScroll = (event: Event) => !inside(event.target) && onClose();
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onClose);
    };
  }, [open, onClose]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={props.label}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={props.label}
        onClick={props.onToggle}
        className={`rounded p-1 hover:bg-raised hover:text-ink ${open ? 'bg-raised text-ink' : 'text-faint'}`}
      >
        {props.icon}
      </button>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={props.label}
            style={{ top: position?.top ?? 0, left: position?.left ?? 0, opacity: position ? 1 : 0 }}
            className="fixed z-50 rounded-lg border border-line bg-surface p-2 text-ink shadow-lg"
          >
            {props.children}
          </div>,
          document.body,
        )}
    </>
  );
}

function PriorityMenu({ task, onPick }: { task: TaskDto; onPick: (priority: number) => void }) {
  return (
    <div className="w-44">
      {[1, 2, 3, 4, 5].map((priority) => (
        <button
          key={priority}
          type="button"
          aria-pressed={task.priority === priority}
          onClick={() => onPick(priority)}
          className={optionClass(task.priority === priority)}
        >
          <span aria-hidden="true" className={`size-4 shrink-0 rounded border-2 ${PRIORITY_BOX[priority]}`} />
          Priority {priority}
          {priority === 1 ? ' (highest)' : priority === 5 ? ' (lowest)' : ''}
        </button>
      ))}
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

/** A month calendar. Any day can be picked, including past ones (the task is then overdue). */
function DateMenu({ task, today, onPick }: { task: TaskDto; today: string; onPick: (date: string) => void }) {
  const [year, setYear] = useState(Number(task.dueDate.slice(0, 4)));
  const [month, setMonth] = useState(Number(task.dueDate.slice(5, 7))); // 1-12
  const first = `${year}-${pad(month)}-01`;
  const cells: (string | null)[] = [
    ...Array<null>(dayOfWeek(first)).fill(null),
    ...Array.from({ length: daysInMonth(first) }, (_, i) => `${year}-${pad(month)}-${pad(i + 1)}`),
  ];
  const step = (delta: number) => {
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
      </div>
    </div>
  );
}

const HALF_HOURS = Array.from({ length: 48 }, (_, i) => `${pad(Math.floor(i / 2))}:${i % 2 ? '30' : '00'}`);

/** Half-hour choices, a box for any other time, and "No time". */
function TimeMenu({ task, onPick }: { task: TaskDto; onPick: (time: string | null) => void }) {
  const [text, setText] = useState('');
  const [invalid, setInvalid] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Start the list at the task's time, or at 9:00 AM when it has none.
  useLayoutEffect(() => {
    const list = listRef.current;
    const start = list?.querySelector<HTMLElement>(`[data-time="${(task.dueTime ?? '09:00').slice(0, 3)}00"]`);
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
        <button type="submit" className="rounded bg-accent px-2 text-sm font-medium text-on-accent hover:bg-accent-hover">
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

/**
 * Quick-edit icons shown on a task row when it is hovered or focused.
 * Priority and time changes apply to the task and its future occurrences; a new
 * date applies to this task only and counts as a reschedule.
 */
export function RowActions({ task, schedule }: { task: TaskDto; /** Offer the date and time controls. */ schedule: boolean }) {
  const { today, quickEdit, reschedule } = useApp();
  const [open, setOpen] = useState<MenuId | null>(null);
  const close = () => setOpen(null);
  const menu = (id: MenuId) => ({
    open: open === id,
    onToggle: () => setOpen(open === id ? null : id),
    onClose: close,
  });

  return (
    <div
      className={`flex items-center gap-0.5 transition-opacity ${
        open
          ? 'opacity-100'
          : 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-60'
      }`}
    >
      <ActionMenu label={`Change priority of ${task.title}`} icon={<FlagIcon size="size-4" />} {...menu('priority')}>
        <PriorityMenu
          task={task}
          onPick={(priority) => {
            if (priority !== task.priority) quickEdit(task, { priority });
            close();
          }}
        />
      </ActionMenu>
      {schedule && (
        <>
          <ActionMenu label={`Change date of ${task.title}`} icon={<CalendarIcon size="size-4" />} {...menu('date')}>
            <DateMenu
              task={task}
              today={today}
              onPick={(date) => {
                if (date !== task.dueDate) reschedule([task.id], date);
                close();
              }}
            />
          </ActionMenu>
          <ActionMenu label={`Change time of ${task.title}`} icon={<ClockIcon size="size-4" />} {...menu('time')}>
            <TimeMenu
              task={task}
              onPick={(dueTime) => {
                if (dueTime !== task.dueTime) quickEdit(task, { dueTime });
                close();
              }}
            />
          </ActionMenu>
        </>
      )}
    </div>
  );
}
