import {
  forwardRef,
  useState,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import './button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'warning' | 'danger' | 'ghost';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  Readonly<{
    variant?: ButtonVariant;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
  }>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    type = 'button',
    variant = 'secondary',
    leftIcon,
    rightIcon,
    ...rest
  },
  ref,
) {
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      className={['ui-button', className].filter(Boolean).join(' ')}
      data-variant={variant}
    >
      {leftIcon && <span className="ui-button__icon">{leftIcon}</span>}
      <span className="ui-button__label">{children}</span>
      {rightIcon && <span className="ui-button__icon">{rightIcon}</span>}
    </button>
  );
});

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> &
  Readonly<{
    'aria-label': string;
    icon: ReactNode;
    appearance?: 'default' | 'floating';
  }>;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      className,
      type = 'button',
      appearance = 'default',
      icon,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        {...rest}
        ref={ref}
        type={type}
        className={['ui-icon-button', className].filter(Boolean).join(' ')}
        data-appearance={appearance}
      >
        <span className="ui-icon-button__icon">{icon}</span>
      </button>
    );
  },
);

export type TextButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  Readonly<{
    icon?: ReactNode;
    iconPosition?: 'left' | 'right';
  }>;

export const TextButton = forwardRef<HTMLButtonElement, TextButtonProps>(
  function TextButton(
    {
      children,
      className,
      type = 'button',
      icon,
      iconPosition = 'left',
      ...rest
    },
    ref,
  ) {
    return (
      <button
        {...rest}
        ref={ref}
        type={type}
        className={['ui-text-button', className].filter(Boolean).join(' ')}
      >
        {icon && iconPosition === 'left' && (
          <span className="ui-text-button__icon">{icon}</span>
        )}
        <span>{children}</span>
        {icon && iconPosition === 'right' && (
          <span className="ui-text-button__icon">{icon}</span>
        )}
      </button>
    );
  },
);

export type FilterTagProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-pressed' | 'onChange'
> &
  Readonly<{
    selected?: boolean;
    defaultSelected?: boolean;
    onSelectedChange?: (selected: boolean) => void;
    icon?: ReactNode;
  }>;

export const FilterTag = forwardRef<HTMLButtonElement, FilterTagProps>(
  function FilterTag(
    {
      children,
      className,
      disabled,
      selected,
      defaultSelected = false,
      onSelectedChange,
      onClick,
      icon,
      type = 'button',
      ...rest
    },
    ref,
  ) {
    const [internalSelected, setInternalSelected] = useState(defaultSelected);
    const isControlled = selected !== undefined;
    const isSelected = isControlled ? selected : internalSelected;

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
      if (disabled) {
        return;
      }

      const nextSelected = !isSelected;
      if (!isControlled) {
        setInternalSelected(nextSelected);
      }
      onSelectedChange?.(nextSelected);
      onClick?.(event);
    }

    return (
      <button
        {...rest}
        ref={ref}
        type={type}
        className={['ui-filter-tag', className].filter(Boolean).join(' ')}
        aria-pressed={isSelected}
        disabled={disabled}
        onClick={handleClick}
      >
        {icon && <span className="ui-filter-tag__icon">{icon}</span>}
        <span>{children}</span>
      </button>
    );
  },
);
