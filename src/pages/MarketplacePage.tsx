import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, TitleBarTabs } from '../components/ui';
import {
  MarketplaceFilters,
  MarketplaceResults,
  MARKETPLACE_DEMO_DATA_NOTICE,
  getMarketplaceFilterOptions,
  queryMarketplaceProducts,
  type MarketplaceProduct,
  type MarketplaceQuery,
  type MarketplaceResourceType,
  type MarketplaceResultsState,
} from '../features/marketplace';
import '../features/marketplace/marketplace.css';

const PAGE_SIZE = 6;

type MarketplaceDemoState = 'normal' | 'loading' | 'error' | 'empty';

function parseResourceType(value: string | null): MarketplaceResourceType {
  return value === 'physical' ? 'physical-machine' : 'cloud-server';
}

function resourceTypeQueryValue(resourceType: MarketplaceResourceType) {
  return resourceType === 'cloud-server' ? 'cloud' : 'physical';
}

function parseDemoState(value: string | null): MarketplaceDemoState {
  return value === 'loading' || value === 'error' || value === 'empty'
    ? value
    : 'normal';
}

function defaultQuery(resourceType: MarketplaceResourceType): MarketplaceQuery {
  return {
    resourceType,
    search: '',
    sites: [],
    computeType: 'all',
    acceleratorModels: [],
    acceleratorCounts: [],
    availability: 'all',
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

function sanitizeQuery(
  query: MarketplaceQuery,
  resourceType: MarketplaceResourceType,
) {
  const options = getMarketplaceFilterOptions(resourceType);
  const sites = query.sites.filter((site) => options.sites.includes(site));
  const acceleratorModels =
    query.computeType === 'gpu'
      ? query.acceleratorModels.filter((model) =>
          options.acceleratorModels.includes(model),
        )
      : [];
  const acceleratorCounts =
    query.computeType === 'gpu'
      ? query.acceleratorCounts.filter((count) =>
          options.acceleratorCounts.includes(count),
        )
      : [];

  if (
    query.resourceType === resourceType &&
    sameStrings(query.sites, sites) &&
    sameStrings(query.acceleratorModels, acceleratorModels) &&
    sameNumbers(query.acceleratorCounts, acceleratorCounts)
  ) {
    return query;
  }

  return {
    ...query,
    resourceType,
    sites,
    acceleratorModels,
    acceleratorCounts,
  };
}

export function MarketplacePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const resourceType = parseResourceType(searchParams.get('type'));
  const demoState = parseDemoState(searchParams.get('demoState'));
  const [query, setQuery] = useState<MarketplaceQuery>(() =>
    defaultQuery(resourceType),
  );
  const effectiveQuery = useMemo(
    () => sanitizeQuery(query, resourceType),
    [query, resourceType],
  );
  const [settledResults, setSettledResults] = useState<{
    requestKey: string;
    state: MarketplaceResultsState;
  }>();
  const [page, setPage] = useState(1);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [feedback, setFeedback] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const filterOptions = useMemo(
    () => getMarketplaceFilterOptions(resourceType),
    [resourceType],
  );

  const requestKey = JSON.stringify({
    demoState,
    query: effectiveQuery,
    retryAttempt,
  });
  const resultsState: MarketplaceResultsState =
    demoState === 'loading' || settledResults?.requestKey !== requestKey
      ? { status: 'loading' }
      : settledResults.state;

  useEffect(() => {
    if (demoState === 'loading') {
      return undefined;
    }

    const controller = new AbortController();
    queryMarketplaceProducts(effectiveQuery, {
      delayMs: demoState === 'normal' ? 0 : undefined,
      simulateEmpty: demoState === 'empty',
      simulateError: demoState === 'error' && retryAttempt === 0,
      signal: controller.signal,
    })
      .then((result) => {
        setSettledResults({
          requestKey,
          state: { status: 'success', result },
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        setSettledResults({
          requestKey,
          state: {
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : '无法读取本地演示资源，请重新加载。',
          },
        });
      });

    return () => controller.abort();
  }, [demoState, effectiveQuery, requestKey, retryAttempt]);

  function updateTypeParameter(nextType: MarketplaceResourceType) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('type', resourceTypeQueryValue(nextType));
    setSearchParams(nextParams);
  }

  function handleResourceTypeChange(value: string) {
    const nextType: MarketplaceResourceType =
      value === 'physical' ? 'physical-machine' : 'cloud-server';
    setQuery((current) => sanitizeQuery(current, nextType));
    setPage(1);
    setFeedback(
      nextType === 'cloud-server'
        ? '已切换至云服务器。'
        : '已切换至物理机。',
    );
    updateTypeParameter(nextType);
  }

  function handleQueryChange(nextQuery: MarketplaceQuery) {
    setQuery(sanitizeQuery(nextQuery, resourceType));
    setPage(1);
    setFeedback('');
  }

  function handleReset() {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('type', 'cloud');
    setQuery(defaultQuery('cloud-server'));
    setPage(1);
    setFeedback('已重置全部筛选，当前显示全部云服务器。');
    setSearchParams(nextParams);
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  function handleConfigure(product: MarketplaceProduct) {
    const purchasePath =
      product.resourceType === 'cloud-server'
        ? '/marketplace/cloud-server/purchase'
        : '/marketplace/physical-machine/purchase';
    navigate(`${purchasePath}?product=${encodeURIComponent(product.id)}`, {
      state: { fromMarketplace: true },
    });
  }

  function handleRetry() {
    setRetryAttempt((attempt) => attempt + 1);
    setFeedback('正在重新加载演示资源。');
  }

  function switchResourceType() {
    const nextType: MarketplaceResourceType =
      resourceType === 'cloud-server' ? 'physical-machine' : 'cloud-server';
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('type', resourceTypeQueryValue(nextType));
    nextParams.delete('demoState');
    setQuery((current) => sanitizeQuery(current, nextType));
    setPage(1);
    setFeedback(
      nextType === 'cloud-server'
        ? '已切换至云服务器并退出空目录验收场景。'
        : '已切换至物理机并退出空目录验收场景。',
    );
    setSearchParams(nextParams);
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
        onRetry={handleRetry}
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
      <Container as="section" className="marketplace-introduction">
        <div>
          <h2>选择适合的机器资源</h2>
          <p>
            比较云服务器与物理机的站点、计算类型和基础规格，再进入对应的配置页面。购买完成后获得独占机器资源，购后管理在“我的资源”中进行。
          </p>
        </div>
        <p className="marketplace-introduction__data-note">
          <strong>演示数据</strong>
          {MARKETPLACE_DEMO_DATA_NOTICE}
        </p>
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
