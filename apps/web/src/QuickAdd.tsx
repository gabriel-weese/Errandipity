import { useState } from 'react';
import {
  describeRecurrence,
  formatShortDate,
  formatTime12,
  parseQuickAdd,
  resolveQuickAdd,
  type IsoDate,
} from '@errandipity/shared';
import { useApp, useLabels } from './context';
import { describeLabels, QuickAddInput } from './QuickAddInput';

const NO_LABELS: string[] = [];

interface Props {
  /** The day of the list, or null for a list without one: tasks added there have no date. */
  date: IsoDate | null;
  /** Labels every task added here gets, on top of any named with ##. */
  labelIds?: string[];
  /** The project, and its section, that tasks added here go into. */
  projectId?: string | null;
  sectionId?: string | null;
}

/**
 * A one-line "add task" row for the bottom of a list. Symbols in the text
 * set the priority, day, time, repeat and labels (see parseQuickAdd and the Help page).
 */
export function QuickAdd({ date, labelIds = NO_LABELS, projectId = null, sectionId = null }: Props) {
  const { today, openEditor, quickAdd } = useApp();
  const labels = useLabels().data ?? [];
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    setOpen(false);
    setText('');
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-faint hover:text-ink"
      >
        <span aria-hidden="true" className="w-4 text-center">+</span> Add task
      </button>
    );
  }

  const typed = resolveQuickAdd(parseQuickAdd(text, labels), date, today);
  const task = { ...typed, labelIds: [...new Set([...labelIds, ...typed.labelIds])], projectId, sectionId };

  async function submit() {
    if (!task.title || busy) return;
    setBusy(true);
    try {
      await quickAdd(task);
      setText('');
    } catch {
      // The failure is reported as a toast; keep the text so it can be retried.
    } finally {
      setBusy(false);
    }
  }

  return (
    <QuickAddInput
      text={text}
      onTextChange={setText}
      onSubmit={submit}
      onCancel={close}
      onLeave={() => !text.trim() && close()}
      inputLabel={date ? `Task name for ${date}` : 'Task name'}
      priority={task.priority}
      details={[
        task.dueDate !== date && task.dueDate && formatShortDate(task.dueDate),
        task.dueTime && formatTime12(task.dueTime),
        describeRecurrence(task.recurrence),
        describeLabels(labels.filter((label) => task.labelIds.includes(label.id)).map((label) => label.name)),
      ]}
      onMoreOptions={() => {
        openEditor(undefined, task);
        close();
      }}
    />
  );
}
