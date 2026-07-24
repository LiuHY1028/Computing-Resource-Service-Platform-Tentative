import type { MarketplaceProduct } from '../marketplace';
import { getPresetImageById } from './data/presetImages';
import { getPresetStorageSpaceById } from './data/presetStorageSpaces';
import type {
  CloudPurchaseConfiguration,
  PhysicalPurchaseConfiguration,
  PurchaseSummaryItem,
} from './types';

function gpuSummary(product: MarketplaceProduct) {
  return product.accelerator
    ? `${product.accelerator.model} × ${product.accelerator.count}`
    : '无 GPU';
}

function networkSummary(sshEnabled: boolean, ruleCount: number) {
  return `SSH${sshEnabled ? '已启用' : '未启用'} · ${ruleCount}条端口规则`;
}

export function buildCloudSummary(
  product: Extract<MarketplaceProduct, { resourceType: 'cloud-server' }>,
  configuration: CloudPurchaseConfiguration,
): readonly PurchaseSummaryItem[] {
  const image = configuration.imageId
    ? getPresetImageById(configuration.imageId)
    : undefined;
  const storageSpace = getPresetStorageSpaceById(configuration.storageSpaceId);
  let storage = '未挂载';
  if (configuration.storageType === 'host-path') {
    storage = `本地数据存储 · ${configuration.hostMountPath || '挂载路径待填写'}`;
  } else if (configuration.storageType === 'shared') {
    storage = `高性能共享存储${storageSpace ? ` · ${storageSpace.name}` : ''} · ${configuration.sharedMountPath || '挂载路径待填写'}`;
  }
  return [
    { label: '资源类型', value: '云服务器' },
    { label: '商品名称', value: product.name },
    { label: '实例名称', value: configuration.instanceName || '待填写', pending: !configuration.instanceName },
    { label: '站点', value: product.site },
    { label: 'CPU', value: product.cpu },
    { label: '内存', value: `${product.memoryGb} GB` },
    { label: 'GPU', value: gpuSummary(product) },
    { label: '数量', value: configuration.quantity || '待填写', pending: !configuration.quantity },
    { label: '计费模式', value: configuration.billingMode === 'subscription' ? '包月' : '按量' },
    ...(configuration.billingMode === 'subscription'
      ? [
          { label: '购买时长', value: `${configuration.periodMonths} 个月` },
          { label: '自动续费', value: configuration.autoRenewalEnabled ? `已开启 · ${configuration.periodMonths} 个月` : '未开启' },
        ]
      : []),
    { label: '系统盘', value: `${configuration.systemDiskGb} GB` },
    { label: '数据盘', value: storage },
    { label: '镜像', value: image?.name ?? '未选择（可选）' },
    { label: '网络访问', value: networkSummary(configuration.network.sshEnabled, configuration.network.portRules.length) },
    { label: '使用说明', value: configuration.purpose.trim() || '未填写（可选）' },
  ];
}

export function buildPhysicalSummary(
  product: Extract<MarketplaceProduct, { resourceType: 'physical-machine' }>,
  configuration: PhysicalPurchaseConfiguration,
): readonly PurchaseSummaryItem[] {
  return [
    { label: '资源类型', value: '物理机' },
    { label: '整机规格', value: product.name },
    { label: '资源名称', value: configuration.resourceName || '待填写', pending: !configuration.resourceName },
    { label: '站点', value: product.site },
    { label: 'CPU', value: product.cpu },
    { label: '内存', value: `${product.memoryGb} GB` },
    { label: 'GPU', value: gpuSummary(product) },
    { label: '数量', value: configuration.quantity || '待填写', pending: !configuration.quantity },
    { label: '计费模式', value: '按月租用' },
    { label: '使用时长', value: `${configuration.periodMonths} 个月` },
    { label: '使用说明', value: configuration.purpose.trim() || '未填写（可选）' },
    { label: '网络访问意向', value: networkSummary(configuration.network.sshEnabled, configuration.network.portRules.length) },
    { label: '交付方式', value: '申请受理后进入资源准备与基础初始化' },
    { label: '认证方式', value: 'SSH 密钥' },
    { label: '连接信息', value: '资源交付完成后在“我的资源”提供' },
  ];
}
