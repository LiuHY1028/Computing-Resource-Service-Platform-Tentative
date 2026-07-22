import {
  cloneElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import './tooltip.css';

type TooltipPosition = Readonly<{
  top: number;
  left: number;
}>;

function tokenNumber(name: string) {
  const value = Number.parseFloat(
    window.getComputedStyle(document.documentElement).getPropertyValue(name),
  );
  return Number.isFinite(value) ? value : 0;
}

function joinIds(...ids: Array<string | undefined>) {
  return ids.filter(Boolean).join(' ') || undefined;
}

export type TooltipProps = Readonly<{
  children: ReactElement<{ 'aria-describedby'?: string }>;
  content: ReactNode;
  title?: ReactNode;
  action?: ReactNode;
  className?: string;
  openDelay?: number;
  closeDelay?: number;
}>;

export function Tooltip({
  action,
  children,
  className,
  closeDelay,
  content,
  openDelay,
  title,
}: TooltipProps) {
  const generatedId = useId();
  const tooltipId = `ui-tooltip-${generatedId}`;
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const openTimerRef = useRef<number | undefined>(undefined);
  const closeTimerRef = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>();

  function clearTimers() {
    window.clearTimeout(openTimerRef.current);
    window.clearTimeout(closeTimerRef.current);
  }

  function resolvedDelay(name: string, override: number | undefined) {
    return override ?? tokenNumber(name);
  }

  function scheduleOpen() {
    window.clearTimeout(closeTimerRef.current);
    window.clearTimeout(openTimerRef.current);
    openTimerRef.current = window.setTimeout(
      () => setOpen(true),
      resolvedDelay('--engineering-tooltip-open-delay', openDelay),
    );
  }

  function scheduleClose() {
    window.clearTimeout(openTimerRef.current);
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(
      () => setOpen(false),
      resolvedDelay('--engineering-tooltip-close-delay', closeDelay),
    );
  }

  function keepOpen() {
    window.clearTimeout(closeTimerRef.current);
  }

  function handleTriggerBlur(event: FocusEvent<HTMLSpanElement>) {
    if (tooltipRef.current?.contains(event.relatedTarget as Node | null)) {
      return;
    }
    scheduleClose();
  }

  function handleTooltipBlur(event: FocusEvent<HTMLDivElement>) {
    if (
      tooltipRef.current?.contains(event.relatedTarget as Node | null) ||
      triggerRef.current?.contains(event.relatedTarget as Node | null)
    ) {
      return;
    }
    scheduleClose();
  }

  useLayoutEffect(() => {
    if (!open) {
      return undefined;
    }

    function updatePosition() {
      const trigger = triggerRef.current;
      const tooltip = tooltipRef.current;
      if (!trigger || !tooltip) {
        return;
      }
      const triggerRect = trigger.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const padding = tokenNumber('--engineering-overlay-viewport-padding');
      const offset = tokenNumber('--engineering-overlay-offset');
      const fitsAbove = triggerRect.top - offset - tooltipRect.height >= padding;
      const top = fitsAbove
        ? triggerRect.top - offset - tooltipRect.height
        : Math.min(
            window.innerHeight - padding - tooltipRect.height,
            triggerRect.bottom + offset,
          );
      const centeredLeft = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
      const left = Math.min(
        Math.max(centeredLeft, padding),
        Math.max(padding, window.innerWidth - padding - tooltipRect.width),
      );
      setPosition({ top: Math.max(padding, top), left });
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        clearTimers();
        setOpen(false);
        const focusable = triggerRef.current?.querySelector<HTMLElement>(
          'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        focusable?.focus();
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  useEffect(() => clearTimers, []);

  const trigger = cloneElement(children, {
    'aria-describedby': open
      ? joinIds(children.props['aria-describedby'], tooltipId)
      : children.props['aria-describedby'],
  });
  const tooltipStyle: CSSProperties | undefined = position
    ? { top: position.top, left: position.left }
    : undefined;

  return (
    <>
      <span
        ref={triggerRef}
        className="ui-tooltip-trigger"
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        onFocusCapture={scheduleOpen}
        onBlurCapture={handleTriggerBlur}
      >
        {trigger}
      </span>
      {open &&
        createPortal(
          <div
            ref={tooltipRef}
            id={tooltipId}
            className={['ui-tooltip', className].filter(Boolean).join(' ')}
            role="tooltip"
            style={tooltipStyle}
            onMouseEnter={keepOpen}
            onMouseLeave={scheduleClose}
            onFocusCapture={keepOpen}
            onBlurCapture={handleTooltipBlur}
          >
            {title && <div className="ui-tooltip__title">{title}</div>}
            <div className="ui-tooltip__content">{content}</div>
            {action && <div className="ui-tooltip__action">{action}</div>}
          </div>,
          document.body,
        )}
    </>
  );
}
