import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetResourceStore } from '../features/resources/state/resourceStore';
import { App } from '../app/App';

function LocationObserver() {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname}
      {location.search}
    </output>
  );
}

function renderResource(path = '/console/resources/cloud-servers') {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <LocationObserver />
    </MemoryRouter>,
  );
  return {
    user,
    location: () => screen.getByTestId('location').textContent,
  };
}

beforeEach(resetResourceStore);

describe('ResourceListPage', () => {
  it('provides a direct cloud-server purchase entry', async () => {
    const { user, location } = renderResource();
    await screen.findByRole('table', { name: '云服务器列表' });
    await user.click(screen.getByRole('button', { name: '购买云服务器' }));
    expect(location()).toBe('/marketplace?type=cloud');
  });

  it('provides a direct physical-machine purchase entry', async () => {
    const { user, location } = renderResource('/console/resources/physical-machines');
    await screen.findByRole('table', { name: '物理机列表' });
    await user.click(screen.getByRole('button', { name: '购买物理机' }));
    expect(location()).toBe('/marketplace?type=physical');
  });

  it('renders and paginates the cloud server list', async () => {
    const { user, location } = renderResource();

    expect(
      await screen.findByRole('table', { name: '云服务器列表' }),
    ).toBeInTheDocument();
    expect(screen.getByText('研发计算节点-01')).toBeInTheDocument();
    expect(screen.getByText('共 8 个结果')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '系统与网络' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '计费与到期' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '第 2 页' }));
    expect(location()).toContain('page=2');
    expect(await screen.findByText('加速验证节点-06')).toBeInTheDocument();
  });

  it('combines URL-backed search and status filtering and can reset', async () => {
    const { user, location } = renderResource();
    const search = await screen.findByRole('searchbox', {
      name: '资源名称或 ID',
    });
    await user.type(search, '训练');
    expect(await screen.findByText('视觉训练节点-02')).toBeInTheDocument();
    expect(screen.queryByText('研发计算节点-01')).not.toBeInTheDocument();
    expect(location()).toContain('q=');

    const status = screen.getByLabelText('运行状态');
    await user.click(status);
    await user.click(screen.getByRole('option', { name: '运行中' }));
    expect(location()).toContain('status=running');
    expect(screen.getByText('已选条件')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '清除全部' }));
    await waitFor(() => expect(location()).toBe('/console/resources/cloud-servers'));
    expect(await screen.findByText('研发计算节点-01')).toBeInTheDocument();
  });

  it('distinguishes no results from an empty catalog', async () => {
    const { user } = renderResource(
      '/console/resources/cloud-servers?q=不存在的资源名称',
    );
    expect(await screen.findByText('没有匹配的资源')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重置筛选' }));
    expect(await screen.findByText('研发计算节点-01')).toBeInTheDocument();
  });

  it('switches to the physical machine route and shows physical fields', async () => {
    const { user, location } = renderResource();
    await screen.findByText('研发计算节点-01');
    await user.click(screen.getByRole('tab', { name: '物理机' }));

    await waitFor(() =>
      expect(location()).toBe('/console/resources/physical-machines'),
    );
    expect(await screen.findByText('研发物理节点-01')).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: '位置与网络' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: '系统与网络' }),
    ).not.toBeInTheDocument();
  });

  it('keeps the default table fluid and enables internal scrolling only for extension columns', async () => {
    const { user } = renderResource();
    const table = await screen.findByRole('table', { name: '云服务器列表' });
    const shell = table.closest('.ui-table-shell');
    expect(shell).toHaveAttribute('data-overflow', 'clip');
    expect(table).toHaveStyle({ minWidth: '0' });
    expect(screen.getByRole('columnheader', { name: '资源' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '状态' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '操作' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '列表列设置' }));
    await user.click(screen.getByRole('menuitem', { name: '镜像完整信息' }));
    expect(screen.getByRole('columnheader', { name: '镜像完整信息' })).toBeInTheDocument();
    expect(shell).toHaveAttribute('data-overflow', 'auto');

    await user.click(screen.getByRole('button', { name: '列表列设置' }));
    await user.click(screen.getByRole('menuitem', { name: '恢复默认列' }));
    expect(screen.queryByRole('columnheader', { name: '镜像完整信息' })).not.toBeInTheDocument();
    expect(shell).toHaveAttribute('data-overflow', 'clip');
  });

  it('opens details and connection information through stable routes', async () => {
    const { user, location } = renderResource();
    await screen.findByText('研发计算节点-01');
    const menus = screen.getAllByRole('button', { name: /更多操作/ });
    await user.click(menus[0]!);
    await user.click(screen.getByRole('menuitem', { name: '查看详情' }));
    expect(location()).toBe('/console/resources/cloud-servers/cs-east-001');
  });
});
