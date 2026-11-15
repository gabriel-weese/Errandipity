import { formatUsDate, type ProjectDto } from '@errandipity/shared';
import { Link } from 'react-router';
import { AddLine } from './AddLine';
import { useProjectActions, useProjects } from './context';
import { cardClass, ProgressBar, QueryState } from './ui';

function ProjectCard({ project }: { project: ProjectDto }) {
  return (
    <li>
      <Link to={`/projects/${project.id}`} className={`block space-y-2 p-4 hover:bg-raised ${cardClass}`}>
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 className="flex-1 font-semibold">{project.name}</h2>
          {project.targetDate && <span className="text-xs text-muted">Target {formatUsDate(project.targetDate)}</span>}
        </div>
        {project.objective && <p className="line-clamp-2 whitespace-pre-line text-sm text-muted">{project.objective}</p>}
        <ProgressBar done={project.done} total={project.total} />
      </Link>
    </li>
  );
}

/** Every project, with its objective, target date and how many of its tasks are completed. */
export function ProjectsView() {
  const query = useProjects();
  const projects = query.data ?? [];
  const { create } = useProjectActions();

  return (
    <QueryState query={query}>
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Projects</h1>
        <div className={cardClass}>
          <AddLine label="Add project" placeholder="Project name" onAdd={(name) => create.mutateAsync({ name })} />
        </div>
        {create.error && <p className="text-sm text-danger">{create.error.message}</p>}
        {projects.length === 0 ? (
          <p className="text-sm text-muted">No projects yet. A project groups the tasks that lead to one goal.</p>
        ) : (
          <ul className="space-y-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </ul>
        )}
      </div>
    </QueryState>
  );
}
