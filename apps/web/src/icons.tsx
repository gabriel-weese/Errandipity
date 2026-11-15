import type { ReactNode } from 'react';

interface IconProps {
  /** Tailwind size class; defaults to the dashboard size. */
  size?: string;
}

function Icon({ children, strokeWidth = 2, size = 'size-5' }: IconProps & { children: ReactNode; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${size} shrink-0`}
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

export const PlusIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const CalendarIcon = (props: IconProps) => (
  <Icon {...props}>
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

/** A bare tick, drawn heavier so it stays clear at small sizes. */
export const CheckIcon = (props: IconProps) => (
  <Icon strokeWidth={4} {...props}>
    <path d="M5 13l4 4L19 7" />
  </Icon>
);

export const HelpIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8M12 17h.01" />
  </Icon>
);

const CHEVRON_PATHS = { left: 'M15 6l-6 6 6 6', right: 'M9 6l6 6-6 6', down: 'M6 9l6 6 6-6' };

export const ChevronIcon = ({ direction, ...props }: IconProps & { direction: keyof typeof CHEVRON_PATHS }) => (
  <Icon {...props}>
    <path d={CHEVRON_PATHS[direction]} />
  </Icon>
);

export const FolderIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
  </Icon>
);

export const GearIcon = () => (
  <Icon strokeWidth={1.8}>
    <path d="M19.7 10.5L22.4 10.8L22.4 13.2L19.7 13.5L18.5 16.3L20.2 18.5L18.5 20.2L16.3 18.5L13.5 19.7L13.2 22.4L10.8 22.4L10.5 19.7L7.7 18.5L5.5 20.2L3.8 18.5L5.5 16.3L4.3 13.5L1.6 13.2L1.6 10.8L4.3 10.5L5.5 7.7L3.8 5.5L5.5 3.8L7.7 5.5L10.5 4.3L10.8 1.6L13.2 1.6L13.5 4.3L16.3 5.5L18.5 3.8L20.2 5.5L18.5 7.7Z" />
    <circle cx="12" cy="12" r="3.2" />
  </Icon>
);

export const FlagIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
  </Icon>
);

export const EditIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
  </Icon>
);

export const TagIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 12V4h8l10 10-8 8L3 12z" />
    <path d="M7.5 8h.01" />
  </Icon>
);

export const ClockIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);

/** The site icon: a completed errand with a spark of serendipity. Matches public/favicon.svg. */
export const LogoIcon = ({ size = 'size-7' }: IconProps) => (
  <svg viewBox="0 0 32 32" className={`${size} shrink-0`} role="img" aria-label="Errandipity">
    {/* The faint outline keeps the icon visible on the Dusk theme, whose background is the same colour. */}
    <rect x="0.5" y="0.5" width="31" height="31" rx="6.5" fill="#413C58" stroke="#B7B6C2" strokeOpacity="0.45" />
    <path d="M7.5 17.5l5.5 5.5 8.5-9.5" fill="none" stroke="#D1D5DE" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M24.5 3.5c.4 2.8 1.2 3.6 4 4-2.8.4-3.6 1.2-4 4-.4-2.8-1.2-3.6-4-4 2.8-.4 3.6-1.2 4-4z" fill="#D1D5DE" />
  </svg>
);
