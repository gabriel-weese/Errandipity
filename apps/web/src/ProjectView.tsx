import {
  projectSortSchema,
  sortProjectTasks,
  type ProjectDto,
  type SectionDto,
  type TaskDto,
  type UpdateProjectInput,
} from '@errandipity/shared';
import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { AddLine } from './AddLine';
import { useApp, useProjectActions, useProjectCompleted, useProjects, usePendingTasks } from './context';
import { DateField } from './PickerFields';
import { TaskList } from './TaskRow';
import { cardClass, CollapseButton, fieldClass, labelClass, ProgressBar, QueryState } from './ui';
import { CompletedRow } from './views';

/** The element id a section is reached by, from the dashboard's section links. */
export const sectionAnchor = (sectionId: string) => `section-${sectionId}`;

const dangerButtonClass = 'rounded bg-red-600 px-2 py-1 text-sm font-medium text-white hover:bg-red-700';

/**
 * Text that is edited in place and saved when the field is left. `save` rejecting
 * (or returning false for text that cannot be saved) puts the saved text back.
 */
function useSavedText(saved: string, save: (text: string) => Promise<unknown> | false) {
  const [text, setText] = useState(saved);
  useEffect(() => setText(saved), [saved]);
  return {
    value: text,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setText(event.target.value),
    onBlur: () => {
      if (text === saved) return;
      const result = save(text);
      if (result === false) setText(saved);
      else result.catch(() => setText(saved));
    },
  };
}

/** An input that reads as a heading until it is hovered or focused. */
const headingInputClass =
  'min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 hover:border-line focus:border-line-strong focus:bg-field';

const SORT_NAMES = { priority: 'Priority, then due date and time', date: 'Due date and time, then priority' } as const;

/**
 * The project's name and its information card. Folded, the card keeps only the progress
 * bar and the target date.
 */
