import { beforeEach, describe, expect, it } from 'vitest';
import {
  createNetworkRule,
  deleteNetworkRule,
  getNetworkRulesForResource,
  resetNetworkStore,
} from './networkStore';

const storage = new Map<string, string>();

describe('networkStore', () => {
  beforeEach(() => {
    storage.clear();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        removeItem: (key: string) => storage.delete(key),
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    });
    resetNetworkStore();
  });

  it('validates ports, CIDR, and obvious duplicates', async () => {
    await expect(
      createNetworkRule({
        resourceId: 'cs-east-001',
        ruleName: '无效端口',
        protocol: 'TCP',
        port: 70000,
        sourceType: 'cidr',
        sourceValue: '10.0.0.0/8',
        description: '无效端口',
      }),
    ).rejects.toThrow('1 至 65535');
  });

  it('applies free rule changes directly without creating a commerce request', async () => {
    const rule = await createNetworkRule({
      resourceId: 'cs-west-003',
      ruleName: '数据服务',
      protocol: 'UDP',
      port: 19000,
      sourceType: 'cidr',
      sourceValue: '192.0.2.0/24',
      description: '数据服务',
    });
    expect(rule.status).toBe('enabled');
    expect(getNetworkRulesForResource('cs-west-003')).toHaveLength(1);
    await deleteNetworkRule(rule.id);
    expect(getNetworkRulesForResource('cs-west-003')).toHaveLength(0);
  });
});
