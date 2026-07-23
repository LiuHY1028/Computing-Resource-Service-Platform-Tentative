import {
  act,
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
  useNavigate,
} from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import type {
  MarketplaceQuery,
  MarketplaceQueryResult,
  MarketplaceRepositoryOptions,
} from '../features/marketplace';

type MarketplaceQueryFallback = (
  ignoreAbort?: boolean,
) => Promise<MarketplaceQueryResult>;
type MarketplaceQueryOverride = (
  query: MarketplaceQuery,
  options: MarketplaceRepositoryOptions,
  fallback: MarketplaceQueryFallback,
) => Promise<MarketplaceQueryResult>;

const marketplaceRepositoryControl = vi.hoisted(() => ({
  queryOverride: undefined as MarketplaceQueryOverride | undefined,
}));

vi.mock('../features/marketplace', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../features/marketplace')>();

  return {
    ...actual,
    queryMarketplaceProducts: (
      query: MarketplaceQuery,
      options: MarketplaceRepositoryOptions = {},
    ) => {
      const fallback: MarketplaceQueryFallback = (ignoreAbort = false) =>
        actual.queryMarketplaceProducts(query, {
          ...options,
          delayMs: 0,
          signal: ignoreAbort ? undefined : options.signal,
        });
      return marketplaceRepositoryControl.queryOverride
        ? marketplaceRepositoryControl.queryOverride(query, options, fallback)
        : fallback();
    },
  };
});

function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      <output data-testid="location-probe">
        {location.pathname}
        {location.search}
      </output>
      <button type="button" onClick={() => navigate(-1)}>测试后退</button>
      <button type="button" onClick={() => navigate(1)}>测试前进</button>
    </>
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
  await waitFor(() =>
    expect(screen.getByText('项结果').parentElement).toHaveTextContent(
      `${total}项结果`,
    ),
  );
}

