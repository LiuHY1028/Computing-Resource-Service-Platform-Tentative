import type { OperationStatus } from './types';

export const OPERATION_STATUS_VIEWS: Readonly<
  Record<
    OperationStatus,
    Readonly<{
      label: string;
      tone: 'neutral' | 'info' | 'success' | 'warning' | 'error';
    }>
  >
> = {
  waiting: { label: '等待执行', tone: 'neutral' },
  executing: { label: '执行中', tone: 'info' },
  completed: { label: '已完成', tone: 'success' },
  failed: { label: '失败', tone: 'error' },
  cancelled: { label: '已取消', tone: 'neutral' },
};
