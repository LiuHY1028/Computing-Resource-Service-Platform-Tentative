import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearPurchaseDraft,
  isCloudDraft,
  isPhysicalDraft,
  loadPurchaseDraft,
  savePurchaseDraft,
  submitConfiguration,
} from './purchaseRepository';
import {
  createInitialCloudConfiguration,
  createInitialPhysicalConfiguration,
} from '../data/initialConfigurations';
import { getMarketplaceProductById } from '../../marketplace';

describe('purchase prototype repository', () => {
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

  it('returns explicit demo identifiers without writing order or resource data', async () => {
    const before = { ...window.sessionStorage };
    const cloud = await submitConfiguration(
      'cloud-server',
      '云服务器申请',
      [],
      { delayMs: 0 },
    );
    const physical = await submitConfiguration(
      'physical-machine',
      '物理机申请',
      [],
      { delayMs: 0 },
    );

    expect(cloud.applicationId).toBe('APP-CLOUD-001');
    expect(physical.applicationId).toBe('APP-PHYSICAL-001');
    expect({ ...window.sessionStorage }).toEqual(before);
  });
});
