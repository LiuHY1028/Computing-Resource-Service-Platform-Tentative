import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import './switch.css';

export type SwitchProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'children' | 'type' | 'onChange'
> &
  Readonly<{
    children: ReactNode;
    description?: ReactNode;
    onCheckedChange?: (checked: boolean) => void;
  }>;

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  function Switch(
    {
      children,
      className,
      description,
      onCheckedChange,
      ...rest
    },
    ref,
  ) {
    return (
      <label className={['ui-switch', className].filter(Boolean).join(' ')}>
        <input
          {...rest}
          ref={ref}
          type="checkbox"
          className="ui-switch__input"
          onChange={(event) => onCheckedChange?.(event.target.checked)}
        />
        <span className="ui-switch__track" aria-hidden="true">
          <span className="ui-switch__thumb" />
        </span>
        <span className="ui-switch__copy">
          <strong>{children}</strong>
          {description && <span>{description}</span>}
        </span>
      </label>
    );
  },
);
