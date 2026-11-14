import type { ReactNode } from 'react';

function Icon({ children, strokeWidth = 2 }: { children: ReactNode; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const PlusIcon = () => (
  <Icon>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const CalendarIcon = () => (
  <Icon>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Icon>
);

export const SunIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
);

export const ListIcon = () => (
  <Icon>
    <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
  </Icon>
);

export const CheckCircleIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l3 3 5-6" />
  </Icon>
);

export const HelpIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8M12 17h.01" />
  </Icon>
);

export const ChevronIcon =({ direction }: { direction: 'left' | 'right' }) => (
  <Icon>
    <path d={direction === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
  </Icon>
);

export const GearIcon = () => (
  <Icon strokeWidth={1.8}>
    <path d="M19.7 10.5L22.4 10.8L22.4 13.2L19.7 13.5L18.5 16.3L20.2 18.5L18.5 20.2L16.3 18.5L13.5 19.7L13.2 22.4L10.8 22.4L10.5 19.7L7.7 18.5L5.5 20.2L3.8 18.5L5.5 16.3L4.3 13.5L1.6 13.2L1.6 10.8L4.3 10.5L5.5 7.7L3.8 5.5L5.5 3.8L7.7 5.5L10.5 4.3L10.8 1.6L13.2 1.6L13.5 4.3L16.3 5.5L18.5 3.8L20.2 5.5L18.5 7.7Z" />
    <circle cx="12" cy="12" r="3.2" />
  </Icon>
);
