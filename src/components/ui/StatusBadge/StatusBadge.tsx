import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import './status-badge.css';

export type StatusBadgeTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'error';

export type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> &
  Readonly<{ tone?: StatusBadgeTone; children: ReactNode }>;

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  function StatusBadge(
    { tone = 'neutral', children, className, ...rest },
    ref,
  ) {
    return (
      <span
        {...rest}
        ref={ref}
        className={['ui-status-badge', className].filter(Boolean).join(' ')}
        data-tone={tone}
      >
        <span aria-hidden="true" />
        {children}
      </span>
    );
  },
);
