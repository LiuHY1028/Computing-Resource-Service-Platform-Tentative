import {
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type Ref,
} from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, ChevronIcon, ClearIcon } from '../icons/UiIcons';
import './select.css';

export type SelectOption = Readonly<{
  value: string;
  label: string;
  disabled?: boolean;
}>;

type TriggerAttributes = Readonly<{
  id?: string;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}>;

type OverlayPosition = Readonly<{
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}>;

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
}

function tokenPixels(name: string) {
  const value = Number.parseFloat(
    window.getComputedStyle(document.documentElement).getPropertyValue(name),
  );
  return Number.isFinite(value) ? value : 0;
}

function firstEnabledOption(options: readonly SelectOption[]) {
  return options.findIndex((option) => !option.disabled);
}

function nextEnabledOption(
  options: readonly SelectOption[],
  currentIndex: number,
  direction: 1 | -1,
) {
  if (options.length === 0) {
    return -1;
  }
  for (let step = 1; step <= options.length; step += 1) {
    const nextIndex = (currentIndex + step * direction + options.length) % options.length;
    if (!options[nextIndex]?.disabled) {
      return nextIndex;
    }
  }
  return -1;
}

function optionId(listboxId: string, index: number) {
  return `${listboxId}-option-${index}`;
}

function useOverlayPosition(
  open: boolean,
  triggerRef: React.RefObject<HTMLElement | null>,
  listboxRef: React.RefObject<HTMLDivElement | null>,
) {
  const [position, setPosition] = useState<OverlayPosition>();

  useLayoutEffect(() => {
    if (!open) {
      return undefined;
    }

    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) {
        return;
      }

      const triggerRect = trigger.getBoundingClientRect();
      const overlayRect = listboxRef.current?.getBoundingClientRect();
      const viewportPadding = tokenPixels('--engineering-overlay-viewport-padding');
      const offset = tokenPixels('--engineering-overlay-offset');
      const listboxMaxHeight = tokenPixels('--engineering-select-listbox-max-height');
      const availableBelow = window.innerHeight - triggerRect.bottom - offset - viewportPadding;
      const availableAbove = triggerRect.top - offset - viewportPadding;
      const preferAbove = Boolean(
        overlayRect && overlayRect.height > availableBelow && availableAbove > availableBelow,
      );
      const availableHeight = Math.max(
        0,
        preferAbove ? availableAbove : availableBelow,
      );
      const maxHeight =
        listboxMaxHeight > 0
          ? Math.min(availableHeight, listboxMaxHeight)
          : availableHeight;
      const overlayHeight = Math.min(overlayRect?.height ?? 0, maxHeight);
      const width = triggerRect.width;
      const left = Math.min(
        Math.max(triggerRect.left, viewportPadding),
        Math.max(viewportPadding, window.innerWidth - viewportPadding - width),
      );

      setPosition({
        top: preferAbove
          ? Math.max(viewportPadding, triggerRect.top - offset - overlayHeight)
          : triggerRect.bottom + offset,
        left,
        width,
        maxHeight,
      });
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [listboxRef, open, triggerRef]);

  return position;
}

type ListboxProps = Readonly<{
  activeIndex: number;
  listboxId: string;
  listboxRef: React.RefObject<HTMLDivElement | null>;
  multiselect?: boolean;
  onActiveIndexChange: (index: number) => void;
  onOptionClick: (index: number) => void;
  options: readonly SelectOption[];
  position: OverlayPosition | undefined;
  selectedValues: readonly string[];
}>;

function SelectListbox({
  activeIndex,
  listboxId,
  listboxRef,
  multiselect = false,
  onActiveIndexChange,
  onOptionClick,
  options,
  position,
  selectedValues,
}: ListboxProps) {
  useEffect(() => {
    const activeOption = document.getElementById(optionId(listboxId, activeIndex));
    activeOption?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, listboxId]);

  const style: CSSProperties | undefined = position
    ? {
        top: position.top,
        left: position.left,
        width: position.width,
        maxHeight: position.maxHeight,
      }
    : undefined;

  return createPortal(
    <div
      ref={listboxRef}
      id={listboxId}
      className="ui-select-listbox"
      role="listbox"
      aria-multiselectable={multiselect || undefined}
      style={style}
    >
      {options.map((option, index) => {
        const selected = selectedValues.includes(option.value);
        return (
          <div
            id={optionId(listboxId, index)}
            key={option.value}
            className="ui-select-option"
            role="option"
            aria-disabled={option.disabled || undefined}
            aria-selected={selected}
            data-active={index === activeIndex || undefined}
            data-disabled={option.disabled || undefined}
            onMouseEnter={() => {
              if (!option.disabled) {
                onActiveIndexChange(index);
              }
            }}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (!option.disabled) {
                onOptionClick(index);
              }
            }}
          >
            <span className="ui-select-option__label">{option.label}</span>
            {selected && (
              <span className="ui-select-option__check" aria-hidden="true">
                <CheckIcon />
              </span>
            )}
          </div>
        );
      })}
    </div>,
    document.body,
  );
}

