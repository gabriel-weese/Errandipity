import { DEFAULT_SETTINGS, type GoalProgress } from '@errandipity/shared';
import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useMatch } from 'react-router';
import { useApp, useProgress, useProjects, useSaveSettings, useSettings } from './context';
import { sectionAnchor } from './ProjectView';
import { accentButtonClass } from './ui';
import { CalendarIcon, CheckCircleIcon, ChevronIcon, FolderIcon, GearIcon, HelpIcon, ListIcon, LogoIcon, PlusIcon, SunIcon, TagIcon } from './icons';

const PROJECTS_PATH = '/projects';

const NAV: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/', label: 'Upcoming', icon: <CalendarIcon /> },
  { to: '/today', label: 'Today', icon: <SunIcon /> },
  { to: '/tasks', label: 'All Tasks', icon: <ListIcon /> },
  { to: '/labels', label: 'Labels', icon: <TagIcon /> },
  { to: PROJECTS_PATH, label: 'Projects', icon: <FolderIcon /> },
  { to: '/completed', label: 'Recently Completed', icon: <CheckCircleIcon /> },
];

/** Below this width the dashboard always shows as the icon rail. */
const NARROW_QUERY = '(max-width: 767px)';

function useIsNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW_QUERY).matches);
  useEffect(() => {
    const media = window.matchMedia(NARROW_QUERY);
    const onChange = () => setNarrow(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return narrow;
}

const itemClass = (active: boolean, collapsed: boolean) =>
  `flex items-center gap-3 rounded-md py-2 text-sm font-medium ${collapsed ? 'justify-center px-0' : 'px-2.5'} ${
    active
      ? 'bg-accent-soft text-accent-ink'
      : 'text-soft hover:bg-raised'
  }`;

const subItemClass = (active: boolean) =>
  `block truncate rounded-md py-1 pr-2 ${active ? 'bg-accent-soft font-medium text-accent-ink' : 'text-soft hover:bg-raised'}`;

/**
 * The projects, listed under the Projects item. The project being viewed lists its
 * sections beneath it; each links to that section on the project's page.
 */
function ProjectLinks() {
  const projects = useProjects().data ?? [];
  const openId = useMatch(`${PROJECTS_PATH}/:id`)?.params.id;
  const { hash } = useLocation();
  if (projects.length === 0) return <p className="py-1 pl-10 text-xs text-faint">No projects yet</p>;
  return (
    <ul aria-label="Projects" className="flex flex-col gap-0.5">
      {projects.map((project) => (
        <li key={project.id}>
          <NavLink
            to={`${PROJECTS_PATH}/${project.id}`}
            title={project.name}
            // With a section selected, the section is the highlighted item.
            className={({ isActive }) => `pl-10 text-sm ${subItemClass(isActive && !hash)}`}
          >
            {project.name}
          </NavLink>
          {project.id === openId && project.sections.length > 0 && (
            <ul aria-label={`Sections of ${project.name}`} className="mt-0.5 flex flex-col gap-0.5">
              {project.sections.map((section) => {
                const anchor = `#${sectionAnchor(section.id)}`;
                return (
                  <li key={section.id}>
                    <NavLink
                      to={`${PROJECTS_PATH}/${project.id}${anchor}`}
                      title={section.name}
                      className={() => `pl-14 text-xs ${subItemClass(hash === anchor)}`}
                    >
                      {section.name}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

function GoalMeter({ label, short, progress, collapsed }: { label: string; short: string; progress: GoalProgress; collapsed: boolean }) {
  const { done, goal } = progress;
  if (goal <= 0) return null;
  const reached = done >= goal;
  const summary = `${label}: ${done} of ${goal} tasks completed`;
  const countClass = reached ? 'text-ok' : '';

  if (collapsed) {
    return (
      <div title={summary} aria-label={summary} className="text-center text-xs leading-tight">
        <div className="text-faint">{short}</div>
        <div className={`font-semibold tabular-nums ${countClass}`}>
          {done}/{goal}
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className={`font-semibold tabular-nums ${countClass}`}>
          {done} / {goal}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={summary}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(done, goal)}
        className="h-1.5 overflow-hidden rounded-full bg-track"
      >
        <div
          className={`h-full rounded-full transition-[width] ${reached ? 'bg-emerald-500' : 'bg-accent'}`}
          style={{ width: `${Math.min(100, (done / goal) * 100)}%` }}
        />
      </div>
    </div>
  );
}

/** The side dashboard: add task, navigation (with the projects and their sections), goal progress and settings. */
export function Sidebar() {
  const { openEditor } = useApp();
  const settings = useSettings().data ?? DEFAULT_SETTINGS;
  const progress = useProgress().data;
  const save = useSaveSettings();
  const narrow = useIsNarrow();
  const collapsed = narrow || settings.sidebarCollapsed;
  const onRight = settings.sidebarSide === 'right';
  // The chevron points the way the panel will move.
  const chevron = collapsed === onRight ? 'left' : 'right';
  const showGoals = progress && (progress.daily.goal > 0 || progress.weekly.goal > 0);

  return (
    <aside
      aria-label="Dashboard"
      className={`sticky top-0 flex h-screen shrink-0 flex-col gap-4 border-line bg-surface py-4 ${
        onRight ? 'border-l' : 'border-r'
      } ${collapsed ? 'w-14 px-2' : 'w-60 px-3'}`}
    >
      <div className={`flex items-center gap-2 ${collapsed ? 'flex-col' : 'pl-1.5'}`}>
        <LogoIcon />
        {!collapsed && <span className="flex-1 text-lg font-bold">Errandipity</span>}
        {!narrow && (
          <button
            type="button"
            onClick={() => save.mutate({ sidebarCollapsed: !settings.sidebarCollapsed })}
            aria-label={collapsed ? 'Expand dashboard' : 'Collapse dashboard'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand dashboard' : 'Collapse dashboard'}
            className="rounded-md p-1.5 text-muted hover:bg-raised"
          >
            <ChevronIcon direction={chevron} />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => openEditor()}
        aria-label="Add Task"
        title={collapsed ? 'Add Task' : undefined}
        className={`flex items-center justify-center gap-2 rounded-md py-2 text-sm ${accentButtonClass} ${
          collapsed ? 'px-0' : 'px-3'
        }`}
      >
        <PlusIcon />
        {!collapsed && 'Add Task'}
      </button>

      <nav aria-label="Views" className="flex min-h-0 flex-col gap-1 overflow-y-auto">
        {NAV.map((item) => {
          const link = (
            <NavLink
              key={item.to}
              to={item.to}
              end
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) => `min-w-0 flex-1 ${itemClass(isActive, collapsed)}`}
            >
              {item.icon}
              {!collapsed && item.label}
            </NavLink>
          );
          // Projects opens like an accordion; the icon rail has no room for the list.
          if (item.to !== PROJECTS_PATH || collapsed) return link;
          const expanded = settings.projectsExpanded;
          return (
            <div key={item.to} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1">
                {link}
                <button
                  type="button"
                  onClick={() => save.mutate({ projectsExpanded: !expanded })}
                  aria-label={expanded ? 'Hide the project list' : 'Show the project list'}
                  aria-expanded={expanded}
                  className="rounded-md p-1.5 text-muted hover:bg-raised"
                >
                  <ChevronIcon direction={expanded ? 'down' : 'right'} size="size-4" />
                </button>
              </div>
              {expanded && <ProjectLinks />}
            </div>
          );
        })}
      </nav>

      {showGoals && (
        <section aria-label="Goals" className={`flex shrink-0 flex-col border-t border-line pt-4 ${collapsed ? 'gap-2' : 'gap-3 px-2.5'}`}>
          {!collapsed && <h2 className="text-xs font-semibold uppercase tracking-wide text-faint">Goals</h2>}
          <GoalMeter label="Today" short="Day" progress={progress.daily} collapsed={collapsed} />
          <GoalMeter label="This week" short="Wk" progress={progress.weekly} collapsed={collapsed} />
        </section>
      )}

      <nav aria-label="Help and settings" className="mt-auto flex flex-col gap-1">
        <NavLink
          to="/help"
          aria-label="Help"
          title={collapsed ? 'Help' : undefined}
          className={({ isActive }) => itemClass(isActive, collapsed)}
        >
          <HelpIcon />
          {!collapsed && 'Help'}
        </NavLink>
        <NavLink
          to="/settings"
          aria-label="Settings"
          title={collapsed ? 'Settings' : undefined}
          className={({ isActive }) => itemClass(isActive, collapsed)}
        >
          <GearIcon />
          {!collapsed && 'Settings'}
        </NavLink>
      </nav>
    </aside>
  );
}
