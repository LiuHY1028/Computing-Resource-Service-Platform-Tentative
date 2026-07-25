export type NetworkRuleStatus = 'enabled' | 'disabled';
export type NetworkSourceType = 'current-ip' | 'ip' | 'cidr' | 'all';

export type NetworkAccessRule = Readonly<{
  id: string;
  resourceId: string;
  ruleName: string;
  protocol: 'TCP' | 'UDP';
  port: number;
  sourceType: NetworkSourceType;
  sourceValue: string;
  description: string;
  status: NetworkRuleStatus;
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
  ruleName: string;
  protocol: 'TCP' | 'UDP';
  port: number;
  sourceType: NetworkSourceType;
  sourceValue: string;
  description: string;
}>;
