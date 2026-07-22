import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { Button, ChevronIcon, IconButton, Select, type SelectOption } from '../index';
import { getPaginationItems } from './paginationAlgorithm';
import './pagination.css';

export type PaginationProps = Omit<HTMLAttributes<HTMLElement>, 'onChange'> &
  Readonly<{
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    variant?: 'simple' | 'complex';
    totalItems?: number;
    pageSize?: number;
    pageSizeOptions?: readonly number[];
    onPageSizeChange?: (pageSize: number) => void;
    siblingCount?: number;
    label?: string;
    summary?: ReactNode;
  }>;

export const Pagination = forwardRef<HTMLElement, PaginationProps>(
  function Pagination(
    {
      page,
      totalPages,
      onPageChange,
      variant = 'complex',
      totalItems,
      pageSize,
      pageSizeOptions = [10, 20, 50],
      onPageSizeChange,
      siblingCount = 1,
      label = '分页',
      summary,
      className,
      ...rest
    },
    ref,
  ) {
    const safeTotal = Math.max(1, Math.floor(totalPages));
    const safePage = Math.min(Math.max(1, Math.floor(page)), safeTotal);
    const items = getPaginationItems(safePage, safeTotal, siblingCount);
    const sizeOptions: SelectOption[] = pageSizeOptions.map((size) => ({
      value: String(size),
      label: `${size} 条/页`,
    }));

    function changePage(nextPage: number) {
      const clamped = Math.min(Math.max(1, nextPage), safeTotal);
      if (clamped !== safePage) onPageChange(clamped);
    }

    return (
      <nav
        {...rest}
        ref={ref}
        className={['ui-pagination', className].filter(Boolean).join(' ')}
        data-variant={variant}
        aria-label={label}
      >
        {variant === 'complex' && (
          <span className="ui-pagination__summary">
            {summary ?? (totalItems === undefined ? null : `共 ${totalItems} 条`)}
          </span>
        )}
        <div className="ui-pagination__controls">
          <IconButton
            className="ui-pagination__icon-button ui-pagination__previous"
            aria-label="上一页"
            icon={<ChevronIcon />}
            disabled={safePage === 1}
            onClick={() => changePage(safePage - 1)}
          />
          {variant === 'simple' ? (
            <Button className="ui-pagination__page" variant="secondary" aria-current="page">
              {safePage}
            </Button>
          ) : (
            items.map((item) =>
              typeof item === 'number' ? (
                <Button
                  key={item}
                  className="ui-pagination__page"
                  variant={item === safePage ? 'primary' : 'secondary'}
                  aria-label={`第 ${item} 页`}
                  aria-current={item === safePage ? 'page' : undefined}
                  onClick={() => changePage(item)}
                >
                  {item}
                </Button>
              ) : (
                <span key={item} className="ui-pagination__ellipsis" aria-hidden="true">…</span>
              ),
            )
          )}
          <IconButton
            className="ui-pagination__icon-button ui-pagination__next"
            aria-label="下一页"
            icon={<ChevronIcon />}
            disabled={safePage === safeTotal}
            onClick={() => changePage(safePage + 1)}
          />
        </div>
        {variant === 'complex' && pageSize !== undefined && onPageSizeChange && (
          <Select
            className="ui-pagination__size"
            aria-label="每页数量"
            options={sizeOptions}
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          />
        )}
      </nav>
    );
  },
);
