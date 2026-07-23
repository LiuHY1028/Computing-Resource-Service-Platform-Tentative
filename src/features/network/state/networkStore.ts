import { recordOperation } from '../../operations';
import {
  isValidIpOrCidr,
  isValidPort,
} from '../../purchase/validation/purchaseValidation';
import {
  readVersionedState,
  removeVersionedState,
  writeVersionedState,
} from '../../platform/persistence';
import type {
  NetworkAccessRule,
  NetworkQuery,
  NetworkRuleInput,
} from '../types';
import { getResourceByAnyId } from '../../resources/state/resourceStore';

const STORAGE_KEY = 'computing-platform:network';
const VERSION = 1;

const INITIAL_RULES: readonly NetworkAccessRule[] = [
  {
    id: 'network-rule-cs-east-001-ssh',
    resourceId: 'cs-east-001',
    resourceName: '研发计算节点-01',
    resourceType: 'cloud-server',
    site: '东部算力中心',
    privateIp: '10.24.1.21',
    publicIp: '198.51.100.21',
    sshAvailable: true,
    protocol: 'TCP',
    servicePort: 22,
    mappedPort: 22,
    source: '10.0.0.0/8',
    description: 'SSH 访问',
    status: 'effective',
    change: 'none',
    updatedAt: '2026-07-20T03:30:00.000Z',
  },
  {
    id: 'network-rule-cs-east-001-service',
    resourceId: 'cs-east-001',
    resourceName: '研发计算节点-01',
    resourceType: 'cloud-server',
    site: '东部算力中心',
    privateIp: '10.24.1.21',
    publicIp: '198.51.100.21',
    sshAvailable: true,
    protocol: 'TCP',
    servicePort: 8080,
    mappedPort: 18081,
    source: '192.0.2.0/24',
    description: '应用服务',
    status: 'effective',
    change: 'none',
    updatedAt: '2026-07-21T03:30:00.000Z',
  },
  {
    id: 'network-rule-pm-east-001-ssh',
    resourceId: 'pm-east-001',
    resourceName: '研发物理节点-01',
    resourceType: 'physical-machine',
    site: '东部算力中心',
    privateIp: '10.24.11.31',
    publicIp: '198.51.100.31',
    sshAvailable: true,
    protocol: 'TCP',
    servicePort: 22,
    mappedPort: 22,
    source: '10.0.0.0/8',
    description: 'SSH 访问',
    status: 'effective',
    change: 'none',
    updatedAt: '2026-07-18T03:30:00.000Z',
  },
];

function isRule(value: unknown): value is NetworkAccessRule {
  if (!value || typeof value !== 'object') return false;
  const rule = value as Partial<NetworkAccessRule>;
  return (
    typeof rule.id === 'string' &&
    typeof rule.resourceId === 'string' &&
    (rule.protocol === 'TCP' || rule.protocol === 'UDP') &&
    typeof rule.servicePort === 'number' &&
    typeof rule.mappedPort === 'number' &&
    typeof rule.source === 'string' &&
    typeof rule.status === 'string'
  );
}

function readRules() {
  return readVersionedState(
    STORAGE_KEY,
    VERSION,
    (value): value is NetworkAccessRule[] =>
      Array.isArray(value) && value.every(isRule),
    () => structuredClone(INITIAL_RULES) as NetworkAccessRule[],
  );
}

function writeRules(rules: readonly NetworkAccessRule[]) {
  writeVersionedState(STORAGE_KEY, VERSION, rules);
}

function validateInput(input: NetworkRuleInput, editingId?: string) {
  if (!isValidPort(input.servicePort) || !isValidPort(input.mappedPort)) {
    throw new Error('服务端口和映射端口必须是 1 至 65535 的整数。');
  }
  if (!isValidIpOrCidr(input.source)) {
    throw new Error('请输入有效的 IPv4 地址或 CIDR。');
  }
  if (
    readRules().some(
      (rule) =>
        rule.id !== editingId &&
        rule.resourceId === input.resourceId &&
        rule.protocol === input.protocol &&
        (rule.servicePort === input.servicePort ||
          rule.mappedPort === input.mappedPort) &&
        rule.change !== 'delete',
    )
  ) {
    throw new Error('同一资源和协议下存在明显重复的端口规则。');
  }
}

