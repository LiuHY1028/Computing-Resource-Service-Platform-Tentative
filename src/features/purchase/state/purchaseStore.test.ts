import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearPurchaseDraft,
  isCloudDraft,
  isPhysicalDraft,
  loadPurchaseDraft,
  savePurchaseDraft,
  submitConfiguration,
} from './purchaseStore';
import {
  createInitialCloudConfiguration,
  createInitialPhysicalConfiguration,
} from '../data/initialConfigurations';
import { getMarketplaceProductById } from '../../marketplace';
import { queryOrders, resetOrderStore } from '../../orders';
import { getBillForOrder, resetBillStore } from '../../bills';
import { listOperationRecords, resetOperationsStore } from '../../operations';
import { resetResourceStore } from '../../resources';
import {
  calculateCloudPrice,
  calculatePhysicalPrice,
} from '../../pricing';

describe('purchase store', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    resetOrderStore();
    resetBillStore();
    resetOperationsStore();
    resetResourceStore();
  });

  it('isolates versioned drafts by product and resource type', () => {
    const product = getMarketplaceProductById('catalog-cloud-cpu-c8-east');
    if (!product || product.resourceType !== 'cloud-server') {
      throw new Error('Cloud fixture is unavailable.');
    }
    const configuration = {
      ...createInitialCloudConfiguration(product),
      instanceName: 'draft-cloud',
    };

    savePurchaseDraft(product.id, product.resourceType, configuration);

    const restored = loadPurchaseDraft(product.id, product.resourceType);
    expect(isCloudDraft(restored)).toBe(true);
    expect(restored).toMatchObject({ instanceName: 'draft-cloud', imageId: null });
    expect(loadPurchaseDraft('another-product', product.resourceType)).toBeUndefined();
    expect(loadPurchaseDraft(product.id, 'physical-machine')).toBeUndefined();

    clearPurchaseDraft(product.id);
    expect(loadPurchaseDraft(product.id, product.resourceType)).toBeUndefined();
  });

  it('rejects malformed draft payloads without throwing', () => {
    expect(isCloudDraft('broken')).toBe(false);
    expect(isPhysicalDraft({ resourceName: 'partial' })).toBe(false);

    const physical = createInitialPhysicalConfiguration();
    expect(isPhysicalDraft(physical)).toBe(true);
  });

  it('creates formal purchase orders and matching bills without writing session drafts', async () => {
    const before = { ...window.sessionStorage };
    const cloudProduct = getMarketplaceProductById('catalog-cloud-cpu-c8-east');
    const physicalProduct = getMarketplaceProductById('catalog-physical-cpu-p1-east');
    if (!cloudProduct || cloudProduct.resourceType !== 'cloud-server') throw new Error('Cloud product unavailable.');
    if (!physicalProduct || physicalProduct.resourceType !== 'physical-machine') throw new Error('Physical product unavailable.');
    const cloudConfiguration = createInitialCloudConfiguration(cloudProduct);
    const physicalConfiguration = createInitialPhysicalConfiguration();
    const cloud = await submitConfiguration(
      'cloud-server',
      '通用计算',
      [{ label: '站点', value: cloudProduct.site }, { label: '数量', value: '1' }],
      calculateCloudPrice({
        skuId: 'catalog-cloud-cpu-c8-east',
        billingMode: 'subscription',
        quantity: 1,
        durationMonths: 1,
        systemDiskGb: 30,
      }),
      'catalog-cloud-cpu-c8-east',
      cloudConfiguration,
    );
    const physical = await submitConfiguration(
      'physical-machine',
      '整机计算',
      [{ label: '站点', value: physicalProduct.site }, { label: '数量', value: '1' }],
      calculatePhysicalPrice({
        skuId: 'catalog-physical-cpu-p1-east',
        quantity: 1,
        durationMonths: 1,
      }),
      'catalog-physical-cpu-p1-east',
      physicalConfiguration,
    );

    expect(cloud.orderId).toMatch(/^ORD-\d{8}-\d{4}$/);
    expect(physical.orderId).toMatch(/^ORD-\d{8}-\d{4}$/);
    expect('applicationId' in cloud).toBe(false);
    expect(queryOrders().some((order) => order.id === cloud.orderId)).toBe(true);
    expect(getBillForOrder(cloud.orderId)?.amount).toEqual(cloud.priceSnapshot.total);
    expect(getBillForOrder(physical.orderId)?.status).toBe('unpaid');
    expect(
      listOperationRecords().some(
        (record) => record.targetId === physical.orderId,
      ),
    ).toBe(true);
    expect({ ...window.sessionStorage }).toEqual(before);
  });
});
