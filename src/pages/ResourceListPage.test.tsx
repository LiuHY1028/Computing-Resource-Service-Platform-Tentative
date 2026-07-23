import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetResourceRepository } from '../features/resources/services/resourceRepository';
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

function renderResource(path = '/resources/cloud-servers') {
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

beforeEach(resetResourceRepository);

describe('ResourceListPage', () => {
  it('renders and paginates the cloud server list', async () => {
    const { user, location } = renderResource();

    expect(
      await screen.findByRole('table', { name: '云服务器列表' }),
    ).toBeInTheDocument();
    expect(screen.getByText('研发计算节点-01')).toBeInTheDocument();
    expect(screen.getByText('共 8 个结果')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '镜像' })).toBeInTheDocument();

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
    expect(screen.getByText('当前条件')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重置全部' }));
    await waitFor(() => expect(location()).toBe('/resources/cloud-servers'));
    expect(await screen.findByText('研发计算节点-01')).toBeInTheDocument();
  });

  it('distinguishes no results from an empty catalog', async () => {
    const { user } = renderResource(
      '/resources/cloud-servers?q=不存在的资源名称',
    );
    expect(await screen.findByText('没有匹配的资源')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重置筛选' }));
    expect(await screen.findByText('研发计算节点-01')).toBeInTheDocument();
  });

  it('covers fixed loading, recoverable error and empty states', async () => {
    const loading = renderResource(
      '/resources/cloud-servers?viewState=loading',
    );
    expect(await screen.findByText('正在加载…')).toBeInTheDocument();
    expect(loading.location()).toContain('viewState=loading');

    cleanup();
    const error = renderResource('/resources/cloud-servers?viewState=error');
    expect(
      await screen.findByText('资源数据读取失败，请稍后重试。'),
    ).toBeInTheDocument();
    await error.user.click(screen.getByRole('button', { name: '重试' }));
    expect(await screen.findByText('研发计算节点-01')).toBeInTheDocument();

    cleanup();
    renderResource('/resources/cloud-servers?viewState=empty');
    expect(await screen.findByText('暂无资源')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '前往资源商城' }),
    ).toBeInTheDocument();
  });

  it('switches to the physical machine route and shows physical fields', async () => {
    const { user, location } = renderResource();
    await screen.findByText('研发计算节点-01');
    await user.click(screen.getByRole('tab', { name: '物理机' }));

    await waitFor(() =>
      expect(location()).toBe('/resources/physical-machines'),
    );
    expect(await screen.findByText('研发物理节点-01')).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: '操作系统' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: '镜像' }),
    ).not.toBeInTheDocument();
  });

  it('opens details and connection information through stable routes', async () => {
    const { user, location } = renderResource();
    await screen.findByText('研发计算节点-01');
    const detailButtons = screen.getAllByRole('button', { name: '查看详情' });
    expect(detailButtons).toHaveLength(5);
    await user.click(detailButtons[0]!);
    expect(location()).toBe('/resources/cloud-servers/cs-east-001');
  });
});
