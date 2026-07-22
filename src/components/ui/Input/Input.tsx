import {
  forwardRef,
  useId,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type TextareaHTMLAttributes,
} from 'react';
import { ClearIcon, InfoIcon, SearchIcon } from '../icons/UiIcons';
import './input.css';

function joinIds(...ids: Array<string | undefined>) {
  return ids.filter(Boolean).join(' ') || undefined;
}

function textLength(value: unknown) {
  if (value === null || value === undefined) {
    return 0;
  }
  return String(value).length;
}

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> &
  Readonly<{
    clearable?: boolean;
    showCount?: boolean;
    error?: boolean;
    errorMessage?: string;
    onClear?: () => void;
  }>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className,
    clearable = false,
    defaultValue,
    disabled,
    error = false,
    errorMessage,
    id,
    maxLength,
    onChange,
    onClear,
    readOnly,
    showCount = false,
    value,
    'aria-describedby': ariaDescribedBy,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? `ui-input-${generatedId}`;
  const errorId = errorMessage ? `${inputId}-error` : undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? '');
  const currentValue = value ?? uncontrolledValue;
  const canClear = clearable && textLength(currentValue) > 0 && !disabled && !readOnly;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setUncontrolledValue(event.target.value);
    onChange?.(event);
  }

  function handleClear() {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (!input || disabled || readOnly) {
      return;
    }

    const nativeValueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set;
    nativeValueSetter?.call(input, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    setUncontrolledValue('');
    onClear?.();
    input.focus();
  }

  return (
    <div className="ui-field">
      <div
        className="ui-input-frame"
        data-disabled={disabled || undefined}
        data-error={error || undefined}
        data-readonly={readOnly || undefined}
      >
        <input
          {...rest}
          ref={ref}
          id={inputId}
          className={['ui-input', className].filter(Boolean).join(' ')}
          value={value}
          defaultValue={value === undefined ? defaultValue : undefined}
          disabled={disabled}
          readOnly={readOnly}
          maxLength={maxLength}
          aria-invalid={error || undefined}
          aria-describedby={joinIds(ariaDescribedBy, errorId)}
          onChange={handleChange}
        />
        {canClear && (
          <button
            className="ui-field__icon-button"
            type="button"
            aria-label="清空输入"
            onClick={handleClear}
          >
            <ClearIcon />
          </button>
        )}
        {showCount && (
          <span className="ui-field__count" aria-live="polite">
            {textLength(currentValue)}{maxLength === undefined ? '' : `/${maxLength}`}
          </span>
        )}
      </div>
      {errorMessage && (
        <p className="ui-field__error" id={errorId}>
          <InfoIcon />
          <span>{errorMessage}</span>
        </p>
      )}
    </div>
  );
});

export type SearchInputProps = Omit<InputProps, 'type'> &
  Readonly<{
    onSearch?: (value: string) => void;
  }>;

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput({ className, onKeyDown, onSearch, ...rest }, ref) {
    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
      onKeyDown?.(event);
      if (
        event.key === 'Enter' &&
        !event.defaultPrevented &&
        !event.nativeEvent.isComposing
      ) {
        onSearch?.(event.currentTarget.value);
      }
    }

    return (
      <div className="ui-search-input">
        <span className="ui-search-input__icon" aria-hidden="true">
          <SearchIcon />
        </span>
        <Input
          {...rest}
          ref={ref}
          className={['ui-search-input__control', className]
            .filter(Boolean)
            .join(' ')}
          type="search"
          onKeyDown={handleKeyDown}
        />
      </div>
    );
  },
);

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> &
  Readonly<{
    showCount?: boolean;
    error?: boolean;
    errorMessage?: string;
  }>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      className,
      defaultValue,
      disabled,
      error = false,
      errorMessage,
      id,
      maxLength,
      onChange,
      readOnly,
      showCount = false,
      value,
      'aria-describedby': ariaDescribedBy,
      ...rest
    },
    ref,
  ) {
    const generatedId = useId();
    const textareaId = id ?? `ui-textarea-${generatedId}`;
    const errorId = errorMessage ? `${textareaId}-error` : undefined;
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? '');
    const currentValue = value ?? uncontrolledValue;

    function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
      setUncontrolledValue(event.target.value);
      onChange?.(event);
    }

    return (
      <div className="ui-field">
        <div
          className="ui-textarea-frame"
          data-disabled={disabled || undefined}
          data-error={error || undefined}
          data-readonly={readOnly || undefined}
          data-with-count={showCount || undefined}
        >
          <textarea
            {...rest}
            ref={ref}
            id={textareaId}
            className={['ui-textarea', className].filter(Boolean).join(' ')}
            value={value}
            defaultValue={value === undefined ? defaultValue : undefined}
            disabled={disabled}
            readOnly={readOnly}
            maxLength={maxLength}
            aria-invalid={error || undefined}
            aria-describedby={joinIds(ariaDescribedBy, errorId)}
            onChange={handleChange}
          />
          {showCount && (
            <span className="ui-textarea-frame__count" aria-live="polite">
              {textLength(currentValue)}{maxLength === undefined ? '' : `/${maxLength}`}
            </span>
          )}
        </div>
        {errorMessage && (
          <p className="ui-field__error" id={errorId}>
            <InfoIcon />
            <span>{errorMessage}</span>
          </p>
        )}
      </div>
    );
  },
);
