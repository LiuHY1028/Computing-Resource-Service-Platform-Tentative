import {
  forwardRef,
  useMemo,
  useState,
  type HTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Button, Checkbox } from '../index';
import './table.css';

export type TableKey = string | number;

export type TableColumn<T> = Readonly<{
  key: string;
  title: ReactNode;
  render: (row: T, rowIndex: number) => ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  hideable?: boolean;
  align?: 'left' | 'center' | 'right';
  multiline?: boolean;
  width?: string;
}>;

export type EmptyTableProps = HTMLAttributes<HTMLDivElement> &
  Readonly<{
    title?: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
  }>;

export const EmptyTable = forwardRef<HTMLDivElement, EmptyTableProps>(
  function EmptyTable(
    {
      title = '暂无数据',
      description,
      action,
      className,
      ...rest
    },
    ref,
  ) {
    return (
      <div
        {...rest}
        ref={ref}
        className={['ui-empty-table', className].filter(Boolean).join(' ')}
        role="status"
      >
        <span className="ui-empty-table__mark" aria-hidden="true">—</span>
        <strong>{title}</strong>
        {description && <span>{description}</span>}
        {action && <div className="ui-empty-table__action">{action}</div>}
      </div>
    );
  },
);

export type TableProps<T> = Readonly<{
  columns: readonly TableColumn<T>[];
  rows: readonly T[];
  getRowKey: (row: T, rowIndex: number) => TableKey;
  getRowLabel?: (row: T, rowIndex: number) => string;
  caption?: ReactNode;
  compact?: boolean;
  density?: 'compact' | 'standard' | 'comfortable';
  sortKey?: string;
  sortDirection?: 'ascending' | 'descending';
  onSortChange?: (key: string, direction: 'ascending' | 'descending') => void;
  selectable?: boolean;
  selectedKeys?: readonly TableKey[];
  defaultSelectedKeys?: readonly TableKey[];
  onSelectionChange?: (keys: TableKey[]) => void;
  isRowSelectionDisabled?: (row: T, rowIndex: number) => boolean;
  renderRowActions?: (row: T, rowIndex: number) => ReactNode;
  actionsTitle?: ReactNode;
  empty?: ReactNode;
  loading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  className?: string;
  layout?: 'auto' | 'fixed';
  minWidth?: string;
  overflow?: 'auto' | 'clip';
  actionsWidth?: string;
  onRowClick?: (row: T, rowIndex: number) => void;
  'aria-label'?: string;
}>;

