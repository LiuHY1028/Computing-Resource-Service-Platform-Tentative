import { describe, expect, it } from 'vitest';
import mainSource from '../main.tsx?raw';
import fontCss from '../styles/fonts.css?raw';
import tokenCss from '../styles/tokens.css?raw';

const fontAssets = import.meta.glob('../assets/fonts/*.woff2', {
  eager: true,
  import: 'default',
  query: '?url',
});

describe('Design Token contract', () => {
  it('loads the single token source from the application entry', () => {
    expect(mainSource).toContain("./styles/tokens.css");
  });

  it('loads the local font declaration before the font token is consumed', () => {
    const resetIndex = mainSource.indexOf("./styles/reset.css");
    const fontIndex = mainSource.indexOf("./styles/fonts.css");
    const tokenIndex = mainSource.indexOf("./styles/tokens.css");
    const themeIndex = mainSource.indexOf("./styles/theme.css");
    const baseIndex = mainSource.indexOf("./styles/base.css");

    expect([resetIndex, fontIndex, tokenIndex, themeIndex, baseIndex]).toEqual(
      [...[resetIndex, fontIndex, tokenIndex, themeIndex, baseIndex]].sort(
        (left, right) => left - right,
      ),
    );
    expect(resetIndex).toBeGreaterThanOrEqual(0);
  });

  it('declares one local WOFF2 variable font without embedding or remote URLs', () => {
    expect(Object.keys(fontAssets)).toEqual(['../assets/fonts/MiSansVF.woff2']);
    expect(fontCss).toContain('@font-face');
    expect(fontCss).toContain('url("../assets/fonts/MiSansVF.woff2")');
    expect(fontCss).toContain('format("woff2")');
    expect(fontCss).toContain('font-weight: 150 700');
    expect(fontCss).toContain('font-display: swap');
    expect(fontCss).not.toMatch(/data:font\//i);
    expect(fontCss).not.toMatch(/https?:\/\//i);
  });

  it('keeps the provided family first while preserving the fallback chain', () => {
    const familyDeclaration = tokenCss.match(/--font-family-base:[^;]+;/s)?.[0];

    expect(familyDeclaration).toContain('"MiSans VF"');
    expect(familyDeclaration).toContain('"MiSans"');
    expect(familyDeclaration).toContain('"PingFang SC"');
    expect(familyDeclaration).toContain('"Microsoft YaHei"');
    expect(familyDeclaration).toContain('SimSun');
    expect(familyDeclaration).toContain('sans-serif');
    expect(familyDeclaration?.indexOf('"MiSans VF"')).toBeLessThan(
      familyDeclaration?.indexOf('"MiSans"') ?? 0,
    );
  });

  it.each([
    ['core color', '--color-primary:'],
    ['font family', '--font-family-base:'],
    ['font size', '--font-size-body:'],
    ['control radius', '--radius-control:'],
    ['control border', '--border-control:'],
    ['navbar layout', '--layout-navbar-height:'],
    ['sidebar layout', '--layout-sidebar-expanded-width:'],
    ['grid column count', '--grid-column-count:'],
    ['grid gutter', '--grid-gutter:'],
  ])('contains the %s token', (_label, tokenName) => {
    expect(tokenCss).toContain(tokenName);
  });
});
