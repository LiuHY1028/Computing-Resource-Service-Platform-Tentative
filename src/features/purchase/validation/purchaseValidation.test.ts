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
  hostPath: '',
  hostMountPath: '',
  hostReadOnly: false,
  storageSpaceId: '',
  sharedMountPath: '',
  sharedReadOnly: false,
  imageId: null,
  network: { sshEnabled: false, sourceCidr: '', portRules: [] },
};

const basePhysical: PhysicalPurchaseConfiguration = {
  resourceName: 'physical-resource',
  quantity: '1',
  purpose: '',
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
    const hostResult = validateCloudConfiguration({
      ...baseCloud,
      storageType: 'host-path',
      hostPath: 'relative',
      hostMountPath: '',
    });
    expect(hostResult.errors['cloud-host-path']).toBeDefined();
    expect(hostResult.errors['cloud-host-mount-path']).toBeDefined();
    expect(hostResult.errors['cloud-storage-space']).toBeUndefined();

    const sharedResult = validateCloudConfiguration({
      ...baseCloud,
      storageType: 'shared',
      hostPath: 'ignored',
      hostMountPath: 'ignored',
      storageSpaceId: '',
      sharedMountPath: 'relative',
    });
    expect(sharedResult.errors['cloud-host-path']).toBeUndefined();
    expect(sharedResult.errors['cloud-storage-space']).toBeDefined();
    expect(sharedResult.errors['cloud-shared-mount-path']).toBeDefined();
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
      protocol: 'TCP',
      servicePort: 8080,
      mappedPort: 80,
      source: '192.0.2.0/24',
      description: '',
    };
    expect(isDuplicatePortRule({ protocol: 'TCP', servicePort: 8080, mappedPort: 81 }, [rule])).toBe(true);
    expect(isDuplicatePortRule({ protocol: 'UDP', servicePort: 8080, mappedPort: 80 }, [rule])).toBe(false);
    expect(isDuplicatePortRule({ protocol: 'TCP', servicePort: 8080, mappedPort: 80 }, [rule], 'rule-1')).toBe(false);
  });
});
