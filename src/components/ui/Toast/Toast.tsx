import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { Button, IconButton } from '../Button/Button';
import './toast.css';

export type ToastTone = 'info' | 'success' | 'error';

export type ToastProps = HTMLAttributes<HTMLDivElement> &
  Readonly<{
    tone?: ToastTone;
    title: ReactNode;
    description?: ReactNode;
    actionLabel?: ReactNode;
    onAction?: () => void;
    onClose?: () => void;
  }>;

export const Toast = forwardRef<HTMLDivElement, ToastProps>(function Toast(
  {
    tone = 'success',
    title,
    description,
    actionLabel,
    onAction,
    onClose,
    className,
    ...rest
  },
  ref,
) {
  return (
    <div
      {...rest}
      ref={ref}
      className={['ui-toast', className].filter(Boolean).join(' ')}
      data-tone={tone}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <span className="ui-toast__mark" aria-hidden="true">
        {tone === 'success' ? '✓' : tone === 'error' ? '!' : 'i'}
      </span>
      <div className="ui-toast__copy">
        <strong>{title}</strong>
        {description && <span>{description}</span>}
      </div>
      {actionLabel && onAction && (
        <Button variant="ghost" onClick={onAction}>{actionLabel}</Button>
      )}
      {onClose && <IconButton aria-label="关闭提示" icon="×" onClick={onClose} />}
    </div>
  );
});
