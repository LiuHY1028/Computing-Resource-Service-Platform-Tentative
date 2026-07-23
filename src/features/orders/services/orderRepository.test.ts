import { beforeEach, describe, expect, it } from 'vitest';
import {
  createPurchaseOrder,
  getOrder,
  queryOrders,
  resetOrderRepository,
} from './orderRepository';

const storage = new Map<string, string>();

describe('orderRepository', () => {
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
    resetOrderRepository();
  });

  it('creates a persistent pending application without a resource', async () => {
    const order = await createPurchaseOrder({
      resourceType: 'cloud-server',
      productName: '通用计算',
      summary: [
        { label: '站点', value: '东部算力中心' },
        { label: '数量', value: '1' },
        { label: 'CPU', value: '8 vCPU' },
      ],
    });
    expect(order.id).toMatch(/^REQ-\d{8}-\d{4}$/);
    expect(order.status).toBe('pending');
    expect(order.resourceId).toBeUndefined();
    expect((await getOrder(order.id))?.productName).toBe('通用计算');
  });

  it('filters delivered seed records by related resource', async () => {
    const orders = await queryOrders({ status: 'delivered', related: 'yes' });
    expect(orders).toHaveLength(1);
    expect(orders[0]?.resourceId).toBe('cs-east-001');
  });
});
