import { recordOperation } from '../../operations';
import { resourceDetailPath } from '../../../app/routes';
import {
  readVersionedState,
  removeVersionedState,
  writeVersionedState,
} from '../../platform/persistence';
import type { Resource } from '../../resources';
import { getResourceByAnyId } from '../../resources/state/resourceStore';
import type {
  SoftwareInstallation,
  SoftwareProduct,
  SoftwareQuery,
} from '../types';

const STORAGE_KEY = 'computing-platform:software-installations';
const VERSION = 1;

const SOFTWARE_CATALOG: readonly SoftwareProduct[] = [
  {
    id: 'software-monitoring-agent',
    name: '资源监控组件',
    category: '运维工具',
    versions: ['2.6.1', '2.5.4'],
    publisher: '平台软件服务',
    environmentRequirement: 'Linux 系统，支持 CPU 与 GPU 资源',
    compatibleOperatingSystems: ['Linux'],
    compatibleComputeTypes: ['cpu', 'gpu'],
    description: '采集资源运行指标并提供基础诊断信息。',
  },
  {
    id: 'software-container-runtime',
    name: '容器运行环境',
    category: '运行环境',
    versions: ['1.29.2', '1.28.8'],
    publisher: '平台软件服务',
    environmentRequirement: 'Linux 系统，x86_64 架构',
    compatibleOperatingSystems: ['Linux'],
    compatibleComputeTypes: ['cpu', 'gpu'],
    description: '用于运行通用容器化工作负载的基础环境。',
  },
  {
    id: 'software-gpu-toolkit',
    name: '加速计算工具集',
    category: '开发工具',
    versions: ['12.4', '12.2'],
    publisher: '平台软件服务',
    environmentRequirement: 'Linux 系统与 GPU 计算资源',
    compatibleOperatingSystems: ['Linux'],
    compatibleComputeTypes: ['gpu'],
    description: '面向加速计算开发和诊断的工具集合。',
  },
  {
    id: 'software-hardware-agent',
    name: '硬件管理组件',
    category: '运维工具',
    versions: ['1.8.0'],
    publisher: '平台软件服务',
    environmentRequirement: 'Linux 物理机',
    compatibleOperatingSystems: ['Linux'],
    compatibleComputeTypes: ['cpu', 'gpu'],
    description: '提供物理机硬件状态读取和基础诊断能力。',
  },
];

const INITIAL_INSTALLATIONS: readonly SoftwareInstallation[] = [
  {
    id: 'installation-monitor-cs-east-001',
    softwareId: 'software-monitoring-agent',
    softwareName: '资源监控组件',
    version: '2.6.1',
    resourceId: 'cs-east-001',
    resourceName: '研发计算节点-01',
    status: 'installed',
    submittedAt: '2026-07-10T01:30:00.000Z',
  },
  {
    id: 'installation-runtime-cs-east-001',
    softwareId: 'software-container-runtime',
    softwareName: '容器运行环境',
    version: '1.29.2',
    resourceId: 'cs-east-001',
    resourceName: '研发计算节点-01',
    status: 'installed',
    submittedAt: '2026-07-12T06:20:00.000Z',
  },
  {
    id: 'installation-hardware-pm-east-001',
    softwareId: 'software-hardware-agent',
    softwareName: '硬件管理组件',
    version: '1.8.0',
    resourceId: 'pm-east-001',
    resourceName: '研发物理节点-01',
    status: 'installed',
    submittedAt: '2026-07-12T06:20:00.000Z',
  },
];

function isInstallation(value: unknown): value is SoftwareInstallation {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<SoftwareInstallation>;
  return (
    typeof item.id === 'string' &&
    typeof item.softwareId === 'string' &&
    typeof item.resourceId === 'string' &&
    typeof item.status === 'string'
  );
}

function readInstallations() {
  return readVersionedState(
    STORAGE_KEY,
    VERSION,
    (value): value is SoftwareInstallation[] =>
      Array.isArray(value) && value.every(isInstallation),
    () => structuredClone(INITIAL_INSTALLATIONS) as SoftwareInstallation[],
  );
}

