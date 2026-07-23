import type {
  Accelerator,
  CloudDataDisk,
  CloudServerResource,
  ConnectionInformation,
  InstalledSoftware,
  MonitoringMetric,
  OperationRecord,
  PhysicalMachineResource,
  PortRule,
  Resource,
  ResourceStatus,
} from '../types';

const CPU_SERIES = [21, 26, 24, 38, 34, 47, 42, 51, 44, 39, 48, 46];
const MEMORY_SERIES = [41, 42, 44, 43, 47, 49, 48, 52, 50, 53, 51, 54];
const GPU_SERIES = [18, 32, 28, 43, 55, 49, 61, 58, 52, 67, 62, 64];
const GPU_MEMORY_SERIES = [35, 38, 41, 45, 47, 48, 52, 54, 55, 57, 58, 60];
const DISK_SERIES = [36, 36, 37, 37, 38, 39, 39, 40, 40, 41, 41, 42];
const NETWORK_SERIES = [8, 12, 10, 18, 24, 16, 28, 21, 14, 26, 19, 22];

function monitoringMetrics(hasGpu: boolean): readonly MonitoringMetric[] {
  const metrics: MonitoringMetric[] = [
    {
      id: 'cpu',
      label: 'CPU 利用率',
      unit: '%',
      current: 46,
      values1h: CPU_SERIES,
      values24h: [...CPU_SERIES].reverse(),
    },
    {
      id: 'memory',
      label: '内存利用率',
      unit: '%',
      current: 54,
      values1h: MEMORY_SERIES,
      values24h: [...MEMORY_SERIES].reverse(),
    },
  ];
  if (hasGpu) {
    metrics.push(
      {
        id: 'gpu',
        label: 'GPU 利用率',
        unit: '%',
        current: 64,
        values1h: GPU_SERIES,
        values24h: [...GPU_SERIES].reverse(),
      },
      {
        id: 'gpu-memory',
        label: 'GPU 显存利用率',
        unit: '%',
        current: 60,
        values1h: GPU_MEMORY_SERIES,
        values24h: [...GPU_MEMORY_SERIES].reverse(),
      },
    );
  }
  metrics.push(
    {
      id: 'disk',
      label: '磁盘使用率',
      unit: '%',
      current: 42,
      values1h: DISK_SERIES,
      values24h: [...DISK_SERIES].reverse(),
    },
    {
      id: 'network',
      label: '网络流量',
      unit: 'MB/s',
      current: 22,
      values1h: NETWORK_SERIES,
      values24h: [...NETWORK_SERIES].reverse(),
    },
  );
  return metrics;
}

function accelerator(count: number, model = '高性能加速卡 80GB'): Accelerator {
  return { model, count, memoryGb: 80 };
}

function connection(
  privateIp: string,
  publicIp?: string,
  available = true,
): ConnectionInformation {
  if (!available) {
    return {
      available: false,
      notes: '资源就绪后生成连接信息。',
    };
  }
  return {
    available: true,
    privateIp,
    publicIp,
    sshUser: 'resource-user',
    sshPort: 22,
    authenticationMethod: 'SSH 公钥',
    subnet: '10.24.0.0/20',
    gateway: '10.24.0.1',
    notes: publicIp
      ? '可通过已登记的 SSH 公钥连接资源。'
      : '当前未分配公网 IP，请通过企业网络、专线或跳板环境连接。',
  };
}

function networkRules(index: number): readonly PortRule[] {
  return [
    {
      id: `rule-${index}-ssh`,
      name: 'SSH 访问',
      protocol: 'TCP',
      servicePort: 22,
      mappedPort: 22,
      source: '10.0.0.0/8',
      status: 'enabled',
    },
    {
      id: `rule-${index}-service`,
      name: '应用服务',
      protocol: 'TCP',
      servicePort: 8080,
      mappedPort: 18080 + index,
      source: '192.0.2.0/24',
      status: index % 3 === 0 ? 'disabled' : 'enabled',
    },
  ];
}

function software(index: number, physical = false): readonly InstalledSoftware[] {
  return [
    {
      id: `software-${index}-agent`,
      name: '资源监控组件',
      version: '2.6.1',
      status: 'available',
      installedAt: '2026-07-10T09:30:00+08:00',
    },
    {
      id: `software-${index}-runtime`,
      name: physical ? '硬件管理组件' : '容器运行环境',
      version: physical ? '1.8.0' : '1.29.2',
      status: index % 4 === 0 ? 'updating' : 'available',
      installedAt: '2026-07-12T14:20:00+08:00',
    },
  ];
}

function operationRecords(index: number): readonly OperationRecord[] {
  return [
    {
      id: `operation-${index}-1`,
      action: '资源信息同步',
      actor: '平台服务',
      createdAt: '2026-07-22T16:20:00+08:00',
      status: 'completed',
      message: '资源信息已更新。',
    },
    {
      id: `operation-${index}-2`,
      action: '连接信息读取',
      actor: '当前用户',
      createdAt: '2026-07-23T09:15:00+08:00',
      status: index % 5 === 0 ? 'failed' : 'completed',
      message:
        index % 5 === 0
          ? '连接信息暂时无法读取，请稍后重试。'
          : '连接信息读取完成。',
    },
  ];
}

