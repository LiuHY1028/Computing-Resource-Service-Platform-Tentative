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
import { queryOrders } from '../../orders';
import { listOperationRecords } from '../../operations';
import {
  calculateCloudPrice,
  calculatePhysicalPrice,
} from '../../pricing';

describe('purchase store', () => {
  beforeEach(() => window.sessionStorage.clear());

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

  it('returns linked application identifiers without writing session drafts', async () => {
    const before = { ...window.sessionStorage };
    const cloud = await submitConfiguration(
      'cloud-server',
      '云服务器申请',
      [],
      calculateCloudPrice({
        skuId: 'catalog-cloud-cpu-c8-east',
        billingMode: 'subscription',
        quantity: 1,
        durationMonths: 1,
        systemDiskGb: 30,
      }),
      'catalog-cloud-cpu-c8-east',
    );
    const physical = await submitConfiguration(
      'physical-machine',
      '物理机申请',
      [],
      calculatePhysicalPrice({
        skuId: 'catalog-physical-cpu-p1-east',
        quantity: 1,
        durationMonths: 1,
      }),
      'catalog-physical-cpu-p1-east',
    );

    expect(cloud.applicationId).toMatch(/^REQ-\d{8}-\d{4}$/);
    expect(physical.applicationId).toMatch(/^REQ-\d{8}-\d{4}$/);
    expect(cloud.orderId).toBe(cloud.applicationId);
    expect(queryOrders().some((order) => order.id === cloud.orderId)).toBe(true);
    expect(
      listOperationRecords().some(
        (record) => record.targetId === physical.orderId,
      ),
    ).toBe(true);
    expect({ ...window.sessionStorage }).toEqual(before);
  });
});
