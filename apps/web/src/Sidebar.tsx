import { DEFAULT_SETTINGS, type GoalProgress } from '@errandipity/shared';
import { useEffect, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router';
import { useApp, useProgress, useSaveSettings, useSettings } from './context';
import { CalendarIcon, CheckCircleIcon, ChevronIcon, GearIcon, HelpIcon, ListIcon, PlusIcon, SunIcon } from './icons';

const NAV: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/', label: 'Upcoming', icon: <CalendarIcon /> },
  { to: '/today', label: 'Today', icon: <SunIcon /> },
  { to: '/tasks', label: 'All Tasks', icon: <ListIcon /> },
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
      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
  }`;

function GoalMeter({ label, short, progress, collapsed }: { label: string; short: string; progress: GoalProgress; collapsed: boolean }) {
  const { done, goal } = progress;
  if (goal <= 0) return null;
  const reached = done >= goal;
  const summary = `${label}: ${done} of ${goal} tasks completed`;
  const countClass = reached ? 'text-emerald-600 dark:text-emerald-400' : '';

  if (collapsed) {
    return (
      <div title={summary} aria-label={summary} className="text-center text-xs leading-tight">
        <div className="text-slate-400 dark:text-slate-500">{short}</div>
        <div className={`font-semibold tabular-nums ${countClass}`}>
          {done}/{goal}
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400">{label}</span>
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
        className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
      >
        <div
          className={`h-full rounded-full transition-[width] ${reached ? 'bg-emerald-500' : 'bg-indigo-500'}`}
          style={{ width: `${Math.min(100, (done / goal) * 100)}%` }}
        />
      </div>
    </div>
  );
}

/** The side dashboard: add task, navigation, goal progress and settings. */
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
      className={`sticky top-0 flex h-screen shrink-0 flex-col gap-4 border-slate-200 bg-white py-4 dark:border-slate-700 dark:bg-slate-800 ${
        onRight ? 'border-l' : 'border-r'
      } ${collapsed ? 'w-14 px-2' : 'w-60 px-3'}`}
    >
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between pl-2.5'}`}>
        {!collapsed && <span className="text-lg font-bold">Errandipity</span>}
        {!narrow && (
          <button
            type="button"
            onClick={() => save.mutate({ sidebarCollapsed: !settings.sidebarCollapsed })}
            aria-label={collapsed ? 'Expand dashboard' : 'Collapse dashboard'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand dashboard' : 'Collapse dashboard'}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
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
        className={`flex items-center justify-center gap-2 rounded-md bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 ${
          collapsed ? 'px-0' : 'px-3'
        }`}
      >
        <PlusIcon />
        {!collapsed && 'Add Task'}
      </button>

      <nav aria-label="Views" className="flex flex-col gap-1">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            aria-label={item.label}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) => itemClass(isActive, collapsed)}
          >
            {item.icon}
            {!collapsed && item.label}
          </NavLink>
        ))}
      </nav>

      {showGoals && (
        <section aria-label="Goals" className={`flex flex-col border-t border-slate-200 pt-4 dark:border-slate-700 ${collapsed ? 'gap-2' : 'gap-3 px-2.5'}`}>
          {!collapsed && <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Goals</h2>}
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