function disks(index: number): readonly CloudDataDisk[] {
  if (index % 4 === 0) return [];
  return [
    {
      id: `disk-${index}-1`,
      name: index % 2 === 0 ? '研发共享数据' : '业务数据空间',
      displayType: index % 2 === 0 ? '高性能共享存储' : '本地数据存储',
      mountPath: '/data',
      capacityGb: index % 2 === 0 ? 1024 : 500,
      readOnly: false,
    },
  ];
}

type ResourceSeed = Readonly<{
  id: string;
  name: string;
  status: ResourceStatus;
  site: string;
  cpu: string;
  memoryGb: number;
  accelerator?: Accelerator;
  privateIp: string;
  publicIp?: string;
  available?: boolean;
  expiryState: 'active' | 'expiring' | 'expired';
  expiresAt: string;
  project: string;
  purpose: string;
}>;

const CLOUD_SEEDS: readonly ResourceSeed[] = [
  { id: 'cs-east-001', name: '研发计算节点-01', status: 'running', site: '东部算力中心', cpu: '16 vCPU', memoryGb: 64, privateIp: '10.24.1.21', publicIp: '198.51.100.21', expiryState: 'active', expiresAt: '2027-06-30T23:59:59+08:00', project: '研发基础平台', purpose: '持续集成与服务验证' },
  { id: 'cs-east-002', name: '视觉训练节点-02', status: 'running', site: '东部算力中心', cpu: '32 vCPU', memoryGb: 128, accelerator: accelerator(1), privateIp: '10.24.1.22', expiryState: 'expiring', expiresAt: '2026-08-05T23:59:59+08:00', project: '视觉算法平台', purpose: '模型训练环境' },
  { id: 'cs-west-003', name: '数据处理节点-03', status: 'stopped', site: '西部算力中心', cpu: '24 vCPU', memoryGb: 96, privateIp: '10.24.2.23', publicIp: '203.0.113.23', expiryState: 'active', expiresAt: '2027-03-31T23:59:59+08:00', project: '数据工程平台', purpose: '批量数据处理' },
  { id: 'cs-west-004', name: '推理计算节点-04', status: 'operating', site: '西部算力中心', cpu: '32 vCPU', memoryGb: 128, accelerator: accelerator(2), privateIp: '10.24.2.24', expiryState: 'active', expiresAt: '2027-01-31T23:59:59+08:00', project: '在线服务平台', purpose: '服务运行环境' },
  { id: 'cs-east-005', name: '通用开发节点-05', status: 'preparing', site: '东部算力中心', cpu: '8 vCPU', memoryGb: 32, privateIp: '10.24.1.25', available: false, expiryState: 'active', expiresAt: '2027-07-20T23:59:59+08:00', project: '开发工具平台', purpose: '开发环境准备' },
  { id: 'cs-south-006', name: '加速验证节点-06', status: 'abnormal', site: '南部算力中心', cpu: '16 vCPU', memoryGb: 64, accelerator: accelerator(1, '通用加速卡 48GB'), privateIp: '10.24.3.26', expiryState: 'expiring', expiresAt: '2026-08-12T23:59:59+08:00', project: '算法验证环境', purpose: '加速能力验证' },
  { id: 'cs-south-007', name: '归档计算节点-07', status: 'expired', site: '南部算力中心', cpu: '8 vCPU', memoryGb: 32, privateIp: '10.24.3.27', expiryState: 'expired', expiresAt: '2026-07-15T23:59:59+08:00', project: '历史数据平台', purpose: '归档任务查询' },
  { id: 'cs-east-008', name: '高性能训练节点-08', status: 'running', site: '东部算力中心', cpu: '64 vCPU', memoryGb: 256, accelerator: accelerator(2), privateIp: '10.24.1.28', publicIp: '198.51.100.28', expiryState: 'active', expiresAt: '2027-09-30T23:59:59+08:00', project: '多模态研发平台', purpose: '高性能训练环境' },
];

