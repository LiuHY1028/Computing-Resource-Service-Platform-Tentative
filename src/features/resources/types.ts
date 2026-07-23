export type ResourceType = 'cloud-server' | 'physical-machine';

export type ResourceStatus =
  | 'preparing'
  | 'running'
  | 'stopped'
  | 'operating'
  | 'abnormal'
  | 'expired';

export type ComputeType = 'cpu' | 'gpu';
export type ExpiryState = 'active' | 'expiring' | 'expired';
export type ResourceAction = 'start' | 'stop' | 'restart' | 'rename' | 'release';
export type OperationStatus = 'submitted' | 'processing' | 'completed' | 'failed';
export type MonitoringRange = '1h' | '24h';

export interface Accelerator {
  readonly model: string;
  readonly count: number;
  readonly memoryGb: number;
}

export interface ResourceIpInformation {
  readonly privateIp: string;
  readonly publicIp?: string;
}

export interface ConnectionInformation {
  readonly available: boolean;
  readonly privateIp?: string;
  readonly publicIp?: string;
  readonly sshUser?: string;
  readonly sshPort?: number;
  readonly authenticationMethod?: string;
  readonly subnet?: string;
  readonly gateway?: string;
  readonly notes: string;
}

export interface PortRule {
  readonly id: string;
  readonly name: string;
  readonly protocol: 'TCP' | 'UDP';
  readonly servicePort: number;
  readonly mappedPort: number;
  readonly source: string;
  readonly status: 'enabled' | 'disabled';
}

export interface InstalledSoftware {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly status: 'available' | 'updating' | 'attention';
  readonly installedAt: string;
}

export interface MonitoringMetric {
  readonly id:
    | 'cpu'
    | 'memory'
    | 'gpu'
    | 'gpu-memory'
    | 'disk'
    | 'network';
  readonly label: string;
  readonly unit: '%' | 'MB/s';
  readonly current: number;
  readonly values1h: readonly number[];
  readonly values24h: readonly number[];
}

export interface OperationRecord {
  readonly id: string;
  readonly action: string;
  readonly actor: string;
  readonly createdAt: string;
  readonly status: OperationStatus;
  readonly message: string;
}

interface ResourceBase {
  readonly id: string;
  readonly name: string;
  readonly resourceType: ResourceType;
  readonly site: string;
  readonly status: ResourceStatus;
  readonly computeType: ComputeType;
  readonly cpu: string;
  readonly memoryGb: number;
  readonly accelerator?: Accelerator;
  readonly ip: ResourceIpInformation;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly expiryState: ExpiryState;
  readonly project: string;
  readonly purpose: string;
  readonly owner: string;
  readonly lastOperatedAt: string;
  readonly connection: ConnectionInformation;
  readonly monitoring: readonly MonitoringMetric[];
  readonly networkRules: readonly PortRule[];
  readonly software: readonly InstalledSoftware[];
  readonly operationRecords: readonly OperationRecord[];
}

export interface CloudDataDisk {
  readonly id: string;
  readonly name: string;
  readonly displayType: '本地数据存储' | '高性能共享存储';
  readonly mountPath: string;
  readonly capacityGb: number;
  readonly readOnly: boolean;
}

export interface CloudServerResource extends ResourceBase {
  readonly resourceType: 'cloud-server';
  readonly image: string;
  readonly systemDiskGb: 30;
  readonly dataDisks: readonly CloudDataDisk[];
  readonly instanceInformation: string;
}

export interface PhysicalMachineResource extends ResourceBase {
  readonly resourceType: 'physical-machine';
  readonly machineModel: string;
  readonly hostname: string;
  readonly operatingSystem: string;
  readonly storageSummary: string;
  readonly bmcAccess: 'restricted' | 'not-provided';
}

export type Resource = CloudServerResource | PhysicalMachineResource;

export type ResourceStatusFilter = 'all' | ResourceStatus;
export type ComputeTypeFilter = 'all' | ComputeType;
export type ExpiryStateFilter = 'all' | ExpiryState;

export interface ResourceQuery {
  readonly resourceType: ResourceType;
  readonly search: string;
  readonly site: string;
  readonly status: ResourceStatusFilter;
  readonly computeType: ComputeTypeFilter;
  readonly acceleratorModel: string;
  readonly expiryState: ExpiryStateFilter;
  readonly scope: string;
  readonly image: string;
  readonly operatingSystem: string;
}

export interface ResourceQueryResult {
  readonly items: readonly Resource[];
  readonly total: number;
  readonly catalogTotal: number;
}

export interface ResourceFilterOptions {
  readonly sites: readonly string[];
  readonly statuses: readonly ResourceStatus[];
  readonly acceleratorModels: readonly string[];
  readonly scopes: readonly string[];
  readonly images: readonly string[];
  readonly operatingSystems: readonly string[];
}

export interface ResourceRepositoryOptions {
  readonly delayMs?: number;
  readonly simulateError?: boolean;
  readonly simulateEmpty?: boolean;
  readonly signal?: AbortSignal;
}

export interface ResourceActionRequest {
  readonly resourceType: ResourceType;
  readonly resourceId: string;
  readonly action: ResourceAction;
  readonly nextName?: string;
}

export interface ResourceActionResult {
  readonly resource: Resource;
  readonly record: OperationRecord;
}

export interface ResourceActionAvailability {
  readonly enabled: boolean;
  readonly reason?: string;
}
