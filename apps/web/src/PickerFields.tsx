import { formatTime12, formatUsDate, type IsoDate } from '@errandipity/shared';
import { useState, type ReactNode } from 'react';
import { ActionMenu } from './ActionMenu';
import { CalendarIcon, ClockIcon } from './icons';
import { DateMenu, TimeMenu } from './RowMenus';
import { fieldClass } from './ui';

// Date and time fields for forms. They open the same calendar and time list as the icons
// on a task row, so a date or time is picked the same way everywhere.

interface PickerProps {
  /** What the field holds, such as "Target date"; read out with the value. */
  name: string;
  /** The value as shown, or null when there is none. */
  shown: string | null;
  /** Shown when there is no value. */
  empty: string;
  icon: ReactNode;
  /** The dropdown's content; call `close` once a choice is made. */
  children: (close: () => void) => ReactNode;
}

function Picker({ name, shown, empty, icon, children }: PickerProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <ActionMenu
      label={`${name}: ${shown ?? empty}`}
      buttonClass={`flex min-w-36 items-center gap-2 text-left font-normal ${fieldClass} ${shown ? 'text-ink' : 'text-faint'}`}
      icon={
        <>
          <span className="text-muted">{icon}</span>
          {shown ?? empty}
        </>
      }
      open={open}
      onToggle={() => setOpen(!open)}
      onClose={close}
    >
      {children(close)}
    </ActionMenu>
  );
}

interface DateFieldProps {
  name: string;
  value: IsoDate | null;
  today: IsoDate;
  onChange: (date: IsoDate | null) => void;
  /** Leave out the calendar's Today and Tomorrow buttons. */
  hideShortcuts?: boolean;
}

/** A date that is picked from the calendar; "No date" clears it. */
export function DateField({ name, value, today, onChange, hideShortcuts }: DateFieldProps) {
  return (
    <Picker name={name} shown={value && formatUsDate(value)} empty="No date" icon={<CalendarIcon size="size-4" />}>
      {(close) => (
        <DateMenu
          value={value}
          today={today}
          hideShortcuts={hideShortcuts}
          onPick={(date) => {
            onChange(date);
            close();
          }}
          onClear={
            value === null
              ? undefined
              : () => {
                  onChange(null);
                  close();
                }
          }
        />
      )}
    </Picker>
  );
}

interface TimeFieldProps {
  name: string;
  /** "HH:mm" */
  value: string | null;
  onChange: (time: string | null) => void;
}

/** A time of day that is picked from the half-hour list or typed; "No time" clears it. */
export function TimeField({ name, value, onChange }: TimeFieldProps) {
  return (
    <Picker name={name} shown={value && formatTime12(value)} empty="No time" icon={<ClockIcon size="size-4" />}>
      {(close) => (
        <TimeMenu
          value={value}
          onPick={(time) => {
            onChange(time);
            close();
          }}
        />
      )}
    </Picker>
  );
}
