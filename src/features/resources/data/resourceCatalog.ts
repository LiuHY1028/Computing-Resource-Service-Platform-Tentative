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
import {
  calculateCloudPrice,
  calculatePhysicalPrice,
  createPriceSnapshot,
  getComputePrice,
} from '../../pricing';

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

function disks(index: number, expiresAt: string): readonly CloudDataDisk[] {
  const performance = {
    readThroughputMbs: 128 + index * 6,
    writeThroughputMbs: 96 + index * 4,
    readIops: 3200 + index * 180,
    writeIops: 2600 + index * 140,
    averageLatencyMs: Number((1.4 + index * 0.12).toFixed(2)),
  };
  const result: CloudDataDisk[] = [
    {
      id: `disk-system-${index}`,
      name: '系统盘',
      role: 'system',
      displayType: '系统盘',
      diskType: '高性能云盘',
      mountPath: '/',
      deviceName: '/dev/vda',
      fileSystem: 'ext4',
      capacityGb: 30,
      usedGb: 17 + (index % 8),
      readOnly: false,
      status: index === 6 ? 'warning' : 'in-use',
      releaseWithInstance: true,
      expiresAt,
      performance,
    },
  ];
  if (index % 4 === 0) return result;
  result.push(
    {
      id: `disk-${index}-1`,
      name: index % 2 === 0 ? '研发共享数据' : '业务数据空间',
      role: 'data',
      displayType: index % 2 === 0 ? '高性能共享存储' : '云硬盘',
      diskType: index % 2 === 0 ? '共享存储' : '高性能云盘',
      mountPath: '/data',
      deviceName: '/dev/vdb',
      fileSystem: 'xfs',
      capacityGb: index % 2 === 0 ? 1024 : 500,
      usedGb: index % 2 === 0 ? 386 : 342,
      readOnly: false,
      status: index === 6 ? 'warning' : 'in-use',
      releaseWithInstance: false,
      expiresAt,
      performance: {
        ...performance,
        readThroughputMbs: performance.readThroughputMbs + 40,
        writeThroughputMbs: performance.writeThroughputMbs + 28,
      },
      storageId: index === 1
        ? 'storage-cloud-east-001'
        : index === 2
          ? 'storage-shared-east-001'
          : undefined,
    },
  );
  return result;
}

type ResourceSeed = Readonly<{
  id: string;
  skuId: string;
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
  { id: 'cs-east-001', skuId: 'catalog-cloud-cpu-c16-west', name: '研发计算节点-01', status: 'running', site: '东部算力中心', cpu: '16 vCPU', memoryGb: 64, privateIp: '10.24.1.21', publicIp: '198.51.100.21', expiryState: 'active', expiresAt: '2027-06-30T23:59:59+08:00', project: '研发基础平台', purpose: '持续集成与服务验证' },
  { id: 'cs-east-002', skuId: 'catalog-cloud-gpu-g3-east', name: '视觉训练节点-02', status: 'running', site: '东部算力中心', cpu: '32 vCPU', memoryGb: 128, accelerator: accelerator(1), privateIp: '10.24.1.22', expiryState: 'expiring', expiresAt: '2026-08-05T23:59:59+08:00', project: '视觉算法平台', purpose: '模型训练环境' },
  { id: 'cs-west-003', skuId: 'catalog-cloud-cpu-c8-east', name: '数据处理节点-03', status: 'stopped', site: '西部算力中心', cpu: '8 vCPU', memoryGb: 32, privateIp: '10.24.2.23', publicIp: '203.0.113.23', expiryState: 'active', expiresAt: '2027-03-31T23:59:59+08:00', project: '数据工程平台', purpose: '批量数据处理' },
  { id: 'cs-west-004', skuId: 'catalog-cloud-gpu-g2-west', name: '推理计算节点-04', status: 'operating', site: '西部算力中心', cpu: '32 vCPU', memoryGb: 128, accelerator: accelerator(2), privateIp: '10.24.2.24', expiryState: 'active', expiresAt: '2027-01-31T23:59:59+08:00', project: '在线服务平台', purpose: '服务运行环境' },
  { id: 'cs-east-005', skuId: 'catalog-cloud-cpu-c8-east', name: '通用开发节点-05', status: 'preparing', site: '东部算力中心', cpu: '8 vCPU', memoryGb: 32, privateIp: '10.24.1.25', available: false, expiryState: 'active', expiresAt: '2027-07-20T23:59:59+08:00', project: '开发工具平台', purpose: '开发环境准备' },
  { id: 'cs-south-006', skuId: 'catalog-cloud-gpu-g1-east', name: '加速验证节点-06', status: 'abnormal', site: '南部算力中心', cpu: '16 vCPU', memoryGb: 64, accelerator: accelerator(1, '通用加速卡 80GB'), privateIp: '10.24.3.26', expiryState: 'expiring', expiresAt: '2026-08-12T23:59:59+08:00', project: '算法验证环境', purpose: '加速能力验证' },
  { id: 'cs-south-007', skuId: 'catalog-cloud-cpu-c8-east', name: '归档计算节点-07', status: 'expired', site: '南部算力中心', cpu: '8 vCPU', memoryGb: 32, privateIp: '10.24.3.27', expiryState: 'expired', expiresAt: '2026-07-15T23:59:59+08:00', project: '历史数据平台', purpose: '归档任务查询' },
  { id: 'cs-east-008', skuId: 'catalog-cloud-gpu-g4-west', name: '高性能训练节点-08', status: 'running', site: '东部算力中心', cpu: '48 vCPU', memoryGb: 192, accelerator: accelerator(2), privateIp: '10.24.1.28', publicIp: '198.51.100.28', expiryState: 'active', expiresAt: '2027-09-30T23:59:59+08:00', project: '多模态研发平台', purpose: '高性能训练环境' },
];

