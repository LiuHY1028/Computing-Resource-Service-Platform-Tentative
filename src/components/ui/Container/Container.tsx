import {
  forwardRef,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import './container.css';

export type ContainerVariant =
  | 'borderless'
  | 'default'
  | 'disabled'
  | 'dashed'
  | 'danger'
  | 'focus'
  | 'marked'
  | 'info'
  | 'urgent'
  | 'success'
  | 'attention';

export type ContainerShadow = 'none' | 'button-hover' | 'dropdown' | 'floating';

export type ContainerProps = Omit<HTMLAttributes<HTMLElement>, 'children'> &
  Readonly<{
    as?: ElementType;
    children?: ReactNode;
    variant?: ContainerVariant;
    shadow?: ContainerShadow;
  }>;

export const Container = forwardRef<HTMLElement, ContainerProps>(function Container(
  {
    as: Component = 'div',
    children,
    className,
    variant = 'default',
    shadow = 'none',
    ...rest
  },
  ref,
) {
  const classes = ['ui-container', className].filter(Boolean).join(' ');

  return (
    <Component
      {...rest}
      ref={ref}
      className={classes}
      data-variant={variant}
      data-shadow={shadow}
    >
      {children}
    </Component>
  );
});
