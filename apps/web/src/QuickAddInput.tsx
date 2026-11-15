import type { FormEvent, ReactNode } from 'react';
import { Link } from 'react-router';
import { PlusIcon } from './icons';
import { DetailLine, PRIORITY_BOX } from './TaskRow';

interface Props {
  text: string;
  onTextChange: (text: string) => void;
  onSubmit: () => void;
  /** Escape was pressed. */
  onCancel: () => void;
  /** Focus left the line altogether. */
  onLeave: () => void;
  /** Accessible name of the text box. */
  inputLabel: string;
  /** Colours the box like a task's checkbox once a priority is known; dashed without one. */
  priority?: number;
  /** What the symbols typed so far will set, shown under the text. */
  details: (ReactNode | false | null | undefined)[];
  /** Opens the full task form in place of this line. */
  onMoreOptions: () => void;
}

/**
 * The one-line task input that understands quick-add symbols, with a live preview of
 * what they will set. Used to add a task (QuickAdd) and to edit one (TaskRowEditor);
 * the caller parses the text and decides what submitting does.
 */
export function QuickAddInput(props: Props) {
  const { priority } = props;

  function submit(event: FormEvent) {
    event.preventDefault();
    props.onSubmit();
  }

  return (
    <form
      onSubmit={submit}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && props.onLeave()}
      className="px-3 py-1.5"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          title={priority ? `Priority ${priority}` : undefined}
          className={`size-4 shrink-0 rounded border-2 ${
            priority ? PRIORITY_BOX[priority] : 'border-dashed border-line-strong'
          }`}
        />
        <input
          autoFocus
          aria-label={props.inputLabel}
          placeholder="Task name"
          value={props.text}
          onChange={(e) => props.onTextChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && props.onCancel()}
          className="min-w-0 flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-faint"
        />
        <Link
          to="/help"
          aria-label="Quick-add symbols help"
          title="Symbols: !! priority, ** day, %% time, $$ repeat, ## label"
          className="rounded px-1.5 text-sm font-semibold text-faint hover:bg-raised hover:text-ink"
        >
          ?
        </Link>
        <button
          type="button"
          aria-label="Open the full task form"
          title="More options"
          onClick={props.onMoreOptions}
          className="rounded p-1 text-faint hover:bg-raised hover:text-ink"
        >
          <PlusIcon size="size-4" />
        </button>
      </div>
      <div className="pl-7" aria-live="polite">
        <DetailLine parts={props.details} />
      </div>
    </form>
  );
}

/** "Label: Work" or "Labels: Home, Work" for a preview line; null when there are none. */
export function describeLabels(names: string[]): string | null {
  if (names.length === 0) return null;
  return `${names.length === 1 ? 'Label' : 'Labels'}: ${names.join(', ')}`;
}
