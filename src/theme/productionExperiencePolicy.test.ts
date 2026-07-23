import { describe, expect, it } from 'vitest';
import readmeSource from '../../README.md?raw';
import agentsSource from '../../AGENTS.md?raw';
import routerSource from '../app/router.tsx?raw';
import navigationSource from '../app/shell/navigation.ts?raw';

const applicationModules = import.meta.glob(
  [
    '../app/**/*.{ts,tsx}',
    '../components/ui/**/*.{ts,tsx}',
    '../features/**/*.{ts,tsx}',
    '../pages/*.{ts,tsx}',
  ],
  {
    eager: true,
    import: 'default',
    query: '?raw',
  },
) as Record<string, string>;

const productionSources = Object.fromEntries(
  Object.entries(applicationModules).filter(
    ([file]) => !/\.(?:test|spec)\.[jt]sx?$/.test(file),
  ),
);

function offenders(pattern: RegExp) {
  return Object.entries({ ...productionSources, '../../README.md': readmeSource })
    .filter(([, source]) => pattern.test(source))
    .map(([file]) => file);
}

describe('production-like user experience policy', () => {
  it('contains no development-state wording in user-facing sources', () => {
    expect(
      offenders(
        /演示|示例|Mock|测试数据|测试页面|原型|仅供演示|仅用于验证|占位页面|离线版|静态数据|单HTML|无后端|Task\s*\d+|DEMO-|demo-/iu,
      ),
    ).toEqual([]);
  });

  it('does not claim external side effects that are not implemented', () => {
    expect(
      offenders(/支付已完成|订单已创建|资源已开通|库存已扣减|审批已通过|已分配真实 IP/iu),
    ).toEqual([]);
  });

  it('keeps internal routes out of production builds and the formal menu', () => {
    expect(routerSource).toMatch(/import\.meta\.env\.DEV/);
    expect(navigationSource).not.toMatch(/\/__dev\//);
  });

  it('uses complete formal route mappings without URL-driven development states', () => {
    expect(routerSource).not.toContain('ModulePlaceholderPage');
    expect(routerSource).not.toContain('PurchasePlaceholderPage');
    expect(offenders(/viewState/)).toEqual([]);
  });

  it('documents the permanent production experience rule once', () => {
    expect(agentsSource.match(/## Production-like user experience/g)).toHaveLength(1);
    expect(agentsSource).toContain('不得虚构实际未发生的支付、订单、资源、库存、审批、IP、密码、密钥、凭据或其他后端结果。');
  });
});
