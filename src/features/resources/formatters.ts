import type {
  ComputeType,
  ExpiryState,
  OperationStatus,
  Resource,
  ResourceStatus,
} from './types';

export const RESOURCE_STATUS_LABELS: Readonly<Record<ResourceStatus, string>> = {
  creating: '创建中',
  preparing: '准备中',
  running: '运行中',
  stopped: '已停止',
  'powered-off': '已关机',
  restarting: '重启中',
  maintenance: '维护中',
  expiring: '即将到期',
  abnormal: '异常',
  expired: '已到期',
  releasing: '释放中',
  released: '已释放',
};

export const COMPUTE_TYPE_LABELS: Readonly<Record<ComputeType, string>> = {
  cpu: 'CPU 计算',
  gpu: 'GPU 计算',
};

export const EXPIRY_STATE_LABELS: Readonly<Record<ExpiryState, string>> = {
  active: '有效期正常',
  expiring: '即将到期',
  expired: '已到期',
};

export const OPERATION_STATUS_LABELS: Readonly<Record<OperationStatus, string>> = {
  waiting: '等待执行',
  executing: '执行中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
};

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

export function formatAccelerator(resource: Resource) {
  return resource.accelerator
    ? `${resource.accelerator.model} × ${resource.accelerator.count}`
    : '无 GPU';
}

export function formatSpecification(resource: Resource) {
  return `${resource.cpu} / ${resource.memoryGb} GB / ${formatAccelerator(resource)}`;
}

export function formatIp(resource: Resource) {
  return resource.ip.publicIp
    ? `${resource.ip.privateIp} / ${resource.ip.publicIp}`
    : `${resource.ip.privateIp} / 公网 IP 未分配`;
}
