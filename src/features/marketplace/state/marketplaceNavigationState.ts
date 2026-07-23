import type { MarketplaceQuery, MarketplaceResourceType } from '../types';

const STORAGE_KEY = 'marketplace-navigation-context:v1';

export type MarketplaceNavigationContext = Readonly<{
  version: 1;
  query: MarketplaceQuery;
  page: number;
  scrollTop: number;
}>;

function isResourceType(value: unknown): value is MarketplaceResourceType {
  return value === 'cloud-server' || value === 'physical-machine';
}

function isComputeType(value: unknown) {
  return value === 'all' || value === 'cpu' || value === 'gpu';
}

function isAvailability(value: unknown) {
  return value === 'all' || value === 'configurable' || value === 'unavailable';
}

export function saveMarketplaceNavigationContext(
  query: MarketplaceQuery,
  page: number,
  scrollTop: number,
) {
  const context: MarketplaceNavigationContext = {
    version: 1,
    query,
    page: Number.isInteger(page) && page > 0 ? page : 1,
    scrollTop: Number.isFinite(scrollTop) ? Math.max(0, scrollTop) : 0,
  };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(context));
}

export function loadMarketplaceNavigationContext(
  resourceType?: MarketplaceResourceType,
): MarketplaceNavigationContext | undefined {
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as Partial<MarketplaceNavigationContext>;
    const query = parsed.query;
    if (
      parsed.version !== 1 ||
      !query ||
      !isResourceType(query.resourceType) ||
      !Array.isArray(query.sites) ||
      !Array.isArray(query.acceleratorModels) ||
      !Array.isArray(query.acceleratorCounts) ||
      typeof query.search !== 'string' ||
      !query.sites.every((site) => typeof site === 'string') ||
      !query.acceleratorModels.every((model) => typeof model === 'string') ||
      !query.acceleratorCounts.every((count) => typeof count === 'number') ||
      !isComputeType(query.computeType) ||
      !isAvailability(query.availability) ||
      (resourceType && query.resourceType !== resourceType)
    ) {
      return undefined;
    }

    return {
      version: 1,
      query,
      page:
        Number.isInteger(parsed.page) && Number(parsed.page) > 0
          ? Number(parsed.page)
          : 1,
      scrollTop:
        typeof parsed.scrollTop === 'number' && Number.isFinite(parsed.scrollTop)
          ? Math.max(0, parsed.scrollTop)
          : 0,
    };
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return undefined;
  }
}

export function getMarketplaceScrollRegion() {
  return document.querySelector<HTMLElement>('.main-content__scroll-region');
}
