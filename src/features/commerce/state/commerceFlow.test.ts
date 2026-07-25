import { beforeEach, describe, expect, it } from 'vitest';
import { getBillForOrder, queryBills, resetBillStore } from '../../bills';
import { getMarketplaceProductById } from '../../marketplace';
import {
  cancelCommerceOrder,
  createCommerceOrder,
  getOrder,
  queryOrders,
  resetOrderStore,
} from '../../orders';
import {
  calculateCloudPrice,
  createPriceSnapshot,
} from '../../pricing';
import {
  createInitialCloudConfiguration,
} from '../../purchase/data/initialConfigurations';
import { submitConfiguration } from '../../purchase/state/purchaseStore';
import {
  getResourceByAnyId,
  listResources,
  resetResourceStore,
} from '../../resources';
import { resetOperationsStore } from '../../operations';
import {
  failOrderPayment,
  payAndFulfillOrder,
} from './commerceFlow';

const memory = new Map<string, string>();

describe('commerceFlow', () => {
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
    resetOperationsStore();
  });

  it('moves one prepaid order and bill through failure, retry, payment and fulfillment', async () => {
    const product = getMarketplaceProductById('catalog-cloud-cpu-c8-east');
    if (!product || product.resourceType !== 'cloud-server') {
      throw new Error('Cloud product unavailable.');
    }
    const configuration = {
      ...createInitialCloudConfiguration(product),
      instanceName: '交易资源',
    };
    const result = await submitConfiguration(
      'cloud-server',
      product.name,
      [
        { label: '资源名称', value: configuration.instanceName },
        { label: '站点', value: product.site },
        { label: '数量', value: '1' },
      ],
      calculateCloudPrice({
        skuId: product.skuId,
        billingMode: 'subscription',
        quantity: 1,
        durationMonths: 1,
        systemDiskGb: 30,
      }),
      product.skuId,
      configuration,
    );

    expect(getOrder(result.orderId)?.status).toBe('awaiting-payment');
    expect(getBillForOrder(result.orderId)?.status).toBe('unpaid');
    expect(failOrderPayment(result.orderId).status).toBe('payment-failed');
    expect(getBillForOrder(result.orderId)?.status).toBe('unpaid');

    const completed = await payAndFulfillOrder(
      result.orderId,
      'enterprise-account',
    );
    expect(completed.status).toBe('completed');
    expect(completed.timeline.map((item) => item.label)).toEqual(
      expect.arrayContaining(['支付中', '已支付', '履约中', '已完成']),
    );
    expect(getBillForOrder(result.orderId)).toMatchObject({
      status: 'paid',
      paymentMethod: 'enterprise-account',
      resourceId: completed.resourceId,
    });
    expect(completed.resourceId).toBeDefined();
    expect(getResourceByAnyId(completed.resourceId!)).toMatchObject({
      name: '交易资源',
      status: 'running',
    });
  });

  it('cancels an unpaid transaction without creating a resource', async () => {
    const product = getMarketplaceProductById('catalog-cloud-cpu-c8-east');
    if (!product || product.resourceType !== 'cloud-server') {
      throw new Error('Cloud product unavailable.');
    }
    const before = listResources().length;
    const configuration = createInitialCloudConfiguration(product);
    const result = await submitConfiguration(
      'cloud-server',
      product.name,
      [{ label: '站点', value: product.site }, { label: '数量', value: '1' }],
      calculateCloudPrice({
        skuId: product.skuId,
        billingMode: 'subscription',
        quantity: 1,
        durationMonths: 1,
        systemDiskGb: 30,
      }),
      product.skuId,
      configuration,
    );

    cancelCommerceOrder(result.orderId);
    expect(getOrder(result.orderId)?.status).toBe('cancelled');
    expect(getBillForOrder(result.orderId)?.status).toBe('cancelled');
    expect(listResources()).toHaveLength(before);
  });

  it('opens a pay-as-you-go resource with a billing period and postpaid bill', async () => {
    const product = getMarketplaceProductById('catalog-cloud-cpu-c8-east');
    if (!product || product.resourceType !== 'cloud-server') {
      throw new Error('Cloud product unavailable.');
    }
    const configuration = {
      ...createInitialCloudConfiguration(product),
      billingMode: 'pay-as-you-go' as const,
    };
    const result = await submitConfiguration(
      'cloud-server',
      product.name,
      [{ label: '站点', value: product.site }, { label: '数量', value: '1' }],
      calculateCloudPrice({
        skuId: product.skuId,
        billingMode: 'pay-as-you-go',
        quantity: 1,
        systemDiskGb: 30,
      }),
      product.skuId,
      configuration,
    );
    const order = getOrder(result.orderId);
    expect(order).toMatchObject({
      status: 'completed',
      billingMode: 'pay-as-you-go',
    });
    expect(order?.billingPeriod?.endAt).toBeTruthy();
    expect(getBillForOrder(result.orderId)).toMatchObject({
      billType: 'postpaid',
      status: 'unpaid',
      billingPeriod: order?.billingPeriod,
    });
  });

  it('keeps the order price snapshot independent from the source quote', () => {
    const quote = calculateCloudPrice({
      skuId: 'catalog-cloud-cpu-c8-east',
      billingMode: 'subscription',
      quantity: 1,
      durationMonths: 1,
      systemDiskGb: 30,
    });
    const snapshot = structuredClone(
      createPriceSnapshot('catalog-cloud-cpu-c8-east', quote),
    );
    const originalAmount = snapshot.total.amountFen;
    const order = createCommerceOrder({
      orderType: 'purchase',
      productType: 'cloud-server',
      productName: '价格快照资源',
      site: '东部算力中心',
      configurationSummary: [],
      pricingSnapshot: snapshot,
    });
    (snapshot.total as { amountFen: number }).amountFen = 0;
    expect(getOrder(order.id)?.pricingSnapshot.total.amountFen).toBe(originalAmount);
    expect(getBillForOrder(order.id)?.amount.amountFen).toBe(originalAmount);
    expect(queryOrders()).toHaveLength(queryBills().length);
  });
});
