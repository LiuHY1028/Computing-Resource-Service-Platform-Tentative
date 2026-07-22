import { describe, expect, it } from 'vitest';
import { MARKETPLACE_DEMO_CLOUD_SYSTEM_DISK_GB } from '../data/marketplaceProducts';
import type { MarketplaceQuery } from '../types';
import {
  getMarketplaceFilterOptions,
  getMarketplaceProductById,
  MarketplaceRepositoryError,
  queryMarketplaceProducts,
} from './marketplaceRepository';

const immediate = { delayMs: 0 } as const;

function createQuery(
  resourceType: MarketplaceQuery['resourceType'],
  overrides: Partial<MarketplaceQuery> = {},
): MarketplaceQuery {
  return {
    resourceType,
    search: '',
    sites: [],
    computeType: 'all',
    acceleratorModels: [],
    acceleratorCounts: [],
    availability: 'all',
    ...overrides,
  };
}

describe('marketplace demo repository', () => {
  it('keeps the demo catalog inside the confirmed product boundary', async () => {
    const [cloud, physical] = await Promise.all([
      queryMarketplaceProducts(createQuery('cloud-server'), immediate),
      queryMarketplaceProducts(createQuery('physical-machine'), immediate),
    ]);

    expect(cloud.items).not.toHaveLength(0);
    expect(physical.items).not.toHaveLength(0);
    expect(
      cloud.items.every(
        (product) =>
          product.resourceType === 'cloud-server' &&
          product.defaultSystemDiskGb ===
            MARKETPLACE_DEMO_CLOUD_SYSTEM_DISK_GB &&
          product.isDemo,
      ),
    ).toBe(true);
    expect(
      physical.items.every(
        (product) =>
          product.resourceType === 'physical-machine' &&
          !('defaultSystemDiskGb' in product) &&
          product.isDemo,
      ),
    ).toBe(true);
    expect(
      physical.items
        .filter((product) => product.computeType === 'gpu')
        .map((product) => product.accelerator?.count),
    ).toEqual(expect.arrayContaining([4, 8]));
  });

  it('derives resource-specific filter options from the catalog', () => {
    const cloud = getMarketplaceFilterOptions('cloud-server');
    const physical = getMarketplaceFilterOptions('physical-machine');

    expect(cloud.sites).toEqual(['示例站点 A', '示例站点 B']);
    expect(cloud.computeTypes).toEqual(['cpu', 'gpu']);
    expect(cloud.acceleratorModels).toEqual(['示例加速卡 A', '示例加速卡 B']);
    expect(cloud.acceleratorCounts).toEqual([1, 2]);
    expect(physical.acceleratorCounts).toEqual([4, 8]);
    expect(physical.acceleratorModels).toEqual([
      '示例加速卡 A',
      '示例加速卡 B',
    ]);
  });

  it('searches product names, specification text, and sites', async () => {
    const [byName, bySpecification, bySite] = await Promise.all([
      queryMarketplaceProducts(
        createQuery('cloud-server', { search: '通用计算 C8' }),
        immediate,
      ),
      queryMarketplaceProducts(
        createQuery('cloud-server', { search: '128 GB 内存' }),
        immediate,
      ),
      queryMarketplaceProducts(
        createQuery('physical-machine', { search: '示例站点 B' }),
        immediate,
      ),
    ]);

    expect(byName.items.map((product) => product.id)).toEqual([
      'demo-cloud-cpu-c8-site-a',
    ]);
    expect(bySpecification.items).toHaveLength(2);
    expect(
      bySpecification.items.every((product) => product.memoryGb === 128),
    ).toBe(true);
    expect(bySite.items).toHaveLength(2);
    expect(bySite.items.every((product) => product.site === '示例站点 B')).toBe(
      true,
    );
  });

  it('combines multi-value dimensions with compute and availability filters', async () => {
    const result = await queryMarketplaceProducts(
      createQuery('cloud-server', {
        sites: ['示例站点 A', '示例站点 B'],
        computeType: 'gpu',
        acceleratorModels: ['示例加速卡 A'],
        acceleratorCounts: [2],
        availability: 'configurable',
      }),
      immediate,
    );

    expect(result.catalogTotal).toBe(6);
    expect(result.total).toBe(1);
    expect(result.items.map((product) => product.id)).toEqual([
      'demo-cloud-gpu-g2-site-b',
    ]);
  });

  it('returns a filtered total separately from the selected catalog total', async () => {
    const result = await queryMarketplaceProducts(
      createQuery('physical-machine', {
        availability: 'unavailable',
      }),
      immediate,
    );

    expect(result.catalogTotal).toBe(4);
    expect(result.total).toBe(1);
    expect(result.items[0]?.unavailableReason).toMatch(/^演示状态：/);
  });

  it('simulates an empty catalog and a retryable repository failure', async () => {
    await expect(
      queryMarketplaceProducts(
        createQuery('cloud-server'),
        { delayMs: 0, simulateEmpty: true },
      ),
    ).resolves.toEqual({
      items: [],
      total: 0,
      catalogTotal: 0,
    });

    await expect(
      queryMarketplaceProducts(
        createQuery('cloud-server'),
        { delayMs: 0, simulateError: true },
      ),
    ).rejects.toBeInstanceOf(MarketplaceRepositoryError);
  });

  it('supports aborting an in-flight demo request', async () => {
    const controller = new AbortController();
    const request = queryMarketplaceProducts(
      createQuery('cloud-server'),
      { delayMs: 1_000, signal: controller.signal },
    );

    controller.abort();

    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('loads one product through the repository boundary', () => {
    expect(
      getMarketplaceProductById('demo-physical-gpu-p8-site-b'),
    ).toMatchObject({
      resourceType: 'physical-machine',
      accelerator: { count: 8 },
    });
    expect(getMarketplaceProductById('missing-demo-product')).toBeUndefined();
  });
});
