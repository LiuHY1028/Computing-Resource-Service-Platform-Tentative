import { describe, expect, it } from 'vitest';
import { MARKETPLACE_CLOUD_SYSTEM_DISK_GB } from './marketplaceProducts';
import type { MarketplaceQuery } from '../types';
import {
  getMarketplaceFilterOptions,
  getMarketplaceProductById,
  queryMarketplaceProducts,
} from './marketplaceCatalog';

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
    billingMode: 'all',
    priceSort: 'recommended',
    ...overrides,
  };
}

describe('built-in marketplace catalog', () => {
  it('keeps both resource types inside the confirmed product boundary', () => {
    const cloud = queryMarketplaceProducts(createQuery('cloud-server'));
    const physical = queryMarketplaceProducts(createQuery('physical-machine'));

    expect(cloud.items).not.toHaveLength(0);
    expect(physical.items).not.toHaveLength(0);
    expect(
      cloud.items.every(
        (product) =>
          product.resourceType === 'cloud-server' &&
          product.defaultSystemDiskGb === MARKETPLACE_CLOUD_SYSTEM_DISK_GB,
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

  it('derives resource-specific filter options from bundled data', () => {
    const cloud = getMarketplaceFilterOptions('cloud-server');
    const physical = getMarketplaceFilterOptions('physical-machine');

    expect(cloud.sites).toEqual(['东部算力中心', '西部算力中心']);
    expect(cloud.computeTypes).toEqual(['cpu', 'gpu']);
    expect(cloud.acceleratorCounts).toEqual([1, 2]);
    expect(physical.acceleratorCounts).toEqual([4, 8]);
  });

  it('searches names, specifications, and sites synchronously', () => {
    expect(
      queryMarketplaceProducts(
        createQuery('cloud-server', { search: '通用计算 C8' }),
      ).items.map((product) => product.id),
    ).toEqual(['catalog-cloud-cpu-c8-east']);
    expect(
      queryMarketplaceProducts(
        createQuery('cloud-server', { search: '128 GB 内存' }),
      ).items,
    ).toHaveLength(2);
    expect(
      queryMarketplaceProducts(
        createQuery('physical-machine', { search: '西部算力中心' }),
      ).items,
    ).toHaveLength(2);
  });

  it('combines filters and keeps catalog totals stable', () => {
    const result = queryMarketplaceProducts(
      createQuery('cloud-server', {
        sites: ['东部算力中心', '西部算力中心'],
        computeType: 'gpu',
        acceleratorModels: ['通用加速卡 80GB'],
        acceleratorCounts: [2],
        availability: 'configurable',
      }),
    );

    expect(result.catalogTotal).toBe(6);
    expect(result.items.map((product) => product.id)).toEqual([
      'catalog-cloud-gpu-g2-west',
    ]);
  });

  it('returns an empty result only when filters have no match', () => {
    const result = queryMarketplaceProducts(
      createQuery('cloud-server', { search: '不存在的规格' }),
    );

    expect(result.catalogTotal).toBeGreaterThan(0);
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });

  it('sorts by monthly and hourly catalog prices without changing products', () => {
    const monthly = queryMarketplaceProducts(
      createQuery('cloud-server', {
        priceSort: 'price-asc',
        billingMode: 'subscription',
      }),
    );
    const hourly = queryMarketplaceProducts(
      createQuery('cloud-server', {
        priceSort: 'price-desc',
        billingMode: 'pay-as-you-go',
      }),
    );
    expect(monthly.items[0]?.id).toBe('catalog-cloud-cpu-c8-east');
    expect(hourly.items[0]?.id).toBe('catalog-cloud-gpu-g4-west');
    expect(monthly.total).toBe(hourly.total);
  });

  it('finds one product by its stable cross-module id', () => {
    expect(
      getMarketplaceProductById('catalog-physical-gpu-p8-west'),
    ).toMatchObject({
      resourceType: 'physical-machine',
      accelerator: { count: 8 },
    });
    expect(getMarketplaceProductById('missing-catalog-product')).toBeUndefined();
  });
});
