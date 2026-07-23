export type SoftwareComputeType = 'cpu' | 'gpu';
export type InstallationStatus =
  | 'submitted'
  | 'processing'
  | 'installed'
  | 'failed';

export type SoftwareProduct = Readonly<{
  id: string;
  name: string;
  category: string;
  versions: readonly string[];
  publisher: string;
  environmentRequirement: string;
  compatibleOperatingSystems: readonly string[];
  compatibleComputeTypes: readonly SoftwareComputeType[];
  description: string;
}>;

export type SoftwareInstallation = Readonly<{
  id: string;
  softwareId: string;
  softwareName: string;
  version: string;
  resourceId: string;
  resourceName: string;
  project?: string;
  tags?: readonly string[];
  status: InstallationStatus;
  submittedAt: string;
}>;

export type SoftwareQuery = Readonly<{
  search?: string;
  category?: string;
  operatingSystem?: string;
  computeType?: 'all' | SoftwareComputeType;
}>;
