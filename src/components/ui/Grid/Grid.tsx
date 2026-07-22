import {
  forwardRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import './grid.css';

export type GridProps = HTMLAttributes<HTMLDivElement> &
  Readonly<{
    children: ReactNode;
    align?: 'left' | 'center';
  }>;

export const Grid = forwardRef<HTMLDivElement, GridProps>(function Grid(
  { children, className, align = 'left', ...rest },
  ref,
) {
  return (
    <div
      {...rest}
      ref={ref}
      className={['ui-grid', className].filter(Boolean).join(' ')}
      data-align={align}
    >
      {children}
    </div>
  );
});

export type GridItemProps = HTMLAttributes<HTMLDivElement> &
  Readonly<{
    children: ReactNode;
    span: number;
    start?: number;
  }>;

function assertGridValue(name: string, value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 24) {
    throw new RangeError(`${name} must be an integer from 1 to 24.`);
  }
}

export const GridItem = forwardRef<HTMLDivElement, GridItemProps>(function GridItem(
  { children, className, span, start, style, ...rest },
  ref,
) {
  assertGridValue('span', span);
  if (start !== undefined) {
    assertGridValue('start', start);
    if (start + span - 1 > 24) {
      throw new RangeError('GridItem start and span must fit within 24 columns.');
    }
  }
  const gridStyle = {
    ...style,
    '--ui-grid-item-span': span,
    '--ui-grid-item-start': start,
  } as CSSProperties;
  return (
    <div
      {...rest}
      ref={ref}
      className={['ui-grid__item', className].filter(Boolean).join(' ')}
      style={gridStyle}
    >
      {children}
    </div>
  );
});
