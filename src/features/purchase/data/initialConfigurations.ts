import type { MarketplaceCloudServerProduct } from '../../marketplace';
import type { CloudPurchaseConfiguration, PhysicalPurchaseConfiguration } from '../types';

export function createInitialCloudConfiguration(product: MarketplaceCloudServerProduct): CloudPurchaseConfiguration {
  return {
    instanceName: '',
    quantity: '1',
    purpose: '',
    systemDiskGb: product.defaultSystemDiskGb,
    storageType: 'none',
    hostPath: '',
    hostMountPath: '',
    hostReadOnly: false,
    storageSpaceId: '',
    sharedMountPath: '',
    sharedReadOnly: false,
    imageId: null,
    network: { sshEnabled: false, sourceCidr: '', portRules: [] },
  };
}

export function createInitialPhysicalConfiguration(): PhysicalPurchaseConfiguration {
  return {
    resourceName: '',
    quantity: '1',
    purpose: '',
    network: { sshEnabled: false, sourceCidr: '', portRules: [] },
  };
}
