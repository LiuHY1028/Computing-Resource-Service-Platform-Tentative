import { beforeEach, describe, expect, it } from 'vitest';
import { MARKETPLACE_CATALOG_PRODUCTS } from '../marketplace/data/marketplaceProducts';
import { queryImages, resetImageStore } from '../images';
import { queryOrders, resetOrderStore } from '../orders';
import { listResources, resetResourceStore } from '../resources';
import { querySoftware } from '../software';
import { queryStorageSpaces, resetStorageStore } from '../storage';
import {
  getComputePrice,
  getImagePrice,
  getSoftwarePrice,
  getStoragePrice,
} from './index';

function expectSnapshotTotal(
  snapshot: Readonly<{
    total: Readonly<{ amountFen: number }>;
    lineItems: readonly Readonly<{ amount: Readonly<{ amountFen: number }> }>[];
  }>,
) {
  expect(snapshot.total.amountFen).toBe(
    snapshot.lineItems.reduce((sum, item) => sum + item.amount.amountFen, 0),
  );
}

describe('pricing consistency across domains', () => {
  beforeEach(() => {
    resetImageStore();
    resetOrderStore();
    resetResourceStore();
    resetStorageStore();
  });

  it('covers every marketplace SKU and keeps resource snapshot units aligned', () => {
    MARKETPLACE_CATALOG_PRODUCTS.forEach((product) => {
      expect(getComputePrice(product.skuId)).toBeDefined();
    });
    listResources().forEach((resource) => {
      const price = getComputePrice(resource.skuId);
      expect(price).toBeDefined();
      expect(resource.priceSnapshot.skuId).toBe(resource.skuId);
      expectSnapshotTotal(resource.priceSnapshot);
      if (!price) return;
      const expectedUnit = price.resourceType === 'cloud-server' &&
        resource.resourceType === 'cloud-server' &&
        resource.billingMode === 'pay-as-you-go'
        ? price.hourlyPriceFen
        : price.monthlyPriceFen;
      expect(resource.priceSnapshot.unitPrice.amountFen).toBe(expectedUnit);
    });
  });

  it('keeps orders and storage on independent valid snapshots', () => {
    queryOrders().forEach((order) => {
      expectSnapshotTotal(order.priceSnapshot);
      if (order.priceSnapshot.skuId !== 'not-billable') {
        expect(
          getComputePrice(order.priceSnapshot.skuId) ??
            getStoragePrice(order.priceSnapshot.skuId),
        ).toBeDefined();
      }
    });
    queryStorageSpaces().forEach((space) => {
      expect(getStoragePrice(space.skuId)).toBeDefined();
      expect(space.priceSnapshot.skuId).toBe(space.skuId);
      expectSnapshotTotal(space.priceSnapshot);
    });
  });

  it('covers image and software price policies without invented license amounts', () => {
    queryImages({}).forEach((image) => {
      expect(getImagePrice(image.id)).toBeDefined();
    });
    querySoftware({}).forEach((software) => {
      const price = getSoftwarePrice(software.id);
      expect(price).toBeDefined();
      if (price?.policy !== 'monthly') expect(price?.monthlyPriceFen).toBe(0);
    });
  });
});
