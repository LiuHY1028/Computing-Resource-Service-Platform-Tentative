import { beforeEach, describe, expect, it } from 'vitest';
import {
  cancelCommerceOrder,
  createPurchaseOrder,
  getOrder,
  queryOrders,
  resetOrderStore,
} from './orderStore';
import { calculateCloudPrice, createPriceSnapshot } from '../../pricing';
import { getBillForOrder, resetBillStore } from '../../bills';

const storage = new Map<string, string>();

describe('orderStore', () => {
  beforeEach(() => {
    storage.clear();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        removeItem: (key: string) => storage.delete(key),
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    });
    resetOrderStore();
    resetBillStore();
  });

  it('creates one awaiting-payment order and one matching unpaid bill', () => {
    const order = createPurchaseOrder({
      resourceType: 'cloud-server',
      productName: '通用计算',
      summary: [
        { label: '站点', value: '东部算力中心' },
        { label: '数量', value: '1' },
        { label: 'CPU', value: '8 vCPU' },
      ],
      priceSnapshot: createPriceSnapshot(
        'catalog-cloud-cpu-c8-east',
        calculateCloudPrice({
          skuId: 'catalog-cloud-cpu-c8-east',
          billingMode: 'subscription',
          quantity: 1,
          durationMonths: 1,
          systemDiskGb: 30,
        }),
      ),
    });
    expect(order.id).toMatch(/^ORD-\d{8}-\d{4}$/);
    expect(order.status).toBe('awaiting-payment');
    expect(order.resourceId).toBeUndefined();
    expect(getOrder(order.id)?.productName).toBe('通用计算');
    expect(getBillForOrder(order.id)).toMatchObject({
      orderId: order.id,
      status: 'unpaid',
      amount: order.pricingSnapshot.total,
    });
  });

  it('filters completed seed records by related resource', () => {
    const orders = queryOrders({ status: 'completed', related: 'yes' });
    expect(orders).toHaveLength(1);
    expect(orders[0]?.resourceId).toBe('cs-east-001');
  });

  it('cancels an unpaid order and its bill without creating a resource', () => {
    const order = createPurchaseOrder({
      resourceType: 'cloud-server',
      productName: '通用计算',
      summary: [{ label: '站点', value: '东部算力中心' }],
      priceSnapshot: createPriceSnapshot(
        'catalog-cloud-cpu-c8-east',
        calculateCloudPrice({
          skuId: 'catalog-cloud-cpu-c8-east',
          billingMode: 'subscription',
          quantity: 1,
          durationMonths: 1,
          systemDiskGb: 30,
        }),
      ),
    });
    expect(cancelCommerceOrder(order.id).status).toBe('cancelled');
    expect(getBillForOrder(order.id)?.status).toBe('cancelled');
  });
});
