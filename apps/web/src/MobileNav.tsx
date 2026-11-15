import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router';
import { useApp } from './context';
import { CalendarIcon, FolderIcon, MoreIcon, PlusIcon, SunIcon } from './icons';
import { accentButtonClass } from './ui';

export const MORE_PATH = '/more';

/** Each tab and the paths it is lit for; anything not listed belongs to More. */
const TABS: { to: string; label: string; icon: ReactNode; owns: (path: string) => boolean }[] = [
  { to: '/', label: 'Upcoming', icon: <CalendarIcon />, owns: (path) => path === '/' },
  { to: '/today', label: 'Today', icon: <SunIcon />, owns: (path) => path === '/today' },
  { to: '/projects', label: 'Projects', icon: <FolderIcon />, owns: (path) => path.startsWith('/projects') },
];

const tabClass = (active: boolean) =>
  `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
    active ? 'text-accent-ink' : 'text-muted'
  }`;

/**
 * Navigation for phones, in place of the side dashboard: a tab bar along the bottom and
 * a round "add task" button above it. The views that have no tab are listed on the More page.
 */
export function MobileNav() {
  const { openEditor } = useApp();
  const { pathname } = useLocation();
  const onMore = !TABS.some((tab) => tab.owns(pathname));

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => openEditor()}
        aria-label="Add Task"
        className={`fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-30 flex size-14 items-center justify-center rounded-full shadow-lg ${accentButtonClass}`}
      >
        <PlusIcon size="size-6" />
      </button>
      <nav
        aria-label="Views"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
      >
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} className={tabClass(tab.owns(pathname))}>
            {tab.icon}
            {tab.label}
          </NavLink>
        ))}
        <NavLink to={MORE_PATH} className={tabClass(onMore)}>
          <MoreIcon />
          More
        </NavLink>
      </nav>
    </div>
  );
}
