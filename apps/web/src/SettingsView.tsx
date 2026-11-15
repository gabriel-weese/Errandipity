import {
  DEFAULT_LABEL_COLOR,
  DEFAULT_SETTINGS,
  LABEL_COLORS,
  MAX_GOAL,
  MAX_LABELS,
  type LabelColor,
  type LabelDto,
  type Theme,
  type UpdateLabelInput,
} from '@errandipity/shared';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ActionMenu } from './ActionMenu';
import { useLabelActions, useLabels, useSaveSettings, useSettings } from './context';
import { accentButtonClass, cardClass, fieldClass, hintClass, labelColorClass, LabelIcon, QueryState } from './ui';

const THEMES: readonly { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'dusk', label: 'Dusk' },
  { value: 'lagoon', label: 'Lagoon' },
  { value: 'meadow', label: 'Meadow' },
  { value: 'reef', label: 'Reef' },
];
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
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="flex items-center justify-between gap-4">
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

/**
 * The themes as a grid of tiles, each a small picture of the app in that theme. The
 * picture sets `data-theme` on itself, so it is drawn with that theme's real colour
 * tokens and needs no colours of its own. Each tile is a radio button underneath.
 */
function ThemePicker({ value, disabled, onChange }: { value: Theme; disabled: boolean; onChange: (theme: Theme) => void }) {
  return (
    <fieldset disabled={disabled} className="space-y-2 disabled:opacity-50">
      <legend className="text-sm font-medium">Theme</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {THEMES.map((theme) => (
          <label key={theme.value} className={`block text-center text-sm ${disabled ? '' : 'cursor-pointer'}`}>
            <input
              type="radio"
              name="theme"
              className="peer sr-only"
              checked={value === theme.value}
              onChange={() => onChange(theme.value)}
            />
            {/* The outline is on a wrapper so that it takes the current theme's colour, not the tile's. */}
            <span
              aria-hidden="true"
              className="block rounded-md outline-offset-2 outline-accent peer-checked:outline-2 peer-focus-visible:outline-2"
            >
              <span data-theme={theme.value} className="flex h-16 overflow-hidden rounded-md border border-line-strong bg-page">
                {/* Dashboard strip, then a card with a title, a line of text and a button. */}
                <span className="w-1/4 border-r border-line bg-surface p-1.5">
                  <span className="block h-1.5 rounded-full bg-accent" />
                  <span className="mt-1 block h-1.5 rounded-full bg-accent-soft" />
                </span>
                <span className="flex-1 p-2">
                  <span className="block space-y-1 rounded border border-line bg-surface p-1.5">
                    <span className="block h-1.5 w-2/3 rounded-full bg-ink" />
                    <span className="block h-1.5 w-1/2 rounded-full bg-muted" />
                    <span className="ml-auto block h-2 w-1/3 rounded-sm bg-accent" />
                  </span>
                </span>
              </span>
            </span>
            <span className="mt-1 block peer-checked:font-semibold">{theme.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const GOAL_SAVE_DELAY_MS = 500;

/** A goal count that saves shortly after it changes, and at once when the field is left or Enter is pressed. */
function GoalRow({ label, hint, value, onSave }: { label: string; hint: string; value: number; onSave: (value: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const parsed = text.trim() === '' ? NaN : Math.min(MAX_GOAL, Math.max(0, Math.floor(Number(text))));

  // Save shortly after the last change, so the field's arrows work without leaving it,
  // while a number being typed is not saved digit by digit.
  useEffect(() => {
    if (!Number.isFinite(parsed) || parsed === value) return;
    const timer = setTimeout(() => onSave(parsed), GOAL_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // onSave is left out on purpose: it is a new function on every render and must not restart the wait.
  }, [parsed, value]);

  /** On leaving the field: save now, and tidy the text (or put the saved goal back). */
  function commit() {
    if (!Number.isFinite(parsed)) return setText(String(value));
    setText(String(parsed));
    if (parsed !== value) onSave(parsed);
  }

  return (
    <label className="flex items-center justify-between gap-4">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
      <input
        type="number"
        min={0}
        max={MAX_GOAL}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className={`w-20 ${fieldClass}`}
      />
    </label>
  );
}

const capitalise = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** A round swatch that opens the palette of label colours. */
function LabelColorButton({ label, value, onPick }: { label: string; value: LabelColor; onPick: (color: LabelColor) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <ActionMenu
      label={label}
      icon={<span className={`block size-4 rounded-full bg-current ${labelColorClass[value]}`} />}
      open={open}
      onToggle={() => setOpen(!open)}
      onClose={() => setOpen(false)}
    >
      <div className="grid grid-cols-3 gap-1">
        {LABEL_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={capitalise(color)}
            aria-pressed={color === value}
            title={capitalise(color)}
            onClick={() => {
              if (color !== value) onPick(color);
              setOpen(false);
            }}
            className={`rounded p-1.5 hover:bg-raised ${color === value ? 'bg-raised ring-1 ring-line-strong' : ''}`}
          >
            <span className={`block size-5 rounded-full bg-current ${labelColorClass[color]}`} />
          </button>
        ))}
      </div>
    </ActionMenu>
  );
}

interface LabelRowProps {
  label: LabelDto;
  onUpdate: (changes: UpdateLabelInput) => Promise<unknown>;
  onDelete: () => void;
}

/** One label: its name saves when the field is left or Enter is pressed; deleting asks first. */
function LabelRow({ label, onUpdate, onDelete }: LabelRowProps) {
  const [text, setText] = useState(label.name);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => setText(label.name), [label.name]);

  function commit() {
    const name = text.trim();
    if (!name || name === label.name) return setText(label.name);
    // The failure is shown under the list; go back to the saved name.
    onUpdate({ name }).catch(() => setText(label.name));
  }

  return (
    <li className="flex flex-wrap items-center justify-end gap-2">
      <LabelIcon color={label.color} size="size-5" />
      <input
        aria-label={`Name of label ${label.name}`}
        maxLength={30}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className={`min-w-0 flex-1 ${fieldClass}`}
      />
      <LabelColorButton
        label={`Colour of label ${label.name}`}
        value={label.color}
        // A failure is shown under the list.
        onPick={(color) => void onUpdate({ color }).catch(() => undefined)}
      />
      {confirming ? (
        <>
          <span className="text-sm text-danger-ink">Remove from all tasks?</span>
          <button type="button" onClick={onDelete} className="rounded bg-red-600 px-2 py-1 text-sm font-medium text-white hover:bg-red-700">
            Delete
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="px-2 py-1 text-sm text-soft">
            Keep
          </button>
        </>
      ) : (
        <button type="button" aria-label={`Delete label ${label.name}`} onClick={() => setConfirming(true)} className="text-sm text-danger hover:underline">
          Delete
        </button>
      )}
    </li>
  );
}

function LabelsCard() {
  const labels = useLabels().data ?? [];
  const { create, update, remove } = useLabelActions();
  const [name, setName] = useState('');
  const [color, setColor] = useState<LabelColor>(DEFAULT_LABEL_COLOR);
  const full = labels.length >= MAX_LABELS;
  const error = create.error ?? update.error ?? remove.error;

  function add(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim(), color },
      {
        onSuccess: () => {
          setName('');
          setColor(DEFAULT_LABEL_COLOR);
        },
      },
    );
  }

  return (
    <SettingsCard title="Labels">
      <p className={hintClass}>
        Tags for grouping tasks, shown together in the Labels view. In quick-add text, write ## and the name
        without spaces. {labels.length} of {MAX_LABELS} used.
      </p>
      {labels.length > 0 && (
        <ul className="space-y-2">
          {labels.map((label) => (
            <LabelRow
              key={label.id}
              label={label}
              onUpdate={(changes) => update.mutateAsync({ id: label.id, ...changes })}
              onDelete={() => remove.mutate(label.id)}
            />
          ))}
        </ul>
      )}
      <form onSubmit={add} className="flex items-center gap-2">
        <LabelIcon color={color} size="size-5" />
        <input
          aria-label="New label name"
          placeholder={full ? `You have all ${MAX_LABELS} labels` : 'New label'}
          maxLength={30}
          disabled={full}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`min-w-0 flex-1 ${fieldClass}`}
        />
        <LabelColorButton label="Colour of the new label" value={color} onPick={setColor} />
        <button type="submit" disabled={full || create.isPending} className={`rounded px-3 py-1.5 text-sm disabled:opacity-50 ${accentButtonClass}`}>
          Add label
        </button>
      </form>
      {error && <p className="text-sm text-danger">{error.message}</p>}
    </SettingsCard>
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
              <span className="block text-xs text-muted">Follow your device's light or dark setting.</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              className="relative h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-line-strong transition-colors before:absolute before:left-0.5 before:top-0.5 before:size-4 before:rounded-full before:bg-white before:transition-transform before:content-[''] checked:bg-accent checked:before:translate-x-4"
              checked={settings.matchSystem}
              onChange={(e) => save.mutate({ matchSystem: e.target.checked })}
            />
          </label>
          <ThemePicker value={settings.theme} disabled={settings.matchSystem} onChange={(theme) => save.mutate({ theme })} />
          {settings.matchSystem && (
            <p className="text-xs text-muted">Turn off "Match system" to choose a theme yourself.</p>
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

        <LabelsCard />

        {save.error && <p className="text-sm text-danger">Could not save: {save.error.message}</p>}
      </div>
    </QueryState>
  );
}
