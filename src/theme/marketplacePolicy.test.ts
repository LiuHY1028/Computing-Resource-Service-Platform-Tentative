import { describe, expect, it } from 'vitest';
import visualWorkflowPolicy from '../../AGENTS.md?raw';
import gitignore from '../../.gitignore?raw';
import packageManifestSource from '../../package.json?raw';
import { navigationGroups } from '../app/shell/navigation';

const marketplaceModules = import.meta.glob(
  [
    '../features/marketplace/**/*.{ts,tsx,css}',
    '../pages/MarketplacePage.tsx',
    '../pages/PurchasePage.tsx',
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
      file.endsWith('/PurchasePage.tsx'),
  ),
);

const marketplaceStyles = Object.values(productionSources)
  .filter((source) => source.includes('.resource-product-card'))
  .join('\n');
const marketplacePageTokenBlock =
  marketplaceStyles.match(/\.marketplace-page\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
const marketplaceStylesWithoutPageTokenBlock = marketplaceStyles.replace(
  marketplacePageTokenBlock,
  '',
);
const packageManifest = JSON.parse(packageManifestSource) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

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

  it('contains no benchmark product brands in marketplace production code', () => {
    expect(
      sourceOffenders(
        /RunPod|Lambda|DigitalOcean|Hetzner|Vercel|Aliyun|Alibaba(?:\s+Cloud)?|\u963f\u91cc\u4e91/i,
      ),
    ).toEqual([]);
  });

  it('contains no currency, price, discount, or billing-cycle literals', () => {
    expect(
      sourceOffenders(
        /[\u00a5\uffe5\u20ac\u00a3]|\b(?:CNY|RMB|USD)\b|\d+(?:\.\d{1,2})?\s*(?:\u5143|\u7f8e\u5143)|\u4ef7\u683c|\u552e\u4ef7|\u5355\u4ef7|\u91d1\u989d|\u6298\u6263|\u8ba1\u8d39\u5468\u671f/iu,
      ),
    ).toEqual([]);
    expect(
      sourceOffenders(/\b(?:price|pricing|billing|approval|permission)\b/iu),
    ).toEqual([]);
    expect(
      sourceOffenders(
        /\u539f\u4ef7|\u5212\u7ebf\u4ef7|\u4f18\u60e0\u5238|\u65b0\u4eba\u4f18\u60e0|\u9650\u65f6|\u5012\u8ba1\u65f6|\u4fc3\u9500|\u6d3b\u52a8\u4ef7|\u7acb\u5373\u8d2d\u4e70|\u5145\u503c|\u652f\u4ed8|\b(?:discount|coupon|promotion|checkout)\b/iu,
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
    expect(navigationSource).not.toMatch(/viewState|__dev|[?&]type=/);
  });

  it('centralizes page decoration colors and keeps card height content-driven', () => {
    expect(marketplaceStyles).not.toBe('');
    expect(marketplacePageTokenBlock).toMatch(
      /--marketplace-accent-blue:\s*#[\da-f]{6}/i,
    );
    expect(marketplacePageTokenBlock).toMatch(
      /--marketplace-accent-cyan:\s*#[\da-f]{6}/i,
    );
    expect(marketplacePageTokenBlock).toMatch(
      /--marketplace-accent-violet:\s*#[\da-f]{6}/i,
    );
    expect(marketplacePageTokenBlock).toMatch(
      /--marketplace-surface-blue:\s*#[\da-f]{6}/i,
    );
    expect(marketplacePageTokenBlock).toMatch(
      /--marketplace-surface-cyan:\s*#[\da-f]{6}/i,
    );
    expect(marketplacePageTokenBlock).toMatch(
      /--marketplace-surface-violet:\s*#[\da-f]{6}/i,
    );
    expect(marketplaceStylesWithoutPageTokenBlock).not.toMatch(
      /#[\da-f]{3,8}\b|rgba?\(|hsla?\(/i,
    );

    const cardRules = [
      ...marketplaceStyles.matchAll(
        /\.resource-product-card(?:__header|__body|__footer)?\s*\{([^}]+)\}/g,
      ),
    ].map((match) => match[1] ?? '');
    expect(cardRules.length).toBeGreaterThan(0);
    cardRules.forEach((cardRule) => {
      expect(cardRule).not.toMatch(/(?:^|\s)(?:height|min-height)\s*:/);
      expect(cardRule).not.toContain('margin-top: auto');
    });
    const cardRootRule =
      marketplaceStyles.match(/\.resource-product-card\s*\{([^}]+)\}/)?.[1] ??
      '';
    expect(cardRootRule).not.toContain('minmax(0, 1fr)');
  });

  it('documents the four-to-three-column contract and accessible motion states', () => {
    expect(marketplaceStyles).toContain(
      ".resource-product-card[data-resource-type='cloud-server'][data-compute-type='cpu']",
    );
    expect(marketplaceStyles).toContain(
      ".resource-product-card[data-resource-type='cloud-server'][data-compute-type='gpu']",
    );
    expect(marketplaceStyles).toContain(
      ".resource-product-card[data-resource-type='physical-machine'][data-compute-type='cpu']",
    );
    expect(marketplaceStyles).toContain(
      ".resource-product-card[data-resource-type='physical-machine'][data-compute-type='gpu']",
    );
    expect(marketplaceStyles).toMatch(
      /@media\s*\(max-width:\s*1599px\)[\s\S]*?\.marketplace-results__grid\s*>\s*\.marketplace-results__item\s*\{[^}]*grid-column-end:\s*span 8/,
    );
    expect(marketplaceStyles).toContain('.resource-product-card:focus-within');
    expect(marketplaceStyles).toContain(
      "resource-product-card[data-configurable='true']:hover",
    );
    expect(marketplaceStyles).toMatch(/prefers-reduced-motion:\s*reduce/);
  });

  it('does not introduce benchmark assets, external imagery, or new dependencies', () => {
    expect(
      sourceOffenders(
        /<img\b|https?:\/\/|\b(?:artifacts|reference-local)\b|\.(?:png|jpe?g|webp)\b|url\s*\(/iu,
      ),
    ).toEqual([]);
    expect(Object.keys(packageManifest.dependencies).sort()).toEqual([
      'react',
      'react-dom',
      'react-router-dom',
    ]);
    expect(Object.keys(packageManifest.devDependencies).sort()).toEqual([
      '@eslint/js',
      '@testing-library/jest-dom',
      '@testing-library/react',
      '@testing-library/user-event',
      '@types/react',
      '@types/react-dom',
      '@vitejs/plugin-react',
      'eslint',
      'eslint-plugin-react-hooks',
      'eslint-plugin-react-refresh',
      'globals',
      'jsdom',
      'typescript',
      'typescript-eslint',
      'vite',
      'vitest',
    ]);
  });

  it('keeps the permanent browser-only visual review workflow documented', () => {
    expect(visualWorkflowPolicy).toContain('## Visual review workflow');
    expect(visualWorkflowPolicy).toContain(
      'Codex\u4e0d\u5f97\u4e3a\u7528\u6237\u751f\u6210\u3001\u4fdd\u5b58\u3001\u63d0\u4ea4\u6216\u5728\u6700\u7ec8\u56de\u590d\u4e2d\u5c55\u793a\u9875\u9762\u8bc4\u5ba1\u622a\u56fe\u3002',
    );
    expect(visualWorkflowPolicy).toContain(
      '\u6bcf\u6b21\u524d\u7aef\u9875\u9762\u4efb\u52a1\u5b8c\u6210\u540e\uff0c\u5fc5\u987b\u542f\u52a8\u672c\u5730\u5f00\u53d1\u670d\u52a1\u5668\u8fdb\u884c\u6d4f\u89c8\u5668\u68c0\u67e5\u3002',
    );
    expect(visualWorkflowPolicy).toContain(
      '\u6700\u7ec8\u89c6\u89c9\u9a8c\u6536\u7531\u7528\u6237\u81ea\u884c\u5728\u6d4f\u89c8\u5668\u4e2d\u5b8c\u6210\u3002',
    );
    expect(gitignore).toContain('/artifacts/');
    expect(gitignore).toContain('/docs/reference-local/');
  });
});
