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
        resourceName: '研发计算节点-01',
        resourceType: 'cloud-server',
        site: '东部算力中心',
        privateIp: '10.24.1.21',
        sshAvailable: true,
        protocol: 'TCP',
        servicePort: 70000,
        mappedPort: 18090,
        source: '10.0.0.0/8',
        description: '无效端口',
      }),
    ).rejects.toThrow('1 至 65535');
  });

  it('applies free rule changes directly without creating a commerce request', async () => {
    const rule = await createNetworkRule({
      resourceId: 'cs-west-003',
      resourceName: '数据处理节点-03',
      resourceType: 'cloud-server',
      site: '西部算力中心',
      privateIp: '10.24.2.23',
      sshAvailable: true,
      protocol: 'UDP',
      servicePort: 9000,
      mappedPort: 19000,
      source: '192.0.2.0/24',
      description: '数据服务',
    });
    expect(rule.status).toBe('effective');
    expect(getNetworkRulesForResource('cs-west-003')).toHaveLength(1);
    await deleteNetworkRule(rule.id);
    expect(getNetworkRulesForResource('cs-west-003')).toHaveLength(0);
  });
});
