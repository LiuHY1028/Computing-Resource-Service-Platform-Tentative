import { describe, expect, it } from 'vitest';
import packageManifestSource from '../../package.json?raw';
import navigationSource from '../app/shell/navigation.ts?raw';

const resourceModules = import.meta.glob(
  [
    '../features/resources/**/*.{ts,tsx,css}',
    '../pages/ResourceListPage.tsx',
    '../pages/ResourceDetailPage.tsx',
  ],
  {
    eager: true,
    import: 'default',
    query: '?raw',
  },
) as Record<string, string>;

const productionSources = Object.fromEntries(
  Object.entries(resourceModules).filter(
    ([file]) => !/\.(?:test|spec)\.[jt]sx?$/.test(file),
  ),
);
const productionText = Object.values(productionSources).join('\n');
const packageManifest = JSON.parse(packageManifestSource) as {
  dependencies: Record<string, string>;
};

function sourceOffenders(pattern: RegExp) {
  return Object.entries(productionSources)
    .filter(([, source]) => pattern.test(source))
    .map(([file]) => file);
}

describe('resource management production-source policies', () => {
  it('uses public UI exports and shared resource data access', () => {
    const deepUiImports = Object.entries(productionSources).flatMap(
      ([file, source]) =>
        [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)]
          .map((match) => match[1] ?? '')
          .filter((specifier) => specifier.includes('/components/ui/'))
          .map((specifier) => `${file}: ${specifier}`),
    );
    expect(deepUiImports).toEqual([]);
    expect(sourceOffenders(/from\s+['"].*resourceCatalog['"]/)).toEqual([
      '../features/resources/state/resourceStore.ts',
    ]);
  });

  it('contains no user-facing development-state wording or fabricated completion', () => {
    expect(
      sourceOffenders(
        /演示|示例|Mock|原型|占位|Task\s*\d+|DEMO-|demo-|资源已开通|服务器已启动|服务器已停止|服务器已重启/iu,
      ),
    ).toEqual([]);
  });

  it('contains no credentials, private keys, or real public addresses', () => {
    expect(
      sourceOffenders(
        /BEGIN\s+(?:RSA|OPENSSH|EC)\s+PRIVATE KEY|password\s*[:=]|privateKey\s*[:=]/iu,
      ),
    ).toEqual([]);

    const addresses = [
      ...productionText.matchAll(
        /\b(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?\b/g,
      ),
    ].map((match) => match[0]?.split('/')[0] ?? '');
    const approvedAddress = (address: string) =>
      /^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.0\.2\.|198\.51\.100\.|203\.0\.113\.)/.test(
        address,
      );
    expect(addresses.filter((address) => !approvedAddress(address))).toEqual(
      [],
    );
  });

  it('does not call infrastructure services or add UI and chart dependencies', () => {
    expect(
      sourceOffenders(/\b(?:fetch|axios|WebSocket|EventSource)\s*\(/),
    ).toEqual([]);
    expect(Object.keys(packageManifest.dependencies).sort()).toEqual([
      'react',
      'react-dom',
      'react-router-dom',
    ]);
  });

  it('keeps state routes out of the formal menu', () => {
    expect(navigationSource).not.toMatch(/viewState|\/__dev\//);
  });
});
