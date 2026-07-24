import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DataTable, type TableColumn } from '../index';

type Row = Readonly<{ id: string; name: string; usage: number; status: string }>;

const rows: readonly Row[] = [
  { id: 'a', name: 'Alpha', usage: 82, status: '偏高' },
  { id: 'b', name: 'Beta', usage: 18, status: '正常' },
];

const columns: readonly TableColumn<Row>[] = [
  { key: 'name', title: '名称', hideable: false, sortable: true, sortValue: (row) => row.name, render: (row) => row.name },
  { key: 'usage', title: '使用率', sortable: true, sortValue: (row) => row.usage, render: (row) => `${row.usage}%` },
  { key: 'status', title: '状态', render: (row) => row.status },
];

describe('DataTable', () => {
  it('sorts, changes density, changes columns and exposes selection actions', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <DataTable
        title="容量列表"
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        selectable
        selectedKeys={[]}
        onSelectionChange={() => undefined}
      />,
    );

    await user.click(screen.getByRole('button', { name: '使用率' }));
    const bodyRows = screen.getAllByRole('row').slice(1);
    expect(within(bodyRows[0]!).getByText('18%')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '表格密度' }));
    await user.click(screen.getByRole('menuitem', { name: /紧凑/ }));
    expect(screen.getByRole('table')).toHaveAttribute('data-density', 'compact');
    await user.click(screen.getByRole('button', { name: '表格列设置' }));
    await user.click(screen.getByRole('menuitem', { name: /状态/ }));
    expect(screen.queryByRole('columnheader', { name: '状态' })).not.toBeInTheDocument();

    rerender(
      <DataTable
        title="容量列表"
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        selectable
        selectedKeys={['a']}
        onSelectionChange={() => undefined}
        selectionActions={<button type="button">批量操作</button>}
      />,
    );
    expect(screen.getByRole('toolbar', { name: '已选数据操作' })).toHaveTextContent('已选择 1 项');
    expect(screen.getByRole('button', { name: '批量操作' })).toBeInTheDocument();
  });
});