const PHYSICAL_SEEDS: readonly ResourceSeed[] = [
  { id: 'pm-east-001', skuId: 'catalog-physical-cpu-p1-east', name: '研发物理节点-01', status: 'running', site: '东部算力中心', cpu: '2 × 32 核处理器', memoryGb: 512, privateIp: '10.24.11.31', publicIp: '198.51.100.31', expiryState: 'active', expiresAt: '2027-06-30T23:59:59+08:00', project: '研发基础平台', purpose: '核心服务运行' },
  { id: 'pm-east-002', skuId: 'catalog-physical-gpu-p8-west', name: '训练物理节点-02', status: 'running', site: '东部算力中心', cpu: '2 × 48 核处理器', memoryGb: 1024, accelerator: accelerator(8), privateIp: '10.24.11.32', expiryState: 'expiring', expiresAt: '2026-08-08T23:59:59+08:00', project: '视觉算法平台', purpose: '大规模训练环境' },
  { id: 'pm-west-003', skuId: 'catalog-physical-cpu-p1-east', name: '计算物理节点-03', status: 'stopped', site: '西部算力中心', cpu: '2 × 32 核处理器', memoryGb: 512, privateIp: '10.24.12.33', publicIp: '203.0.113.33', expiryState: 'active', expiresAt: '2027-04-30T23:59:59+08:00', project: '数据工程平台', purpose: '离线计算任务' },
  { id: 'pm-west-004', skuId: 'catalog-physical-gpu-p4-west', name: '加速物理节点-04', status: 'operating', site: '西部算力中心', cpu: '2 × 32 核处理器', memoryGb: 512, accelerator: accelerator(4, '通用加速卡 80GB'), privateIp: '10.24.12.34', expiryState: 'active', expiresAt: '2027-02-28T23:59:59+08:00', project: '在线服务平台', purpose: '加速服务运行' },
  { id: 'pm-east-005', skuId: 'catalog-physical-cpu-p1-east', name: '交付物理节点-05', status: 'preparing', site: '东部算力中心', cpu: '2 × 32 核处理器', memoryGb: 512, privateIp: '10.24.11.35', available: false, expiryState: 'active', expiresAt: '2027-07-20T23:59:59+08:00', project: '开发工具平台', purpose: '资源交付准备' },
  { id: 'pm-south-006', skuId: 'catalog-physical-gpu-p4-east', name: '验证物理节点-06', status: 'abnormal', site: '南部算力中心', cpu: '2 × 32 核处理器', memoryGb: 512, accelerator: accelerator(4, '通用加速卡 80GB'), privateIp: '10.24.13.36', expiryState: 'expiring', expiresAt: '2026-08-15T23:59:59+08:00', project: '算法验证环境', purpose: '硬件兼容验证' },
  { id: 'pm-south-007', skuId: 'catalog-physical-cpu-p1-east', name: '归档物理节点-07', status: 'expired', site: '南部算力中心', cpu: '2 × 32 核处理器', memoryGb: 512, privateIp: '10.24.13.37', expiryState: 'expired', expiresAt: '2026-07-10T23:59:59+08:00', project: '历史数据平台', purpose: '历史环境查询' },
  { id: 'pm-east-008', skuId: 'catalog-physical-gpu-p8-west', name: '高性能物理节点-08', status: 'running', site: '东部算力中心', cpu: '2 × 48 核处理器', memoryGb: 1024, accelerator: accelerator(8), privateIp: '10.24.11.38', publicIp: '198.51.100.38', expiryState: 'active', expiresAt: '2027-10-31T23:59:59+08:00', project: '多模态研发平台', purpose: '高性能训练环境' },
];