export type SelectProps = TriggerAttributes &
  Readonly<{
    options: readonly SelectOption[];
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    name?: string;
  }>;

export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    'aria-describedby': ariaDescribedBy,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    className,
    defaultValue,
    disabled = false,
    id,
    name,
    onValueChange,
    options,
    placeholder = '请选择',
    value,
  },
  forwardedRef,
) {
  const generatedId = useId();
  const triggerId = id ?? `ui-select-${generatedId}`;
  const listboxId = `${triggerId}-listbox`;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listboxRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : uncontrolledValue;
  const selectedOption = options.find((option) => option.value === currentValue);
  const position = useOverlayPosition(open, triggerRef, listboxRef);

  function openListbox() {
    if (disabled) {
      return;
    }
    const selectedIndex = options.findIndex(
      (option) => option.value === currentValue && !option.disabled,
    );
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabledOption(options));
    setOpen(true);
  }

  function closeListbox(returnFocus = false) {
    setOpen(false);
    if (returnFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }

  function selectIndex(index: number) {
    const option = options[index];
    if (!option || option.disabled) {
      return;
    }
    if (!isControlled) {
      setUncontrolledValue(option.value);
    }
    onValueChange?.(option.value);
    closeListbox(true);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) {
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        openListbox();
        return;
      }
      setActiveIndex((current) =>
        nextEnabledOption(options, current, event.key === 'ArrowDown' ? 1 : -1),
      );
    } else if (event.key === 'Home' && open) {
      event.preventDefault();
      setActiveIndex(firstEnabledOption(options));
    } else if (event.key === 'End' && open) {
      event.preventDefault();
      setActiveIndex(nextEnabledOption(options, 0, -1));
    } else if ((event.key === 'Enter' || event.key === ' ') && !open) {
      event.preventDefault();
      openListbox();
    } else if (event.key === 'Enter' && open) {
      event.preventDefault();
      selectIndex(activeIndex);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      closeListbox(true);
    } else if (event.key === 'Tab' && open) {
      closeListbox(false);
    }
  }

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    function handleOutsidePointer(event: PointerEvent) {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !listboxRef.current?.contains(target)) {
        closeListbox(false);
      }
    }
    document.addEventListener('pointerdown', handleOutsidePointer);
    return () => document.removeEventListener('pointerdown', handleOutsidePointer);
  }, [open]);

  return (
    <div className={['ui-select-root', className].filter(Boolean).join(' ')}>
      <button
        ref={(node) => {
          triggerRef.current = node;
          assignRef(forwardedRef, node);
        }}
        id={triggerId}
        className="ui-select-trigger"
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open && activeIndex >= 0 ? optionId(listboxId, activeIndex) : undefined}
        disabled={disabled}
        data-placeholder={!selectedOption || undefined}
        onClick={() => (open ? closeListbox(false) : openListbox())}
        onKeyDown={handleKeyDown}
      >
        <span className="ui-select-trigger__value">
          {selectedOption?.label ?? placeholder}
        </span>
        <span className="ui-select-trigger__chevron" aria-hidden="true" data-open={open || undefined}>
          <ChevronIcon />
        </span>
      </button>
      {name && <input type="hidden" name={name} value={currentValue ?? ''} />}
      {open && (
        <SelectListbox
          activeIndex={activeIndex}
          listboxId={listboxId}
          listboxRef={listboxRef}
          onActiveIndexChange={setActiveIndex}
          onOptionClick={selectIndex}
          options={options}
          position={position}
          selectedValues={currentValue ? [currentValue] : []}
        />
      )}
    </div>
  );
});

