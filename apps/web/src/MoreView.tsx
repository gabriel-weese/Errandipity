import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useProgress } from './context';
import { CheckCircleIcon, ChevronIcon, GearIcon, HelpIcon, ListIcon, TagIcon } from './icons';
import { GoalMeter } from './Sidebar';
import { cardClass } from './ui';

const LINKS: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/tasks', label: 'All Tasks', icon: <ListIcon /> },
  { to: '/labels', label: 'Labels', icon: <TagIcon /> },
  { to: '/completed', label: 'Recently Completed', icon: <CheckCircleIcon /> },
  { to: '/help', label: 'Help', icon: <HelpIcon /> },
  { to: '/settings', label: 'Settings', icon: <GearIcon /> },
];

/**
 * The phone layout's fourth tab: the views that have no tab of their own, and the goal
 * progress the side dashboard shows on a wide screen.
 */
export function MoreView() {
  const progress = useProgress().data;
  const showGoals = progress && (progress.daily.goal > 0 || progress.weekly.goal > 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">More</h1>
      <ul className={cardClass}>
        {LINKS.map((link) => (
          <li key={link.to} className="border-b border-line-soft last:border-b-0">
            <Link to={link.to} className="flex min-h-12 items-center gap-3 px-3 text-sm font-medium text-soft hover:bg-raised">
              {link.icon}
              <span className="flex-1">{link.label}</span>
              <ChevronIcon direction="right" size="size-4" />
            </Link>
          </li>
        ))}
      </ul>
      {showGoals && (
        <section aria-label="Goals" className={`space-y-3 p-4 ${cardClass}`}>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-faint">Goals</h2>
          <GoalMeter label="Today" short="Day" progress={progress.daily} collapsed={false} />
          <GoalMeter label="This week" short="Wk" progress={progress.weekly} collapsed={false} />
        </section>
      )}
    </div>
  );
}
