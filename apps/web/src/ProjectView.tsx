import {
  projectSortSchema,
  sortProjectTasks,
  type ProjectDto,
  type SectionDto,
  type TaskDto,
  type UpdateProjectInput,
} from '@errandipity/shared';
import { useEffect, useState, type ChangeEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { AddLine } from './AddLine';
import { useProjectActions, useProjectCompleted, useProjects, usePendingTasks } from './context';
import { TaskList } from './TaskRow';
import { cardClass, fieldClass, labelClass, ProgressBar, QueryState } from './ui';
import { CompletedRow, Section } from './views';

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

function ProjectHeader({ project }: { project: ProjectDto }) {
  const navigate = useNavigate();
  const { update, remove } = useProjectActions();
  const [confirming, setConfirming] = useState(false);
  const save = (changes: UpdateProjectInput) => update.mutateAsync({ id: project.id, ...changes });

  const name = useSavedText(project.name, (text) => (text.trim() ? save({ name: text.trim() }) : false));
  const objective = useSavedText(project.objective, (text) => save({ objective: text }));
  const description = useSavedText(project.description, (text) => save({ description: text }));
  const error = update.error ?? remove.error;

  return (
    <header className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          aria-label="Project name"
          maxLength={80}
          {...name}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className={`-ml-1 text-xl font-bold ${headingInputClass}`}
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
        <ProgressBar done={project.done} total={project.total} />
        <div className="flex flex-wrap gap-3">
          <label className={labelClass}>
            Target date
            <input
              type="date"
              className={fieldClass}
              value={project.targetDate ?? ''}
              onChange={(e) => void save({ targetDate: e.target.value || null }).catch(() => undefined)}
            />
          </label>
          <label className={labelClass}>
            Sort tasks by
            <select
              className={fieldClass}
              value={project.sortOrder}
              onChange={(e) => void save({ sortOrder: projectSortSchema.parse(e.target.value) }).catch(() => undefined)}
            >
              {projectSortSchema.options.map((order) => (
                <option key={order} value={order}>
                  {SORT_NAMES[order]}
                </option>
              ))}
            </select>
          </label>
        </div>
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
        {error && <p className="text-sm text-danger">{error.message}</p>}
      </div>
    </header>
  );
}

interface SectionBlockProps {
  project: ProjectDto;
  section: SectionDto;
  tasks: TaskDto[];
}

/** One section: a heading that can be renamed in place or deleted, and its tasks. */
function SectionBlock({ project, section, tasks }: SectionBlockProps) {
  const { renameSection, removeSection } = useProjectActions();
  const [confirming, setConfirming] = useState(false);
  const name = useSavedText(section.name, (text) =>
    text.trim() ? renameSection.mutateAsync({ id: section.id, name: text.trim() }) : false,
  );
  const error = renameSection.error ?? removeSection.error;

  return (
    <section id={sectionAnchor(section.id)} className="scroll-mt-4">
      <div className="mb-2 flex items-center gap-2">
        <input
          aria-label={`Name of section ${section.name}`}
          maxLength={80}
          {...name}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className={`-ml-1 text-sm font-semibold ${headingInputClass}`}
        />
        {confirming ? (
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
            className="text-sm text-danger hover:underline"
          >
            Delete
          </button>
        )}
      </div>
      {error && <p className="mb-2 text-sm text-danger">{error.message}</p>}
      <TaskList tasks={tasks} showDate hideProject addTo={{ projectId: project.id, sectionId: section.id }} />
    </section>
  );
}

/** The project's completed tasks, newest first. Renders nothing until one is completed. */
function CompletedList({ projectId }: { projectId: string }) {
  const tasks = useProjectCompleted(projectId).data ?? [];
  const [shown, setShown] = useState(true);
  if (tasks.length === 0) return null;
  return (
    <Section
      title={`Completed (${tasks.length})`}
      action={
        <button
          type="button"
          aria-expanded={shown}
          onClick={() => setShown(!shown)}
          className="text-sm font-medium text-accent-ink hover:underline"
        >
          {shown ? 'Hide' : 'Show'}
        </button>
      }
    >
      {shown && (
        <ul className={cardClass}>
          {tasks.map((task) => (
            <CompletedRow key={task.id} task={task} />
          ))}
        </ul>
      )}
    </Section>
  );
}

/**
 * One project: its details, then its pending tasks by section (those without a section
 * first), a line to add a section, and the completed tasks.
 */
export function ProjectView() {
  const { id } = useParams();
  const { hash } = useLocation();
  const projectsQuery = useProjects();
  const tasksQuery = usePendingTasks();
  const { addSection } = useProjectActions();
  const project = projectsQuery.data?.find((candidate) => candidate.id === id);
  const loaded = project !== undefined && !tasksQuery.isPending;

  // Follow a link to a section (#section-…) once the section is on the page.
  useEffect(() => {
    if (loaded && hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [loaded, hash]);

  const tasks = (tasksQuery.data ?? []).filter((task) => task.project?.id === id);
  const inSection = (sectionId: string | null) =>
    sortProjectTasks(tasks.filter((task) => task.sectionId === sectionId), project?.sortOrder ?? 'priority');

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

          <Section title={project.sections.length > 0 ? 'No section' : 'Tasks'}>
            <TaskList tasks={inSection(null)} showDate hideProject addTo={{ projectId: project.id, sectionId: null }} />
          </Section>
          {project.sections.map((section) => (
            <SectionBlock key={section.id} project={project} section={section} tasks={inSection(section.id)} />
          ))}

          <div>
            <div className={cardClass}>
              <AddLine
                label="Add section"
                placeholder="Section name"
                onAdd={(name) => addSection.mutateAsync({ projectId: project.id, name })}
              />
            </div>
            {addSection.error && <p className="mt-2 text-sm text-danger">{addSection.error.message}</p>}
          </div>

          <CompletedList projectId={project.id} />
        </div>
      )}
    </QueryState>
  );
}