function ProjectHeader({ project }: { project: ProjectDto }) {
  const { today } = useApp();
  const navigate = useNavigate();
  const { update, remove } = useProjectActions();
  const [confirming, setConfirming] = useState(false);
  const save = (changes: UpdateProjectInput) => update.mutateAsync({ id: project.id, ...changes });
  /** For changes whose failure is shown under the card and needs nothing put back. */
  const saveQuietly = (changes: UpdateProjectInput) => void save(changes).catch(() => undefined);

  const name = useSavedText(project.name, (text) => (text.trim() ? save({ name: text.trim() }) : false));
  const objective = useSavedText(project.objective, (text) => save({ objective: text }));
  const description = useSavedText(project.description, (text) => save({ description: text }));
  const error = update.error ?? remove.error;
  const expanded = !project.detailsCollapsed;

  return (
    <header className="space-y-4">
      <div className="flex items-center gap-1">
        <CollapseButton
          expanded={expanded}
          name="the project information"
          onToggle={() => saveQuietly({ detailsCollapsed: expanded })}
        />
        <input
          aria-label="Project name"
          maxLength={80}
          {...name}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className={`text-xl font-bold ${headingInputClass}`}
        />
        {confirming ? (
          <>
            <span className="text-sm text-danger-ink">
              Delete this project and {project.total === 1 ? 'its 1 task' : `all ${project.total} of its tasks`}, completed
              ones included?
            </span>
            <button
              type="button"
              disabled={remove.isPending}
              // Not mutate's onSuccess option: this header is gone, and the option with it, as soon
              // as the project list reloads. A failure is shown below.
              onClick={() => void remove.mutateAsync(project.id).then(() => navigate('/projects'), () => undefined)}
              className={dangerButtonClass}
            >
              Delete
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="px-2 py-1 text-sm text-soft">
              Keep
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="text-sm text-danger hover:underline">
            Delete project
          </button>
        )}
      </div>

      <div className={`space-y-4 p-4 ${cardClass}`}>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div className="min-w-48 flex-1 pb-1.5">
            <ProgressBar done={project.done} total={project.total} />
          </div>
          <label className={labelClass}>
            Target date
            <DateField
              name="Target date"
              value={project.targetDate}
              today={today}
              hideShortcuts
              onChange={(targetDate) => saveQuietly({ targetDate })}
            />
          </label>
        </div>
        {expanded && (
          <>
            <label className={`items-start ${labelClass}`}>
              Sort tasks by
              <select
                className={fieldClass}
                value={project.sortOrder}
                onChange={(e) => saveQuietly({ sortOrder: projectSortSchema.parse(e.target.value) })}
              >
                {projectSortSchema.options.map((order) => (
                  <option key={order} value={order}>
                    {SORT_NAMES[order]}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Objective
              <textarea
                className={fieldClass}
                rows={2}
                maxLength={500}
                placeholder="What this project is meant to achieve"
                {...objective}
              />
            </label>
            <label className={labelClass}>
              Description
              <textarea
                className={fieldClass}
                rows={5}
                maxLength={5000}
                placeholder="Supporting information: background, links, decisions"
                {...description}
              />
            </label>
          </>
        )}
        {error && <p className="text-sm text-danger">{error.message}</p>}
      </div>
    </header>
  );
}

interface FoldProps {
  /** For the dashboard's section links. */
  id?: string;
  /** What the arrow folds, for its accessible name: "section Design". */
  name: string;
  expanded: boolean;
  onToggle: () => void;
  /** The heading itself: text, or an input that renames it. */
  heading: ReactNode;
  /** How many items are inside, shown while folded. */
  count: number;
  /** Controls at the end of the heading row. */
  action?: ReactNode;
  children: ReactNode;
}

/** A part of the project's page under a heading with an arrow that folds it away. */
function Fold({ id, name, expanded, onToggle, heading, count, action, children }: FoldProps) {
  return (
    <section id={id} className="scroll-mt-4">
      <div className="mb-2 flex items-center gap-1">
        <CollapseButton expanded={expanded} name={name} onToggle={onToggle} />
        {heading}
        {!expanded && (
          <span className="shrink-0 text-xs text-muted">
            {count} {count === 1 ? 'task' : 'tasks'}
          </span>
        )}
        {action}
      </div>
      {expanded && children}
    </section>
  );
}

const foldHeadingClass = 'flex-1 px-1 text-sm font-semibold text-ink';

interface SectionBlockProps {
  project: ProjectDto;
  section: SectionDto;
  tasks: TaskDto[];
}

/** One section: a heading that can be renamed in place, folded or deleted, and its tasks. */
function SectionBlock({ project, section, tasks }: SectionBlockProps) {
  const { updateSection, removeSection } = useProjectActions();
  const [confirming, setConfirming] = useState(false);
  const name = useSavedText(section.name, (text) =>
    text.trim() ? updateSection.mutateAsync({ id: section.id, name: text.trim() }) : false,
  );
  const error = updateSection.error ?? removeSection.error;

  return (
    <Fold
      id={sectionAnchor(section.id)}
      name={`section ${section.name}`}
      expanded={!section.collapsed}
      onToggle={() => updateSection.mutate({ id: section.id, collapsed: !section.collapsed })}
      count={tasks.length}
      heading={
        <input
          aria-label={`Name of section ${section.name}`}
          maxLength={80}
          {...name}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className={`text-sm font-semibold ${headingInputClass}`}
        />
      }
      action={
        confirming ? (
          <>
            <span className="text-sm text-danger-ink">Delete this section? Its tasks stay in the project.</span>
            <button type="button" onClick={() => removeSection.mutate(section.id)} className={dangerButtonClass}>
              Delete
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="px-2 py-1 text-sm text-soft">
              Keep
            </button>
          </>
        ) : (
          <button
            type="button"
            aria-label={`Delete section ${section.name}`}
            onClick={() => setConfirming(true)}
            className="ml-2 text-sm text-danger hover:underline"
          >
            Delete
          </button>
        )
      }
    >
      {error && <p className="mb-2 text-sm text-danger">{error.message}</p>}
      <TaskList tasks={tasks} showDate hideProject addTo={{ projectId: project.id, sectionId: section.id }} />
    </Fold>
  );
}

/** The project's completed tasks, newest first. Loaded only while the list is unfolded. */
function CompletedTasks({ projectId }: { projectId: string }) {
  const query = useProjectCompleted(projectId);
  return (
    <QueryState query={query}>
      <ul className={cardClass}>
        {(query.data ?? []).map((task) => (
          <CompletedRow key={task.id} task={task} />
        ))}
      </ul>
    </QueryState>
  );
}

/**
 * One project: its information, then its pending tasks by section, a line to add a
 * section, and the completed tasks. Tasks without a section (their section was deleted,
 * or none was chosen in the task form) are listed first under "Tasks"; new tasks are
 * added inside a section.
 */
export function ProjectView() {
  const { id } = useParams();
  const { hash } = useLocation();
  const projectsQuery = useProjects();
  const tasksQuery = usePendingTasks();
  const { update, addSection } = useProjectActions();
  const project = projectsQuery.data?.find((candidate) => candidate.id === id);
  const loaded = project !== undefined && !tasksQuery.isPending;

  // Follow a link to a section (#section-…) once the section is on the page.
  useEffect(() => {
    if (loaded && hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [loaded, hash]);

  const tasks = (tasksQuery.data ?? []).filter((task) => task.project?.id === id);
  const inSection = (sectionId: string | null) =>
    sortProjectTasks(tasks.filter((task) => task.sectionId === sectionId), project?.sortOrder ?? 'priority');
  const unfiled = inSection(null);

  return (
    <QueryState
      query={{
        isPending: projectsQuery.isPending || tasksQuery.isPending,
        error: projectsQuery.error ?? tasksQuery.error,
      }}
    >
      {!project ? (
        <p className="text-sm text-muted">
          This project no longer exists. Back to{' '}
          <Link to="/projects" className="font-medium text-accent-ink hover:underline">
            Projects
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-6">
          <ProjectHeader project={project} />

          {unfiled.length > 0 && (
            <Fold
              name="the tasks without a section"
              expanded={!project.tasksCollapsed}
              onToggle={() => update.mutate({ id: project.id, tasksCollapsed: !project.tasksCollapsed })}
              count={unfiled.length}
              heading={<h2 className={foldHeadingClass}>Tasks</h2>}
            >
              <TaskList tasks={unfiled} showDate hideProject />
            </Fold>
          )}
          {project.sections.map((section) => (
            <SectionBlock key={section.id} project={project} section={section} tasks={inSection(section.id)} />
          ))}

          <div className="space-y-2">
            {project.sections.length === 0 && (
              <p className="text-sm text-muted">
                {unfiled.length === 0
                  ? 'This project has no sections yet. Add a section to start adding tasks.'
                  : 'Add a section to add more tasks.'}
              </p>
            )}
            <div className={cardClass}>
              <AddLine
                label="Add section"
                placeholder="Section name"
                onAdd={(name) => addSection.mutateAsync({ projectId: project.id, name })}
              />
            </div>
            {addSection.error && <p className="text-sm text-danger">{addSection.error.message}</p>}
          </div>

          {project.done > 0 && (
            <Fold
              name="the completed tasks"
              expanded={!project.completedCollapsed}
              onToggle={() => update.mutate({ id: project.id, completedCollapsed: !project.completedCollapsed })}
              count={project.done}
              heading={<h2 className={foldHeadingClass}>Completed</h2>}
            >
              <CompletedTasks projectId={project.id} />
            </Fold>
          )}
        </div>
      )}
    </QueryState>
  );
}
