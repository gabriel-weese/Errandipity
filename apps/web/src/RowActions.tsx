import type { TaskDto } from '@errandipity/shared';
import { useState } from 'react';
import { ActionMenu } from './ActionMenu';
import { useApp } from './context';
import { CalendarIcon, ClockIcon, EditIcon, FlagIcon } from './icons';
import { DateMenu, PriorityMenu, TimeMenu } from './RowMenus';

type MenuId = 'priority' | 'date' | 'time';

interface Props {
  task: TaskDto;
  /** Offer the date and time controls. */
  schedule: boolean;
  /** The pencil was clicked. */
  onEdit: () => void;
}

/**
 * Quick-edit icons shown on a task row when it is hovered or focused. The pencil hands
 * over to the row (it becomes a quick-add line); the others open a dropdown here.
 * Priority and time changes apply to the task and its future occurrences; a new
 * date applies to this task only and counts as a reschedule, unless the task had no date.
 */
export function RowActions({ task, schedule, onEdit }: Props) {
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
              value={task.dueDate}
              today={today}
              onPick={(date) => {
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
          </ActionMenu>
          <ActionMenu label={`Change time of ${task.title}`} icon={<ClockIcon size="size-4" />} {...menu('time')}>
            <TimeMenu
              value={task.dueTime}
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