const PHYSICAL_SEEDS: readonly ResourceSeed[] = [
  { id: 'pm-east-001', name: '研发物理节点-01', status: 'running', site: '东部算力中心', cpu: '2 × 32 核处理器', memoryGb: 512, privateIp: '10.24.11.31', publicIp: '198.51.100.31', expiryState: 'active', expiresAt: '2027-06-30T23:59:59+08:00', project: '研发基础平台', purpose: '核心服务运行' },
  { id: 'pm-east-002', name: '训练物理节点-02', status: 'running', site: '东部算力中心', cpu: '2 × 64 核处理器', memoryGb: 1024, accelerator: accelerator(8), privateIp: '10.24.11.32', expiryState: 'expiring', expiresAt: '2026-08-08T23:59:59+08:00', project: '视觉算法平台', purpose: '大规模训练环境' },
  { id: 'pm-west-003', name: '计算物理节点-03', status: 'stopped', site: '西部算力中心', cpu: '2 × 48 核处理器', memoryGb: 768, privateIp: '10.24.12.33', publicIp: '203.0.113.33', expiryState: 'active', expiresAt: '2027-04-30T23:59:59+08:00', project: '数据工程平台', purpose: '离线计算任务' },
  { id: 'pm-west-004', name: '加速物理节点-04', status: 'operating', site: '西部算力中心', cpu: '2 × 64 核处理器', memoryGb: 1024, accelerator: accelerator(4), privateIp: '10.24.12.34', expiryState: 'active', expiresAt: '2027-02-28T23:59:59+08:00', project: '在线服务平台', purpose: '加速服务运行' },
  { id: 'pm-east-005', name: '交付物理节点-05', status: 'preparing', site: '东部算力中心', cpu: '2 × 32 核处理器', memoryGb: 512, privateIp: '10.24.11.35', available: false, expiryState: 'active', expiresAt: '2027-07-20T23:59:59+08:00', project: '开发工具平台', purpose: '资源交付准备' },
  { id: 'pm-south-006', name: '验证物理节点-06', status: 'abnormal', site: '南部算力中心', cpu: '2 × 48 核处理器', memoryGb: 768, accelerator: accelerator(4, '通用加速卡 48GB'), privateIp: '10.24.13.36', expiryState: 'expiring', expiresAt: '2026-08-15T23:59:59+08:00', project: '算法验证环境', purpose: '硬件兼容验证' },
  { id: 'pm-south-007', name: '归档物理节点-07', status: 'expired', site: '南部算力中心', cpu: '2 × 32 核处理器', memoryGb: 512, privateIp: '10.24.13.37', expiryState: 'expired', expiresAt: '2026-07-10T23:59:59+08:00', project: '历史数据平台', purpose: '历史环境查询' },
  { id: 'pm-east-008', name: '高性能物理节点-08', status: 'running', site: '东部算力中心', cpu: '2 × 64 核处理器', memoryGb: 1536, accelerator: accelerator(8), privateIp: '10.24.11.38', publicIp: '198.51.100.38', expiryState: 'active', expiresAt: '2027-10-31T23:59:59+08:00', project: '多模态研发平台', purpose: '高性能训练环境' },
];

function createCloudResource(seed: ResourceSeed, index: number): CloudServerResource {
  return {
    ...seed,
    resourceType: 'cloud-server',
    computeType: seed.accelerator ? 'gpu' : 'cpu',
    ip: { privateIp: seed.privateIp, publicIp: seed.publicIp },
    createdAt: `2026-0${(index % 6) + 1}-12T10:00:00+08:00`,
    owner: '平台研发组',
    lastOperatedAt: '2026-07-23T09:15:00+08:00',
    connection: connection(seed.privateIp, seed.publicIp, seed.available ?? true),
    monitoring: monitoringMetrics(Boolean(seed.accelerator)),
    networkRules: networkRules(index),
    software: software(index),
    operationRecords: operationRecords(index),
    image: seed.accelerator ? 'GPU 计算基础环境 2026.06' : 'Linux 基础环境 2026.06',
    systemDiskGb: 30,
    dataDisks: disks(index),
    instanceInformation: seed.accelerator ? 'GPU 计算实例' : '通用计算实例',
  };
}

function createPhysicalResource(
  seed: ResourceSeed,
  index: number,
): PhysicalMachineResource {
  return {
    ...seed,
    resourceType: 'physical-machine',
    computeType: seed.accelerator ? 'gpu' : 'cpu',
    ip: { privateIp: seed.privateIp, publicIp: seed.publicIp },
    createdAt: `2026-0${(index % 6) + 1}-18T11:00:00+08:00`,
    owner: '基础设施使用组',
    lastOperatedAt: '2026-07-23T09:15:00+08:00',
    connection: connection(seed.privateIp, seed.publicIp, seed.available ?? true),
    monitoring: monitoringMetrics(Boolean(seed.accelerator)),
    networkRules: networkRules(index + 20),
    software: software(index, true),
    operationRecords: operationRecords(index + 20),
    machineModel: seed.accelerator ? '高密度加速计算服务器' : '通用双路计算服务器',
    hostname: `compute-pm-${String(index).padStart(2, '0')}`,
    operatingSystem: 'Linux 服务器操作系统 2026.06',
    storageSummary: seed.accelerator
      ? '2 × 1.92 TB NVMe 系统存储，4 × 3.84 TB NVMe 数据存储'
      : '2 × 1.92 TB NVMe 系统存储，4 × 8 TB 企业级数据存储',
    bmcAccess: index % 3 === 0 ? 'not-provided' : 'restricted',
  };
}

export function createInitialResourceCatalog(): Resource[] {
  return [
    ...CLOUD_SEEDS.map(createCloudResource),
    ...PHYSICAL_SEEDS.map(createPhysicalResource),
  ];
}
