import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button, Table, TextButton, type TableColumn, type TableKey } from '../index';

type Row = Readonly<{ id: number; label: string; detail: string; disabled?: boolean }>;
const rows: readonly Row[] = [
  { id: 1, label: '第一行', detail: '说明一' },
  { id: 2, label: '第二行', detail: '说明二' },
  { id: 3, label: '第三行', detail: '说明三', disabled: true },
];
const columns: readonly TableColumn<Row>[] = [
  { key: 'label', title: '名称', render: (row) => row.label },
  { key: 'detail', title: '说明', multiline: true, render: (row) => <><strong>{row.detail}</strong><span>第二行内容</span></> },
];

describe('Table', () => {
  it('renders typed columns, native table semantics, compact rows and actions', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <Table
        aria-label="示例表格"
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        compact
        renderRowActions={(row) => <TextButton onClick={() => onAction(row.id)}>查看</TextButton>}
      />,
    );
    expect(screen.getByRole('table', { name: '示例表格' })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.getByRole('table')).toHaveAttribute('data-compact', 'true');
    await user.click(screen.getAllByRole('button', { name: '查看' })[0]!);
    expect(onAction).toHaveBeenCalledWith(1);
  });

  it('selects rows, selects all available rows, exposes indeterminate and disables selection', async () => {
    const user = userEvent.setup();
    const changes: TableKey[][] = [];
    const { rerender } = render(
      <Table
        aria-label="多选表格"
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        getRowLabel={(row) => row.label}
        selectable
        selectedKeys={[1]}
        onSelectionChange={(keys) => changes.push(keys)}
        isRowSelectionDisabled={(row) => Boolean(row.disabled)}
      />,
    );
    const selectAll = screen.getByRole('checkbox', { name: '选择全部可用行' });
    expect(selectAll).toHaveAttribute('aria-checked', 'mixed');
    expect(screen.getByRole('checkbox', { name: '选择第三行' })).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: '选择第二行' }));
    expect(changes.at(-1)).toEqual([1, 2]);

    rerender(
      <Table aria-label="多选表格" columns={columns} rows={rows} getRowKey={(row) => row.id} getRowLabel={(row) => row.label} selectable selectedKeys={[]} onSelectionChange={(keys) => changes.push(keys)} isRowSelectionDisabled={(row) => Boolean(row.disabled)} />,
    );
    await user.click(screen.getByRole('checkbox', { name: '选择全部可用行' }));
    expect(changes.at(-1)).toEqual([1, 2]);
  });

  it('renders Empty, Loading and Error with retry', async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    const { rerender } = render(<Table aria-label="状态表格" columns={columns} rows={[]} getRowKey={(row) => row.id} />);
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
    rerender(<Table aria-label="状态表格" columns={columns} rows={[]} getRowKey={(row) => row.id} loading />);
    expect(screen.getByRole('status')).toHaveTextContent('正在加载');
    rerender(<Table aria-label="状态表格" columns={columns} rows={[]} getRowKey={(row) => row.id} error="加载失败" onRetry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('加载失败');
    await user.click(screen.getByRole('button', { name: '重试' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('accepts a custom empty action', () => {
    render(<Table aria-label="空表格" columns={columns} rows={[]} getRowKey={(row) => row.id} empty={<Button>创建</Button>} />);
    expect(screen.getByRole('button', { name: '创建' })).toBeInTheDocument();
  });
});
