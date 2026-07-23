import type {
  MarketplaceCloudServerProduct,
  MarketplacePhysicalMachineProduct,
  MarketplaceProduct,
  MarketplaceResourceType,
} from '../marketplace';

export type PurchaseProduct = MarketplaceProduct;
export type CloudPurchaseProduct = MarketplaceCloudServerProduct;
export type PhysicalPurchaseProduct = MarketplacePhysicalMachineProduct;

export type DataStorageType = 'none' | 'host-path' | 'shared';
export type NetworkProtocol = 'TCP' | 'UDP';

export type PortRule = Readonly<{
  id: string;
  protocol: NetworkProtocol;
  servicePort: number;
  mappedPort: number;
  source: string;
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
  hostPath: string;
  hostMountPath: string;
  hostReadOnly: boolean;
  storageSpaceId: string;
  sharedMountPath: string;
  sharedReadOnly: boolean;
  imageId: string | null;
  network: NetworkConfiguration;
}>;

export type PhysicalPurchaseConfiguration = Readonly<{
  resourceName: string;
  quantity: string;
  purpose: string;
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
  applicationId: string;
  resourceType: MarketplaceResourceType;
  productName: string;
  summary: readonly PurchaseSummaryItem[];
}>;

export type PurchaseViewState = 'normal' | 'loading' | 'error';

export type PurchaseDraftEnvelope<T extends PurchaseConfiguration> = Readonly<{
  version: 1;
  productId: string;
  resourceType: MarketplaceResourceType;
  configuration: T;
}>;
