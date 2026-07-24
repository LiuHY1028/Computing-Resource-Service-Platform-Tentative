import { matchPath } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { APP_PAGE_ROUTES } from '../routes';
import {
  flattenNavigationItems,
  navigationGroups,
} from './navigation';

describe('application navigation configuration', () => {
  const navigationItems = flattenNavigationItems();

  it('keeps route paths unique', () => {
    const paths = APP_PAGE_ROUTES.map((route) => route.path);

    expect(new Set(paths).size).toBe(paths.length);
  });

  it('keeps navigation ids unique', () => {
    const ids = navigationItems.map((item) => item.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps only the five console modules in the side navigation', () => {
    expect(navigationGroups).toHaveLength(1);
    expect(navigationGroups[0]?.items).toHaveLength(5);
    expect(navigationItems.map((item) => item.path)).not.toContain('/marketplace');
    expect(navigationItems.map((item) => item.path)).not.toContain('/software');
  });

  it('matches every formal menu path to a registered route', () => {
    for (const item of navigationItems) {
      expect(
        APP_PAGE_ROUTES.some((route) =>
          matchPath({ path: route.path, end: true }, item.path),
        ),
      ).toBe(true);
    }
  });

  it('does not expose development or undefined modules in the formal menu', () => {
    const searchableNavigation = navigationItems
      .map((item) => `${item.label} ${item.path}`)
      .join(' ');

    expect(searchableNavigation).not.toContain('/__dev');
    expect(searchableNavigation).not.toMatch(/工作台|管理员/);
  });
});
