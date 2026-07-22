import { describe, expect, it } from 'vitest';
import packageSource from '../../package.json?raw';

const sourceModules = import.meta.glob('../**/*.{css,ts,tsx}', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;
const tokenSourceKey = Object.keys(sourceModules).find((file) =>
  file.endsWith('/styles/tokens.css'),
);
const publicUiSources = Object.fromEntries(
  Object.entries(sourceModules).filter(([file]) => file.includes('/components/ui/')),
);

describe('source policies', () => {
  it('does not hardcode the design-source brand in src', () => {
    const designSourceBrand = ['One', 'Ai', 'Nexus'].join('');
    const offenders = Object.entries(sourceModules)
      .filter(([, contents]) => contents.includes(designSourceBrand))
      .map(([file]) => file);

    expect(offenders).toEqual([]);
  });

  it('keeps PDF color literals in tokens.css only', () => {
    expect(tokenSourceKey).toBeDefined();
    const tokenContents = sourceModules[tokenSourceKey ?? ''];
    const sourceColorLiterals = new Set(
      tokenContents.match(/#[\da-f]{3,8}\b/gi)?.map((value) => value.toLowerCase()),
    );
    const offenders = Object.entries(sourceModules)
      .filter(([file]) => file !== tokenSourceKey)
      .flatMap(([file, source]) => {
        const contents = source.toLowerCase();
        return [...sourceColorLiterals]
          .filter((color) => contents.includes(color))
          .map((color) => `${file}: ${color}`);
      });

    expect(offenders).toEqual([]);
  });

  it('does not embed fonts or load them from remote URLs', () => {
    const offenders = Object.entries(sourceModules)
      .filter(([, contents]) =>
        /data:font\/|url\(\s*["']?https?:\/\//i.test(contents),
      )
      .map(([file]) => file);

    expect(offenders).toEqual([]);
  });

  it('keeps public UI components free of business vocabulary and fixed visual literals', () => {
    const offenders = Object.entries(publicUiSources)
      .filter(([, contents]) =>
        /GPU|站点|镜像|订单|计费|审批|权限|业务Mock|\b(?:rgb|hsl)a?\(|#[\da-f]{3,8}\b|\d+(?:\.\d+)?px/i.test(
          contents,
        ),
      )
      .map(([file]) => file);

    expect(offenders).toEqual([]);
  });

  it('exports every foundation component from the public entry', () => {
    const publicEntry = sourceModules['../components/ui/index.ts'];
    for (const componentName of [
      'Container',
      'Button',
      'IconButton',
      'TextButton',
      'FilterTag',
      'Input',
      'SearchInput',
      'Textarea',
      'Radio',
      'RadioGroup',
      'CardRadio',
      'Checkbox',
      'CheckboxGroup',
      'Select',
      'MultiSelect',
      'Tooltip',
    ]) {
      expect(publicEntry).toContain(componentName);
    }
  });

  it('does not install a UI, icon, Select, Tooltip or overlay library', () => {
    expect(packageSource).not.toMatch(
      /antd|material-ui|@mui|radix|headlessui|react-aria|chakra|bootstrap|tailwind|floating-ui|popper|react-select|tippy|lucide|heroicons/i,
    );
  });
});
