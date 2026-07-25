import { beforeEach, describe, expect, it } from 'vitest';
import { resetOperationsStore } from '../../operations';
import { getOrder, resetOrderStore } from '../../orders';
import { getBillForOrder, resetBillStore } from '../../bills';
import { payAndFulfillOrder } from '../../commerce';
import {
  storageAvailableGb,
  storageCapacityState,
  storageUsagePercent,
} from '../types';
import {
  getStorageMountsForResource,
  purchaseStorage,
  queryStorageSpaces,
  createStorageExpansionOrder,
  mountStorage,
  releaseStorage,
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
    resetBillStore();
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

  it('creates purchase and expansion bills and applies changes only after payment', async () => {
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
      mountPlan: { mode: 'later' },
    });
    expect(result.spaces).toHaveLength(0);
    expect(result.order.status).toBe('awaiting-payment');
    expect(result.order.pricingSnapshot.total.amountFen).toBe(64000);
    expect(getBillForOrder(result.order.id)).toMatchObject({
      status: 'unpaid',
      amount: { amountFen: 64000, currency: 'CNY' },
    });

    const completedPurchase = await payAndFulfillOrder(result.order.id, 'account-balance');
    const createdId = completedPurchase.resourceId!;
    expect(queryStorageSpaces({ search: createdId })[0]?.capacityGb).toBe(800);
    const expansion = await createStorageExpansionOrder(createdId, 1000);
    expect(queryStorageSpaces({ search: createdId })[0]?.capacityGb).toBe(800);
    expect(getOrder(expansion.id)).toMatchObject({
      orderType: 'storageExpansion',
      resourceId: createdId,
      status: 'awaiting-payment',
      pricingSnapshot: { total: { amountFen: 16000, currency: 'CNY' } },
    });
    await payAndFulfillOrder(expansion.id, 'enterprise-account');
    expect(queryStorageSpaces({ search: createdId })[0]?.capacityGb).toBe(1000);
    expect(getBillForOrder(expansion.id)?.status).toBe('paid');
  });

  it('enforces cloud disk single-resource mounting and release safety', async () => {
    await expect(mountStorage('storage-cloud-east-001', {
      resourceId: 'cs-west-003',
      resourceName: '西部计算节点',
      resourceType: 'cloud-server',
      mountPath: '/data/disk',
      readOnly: false,
    })).rejects.toThrow();
    await expect(releaseStorage('storage-cloud-east-001')).rejects.toThrow('先卸载');
  });
});
