import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadMarketplaceNavigationContext,
  saveMarketplaceNavigationContext,
} from './marketplaceNavigationState';
import type { MarketplaceQuery } from '../types';

const query: MarketplaceQuery = {
  resourceType: 'cloud-server',
  search: '加速计算',
  sites: ['东部算力中心'],
  computeType: 'gpu',
  acceleratorModels: ['通用加速卡 80GB'],
  acceleratorCounts: [1],
  availability: 'configurable',
};

describe('marketplace navigation context', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('restores every filter, page, and scroll position within the browser session', () => {
    saveMarketplaceNavigationContext(query, 2, 768);
    expect(loadMarketplaceNavigationContext('cloud-server')).toEqual({
      version: 1,
      query,
      page: 2,
      scrollTop: 768,
    });
  });

  it('uses the URL resource type as a safe refresh boundary', () => {
    saveMarketplaceNavigationContext(query, 2, 768);
    expect(loadMarketplaceNavigationContext('physical-machine')).toBeUndefined();
  });

  it('discards an incompatible version without throwing', () => {
    window.sessionStorage.setItem(
      'marketplace-navigation-context:v1',
      JSON.stringify({ version: 9, query, page: 2, scrollTop: 768 }),
    );
    expect(loadMarketplaceNavigationContext('cloud-server')).toBeUndefined();
  });

  it('discards malformed filter values without applying them to the catalog', () => {
    window.sessionStorage.setItem(
      'marketplace-navigation-context:v1',
      JSON.stringify({
        version: 1,
        query: { ...query, computeType: 'unknown' },
        page: 1,
        scrollTop: 0,
      }),
    );

    expect(loadMarketplaceNavigationContext('cloud-server')).toBeUndefined();
  });
});
