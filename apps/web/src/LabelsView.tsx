import { formatDayHeading, sortDayTasks, sortProjectTasks, type IsoDate } from '@errandipity/shared';
import { Link, useSearchParams } from 'react-router';
import { useApp, useLabels, usePendingTasks } from './context';
import { TaskList } from './TaskRow';
import { LabelToggle, QueryState } from './ui';
import { OverdueSection, Section } from './views';

/**
 * Pending tasks that carry any of the chosen labels, by day in date order. Unlike
 * Upcoming, only days that have such a task are shown. Tasks without a date follow, if
 * they are in a project; one with neither appears only in All Tasks. The choice is kept
 * in the address (?ids=a,b), so a selection can be bookmarked.
 */
export function LabelsView() {
  const { today } = useApp();
  const labelsQuery = useLabels();
  const tasksQuery = usePendingTasks();
  const [params, setParams] = useSearchParams();

  const labels = labelsQuery.data ?? [];
  // Ids of labels that have since been deleted are dropped.
  const selected = (params.get('ids') ?? '').split(',').filter((id) => labels.some((label) => label.id === id));
  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((other) => other !== id) : [...selected, id];
    setParams(next.length ? { ids: next.join(',') } : {}, { replace: true });
  };

  const labelled = (tasksQuery.data ?? []).filter((task) => task.labels.some((label) => selected.includes(label.id)));
  const undated = sortProjectTasks(labelled.filter((task) => task.dueDate === null && task.project), 'priority');
  const tasks = labelled.filter((task) => task.dueDate !== null || task.project);
  const upcoming = tasks.filter((task) => task.dueDate !== null && task.dueDate >= today);
  const days = [...new Set(upcoming.flatMap((task): IsoDate[] => (task.dueDate ? [task.dueDate] : [])))].sort();

  return (
    <QueryState
      query={{
        isPending: labelsQuery.isPending || tasksQuery.isPending,
        error: labelsQuery.error ?? tasksQuery.error,
      }}
    >
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Labels</h1>

        {labels.length === 0 ? (
          <p className="text-sm text-muted">
            You have no labels yet. Create some in{' '}
            <Link to="/settings" className="font-medium text-accent-ink hover:underline">
              Settings
            </Link>
            .
          </p>
        ) : (
          <div role="group" aria-label="Labels to show" className="flex flex-wrap gap-1.5">
            {labels.map((label) => (
              <LabelToggle key={label.id} label={label} active={selected.includes(label.id)} onToggle={() => toggle(label.id)} />
            ))}
          </div>
        )}

        {labels.length > 0 && selected.length === 0 && (
          <p className="text-sm text-muted">Choose one or more labels to see their tasks.</p>
        )}
        {selected.length > 0 && tasks.length === 0 && (
          <p className="text-sm text-muted">
            No tasks with {selected.length === 1 ? 'this label' : 'these labels'}.
          </p>
        )}

        <OverdueSection tasks={tasks} />
        {days.map((date) => (
          <Section key={date} title={formatDayHeading(date, today)}>
            <TaskList
              tasks={sortDayTasks(upcoming.filter((task) => task.dueDate === date))}
              addDate={date}
              addLabelIds={selected}
            />
          </Section>
        ))}
        {undated.length > 0 && (
          <Section title="No date">
            <TaskList tasks={undated} />
          </Section>
        )}
      </div>
    </QueryState>
  );
}
