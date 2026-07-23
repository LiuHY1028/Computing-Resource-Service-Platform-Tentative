export type StorageType = 'local' | 'shared';
export type StorageStatus = 'available' | 'processing' | 'error';
export type MountStatus = 'effective' | 'processing' | 'removing';

export type StorageMount = Readonly<{
  id: string;
  resourceId: string;
  resourceName: string;
  resourceType: 'cloud-server' | 'physical-machine';
  mountPath: string;
  readOnly: boolean;
  status: MountStatus;
}>;

export type StorageSpace = Readonly<{
  id: string;
  name: string;
  type: StorageType;
  site: string;
  technology: 'HostPath' | 'NFS';
  capacityGb: number;
  usedGb: number;
  protocol: 'NFS' | 'HostPath';
  mountPath: string;
  readWriteStatus: 'read-write' | 'read-only';
  expiresAt: string;
  performance: Readonly<{
    readThroughputMbs: number;
    writeThroughputMbs: number;
    readIops: number;
    writeIops: number;
    averageLatencyMs: number;
  }>;
  status: StorageStatus;
  createdAt: string;
  updatedAt: string;
  mounts: readonly StorageMount[];
}>;

export function storageAvailableGb(space: Pick<StorageSpace, 'capacityGb' | 'usedGb'>) {
  return Math.max(0, space.capacityGb - space.usedGb);
}

export function storageUsagePercent(space: Pick<StorageSpace, 'capacityGb' | 'usedGb'>) {
  return space.capacityGb > 0 ? Math.round((space.usedGb / space.capacityGb) * 100) : 0;
}

export function storageCapacityState(space: Pick<StorageSpace, 'capacityGb' | 'usedGb'>) {
  const usage = storageUsagePercent(space);
  return usage >= 90 ? 'critical' as const : usage >= 75 ? 'high' as const : 'normal' as const;
}

export type StorageQuery = Readonly<{
  search?: string;
  type?: 'all' | StorageType;
  status?: 'all' | StorageStatus;
  usage?: 'all' | 'low' | 'medium' | 'high';
  mounted?: 'all' | 'yes' | 'no';
}>;

export type CreateStorageInput = Readonly<{
  name: string;
  type: StorageType;
  site: string;
  capacityGb: number;
}>;
