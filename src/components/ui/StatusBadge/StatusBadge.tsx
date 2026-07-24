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
    const mark = tone === 'success'
      ? '✓'
      : tone === 'warning'
        ? '!'
        : tone === 'error'
          ? '×'
          : tone === 'info'
            ? 'i'
            : '–';
    return (
      <span
        {...rest}
        ref={ref}
        className={['ui-status-badge', className].filter(Boolean).join(' ')}
        data-tone={tone}
        data-version="2"
      >
        <span className="ui-status-badge__mark" aria-hidden="true">{mark}</span>
        {children}
      </span>
    );
  },
);
