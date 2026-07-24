import { render, screen } from '@testing-library/react';
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
    expect(screen.getByText(/没有执行真实支付、远程存储创建或挂载/)).toBeInTheDocument();
  });

  it('supports directory navigation, list-grid switching and folder creation', async () => {
    const user = renderRoute('/console/storage/storage-shared-east-001/files');
    expect(screen.getByRole('heading', { level: 2, name: /研发共享存储 · 文件管理/ })).toBeInTheDocument();
    expect(screen.getByRole('grid', { name: '文件列表' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '网格视图' }));
    expect(document.querySelector('.file-grid')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '新建文件夹' }));
    await user.type(screen.getByPlaceholderText('输入文件夹名称'), '新目录');
    await user.click(screen.getByRole('button', { name: '创建文件夹' }));
    expect(await screen.findByText('新目录')).toBeInTheDocument();
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
