export type MarketplaceResourceType = 'cloud-server' | 'physical-machine';

export type MarketplaceComputeType = 'cpu' | 'gpu';

export type MarketplaceComputeTypeFilter = 'all' | MarketplaceComputeType;

export type MarketplaceAvailabilityFilter =
  | 'all'
  | 'configurable'
  | 'unavailable';

export type MarketplaceBillingModeFilter =
  | 'all'
  | 'subscription'
  | 'pay-as-you-go';

export type MarketplacePriceSort = 'recommended' | 'price-asc' | 'price-desc';

export interface MarketplaceAccelerator {
  readonly model: string;
  readonly count: number;
}

interface MarketplaceProductBase {
  readonly id: string;
  readonly skuId: string;
  readonly resourceType: MarketplaceResourceType;
  readonly name: string;
  readonly site: string;
  readonly computeType: MarketplaceComputeType;
  readonly cpu: string;
  readonly memoryGb: number;
  readonly accelerator?: MarketplaceAccelerator;
  readonly configurable: boolean;
  readonly unavailableReason?: string;
}

export interface MarketplaceCloudServerProduct
  extends MarketplaceProductBase {
  readonly resourceType: 'cloud-server';
  readonly defaultSystemDiskGb: number;
}

export interface MarketplacePhysicalMachineProduct
  extends MarketplaceProductBase {
  readonly resourceType: 'physical-machine';
  readonly defaultSystemDiskGb?: never;
  readonly machineSummary?: string;
}

export type MarketplaceProduct =
  | MarketplaceCloudServerProduct
  | MarketplacePhysicalMachineProduct;

export interface MarketplaceQuery {
  readonly resourceType: MarketplaceResourceType;
  readonly search: string;
  readonly sites: readonly string[];
  readonly computeType: MarketplaceComputeTypeFilter;
  readonly acceleratorModels: readonly string[];
  readonly acceleratorCounts: readonly number[];
  readonly availability: MarketplaceAvailabilityFilter;
  readonly billingMode: MarketplaceBillingModeFilter;
  readonly priceSort: MarketplacePriceSort;
}

export interface MarketplaceQueryResult {
  /** Products after all requested filters have been applied. */
  readonly items: readonly MarketplaceProduct[];
  /** Count after all requested filters have been applied. */
  readonly total: number;
  /** Count for the selected resource type before search and filters. */
  readonly catalogTotal: number;
}

export interface MarketplaceFilterOptions {
  readonly sites: readonly string[];
  readonly computeTypes: readonly MarketplaceComputeType[];
  readonly acceleratorModels: readonly string[];
  readonly acceleratorCounts: readonly number[];
}
