import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Container, TitleBarTabs } from '../components/ui';
import { APP_PATHS } from '../app/routes';
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
import '../features/marketplace/marketplace-experience.css';

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
    billingMode: 'all',
    priceSort: 'recommended',
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
    billingMode: query.billingMode,
    priceSort: query.priceSort,
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
  const billingMode =
    resourceType === 'cloud-server' ? filters.billingMode : 'all';

  if (
    sameStrings(filters.sites, sites) &&
    sameStrings(filters.acceleratorModels, acceleratorModels) &&
    sameNumbers(filters.acceleratorCounts, acceleratorCounts)
    && filters.billingMode === billingMode
  ) {
    return filters;
  }

  return {
    ...filters,
    sites,
    acceleratorModels,
    acceleratorCounts,
    billingMode,
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
        ? APP_PATHS.cloudPurchase
        : APP_PATHS.physicalPurchase;
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
        billingMode={effectiveQuery.billingMode}
      />
    </div>
  );

  return (
    <div className="marketplace-page">
      {(location.state as { fromResourceList?: string } | null)?.fromResourceList && (
        <div className="marketplace-return-context">
          <span>已从“我的资源”进入，当前资源类型筛选已保留。</span>
          <Button variant="secondary" onClick={() => navigate((location.state as { fromResourceList: string }).fromResourceList)}>
            返回我的资源
          </Button>
        </div>
      )}
      <section className="marketplace-hero" data-resource-type={resourceType}>
        <div className="marketplace-hero__content">
          <span className="marketplace-hero__eyebrow">算力资源商城</span>
          <h1>
            让每一份算力
            <span>都匹配真实工作负载</span>
          </h1>
          <p>
            汇集 CPU 与 GPU 云服务器、专属物理机资源。按站点、核心规格和价格快速比较，进入配置页完成镜像、存储与网络选择。
          </p>
          <div className="marketplace-hero__actions">
            <Button
              variant="primary"
              onClick={() =>
                document
                  .getElementById('marketplace-catalog')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            >
              浏览可购资源
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                handleResourceTypeChange(
                  resourceType === 'cloud-server' ? 'physical' : 'cloud',
                )
              }
            >
              查看{resourceType === 'cloud-server' ? '物理机' : '云服务器'}
            </Button>
          </div>
          <dl className="marketplace-hero__facts">
            <div>
              <dt>资源形态</dt>
              <dd>云服务器 · 物理机</dd>
            </div>
            <div>
              <dt>计算覆盖</dt>
              <dd>CPU · GPU</dd>
            </div>
            <div>
              <dt>可选站点</dt>
              <dd>{filterOptions.sites.length} 个</dd>
            </div>
          </dl>
        </div>
        <div className="marketplace-hero__visual" aria-hidden="true">
          <span className="marketplace-hero__glow" />
          <div className="marketplace-hero__compute-card marketplace-hero__compute-card--primary">
            <span>GPU Compute</span>
            <strong>并行算力</strong>
            <i>高性能计算资源</i>
          </div>
          <div className="marketplace-hero__compute-card marketplace-hero__compute-card--secondary">
            <span>CPU Cloud</span>
            <strong>通用计算</strong>
            <i>灵活规格组合</i>
          </div>
          <div className="marketplace-hero__compute-card marketplace-hero__compute-card--physical">
            <span>Bare Metal</span>
            <strong>专属整机</strong>
            <i>物理资源独占</i>
          </div>
          <span className="marketplace-hero__orbit marketplace-hero__orbit--one" />
          <span className="marketplace-hero__orbit marketplace-hero__orbit--two" />
        </div>
      </section>

      <section className="marketplace-capability-strip" aria-label="资源购买能力">
        <div><span>01</span><strong>筛选与比较</strong><p>用同一视图核对站点、规格和价格。</p></div>
        <div><span>02</span><strong>完整配置</strong><p>继续选择镜像、存储与网络访问。</p></div>
        <div><span>03</span><strong>进入控制台</strong><p>订单创建后统一追踪付款与资源交付信息。</p></div>
      </section>

      <Container className="marketplace-tabs-shell" id="marketplace-catalog">
        <div className="marketplace-catalog-heading">
          <div>
            <span>RESOURCE CATALOG</span>
            <h2>选择适合当前工作负载的资源</h2>
          </div>
          <p>资源价格来自统一价目目录，具体配置在下一步核对。</p>
        </div>
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
