import type { PriceSnapshot } from '../pricing';

export type StorageType = 'cloud-disk' | 'shared';
export type StoragePerformanceTier = 'standard' | 'performance';
export type StorageStatus =
  | 'creating'
  | 'available'
  | 'attaching'
  | 'attached'
  | 'detaching'
  | 'expanding'
  | 'renewing'
  | 'expiring'
  | 'expired'
  | 'releasing'
  | 'abnormal';
export type MountStatus = 'effective' | 'processing' | 'removing';

export type StorageMount = Readonly<{
  id: string;
  resourceId: string;
  resourceName: string;
  resourceType: 'cloud-server' | 'physical-machine';
  mountPath: string;
  deviceName?: string;
  readOnly: boolean;
  status: MountStatus;
}>;

export type StorageSpace = Readonly<{
  id: string;
  skuId: string;
  name: string;
  type: StorageType;
  performanceTier: StoragePerformanceTier;
  site: string;
  capacityGb: number;
  usedGb: number;
  systemReservedGb: number;
  status: StorageStatus;
  billingMode: 'subscription';
  expiresAt: string;
  autoRenew: boolean;
  fileSystem: 'ext4' | 'xfs' | 'NFS' | 'SMB' | 'uninitialized';
  protocol?: 'NFS' | 'SMB';
  mountPath: string;
  initialized: boolean;
  diskType?: 'standard' | 'performance';
  deviceName?: string;
  iops: number;
  throughputMbs: number;
  fileCount: number;
  directoryCount: number;
  createdAt: string;
  updatedAt: string;
  lastOperatedAt: string;
  mounts: readonly StorageMount[];
  priceSnapshot: PriceSnapshot;
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

export function canManageStorageFiles(
  space: Pick<StorageSpace, 'type' | 'status' | 'mounts' | 'initialized'>,
) {
  if (space.status !== 'available' && space.status !== 'attached') return false;
  return space.type === 'shared' || (space.initialized && space.mounts.length > 0);
}

export type StorageQuery = Readonly<{
  search?: string;
  type?: 'all' | StorageType;
  status?: 'all' | StorageStatus;
  usage?: 'all' | 'low' | 'medium' | 'high';
  mounted?: 'all' | 'yes' | 'no';
}>;

export type PurchaseStorageInput = Readonly<{
  name: string;
  type: StorageType;
  skuId: string;
  performanceTier: StoragePerformanceTier;
  site: string;
  capacityGb: number;
  quantity: number;
  durationMonths: 1 | 3 | 6 | 12;
  autoRenew: boolean;
  protocol?: 'NFS' | 'SMB';
  mountPlan:
    | Readonly<{ mode: 'later' }>
    | Readonly<{
        mode: 'cloud-disks';
        units: readonly Readonly<{
          unitIndex: number;
          mount: Omit<StorageMount, 'id' | 'resourceName' | 'status'>;
        }>[];
      }>
    | Readonly<{
        mode: 'shared';
        targets: readonly Omit<StorageMount, 'id' | 'resourceName' | 'status'>[];
      }>;
}>;
