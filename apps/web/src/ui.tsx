import type { LabelColor, LabelDto } from '@errandipity/shared';
import type { ReactNode } from 'react';
import { ChevronIcon, TagIcon } from './icons';

// Class strings and small pieces shared by several screens.

export const cardClass = 'rounded-lg border border-line bg-surface';
export const rowClass =
  'flex flex-wrap items-start gap-3 border-b border-line-soft px-3 py-2 last:border-b-0';

/** Colours of a primary button; each use adds its own shape, padding and text size. */
export const accentButtonClass = 'bg-accent font-medium text-on-accent hover:bg-accent-hover';

/** A text input, select or textarea. */
export const fieldClass =
  'rounded border border-line-strong bg-field px-2 py-1.5 text-sm disabled:bg-raised disabled:text-faint';
/** A caption stacked above its field. */
export const labelClass = 'flex flex-col gap-1 text-xs font-medium text-soft';
export const hintClass = 'text-xs text-muted';
/** A button that is on or off, such as a weekday or a label. */
export const toggleClass = (active: boolean) =>
  `rounded px-2 py-1 text-sm disabled:opacity-50 ${active ? 'bg-accent text-on-accent' : 'bg-raised'}`;

/** Shows a loading line or the error for a query, and its children once the data is there. */
export function QueryState({ query, children }: { query: { isPending: boolean; error: Error | null }; children: ReactNode }) {
  if (query.isPending) return <p className="text-sm text-muted">Loading…</p>;
  if (query.error) {
    return (
      <p className="rounded border border-danger-line bg-danger-soft p-3 text-sm text-danger-ink">
        Could not load: {query.error.message}
      </p>
    );
  }
  return <>{children}</>;
}

/** The arrow of an accordion: down while its content shows, right while it is folded away. */
export function CollapseButton({ expanded, name, onToggle }: { expanded: boolean; name: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${expanded ? 'Hide' : 'Show'} ${name}`}
      aria-expanded={expanded}
      className="shrink-0 rounded-md p-1.5 text-muted hover:bg-raised"
    >
      <ChevronIcon direction={expanded ? 'down' : 'right'} size="size-4" />
    </button>
  );
}

/** "3 / 8" tasks completed, over a bar that turns green when every task is done. */
export function ProgressBar({ done, total }: { done: number; total: number }) {
  const complete = total > 0 && done === total;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted">Tasks completed</span>
        <span className={`font-semibold tabular-nums ${complete ? 'text-ok' : ''}`}>
          {done} / {total}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${done} of ${total} tasks completed`}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="h-1.5 overflow-hidden rounded-full bg-track"
      >
        <div
          className={`h-full rounded-full transition-[width] ${complete ? 'bg-emerald-500' : 'bg-accent'}`}
          style={{ width: total > 0 ? `${(done / total) * 100}%` : 0 }}
        />
      </div>
    </div>
  );
}

/** Text colour for each label colour; the shade comes from the theme (see index.css). */
export const labelColorClass: Record<LabelColor, string> = {
  gray: 'text-label-gray',
  red: 'text-label-red',
  orange: 'text-label-orange',
  yellow: 'text-label-yellow',
  green: 'text-label-green',
  teal: 'text-label-teal',
  blue: 'text-label-blue',
  purple: 'text-label-purple',
  pink: 'text-label-pink',
};

/** The tag icon in a label's colour. */
export function LabelIcon({ color, size = 'size-3.5' }: { color: LabelColor; size?: string }) {
  return (
    <span className={`inline-flex shrink-0 ${labelColorClass[color]}`}>
      <TagIcon size={size} />
    </span>
  );
}

/**
 * A label as an on/off button. Unlike toggleClass it keeps the card background in both
 * states and is outlined when on, so the icon's colour shows wherever the button sits.
 */
export function LabelToggle({ label, active, onToggle }: { label: LabelDto; active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={`flex items-center gap-1.5 rounded border bg-surface px-2 py-1 text-sm ${
        active ? 'border-accent font-semibold ring-1 ring-accent' : 'border-line'
      }`}
    >
      <LabelIcon color={label.color} />
      {label.name}
    </button>
  );
}
