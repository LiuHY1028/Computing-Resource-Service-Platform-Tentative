import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MemoryRouter,
  useLocation,
} from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';

vi.mock('../features/marketplace', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../features/marketplace')>();

  return {
    ...actual,
    queryMarketplaceProducts: (
      query: import('../features/marketplace').MarketplaceQuery,
      options: import('../features/marketplace').MarketplaceRepositoryOptions = {},
    ) =>
      actual.queryMarketplaceProducts(query, {
        ...options,
        delayMs: 0,
      }),
  };
});

function LocationProbe() {
  const location = useLocation();

  return (
    <output data-testid="location-probe">
      {location.pathname}
      {location.search}
    </output>
  );
}

function renderMarketplace(path = '/marketplace') {
  const user = userEvent.setup();

  render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <App />
    </MemoryRouter>,
  );

  return {
    user,
    location: () => screen.getByTestId('location-probe').textContent ?? '',
  };
}

async function waitForCloudCatalog(total = 6) {
  await screen.findByText(`共 ${total} 项云服务器结果`);
}

async function waitForPhysicalCatalog(total = 4) {
  await screen.findByText(`共 ${total} 项物理机结果`);
}

async function selectOption(
  user: ReturnType<typeof userEvent.setup>,
  comboboxName: string,
  optionName: string,
) {
  await user.click(screen.getByRole('combobox', { name: comboboxName }));
  await user.click(screen.getByRole('option', { name: optionName }));
}

function closeOpenSelect() {
  fireEvent.pointerDown(document.body);
}

