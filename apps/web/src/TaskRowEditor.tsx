import { useState } from 'react';
import {
  describeRecurrence,
  formatQuickEdit,
  formatShortDate,
  formatTime12,
  parseQuickAdd,
  resolveQuickEdit,
  type TaskDto,
} from '@errandipity/shared';
import { useApp, useLabels } from './context';
import { describeLabels, QuickAddInput } from './QuickAddInput';

/**
 * Edits a task in place with the quick-add line. It starts as the task's title and the
 * symbols for its priority, time, repeat and labels; whatever the line says when Enter
 * is pressed is saved, so taking a symbol out clears that field (see resolveQuickEdit).
 * Changes apply to the task and its future occurrences, except a day symbol, which
 * moves this task only and counts as a reschedule.
 */
export function TaskRowEditor({ task, onDone }: { task: TaskDto; onDone: () => void }) {
  const { today, openEditor, quickEdit } = useApp();
  const userLabels = useLabels().data ?? [];
  // The task's own labels are always known, even before the full list has loaded.
  const labels = [...task.labels, ...userLabels.filter((label) => !task.labels.some((own) => own.id === label.id))];
  const [initialText] = useState(() => formatQuickEdit(task));
  const [text, setText] = useState(initialText);

  const parsed = parseQuickAdd(text, labels);
  const changes = resolveQuickEdit(parsed, task, today);
  const labelNames = labels.filter((label) => changes.labelIds?.includes(label.id)).map((label) => label.name);

  return (
    <QuickAddInput
      text={text}
      onTextChange={setText}
      onSubmit={() => {
        if (Object.keys(changes).length > 0) quickEdit(task, changes);
        onDone();
      }}
      onCancel={onDone}
      onLeave={() => text.trim() === initialText && onDone()}
      inputLabel={`Edit ${task.title}`}
      priority={changes.priority ?? task.priority}
      // Only what will change is listed.
      details={[
        changes.dueDate && `Move to ${formatShortDate(changes.dueDate)}`,
        changes.dueTime !== undefined && (changes.dueTime ? formatTime12(changes.dueTime) : 'No time'),
        changes.recurrence && (describeRecurrence(changes.recurrence) ?? 'Does not repeat'),
        changes.labelIds && (describeLabels(labelNames) ?? 'No labels'),
      ]}
      onMoreOptions={() => {
        openEditor(task);
        onDone();
      }}
    />
  );
}
