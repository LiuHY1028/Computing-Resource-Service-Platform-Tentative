import { APP_PATHS } from '../../../app/routes';
import { recordOperation } from '../../operations';
import {
  isValidIpOrCidr,
  isValidPort,
} from '../../purchase/validation/purchaseValidation';
import {
  readMigratedVersionedState,
  removeVersionedState,
  writeVersionedState,
} from '../../platform/persistence';
import { getResourceByAnyId } from '../../resources/state/resourceStore';
import type {
  NetworkAccessRule,
  NetworkQuery,
  NetworkRuleInput,
  NetworkSourceType,
} from '../types';

const STORAGE_KEY = 'computing-platform:network';
const VERSION = 3;

const INITIAL_RULES: readonly NetworkAccessRule[] = [
  {
    id: 'network-rule-cs-east-001-ssh',
    resourceId: 'cs-east-001',
    ruleName: 'SSH 远程访问',
    protocol: 'TCP',
    port: 22,
    sourceType: 'cidr',
    sourceValue: '10.0.0.0/8',
    description: '企业网络 SSH 访问',
    status: 'enabled',
    updatedAt: '2026-07-20T03:30:00.000Z',
  },
  {
    id: 'network-rule-cs-east-001-http',
    resourceId: 'cs-east-001',
    ruleName: 'HTTP 服务',
    protocol: 'TCP',
    port: 80,
    sourceType: 'cidr',
    sourceValue: '192.0.2.0/24',
    description: '业务网段访问',
    status: 'enabled',
    updatedAt: '2026-07-21T03:30:00.000Z',
  },
  {
    id: 'network-rule-pm-east-001-ssh',
    resourceId: 'pm-east-001',
    ruleName: 'SSH 远程访问',
    protocol: 'TCP',
    port: 22,
    sourceType: 'cidr',
    sourceValue: '10.0.0.0/8',
    description: '企业网络 SSH 访问',
    status: 'enabled',
    updatedAt: '2026-07-18T03:30:00.000Z',
  },
];

function sourceType(value: string): Exclude<NetworkSourceType, 'current-ip'> {
  if (value === '0.0.0.0/0') return 'all';
  return value.includes('/') ? 'cidr' : 'ip';
}

function migrateRules(value: unknown, previousVersion: number) {
  if (previousVersion !== 2 || !Array.isArray(value)) return undefined;
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const rule = candidate as Record<string, unknown>;
    const externalPort = Number(rule.mappedPort ?? rule.servicePort);
    const source = String(rule.source ?? '');
    return [{
      id: String(rule.id ?? ''),
      resourceId: String(rule.resourceId ?? ''),
      ruleName: String(rule.description || `端口 ${externalPort}`),
      protocol: rule.protocol === 'UDP' ? 'UDP' : 'TCP',
      port: externalPort,
      sourceType: sourceType(source),
      sourceValue: source,
      description: String(rule.description ?? ''),
      status: rule.status === 'effective' ? 'enabled' : 'disabled',
      updatedAt: String(rule.updatedAt ?? new Date().toISOString()),
    } satisfies NetworkAccessRule];
  });
}

function isRule(value: unknown): value is NetworkAccessRule {
  if (!value || typeof value !== 'object') return false;
  const rule = value as Partial<NetworkAccessRule>;
  return (
    typeof rule.id === 'string' &&
    typeof rule.resourceId === 'string' &&
    typeof rule.ruleName === 'string' &&
    (rule.protocol === 'TCP' || rule.protocol === 'UDP') &&
    typeof rule.port === 'number' &&
    ['current-ip', 'ip', 'cidr', 'all'].includes(rule.sourceType ?? '') &&
    typeof rule.sourceValue === 'string' &&
    (rule.status === 'enabled' || rule.status === 'disabled')
  );
}

function readRules() {
  return readMigratedVersionedState(
    STORAGE_KEY,
    VERSION,
    (value): value is NetworkAccessRule[] =>
      Array.isArray(value) && value.every(isRule),
    migrateRules,
    () => structuredClone(INITIAL_RULES) as NetworkAccessRule[],
  );
}

function writeRules(rules: readonly NetworkAccessRule[]) {
  writeVersionedState(STORAGE_KEY, VERSION, rules);
}

function normalizedSource(input: NetworkRuleInput) {
  if (input.sourceType === 'all') return '0.0.0.0/0';
  return input.sourceValue.trim();
}

function validateInput(input: NetworkRuleInput, editingId?: string) {
  if (!input.ruleName.trim()) throw new Error('请输入规则名称。');
  if (!getResourceByAnyId(input.resourceId)) throw new Error('请选择有效资源。');
  if (!isValidPort(input.port)) {
    throw new Error('访问端口必须是 1 至 65535 的整数。');
  }
  if (input.sourceType === 'current-ip') {
    throw new Error('当前环境无法可靠识别公网 IP，请使用指定 IP 或 CIDR。');
  }
  const source = normalizedSource(input);
  if (!isValidIpOrCidr(source)) {
    throw new Error('请输入有效的 IPv4 地址或 CIDR。');
  }
  if (
    readRules().some(
      (rule) =>
        rule.id !== editingId &&
        rule.resourceId === input.resourceId &&
        rule.protocol === input.protocol &&
        rule.port === input.port &&
        rule.sourceValue === source,
    )
  ) {
    throw new Error('同一资源已存在相同协议、端口和来源的规则。');
  }
}