export function queryNetworkRules(query: NetworkQuery = {}) {
  const search = query.search?.trim().toLocaleLowerCase() ?? '';
  return readRules().map((rule) => {
    const resource = getResourceByAnyId(rule.resourceId);
    return resource ? { ...rule, resourceName: resource.name, project: resource.project, tags: resource.tags } : rule;
  }).filter((rule) => {
    if (search && ![rule.resourceId, rule.resourceName, rule.project ?? '', rule.tags?.join(' ') ?? '', rule.privateIp, rule.publicIp ?? '', rule.description].join(' ').toLocaleLowerCase().includes(search)) return false;
    if (query.resourceType && query.resourceType !== 'all' && rule.resourceType !== query.resourceType) return false;
    if (query.site && query.site !== 'all' && rule.site !== query.site) return false;
    if (query.protocol && query.protocol !== 'all' && rule.protocol !== query.protocol) return false;
    if (query.status && query.status !== 'all' && rule.status !== query.status) return false;
    return true;
  });
}

export function getNetworkRulesForResource(resourceId: string) {
  const resource = getResourceByAnyId(resourceId);
  return readRules().filter((rule) => rule.resourceId === resourceId).map((rule) =>
    resource ? { ...rule, resourceName: resource.name, project: resource.project, tags: resource.tags } : rule,
  );
}

export async function createNetworkRule(input: NetworkRuleInput) {
  validateInput(input);
  const updatedAt = new Date().toISOString();
  const rule: NetworkAccessRule = {
    ...input,
    id: `network-rule-${updatedAt.replace(/\D/g, '').slice(0, 14)}`,
    status: 'processing',
    change: 'create',
    updatedAt,
  };
  writeRules([rule, ...readRules()]);
  recordOperation({
    module: 'network',
    action: '新增网络访问规则',
    targetId: input.resourceId,
    targetName: input.resourceName,
    status: 'processing',
    message: '网络变更请求已提交，等待基础设施处理。',
    targetPath: `/resources/${input.resourceType === 'cloud-server' ? 'cloud-servers' : 'physical-machines'}/${input.resourceId}?tab=network`,
  });
  return rule;
}

export async function updateNetworkRule(ruleId: string, input: NetworkRuleInput) {
  validateInput(input, ruleId);
  const rules = readRules();
  const index = rules.findIndex((rule) => rule.id === ruleId);
  if (index < 0) throw new Error('未找到网络规则。');
  if (rules[index].status === 'processing') throw new Error('规则已有变更正在处理中。');
  const updated: NetworkAccessRule = {
    ...rules[index],
    ...input,
    status: 'processing',
    change: 'update',
    updatedAt: new Date().toISOString(),
  };
  writeRules([...rules.slice(0, index), updated, ...rules.slice(index + 1)]);
  recordOperation({
    module: 'network',
    action: '编辑网络访问规则',
    targetId: input.resourceId,
    targetName: input.resourceName,
    status: 'processing',
    message: '网络变更请求已提交，原规则状态等待基础设施确认。',
    targetPath: `/resources/${input.resourceType === 'cloud-server' ? 'cloud-servers' : 'physical-machines'}/${input.resourceId}?tab=network`,
  });
  return updated;
}

export async function deleteNetworkRule(ruleId: string) {
  const rules = readRules();
  const index = rules.findIndex((rule) => rule.id === ruleId);
  if (index < 0) throw new Error('未找到网络规则。');
  const current = rules[index];
  if (current.status === 'processing') throw new Error('规则已有变更正在处理中。');
  const updated: NetworkAccessRule = {
    ...current,
    status: 'processing',
    change: 'delete',
    updatedAt: new Date().toISOString(),
  };
  writeRules([...rules.slice(0, index), updated, ...rules.slice(index + 1)]);
  recordOperation({
    module: 'network',
    action: '删除网络访问规则',
    targetId: current.resourceId,
    targetName: current.resourceName,
    status: 'processing',
    message: '删除请求已提交，当前规则保留至基础设施处理完成。',
    targetPath: `/resources/${current.resourceType === 'cloud-server' ? 'cloud-servers' : 'physical-machines'}/${current.resourceId}?tab=network`,
  });
  return updated;
}

export function resetNetworkStore() {
  removeVersionedState(STORAGE_KEY);
}
