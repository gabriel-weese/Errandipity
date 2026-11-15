import { WEEKDAYS_SHORT, type MonthlyAnchor, type Recurrence } from '@errandipity/shared';
import { fieldClass, hintClass, labelClass, toggleClass } from './ui';

const ANCHORS: { value: MonthlyAnchor; label: string }[] = [
  { value: 'first', label: 'First' },
  { value: 'middle', label: 'Middle' },
  { value: 'last', label: 'Last' },
];

/**
 * The repeat controls as the form holds them. Every kind of rule keeps its own values,
 * so switching the type back and forth does not lose what was entered.
 */
export interface RecurrenceDraft {
  type: Recurrence['type'];
  daysOfWeek: number[];
  // The form offers specific days or anchors, not both, although the schema allows a mix.
  monthlyMode: 'days' | 'anchors';
  /** As typed: day numbers separated by commas. */
  daysOfMonth: string;
  anchors: MonthlyAnchor[];
  intervalDays: number;
}

/** The form values for an existing rule, with starting values for the other kinds. */
export function draftFromRule(rule: Recurrence): RecurrenceDraft {
  const anchors = rule.type === 'monthly' ? rule.anchors : [];
  return {
    type: rule.type,
    daysOfWeek: rule.type === 'weekly' ? rule.daysOfWeek : [],
    monthlyMode: anchors.length ? 'anchors' : 'days',
    daysOfMonth: rule.type === 'monthly' && rule.daysOfMonth.length ? rule.daysOfMonth.join(', ') : '1',
    anchors,
    intervalDays: rule.type === 'interval' ? rule.intervalDays : 2,
  };
}

/** The rule the form describes, or the message to show when it is incomplete. */
export function buildRecurrence(draft: RecurrenceDraft): { rule: Recurrence } | { error: string } {
  const { type } = draft;
  switch (type) {
    case 'none':
    case 'daily':
      return { rule: { type } };
    case 'weekly':
      return draft.daysOfWeek.length
        ? { rule: { type, daysOfWeek: draft.daysOfWeek } }
        : { error: 'Pick at least one weekday.' };
    case 'monthly': {
      if (draft.monthlyMode === 'anchors') {
        return draft.anchors.length
          ? { rule: { type, daysOfMonth: [], anchors: draft.anchors } }
          : { error: 'Pick at least one of First, Middle or Last.' };
      }
      const days = draft.daysOfMonth
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 31);
      return days.length
        ? { rule: { type, daysOfMonth: days, anchors: [] } }
        : { error: 'Enter days of the month, e.g. 1, 15.' };
    }
    case 'interval':
      return draft.intervalDays >= 1
        ? { rule: { type, intervalDays: draft.intervalDays } }
        : { error: 'Interval must be at least 1 day.' };
  }
}

interface Props {
  draft: RecurrenceDraft;
  onChange: (changes: Partial<RecurrenceDraft>) => void;
  /** Shows the rule without letting it be changed (when editing a single occurrence). */
  locked: boolean;
}

/** The "Repeat" part of the task dialog. */
export function RecurrenceFields({ draft, onChange, locked }: Props) {
  const { type, monthlyMode, daysOfWeek, anchors } = draft;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        <label className={labelClass}>
          Repeat
          <select
            className={fieldClass}
            value={type}
            disabled={locked}
            onChange={(e) => onChange({ type: e.target.value as Recurrence['type'] })}
          >
            <option value="none">Does not repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="interval">Every X days</option>
          </select>
        </label>
        {type === 'monthly' && (
          <label className={labelClass}>
            On
            <select
              className={fieldClass}
              value={monthlyMode}
              disabled={locked}
              onChange={(e) => onChange({ monthlyMode: e.target.value as RecurrenceDraft['monthlyMode'] })}
            >
              <option value="days">Specific day(s)</option>
              <option value="anchors">First, middle or last</option>
            </select>
          </label>
        )}
      </div>
      {locked && <p className={hintClass}>Choose "This and all future tasks" to change how this task repeats.</p>}
      {type === 'weekly' && (
        <div className="flex flex-wrap gap-1">
          {WEEKDAYS_SHORT.map((name, day) => {
            const active = daysOfWeek.includes(day);
            return (
              <button
                key={day}
                type="button"
                disabled={locked}
                aria-pressed={active}
                onClick={() => onChange({ daysOfWeek: active ? daysOfWeek.filter((d) => d !== day) : [...daysOfWeek, day] })}
                className={toggleClass(active)}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}
      {type === 'monthly' && monthlyMode === 'days' && (
        <label className="flex items-center gap-2 text-sm">
          Day(s) of the month
          <input
            className={fieldClass}
            disabled={locked}
            value={draft.daysOfMonth}
            onChange={(e) => onChange({ daysOfMonth: e.target.value })}
            placeholder="1, 15"
          />
        </label>
      )}
      {type === 'monthly' && monthlyMode === 'anchors' && (
        <div className="space-y-1">
          <div className="flex flex-wrap gap-1">
            {ANCHORS.map(({ value, label }) => {
              const active = anchors.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  disabled={locked}
                  aria-pressed={active}
                  onClick={() => onChange({ anchors: active ? anchors.filter((a) => a !== value) : [...anchors, value] })}
                  className={toggleClass(active)}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className={hintClass}>Pick one or more. Middle is the 14th to 16th, depending on the month's length.</p>
        </div>
      )}
      {type === 'interval' && (
        <label className="flex items-center gap-2 text-sm">
          Every
          <input
            type="number"
            min={1}
            disabled={locked}
            className={`${fieldClass} w-20`}
            value={draft.intervalDays}
            onChange={(e) => onChange({ intervalDays: Number(e.target.value) })}
          />
          days after it is completed
        </label>
      )}
    </div>
  );
}
