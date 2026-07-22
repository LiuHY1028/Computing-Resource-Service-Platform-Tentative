import {
  forwardRef,
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import './tabs.css';

export type TabItem = Readonly<{
  value: string;
  label: ReactNode;
  panel: ReactNode;
  disabled?: boolean;
}>;

export type TabsProps = Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> &
  Readonly<{
    items: readonly TabItem[];
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    variant?: 'titlebar' | 'underline';
    'aria-label'?: string;
  }>;

function nextEnabledIndex(items: readonly TabItem[], current: number, direction: 1 | -1) {
  for (let offset = 1; offset <= items.length; offset += 1) {
    const candidate = (current + offset * direction + items.length) % items.length;
    if (!items[candidate]?.disabled) {
      return candidate;
    }
  }
  return current;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  {
    items,
    value,
    defaultValue,
    onValueChange,
    variant = 'underline',
    className,
    'aria-label': ariaLabel,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const firstEnabled = useMemo(() => items.find((item) => !item.disabled)?.value, [items]);
  const [internalValue, setInternalValue] = useState(defaultValue ?? firstEnabled);
  const [focusedValue, setFocusedValue] = useState(value ?? defaultValue ?? firstEnabled);
  const isControlled = value !== undefined;
  const selectedValue = isControlled ? value : internalValue;
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());

  function select(nextValue: string) {
    const item = items.find((candidate) => candidate.value === nextValue);
    if (!item || item.disabled) {
      return;
    }
    if (!isControlled) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
  }

  function focusAt(index: number) {
    const item = items[index];
    if (!item || item.disabled) {
      return;
    }
    setFocusedValue(item.value);
    tabRefs.current.get(item.value)?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let targetIndex: number | undefined;
    if (event.key === 'ArrowRight') {
      targetIndex = nextEnabledIndex(items, index, 1);
    } else if (event.key === 'ArrowLeft') {
      targetIndex = nextEnabledIndex(items, index, -1);
    } else if (event.key === 'Home') {
      targetIndex = items.findIndex((item) => !item.disabled);
    } else if (event.key === 'End') {
      targetIndex = Array.from(items).reverse().findIndex((item) => !item.disabled);
      if (targetIndex >= 0) {
        targetIndex = items.length - 1 - targetIndex;
      }
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select(items[index]?.value ?? '');
      return;
    }
    if (targetIndex !== undefined && targetIndex >= 0) {
      event.preventDefault();
      focusAt(targetIndex);
    }
  }

  const selectedItem = items.find((item) => item.value === selectedValue && !item.disabled);

  return (
    <div
      {...rest}
      ref={ref}
      className={['ui-tabs', className].filter(Boolean).join(' ')}
      data-variant={variant}
    >
      <div className="ui-tabs__list" role="tablist" aria-label={ariaLabel}>
        {items.map((item, index) => {
          const tabId = `ui-tab-${generatedId}-${index}`;
          const panelId = `ui-tabpanel-${generatedId}-${index}`;
          const selected = selectedValue === item.value;
          return (
            <button
              key={item.value}
              ref={(node) => {
                if (node) tabRefs.current.set(item.value, node);
                else tabRefs.current.delete(item.value);
              }}
              id={tabId}
              className="ui-tabs__tab"
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              disabled={item.disabled}
              tabIndex={focusedValue === item.value || (!focusedValue && selected) ? 0 : -1}
              onFocus={() => setFocusedValue(item.value)}
              onClick={() => select(item.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {selectedItem && (
        <div
          id={`ui-tabpanel-${generatedId}-${items.indexOf(selectedItem)}`}
          className="ui-tabs__panel"
          role="tabpanel"
          aria-labelledby={`ui-tab-${generatedId}-${items.indexOf(selectedItem)}`}
          tabIndex={0}
        >
          {selectedItem.panel}
        </div>
      )}
    </div>
  );
});

export type TitleBarTabsProps = Omit<TabsProps, 'variant'>;
export const TitleBarTabs = forwardRef<HTMLDivElement, TitleBarTabsProps>(
  function TitleBarTabs(props, ref) {
    return <Tabs {...props} ref={ref} variant="titlebar" />;
  },
);

export type UnderlineTabsProps = Omit<TabsProps, 'variant'>;
export const UnderlineTabs = forwardRef<HTMLDivElement, UnderlineTabsProps>(
  function UnderlineTabs(props, ref) {
    return <Tabs {...props} ref={ref} variant="underline" />;
  },
);
