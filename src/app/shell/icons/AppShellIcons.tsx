import type { PropsWithChildren, SVGProps } from 'react';
import type { NavigationIconName } from '../navigation';

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'>;

function IconFrame({ children, ...props }: PropsWithChildren<IconProps>) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function NavigationIcon({ name, ...props }: IconProps & { name: NavigationIconName }) {
  if (name === 'marketplace') {
    return (
      <IconFrame {...props}>
        <path d="M3 8.2h14v8.3H3z" />
        <path d="m4 3.5-1 4.7h14l-1-4.7H4Z" />
        <path d="M7.3 11.2v5.3M12.7 11.2v5.3" />
      </IconFrame>
    );
  }

  if (name === 'resources') {
    return (
      <IconFrame {...props}>
        <rect x="3" y="3.5" width="14" height="5" rx="1" />
        <rect x="3" y="11.5" width="14" height="5" rx="1" />
        <path d="M6 6h.1M6 14h.1M9 6h5M9 14h5" />
      </IconFrame>
    );
  }

  if (name === 'storage') {
    return (
      <IconFrame {...props}>
        <ellipse cx="10" cy="4.8" rx="6.5" ry="2.3" />
        <path d="M3.5 4.8v5c0 1.3 2.9 2.3 6.5 2.3s6.5-1 6.5-2.3v-5" />
        <path d="M3.5 9.8v5c0 1.3 2.9 2.3 6.5 2.3s6.5-1 6.5-2.3v-5" />
      </IconFrame>
    );
  }

  if (name === 'images') {
    return (
      <IconFrame {...props}>
        <rect x="3" y="3" width="14" height="14" rx="2" />
        <circle cx="7" cy="7" r="1.3" />
        <path d="m5 14 3.4-3.4 2.3 2.2 1.8-1.8 2.5 3" />
      </IconFrame>
    );
  }

  if (name === 'software') {
    return (
      <IconFrame {...props}>
        <rect x="3" y="4" width="14" height="12" rx="2" />
        <path d="M3 8h14M7 4v4" />
        <path d="m8 11 2 2 3-3" />
      </IconFrame>
    );
  }

  if (name === 'network') {
    return (
      <IconFrame {...props}>
        <circle cx="10" cy="4" r="2" />
        <circle cx="4" cy="15" r="2" />
        <circle cx="16" cy="15" r="2" />
        <path d="M10 6v3M4 13v-2h12v2" />
      </IconFrame>
    );
  }

  if (name === 'operations') {
    return (
      <IconFrame {...props}>
        <path d="M5 4h10M5 10h10M5 16h10" />
        <circle cx="3" cy="4" r=".7" fill="currentColor" stroke="none" />
        <circle cx="3" cy="10" r=".7" fill="currentColor" stroke="none" />
        <circle cx="3" cy="16" r=".7" fill="currentColor" stroke="none" />
      </IconFrame>
    );
  }

  return (
    <IconFrame {...props}>
      <path d="M4 3.5h9l3 3v10H4z" />
      <path d="M13 3.5v3h3M7 10h6M7 13h5" />
    </IconFrame>
  );
}

export function MessageIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M4 4.5h12a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 16 14.5H9l-4 2v-2H4A1.5 1.5 0 0 1 2.5 13V6A1.5 1.5 0 0 1 4 4.5Z" />
      <path d="M6.5 9.5h.1M10 9.5h.1M13.5 9.5h.1" />
    </IconFrame>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <circle cx="10" cy="7" r="3" />
      <path d="M4.5 16.5c.6-3 2.4-4.5 5.5-4.5s4.9 1.5 5.5 4.5" />
    </IconFrame>
  );
}

export function ChevronIcon({ direction = 'right', ...props }: IconProps & { direction?: 'right' | 'down' }) {
  return (
    <IconFrame {...props}>
      <path d={direction === 'down' ? 'm6 8 4 4 4-4' : 'm8 6 4 4-4 4'} />
    </IconFrame>
  );
}

export function CollapseIcon({ collapsed, ...props }: IconProps & { collapsed: boolean }) {
  return (
    <IconFrame {...props}>
      <path d="M4 5h12M4 10h8M4 15h12" />
      <path d={collapsed ? 'm13 8 2 2-2 2' : 'm11 8-2 2 2 2'} />
    </IconFrame>
  );
}