export function queryNetworkRules(query: NetworkQuery = {}) {
  const search = query.search?.trim().toLocaleLowerCase() ?? '';
  return readRules().filter((rule) => {
    const resource = getResourceByAnyId(rule.resourceId);
    if (!resource) return false;
    if (
      search &&
      ![
        rule.id,
        rule.ruleName,
        rule.description,
        rule.sourceValue,
        resource.id,
        resource.name,
        resource.project,
        resource.tags.join(' '),
      ].join(' ').toLocaleLowerCase().includes(search)
    ) return false;
    if (query.resourceType && query.resourceType !== 'all' && resource.resourceType !== query.resourceType) return false;
    if (query.site && query.site !== 'all' && resource.site !== query.site) return false;
    if (query.protocol && query.protocol !== 'all' && rule.protocol !== query.protocol) return false;
    if (query.status && query.status !== 'all' && rule.status !== query.status) return false;
    return true;
  });
}

export function getNetworkRulesForResource(resourceId: string) {
  return readRules().filter((rule) => rule.resourceId === resourceId);
}

function nextRuleId() {
  const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 17);
  return `network-rule-${stamp}-${readRules().length + 1}`;
}

export async function createNetworkRule(input: NetworkRuleInput) {
  validateInput(input);
  const resource = getResourceByAnyId(input.resourceId)!;
  const rule: NetworkAccessRule = {
    ...input,
    ruleName: input.ruleName.trim(),
    sourceValue: normalizedSource(input),
    description: input.description.trim(),
    id: nextRuleId(),
    status: 'enabled',
    updatedAt: new Date().toISOString(),
  };
  writeRules([rule, ...readRules()]);
  recordOperation({
    module: 'network',
    action: '新增访问规则',
    targetId: resource.id,
    targetName: resource.name,
    status: 'completed',
    message: `${rule.ruleName}已启用。`,
    targetPath: `${APP_PATHS.networkAccess}?resourceId=${encodeURIComponent(resource.id)}`,
  });
  return rule;
}

export async function updateNetworkRule(ruleId: string, input: NetworkRuleInput) {
  validateInput(input, ruleId);
  const rules = readRules();
  const index = rules.findIndex((rule) => rule.id === ruleId);
  if (index < 0) throw new Error('未找到网络规则。');
  const resource = getResourceByAnyId(input.resourceId)!;
  const updated: NetworkAccessRule = {
    ...rules[index],
    ...input,
    ruleName: input.ruleName.trim(),
    sourceValue: normalizedSource(input),
    description: input.description.trim(),
    updatedAt: new Date().toISOString(),
  };
  writeRules([...rules.slice(0, index), updated, ...rules.slice(index + 1)]);
  recordOperation({
    module: 'network',
    action: '编辑访问规则',
    targetId: resource.id,
    targetName: resource.name,
    status: 'completed',
    message: `${updated.ruleName}已更新。`,
    targetPath: `${APP_PATHS.networkAccess}?resourceId=${encodeURIComponent(resource.id)}`,
  });
  return updated;
}

export async function setNetworkRuleEnabled(ruleId: string, enabled: boolean) {
  const rules = readRules();
  const index = rules.findIndex((rule) => rule.id === ruleId);
  if (index < 0) throw new Error('未找到网络规则。');
  const current = rules[index];
  const updated: NetworkAccessRule = {
    ...current,
    status: enabled ? 'enabled' : 'disabled',
    updatedAt: new Date().toISOString(),
  };
  writeRules([...rules.slice(0, index), updated, ...rules.slice(index + 1)]);
  const resource = getResourceByAnyId(current.resourceId);
  recordOperation({
    module: 'network',
    action: enabled ? '启用访问规则' : '停用访问规则',
    targetId: current.resourceId,
    targetName: resource?.name ?? current.resourceId,
    status: 'completed',
    message: `${current.ruleName}已${enabled ? '启用' : '停用'}。`,
    targetPath: `${APP_PATHS.networkAccess}?resourceId=${encodeURIComponent(current.resourceId)}`,
  });
  return updated;
}

export function disableNetworkRulesForResource(resourceId: string) {
  const rules = readRules();
  const changed = rules.map((rule) =>
    rule.resourceId === resourceId && rule.status === 'enabled'
      ? { ...rule, status: 'disabled' as const, updatedAt: new Date().toISOString() }
      : rule,
  );
  writeRules(changed);
  return changed.filter(
    (rule) => rule.resourceId === resourceId && rule.status === 'disabled',
  );
}

export async function deleteNetworkRule(ruleId: string) {
  const rules = readRules();
  const index = rules.findIndex((rule) => rule.id === ruleId);
  if (index < 0) throw new Error('未找到网络规则。');
  const current = rules[index];
  writeRules([...rules.slice(0, index), ...rules.slice(index + 1)]);
  const resource = getResourceByAnyId(current.resourceId);
  recordOperation({
    module: 'network',
    action: '删除访问规则',
    targetId: current.resourceId,
    targetName: resource?.name ?? current.resourceId,
    status: 'completed',
    message: `${current.ruleName}已删除。`,
    targetPath: `${APP_PATHS.networkAccess}?resourceId=${encodeURIComponent(current.resourceId)}`,
  });
  return current;
}

export function resetNetworkStore() {
  removeVersionedState(STORAGE_KEY);
}
