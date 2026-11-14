import { DEFAULT_SETTINGS } from '@errandipity/shared';
import { useEffect, useState, type ReactNode } from 'react';
import { useSaveSettings, useSettings } from './context';
import { cardClass, mutedClass } from './TaskRow';
import { QueryState } from './views';

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'dusk', label: 'Dusk' },
] as const;
const SIDES = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
] as const;

function SettingsCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={`${cardClass} space-y-4 p-4`}>
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function RadioRow<T extends string>(props: {
  name: string;
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset disabled={props.disabled} className="flex items-center justify-between gap-4 disabled:opacity-50">
      <legend className="float-left text-sm font-medium">{props.label}</legend>
      <div className="flex gap-4">
        {props.options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={props.name}
              checked={props.value === option.value}
              onChange={() => props.onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** A goal count that saves when the field is left or Enter is pressed. */
function GoalRow({ label, hint, value, onSave }: { label: string; hint: string; value: number; onSave: (value: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  function commit() {
    const parsed = Math.min(999, Math.max(0, Math.floor(Number(text))));
    if (!Number.isFinite(parsed)) return setText(String(value));
    setText(String(parsed));
    if (parsed !== value) onSave(parsed);
  }

  return (
    <label className="flex items-center justify-between gap-4">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className={`block text-xs ${mutedClass}`}>{hint}</span>
      </span>
      <input
        type="number"
        min={0}
        max={999}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="w-20 rounded border border-line-strong bg-field px-2 py-1.5 text-sm"
      />
    </label>
  );
}

export function SettingsView() {
  const query = useSettings();
  const settings = query.data ?? DEFAULT_SETTINGS;
  const save = useSaveSettings();

  return (
    <QueryState query={{ isPending: query.isPending && !query.data, error: query.error }}>
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Settings</h1>

        <SettingsCard title="Appearance">
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-medium">Match system</span>
              <span className={`block text-xs ${mutedClass}`}>Follow your device's light or dark setting.</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              className="relative h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-line-strong transition-colors before:absolute before:left-0.5 before:top-0.5 before:size-4 before:rounded-full before:bg-white before:transition-transform before:content-[''] checked:bg-accent checked:before:translate-x-4"
              checked={settings.matchSystem}
              onChange={(e) => save.mutate({ matchSystem: e.target.checked })}
            />
          </label>
          <RadioRow
            name="theme"
            label="Theme"
            options={THEMES}
            value={settings.theme}
            disabled={settings.matchSystem}
            onChange={(theme) => save.mutate({ theme })}
          />
          {settings.matchSystem && (
            <p className={`text-xs ${mutedClass}`}>Turn off "Match system" to choose a theme yourself.</p>
          )}
        </SettingsCard>

        <SettingsCard title="Dashboard">
          <RadioRow
            name="sidebarSide"
            label="Position"
            options={SIDES}
            value={settings.sidebarSide}
            onChange={(sidebarSide) => save.mutate({ sidebarSide })}
          />
        </SettingsCard>

        <SettingsCard title="Goals">
          <GoalRow
            label="Daily goal"
            hint="Tasks to complete each day. 0 turns it off."
            value={settings.dailyGoal}
            onSave={(dailyGoal) => save.mutate({ dailyGoal })}
          />
          <GoalRow
            label="Weekly goal"
            hint="Tasks to complete each week, Monday to Sunday. 0 turns it off."
            value={settings.weeklyGoal}
            onSave={(weeklyGoal) => save.mutate({ weeklyGoal })}
          />
        </SettingsCard>

        {save.error && <p className="text-sm text-danger">Could not save: {save.error.message}</p>}
      </div>
    </QueryState>
  );
}
