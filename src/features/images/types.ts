export type ImageType = 'public' | 'platform' | 'custom';
export type ImageStatus = 'available' | 'submitted' | 'processing' | 'failed';
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
  resourceIds: readonly string[];
  sourceFile?: Readonly<{ name: string; size: number }>;
}>;

export type ImageQuery = Readonly<{
  search?: string;
  type?: 'all' | ImageType;
  operatingSystem?: string;
  computeType?: 'all' | ImageComputeType;
  status?: 'all' | ImageStatus;
}>;
