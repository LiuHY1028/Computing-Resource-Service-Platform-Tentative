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
import './drawer.css';

const focusableSelector = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export type DrawerAction = Readonly<{
  label: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
}>;

export type DrawerProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> &
  Readonly<{
    open: boolean;
    title: ReactNode;
    description?: ReactNode;
    children: ReactNode;
    onClose: () => void;
    primaryAction?: DrawerAction;
    secondaryAction?: DrawerAction;
    footer?: ReactNode;
    busy?: boolean;
    initialFocusRef?: RefObject<HTMLElement | null>;
  }>;

export const Drawer = forwardRef<HTMLDivElement, DrawerProps>(function Drawer(
  {
    open,
    title,
    description,
    children,
    onClose,
    primaryAction,
    secondaryAction,
    footer,
    busy = false,
    initialFocusRef,
    className,
    ...rest
  },
  forwardedRef,
) {
  const titleId = `ui-drawer-title-${useId()}`;
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  function setDrawerRef(node: HTMLDivElement | null) {
    drawerRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }

  useEffect(() => {
    if (!open) return undefined;
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => {
      const first =
        initialFocusRef?.current ??
        drawerRef.current?.querySelector<HTMLElement>(focusableSelector);
      (first ?? drawerRef.current)?.focus();
    });
    function onKeyDown(event: KeyboardEvent) {
      const drawer = drawerRef.current;
      if (!drawer) return;
      if (event.key === 'Escape' && !busy) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = Array.from(
        drawer.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => !element.hidden);
      if (!controls.length) {
        event.preventDefault();
        drawer.focus();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    const returnTarget = returnFocusRef.current;
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => returnTarget?.focus());
    };
  }, [busy, initialFocusRef, onClose, open]);

  if (!open) return null;
  const renderedFooter =
    footer ??
    (primaryAction || secondaryAction ? (
      <>
        {secondaryAction && (
          <Button
            variant={secondaryAction.variant ?? 'secondary'}
            disabled={busy || secondaryAction.disabled}
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </Button>
        )}
        {primaryAction && (
          <Button
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
    <div className="ui-drawer-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <aside
        {...rest}
        ref={setDrawerRef}
        className={['ui-drawer', className].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="ui-drawer__header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <IconButton
            aria-label="关闭抽屉"
            icon={<ClearIcon />}
            disabled={busy}
            onClick={onClose}
          />
        </header>
        <div className="ui-drawer__content">{children}</div>
        {renderedFooter && <footer className="ui-drawer__footer">{renderedFooter}</footer>}
      </aside>
    </div>,
    document.body,
  );
});
