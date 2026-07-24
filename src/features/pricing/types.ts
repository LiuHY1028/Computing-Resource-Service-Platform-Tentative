export type Currency = 'CNY';

export type Money = Readonly<{
  amountFen: number;
  currency: Currency;
}>;

export type PriceCategory =
  | 'compute'
  | 'systemDisk'
  | 'dataStorage'
  | 'image'
  | 'software'
  | 'network';

export type PriceLineItem = Readonly<{
  id: string;
  category: PriceCategory;
  label: string;
  unitPrice: Money;
  quantity: number;
  duration?: number;
  amount: Money;
  included?: boolean;
  unitLabel?: string;
}>;

export type PriceQuote = Readonly<{
  billingMode: string;
  duration?: number;
  quantity: number;
  lineItems: readonly PriceLineItem[];
  subtotal: Money;
  total: Money;
}>;

export type PriceSnapshot = Readonly<{
  skuId: string;
  billingMode: string;
  unitPrice: Money;
  quantity: number;
  duration?: number;
  lineItems: readonly PriceLineItem[];
  subtotal: Money;
  total: Money;
  generatedAt: string;
}>;

export type ComputePriceEntry =
  | Readonly<{
      skuId: string;
      resourceType: 'cloud-server';
      name: string;
      monthlyPriceFen: number;
      hourlyPriceFen: number;
    }>
  | Readonly<{
      skuId: string;
      resourceType: 'physical-machine';
      name: string;
      monthlyPriceFen: number;
    }>;

export type StoragePriceEntry = Readonly<{
  skuId: string;
  storageType:
    | 'shared-standard'
    | 'shared-performance'
    | 'cloud-disk-standard'
    | 'cloud-disk-performance';
  name: string;
  billingUnit: 'gb-month';
  unitPriceFen: number;
}>;

export type PricePolicy = 'free' | 'included' | 'monthly' | 'requires-license';

export type ImagePriceEntry = Readonly<{
  imageId: string;
  name: string;
  policy: Extract<PricePolicy, 'free' | 'included' | 'monthly'>;
  monthlyPriceFen: number;
}>;

export type SoftwarePriceEntry = Readonly<{
  softwareId: string;
  name: string;
  policy: PricePolicy;
  monthlyPriceFen: number;
}>;

export type PriceCatalog = Readonly<{
  version: number;
  currency: Currency;
  compute: readonly ComputePriceEntry[];
  storage: readonly StoragePriceEntry[];
  images: readonly ImagePriceEntry[];
  software: readonly SoftwarePriceEntry[];
}>;
