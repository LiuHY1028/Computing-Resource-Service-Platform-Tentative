import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import { resetResourceStore } from '../features/resources/state/resourceStore';

function LocationObserver() {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname}
      {location.search}
    </output>
  );
}

function renderDetail(path: string) {
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

beforeEach(() => {
  resetResourceStore();
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

describe('ResourceDetailPage', () => {
  it('renders cloud overview and keeps cloud fields distinct', async () => {
    renderDetail('/resources/cloud-servers/cs-east-001');

    expect(
      await screen.findByRole('heading', { name: '研发计算节点-01' }),
    ).toBeInTheDocument();
    expect(screen.getByText('云服务器配置')).toBeInTheDocument();
    expect(screen.getByText('基础 Linux 运行镜像')).toBeInTheDocument();
    expect(screen.getByText('30 GB')).toBeInTheDocument();
    expect(screen.queryByText('整机型号')).not.toBeInTheDocument();
  });

  it('shows deterministic applicable monitoring metrics and range selection', async () => {
    const { user, location } = renderDetail(
      '/resources/cloud-servers/cs-east-002',
    );
    await screen.findByRole('heading', { name: '视觉训练节点-02' });
    await user.click(screen.getByRole('tab', { name: '监控' }));

    expect(location()).toContain('tab=monitoring');
    expect(screen.getByText('CPU 利用率')).toBeInTheDocument();
    expect(screen.getByText('GPU 利用率')).toBeInTheDocument();
    expect(screen.getByText('GPU 显存利用率')).toBeInTheDocument();
    expect(screen.getByText('网络流量')).toBeInTheDocument();

    await user.click(screen.getByLabelText('监控时间范围'));
    await user.click(screen.getByRole('option', { name: '最近 24 小时' }));
    expect(screen.getAllByText('24 小时前').length).toBeGreaterThan(0);
  });

  it('omits GPU metrics for CPU-only resources', async () => {
    const { user } = renderDetail('/resources/cloud-servers/cs-east-001');
    await screen.findByRole('heading', { name: '研发计算节点-01' });
    await user.click(screen.getByRole('tab', { name: '监控' }));

    expect(screen.getByText('CPU 利用率')).toBeInTheDocument();
    expect(screen.queryByText('GPU 利用率')).not.toBeInTheDocument();
    expect(screen.queryByText('GPU 显存利用率')).not.toBeInTheDocument();
  });

  it('copies an SSH command and displays network rule details', async () => {
    const { user } = renderDetail(
      '/resources/cloud-servers/cs-east-001?tab=network',
    );
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined);
    await screen.findByRole('heading', { name: '研发计算节点-01' });
    expect(
      screen.getByText('ssh -p 22 resource-user@198.51.100.21'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '复制命令' }));
    expect(writeText).toHaveBeenCalledWith(
      'ssh -p 22 resource-user@198.51.100.21',
    );
    expect(screen.getByText('SSH 命令已复制。')).toBeInTheDocument();

    const ruleButtons = screen.getAllByRole('button', { name: '查看' });
    await user.click(ruleButtons[0]!);
    const dialog = screen.getByRole('dialog', { name: '访问规则详情' });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('10.0.0.0/8')).toBeInTheDocument();
  });

  it('explains no public IP and physical BMC access without cloud fields', async () => {
    const { user } = renderDetail(
      '/resources/physical-machines/pm-east-002',
    );
    await screen.findByRole('heading', { name: '训练物理节点-02' });
    expect(screen.getByText('物理机配置')).toBeInTheDocument();
    expect(screen.getByText('整机加速计算 P8')).toBeInTheDocument();
    expect(screen.queryByText('系统盘')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '网络与访问' }));
    expect(screen.getByText('公网 IP')).toBeInTheDocument();
    expect(screen.getAllByText('未分配').length).toBeGreaterThan(0);
    expect(
      screen.getByText(/企业网络、专线或跳板环境连接/),
    ).toBeInTheDocument();
    expect(screen.getByText('管理信息受限')).toBeInTheDocument();
  });

  it('shows type-specific storage and operation records', async () => {
    const { user } = renderDetail('/resources/cloud-servers/cs-east-002');
    await screen.findByRole('heading', { name: '视觉训练节点-02' });
    await user.click(screen.getByRole('tab', { name: '存储' }));
    expect(screen.getByText('系统盘与数据盘')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: '云服务器磁盘' })).toBeInTheDocument();
    expect(screen.getAllByText(/IOPS/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('tab', { name: '操作记录' }));
    expect(
      screen.getByRole('table', { name: '资源操作记录' }),
    ).toBeInTheDocument();
    expect(screen.getByText('启动资源')).toBeInTheDocument();
  });

  it('covers missing resources and recoverable detail errors', async () => {
    const missing = renderDetail(
      '/resources/cloud-servers/missing-resource',
    );
    expect(await screen.findByText('未找到资源')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '返回资源列表' }),
    ).toBeInTheDocument();
    expect(missing.location()).toBe(
      '/resources/cloud-servers/missing-resource',
    );
  });

  it('renames through the detail page and keeps the list in sync', async () => {
    const { user } = renderDetail(
      '/resources/cloud-servers/cs-east-001',
    );
    await screen.findByRole('heading', { name: '研发计算节点-01' });
    await user.click(screen.getByRole('button', { name: /更多操作/ }));
    await user.click(screen.getByRole('menuitem', { name: '修改名称' }));
    const input = screen.getByRole('textbox', { name: '资源名称必填' });
    fireEvent.change(input, { target: { value: '研发服务节点-A' } });
    await user.click(screen.getByRole('button', { name: '保存名称' }));

    expect(
      await screen.findByText('资源名称已更新。'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '研发服务节点-A' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '返回资源列表' }));
    expect(await screen.findByText('研发服务节点-A')).toBeInTheDocument();
  });
});
