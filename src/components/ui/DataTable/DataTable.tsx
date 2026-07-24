import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '../Button/Button';
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
} from '../DropdownMenu/DropdownMenu';
import {
  Table,
  type TableColumn,
  type TableKey,
  type TableProps,
} from '../Table/Table';
import './data-table.css';

export type DataTableDensity = 'compact' | 'standard' | 'comfortable';

export type DataTableProps<T> = Omit<
  TableProps<T>,
  'columns' | 'rows' | 'density' | 'sortKey' | 'sortDirection' | 'onSortChange'
> &
  Readonly<{
    columns: readonly TableColumn<T>[];
    rows: readonly T[];
    eyebrow?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    toolbar?: ReactNode;
    actions?: ReactNode;
    resultLabel?: ReactNode;
    pagination?: ReactNode;
    selectionActions?: ReactNode;
    density?: DataTableDensity;
    onDensityChange?: (density: DataTableDensity) => void;
    enableDensity?: boolean;
    enableColumnSettings?: boolean;
    defaultHiddenColumnKeys?: readonly string[];
  }>;

const DENSITY_LABEL: Readonly<Record<DataTableDensity, string>> = {
  compact: '紧凑',
  standard: '标准',
  comfortable: '宽松',
};

export function DataTable<T>({
  columns,
  rows,
  eyebrow,
  title,
  description,
  toolbar,
  actions,
  resultLabel,
  pagination,
  selectionActions,
  density: controlledDensity,
  onDensityChange,
  enableDensity = true,
  enableColumnSettings = true,
  defaultHiddenColumnKeys = [],
  selectedKeys = [],
  onSelectionChange,
  ...tableProps
}: DataTableProps<T>) {
  const [internalDensity, setInternalDensity] = useState<DataTableDensity>('standard');
  const density = controlledDensity ?? internalDensity;
  const [hiddenKeys, setHiddenKeys] = useState<readonly string[]>(defaultHiddenColumnKeys);
  const [sortKey, setSortKey] = useState('');
  const [sortDirection, setSortDirection] = useState<'ascending' | 'descending'>('ascending');
  const visibleColumns = columns.filter((column) => !hiddenKeys.includes(column.key));
  const hideableColumns = columns.filter((column) => column.hideable !== false);
  const sortedRows = useMemo(() => {
    const column = columns.find((item) => item.key === sortKey);
    if (!column?.sortValue) return rows;
    return [...rows].sort((left, right) => {
      const leftValue = column.sortValue?.(left) ?? '';
      const rightValue = column.sortValue?.(right) ?? '';
      const result = typeof leftValue === 'number' && typeof rightValue === 'number'
        ? leftValue - rightValue
        : String(leftValue).localeCompare(String(rightValue), 'zh-CN', { numeric: true });
      return sortDirection === 'ascending' ? result : -result;
    });
  }, [columns, rows, sortDirection, sortKey]);
  const selectedCount = selectedKeys.length;

  function changeDensity(next: DataTableDensity) {
    if (controlledDensity === undefined) setInternalDensity(next);
    onDensityChange?.(next);
  }

  function changeSort(key: string, direction: 'ascending' | 'descending') {
    setSortKey(key);
    setSortDirection(direction);
  }

  function toggleColumn(key: string) {
    setHiddenKeys((current) => current.includes(key)
      ? current.filter((item) => item !== key)
      : [...current, key]);
  }

  return (
    <section className="ui-data-table" aria-label={typeof title === 'string' ? title : undefined}>
      <header className="ui-data-table__header">
        <div className="ui-data-table__heading">
          {eyebrow && <span>{eyebrow}</span>}
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="ui-data-table__primary-actions">{actions}</div>}
      </header>
      {toolbar && <div className="ui-data-table__filters">{toolbar}</div>}
      <div className="ui-data-table__utility">
        {selectedCount > 0 ? (
          <div className="ui-data-table__selection-bar" role="toolbar" aria-label="已选数据操作">
            <strong>已选择 {selectedCount} 项</strong>
            <div>{selectionActions}</div>
            <Button variant="ghost" onClick={() => onSelectionChange?.([])}>取消选择</Button>
          </div>
        ) : (
          <>
            <span className="ui-data-table__result" aria-live="polite">
              {resultLabel ?? `共 ${rows.length} 项`}
            </span>
            <div className="ui-data-table__settings">
              {enableDensity && (
                <DropdownMenu trigger={`密度：${DENSITY_LABEL[density]}`} aria-label="表格密度">
                  {(Object.keys(DENSITY_LABEL) as DataTableDensity[]).map((item) => (
                    <DropdownMenuItem key={item} onSelect={() => changeDensity(item)}>
                      {item === density ? '✓ ' : ''}{DENSITY_LABEL[item]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenu>
              )}
              {enableColumnSettings && hideableColumns.length > 1 && (
                <DropdownMenu trigger="列设置" aria-label="表格列设置">
                  <DropdownMenuGroup label="显示列">
                    {hideableColumns.map((column) => (
                      <DropdownMenuItem
                        key={column.key}
                        disabled={visibleColumns.length === 1 && !hiddenKeys.includes(column.key)}
                        onSelect={() => toggleColumn(column.key)}
                      >
                        {!hiddenKeys.includes(column.key) ? '✓ ' : ''}{column.title}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                  <DropdownMenuItem onSelect={() => setHiddenKeys(defaultHiddenColumnKeys)}>恢复默认列</DropdownMenuItem>
                </DropdownMenu>
              )}
            </div>
          </>
        )}
      </div>
      <Table<T>
        {...tableProps}
        columns={visibleColumns}
        rows={sortedRows}
        density={density}
        selectedKeys={selectedKeys}
        onSelectionChange={onSelectionChange}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortChange={changeSort}
      />
      {pagination && <footer className="ui-data-table__pagination">{pagination}</footer>}
    </section>
  );
}

export type DataTableSelectionAction = Readonly<{
  key: TableKey;
  label: ReactNode;
}>;
