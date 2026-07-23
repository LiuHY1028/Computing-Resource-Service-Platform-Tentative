import { describe, expect, it } from 'vitest';
import { MARKETPLACE_CLOUD_SYSTEM_DISK_GB } from '../data/marketplaceProducts';
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

describe('marketplace catalog repository', () => {
  it('keeps the catalog inside the confirmed product boundary', async () => {
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
            MARKETPLACE_CLOUD_SYSTEM_DISK_GB,
      ),
    ).toBe(true);
    expect(
      physical.items.every(
        (product) =>
          product.resourceType === 'physical-machine' &&
          !('defaultSystemDiskGb' in product),
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

    expect(cloud.sites).toEqual(['东部算力中心', '西部算力中心']);
    expect(cloud.computeTypes).toEqual(['cpu', 'gpu']);
    expect(cloud.acceleratorModels).toEqual(['通用加速卡 80GB', '高性能加速卡 80GB']);
    expect(cloud.acceleratorCounts).toEqual([1, 2]);
    expect(physical.acceleratorCounts).toEqual([4, 8]);
    expect(physical.acceleratorModels).toEqual([
      '通用加速卡 80GB',
      '高性能加速卡 80GB',
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
        createQuery('physical-machine', { search: '西部算力中心' }),
        immediate,
      ),
    ]);

    expect(byName.items.map((product) => product.id)).toEqual([
      'catalog-cloud-cpu-c8-east',
    ]);
    expect(bySpecification.items).toHaveLength(2);
    expect(
      bySpecification.items.every((product) => product.memoryGb === 128),
    ).toBe(true);
    expect(bySite.items).toHaveLength(2);
    expect(bySite.items.every((product) => product.site === '西部算力中心')).toBe(
      true,
    );
  });

  it('combines multi-value dimensions with compute and availability filters', async () => {
    const result = await queryMarketplaceProducts(
      createQuery('cloud-server', {
        sites: ['东部算力中心', '西部算力中心'],
        computeType: 'gpu',
        acceleratorModels: ['通用加速卡 80GB'],
        acceleratorCounts: [2],
        availability: 'configurable',
      }),
      immediate,
    );

    expect(result.catalogTotal).toBe(6);
    expect(result.total).toBe(1);
    expect(result.items.map((product) => product.id)).toEqual([
      'catalog-cloud-gpu-g2-west',
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
    expect(result.items[0]?.unavailableReason).toBe('该规格当前暂不可继续配置。');
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
      getMarketplaceProductById('catalog-physical-gpu-p8-west'),
    ).toMatchObject({
      resourceType: 'physical-machine',
      accelerator: { count: 8 },
    });
    expect(getMarketplaceProductById('missing-catalog-product')).toBeUndefined();
  });
});
