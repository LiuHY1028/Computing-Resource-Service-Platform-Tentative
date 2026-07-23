import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Container, TitleBarTabs } from '../components/ui';
import {
  MarketplaceFilters,
  MarketplaceResults,
  getMarketplaceFilterOptions,
  getMarketplaceScrollRegion,
  loadMarketplaceNavigationContext,
  queryMarketplaceProducts,
  saveMarketplaceNavigationContext,
  type MarketplaceProduct,
  type MarketplaceQuery,
  type MarketplaceResourceType,
  type MarketplaceResultsState,
} from '../features/marketplace';
import '../features/marketplace/marketplace.css';

const PAGE_SIZE = 6;

type MarketplaceFilterState = Omit<MarketplaceQuery, 'resourceType'>;

function parseResourceType(value: string | null): MarketplaceResourceType {
  return value === 'physical' ? 'physical-machine' : 'cloud-server';
}

function resourceTypeQueryValue(resourceType: MarketplaceResourceType) {
  return resourceType === 'cloud-server' ? 'cloud' : 'physical';
}

function defaultFilters(): MarketplaceFilterState {
  return {
    search: '',
    sites: [],
    computeType: 'all',
    acceleratorModels: [],
    acceleratorCounts: [],
    availability: 'all',
  };
}

function filtersFromQuery(query: MarketplaceQuery): MarketplaceFilterState {
  return {
    search: query.search,
    sites: query.sites,
    computeType: query.computeType,
    acceleratorModels: query.acceleratorModels,
    acceleratorCounts: query.acceleratorCounts,
    availability: query.availability,
  };
}