function TableInner<T>(
  {
    columns,
    rows,
    getRowKey,
    getRowLabel,
    caption,
    compact = false,
    density = compact ? 'compact' : 'standard',
    sortKey,
    sortDirection = 'ascending',
    onSortChange,
    selectable = false,
    selectedKeys,
    defaultSelectedKeys = [],
    onSelectionChange,
    isRowSelectionDisabled,
    renderRowActions,
    actionsTitle = '操作',
    empty,
    loading = false,
    error,
    onRetry,
    className,
    layout = 'auto',
    minWidth,
    overflow = 'auto',
    actionsWidth,
    onRowClick,
    'aria-label': ariaLabel,
  }: TableProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  const [internalKeys, setInternalKeys] = useState<readonly TableKey[]>(defaultSelectedKeys);
  const isControlled = selectedKeys !== undefined;
  const currentKeys = isControlled ? selectedKeys : internalKeys;
  const selectedSet = useMemo(() => new Set(currentKeys), [currentKeys]);
  const selectableRows = rows
    .map((row, index) => ({ row, index, key: getRowKey(row, index) }))
    .filter(({ row, index }) => !isRowSelectionDisabled?.(row, index));
  const selectedSelectableCount = selectableRows.filter(({ key }) => selectedSet.has(key)).length;
  const allSelected = selectableRows.length > 0 && selectedSelectableCount === selectableRows.length;
  const partiallySelected = selectedSelectableCount > 0 && !allSelected;
  const columnCount = columns.length + (selectable ? 1 : 0) + (renderRowActions ? 1 : 0);

  function updateSelection(nextSet: Set<TableKey>) {
    const next = Array.from(nextSet);
    if (!isControlled) {
      setInternalKeys(next);
    }
    onSelectionChange?.(next);
  }

  function toggleAll(checked: boolean) {
    const next = new Set(currentKeys);
    selectableRows.forEach(({ key }) => {
      if (checked) next.add(key);
      else next.delete(key);
    });
    updateSelection(next);
  }

  function toggleRow(key: TableKey, checked: boolean) {
    const next = new Set(currentKeys);
    if (checked) next.add(key);
    else next.delete(key);
    updateSelection(next);
  }

  let stateContent: ReactNode = null;
  if (loading) {
    stateContent = <div className="ui-table__state" role="status">正在加载…</div>;
  } else if (error) {
    stateContent = (
      <div className="ui-table__state" role="alert">
        <span>{error}</span>
        {onRetry && <Button onClick={onRetry}>重试</Button>}
      </div>
    );
  } else if (rows.length === 0) {
    stateContent = empty ?? <EmptyTable />;
  }

  return (
    <div
      ref={ref}
      className={['ui-table-shell', className].filter(Boolean).join(' ')}
      data-overflow={overflow}
    >
      <table
        className="ui-table"
        data-compact={density === 'compact' || undefined}
        data-density={density}
        data-layout={layout}
        aria-label={ariaLabel}
        aria-busy={loading || undefined}
        style={{ minWidth } as CSSProperties}
      >
        {caption && <caption>{caption}</caption>}
        <colgroup>
          {selectable && <col className="ui-table__selection-column" />}
          {columns.map((column) => <col key={column.key} style={{ width: column.width }} />)}
          {renderRowActions && <col style={{ width: actionsWidth }} />}
        </colgroup>
        <thead>
          <tr>
            {selectable && (
              <th className="ui-table__selection-cell" scope="col">
                <Checkbox
                  checked={allSelected}
                  indeterminate={partiallySelected}
                  disabled={selectableRows.length === 0 || loading || Boolean(error)}
                  onCheckedChange={toggleAll}
                >
                  <span className="ui-visually-hidden">选择全部可用行</span>
                </Checkbox>
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                data-align={column.align ?? 'left'}
                aria-sort={sortKey === column.key ? sortDirection : undefined}
              >
                {column.sortable && onSortChange ? (
                  <button
                    type="button"
                    className="ui-table__sort"
                    onClick={() => onSortChange(
                      column.key,
                      sortKey === column.key && sortDirection === 'ascending'
                        ? 'descending'
                        : 'ascending',
                    )}
                  >
                    <span>{column.title}</span>
                    <span className="ui-table__sort-mark" aria-hidden="true">
                      {sortKey === column.key ? (sortDirection === 'ascending' ? '↑' : '↓') : '↕'}
                    </span>
                  </button>
                ) : column.title}
              </th>
            ))}
            {renderRowActions && <th className="ui-table__actions-heading" scope="col">{actionsTitle}</th>}
          </tr>
        </thead>
        <tbody>
          {stateContent ? (
            <tr>
              <td className="ui-table__state-cell" colSpan={columnCount}>{stateContent}</td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => {
              const rowKey = getRowKey(row, rowIndex);
              const selected = selectedSet.has(rowKey);
              const selectionDisabled = isRowSelectionDisabled?.(row, rowIndex) ?? false;
              const rowLabel = getRowLabel?.(row, rowIndex) ?? `第 ${rowIndex + 1} 行`;
              return (
                <tr
                  key={rowKey}
                  data-selected={selected || undefined}
                  data-interactive={onRowClick ? true : undefined}
                  onClick={onRowClick ? () => onRowClick(row, rowIndex) : undefined}
                >
                  {selectable && (
                    <td className="ui-table__selection-cell">
                      <Checkbox
                        checked={selected}
                        disabled={selectionDisabled}
                        onCheckedChange={(checked) => toggleRow(rowKey, checked)}
                      >
                        <span className="ui-visually-hidden">选择{rowLabel}</span>
                      </Checkbox>
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.key} data-align={column.align ?? 'left'} data-multiline={column.multiline || undefined}>
                      <div className="ui-table__cell-content">{column.render(row, rowIndex)}</div>
                    </td>
                  ))}
                  {renderRowActions && (
                    <td className="ui-table__actions">{renderRowActions(row, rowIndex)}</td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export const Table = forwardRef(TableInner) as <T>(
  props: TableProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> },
) => React.ReactElement;
