import type { ApplicationType, OrderStatus } from './types';

export const APPLICATION_TYPE_LABELS: Readonly<Record<ApplicationType, string>> = {
  'new-purchase': '新购资源',
  'cloud-renewal': '云服务器续费',
  'auto-renewal': '自动续费设置',
  'physical-extension': '物理机延期',
  'configuration-change': '变更配置',
  'storage-expansion': '存储扩容',
  'os-reinstall': '重装系统',
  'resource-release': '资源释放',
};

export const ORDER_STATUS_VIEWS: Readonly<Record<OrderStatus, {
  label: string;
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'error';
}>> = {
  pending: { label: '待处理', tone: 'neutral' },
  preparing: { label: '资源准备中', tone: 'info' },
  delivered: { label: '已交付', tone: 'success' },
  cancelled: { label: '已取消', tone: 'warning' },
  failed: { label: '处理失败', tone: 'error' },
};
