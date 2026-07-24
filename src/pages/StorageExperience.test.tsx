import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import { resetFileStore } from '../features/files';
import { resetOperationsStore } from '../features/operations';
import { resetOrderStore } from '../features/orders';
import { resetStorageStore } from '../features/storage';

function renderRoute(path: string) {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
  return user;
}

describe('storage purchase and file management routes', () => {
  beforeEach(() => {
    const memory = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => memory.get(key) ?? null,
        removeItem: (key: string) => memory.delete(key),
        setItem: (key: string, value: string) => memory.set(key, value),
      },
    });
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:local-file'), revokeObjectURL: vi.fn() });
    resetStorageStore();
    resetOrderStore();
    resetOperationsStore();
    resetFileStore();
  });

  it('prices and submits a shared-storage purchase without claiming remote delivery', async () => {
    const user = renderRoute('/console/storage/purchase?type=shared&tier=standard');
    expect(screen.getByRole('heading', { level: 1, name: '购买存储' })).toBeInTheDocument();
    expect(screen.getByText('¥0.80 / GB / 月')).toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: /性能等级/ }));
    await user.click(screen.getByRole('option', { name: '性能型' }));
    expect(screen.getByText('¥1.20 / GB / 月')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '提交购买申请' }));
    expect(await screen.findByRole('heading', { name: '存储购买申请已提交' })).toBeInTheDocument();
    expect(screen.getByText(/申请已进入受理流程/)).toBeInTheDocument();
  });

  it('renders storage as one compact data workspace with filters, selection and utility controls', async () => {
    const user = renderRoute('/console/storage');

    expect(screen.getAllByRole('heading', { level: 1, name: '存储管理' })).toHaveLength(1);
    const overview = screen.getByRole('region', { name: '存储资源概览' });
    for (const label of ['存储总数', '总容量', '已使用容量', '本月费用', '即将到期']) {
      expect(within(overview).getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole('region', { name: '存储空间' })).toHaveAttribute('data-version', '2');
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);

    await user.type(screen.getByPlaceholderText('搜索名称、ID或站点'), '研发');
    expect(screen.getByLabelText('已选筛选条件')).toHaveTextContent('关键词：研发');
    await user.click(screen.getByRole('checkbox', { name: /选择研发共享存储/ }));
    expect(screen.getByRole('toolbar', { name: '已选数据操作' })).toHaveTextContent('已选择 1 项');
    await user.click(screen.getByRole('button', { name: '取消选择' }));
    await user.click(screen.getByRole('button', { name: '刷新' }));
    expect(screen.getByRole('status')).toHaveTextContent('存储列表已刷新');
  });

  it('supports directory navigation, list-grid switching and folder creation', async () => {
    const user = renderRoute('/console/storage/storage-shared-east-001/files');
    expect(screen.getByRole('heading', { level: 1, name: '文件管理' })).toBeInTheDocument();
    expect(screen.getAllByText(/研发共享存储/).length).toBeGreaterThan(0);
    expect(screen.getByRole('grid', { name: '文件列表' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: '文件任务中心' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '网格' }));
    expect(document.querySelector('.file-workbench-grid')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '新建文件夹' }));
    await user.type(screen.getByPlaceholderText('输入文件夹名称'), '新目录');
    await user.click(screen.getByRole('button', { name: '创建文件夹' }));
    expect((await screen.findAllByText('新目录')).length).toBeGreaterThan(0);
  });

  it('supports selection commands, keyboard shortcuts, inspector and task drawer', async () => {
    const user = renderRoute('/console/storage/storage-shared-east-001/files');
    await user.dblClick(within(screen.getByRole('grid', { name: '文件列表' })).getByText('项目'));
    await user.click(screen.getByText('README.md'));
    expect(screen.getByRole('toolbar', { name: '已选文件操作' })).toHaveTextContent('已选择 1 项');
    await user.keyboard('{F2}');
    expect(screen.getByRole('dialog', { name: '重命名' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '取消' }));
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: '详细信息' }));
    expect(document.querySelector('.file-workbench-inspector')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '取消选择' }));
    await user.click(screen.getByRole('button', { name: /任务中心/ }));
    expect(screen.getByRole('dialog', { name: '文件任务中心' })).toBeInTheDocument();
  });

  it('keeps checkbox selection from bubbling into a second row toggle', async () => {
    const user = renderRoute('/console/storage/storage-shared-east-001/files');
    const reportCheckbox = screen.getByRole('checkbox', { name: '选择报告' });

    await user.click(reportCheckbox);

    expect(reportCheckbox).toBeChecked();
    expect(screen.getByRole('toolbar', { name: '已选文件操作' })).toHaveTextContent('已选择 1 项');
  });

  it('changes contextual commands and restores a deleted file with Undo', async () => {
    const user = renderRoute('/console/storage/storage-shared-east-001/files');
    await user.dblClick(within(screen.getByRole('grid', { name: '文件列表' })).getByText('项目'));
    const readmeRow = screen.getByText('README.md').closest('[data-file-node]');
    expect(readmeRow).not.toBeNull();

    fireEvent.contextMenu(readmeRow!);
    const fileMenu = screen.getByRole('menu', { name: 'README.md操作' });
    expect(within(fileMenu).getByRole('menuitem', { name: '打开预览' })).toBeInTheDocument();
    expect(within(fileMenu).getByRole('menuitem', { name: '下载文件' })).toBeInTheDocument();
    await user.click(within(fileMenu).getByRole('menuitem', { name: '删除' }));
    await user.click(screen.getByRole('button', { name: '确认删除' }));
    expect(screen.queryByText('README.md')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '撤销' }));
    expect(await screen.findByText('README.md')).toBeInTheDocument();

    fireEvent.contextMenu(document.querySelector('.file-workbench-content')!);
    const blankMenu = screen.getByRole('menu', { name: '目录操作' });
    expect(within(blankMenu).getByRole('menuitem', { name: '上传文件' })).toBeInTheDocument();
    expect(within(blankMenu).getByRole('menuitem', { name: '网格视图' })).toBeInTheDocument();
  });

  it('shows expansion and renewal price summaries before submission', async () => {
    const user = renderRoute('/console/storage/storage-shared-east-001');
    await user.click(screen.getByRole('button', { name: '扩容存储' }));
    expect(screen.getByText('新月度费用')).toBeInTheDocument();
    expect(screen.getByText('本次扩容费用')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '取消' }));

    await user.click(screen.getByRole('button', { name: '续期存储' }));
    expect(screen.getByText('预计新到期时间')).toBeInTheDocument();
    expect(screen.getByText('续期费用')).toBeInTheDocument();
  });
});
