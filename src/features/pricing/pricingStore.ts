import { PRICE_CATALOG } from './data/priceCatalog';
import type {
  ComputePriceEntry,
  ImagePriceEntry,
  SoftwarePriceEntry,
  StoragePriceEntry,
} from './types';

function copy<T>(value: T): T {
  return structuredClone(value);
}

export function listComputePrices(): readonly ComputePriceEntry[] {
  return copy(PRICE_CATALOG.compute);
}

export function getComputePrice(skuId: string): ComputePriceEntry | undefined {
  const entry = PRICE_CATALOG.compute.find((candidate) => candidate.skuId === skuId);
  return entry ? copy(entry) : undefined;
}

export function getStoragePrice(skuId: string): StoragePriceEntry | undefined {
  const entry = PRICE_CATALOG.storage.find((candidate) => candidate.skuId === skuId);
  return entry ? copy(entry) : undefined;
}

export function getImagePrice(imageId: string): ImagePriceEntry | undefined {
  const entry = PRICE_CATALOG.images.find((candidate) => candidate.imageId === imageId);
  if (entry) return copy(entry);
  return imageId.startsWith('image-custom-')
    ? {
        imageId,
        name: '自定义镜像',
        policy: 'free',
        monthlyPriceFen: 0,
      }
    : undefined;
}

export function getSoftwarePrice(softwareId: string): SoftwarePriceEntry | undefined {
  const entry = PRICE_CATALOG.software.find((candidate) => candidate.softwareId === softwareId);
  return entry ? copy(entry) : undefined;
}
