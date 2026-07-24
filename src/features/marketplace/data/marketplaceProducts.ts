import type { MarketplaceProduct } from '../types';

/**
 * OQ-020 temporary assumption: cloud-server system disks are shown as
 * a read-only 30 GB storage capacity. Physical machines do not inherit it.
 */
export const MARKETPLACE_CLOUD_SYSTEM_DISK_GB = 30;

const UNAVAILABLE_REASON = '该规格当前暂不可继续配置。';

/**
 * Local, deterministic catalog containing only the selection-time
 * specification fields required by the marketplace.
 */
export const MARKETPLACE_CATALOG_PRODUCTS = [
  {
    id: 'catalog-cloud-cpu-c8-east',
    skuId: 'catalog-cloud-cpu-c8-east',
    resourceType: 'cloud-server',
    name: '通用计算 C8',
    site: '东部算力中心',
    computeType: 'cpu',
    cpu: '8 vCPU',
    memoryGb: 32,
    defaultSystemDiskGb: MARKETPLACE_CLOUD_SYSTEM_DISK_GB,
    configurable: true,
  },
  {
    id: 'catalog-cloud-cpu-c16-west',
    skuId: 'catalog-cloud-cpu-c16-west',
    resourceType: 'cloud-server',
    name: '通用计算 C16',
    site: '西部算力中心',
    computeType: 'cpu',
    cpu: '16 vCPU',
    memoryGb: 64,
    defaultSystemDiskGb: MARKETPLACE_CLOUD_SYSTEM_DISK_GB,
    configurable: false,
    unavailableReason: UNAVAILABLE_REASON,
  },
  {
    id: 'catalog-cloud-gpu-g1-east',
    skuId: 'catalog-cloud-gpu-g1-east',
    resourceType: 'cloud-server',
    name: '加速计算 G1',
    site: '东部算力中心',
    computeType: 'gpu',
    cpu: '16 vCPU',
    memoryGb: 64,
    accelerator: {
      model: '通用加速卡 80GB',
      count: 1,
    },
    defaultSystemDiskGb: MARKETPLACE_CLOUD_SYSTEM_DISK_GB,
    configurable: true,
  },
  {
    id: 'catalog-cloud-gpu-g2-west',
    skuId: 'catalog-cloud-gpu-g2-west',
    resourceType: 'cloud-server',
    name: '加速计算 G2',
    site: '西部算力中心',
    computeType: 'gpu',
    cpu: '32 vCPU',
    memoryGb: 128,
    accelerator: {
      model: '通用加速卡 80GB',
      count: 2,
    },
    defaultSystemDiskGb: MARKETPLACE_CLOUD_SYSTEM_DISK_GB,
    configurable: true,
  },
  {
    id: 'catalog-cloud-gpu-g3-east',
    skuId: 'catalog-cloud-gpu-g3-east',
    resourceType: 'cloud-server',
    name: '加速计算 G3',
    site: '东部算力中心',
    computeType: 'gpu',
    cpu: '32 vCPU',
    memoryGb: 128,
    accelerator: {
      model: '高性能加速卡 80GB',
      count: 1,
    },
    defaultSystemDiskGb: MARKETPLACE_CLOUD_SYSTEM_DISK_GB,
    configurable: false,
    unavailableReason: UNAVAILABLE_REASON,
  },
  {
    id: 'catalog-cloud-gpu-g4-west',
    skuId: 'catalog-cloud-gpu-g4-west',
    resourceType: 'cloud-server',
    name: '加速计算 G4',
    site: '西部算力中心',
    computeType: 'gpu',
    cpu: '48 vCPU',
    memoryGb: 192,
    accelerator: {
      model: '高性能加速卡 80GB',
      count: 2,
    },
    defaultSystemDiskGb: MARKETPLACE_CLOUD_SYSTEM_DISK_GB,
    configurable: true,
  },
  {
    id: 'catalog-physical-cpu-p1-east',
    skuId: 'catalog-physical-cpu-p1-east',
    resourceType: 'physical-machine',
    name: '整机通用计算 P1',
    site: '东部算力中心',
    computeType: 'cpu',
    cpu: '2 × 32 核通用处理器',
    memoryGb: 512,
    machineSummary: '双路处理器整机规格',
    configurable: true,
  },
  {
    id: 'catalog-physical-gpu-p4-east',
    skuId: 'catalog-physical-gpu-p4-east',
    resourceType: 'physical-machine',
    name: '整机加速计算 P4',
    site: '东部算力中心',
    computeType: 'gpu',
    cpu: '2 × 32 核通用处理器',
    memoryGb: 512,
    accelerator: {
      model: '通用加速卡 80GB',
      count: 4,
    },
    machineSummary: '双路处理器、四张加速卡整机规格',
    configurable: true,
  },
  {
    id: 'catalog-physical-gpu-p4-west',
    skuId: 'catalog-physical-gpu-p4-west',
    resourceType: 'physical-machine',
    name: '整机加速计算 P4-B',
    site: '西部算力中心',
    computeType: 'gpu',
    cpu: '2 × 32 核通用处理器',
    memoryGb: 512,
    accelerator: {
      model: '通用加速卡 80GB',
      count: 4,
    },
    machineSummary: '双路处理器、四张加速卡整机规格',
    configurable: false,
    unavailableReason: UNAVAILABLE_REASON,
  },
  {
    id: 'catalog-physical-gpu-p8-west',
    skuId: 'catalog-physical-gpu-p8-west',
    resourceType: 'physical-machine',
    name: '整机加速计算 P8',
    site: '西部算力中心',
    computeType: 'gpu',
    cpu: '2 × 48 核通用处理器',
    memoryGb: 1024,
    accelerator: {
      model: '高性能加速卡 80GB',
      count: 8,
    },
    machineSummary: '双路处理器、八张加速卡整机规格',
    configurable: true,
  },
] as const satisfies readonly MarketplaceProduct[];
