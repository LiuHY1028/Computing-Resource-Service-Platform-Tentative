import { describe, expect, it } from 'vitest';
import { navigationGroups } from '../app/shell/navigation';

const marketplaceModules = import.meta.glob(
  [
    '../features/marketplace/**/*.{ts,tsx}',
    '../pages/MarketplacePage.tsx',
    '../pages/PurchasePlaceholderPage.tsx',
  ],
  {
    eager: true,
    import: 'default',
    query: '?raw',
  },
) as Record<string, string>;

const navigationModules = import.meta.glob('../app/shell/navigation.ts', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;

const productionSources = Object.fromEntries(
  Object.entries(marketplaceModules).filter(
    ([file]) => !/\.(?:test|spec)\.[jt]sx?$/.test(file),
  ),
);

const businessUiSources = Object.fromEntries(
  Object.entries(productionSources).filter(
    ([file]) =>
      file.includes('/components/') ||
      file.endsWith('/MarketplacePage.tsx') ||
      file.endsWith('/PurchasePlaceholderPage.tsx'),
  ),
);

function sourceOffenders(pattern: RegExp) {
  return Object.entries(productionSources)
    .filter(([, source]) => pattern.test(source))
    .map(([file]) => file);
}

describe('marketplace production-source policies', () => {
  it('uses public UI exports instead of deep component imports', () => {
    const offenders = Object.entries(businessUiSources).flatMap(
      ([file, source]) =>
        [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)]
          .map((match) => match[1] ?? '')
          .filter((specifier) => specifier.includes('/components/ui/'))
          .map((specifier) => `${file}: ${specifier}`),
    );

    expect(offenders).toEqual([]);
  });

  it('does not redraw native action or selection controls in business UI', () => {
    const offenders = Object.entries(businessUiSources)
      .filter(([, source]) => /<(?:button|input|select|textarea)\b/.test(source))
      .map(([file]) => file);

    expect(offenders).toEqual([]);
  });

  it('contains no design-source brand in marketplace production code', () => {
    const designSourceBrand = ['One', 'Ai', 'Nexus'].join('');
    expect(sourceOffenders(new RegExp(designSourceBrand, 'i'))).toEqual([]);
  });

  it('contains no currency, price, discount, or billing-cycle literals', () => {
    expect(
      sourceOffenders(
        /[\u00a5\uffe5\u20ac\u00a3]|\b(?:CNY|RMB|USD)\b|\d+(?:\.\d{1,2})?\s*(?:\u5143|\u7f8e\u5143)|\u4ef7\u683c|\u552e\u4ef7|\u5355\u4ef7|\u91d1\u989d|\u6298\u6263|\u8ba1\u8d39\u5468\u671f/iu,
      ),
    ).toEqual([]);
  });

  it('contains no prohibited AI-platform product or managed-workflow merchandising', () => {
    expect(
      sourceOffenders(
        /notebook|\u8bad\u7ec3\u4efb\u52a1|\u63a8\u7406\u670d\u52a1|token\s*\u5546\u54c1|\u6a21\u578b\u5546\u54c1|\u6587\u4ef6\u5546\u54c1/iu,
      ),
    ).toEqual([]);
  });

  it('contains neither on-demand wording nor a no-card selector value', () => {
    expect(sourceOffenders(/\u6309\u9700(?:\u8d2d\u4e70)?/u)).toEqual([]);
    expect(sourceOffenders(/\u65e0\u5361/u)).toEqual([]);
  });

  it('keeps the formal menu unchanged and free of development state parameters', () => {
    expect(navigationGroups).toHaveLength(1);
    expect(
      navigationGroups[0]?.items.map((item) => [item.label, item.path]),
    ).toEqual([
      ['\u8d44\u6e90\u5546\u57ce', '/marketplace'],
      ['\u6211\u7684\u8d44\u6e90', '/resources/cloud-servers'],
      ['\u5b58\u50a8\u7ba1\u7406', '/storage'],
      ['\u955c\u50cf\u7ba1\u7406', '/images'],
      ['\u8f6f\u4ef6\u4e2d\u5fc3', '/software'],
      ['\u7f51\u7edc\u4e0e\u8bbf\u95ee', '/network-access'],
      ['\u8ba2\u5355\u4e0e\u8bb0\u5f55', '/orders'],
    ]);
    expect(
      navigationGroups[0]?.items.at(-1)?.children?.map((item) => [
        item.label,
        item.path,
      ]),
    ).toEqual([
      ['\u8ba2\u5355', '/orders'],
      ['\u64cd\u4f5c\u8bb0录', '/operation-records'],
    ]);

    const navigationSource = Object.values(navigationModules).join('\n');
    expect(navigationSource).not.toMatch(/demoState|__dev|[?&]type=/);
  });
});
