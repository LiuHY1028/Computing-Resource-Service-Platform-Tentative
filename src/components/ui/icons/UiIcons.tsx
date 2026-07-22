import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const commonProps = {
  'aria-hidden': true,
  fill: 'none',
  focusable: 'false',
  viewBox: '0 0 16 16',
} as const;

export function SearchIcon(props: IconProps) {
  return (
    <svg {...commonProps} {...props}>
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" />
      <path d="m10.5 10.5 3 3" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

export function ClearIcon(props: IconProps) {
  return (
    <svg {...commonProps} {...props}>
      <circle cx="8" cy="8" r="6" fill="currentColor" />
      <path
        d="m6 6 4 4m0-4-4 4"
        stroke="white"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChevronIcon({ direction = 'down', ...props }: IconProps & { direction?: 'up' | 'down' }) {
  return (
    <svg {...commonProps} {...props}>
      <path
        d={direction === 'down' ? 'm4 6 4 4 4-4' : 'm4 10 4-4 4 4'}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...commonProps} {...props}>
      <path
        d="m3.5 8 3 3 6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MinusIcon(props: IconProps) {
  return (
    <svg {...commonProps} {...props}>
      <path d="M4 8h8" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

export function FilterIcon(props: IconProps) {
  return (
    <svg {...commonProps} {...props}>
      <path
        d="M2.5 4h11M4.5 8h7m-5 4h3"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <svg {...commonProps} {...props}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" />
      <path d="M8 7v4" stroke="currentColor" strokeLinecap="round" />
      <circle cx="8" cy="4.5" r=".75" fill="currentColor" />
    </svg>
  );
}
