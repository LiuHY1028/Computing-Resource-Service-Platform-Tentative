import { describe, expect, it } from 'vitest';

const sources = import.meta.glob('../components/ui/**/*.{css,ts,tsx}', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;

function read(suffix: string) {
  const entry = Object.entries(sources).find(([file]) => file.endsWith(suffix));
  if (!entry) throw new Error(`Missing source: ${suffix}`);
  return entry[1];
}

const componentFiles = [
  '/Modal/Modal.tsx',
  '/Tabs/Tabs.tsx',
  '/Grid/Grid.tsx',
  '/Table/Table.tsx',
  '/Pagination/Pagination.tsx',
  '/Form/Form.tsx',
];

describe('advanced component engineering constraints', () => {
  it('imports foundation dependencies only through the public index', () => {
    for (const file of ['/Modal/Modal.tsx', '/Table/Table.tsx', '/Pagination/Pagination.tsx', '/Form/Form.tsx']) {
      const source = read(file);
      expect(source).not.toMatch(/from ['"]\.\.\/(Button|Checkbox|Select|Input|Radio|Tooltip|Container)\//);
      expect(source).toMatch(/from ['"]\.\.\/index['"]/);
    }
  });

  it('does not redraw foundation selection or action controls', () => {
    expect(read('/Table/Table.tsx')).not.toMatch(/type=["']checkbox["']/);
    expect(read('/Pagination/Pagination.tsx')).not.toMatch(/<button/);
    expect(read('/Form/Form.tsx')).not.toMatch(/<(input|textarea|select)\b/);
  });

  it('keeps fixed visual literals out of advanced component files', () => {
    for (const file of componentFiles) {
      expect(read(file)).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|\b\d+px\b/i);
    }
  });

  it('exports every advanced component through the unified public entry', () => {
    const source = read('/index.ts');
    for (const name of ['Modal', 'PromptModal', 'Tabs', 'TitleBarTabs', 'UnderlineTabs', 'Grid', 'GridItem', 'Table', 'Pagination', 'EmptyTable', 'Form', 'FormSection', 'FormField', 'FormActions', 'FormAnchorNav']) {
      expect(source).toContain(name);
    }
  });

  it('contains no source brand in advanced components', () => {
    const sourceBrand = ['One', 'Ai', 'Nexus'].join('');
    expect(componentFiles.map(read).join('\n')).not.toContain(sourceBrand);
  });
});
