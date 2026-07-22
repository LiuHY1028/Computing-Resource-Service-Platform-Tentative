import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import './radio.css';

type RadioGroupContextValue = Readonly<{
  name: string;
  value: string | undefined;
  disabled: boolean;
  select: (value: string) => void;
}>;

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export type RadioGroupProps = Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> &
  Readonly<{
    children: ReactNode;
    name?: string;
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    direction?: 'horizontal' | 'vertical';
    disabled?: boolean;
  }>;

export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  function RadioGroup(
    {
      children,
      className,
      name,
      value,
      defaultValue,
      onValueChange,
      direction = 'horizontal',
      disabled = false,
      ...rest
    },
    ref,
  ) {
    const generatedName = useId();
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : uncontrolledValue;

    const contextValue = useMemo<RadioGroupContextValue>(
      () => ({
        name: name ?? `ui-radio-group-${generatedName}`,
        value: currentValue,
        disabled,
        select(nextValue) {
          if (disabled) {
            return;
          }
          if (!isControlled) {
            setUncontrolledValue(nextValue);
          }
          onValueChange?.(nextValue);
        },
      }),
      [currentValue, disabled, generatedName, isControlled, name, onValueChange],
    );

    return (
      <RadioGroupContext.Provider value={contextValue}>
        <div
          {...rest}
          ref={ref}
          className={['ui-radio-group', className].filter(Boolean).join(' ')}
          role="radiogroup"
          aria-disabled={disabled || undefined}
          data-direction={direction}
        >
          {children}
        </div>
      </RadioGroupContext.Provider>
    );
  },
);

export type RadioProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'children' | 'type' | 'value'
> &
  Readonly<{
    value: string;
    children: ReactNode;
    onCheckedChange?: (checked: boolean) => void;
  }>;

function moveWithinGroup(
  event: KeyboardEvent<HTMLInputElement>,
  direction: 1 | -1,
) {
  const group = event.currentTarget.closest('[role="radiogroup"]');
  if (!group) {
    return;
  }

  const radios = Array.from(
    group.querySelectorAll<HTMLInputElement>('input[type="radio"]:not(:disabled)'),
  );
  const currentIndex = radios.indexOf(event.currentTarget);
  if (currentIndex < 0 || radios.length === 0) {
    return;
  }

  event.preventDefault();
  const nextIndex = (currentIndex + direction + radios.length) % radios.length;
  const nextRadio = radios[nextIndex];
  nextRadio?.focus();
  nextRadio?.click();
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  {
    children,
    className,
    checked,
    defaultChecked,
    disabled,
    name,
    onChange,
    onCheckedChange,
    onKeyDown,
    value,
    ...rest
  },
  ref,
) {
  const group = useContext(RadioGroupContext);
  const isDisabled = disabled || group?.disabled;
  const isChecked = group ? group.value === value : checked;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.checked) {
      group?.select(value);
    }
    onCheckedChange?.(event.target.checked);
    onChange?.(event);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) {
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      moveWithinGroup(event, 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      moveWithinGroup(event, -1);
    }
  }

  return (
    <label className={['ui-radio', className].filter(Boolean).join(' ')}>
      <input
        {...rest}
        ref={ref}
        className="ui-radio__input"
        type="radio"
        value={value}
        name={group?.name ?? name}
        checked={group ? isChecked : checked}
        defaultChecked={group ? undefined : defaultChecked}
        disabled={isDisabled}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <span className="ui-radio__control" aria-hidden="true" />
      <span className="ui-radio__label">{children}</span>
    </label>
  );
});

export type CardRadioProps = Omit<RadioProps, 'children'> &
  Readonly<{
    title: ReactNode;
    description?: ReactNode;
  }>;

export const CardRadio = forwardRef<HTMLInputElement, CardRadioProps>(
  function CardRadio({ className, title, description, ...rest }, ref) {
    return (
      <Radio
        {...rest}
        ref={ref}
        className={['ui-card-radio', className].filter(Boolean).join(' ')}
      >
        <span className="ui-card-radio__copy">
          <span className="ui-card-radio__title">{title}</span>
          {description && (
            <span className="ui-card-radio__description">{description}</span>
          )}
        </span>
      </Radio>
    );
  },
);
