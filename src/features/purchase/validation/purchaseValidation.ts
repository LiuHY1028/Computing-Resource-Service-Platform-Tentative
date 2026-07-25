import type {
  CloudPurchaseConfiguration,
  NetworkConfiguration,
  PhysicalPurchaseConfiguration,
  PortRule,
  PurchaseValidationResult,
} from '../types';

const IPV4_OCTET = '(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)';
const IPV4_PATTERN = new RegExp(`^${IPV4_OCTET}(?:\\.${IPV4_OCTET}){3}$`);

export function isValidIpOrCidr(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const [address, prefix, extra] = trimmed.split('/');
  if (extra !== undefined || !address || !IPV4_PATTERN.test(address)) {
    return false;
  }
  if (prefix === undefined) return true;
  return /^\d{1,2}$/.test(prefix) && Number(prefix) >= 0 && Number(prefix) <= 32;
}

export function isValidAbsolutePath(value: string) {
  const trimmed = value.trim();
  return (
    trimmed.startsWith('/') &&
    trimmed.length > 1 &&
    !trimmed.includes('\\') &&
    !trimmed.split('/').includes('..')
  );
}

export function isValidPort(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= 65535;
}

export function isDuplicatePortRule(
  candidate: Pick<PortRule, 'protocol' | 'port' | 'sourceValue'>,
  rules: readonly PortRule[],
  editingId?: string,
) {
  return rules.some(
    (rule) =>
      rule.id !== editingId &&
      rule.protocol === candidate.protocol &&
      rule.port === candidate.port &&
      rule.sourceValue === candidate.sourceValue,
  );
}

function validateQuantity(
  value: string,
  fieldId: string,
  errors: Record<string, string>,
) {
  const quantity = Number(value);
  if (!value.trim()) {
    errors[fieldId] = '请输入使用数量。';
  } else if (!Number.isInteger(quantity) || quantity <= 0) {
    errors[fieldId] = '数量必须为正整数；正式购买上限仍待规则确认。';
  }
}

function validateNetwork(
  network: NetworkConfiguration,
  fieldId: string,
  errors: Record<string, string>,
) {
  if (network.sshEnabled && !isValidIpOrCidr(network.sourceCidr)) {
    errors[fieldId] = '启用 SSH 访问意向时，请输入有效的 IPv4 地址或 CIDR。';
  }
}

function result(
  errors: Record<string, string>,
  missingLabels: Readonly<Record<string, string>>,
): PurchaseValidationResult {
  const keys = Object.keys(errors);
  return {
    errors,
    missingItems: keys.map((key) => missingLabels[key] ?? errors[key] ?? key),
    firstInvalidFieldId: keys[0],
  };
}

export function validateCloudConfiguration(
  configuration: CloudPurchaseConfiguration,
): PurchaseValidationResult {
  const errors: Record<string, string> = {};
  if (!configuration.instanceName.trim()) {
    errors['cloud-instance-name'] = '请输入实例名称。';
  }
  validateQuantity(configuration.quantity, 'cloud-instance-quantity', errors);
  if (configuration.storageType === 'new') {
    if (!Number.isSafeInteger(configuration.newStorageCapacityGb) || configuration.newStorageCapacityGb < 10) {
      errors['cloud-new-storage-capacity'] = '存储容量必须为不小于 10 GB 的整数。';
    }
  }
  if (configuration.storageType === 'existing') {
    if (!configuration.storageSpaceId) {
      errors['cloud-storage-space'] = '请选择一个已有存储。';
    }
  }
  if (configuration.storageType !== 'none' && !isValidAbsolutePath(configuration.storageMountPath)) {
    errors['cloud-storage-mount-path'] = '请输入有效的绝对挂载路径。';
  }
  validateNetwork(configuration.network, 'cloud-source-cidr', errors);

  return result(errors, {
    'cloud-instance-name': '实例名称',
    'cloud-instance-quantity': '实例数量',
    'cloud-new-storage-capacity': '新购存储容量',
    'cloud-storage-space': '已有存储',
    'cloud-storage-mount-path': '存储挂载路径',
    'cloud-source-cidr': 'SSH 允许来源',
  });
}

export function validatePhysicalConfiguration(
  configuration: PhysicalPurchaseConfiguration,
): PurchaseValidationResult {
  const errors: Record<string, string> = {};
  if (!configuration.resourceName.trim()) {
    errors['physical-resource-name'] = '请输入资源名称。';
  }
  validateQuantity(configuration.quantity, 'physical-resource-quantity', errors);
  validateNetwork(configuration.network, 'physical-source-cidr', errors);

  return result(errors, {
    'physical-resource-name': '资源名称',
    'physical-resource-quantity': '使用数量',
    'physical-source-cidr': 'SSH 允许来源',
  });
}
