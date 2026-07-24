import { beforeEach, describe, expect, it } from 'vitest';
import {
  getBillForOrder,
  queryBills,
  resetBillStore,
} from '../../bills';
import {
  createNetworkRule,
  resetNetworkStore,
} from '../../network';
import {
  createRentalRenewalOrders,
  createRenewalOrders,
  getResourceByAnyId,
  resetResourceStore,
} from '../../resources';
import {
  queryOrders,
  resetOrderStore,
} from '../../orders';
import { resetOperationsStore } from '../../operations';
import {
  createStorageExpansionOrder,
  createStorageRenewalOrder,
  getStorageSpace,
  mountStorage,
  resetStorageStore,
  unmountStorage,
} from '../../storage';

const memory = new Map<string, string>();

describe('commerce invariants', () => {
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
    resetOrderStore();
    resetBillStore();
    resetResourceStore();
    resetStorageStore();
    resetNetworkStore();
    resetOperationsStore();
  });

  it('keeps initial orders, bills, amounts and references internally consistent', () => {
    const orders = queryOrders();
    const orderById = new Map(orders.map((order) => [order.id, order]));

    for (const bill of queryBills()) {
      const order = orderById.get(bill.orderId);
      expect(order, `orphan bill ${bill.id}`).toBeDefined();
      expect(bill.amount).toEqual(order?.pricingSnapshot.total);
      expect(
        bill.lineItems.reduce(
          (sum, item) => sum + item.amount.amountFen,
          0,
        ),
      ).toBe(bill.amount.amountFen);
      if (bill.status === 'paid') {
        expect(order?.status).toMatch(
          /^(paid|provisioning|completed|refunding|refunded)$/,
        );
      }
      if (bill.status === 'cancelled') {
        expect(order?.status).toBe('cancelled');
      }
      if (bill.resourceId) {
        expect(
          getResourceByAnyId(bill.resourceId) ??
            getStorageSpace(bill.resourceId),
          `orphan bill resource ${bill.resourceId}`,
        ).toBeDefined();
      }
    }

    for (const order of orders) {
      expect(order.pricingSnapshot.total.amountFen).toBeGreaterThanOrEqual(0);
      expect(
        order.pricingSnapshot.lineItems.reduce(
          (sum, item) => sum + item.amount.amountFen,
          0,
        ),
      ).toBe(order.pricingSnapshot.total.amountFen);
      if (order.billingMode === 'subscription') {
        expect(getBillForOrder(order.id), `missing bill ${order.id}`).toBeDefined();
      }
      if (order.status === 'paid') {
        expect(getBillForOrder(order.id)?.status).toBe('paid');
      }
      if (order.status === 'cancelled') {
        expect(getBillForOrder(order.id)?.status).not.toBe('paid');
      }
      if (order.resourceId) {
        expect(
          getResourceByAnyId(order.resourceId) ??
            getStorageSpace(order.resourceId),
          `orphan order resource ${order.resourceId}`,
        ).toBeDefined();
      }
    }
  });

  it('creates matching bills for renewal, rental renewal and paid expansion', async () => {
    const renewal = createRenewalOrders({
      resourceIds: ['cs-east-001'],
      periodMonths: 1,
      renewStorage: false,
      renewNetwork: false,
    })[0]!.order;
    const rentalRenewal = createRentalRenewalOrders({
      resourceIds: ['pm-east-001'],
      periodMonths: 1,
      reason: '',
    })[0]!.order;
    const storageRenewal = await createStorageRenewalOrder(
      'storage-shared-east-001',
      1,
    );
    const expansion = await createStorageExpansionOrder(
      'storage-shared-east-001',
      2400,
    );

    for (const order of [
      renewal,
      rentalRenewal,
      storageRenewal,
      expansion,
    ]) {
      const bill = getBillForOrder(order.id);
      expect(bill).toBeDefined();
      expect(bill?.amount).toEqual(order.pricingSnapshot.total);
      expect(bill?.status).toBe('unpaid');
    }
  });

  it('does not bill free mount, unmount or network-rule operations', async () => {
    const before = queryBills().length;
    const space = getStorageSpace('storage-shared-east-001')!;
    const existingMount = space.mounts[0]!;
    await unmountStorage(space.id, existingMount.id);
    await mountStorage(space.id, {
      resourceId: existingMount.resourceId,
      resourceName: existingMount.resourceName,
      resourceType: existingMount.resourceType,
      mountPath: existingMount.mountPath,
      readOnly: existingMount.readOnly,
    });
    await createNetworkRule({
      resourceId: 'cs-west-003',
      resourceName: '数据处理节点-03',
      resourceType: 'cloud-server',
      site: '西部算力中心',
      privateIp: '10.24.2.23',
      sshAvailable: true,
      protocol: 'UDP',
      servicePort: 9000,
      mappedPort: 19000,
      source: '192.0.2.0/24',
      description: '数据服务',
    });
    expect(queryBills()).toHaveLength(before);
  });
});