export type MultiSelectProps = TriggerAttributes &
  Readonly<{
    options: readonly SelectOption[];
    value?: readonly string[];
    defaultValue?: readonly string[];
    onValueChange?: (value: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
    name?: string;
    maxVisibleTags?: number;
  }>;

export const MultiSelect = forwardRef<HTMLDivElement, MultiSelectProps>(
  function MultiSelect(
    {
      'aria-describedby': ariaDescribedBy,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      className,
      defaultValue = [],
      disabled = false,
      id,
      maxVisibleTags = 2,
      name,
      onValueChange,
      options,
      placeholder = '请选择',
      value,
    },
    forwardedRef,
  ) {
    const generatedId = useId();
    const triggerId = id ?? `ui-multiselect-${generatedId}`;
    const listboxId = `${triggerId}-listbox`;
    const triggerRef = useRef<HTMLDivElement | null>(null);
    const listboxRef = useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [uncontrolledValue, setUncontrolledValue] = useState<readonly string[]>(
      defaultValue,
    );
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : uncontrolledValue;
    const selectedOptions = currentValue
      .map((selectedValue) => options.find((option) => option.value === selectedValue))
      .filter((option): option is SelectOption => Boolean(option));
    const visibleOptions = selectedOptions.slice(0, Math.max(0, maxVisibleTags));
    const hiddenCount = selectedOptions.length - visibleOptions.length;
    const position = useOverlayPosition(open, triggerRef, listboxRef);

    function commit(nextValue: string[]) {
      if (!isControlled) {
        setUncontrolledValue(nextValue);
      }
      onValueChange?.(nextValue);
    }

    function openListbox() {
      if (disabled) {
        return;
      }
      setActiveIndex(firstEnabledOption(options));
      setOpen(true);
    }

    function closeListbox(returnFocus = false) {
      setOpen(false);
      if (returnFocus) {
        window.requestAnimationFrame(() => triggerRef.current?.focus());
      }
    }

    function toggleIndex(index: number) {
      const option = options[index];
      if (!option || option.disabled) {
        return;
      }
      const nextValue = currentValue.includes(option.value)
        ? currentValue.filter((item) => item !== option.value)
        : [...currentValue, option.value];
      commit([...nextValue]);
    }

    function removeValue(event: MouseEvent<HTMLButtonElement>, selectedValue: string) {
      event.stopPropagation();
      if (disabled) {
        return;
      }
      commit(currentValue.filter((item) => item !== selectedValue));
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
      if (disabled) {
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!open) {
          openListbox();
          return;
        }
        setActiveIndex((current) =>
          nextEnabledOption(options, current, event.key === 'ArrowDown' ? 1 : -1),
        );
      } else if (event.key === 'Home' && open) {
        event.preventDefault();
        setActiveIndex(firstEnabledOption(options));
      } else if (event.key === 'End' && open) {
        event.preventDefault();
        setActiveIndex(nextEnabledOption(options, 0, -1));
      } else if ((event.key === 'Enter' || event.key === ' ') && !open) {
        event.preventDefault();
        openListbox();
      } else if (event.key === 'Enter' && open) {
        event.preventDefault();
        toggleIndex(activeIndex);
      } else if (event.key === 'Escape' && open) {
        event.preventDefault();
        closeListbox(true);
      } else if (event.key === 'Tab' && open) {
        closeListbox(false);
      }
    }

    useEffect(() => {
      if (!open) {
        return undefined;
      }
      function handleOutsidePointer(event: PointerEvent) {
        const target = event.target as Node;
        if (!triggerRef.current?.contains(target) && !listboxRef.current?.contains(target)) {
          closeListbox(false);
        }
      }
      document.addEventListener('pointerdown', handleOutsidePointer);
      return () => document.removeEventListener('pointerdown', handleOutsidePointer);
    }, [open]);

    return (
      <div className={['ui-select-root', className].filter(Boolean).join(' ')}>
        <div
          ref={(node) => {
            triggerRef.current = node;
            assignRef(forwardedRef, node);
          }}
          id={triggerId}
          className="ui-select-trigger ui-multiselect-trigger"
          role="combobox"
          tabIndex={disabled ? -1 : 0}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={ariaDescribedBy}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={open && activeIndex >= 0 ? optionId(listboxId, activeIndex) : undefined}
          aria-disabled={disabled || undefined}
          data-disabled={disabled || undefined}
          onClick={() => (open ? closeListbox(false) : openListbox())}
          onKeyDown={handleKeyDown}
        >
          <span className="ui-multiselect-trigger__values">
            {selectedOptions.length === 0 && (
              <span className="ui-select-trigger__placeholder">{placeholder}</span>
            )}
            {visibleOptions.map((option) => (
              <span key={option.value} className="ui-multiselect-tag">
                <span className="ui-multiselect-tag__label">{option.label}</span>
                <button
                  type="button"
                  aria-label={`移除${option.label}`}
                  disabled={disabled}
                  onClick={(event) => removeValue(event, option.value)}
                >
                  <ClearIcon />
                </button>
              </span>
            ))}
            {hiddenCount > 0 && (
              <span className="ui-multiselect-tag ui-multiselect-tag--collapsed">
                + {hiddenCount} ...
              </span>
            )}
          </span>
          <span className="ui-select-trigger__chevron" aria-hidden="true" data-open={open || undefined}>
            <ChevronIcon />
          </span>
        </div>
        {name && currentValue.map((item) => <input key={item} type="hidden" name={name} value={item} />)}
        {open && (
          <SelectListbox
            activeIndex={activeIndex}
            listboxId={listboxId}
            listboxRef={listboxRef}
            multiselect
            onActiveIndexChange={setActiveIndex}
            onOptionClick={toggleIndex}
            options={options}
            position={position}
            selectedValues={currentValue}
          />
        )}
      </div>
    );
  },
);
