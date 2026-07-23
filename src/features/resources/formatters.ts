import type {
  ComputeType,
  ExpiryState,
  OperationStatus,
  Resource,
  ResourceStatus,
} from './types';

export const RESOURCE_STATUS_LABELS: Readonly<Record<ResourceStatus, string>> = {
  preparing: '准备中',
  running: '运行中',
  stopped: '已停止',
  operating: '操作中',
  abnormal: '异常',
  expired: '已到期',
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
  submitted: '已提交',
  processing: '处理中',
  completed: '已完成',
  failed: '失败',
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
