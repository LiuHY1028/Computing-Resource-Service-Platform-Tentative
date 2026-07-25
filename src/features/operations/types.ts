export type OperationModule =
  | 'resource'
  | 'storage'
  | 'image'
  | 'software'
  | 'network'
  | 'order'
  | 'bill';

export type OperationStatus =
  | 'waiting'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type PlatformOperationRecord = Readonly<{
  id: string;
  module: OperationModule;
  action: string;
  targetId: string;
  targetName: string;
  actor: '当前用户';
  createdAt: string;
  status: OperationStatus;
  message: string;
  targetPath?: string;
  relatedOrderId?: string;
  relatedBillId?: string;
  correlationId?: string;
}>;

export type CreateOperationInput = Omit<
  PlatformOperationRecord,
  'id' | 'actor' | 'createdAt'
> &
  Readonly<{ createdAt?: string }>;
