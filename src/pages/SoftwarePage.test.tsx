import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../app/App';
import { resetOperationsStore } from '../features/operations';
import { resetSoftwareStore } from '../features/software';

function renderSoftware(path = '/software') {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  return user;
}

beforeEach(() => {
  resetSoftwareStore();
  resetOperationsStore();
});

describe('SoftwarePage', () => {
  it('uses its independent discovery layout and filters by fee policy', async () => {
    const user = renderSoftware();

    expect(screen.getByTestId('software-center-layout')).toBeInTheDocument();
    expect(screen.queryByTestId('side-navigation')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: '软件中心' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('software-navigation')).toHaveAttribute('data-variant', 'software');
    expect(document.querySelector('.software-hero')).toBeInTheDocument();
    expect(document.querySelector('.software-version-matrix')).toBeInTheDocument();
    expect(document.querySelector('.software-adaptation-table')).toBeInTheDocument();
    expect(document.querySelector('.software-featured__spotlight')).toBeNull();

    await user.click(screen.getByRole('combobox', { name: '费用策略' }));
    await user.click(screen.getByRole('option', { name: '服务已包含' }));
    expect(screen.getByText('4 个匹配结果')).toBeInTheDocument();
  });

  it('filters installed software from the hero and opens a detail from the adaptation table', async () => {
    const user = renderSoftware();

    await user.click(
      screen.getByRole('button', { name: '查看已安装软件' }),
    );
    expect(
      screen.getByRole('combobox', { name: '安装状态' }),
    ).toHaveTextContent('已安装或处理中');
    expect(screen.getByText('3 个匹配结果')).toBeInTheDocument();

    const adaptation = screen
      .getByRole('heading', { name: '软件适配与安装覆盖' })
      .closest('section');
    expect(adaptation).toBeTruthy();
    await user.click(
      within(adaptation as HTMLElement).getByRole('button', {
        name: '资源监控组件',
      }),
    );
    expect(
      screen.getByRole('dialog', { name: '软件详情' }),
    ).toBeInTheDocument();
  });

  it('submits an installation and links the result back to the console', async () => {
    const user = renderSoftware('/software?resource=cs-east-002');
    const softwareHeading = screen
      .getAllByRole('heading', { name: '加速计算工具集' })
      .find((heading) => heading.closest('article.software-card'));
    const card = softwareHeading?.closest('article');

    expect(card).toBeTruthy();
    await user.click(within(card as HTMLElement).getByRole('button', { name: '安装到资源' }));
    expect(screen.getByRole('dialog', { name: '安装软件' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /目标资源/ })).toHaveTextContent('视觉训练节点-02');

    await user.click(screen.getByRole('button', { name: '确认安装' }));
    expect(await screen.findByText(/加速计算工具集 12.4 安装任务已提交/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '查看资源软件环境' })).toHaveAttribute(
      'href',
      '/console/resources/cloud-servers/cs-east-002?tab=software',
    );
    expect(screen.getByRole('link', { name: '查看操作记录' })).toHaveAttribute(
      'href',
      '/console/operation-records?module=software',
    );
  });

  it('fully closes the installation workflow from every close control', async () => {
    const user = renderSoftware();
    const card = screen.getByRole('heading', { name: '资源监控组件' }).closest('article');
    expect(card).toBeTruthy();

    await user.click(within(card as HTMLElement).getByRole('button', { name: '安装到资源' }));
    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(within(card as HTMLElement).getByRole('button', { name: '安装到资源' }));
    await user.click(screen.getByRole('button', { name: '关闭弹窗' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(within(card as HTMLElement).getByRole('button', { name: '查看详情' }));
    await user.click(
      within(screen.getByRole('dialog', { name: '软件详情' })).getByRole(
        'button',
        { name: '选择资源安装' },
      ),
    );
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not preselect or allow a resource with an active installation', async () => {
    const user = renderSoftware('/software?resource=cs-east-001');
    const card = screen.getByRole('heading', { name: '资源监控组件' }).closest('article');
    expect(card).toBeTruthy();

    await user.click(within(card as HTMLElement).getByRole('button', { name: '安装到资源' }));
    const resourceSelect = screen.getByRole('combobox', { name: /目标资源/ });
    expect(resourceSelect).toHaveTextContent('请选择目标资源');
    await user.click(resourceSelect);
    expect(
      screen.getByRole('option', { name: '研发计算节点-01 · 已安装' }),
    ).toHaveAttribute('aria-disabled', 'true');
  });

  it('selects an available resource from the installation dialog', async () => {
    const user = renderSoftware();
    const card = screen.getByRole('heading', { name: '资源监控组件' }).closest('article');
    expect(card).toBeTruthy();

    await user.click(within(card as HTMLElement).getByRole('button', { name: '安装到资源' }));
    const resourceSelect = screen.getByRole('combobox', { name: /目标资源/ });
    await user.click(resourceSelect);
    await user.click(screen.getByRole('option', { name: '数据处理节点-03 · 兼容' }));
    expect(resourceSelect).toHaveTextContent('数据处理节点-03 · 兼容');

    await user.click(screen.getByRole('button', { name: '确认安装' }));
    expect(await screen.findByText(/资源监控组件 2.6.1 安装任务已提交/)).toBeInTheDocument();
  });
});
