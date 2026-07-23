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
  status: StorageStatus;
  createdAt: string;
  updatedAt: string;
  mounts: readonly StorageMount[];
}>;

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