function sameStrings(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function sameNumbers(left: readonly number[], right: readonly number[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function sanitizeFilters(
  filters: MarketplaceFilterState,
  resourceType: MarketplaceResourceType,
) {
  const options = getMarketplaceFilterOptions(resourceType);
  const sites = filters.sites.filter((site) => options.sites.includes(site));
  const acceleratorModels =
    filters.computeType === 'gpu'
      ? filters.acceleratorModels.filter((model) =>
          options.acceleratorModels.includes(model),
        )
      : [];
  const acceleratorCounts =
    filters.computeType === 'gpu'
      ? filters.acceleratorCounts.filter((count) =>
          options.acceleratorCounts.includes(count),
        )
      : [];

  if (
    sameStrings(filters.sites, sites) &&
    sameStrings(filters.acceleratorModels, acceleratorModels) &&
    sameNumbers(filters.acceleratorCounts, acceleratorCounts)
  ) {
    return filters;
  }

  return {
    ...filters,
    sites,
    acceleratorModels,
    acceleratorCounts,
  };
}

export function MarketplacePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const resourceType = parseResourceType(searchParams.get('type'));
  const shouldRestore = Boolean(
    (location.state as { restoreMarketplaceContext?: boolean } | null)
      ?.restoreMarketplaceContext,
  );
  const [initialContext] = useState(() =>
    shouldRestore ? loadMarketplaceNavigationContext(resourceType) : undefined,
  );
  const initialContextRef = useRef(initialContext);
  const [filters, setFilters] = useState<MarketplaceFilterState>(() =>
    sanitizeFilters(
      initialContext ? filtersFromQuery(initialContext.query) : defaultFilters(),
      resourceType,
    ),
  );
  const effectiveQuery = useMemo<MarketplaceQuery>(() => {
    const sanitizedFilters = sanitizeFilters(filters, resourceType);
    return { resourceType, ...sanitizedFilters };
  }, [filters, resourceType]);
  const [page, setPage] = useState(() => initialContext?.page ?? 1);
  const [feedback, setFeedback] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const filterOptions = getMarketplaceFilterOptions(resourceType);
  const resultsState = useMemo<MarketplaceResultsState>(
    () => ({
      status: 'success',
      result: queryMarketplaceProducts(effectiveQuery),
    }),
    [effectiveQuery],
  );

  useEffect(() => {
    const context = initialContextRef.current;
    if (!context) return;
    initialContextRef.current = undefined;
    const frame = window.requestAnimationFrame(() => {
      const region = getMarketplaceScrollRegion();
      if (region) region.scrollTop = context.scrollTop;
      setFeedback('已恢复离开前的筛选、分页和浏览位置。');
      navigate(location.pathname + location.search, { replace: true, state: null });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.search, navigate]);

  function updateTypeParameter(nextType: MarketplaceResourceType) {
    if (nextType === resourceType) return false;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('type', resourceTypeQueryValue(nextType));
    if (nextParams.toString() === searchParams.toString()) return false;
    setSearchParams(nextParams);
    return true;
  }

  function handleResourceTypeChange(value: string) {
    const nextType: MarketplaceResourceType =
      value === 'physical' ? 'physical-machine' : 'cloud-server';
    if (nextType === resourceType) return;
    setFilters((current) => sanitizeFilters(current, nextType));
    setPage(1);
    setFeedback(
      nextType === 'cloud-server'
        ? '已切换至云服务器。'
        : '已切换至物理机。',
    );
    updateTypeParameter(nextType);
  }

  function handleQueryChange(nextQuery: MarketplaceQuery) {
    setFilters(
      sanitizeFilters(filtersFromQuery(nextQuery), resourceType),
    );
    setPage(1);
    setFeedback('');
  }

  function handleReset() {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('type', 'cloud');
    setFilters(defaultFilters());
    setPage(1);
    setFeedback('已重置全部筛选，当前显示全部云服务器。');
    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams);
    }
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  function handleConfigure(product: MarketplaceProduct) {
    const purchasePath =
      product.resourceType === 'cloud-server'
        ? '/marketplace/cloud-server/purchase'
        : '/marketplace/physical-machine/purchase';
    saveMarketplaceNavigationContext(
      effectiveQuery,
      page,
      getMarketplaceScrollRegion()?.scrollTop ?? 0,
    );
    navigate(`${purchasePath}?product=${encodeURIComponent(product.id)}`, {
      state: { fromMarketplace: true, marketplaceType: resourceType },
    });
  }

  function switchResourceType() {
    const nextType: MarketplaceResourceType =
      resourceType === 'cloud-server' ? 'physical-machine' : 'cloud-server';
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('type', resourceTypeQueryValue(nextType));
    setFilters((current) => sanitizeFilters(current, nextType));
    setPage(1);
    setFeedback(
      nextType === 'cloud-server'
        ? '已切换至云服务器。'
        : '已切换至物理机。',
    );
    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams);
    }
  }

  const catalog = (
    <div className="marketplace-catalog">
      <MarketplaceFilters
        query={effectiveQuery}
        options={filterOptions}
        searchInputRef={searchInputRef}
        onQueryChange={handleQueryChange}
        onReset={handleReset}
        onSearchSubmit={(search) =>
          setFeedback(
            search.trim()
              ? `已按“${search.trim()}”搜索资源。`
              : '已清除搜索关键词。',
          )
        }
      />
      <p className="marketplace-page__feedback" aria-live="polite">
        {feedback}
      </p>
      <MarketplaceResults
        state={resultsState}
        resourceType={resourceType}
        search={effectiveQuery.search}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onConfigure={handleConfigure}
        onClearSearch={() =>
          handleQueryChange({ ...effectiveQuery, search: '' })
        }
        onResetFilters={handleReset}
        onSwitchResourceType={switchResourceType}
      />
    </div>
  );

  return (
    <div className="marketplace-page">
      <Container
        as="section"
        className="marketplace-introduction"
        data-resource-type={resourceType}
      >
        <div className="marketplace-introduction__content">
          <span className="marketplace-introduction__eyebrow">
            计算资源目录
          </span>
          <h2>
            发现适合业务的<span>计算资源</span>
          </h2>
          <p>
            比较云服务器与物理机的站点、计算类型和基础规格，再进入对应的配置页面。购买完成后获得独占机器资源，购后管理在“我的资源”中进行。
          </p>
        </div>
      </Container>

      <Container className="marketplace-tabs-shell">
        <TitleBarTabs
          className="marketplace-tabs"
          aria-label="资源类型"
          value={resourceTypeQueryValue(resourceType)}
          onValueChange={handleResourceTypeChange}
          items={[
            { value: 'cloud', label: '云服务器', panel: catalog },
            { value: 'physical', label: '物理机', panel: catalog },
          ]}
        />
      </Container>
    </div>
  );
}
