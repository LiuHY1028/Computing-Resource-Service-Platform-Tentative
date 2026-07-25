import type {
  MarketplaceCloudServerProduct,
  MarketplacePhysicalMachineProduct,
  MarketplaceProduct,
  MarketplaceResourceType,
} from '../marketplace';
import type { PriceQuote, PriceSnapshot } from '../pricing';

export type PurchaseProduct = MarketplaceProduct;
export type CloudPurchaseProduct = MarketplaceCloudServerProduct;
export type PhysicalPurchaseProduct = MarketplacePhysicalMachineProduct;

export type DataStorageType = 'none' | 'new' | 'existing';
export type NetworkProtocol = 'TCP' | 'UDP';

export type PortRule = Readonly<{
  id: string;
  ruleName: string;
  protocol: NetworkProtocol;
  port: number;
  sourceType: 'ip' | 'cidr' | 'all';
  sourceValue: string;
  description: string;
}>;

export type NetworkConfiguration = Readonly<{
  sshEnabled: boolean;
  sourceCidr: string;
  portRules: readonly PortRule[];
}>;

export type CloudPurchaseConfiguration = Readonly<{
  instanceName: string;
  quantity: string;
  purpose: string;
  systemDiskGb: number;
  storageType: DataStorageType;
  newStorageType: 'cloud-disk' | 'shared';
  newStorageSkuId: string;
  newStorageCapacityGb: number;
  storageSpaceId: string;
  storageMountPath: string;
  storageReadOnly: boolean;
  imageId: string | null;
  billingMode: 'subscription' | 'pay-as-you-go';
  periodMonths: '1' | '3' | '6' | '12';
  autoRenewalEnabled: boolean;
  network: NetworkConfiguration;
}>;

export type PhysicalPurchaseConfiguration = Readonly<{
  resourceName: string;
  quantity: string;
  purpose: string;
  periodMonths: '1' | '3' | '6' | '12';
  network: NetworkConfiguration;
}>;

export type PurchaseConfiguration =
  | CloudPurchaseConfiguration
  | PhysicalPurchaseConfiguration;

export type PurchaseFieldErrors = Readonly<Record<string, string>>;

export type PurchaseValidationResult = Readonly<{
  errors: PurchaseFieldErrors;
  missingItems: readonly string[];
  firstInvalidFieldId?: string;
}>;

export type PurchaseSummaryItem = Readonly<{
  label: string;
  value: string;
  pending?: boolean;
}>;

export type PurchaseSubmissionResult = Readonly<{
  orderId: string;
  orderStatus: 'awaiting-payment' | 'completed';
  resourceType: MarketplaceResourceType;
  productName: string;
  summary: readonly PurchaseSummaryItem[];
  priceSnapshot: PriceSnapshot;
  quote: PriceQuote;
}>;

export type PurchaseViewState = 'normal' | 'loading' | 'error';
export type PurchaseStepId = 'configuration' | 'confirmation' | 'payment';
export type PurchaseStepState = 'complete' | 'current' | 'upcoming';

export type PurchaseDraftEnvelope<T extends PurchaseConfiguration> = Readonly<{
  version: 2;
  productId: string;
  resourceType: MarketplaceResourceType;
  productKind: 'compute';
  step: Exclude<PurchaseStepId, 'payment'>;
  updatedAt: string;
  configuration: T;
}>;
