import type { MarketplaceProduct } from '../types';

/**
 * OQ-020 temporary prototype assumption: cloud-server system disks are shown as
 * a read-only 30 GB storage capacity. Physical machines do not inherit it.
 */
export const MARKETPLACE_DEMO_CLOUD_SYSTEM_DISK_GB = 30;

export const MARKETPLACE_DEMO_DATA_NOTICE =
  '以下资源规格均为原型演示数据，不代表真实供给、可用容量或商务规则。';

const DEMO_UNAVAILABLE_REASON = '演示状态：该规格当前暂不可继续配置。';

/**
 * Local, deterministic prototype catalog containing only the selection-time
 * specification fields required by the marketplace.
 */
export const MARKETPLACE_DEMO_PRODUCTS = [
  {
    id: 'demo-cloud-cpu-c8-site-a',
    resourceType: 'cloud-server',
    name: '通用计算 C8',
    site: '示例站点 A',
    computeType: 'cpu',
    cpu: '8 vCPU',
    memoryGb: 32,
    defaultSystemDiskGb: MARKETPLACE_DEMO_CLOUD_SYSTEM_DISK_GB,
    configurable: true,
    isDemo: true,
  },
  {
    id: 'demo-cloud-cpu-c16-site-b',
    resourceType: 'cloud-server',
    name: '通用计算 C16',
    site: '示例站点 B',
    computeType: 'cpu',
    cpu: '16 vCPU',
    memoryGb: 64,
    defaultSystemDiskGb: MARKETPLACE_DEMO_CLOUD_SYSTEM_DISK_GB,
    configurable: false,
    unavailableReason: DEMO_UNAVAILABLE_REASON,
    isDemo: true,
  },
  {
    id: 'demo-cloud-gpu-g1-site-a',
    resourceType: 'cloud-server',
    name: '加速计算 G1',
    site: '示例站点 A',
    computeType: 'gpu',
    cpu: '16 vCPU',
    memoryGb: 64,
    accelerator: {
      model: '示例加速卡 A',
      count: 1,
    },
    defaultSystemDiskGb: MARKETPLACE_DEMO_CLOUD_SYSTEM_DISK_GB,
    configurable: true,
    isDemo: true,
  },
  {
    id: 'demo-cloud-gpu-g2-site-b',
    resourceType: 'cloud-server',
    name: '加速计算 G2',
    site: '示例站点 B',
    computeType: 'gpu',
    cpu: '32 vCPU',
    memoryGb: 128,
    accelerator: {
      model: '示例加速卡 A',
      count: 2,
    },
    defaultSystemDiskGb: MARKETPLACE_DEMO_CLOUD_SYSTEM_DISK_GB,
    configurable: true,
    isDemo: true,
  },
  {
    id: 'demo-cloud-gpu-g3-site-a',
    resourceType: 'cloud-server',
    name: '加速计算 G3',
    site: '示例站点 A',
    computeType: 'gpu',
    cpu: '32 vCPU',
    memoryGb: 128,
    accelerator: {
      model: '示例加速卡 B',
      count: 1,
    },
    defaultSystemDiskGb: MARKETPLACE_DEMO_CLOUD_SYSTEM_DISK_GB,
    configurable: false,
    unavailableReason: DEMO_UNAVAILABLE_REASON,
    isDemo: true,
  },
  {
    id: 'demo-cloud-gpu-g4-site-b',
    resourceType: 'cloud-server',
    name: '加速计算 G4',
    site: '示例站点 B',
    computeType: 'gpu',
    cpu: '48 vCPU',
    memoryGb: 192,
    accelerator: {
      model: '示例加速卡 B',
      count: 2,
    },
    defaultSystemDiskGb: MARKETPLACE_DEMO_CLOUD_SYSTEM_DISK_GB,
    configurable: true,
    isDemo: true,
  },
  {
    id: 'demo-physical-cpu-p1-site-a',
    resourceType: 'physical-machine',
    name: '整机通用计算 P1',
    site: '示例站点 A',
    computeType: 'cpu',
    cpu: '2 × 32 核通用处理器（演示）',
    memoryGb: 512,
    machineSummary: '双路处理器整机规格（演示）',
    configurable: true,
    isDemo: true,
  },
  {
    id: 'demo-physical-gpu-p4-site-a',
    resourceType: 'physical-machine',
    name: '整机加速计算 P4',
    site: '示例站点 A',
    computeType: 'gpu',
    cpu: '2 × 32 核通用处理器（演示）',
    memoryGb: 512,
    accelerator: {
      model: '示例加速卡 A',
      count: 4,
    },
    machineSummary: '双路处理器、四张加速卡整机规格（演示）',
    configurable: true,
    isDemo: true,
  },
  {
    id: 'demo-physical-gpu-p4-site-b',
    resourceType: 'physical-machine',
    name: '整机加速计算 P4-B',
    site: '示例站点 B',
    computeType: 'gpu',
    cpu: '2 × 32 核通用处理器（演示）',
    memoryGb: 512,
    accelerator: {
      model: '示例加速卡 A',
      count: 4,
    },
    machineSummary: '双路处理器、四张加速卡整机规格（演示）',
    configurable: false,
    unavailableReason: DEMO_UNAVAILABLE_REASON,
    isDemo: true,
  },
  {
    id: 'demo-physical-gpu-p8-site-b',
    resourceType: 'physical-machine',
    name: '整机加速计算 P8',
    site: '示例站点 B',
    computeType: 'gpu',
    cpu: '2 × 48 核通用处理器（演示）',
    memoryGb: 1024,
    accelerator: {
      model: '示例加速卡 B',
      count: 8,
    },
    machineSummary: '双路处理器、八张加速卡整机规格（演示）',
    configurable: true,
    isDemo: true,
  },
] as const satisfies readonly MarketplaceProduct[];
