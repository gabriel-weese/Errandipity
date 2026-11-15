import { formatTime12, formatUsDate, type IsoDate, type TaskDto } from '@errandipity/shared';
import { useState, type ReactNode } from 'react';
import { ActionMenu, optionClass } from './ActionMenu';
import { BottomSheet } from './BottomSheet';
import { useApp } from './context';
import { CalendarIcon, ClockIcon, EditIcon, FlagIcon, MoreIcon } from './icons';
import { DateMenu, PriorityMenu, TimeMenu } from './RowMenus';
import { useIsNarrow } from './useIsNarrow';

type MenuId = 'priority' | 'date' | 'time';

interface Props {
  task: TaskDto;
  /** Offer the date and time controls. */
  schedule: boolean;
  /** The pencil was clicked. */
  onEdit: () => void;
}

/**
 * The quick edits of a task row. On a wide screen they are icons shown when the row is
 * hovered or focused: the pencil hands over to the row (it becomes a quick-add line) and
 * the others open a dropdown. On a phone they are one button that opens a sheet listing
 * the same choices. Priority and time changes apply to the task and its future
 * occurrences; a new date applies to this task only and counts as a reschedule, unless
 * the task had no date.
 */
export function RowActions({ task, schedule, onEdit }: Props) {
  const { today, quickEdit, reschedule } = useApp();
  const narrow = useIsNarrow();
  const [open, setOpen] = useState<MenuId | null>(null);
  /** On a phone: the sheet is showing, with the list of choices or (via `open`) one of the menus. */
  const [sheet, setSheet] = useState(false);
  const close = () => {
    setOpen(null);
    setSheet(false);
  };

  const menus: Record<MenuId, ReactNode> = {
    priority: (
      <PriorityMenu
        task={task}
        onPick={(priority) => {
          if (priority !== task.priority) quickEdit(task, { priority });
          close();
        }}
      />
    ),
    date: (
      <DateMenu
        value={task.dueDate}
        today={today}
        onPick={(date: IsoDate) => {
          // A first date is an edit, not a reschedule.
          if (task.dueDate === null) quickEdit(task, { dueDate: date });
          else if (date !== task.dueDate) reschedule([task.id], date);
          close();
        }}
        // A repeating task needs its date.
        onClear={
          task.dueDate !== null && task.recurrence.type === 'none'
            ? () => {
                quickEdit(task, { dueDate: null });
                close();
              }
            : undefined
        }
      />
    ),
    time: (
      <TimeMenu
        value={task.dueTime}
        onPick={(dueTime) => {
          if (dueTime !== task.dueTime) quickEdit(task, { dueTime });
          close();
        }}
      />
    ),
  };

  if (narrow) {
    const choice = (id: MenuId, icon: ReactNode, text: string, current: string) => (
      <button type="button" onClick={() => setOpen(id)} className={optionClass(false)}>
        {icon}
        <span className="flex-1">{text}</span>
        <span className="text-muted">{current}</span>
      </button>
    );
    return (
      <>
        <button
          type="button"
          aria-label={`Actions for ${task.title}`}
          aria-haspopup="dialog"
          onClick={() => setSheet(true)}
          className="-my-1 -mr-2 flex size-11 items-center justify-center rounded-full text-muted hover:bg-raised"
        >
          <MoreIcon />
        </button>
        {sheet && (
          <BottomSheet label={task.title} onClose={close}>
            {open ? (
              menus[open]
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onEdit();
                  }}
                  className={optionClass(false)}
                >
                  <EditIcon size="size-4" />
                  Edit in place
                </button>
                {choice('priority', <FlagIcon size="size-4" />, 'Priority', String(task.priority))}
                {schedule && (
                  <>
                    {choice('date', <CalendarIcon size="size-4" />, 'Date', task.dueDate ? formatUsDate(task.dueDate) : 'No date')}
                    {choice('time', <ClockIcon size="size-4" />, 'Time', task.dueTime ? formatTime12(task.dueTime) : 'No time')}
                  </>
                )}
              </div>
            )}
          </BottomSheet>
        )}
      </>
    );
  }

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
      <button
        type="button"
        aria-label={`Edit ${task.title} in place`}
        title="Edit"
        onClick={onEdit}
        className="rounded p-1 text-faint hover:bg-raised hover:text-ink"
      >
        <EditIcon size="size-4" />
      </button>
      <ActionMenu label={`Change priority of ${task.title}`} icon={<FlagIcon size="size-4" />} {...menu('priority')}>
        {menus.priority}
      </ActionMenu>
      {schedule && (
        <>
          <ActionMenu label={`Change date of ${task.title}`} icon={<CalendarIcon size="size-4" />} {...menu('date')}>
            {menus.date}
          </ActionMenu>
          <ActionMenu label={`Change time of ${task.title}`} icon={<ClockIcon size="size-4" />} {...menu('time')}>
            {menus.time}
          </ActionMenu>
        </>
      )}
    </div>
  );
}