function writeInstallations(items: readonly SoftwareInstallation[]) {
  writeVersionedState(STORAGE_KEY, VERSION, items);
}

export function querySoftware(query: SoftwareQuery = {}) {
  const search = query.search?.trim().toLocaleLowerCase() ?? '';
  return SOFTWARE_CATALOG.filter((software) => {
    if (search && ![software.name, software.category, software.description, software.publisher].join(' ').toLocaleLowerCase().includes(search)) return false;
    if (query.category && query.category !== 'all' && software.category !== query.category) return false;
    if (query.operatingSystem && query.operatingSystem !== 'all' && !software.compatibleOperatingSystems.includes(query.operatingSystem)) return false;
    if (query.computeType && query.computeType !== 'all' && !software.compatibleComputeTypes.includes(query.computeType)) return false;
    return true;
  });
}

export function getSoftwareById(softwareId: string) {
  return SOFTWARE_CATALOG.find((software) => software.id === softwareId);
}

export function getSoftwareInstallations() {
  return readInstallations().map((item) => {
    const resource = getResourceByAnyId(item.resourceId);
    return resource ? { ...item, resourceName: resource.name, project: resource.project, tags: resource.tags } : item;
  }).sort((left, right) =>
    right.submittedAt.localeCompare(left.submittedAt),
  );
}

export function getSoftwareForResource(resourceId: string) {
  return getSoftwareInstallations().filter((item) => item.resourceId === resourceId);
}

export function getSoftwareInstallCount(softwareId: string) {
  return readInstallations().filter(
    (item) => item.softwareId === softwareId && item.status === 'installed',
  ).length;
}

function resourceOperatingSystem(resource: Resource) {
  return resource.resourceType === 'physical-machine'
    ? resource.operatingSystem
    : 'Linux';
}

export function getSoftwareCompatibility(
  software: SoftwareProduct,
  resource: Resource,
) {
  const operatingSystem = resourceOperatingSystem(resource);
  if (
    !software.compatibleOperatingSystems.some((item) =>
      operatingSystem.toLocaleLowerCase().includes(item.toLocaleLowerCase()),
    )
  ) {
    return { compatible: false, reason: '目标资源的操作系统不满足软件要求。' };
  }
  if (!software.compatibleComputeTypes.includes(resource.computeType)) {
    return { compatible: false, reason: '目标资源的计算类型不满足软件要求。' };
  }
  if (resource.status !== 'running' && resource.status !== 'stopped') {
    return { compatible: false, reason: '目标资源当前状态不能提交安装任务。' };
  }
  return { compatible: true };
}

export async function submitSoftwareInstallation(input: Readonly<{
  softwareId: string;
  version: string;
  resource: Resource;
}>) {
  const software = getSoftwareById(input.softwareId);
  if (!software) throw new Error('未找到软件。');
  if (!software.versions.includes(input.version)) throw new Error('请选择有效版本。');
  const compatibility = getSoftwareCompatibility(software, input.resource);
  if (!compatibility.compatible) throw new Error(compatibility.reason);
  if (
    readInstallations().some(
      (item) =>
        item.softwareId === software.id &&
        item.resourceId === input.resource.id &&
        item.status !== 'failed',
    )
  ) throw new Error('该资源已有相同软件或安装任务。');

  const submittedAt = new Date().toISOString();
  const task: SoftwareInstallation = {
    id: `installation-${submittedAt.replace(/\D/g, '').slice(0, 14)}`,
    softwareId: software.id,
    softwareName: software.name,
    version: input.version,
    resourceId: input.resource.id,
    resourceName: input.resource.name,
    status: 'processing',
    submittedAt,
  };
  writeInstallations([task, ...readInstallations()]);
  recordOperation({
    module: 'software',
    action: '安装软件',
    targetId: input.resource.id,
    targetName: input.resource.name,
    status: 'processing',
    message: `${software.name} ${input.version} 安装任务已提交。`,
    targetPath: `${resourceDetailPath(input.resource.resourceType, input.resource.id)}?tab=software`,
  });
  return task;
}

export function resetSoftwareStore() {
  removeVersionedState(STORAGE_KEY);
}
