export type NetworkRuleStatus =
  | 'effective'
  | 'submitted'
  | 'processing'
  | 'failed';
export type NetworkRuleChange = 'none' | 'create' | 'update' | 'delete';

export type NetworkAccessRule = Readonly<{
  id: string;
  resourceId: string;
  resourceName: string;
  resourceType: 'cloud-server' | 'physical-machine';
  site: string;
  privateIp: string;
  publicIp?: string;
  sshAvailable: boolean;
  protocol: 'TCP' | 'UDP';
  servicePort: number;
  mappedPort: number;
  source: string;
  description: string;
  status: NetworkRuleStatus;
  change: NetworkRuleChange;
  updatedAt: string;
}>;

export type NetworkQuery = Readonly<{
  search?: string;
  resourceType?: 'all' | 'cloud-server' | 'physical-machine';
  site?: string;
  protocol?: 'all' | 'TCP' | 'UDP';
  status?: 'all' | NetworkRuleStatus;
}>;

export type NetworkRuleInput = Readonly<{
  resourceId: string;
  resourceName: string;
  resourceType: 'cloud-server' | 'physical-machine';
  site: string;
  privateIp: string;
  publicIp?: string;
  sshAvailable: boolean;
  protocol: 'TCP' | 'UDP';
  servicePort: number;
  mappedPort: number;
  source: string;
  description: string;
}>;
