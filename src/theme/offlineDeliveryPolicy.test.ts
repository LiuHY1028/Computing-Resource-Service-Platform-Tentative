import { describe, expect, it } from 'vitest';
import packageManifestSource from '../../package.json?raw';
import gitignoreSource from '../../.gitignore?raw';
import mainSource from '../main.tsx?raw';
import routerSource from '../app/router.tsx?raw';
import offlineConfigSource from '../../vite.offline.config.ts?raw';
import finalizeSource from '../../scripts/finalize-offline.mjs?raw';
import verifySource from '../../scripts/verify-offline.mjs?raw';

const applicationModules = import.meta.glob(
  [
    '../app/**/*.{ts,tsx}',
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
    ([file]) =>
      !/\.(?:test|spec)\.[jt]sx?$/.test(file) &&
      !/(?:UiSpec|FoundationComponents|AdvancedComponents)Page\.tsx$/.test(
        file,
      ),
  ),
);

function sourceOffenders(pattern: RegExp) {
  return Object.entries(productionSources)
    .filter(([, source]) => pattern.test(source))
    .map(([file]) => file);
}

describe('standalone frontend delivery policy', () => {
  it('uses hash routing and keeps development routes behind the build flag', () => {
    expect(mainSource).toContain('HashRouter');
    expect(mainSource).not.toContain('BrowserRouter');
    expect(routerSource).toContain('import.meta.env.DEV');
  });

  it('contains no first-party request transport or remote failure simulation', () => {
    expect(
      sourceOffenders(
        /\b(?:fetch\s*\(|XMLHttpRequest|axios|WebSocket|EventSource|AbortController|VITE_DATA_MODE|simulateError|simulateEmpty|delayMs)\b/,
      ),
    ).toEqual([]);
    expect(sourceOffenders(/https?:\/\//)).toEqual([]);
  });

  it('keeps the single-file tool build-only and fully verified', () => {
    const packageManifest = JSON.parse(packageManifestSource) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
      scripts: Record<string, string>;
    };

    expect(packageManifest.dependencies).not.toHaveProperty(
      'vite-plugin-singlefile',
    );
    expect(packageManifest.devDependencies).toHaveProperty(
      'vite-plugin-singlefile',
    );
    expect(packageManifest.scripts['build:offline']).toContain(
      'vite.offline.config.ts',
    );
    expect(packageManifest.scripts['verify:offline']).toContain(
      'verify-offline.mjs',
    );
    expect(offlineConfigSource).toContain('viteSingleFile');
    expect(offlineConfigSource).toContain('assetsInlineLimit');
    expect(offlineConfigSource).toContain('cssCodeSplit: false');
    expect(offlineConfigSource).toContain('sourcemap: false');
    expect(finalizeSource).toContain('算力资源服务平台.html');
    expect(verifySource).toContain('data:font\\/woff2;base64');
    expect(verifySource).toContain('__dev');
    expect(gitignoreSource).toMatch(/^release\/$/m);
  });
});
