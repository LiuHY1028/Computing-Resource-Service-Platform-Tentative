import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react';
import './checkbox.css';

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
}

type CheckboxGroupContextValue = Readonly<{
  values: readonly string[];
  disabled: boolean;
  toggle: (value: string, checked: boolean) => void;
}>;

const CheckboxGroupContext = createContext<CheckboxGroupContextValue | null>(null);

export type CheckboxGroupProps = Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> &
  Readonly<{
    children: ReactNode;
    value?: readonly string[];
    defaultValue?: readonly string[];
    onValueChange?: (value: string[]) => void;
    direction?: 'horizontal' | 'vertical';
    disabled?: boolean;
  }>;

export const CheckboxGroup = forwardRef<HTMLDivElement, CheckboxGroupProps>(
  function CheckboxGroup(
    {
      children,
      className,
      value,
      defaultValue = [],
      onValueChange,
      direction = 'horizontal',
      disabled = false,
      ...rest
    },
    ref,
  ) {
    const [uncontrolledValue, setUncontrolledValue] = useState<readonly string[]>(
      defaultValue,
    );
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : uncontrolledValue;

    const contextValue = useMemo<CheckboxGroupContextValue>(
      () => ({
        values: currentValue,
        disabled,
        toggle(optionValue, checked) {
          if (disabled) {
            return;
          }
          const nextValue = checked
            ? Array.from(new Set([...currentValue, optionValue]))
            : currentValue.filter((item) => item !== optionValue);
          if (!isControlled) {
            setUncontrolledValue(nextValue);
          }
          onValueChange?.(nextValue);
        },
      }),
      [currentValue, disabled, isControlled, onValueChange],
    );

    return (
      <CheckboxGroupContext.Provider value={contextValue}>
        <div
          {...rest}
          ref={ref}
          className={['ui-checkbox-group', className].filter(Boolean).join(' ')}
          role="group"
          aria-disabled={disabled || undefined}
          data-direction={direction}
        >
          {children}
        </div>
      </CheckboxGroupContext.Provider>
    );
  },
);

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'children' | 'type' | 'value'
> &
  Readonly<{
    value?: string;
    children: ReactNode;
    indeterminate?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }>;

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox(
    {
      children,
      className,
      checked,
      defaultChecked,
      disabled,
      indeterminate = false,
      onChange,
      onCheckedChange,
      value = 'on',
      ...rest
    },
    forwardedRef,
  ) {
    const group = useContext(CheckboxGroupContext);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const isDisabled = disabled || group?.disabled;
    const isChecked = group ? group.values.includes(value) : checked;

    useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
      group?.toggle(value, event.target.checked);
      onCheckedChange?.(event.target.checked);
      onChange?.(event);
    }

    return (
      <label className={['ui-checkbox', className].filter(Boolean).join(' ')}>
        <input
          {...rest}
          ref={(node) => {
            inputRef.current = node;
            assignRef(forwardedRef, node);
          }}
          className="ui-checkbox__input"
          type="checkbox"
          value={value}
          checked={group ? isChecked : checked}
          defaultChecked={group ? undefined : defaultChecked}
          disabled={isDisabled}
          aria-checked={indeterminate ? 'mixed' : isChecked}
          onChange={handleChange}
        />
        <span
          className="ui-checkbox__control"
          data-indeterminate={indeterminate || undefined}
          aria-hidden="true"
        />
        <span className="ui-checkbox__label">{children}</span>
      </label>
    );
  },
);