function createCloudResource(seed: ResourceSeed, index: number): CloudServerResource {
  const price = getComputePrice(seed.skuId);
  const warning = seed.status === 'abnormal' || seed.expiryState === 'expired';
  const billingMode = index === 3 || index === 5 ? 'pay-as-you-go' : 'subscription';
  const createdAt = `2026-0${(index % 6) + 1}-12T10:00:00+08:00`;
  const imageId = seed.accelerator ? 'preset-image-gpu-runtime' : 'preset-image-base-linux';
  const resourceDisks = disks(index, seed.expiresAt);
  const dataDisk = resourceDisks.find((disk) => disk.role === 'data');
  const priceSnapshot = createPriceSnapshot(
    seed.skuId,
    calculateCloudPrice({
      skuId: seed.skuId,
      billingMode,
      quantity: 1,
      durationMonths: billingMode === 'subscription' ? 1 : undefined,
      systemDiskGb: 30,
      imageId,
      storage: index === 0
        ? {
            skuId: 'storage-shared-performance-gb-month',
            capacityGb: 2048,
            label: '研发共享存储 · 2048 GB',
          }
        : dataDisk
          ? {
              skuId: dataDisk.displayType === '高性能共享存储'
                ? 'storage-shared-standard-gb-month'
                : 'storage-cloud-performance-gb-month',
              capacityGb: dataDisk.capacityGb,
              label: dataDisk.displayType,
            }
          : undefined,
    }),
    createdAt,
  );
  return {
    ...seed,
    resourceType: 'cloud-server',
    computeType: seed.accelerator ? 'gpu' : 'cpu',
    ip: { privateIp: seed.privateIp, publicIp: seed.publicIp },
    createdAt,
    owner: '平台研发组',
    tags: seed.accelerator ? ['GPU', '重点资源'] : ['通用计算'],
    lifecycleRequestState: 'none',
    health: {
      status: warning ? 'warning' : seed.status === 'preparing' ? 'checking' : 'normal',
      summary: warning ? '存在需要关注的检查项' : seed.status === 'preparing' ? '资源检查中' : '实例检查正常',
      items: [
        { name: '实例状态', status: seed.status === 'abnormal' ? 'warning' : 'normal', message: seed.status === 'abnormal' ? '运行状态异常' : '实例状态正常' },
        { name: '网络', status: 'normal', message: '网络连通性正常' },
        { name: '存储', status: index === 6 ? 'warning' : 'normal', message: index === 6 ? '磁盘使用率需要关注' : '磁盘状态正常' },
        { name: '监控', status: seed.status === 'preparing' ? 'checking' : 'normal', message: seed.status === 'preparing' ? '等待监控数据' : '指标采集正常' },
      ],
    },
    lastOperatedAt: '2026-07-23T09:15:00+08:00',
    connection: connection(seed.privateIp, seed.publicIp, seed.available ?? true),
    monitoring: monitoringMetrics(Boolean(seed.accelerator)),
    networkRules: networkRules(index),
    software: software(index),
    operationRecords: operationRecords(index),
    instanceSpec: price?.name ?? seed.skuId,
    vCpu: Number(seed.cpu.match(/\d+/)?.[0] ?? 8),
    imageId,
    image: seed.accelerator ? 'GPU 计算运行镜像' : '基础 Linux 运行镜像',
    operatingSystem: seed.accelerator ? 'Linux LTS 22.04' : 'Linux LTS 24.04',
    systemDiskGb: 30,
    dataDisks: resourceDisks,
    vpc: index % 2 === 0 ? '研发业务网络' : '生产业务网络',
    sshEnabled: true,
    billingMode,
    autoRenewal: { enabled: index === 1 || index === 8, periodMonths: index === 8 ? 12 : 3 },
    instanceInformation: seed.accelerator ? 'GPU 计算实例' : '通用计算实例',
    priceSnapshot,
  };
}

