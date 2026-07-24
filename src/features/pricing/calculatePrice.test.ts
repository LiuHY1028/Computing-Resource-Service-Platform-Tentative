import { describe, expect, it } from 'vitest';
import {
  calculateCloudPrice,
  calculatePhysicalPrice,
  calculateStoragePrice,
  createPriceSnapshot,
  formatHourlyPrice,
  formatMoney,
  formatMonthlyPrice,
  getComputePrice,
  money,
} from './index';

describe('unified pricing', () => {
  it('formats integer fen consistently', () => {
    expect(formatMoney(money(123456))).toBe('¥1,234.56');
    expect(formatMonthlyPrice(money(68000))).toBe('¥680/月');
    expect(formatHourlyPrice(money(110))).toBe('¥1.10/小时');
    expect(() => money(-1)).toThrow('非负整数分');
    expect(() => money(1.2)).toThrow('非负整数分');
  });

  it('calculates monthly compute, storage, paid image, quantity and duration', () => {
    const quote = calculateCloudPrice({
      skuId: 'catalog-cloud-cpu-c8-east',
      billingMode: 'subscription',
      quantity: 2,
      durationMonths: 3,
      systemDiskGb: 30,
      storage: {
        skuId: 'storage-shared-standard-gb-month',
        capacityGb: 100,
        label: '共享存储',
      },
      imageId: 'preset-image-development',
    });

    expect(quote.total.amountFen).toBe(540000);
    expect(quote.lineItems.find((item) => item.category === 'systemDisk')).toMatchObject({
      included: true,
      amount: { amountFen: 0, currency: 'CNY' },
    });
    expect(quote.lineItems.reduce((sum, item) => sum + item.amount.amountFen, 0))
      .toBe(quote.total.amountFen);
  });

  it('calculates hourly pricing without a month duration', () => {
    const quote = calculateCloudPrice({
      skuId: 'catalog-cloud-cpu-c8-east',
      billingMode: 'pay-as-you-go',
      quantity: 2,
      systemDiskGb: 30,
      imageId: 'preset-image-development',
    });
    expect(quote.duration).toBeUndefined();
    expect(quote.total.amountFen).toBe(270);
  });

  it('keeps free images and included system storage at zero', () => {
    const quote = calculateCloudPrice({
      skuId: 'catalog-cloud-cpu-c8-east',
      billingMode: 'subscription',
      quantity: 1,
      durationMonths: 1,
      systemDiskGb: 30,
      imageId: 'preset-image-base-linux',
    });
    expect(
      quote.lineItems
        .filter((item) => item.included)
        .every((item) => item.amount.amountFen === 0),
    ).toBe(true);
    expect(quote.total.amountFen).toBe(68000);
  });

  it('calculates physical monthly rental and storage capacity pricing', () => {
    expect(
      calculatePhysicalPrice({
        skuId: 'catalog-physical-gpu-p8-west',
        quantity: 2,
        durationMonths: 12,
      }).total.amountFen,
    ).toBe(208320000);
    expect(
      calculateStoragePrice({
        skuId: 'storage-shared-standard-gb-month',
        capacityGb: 2048,
      }).total.amountFen,
    ).toBe(163840);
    expect(
      calculateStoragePrice({
        skuId: 'storage-cloud-standard-gb-month',
        capacityGb: 250,
      }).total.amountFen,
    ).toBe(8750);
  });

  it('creates an immutable historical snapshot independent of catalog clones', () => {
    const quote = calculateCloudPrice({
      skuId: 'catalog-cloud-cpu-c8-east',
      billingMode: 'subscription',
      quantity: 1,
      durationMonths: 1,
      systemDiskGb: 30,
    });
    const snapshot = createPriceSnapshot('catalog-cloud-cpu-c8-east', quote, '2026-07-24T00:00:00.000Z');
    const catalogClone = getComputePrice('catalog-cloud-cpu-c8-east');
    if (catalogClone?.resourceType === 'cloud-server') {
      (catalogClone as { monthlyPriceFen: number }).monthlyPriceFen = 999999;
    }
    expect(snapshot.total.amountFen).toBe(68000);
    expect(getComputePrice('catalog-cloud-cpu-c8-east')).toMatchObject({
      monthlyPriceFen: 68000,
    });
  });
});
