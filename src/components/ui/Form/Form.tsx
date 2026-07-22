import {
  cloneElement,
  forwardRef,
  useId,
  useState,
  type FormHTMLAttributes,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Button, TextButton, type ButtonVariant } from '../index';
import './form.css';

function joinIds(...ids: Array<string | undefined>) {
  return ids.filter(Boolean).join(' ') || undefined;
}

export type FormProps = FormHTMLAttributes<HTMLFormElement> &
  Readonly<{
    preventDefaultSubmit?: boolean;
  }>;

export const Form = forwardRef<HTMLFormElement, FormProps>(function Form(
  { preventDefaultSubmit = true, onSubmit, className, ...rest },
  ref,
) {
  function handleSubmit(
    event: Parameters<NonNullable<FormHTMLAttributes<HTMLFormElement>['onSubmit']>>[0],
  ) {
    if (preventDefaultSubmit) event.preventDefault();
    onSubmit?.(event);
  }
  return (
    <form
      {...rest}
      ref={ref}
      className={['ui-form', className].filter(Boolean).join(' ')}
      onSubmit={handleSubmit}
    />
  );
});

export type FormSectionProps = HTMLAttributes<HTMLElement> &
  Readonly<{
    title: ReactNode;
    description?: ReactNode;
    children: ReactNode;
    headingLevel?: 2 | 3 | 4;
  }>;

export const FormSection = forwardRef<HTMLElement, FormSectionProps>(
  function FormSection(
    { title, description, children, headingLevel = 2, className, ...rest },
    ref,
  ) {
    const Heading = `h${headingLevel}` as const;
    return (
      <section
        {...rest}
        ref={ref}
        className={['ui-form-section', className].filter(Boolean).join(' ')}
      >
        <header className="ui-form-section__header">
          <Heading>{title}</Heading>
          {description && <p>{description}</p>}
        </header>
        <div className="ui-form-section__fields">{children}</div>
      </section>
    );
  },
);

type FieldControlProps = Readonly<Record<string, unknown>> & {
  id?: string;
  disabled?: boolean;
  'aria-describedby'?: string;
  'aria-labelledby'?: string;
  'aria-invalid'?: boolean;
};

export type FormFieldProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> &
  Readonly<{
    id?: string;
    label: ReactNode;
    children: ReactElement<FieldControlProps>;
    required?: boolean;
    help?: ReactNode;
    error?: ReactNode;
    disabled?: boolean;
    width?: 'default' | 'upload';
  }>;

export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  function FormField(
    {
      id,
      label,
      children,
      required = false,
      help,
      error,
      disabled = false,
      width = 'default',
      className,
      ...rest
    },
    ref,
  ) {
    const generatedId = useId();
    const controlId = id ?? children.props.id ?? `ui-form-control-${generatedId}`;
    const labelId = `${controlId}-label`;
    const helpId = help ? `${controlId}-help` : undefined;
    const errorId = error ? `${controlId}-error` : undefined;
    const control = cloneElement(children, {
      id: controlId,
      disabled: disabled || children.props.disabled,
      'aria-labelledby': joinIds(children.props['aria-labelledby'], labelId),
      'aria-describedby': joinIds(children.props['aria-describedby'], helpId, errorId),
      'aria-invalid': Boolean(error) || children.props['aria-invalid'] || undefined,
    });

    return (
      <div
        {...rest}
        ref={ref}
        className={['ui-form-field', className].filter(Boolean).join(' ')}
        data-disabled={disabled || undefined}
        data-width={width}
      >
        <label className="ui-form-field__label" id={labelId} htmlFor={controlId}>
          {label}
          {required && <span className="ui-form-field__required" aria-hidden="true">*</span>}
          {required && <span className="ui-visually-hidden">必填</span>}
        </label>
        <div className="ui-form-field__control">{control}</div>
        {help && <p className="ui-form-field__help" id={helpId}>{help}</p>}
        {error && <p className="ui-form-field__error" id={errorId} role="alert">{error}</p>}
      </div>
    );
  },
);

export type FormAction = Readonly<{
  label: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  type?: 'button' | 'submit';
}>;

export type FormActionsProps = HTMLAttributes<HTMLDivElement> &
  Readonly<{
    primaryAction: FormAction;
    secondaryAction?: FormAction;
    submitting?: boolean;
  }>;

export const FormActions = forwardRef<HTMLDivElement, FormActionsProps>(
  function FormActions(
    { primaryAction, secondaryAction, submitting = false, className, ...rest },
    ref,
  ) {
    return (
      <div {...rest} ref={ref} className={['ui-form-actions', className].filter(Boolean).join(' ')}>
        <Button
          type={primaryAction.type ?? 'submit'}
          variant={primaryAction.variant ?? 'primary'}
          disabled={submitting || primaryAction.disabled}
          aria-busy={submitting || undefined}
          onClick={primaryAction.onClick}
        >
          {submitting ? '处理中' : primaryAction.label}
        </Button>
        {secondaryAction && (
          <Button
            type={secondaryAction.type ?? 'button'}
            variant={secondaryAction.variant ?? 'secondary'}
            disabled={submitting || secondaryAction.disabled}
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>
    );
  },
);

export type FormAnchorItem = Readonly<{
  id: string;
  label: ReactNode;
  disabled?: boolean;
}>;

export type FormAnchorNavProps = Omit<HTMLAttributes<HTMLElement>, 'onChange'> &
  Readonly<{
    items: readonly FormAnchorItem[];
    activeId?: string;
    defaultActiveId?: string;
    onActiveChange?: (id: string) => void;
    label?: string;
  }>;

export const FormAnchorNav = forwardRef<HTMLElement, FormAnchorNavProps>(
  function FormAnchorNav(
    {
      items,
      activeId,
      defaultActiveId,
      onActiveChange,
      label = '表单分区导航',
      className,
      ...rest
    },
    ref,
  ) {
    const [internalActiveId, setInternalActiveId] = useState(defaultActiveId ?? items[0]?.id);
    const currentActiveId = activeId ?? internalActiveId;

    function navigateTo(item: FormAnchorItem) {
      if (item.disabled) return;
      document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (activeId === undefined) setInternalActiveId(item.id);
      onActiveChange?.(item.id);
    }

    return (
      <nav
        {...rest}
        ref={ref}
        className={['ui-form-anchor-nav', className].filter(Boolean).join(' ')}
        aria-label={label}
      >
        {items.map((item) => (
          <TextButton
            key={item.id}
            disabled={item.disabled}
            aria-current={currentActiveId === item.id ? 'location' : undefined}
            onClick={() => navigateTo(item)}
          >
            {item.label}
          </TextButton>
        ))}
      </nav>
    );
  },
);
