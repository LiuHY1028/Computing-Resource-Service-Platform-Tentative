import { describe, expect, it } from 'vitest';

const sourceModules = import.meta.glob('../**/*.{css,ts,tsx}', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;
const tokenSourceKey = Object.keys(sourceModules).find((file) =>
  file.endsWith('/styles/tokens.css'),
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
});
