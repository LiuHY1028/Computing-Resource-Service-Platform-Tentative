import { MARKETPLACE_CATALOG_PRODUCTS } from '../data/marketplaceProducts';
import type {
  MarketplaceFilterOptions,
  MarketplaceProduct,
  MarketplaceQuery,
  MarketplaceQueryResult,
  MarketplaceResourceType,
} from '../types';

function uniqueValues<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function productSearchText(product: MarketplaceProduct): string {
  const acceleratorText = product.accelerator
    ? `${product.accelerator.model} ${product.accelerator.count} 卡 ${product.accelerator.count} 张 ${product.accelerator.count}张`
    : '';
  const resourceSpecificText =
    product.resourceType === 'cloud-server'
      ? `${product.defaultSystemDiskGb} GB 系统盘 ${product.defaultSystemDiskGb}GB`
      : product.machineSummary;

  return [
    product.name,
    product.site,
    product.cpu,
    `${product.memoryGb} GB 内存`,
    `${product.memoryGb}GB`,
    product.computeType === 'cpu' ? 'CPU 计算' : 'GPU 计算',
    acceleratorText,
    product.resourceType === 'physical-machine'
      ? (product.machineSummary ?? '')
      : '',
    resourceSpecificText,
  ]
    .join(' ')
    .toLocaleLowerCase();
}

function matchesQuery(product: MarketplaceProduct, query: MarketplaceQuery): boolean {
  const search = query.search.trim().toLocaleLowerCase();
  if (search && !productSearchText(product).includes(search)) {
    return false;
  }

  if (query.sites.length && !query.sites.includes(product.site)) {
    return false;
  }

  if (
    query.computeType !== 'all' &&
    product.computeType !== query.computeType
  ) {
    return false;
  }

  if (
    query.acceleratorModels.length &&
    (!product.accelerator ||
      !query.acceleratorModels.includes(product.accelerator.model))
  ) {
    return false;
  }

  if (
    query.acceleratorCounts.length &&
    (!product.accelerator ||
      !query.acceleratorCounts.includes(product.accelerator.count))
  ) {
    return false;
  }

  if (
    query.availability !== 'all' &&
    product.configurable !== (query.availability === 'configurable')
  ) {
    return false;
  }

  return true;
}

export function getMarketplaceFilterOptions(
  resourceType: MarketplaceResourceType,
): MarketplaceFilterOptions {
  const products: readonly MarketplaceProduct[] = MARKETPLACE_CATALOG_PRODUCTS.filter(
    (product) => product.resourceType === resourceType,
  );
  const accelerators = products.flatMap((product) =>
    product.accelerator ? [product.accelerator] : [],
  );

  return {
    sites: uniqueValues(products.map((product) => product.site)),
    computeTypes: uniqueValues(products.map((product) => product.computeType)),
    acceleratorModels: uniqueValues(
      accelerators.map((accelerator) => accelerator.model),
    ),
    acceleratorCounts: uniqueValues(
      accelerators.map((accelerator) => accelerator.count),
    ).sort((left, right) => left - right),
  };
}

export function queryMarketplaceProducts(
  query: MarketplaceQuery,
): MarketplaceQueryResult {
  const resourceCatalog = MARKETPLACE_CATALOG_PRODUCTS.filter(
    (product) => product.resourceType === query.resourceType,
  );
  const products = resourceCatalog.filter((product) =>
    matchesQuery(product, query),
  );

  return {
    items: products,
    total: products.length,
    catalogTotal: resourceCatalog.length,
  };
}

export function getMarketplaceProductById(
  id: string,
): MarketplaceProduct | undefined {
  return MARKETPLACE_CATALOG_PRODUCTS.find((product) => product.id === id);
}
