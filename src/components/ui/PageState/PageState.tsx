import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { Button, Container } from '../index';
import './page-state.css';

export type PageStateProps = HTMLAttributes<HTMLElement> &
  Readonly<{
    title: ReactNode;
    description?: ReactNode;
    tone?: 'neutral' | 'loading' | 'error';
    actionLabel?: string;
    onAction?: () => void;
  }>;

export const PageState = forwardRef<HTMLElement, PageStateProps>(
  function PageState(
    {
      title,
      description,
      tone = 'neutral',
      actionLabel,
      onAction,
      className,
      ...rest
    },
    ref,
  ) {
    return (
      <Container
        {...rest}
        ref={ref}
        as="section"
        className={['ui-page-state', className].filter(Boolean).join(' ')}
        data-tone={tone}
        role={tone === 'error' ? 'alert' : 'status'}
      >
        <span aria-hidden="true">{tone === 'loading' ? '…' : '—'}</span>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        {actionLabel && onAction && (
          <Button onClick={onAction}>{actionLabel}</Button>
        )}
      </Container>
    );
  },
);
