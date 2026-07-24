import type { MarketplaceCloudServerProduct } from '../../marketplace';
import type { CloudPurchaseConfiguration, PhysicalPurchaseConfiguration } from '../types';

export function createInitialCloudConfiguration(product: MarketplaceCloudServerProduct): CloudPurchaseConfiguration {
  return {
    instanceName: '',
    quantity: '1',
    purpose: '',
    systemDiskGb: product.defaultSystemDiskGb,
    storageType: 'none',
    newStorageType: 'cloud-disk',
    newStorageSkuId: 'storage-cloud-standard-gb-month',
    newStorageCapacityGb: 100,
    storageSpaceId: '',
    storageMountPath: '/data/storage',
    storageReadOnly: false,
    imageId: null,
    billingMode: 'subscription',
    periodMonths: '1',
    autoRenewalEnabled: false,
    network: { sshEnabled: false, sourceCidr: '', portRules: [] },
  };
}

export function createInitialPhysicalConfiguration(): PhysicalPurchaseConfiguration {
  return {
    resourceName: '',
    quantity: '1',
    purpose: '',
    periodMonths: '1',
    network: { sshEnabled: false, sourceCidr: '', portRules: [] },
  };
}
