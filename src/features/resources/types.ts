export type ResourceType = 'cloud-server' | 'physical-machine';
export type ResourceStatus = 'preparing' | 'running' | 'stopped' | 'operating' | 'abnormal' | 'expired';
export type ComputeType = 'cpu' | 'gpu';
export type ExpiryState = 'active' | 'expiring' | 'expired';
export type HealthStatus = 'normal' | 'warning' | 'checking';
export type BillingMode = 'subscription' | 'pay-as-you-go';
export type ResourceAction = 'start' | 'stop' | 'restart' | 'rename' | 'release';
export type OperationStatus = 'submitted' | 'processing' | 'completed' | 'failed';
export type MonitoringRange = '1h' | '24h';
export type LifecycleRequestState = 'none' | 'renewal-processing' | 'extension-processing' | 'release-processing';

export interface Accelerator {
  readonly model: string;
  readonly count: number;
  readonly memoryGb: number;
}

export interface ResourceIpInformation {
  readonly privateIp: string;
  readonly publicIp?: string;
  readonly managementIp?: string;
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
  readonly id: 'cpu' | 'memory' | 'gpu' | 'gpu-memory' | 'disk' | 'network';
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

export interface HealthCheck {
  readonly status: HealthStatus;
  readonly summary: string;
  readonly items: readonly Readonly<{
    name: string;
    status: 'normal' | 'warning' | 'checking';
    message: string;
  }>[];
}

interface ResourceBase {
  readonly id: string;
  readonly name: string;
  readonly resourceType: ResourceType;
  readonly site: string;
  readonly status: ResourceStatus;
  readonly health: HealthCheck;
  readonly computeType: ComputeType;
  readonly cpu: string;
  readonly memoryGb: number;
  readonly accelerator?: Accelerator;
  readonly ip: ResourceIpInformation;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly expiryState: ExpiryState;
  readonly lifecycleRequestState: LifecycleRequestState;
  readonly pendingExpiresAt?: string;
  readonly project: string;
  readonly tags: readonly string[];
  readonly purpose: string;
  readonly owner: string;
  readonly lastOperatedAt: string;
  readonly connection: ConnectionInformation;
  readonly monitoring: readonly MonitoringMetric[];
  readonly networkRules: readonly PortRule[];
  readonly software: readonly InstalledSoftware[];
  readonly operationRecords: readonly OperationRecord[];
}

export interface DiskPerformance {
  readonly readThroughputMbs: number;
  readonly writeThroughputMbs: number;
  readonly readIops: number;
  readonly writeIops: number;
  readonly averageLatencyMs: number;
}

export interface CloudDataDisk {
  readonly id: string;
  readonly name: string;
  readonly role: 'system' | 'data';
  readonly displayType: '系统盘' | '本地数据存储' | '高性能共享存储';
  readonly diskType: '高性能云盘' | '共享存储';
  readonly mountPath: string;
  readonly deviceName: string;
  readonly fileSystem: string;
  readonly capacityGb: number;
  readonly usedGb: number;
  readonly readOnly: boolean;
  readonly status: 'in-use' | 'available' | 'warning';
  readonly releaseWithInstance: boolean;
  readonly expiresAt: string;
  readonly performance: DiskPerformance;
  readonly storageId?: string;
}

export interface CloudServerResource extends ResourceBase {
  readonly resourceType: 'cloud-server';
  readonly instanceSpec: string;
  readonly vCpu: number;
  readonly imageId: string;
  readonly image: string;
  readonly operatingSystem: string;
  readonly systemDiskGb: 30;
  readonly dataDisks: readonly CloudDataDisk[];
  readonly vpc: string;
  readonly sshEnabled: boolean;
  readonly billingMode: BillingMode;
  readonly autoRenewal: Readonly<{ enabled: boolean; periodMonths: 1 | 3 | 6 | 12 }>;
  readonly instanceInformation: string;
}

export interface PhysicalLocalStorage {
  readonly diskCount: number;
  readonly perDiskCapacityGb: number;
  readonly totalCapacityGb: number;
  readonly usedCapacityGb: number;
  readonly raidLevel: string;
  readonly health: 'normal' | 'warning';
  readonly fileSystem: string;
  readonly logicalVolume: string;
  readonly mountPoint: string;
}

export interface PhysicalMachineResource extends ResourceBase {
  readonly resourceType: 'physical-machine';
  readonly assetNumber: string;
  readonly machineModel: string;
  readonly cpuModel: string;
  readonly cpuSockets: number;
  readonly hostname: string;
  readonly operatingSystem: string;
  readonly room: string;
  readonly rack: string;
  readonly rackUnit: string;
  readonly managementNetwork: string;
  readonly businessNetwork: string;
  readonly storageSummary: string;
  readonly localStorage: PhysicalLocalStorage;
  readonly bmcAccess: 'authorized' | 'restricted' | 'not-provided';
  readonly deliveryStatus: 'preparing' | 'delivered' | 'releasing';
  readonly extensionStatus: 'none' | 'pending';
}

export type Resource = CloudServerResource | PhysicalMachineResource;
export type ResourceStatusFilter = 'all' | ResourceStatus;
export type ComputeTypeFilter = 'all' | ComputeType;
export type ExpiryStateFilter = 'all' | ExpiryState;
export type HealthStatusFilter = 'all' | HealthStatus;
export type BillingModeFilter = 'all' | BillingMode;

export interface ResourceQuery {
  readonly resourceType: ResourceType;
  readonly search: string;
  readonly site: string;
  readonly room?: string;
  readonly status: ResourceStatusFilter;
  readonly healthStatus?: HealthStatusFilter;
  readonly computeType: ComputeTypeFilter;
  readonly acceleratorModel: string;
  readonly expiryState: ExpiryStateFilter;
  readonly billingMode?: BillingModeFilter;
  readonly scope: string;
  readonly tag?: string;
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
  readonly rooms: readonly string[];
  readonly statuses: readonly ResourceStatus[];
  readonly healthStatuses: readonly HealthStatus[];
  readonly acceleratorModels: readonly string[];
  readonly scopes: readonly string[];
  readonly tags: readonly string[];
  readonly images: readonly string[];
  readonly operatingSystems: readonly string[];
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

export interface RenewalRequest {
  readonly resourceIds: readonly string[];
  readonly periodMonths: 1 | 3 | 6 | 12;
  readonly renewStorage: boolean;
  readonly renewNetwork: boolean;
}

export interface ExtensionRequest {
  readonly resourceIds: readonly string[];
  readonly periodMonths: 1 | 3 | 6 | 12;
  readonly reason: string;
}
