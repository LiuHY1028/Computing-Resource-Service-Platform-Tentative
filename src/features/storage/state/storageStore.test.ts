import { beforeEach, describe, expect, it } from 'vitest';
import { resetOperationsStore } from '../../operations';
import { queryOrders, resetOrderStore } from '../../orders';
import {
  storageAvailableGb,
  storageCapacityState,
  storageUsagePercent,
} from '../types';
import {
  getStorageMountsForResource,
  purchaseStorage,
  queryStorageSpaces,
  requestStorageExpansion,
  requestStorageMount,
  requestStorageRelease,
  resetStorageStore,
} from './storageStore';

const memory = new Map<string, string>();

describe('storageStore', () => {
  beforeEach(() => {
    memory.clear();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => memory.get(key) ?? null,
        removeItem: (key: string) => memory.delete(key),
        setItem: (key: string, value: string) => memory.set(key, value),
      },
    });
    resetStorageStore();
    resetOperationsStore();
    resetOrderStore();
  });

  it('filters independent storage and exposes canonical resource mounts', () => {
    const shared = queryStorageSpaces({ type: 'shared', mounted: 'yes' });
    expect(shared).toHaveLength(1);
    expect(getStorageMountsForResource('cs-east-001')).toHaveLength(2);
    const space = shared[0]!;
    expect(storageAvailableGb(space)).toBe(space.capacityGb - space.usedGb);
    expect(storageUsagePercent(space)).toBe(Math.round((space.usedGb / space.capacityGb) * 100));
    expect(storageCapacityState(space)).toBe('normal');
    expect(storageCapacityState({ capacityGb: 100, usedGb: 80 })).toBe('high');
    expect(storageCapacityState({ capacityGb: 100, usedGb: 92 })).toBe('critical');
    expect(space.iops).toBeGreaterThan(0);
  });

  it('creates purchase and expansion orders while keeping remote state pending', async () => {
    const result = await purchaseStorage({
      name: '项目共享空间',
      type: 'shared',
      skuId: 'storage-shared-standard-gb-month',
      performanceTier: 'standard',
      site: '东部算力中心',
      capacityGb: 800,
      quantity: 1,
      durationMonths: 1,
      autoRenew: false,
      protocol: 'NFS',
      mounts: [],
    });
    const created = result.spaces[0]!;
    expect(created.status).toBe('preparing');
    expect(created.priceSnapshot.total.amountFen).toBe(64000);
    expect(queryOrders({ applicationType: 'storage-purchase' })[0]?.storageId).toBe(created.id);

    await requestStorageExpansion(created.id, 1000);
    expect(queryStorageSpaces({ search: created.id })[0]?.capacityGb).toBe(800);
    expect(queryOrders({ applicationType: 'storage-expansion' })[0]).toMatchObject({
      resourceType: 'storage',
      storageId: created.id,
      status: 'pending',
      priceSnapshot: { total: { amountFen: 16000, currency: 'CNY' } },
    });
  });

  it('enforces cloud disk single-resource mounting and release safety', async () => {
    await expect(requestStorageMount('storage-cloud-east-001', {
      resourceId: 'cs-west-003',
      resourceName: '西部计算节点',
      resourceType: 'cloud-server',
      mountPath: '/data/disk',
      readOnly: false,
    })).rejects.toThrow();
    await expect(requestStorageRelease('storage-cloud-east-001')).rejects.toThrow('先卸载');
  });
});
