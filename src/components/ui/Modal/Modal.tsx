import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { Button, ClearIcon, IconButton, type ButtonVariant } from '../index';
import './modal.css';

const focusableSelector = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true',
  );
}

export type ModalAction = Readonly<{
  label: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  type?: 'button' | 'submit';
}>;

export type ModalProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> &
  Readonly<{
    open: boolean;
    title: ReactNode;
    children: ReactNode;
    onClose: () => void;
    footer?: ReactNode;
    primaryAction?: ModalAction;
    secondaryAction?: ModalAction;
    closeOnOverlayClick?: boolean;
    closeOnEscape?: boolean;
    busy?: boolean;
    initialFocusRef?: RefObject<HTMLElement | null>;
    returnFocusRef?: RefObject<HTMLElement | null>;
    role?: 'dialog' | 'alertdialog';
    width?: 'default' | 'prompt';
    closeLabel?: string;
  }>;

export const Modal = forwardRef<HTMLDivElement, ModalProps>(function Modal(
  {
    open,
    title,
    children,
    onClose,
    footer,
    primaryAction,
    secondaryAction,
    closeOnOverlayClick = false,
    closeOnEscape = true,
    busy = false,
    initialFocusRef,
    returnFocusRef,
    role = 'dialog',
    width = 'default',
    closeLabel = '关闭弹窗',
    className,
    'aria-describedby': ariaDescribedBy,
    ...rest
  },
  forwardedRef,
) {
  const generatedId = useId();
  const titleId = `ui-modal-title-${generatedId}`;
  const contentId = `ui-modal-content-${generatedId}`;
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  function setDialogRef(node: HTMLDivElement | null) {
    dialogRef.current = node;
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  }

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    previousFocusRef.current =
      returnFocusRef?.current ??
      (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const returnTarget = previousFocusRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const animationFrame = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      const focusTarget = initialFocusRef?.current ?? (dialog ? getFocusableElements(dialog)[0] : null);
      (focusTarget ?? dialog)?.focus();
    });

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }
      if (event.key === 'Escape' && closeOnEscape && !busy) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }
      const focusable = getFocusableElements(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => returnTarget?.focus());
    };
  }, [busy, closeOnEscape, initialFocusRef, onClose, open, returnFocusRef]);

  if (!open) {
    return null;
  }

  const renderedFooter =
    footer ??
    (primaryAction || secondaryAction ? (
      <>
        {secondaryAction && (
          <Button
            type={secondaryAction.type ?? 'button'}
            variant={secondaryAction.variant ?? 'secondary'}
            disabled={busy || secondaryAction.disabled}
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </Button>
        )}
        {primaryAction && (
          <Button
            type={primaryAction.type ?? 'button'}
            variant={primaryAction.variant ?? 'primary'}
            disabled={busy || primaryAction.disabled}
            aria-busy={busy || undefined}
            onClick={primaryAction.onClick}
          >
            {busy ? '处理中' : primaryAction.label}
          </Button>
        )}
      </>
    ) : null);

  return createPortal(
    <div
      className="ui-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && closeOnOverlayClick && !busy) {
          onClose();
        }
      }}
    >
      <div
        {...rest}
        ref={setDialogRef}
        className={['ui-modal', className].filter(Boolean).join(' ')}
        data-width={width}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={ariaDescribedBy ?? contentId}
        aria-busy={busy || undefined}
        tabIndex={-1}
      >
        <header className="ui-modal__header">
          <h2 id={titleId}>{title}</h2>
          <IconButton
            aria-label={closeLabel}
            icon={<ClearIcon />}
            disabled={busy}
            onClick={onClose}
          />
        </header>
        <div className="ui-modal__content" id={contentId}>
          {children}
        </div>
        {renderedFooter && <footer className="ui-modal__footer">{renderedFooter}</footer>}
      </div>
    </div>,
    document.body,
  );
});

export type PromptModalVariant = 'info' | 'warning' | 'danger' | 'success' | 'close';

export type PromptModalProps = Omit<ModalProps, 'children' | 'footer' | 'primaryAction' | 'secondaryAction' | 'role' | 'width'> &
  Readonly<{
    description: ReactNode;
    variant?: PromptModalVariant;
    confirmLabel?: ReactNode;
    cancelLabel?: ReactNode;
    onConfirm?: () => void;
  }>;

export const PromptModal = forwardRef<HTMLDivElement, PromptModalProps>(
  function PromptModal(
    {
      description,
      variant = 'info',
      confirmLabel = variant === 'close' ? '关闭' : '确定',
      cancelLabel,
      onConfirm,
      onClose,
      busy,
      ...rest
    },
    ref,
  ) {
    const confirmVariant: ButtonVariant = variant === 'danger' ? 'danger' : 'primary';
    return (
      <Modal
        {...rest}
        ref={ref}
        onClose={onClose}
        busy={busy}
        role={variant === 'danger' || variant === 'warning' ? 'alertdialog' : 'dialog'}
        width="prompt"
        primaryAction={{ label: confirmLabel, variant: confirmVariant, onClick: onConfirm }}
        secondaryAction={
          cancelLabel ? { label: cancelLabel, onClick: onClose } : undefined
        }
      >
        <div className="ui-prompt-modal__body" data-variant={variant}>
          <div>{description}</div>
        </div>
      </Modal>
    );
  },
);
