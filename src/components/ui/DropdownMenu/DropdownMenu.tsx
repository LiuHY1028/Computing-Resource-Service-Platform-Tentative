import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import './dropdown-menu.css';

type MenuContextValue = Readonly<{
  close: (restoreFocus?: boolean) => void;
}>;

const MenuContext = createContext<MenuContextValue | null>(null);

export type DropdownMenuProps = Readonly<{
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  menuClassName?: string;
  disabled?: boolean;
  'aria-label'?: string;
}>;

function enabledItems(menu: HTMLElement | null) {
  return menu
    ? Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])'))
    : [];
}

export function DropdownMenu({
  trigger,
  children,
  className,
  menuClassName,
  disabled = false,
  'aria-label': ariaLabel = '更多操作',
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    visibility: 'hidden' | 'visible';
  }>({ left: 0, top: 0, visibility: 'hidden' });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<1 | -1 | undefined>(undefined);

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  const placeMenu = useCallback(() => {
    const triggerElement = triggerRef.current;
    const menuElement = menuRef.current;
    if (!triggerElement || !menuElement) return;
    const triggerRect = triggerElement.getBoundingClientRect();
    const menuRect = menuElement.getBoundingClientRect();
    const gap = 6;
    const edge = 8;
    const left = Math.min(
      Math.max(edge, triggerRect.right - menuRect.width),
      window.innerWidth - menuRect.width - edge,
    );
    const fitsBelow = triggerRect.bottom + gap + menuRect.height <= window.innerHeight - edge;
    const top = fitsBelow
      ? triggerRect.bottom + gap
      : Math.max(edge, triggerRect.top - menuRect.height - gap);
    setPosition({ left, top, visibility: 'visible' });
  }, []);

  useLayoutEffect(() => {
    if (open) {
      placeMenu();
      if (pendingFocus.current) {
        moveFocus(pendingFocus.current);
        pendingFocus.current = undefined;
      }
    }
  }, [open, placeMenu]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) close();
    };
    const onViewportChange = () => placeMenu();
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [close, open, placeMenu]);

  function moveFocus(direction: 1 | -1) {
    const items = enabledItems(menuRef.current);
    if (!items.length) return;
    const current = document.activeElement as HTMLElement;
    const currentIndex = items.indexOf(current);
    const nextIndex = currentIndex < 0
      ? direction === 1 ? 0 : items.length - 1
      : (currentIndex + direction + items.length) % items.length;
    items[nextIndex]?.focus();
  }

  function onTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      if (open) {
        moveFocus(direction);
      } else {
        pendingFocus.current = direction;
        setOpen(true);
      }
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      close(true);
    } else if (event.key === 'Tab' && open) {
      close();
    }
  }

  function onMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveFocus(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const items = enabledItems(menuRef.current);
      items[event.key === 'Home' ? 0 : items.length - 1]?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    } else if (event.key === 'Tab') {
      close();
    }
  }

  return (
    <span className={['ui-dropdown-menu', className].filter(Boolean).join(' ')}>
      <button
        ref={triggerRef}
        type="button"
        className="ui-dropdown-menu__trigger"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onTriggerKeyDown}
      >
        {trigger}
      </button>
      {open && createPortal(
        <MenuContext.Provider value={{ close }}>
          <div
            ref={menuRef}
            role="menu"
            aria-label={ariaLabel}
            className={['ui-dropdown-menu__content', menuClassName].filter(Boolean).join(' ')}
            style={position}
            onKeyDown={onMenuKeyDown}
          >
            {children}
          </div>
        </MenuContext.Provider>,
        document.body,
      )}
    </span>
  );
}

export type DropdownMenuItemProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick'
> & Readonly<{
  danger?: boolean;
  onSelect?: () => void;
}>;

export const DropdownMenuItem = forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
  function DropdownMenuItem(
    { children, className, disabled, danger = false, onSelect, ...rest },
    ref,
  ) {
    const context = useContext(MenuContext);
    return (
      <button
        {...rest}
        ref={ref}
        type="button"
        role="menuitem"
        className={['ui-dropdown-menu__item', className].filter(Boolean).join(' ')}
        aria-disabled={disabled || undefined}
        data-danger={danger || undefined}
        tabIndex={disabled ? -1 : undefined}
        onClick={() => {
          if (disabled) return;
          onSelect?.();
          context?.close(true);
        }}
      >
        {children}
      </button>
    );
  },
);

export type DropdownMenuGroupProps = HTMLAttributes<HTMLDivElement> &
  Readonly<{ label?: string }>;

export const DropdownMenuGroup = forwardRef<HTMLDivElement, DropdownMenuGroupProps>(
  function DropdownMenuGroup({ label, children, className, ...rest }, ref) {
    return (
      <div
        {...rest}
        ref={ref}
        role="group"
        aria-label={label}
        className={['ui-dropdown-menu__group', className].filter(Boolean).join(' ')}
      >
        {label && <span className="ui-dropdown-menu__group-label">{label}</span>}
        {children}
      </div>
    );
  },
);

export function DropdownMenuSeparator() {
  return <div className="ui-dropdown-menu__separator" role="separator" />;
}