function createPhysicalResource(
  seed: ResourceSeed,
  index: number,
): PhysicalMachineResource {
  const price = getComputePrice(seed.skuId);
  const warning = seed.status === 'abnormal' || seed.expiryState === 'expired';
  const diskCount = seed.accelerator ? 4 : 6;
  const perDiskCapacityGb = seed.accelerator ? 3840 : 8000;
  const createdAt = `2026-0${(index % 6) + 1}-18T11:00:00+08:00`;
  return {
    ...seed,
    resourceType: 'physical-machine',
    computeType: seed.accelerator ? 'gpu' : 'cpu',
    ip: { privateIp: seed.privateIp, publicIp: seed.publicIp },
    createdAt,
    owner: '基础设施使用组',
    tags: seed.accelerator ? ['GPU 集群', '专属整机'] : ['通用整机'],
    lifecycleRequestState: 'none',
    health: {
      status: warning ? 'warning' : seed.status === 'preparing' ? 'checking' : 'normal',
      summary: warning ? '硬件检查存在告警' : seed.status === 'preparing' ? '交付检查中' : '硬件健康正常',
      items: [
        { name: 'CPU', status: 'normal', message: '处理器检查正常' },
        { name: '内存', status: 'normal', message: '内存检查正常' },
        { name: 'GPU', status: seed.status === 'abnormal' && seed.accelerator ? 'warning' : 'normal', message: seed.status === 'abnormal' && seed.accelerator ? '检测到加速卡告警' : '加速卡检查正常' },
        { name: '磁盘', status: index === 6 ? 'warning' : 'normal', message: index === 6 ? '一块磁盘需要关注' : '磁盘检查正常' },
        { name: '电源与温度', status: 'normal', message: '电源与温度正常' },
      ],
    },
    lastOperatedAt: '2026-07-23T09:15:00+08:00',
    connection: connection(seed.privateIp, seed.publicIp, seed.available ?? true),
    monitoring: monitoringMetrics(Boolean(seed.accelerator)),
    networkRules: networkRules(index + 20),
    software: software(index, true),
    operationRecords: operationRecords(index + 20),
    assetNumber: `ASSET-EAST-${String(index).padStart(4, '0')}`,
    machineModel: price?.name ?? (seed.accelerator ? '高密度加速计算服务器' : '通用双路计算服务器'),
    cpuModel: `${seed.cpu.match(/×\s*(\d+)/)?.[1] ?? 32} 核服务器处理器`,
    cpuSockets: 2,
    hostname: `compute-pm-${String(index).padStart(2, '0')}`,
    operatingSystem: 'Linux 服务器操作系统 2026.06',
    storageSummary: seed.accelerator
      ? '2 × 1.92 TB NVMe 系统存储，4 × 3.84 TB NVMe 数据存储'
      : '2 × 1.92 TB NVMe 系统存储，4 × 8 TB 企业级数据存储',
    room: index % 2 === 0 ? 'A2 机房' : 'B1 机房',
    rack: `R-${String(20 + index).padStart(2, '0')}`,
    rackUnit: `U${12 + index}`,
    managementNetwork: `10.24.${10 + index}.0/24`,
    businessNetwork: seed.publicIp ? '业务内网 / 公网接入' : '业务内网',
    localStorage: {
      diskCount,
      perDiskCapacityGb,
      totalCapacityGb: diskCount * perDiskCapacityGb,
      usedCapacityGb: Math.round(diskCount * perDiskCapacityGb * (index === 6 ? 0.88 : 0.42 + index * 0.025)),
      raidLevel: seed.accelerator ? 'RAID 10' : 'RAID 5',
      health: index === 6 ? 'warning' : 'normal',
      fileSystem: 'XFS',
      logicalVolume: 'vg-data/lv-workload',
      mountPoint: '/data/local',
    },
    bmcAccess: index % 3 === 0 ? 'not-provided' : index % 2 === 0 ? 'authorized' : 'restricted',
    deliveryStatus: seed.status === 'preparing' ? 'preparing' : 'delivered',
    extensionStatus: 'none',
    priceSnapshot: createPriceSnapshot(
      seed.skuId,
      calculatePhysicalPrice({
        skuId: seed.skuId,
        quantity: 1,
        durationMonths: 1,
      }),
      createdAt,
    ),
  };
}

export function createInitialResourceCatalog(): Resource[] {
  return [
    ...CLOUD_SEEDS.map(createCloudResource),
    ...PHYSICAL_SEEDS.map(createPhysicalResource),
  ];
}