async function waitForPhysicalCatalog(total = 4) {
  await waitFor(() =>
    expect(screen.getByText('项结果').parentElement).toHaveTextContent(
      `${total}项结果`,
    ),
  );
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
  beforeEach(() => {
    window.sessionStorage.clear();
    marketplaceRepositoryControl.queryOverride = undefined;
  });

  it('renders the formal marketplace, not the module placeholder, with its menu selected', async () => {
    renderMarketplace();

    expect(
      screen.getByRole('heading', { level: 1, name: '资源商城' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: '发现适合业务的计算资源',
      }),
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
    expect(screen.queryByText('演示数据')).not.toBeInTheDocument();
    expect(
      screen.getByText(/购买完成后获得独占机器资源/),
    ).toBeInTheDocument();
    await waitForCloudCatalog();
    expect(
      screen.getByRole('heading', { level: 2, name: '云服务器精选规格' }),
    ).toBeInTheDocument();
  });

  it('restores the resource type from the URL and synchronizes pointer changes', async () => {
    const { user, location } = renderMarketplace('/marketplace?type=physical');

    await waitForPhysicalCatalog();
    expect(
      screen.getByRole('heading', { level: 2, name: '物理机整机资源' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '物理机' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(location()).toBe('/marketplace?type=physical');
    expect(
      screen.getByRole('button', { name: '重置全部' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '云服务器' }));

    await waitForCloudCatalog();
    expect(location()).toBe('/marketplace?type=cloud');
    expect(screen.getByText('已切换至云服务器。')).toBeInTheDocument();
  });

  it('keeps the URL as the single type source through 20 rapid switches', async () => {
    const { user, location } = renderMarketplace('/marketplace?type=physical');
    await waitForPhysicalCatalog();
    const search = screen.getByRole('searchbox', {
      name: '搜索资源名称或规格',
    });

    await user.type(search, '计算');
    await selectOption(user, '站点', '东部算力中心');
    closeOpenSelect();
    await selectOption(user, '计算类型', 'GPU 计算');
    await selectOption(user, 'GPU或加速卡型号', '通用加速卡 80GB');
    closeOpenSelect();
    await selectOption(user, 'GPU或加速卡数量', '4 张');
    closeOpenSelect();
    await selectOption(user, '配置状态', '可继续配置');
    await waitForPhysicalCatalog(1);

    for (let index = 0; index < 20; index += 1) {
      await user.click(
        screen.getByRole('tab', {
          name: index % 2 === 0 ? '云服务器' : '物理机',
        }),
      );
    }

    await waitForPhysicalCatalog(1);
    expect(location()).toBe('/marketplace?type=physical');
    expect(screen.getByRole('tab', { name: '物理机' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(search).toHaveValue('计算');
    expect(screen.getByText('站点：东部算力中心')).toBeInTheDocument();
    expect(screen.getByText('型号：通用加速卡 80GB')).toBeInTheDocument();
    expect(screen.queryByText('数量：4 张')).not.toBeInTheDocument();
    expect(screen.getAllByText('可继续配置').length).toBeGreaterThan(0);
    expect(screen.queryByText('正在加载资源规格')).not.toBeInTheDocument();
  });

  it('keeps the latest catalog when an obsolete request resolves last', async () => {
    const pending: Array<{
      resourceType: MarketplaceQuery['resourceType'];
      resolve: () => Promise<void>;
    }> = [];
    marketplaceRepositoryControl.queryOverride = (query, _options, fallback) =>
      new Promise<MarketplaceQueryResult>((resolve, reject) => {
        pending.push({
          resourceType: query.resourceType,
          resolve: async () => {
            try {
              resolve(await fallback(true));
            } catch (error) {
              reject(error);
            }
          },
        });
      });

    const { user } = renderMarketplace('/marketplace?type=cloud');
    await waitFor(() => expect(pending).toHaveLength(1));
    await user.click(screen.getByRole('tab', { name: '物理机' }));
    await waitFor(() => expect(pending).toHaveLength(2));
    expect(pending[1]?.resourceType).toBe('physical-machine');

    await act(async () => pending[1]?.resolve());
    await waitForPhysicalCatalog();
    await act(async () => pending[0]?.resolve());

    expect(
      screen.getByRole('heading', { level: 2, name: '物理机整机资源' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('正在加载资源规格')).not.toBeInTheDocument();
  });

  it('keeps URL, tab, and catalog aligned through browser back and forward', async () => {
    const { user, location } = renderMarketplace('/marketplace?type=cloud');
    await waitForCloudCatalog();
    await user.click(screen.getByRole('tab', { name: '物理机' }));
    await waitForPhysicalCatalog();
    await user.click(screen.getByRole('tab', { name: '云服务器' }));
    await waitForCloudCatalog();

    await user.click(screen.getByRole('button', { name: '测试后退' }));
    await waitForPhysicalCatalog();
    expect(location()).toBe('/marketplace?type=physical');
    expect(screen.getByRole('tab', { name: '物理机' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await user.click(screen.getByRole('button', { name: '测试前进' }));
    await waitForCloudCatalog();
    expect(location()).toBe('/marketplace?type=cloud');
    expect(screen.getByRole('tab', { name: '云服务器' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
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

    await selectOption(user, '站点', '东部算力中心');
    closeOpenSelect();
    await waitForCloudCatalog(3);
    expect(screen.getByText('站点：东部算力中心')).toBeInTheDocument();

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
    expect(screen.getByRole('option', { name: '通用加速卡 80GB' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '高性能加速卡 80GB' })).toBeInTheDocument();
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

    await selectOption(user, '站点', '西部算力中心');
    closeOpenSelect();
    await selectOption(user, '计算类型', 'GPU 计算');
    await selectOption(user, 'GPU或加速卡型号', '通用加速卡 80GB');
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
    await selectOption(user, 'GPU或加速卡型号', '通用加速卡 80GB');
    closeOpenSelect();
    await selectOption(user, 'GPU或加速卡数量', '1 张');
    closeOpenSelect();
    expect(screen.getByText('数量：1 张')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '物理机' }));

    await waitForPhysicalCatalog(2);
    expect(screen.queryByText('数量：1 张')).not.toBeInTheDocument();
    expect(screen.getByText('型号：通用加速卡 80GB')).toBeInTheDocument();

    await selectOption(user, '计算类型', 'CPU 计算');

    await waitForPhysicalCatalog(1);
    expect(screen.queryByRole('combobox', { name: 'GPU或加速卡型号' })).not.toBeInTheDocument();
    expect(screen.queryByText('型号：通用加速卡 80GB')).not.toBeInTheDocument();
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
    expect(screen.queryByLabelText('当前筛选条件')).not.toBeInTheDocument();
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

  it('renders cloud fields with system-disk semantics and no fake GPU on CPU cards', async () => {
    renderMarketplace();
    await waitForCloudCatalog();
    const cpuCard = screen.getByRole('article', {
      name: '通用计算 C8，可继续配置',
    });
    const gpuCard = screen.getByRole('article', {
      name: '加速计算 G1，可继续配置',
    });

    expect(cpuCard).toHaveAttribute('data-resource-type', 'cloud-server');
    expect(cpuCard).toHaveAttribute('data-compute-type', 'cpu');
    expect(gpuCard).toHaveAttribute('data-resource-type', 'cloud-server');
    expect(gpuCard).toHaveAttribute('data-compute-type', 'gpu');
    expect(cpuCard).toHaveTextContent('云服务器');
    expect(cpuCard).toHaveTextContent('东部算力中心');
    expect(cpuCard).toHaveTextContent('CPU 计算');
    expect(cpuCard).toHaveTextContent('8 vCPU');
    expect(cpuCard).toHaveTextContent('内存32 GB');
    expect(cpuCard).toHaveTextContent('默认系统盘30 GB');
    expect(within(cpuCard).queryByText('加速卡型号')).not.toBeInTheDocument();
    expect(cpuCard).not.toHaveTextContent('无卡');

    expect(gpuCard).toHaveTextContent('GPU 计算');
    expect(gpuCard).toHaveTextContent('加速卡型号通用加速卡 80GB');
    expect(gpuCard).toHaveTextContent('加速卡数量1 张');

    const catalog = screen.getByLabelText('资源商品列表');
    const firstGridItem = catalog.querySelector<HTMLElement>(
      '.marketplace-results__item',
    );
    expect(firstGridItem?.style.getPropertyValue('--ui-grid-item-span')).toBe(
      '6',
    );
    expect(
      within(cpuCard).getByLabelText('核心硬件规格').children,
    ).toHaveLength(4);
    expect(cpuCard.querySelector('.resource-product-card__header')).toBeInTheDocument();
    expect(cpuCard.querySelector('.resource-product-card__body')).toBeInTheDocument();
    expect(cpuCard.querySelector('.resource-product-card__footer')).toBeInTheDocument();
    expect(
      gpuCard.querySelector("[data-metric='accelerator'][data-emphasis='primary']"),
    ).toBeInTheDocument();
  });

  it('renders physical-machine whole-system fields without a cloud system disk', async () => {
    const { user } = renderMarketplace();
    await waitForCloudCatalog();
    await user.click(screen.getByRole('tab', { name: '物理机' }));
    await waitForPhysicalCatalog();
    const card = screen.getByRole('article', {
      name: '整机加速计算 P8，可继续配置',
    });
    const cpuCard = screen.getByRole('article', {
      name: '整机通用计算 P1，可继续配置',
    });

    expect(cpuCard).toHaveAttribute('data-resource-type', 'physical-machine');
    expect(cpuCard).toHaveAttribute('data-compute-type', 'cpu');
    expect(card).toHaveAttribute('data-resource-type', 'physical-machine');
    expect(card).toHaveAttribute('data-compute-type', 'gpu');
    expect(card).toHaveTextContent('物理机');
    expect(card).toHaveTextContent('2 × 48 核通用处理器');
    expect(card).toHaveTextContent('内存1024 GB');
    expect(card).toHaveTextContent('加速卡型号高性能加速卡 80GB');
    expect(card).toHaveTextContent('加速卡数量8 张');
    expect(card).toHaveTextContent('整机摘要双路处理器、八张加速卡整机规格');
    expect(card).not.toHaveTextContent('默认系统盘');
    expect(
      within(card).getByLabelText('核心硬件规格').children,
    ).toHaveLength(4);
    expect(
      card.querySelector("[data-metric='accelerator-count']"),
    ).toHaveTextContent('8 张');
    expect(
      card.querySelector('.resource-product-card__machine-summary'),
    ).toHaveAttribute('tabindex', '0');
    expect(
      card.querySelector(
        "[data-metric='cpu-long'] .resource-product-card__metric-value",
      ),
    ).toHaveAttribute('tabindex', '0');
    expect(
      card.querySelector(
        "[data-metric='accelerator'] .resource-product-card__metric-value",
      ),
    ).toHaveAttribute('tabindex', '0');
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
    expect(unavailableCard).toHaveTextContent('该规格当前暂不可继续配置。');
    await user.click(disabledButton);
    expect(location()).toBe('/marketplace');

    const availableCard = screen.getByRole('article', {
      name: '通用计算 C8，可继续配置',
    });
    await user.click(
      within(availableCard).getByRole('button', { name: '立即配置' }),
    );

    expect(location()).toBe(
      '/marketplace/cloud-server/purchase?product=catalog-cloud-cpu-c8-east',
    );
    expect(
      screen.getByRole('heading', { level: 1, name: '配置云服务器' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 1, name: '配置云服务器' }),
    ).toBeInTheDocument();
    expect((await screen.findAllByText('通用计算 C8')).length).toBeGreaterThan(0);
  });

  it('returns from both purchase pages to the matching marketplace type', async () => {
    const { user, location } = renderMarketplace(
      '/marketplace/cloud-server/purchase?product=catalog-cloud-gpu-g1-east',
    );

    expect((await screen.findAllByText('加速计算 G1')).length).toBeGreaterThan(0);
    await user.click((await screen.findAllByRole('button', { name: '返回资源商城' }))[0]!);
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
      '/marketplace/physical-machine/purchase?product=catalog-physical-cpu-p1-east',
    );
    expect(
      screen.getByRole('heading', { level: 1, name: '配置物理机' }),
    ).toBeInTheDocument();
    expect((await screen.findAllByText('整机通用计算 P1')).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole('button', { name: '返回资源商城' })[0]!);
    await waitForPhysicalCatalog();
    expect(location()).toBe('/marketplace?type=physical');
    expect(screen.getByRole('tab', { name: '物理机' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('restores search, every active filter, page context, and scroll position after purchase navigation', async () => {
    const { user, location } = renderMarketplace();
    await waitForCloudCatalog();
    const search = screen.getByRole('searchbox', { name: '搜索资源名称或规格' });

    await selectOption(user, '站点', '西部算力中心');
    closeOpenSelect();
    await selectOption(user, '计算类型', 'GPU 计算');
    await selectOption(user, 'GPU或加速卡型号', '通用加速卡 80GB');
    closeOpenSelect();
    await selectOption(user, 'GPU或加速卡数量', '2 张');
    closeOpenSelect();
    await selectOption(user, '配置状态', '可继续配置');
    await user.type(search, 'G2');
    await waitForCloudCatalog(1);

    const scrollRegion = document.querySelector<HTMLElement>('.main-content__scroll-region');
    expect(scrollRegion).not.toBeNull();
    if (scrollRegion) scrollRegion.scrollTop = 420;
    const product = screen.getByRole('article', { name: '加速计算 G2，可继续配置' });
    await user.click(within(product).getByRole('button', { name: '立即配置' }));
    await screen.findByRole('heading', { level: 1, name: '配置云服务器' });
    await user.click((await screen.findAllByRole('button', { name: '返回资源商城' }))[0]!);

    await waitForCloudCatalog(1);
    expect(location()).toBe('/marketplace?type=cloud');
    expect(search).toHaveValue('G2');
    expect(screen.getByText('站点：西部算力中心')).toBeInTheDocument();
    expect(screen.getAllByText('GPU 计算').length).toBeGreaterThan(0);
    expect(screen.getByText('型号：通用加速卡 80GB')).toBeInTheDocument();
    expect(screen.getByText('数量：2 张')).toBeInTheDocument();
    expect(screen.getAllByText('可继续配置').length).toBeGreaterThan(0);
    await waitFor(() => expect(scrollRegion).toHaveProperty('scrollTop', 420));
    expect(await screen.findByText('已恢复离开前的筛选、分页和浏览位置。')).toBeInTheDocument();
  });
});
