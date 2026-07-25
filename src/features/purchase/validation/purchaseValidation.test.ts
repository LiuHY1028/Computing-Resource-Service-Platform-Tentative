import { describe, expect, it } from 'vitest';
import {
  isDuplicatePortRule,
  isValidAbsolutePath,
  isValidIpOrCidr,
  isValidPort,
  validateCloudConfiguration,
  validatePhysicalConfiguration,
} from './purchaseValidation';
import type { CloudPurchaseConfiguration, PhysicalPurchaseConfiguration, PortRule } from '../types';

const baseCloud: CloudPurchaseConfiguration = {
  instanceName: 'cloud-resource',
  quantity: '1',
  purpose: '',
  systemDiskGb: 30,
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

const basePhysical: PhysicalPurchaseConfiguration = {
  resourceName: 'physical-resource',
  quantity: '1',
  purpose: '',
  periodMonths: '1',
  network: { sshEnabled: false, sourceCidr: '', portRules: [] },
};

describe('purchase prototype validation', () => {
  it('validates IPv4/CIDR, paths, and the full port range', () => {
    expect(isValidIpOrCidr('192.0.2.10')).toBe(true);
    expect(isValidIpOrCidr('192.0.2.0/24')).toBe(true);
    expect(isValidIpOrCidr('300.0.2.1')).toBe(false);
    expect(isValidIpOrCidr('192.0.2.0/33')).toBe(false);
    expect(isValidAbsolutePath('/workspace/data')).toBe(true);
    expect(isValidAbsolutePath('/workspace/../secret')).toBe(false);
    expect(isValidAbsolutePath('workspace/data')).toBe(false);
    expect(isValidPort(1)).toBe(true);
    expect(isValidPort(65535)).toBe(true);
    expect(isValidPort(0)).toBe(false);
    expect(isValidPort(65536)).toBe(false);
  });

  it('requires cloud identity but permits no image while preserving fixed 30 GB system storage', () => {
    const result = validateCloudConfiguration({
      ...baseCloud,
      instanceName: '',
      quantity: '0',
    });

    expect(result.firstInvalidFieldId).toBe('cloud-instance-name');
    expect(result.errors).toMatchObject({
      'cloud-instance-name': expect.any(String),
      'cloud-instance-quantity': expect.any(String),
    });
    expect(result.errors['cloud-image-selection']).toBeUndefined();
    expect(validateCloudConfiguration(baseCloud).errors).toEqual({});
    expect(baseCloud.systemDiskGb).toBe(30);
  });

  it('only validates fields belonging to the active data-storage choice', () => {
    const newStorageResult = validateCloudConfiguration({
      ...baseCloud,
      storageType: 'new',
      newStorageCapacityGb: 0,
      storageMountPath: '',
    });
    expect(newStorageResult.errors['cloud-new-storage-capacity']).toBeDefined();
    expect(newStorageResult.errors['cloud-storage-mount-path']).toBeDefined();
    expect(newStorageResult.errors['cloud-storage-space']).toBeUndefined();

    const existingResult = validateCloudConfiguration({
      ...baseCloud,
      storageType: 'existing',
      storageSpaceId: '',
      storageMountPath: 'relative',
    });
    expect(existingResult.errors['cloud-new-storage-capacity']).toBeUndefined();
    expect(existingResult.errors['cloud-storage-space']).toBeDefined();
    expect(existingResult.errors['cloud-storage-mount-path']).toBeDefined();
  });

  it('validates SSH source intent for both resource types', () => {
    expect(
      validateCloudConfiguration({
        ...baseCloud,
        network: { ...baseCloud.network, sshEnabled: true, sourceCidr: 'invalid' },
      }).errors['cloud-source-cidr'],
    ).toBeDefined();
    expect(
      validatePhysicalConfiguration({
        ...basePhysical,
        network: { ...basePhysical.network, sshEnabled: true, sourceCidr: '192.0.2.0/24' },
      }).errors,
    ).toEqual({});
  });

  it('detects obvious duplicate protocol and port combinations while allowing edits', () => {
    const rule: PortRule = {
      id: 'rule-1',
      ruleName: '应用服务',
      protocol: 'TCP',
      port: 8080,
      sourceType: 'cidr',
      sourceValue: '192.0.2.0/24',
      description: '',
    };
    expect(isDuplicatePortRule({ protocol: 'TCP', port: 8080, sourceValue: '192.0.2.0/24' }, [rule])).toBe(true);
    expect(isDuplicatePortRule({ protocol: 'UDP', port: 8080, sourceValue: '192.0.2.0/24' }, [rule])).toBe(false);
    expect(isDuplicatePortRule({ protocol: 'TCP', port: 8080, sourceValue: '192.0.2.0/24' }, [rule], 'rule-1')).toBe(false);
  });
});