describe('MarketplacePage', () => {
  it('renders the formal marketplace, not the module placeholder, with its menu selected', async () => {
    renderMarketplace();

    expect(
      screen.getByRole('heading', { level: 1, name: '资源商城' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: '选择适合的机器资源' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('模块占位页面')).not.toBeInTheDocument();
    expect(screen.queryByText('MKT-01')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '资源商城' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('tab', { name: '云服务器' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByText('演示数据')).toBeInTheDocument();
    expect(
      screen.getByText(/购买完成后获得独占机器资源/),
    ).toBeInTheDocument();
    await waitForCloudCatalog();
  });

  it('restores the resource type from the URL and synchronizes pointer changes', async () => {
    const { user, location } = renderMarketplace('/marketplace?type=physical');

    await waitForPhysicalCatalog();
    expect(screen.getByRole('tab', { name: '物理机' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(location()).toBe('/marketplace?type=physical');

    await user.click(screen.getByRole('tab', { name: '云服务器' }));

    await waitForCloudCatalog();
    expect(location()).toBe('/marketplace?type=cloud');
    expect(screen.getByText('已切换至云服务器。')).toBeInTheDocument();
  });

  it('uses manual keyboard activation for resource-type tabs', async () => {
    const { user, location } = renderMarketplace();
    await waitForCloudCatalog();
    const cloudTab = screen.getByRole('tab', { name: '云服务器' });
    const physicalTab = screen.getByRole('tab', { name: '物理机' });

    cloudTab.focus();
    await user.keyboard('{ArrowRight}');

    expect(physicalTab).toHaveFocus();
    expect(cloudTab).toHaveAttribute('aria-selected', 'true');
    expect(location()).toBe('/marketplace');

    await user.keyboard('{Enter}');

    await waitForPhysicalCatalog();
    expect(physicalTab).toHaveAttribute('aria-selected', 'true');
    expect(location()).toBe('/marketplace?type=physical');
  });

  it('searches by product name and specification text', async () => {
    const { user } = renderMarketplace();
    await waitForCloudCatalog();
    const search = screen.getByRole('searchbox', {
      name: '搜索资源名称或规格',
    });

    await user.type(search, '通用计算 C8{Enter}');

    await waitForCloudCatalog(1);
    expect(
      screen.getByRole('article', { name: '通用计算 C8，可继续配置' }),
    ).toBeInTheDocument();
    expect(screen.getByText('已按“通用计算 C8”搜索资源。')).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, '128 GB 内存');

    await waitForCloudCatalog(2);
    expect(
      screen.getByRole('article', { name: '加速计算 G2，可继续配置' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('article', { name: '加速计算 G3，暂不可配置' }),
    ).toBeInTheDocument();
  });

  it('filters by site, CPU/GPU compute type, and availability', async () => {
    const { user } = renderMarketplace();
    await waitForCloudCatalog();

    await selectOption(user, '站点', '示例站点 A');
    closeOpenSelect();
    await waitForCloudCatalog(3);
    expect(screen.getByText('站点：示例站点 A')).toBeInTheDocument();

    await selectOption(user, '计算类型', 'CPU 计算');
    await waitForCloudCatalog(1);
    expect(
      screen.getByRole('article', { name: '通用计算 C8，可继续配置' }),
    ).toBeInTheDocument();

    await selectOption(user, '计算类型', 'GPU 计算');
    await waitForCloudCatalog(2);
    expect(screen.getByRole('combobox', { name: 'GPU或加速卡型号' })).toBeInTheDocument();

    await selectOption(user, '配置状态', '暂不可配置');
    await waitForCloudCatalog(1);
    expect(
      screen.getByRole('article', { name: '加速计算 G3，暂不可配置' }),
    ).toBeInTheDocument();
  });

  it('derives accelerator model and count options from the active catalog', async () => {
    const { user } = renderMarketplace();
    await waitForCloudCatalog();

    await selectOption(user, '计算类型', 'GPU 计算');
    await user.click(screen.getByRole('combobox', { name: 'GPU或加速卡型号' }));
    expect(screen.getByRole('option', { name: '示例加速卡 A' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '示例加速卡 B' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '无卡' })).not.toBeInTheDocument();
    closeOpenSelect();

    await user.click(screen.getByRole('combobox', { name: 'GPU或加速卡数量' }));
    expect(screen.getByRole('option', { name: '1 张' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '2 张' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '4 张' })).not.toBeInTheDocument();
    closeOpenSelect();

    await user.click(screen.getByRole('tab', { name: '物理机' }));
    await waitForPhysicalCatalog(3);
    await user.click(screen.getByRole('combobox', { name: 'GPU或加速卡数量' }));
    expect(screen.getByRole('option', { name: '4 张' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '8 张' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '1 张' })).not.toBeInTheDocument();
  });

  it('combines site, compute, model, count, and availability filters', async () => {
    const { user } = renderMarketplace();
    await waitForCloudCatalog();

    await selectOption(user, '站点', '示例站点 B');
    closeOpenSelect();
    await selectOption(user, '计算类型', 'GPU 计算');
    await selectOption(user, 'GPU或加速卡型号', '示例加速卡 A');
    closeOpenSelect();
    await selectOption(user, 'GPU或加速卡数量', '2 张');
    closeOpenSelect();
    await selectOption(user, '配置状态', '可继续配置');

    await waitForCloudCatalog(1);
    expect(
      screen.getByRole('article', { name: '加速计算 G2，可继续配置' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: /加速计算 G4/ })).not.toBeInTheDocument();
  });

  it('clears accelerator conditions when they become invalid', async () => {
    const { user } = renderMarketplace();
    await waitForCloudCatalog();

    await selectOption(user, '计算类型', 'GPU 计算');
    await selectOption(user, 'GPU或加速卡型号', '示例加速卡 A');
    closeOpenSelect();
    await selectOption(user, 'GPU或加速卡数量', '1 张');
    closeOpenSelect();
    expect(screen.getByText('数量：1 张')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '物理机' }));

    await waitForPhysicalCatalog(2);
    expect(screen.queryByText('数量：1 张')).not.toBeInTheDocument();
    expect(screen.getByText('型号：示例加速卡 A')).toBeInTheDocument();

    await selectOption(user, '计算类型', 'CPU 计算');

    await waitForPhysicalCatalog(1);
    expect(screen.queryByRole('combobox', { name: 'GPU或加速卡型号' })).not.toBeInTheDocument();
    expect(screen.queryByText('型号：示例加速卡 A')).not.toBeInTheDocument();
  });

  it('resets every condition to the default cloud catalog with feedback', async () => {
    const { user, location } = renderMarketplace('/marketplace?type=physical');
    await waitForPhysicalCatalog();
    const search = screen.getByRole('searchbox', {
      name: '搜索资源名称或规格',
    });
    await user.type(search, 'P8');
    await waitForPhysicalCatalog(1);

    await user.click(screen.getByRole('button', { name: '重置全部' }));

    await waitForCloudCatalog();
    expect(location()).toBe('/marketplace?type=cloud');
    expect(search).toHaveValue('');
    await waitFor(() => expect(search).toHaveFocus());
    expect(screen.getByText('已重置全部筛选，当前显示全部云服务器。')).toBeInTheDocument();
    expect(screen.getByLabelText('当前筛选条件')).toHaveTextContent('全部资源');
  });

  it('distinguishes no results and supports both clear-search and reset actions', async () => {
    const { user } = renderMarketplace();
    await waitForCloudCatalog();
    const search = screen.getByRole('searchbox', {
      name: '搜索资源名称或规格',
    });

    await user.type(search, '不存在的规格');

    expect(await screen.findByText('未找到匹配资源')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '清除搜索' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重置筛选' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '清除搜索' }));
    await waitForCloudCatalog();
    expect(search).toHaveValue('');

    await user.type(search, '仍然不存在');
    expect(await screen.findByText('未找到匹配资源')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重置筛选' }));
    await waitForCloudCatalog();
    expect(search).toHaveValue('');
  });

  it('keeps the development loading state persistent across type changes', async () => {
    const { user, location } = renderMarketplace(
      '/marketplace?demoState=loading',
    );

    const loadingTitle = screen.getByText('正在加载资源规格');
    expect(loadingTitle.closest('[data-state]')).toHaveAttribute(
      'data-state',
      'loading',
    );
    expect(screen.queryByRole('article')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '物理机' }));

    expect(screen.getByText('正在加载资源规格')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(location()).toBe('/marketplace?demoState=loading&type=physical');
  });

  it('turns the error state into successful results after a real retry', async () => {
    const { user } = renderMarketplace('/marketplace?demoState=error');

    const error = await screen.findByRole('alert');
    expect(error).toHaveAttribute('data-state', 'error');
    expect(error).toHaveTextContent('资源加载失败');

    await user.click(within(error).getByRole('button', { name: '重新加载' }));

    await waitForCloudCatalog();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('正在重新加载演示资源。')).toBeInTheDocument();
  });

  it('uses empty-catalog copy that is distinct from filtered no results', async () => {
    const { user } = renderMarketplace('/marketplace?demoState=empty');

    expect(await screen.findByText('当前暂无云服务器资源')).toBeInTheDocument();
    expect(
      screen.getByText('当前开发验收场景没有可展示的演示资源，可查看另一类资源。'),
    ).toBeInTheDocument();
    expect(screen.queryByText('未找到匹配资源')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '查看另一类资源' }));
    await waitForPhysicalCatalog();
    expect(screen.getByText('已切换至物理机并退出空目录验收场景。')).toBeInTheDocument();
  });

  it('renders cloud fields with system-disk semantics and no fake GPU on CPU cards', async () => {
    renderMarketplace();
    await waitForCloudCatalog();
    const cpuCard = screen.getByRole('article', {
      name: '通用计算 C8，可继续配置',
    });
    const gpuCard = screen.getByRole('article', {
      name: '加速计算 G1，可继续配置',
    });

    expect(cpuCard).toHaveTextContent('云服务器');
    expect(cpuCard).toHaveTextContent('示例站点 A');
    expect(cpuCard).toHaveTextContent('CPU 计算');
    expect(cpuCard).toHaveTextContent('8 vCPU');
    expect(cpuCard).toHaveTextContent('内存32 GB');
    expect(cpuCard).toHaveTextContent('默认系统盘30 GB');
    expect(within(cpuCard).queryByText('加速卡型号')).not.toBeInTheDocument();
    expect(cpuCard).not.toHaveTextContent('无卡');

    expect(gpuCard).toHaveTextContent('GPU 计算');
    expect(gpuCard).toHaveTextContent('加速卡型号示例加速卡 A');
    expect(gpuCard).toHaveTextContent('加速卡数量1 张');
  });

  it('renders physical-machine whole-system fields without a cloud system disk', async () => {
    const { user } = renderMarketplace();
    await waitForCloudCatalog();
    await user.click(screen.getByRole('tab', { name: '物理机' }));
    await waitForPhysicalCatalog();
    const card = screen.getByRole('article', {
      name: '整机加速计算 P8，可继续配置',
    });

    expect(card).toHaveTextContent('物理机');
    expect(card).toHaveTextContent('2 × 48 核通用处理器（演示）');
    expect(card).toHaveTextContent('内存1024 GB');
    expect(card).toHaveTextContent('加速卡型号示例加速卡 B');
    expect(card).toHaveTextContent('加速卡数量8 张');
    expect(card).toHaveTextContent('整机摘要双路处理器、八张加速卡整机规格（演示）');
    expect(card).not.toHaveTextContent('默认系统盘');
  });

  it('routes configurable products and keeps unavailable products disabled in place', async () => {
    const { user, location } = renderMarketplace();
    await waitForCloudCatalog();
    const unavailableCard = screen.getByRole('article', {
      name: '通用计算 C16，暂不可配置',
    });
    const disabledButton = within(unavailableCard).getByRole('button', {
      name: '立即配置',
    });

    expect(disabledButton).toBeDisabled();
    expect(disabledButton).toHaveAttribute('aria-describedby');
    expect(unavailableCard).toHaveTextContent('演示状态：该规格当前暂不可继续配置。');
    await user.click(disabledButton);
    expect(location()).toBe('/marketplace');

    const availableCard = screen.getByRole('article', {
      name: '通用计算 C8，可继续配置',
    });
    await user.click(
      within(availableCard).getByRole('button', { name: '立即配置' }),
    );

    expect(location()).toBe(
      '/marketplace/cloud-server/purchase?product=demo-cloud-cpu-c8-site-a',
    );
    expect(
      screen.getByRole('heading', { level: 1, name: '云服务器购买配置' }),
    ).toBeInTheDocument();
    expect(screen.getByText('已从资源商城选择演示规格')).toBeInTheDocument();
    expect(screen.getByText('通用计算 C8')).toBeInTheDocument();
  });

  it('returns from both purchase placeholders to the matching marketplace type', async () => {
    const { user, location } = renderMarketplace(
      '/marketplace/cloud-server/purchase?product=demo-cloud-gpu-g1-site-a',
    );

    expect(screen.getByText('加速计算 G1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '返回资源商城' }));
    await waitForCloudCatalog();
    expect(location()).toBe('/marketplace?type=cloud');

    await user.click(screen.getByRole('tab', { name: '物理机' }));
    await waitForPhysicalCatalog();
    const physicalCard = screen.getByRole('article', {
      name: '整机通用计算 P1，可继续配置',
    });
    await user.click(
      within(physicalCard).getByRole('button', { name: '立即配置' }),
    );

    expect(location()).toBe(
      '/marketplace/physical-machine/purchase?product=demo-physical-cpu-p1-site-a',
    );
    expect(
      screen.getByRole('heading', { level: 1, name: '物理机购买配置' }),
    ).toBeInTheDocument();
    expect(screen.getByText('整机通用计算 P1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '返回资源商城' }));
    await waitForPhysicalCatalog();
    expect(location()).toBe('/marketplace?type=physical');
    expect(screen.getByRole('tab', { name: '物理机' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
