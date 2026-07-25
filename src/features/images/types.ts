export type ImageType = 'public' | 'custom';
export type ImageStatus = 'creating' | 'importing' | 'available' | 'failed';
export type ImageComputeType = 'cpu' | 'gpu';

export type PlatformImage = Readonly<{
  id: string;
  name: string;
  type: ImageType;
  category: string;
  operatingSystem: string;
  version: string;
  architecture: 'x86_64' | 'arm64';
  environmentSummary: string;
  compatibleComputeTypes: readonly ImageComputeType[];
  sizeGb: number;
  description: string;
  status: ImageStatus;
  createdAt: string;
  updatedAt: string;
  source:
    | Readonly<{ kind: 'public' }>
    | Readonly<{
        kind: 'resource';
        resourceId: string;
        systemDiskId: string;
        includeSystemConfiguration: boolean;
      }>
    | Readonly<{
        kind: 'file';
        fileName: string;
        fileSize: number;
        bootMode: 'BIOS' | 'UEFI';
      }>;
  failureReason?: string;
}>;

export type ImageQuery = Readonly<{
  search?: string;
  type?: 'all' | ImageType;
  operatingSystem?: string;
  architecture?: 'all' | 'x86_64' | 'arm64';
  computeType?: 'all' | ImageComputeType;
  status?: 'all' | ImageStatus;
}>;
