export type OperationModule =
  | 'resource'
  | 'storage'
  | 'image'
  | 'software'
  | 'network'
  | 'order';

export type OperationStatus =
  | 'submitted'
  | 'processing'
  | 'completed'
  | 'failed';

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
}>;

export type CreateOperationInput = Omit<
  PlatformOperationRecord,
  'id' | 'actor' | 'createdAt'
> &
  Readonly<{ createdAt?: string }>;
