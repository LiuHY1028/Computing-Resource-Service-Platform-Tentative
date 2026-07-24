import rawCatalog from './priceCatalog.json';
import type { PriceCatalog } from '../types';

function assertCatalog(catalog: PriceCatalog) {
  const amounts = [
    ...catalog.compute.flatMap((entry) => [
      entry.monthlyPriceFen,
      ...(entry.resourceType === 'cloud-server' ? [entry.hourlyPriceFen] : []),
    ]),
    ...catalog.storage.map((entry) => entry.unitPriceFen),
    ...catalog.images.map((entry) => entry.monthlyPriceFen),
    ...catalog.software.map((entry) => entry.monthlyPriceFen),
  ];
  if (
    catalog.currency !== 'CNY' ||
    amounts.some((amount) => !Number.isSafeInteger(amount) || amount < 0)
  ) {
    throw new Error('价格目录包含无效金额。');
  }
}

export const PRICE_CATALOG = rawCatalog as PriceCatalog;

assertCatalog(PRICE_CATALOG);
