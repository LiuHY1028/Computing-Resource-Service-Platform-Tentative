import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, UnderlineTabs } from '../components/ui';
import { APP_PATHS } from '../app/routes';
import marketplaceResourceImage from '../assets/product/marketplace-resource-orchestration.jpg';
import {
  MarketplaceFilters,
  MarketplacePriceMatrix,
  MarketplaceResults,
  MarketplaceSpecificationComparison,
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
  const priceMatrixProducts = useMemo(
    () =>
      queryMarketplaceProducts({
        resourceType,
        ...defaultFilters(),
      }).items,
    [resourceType],
  );
  const comparisonProducts = useMemo(
    () =>
      (['cloud-server', 'physical-machine'] as const).flatMap(
        (candidateType) =>
          queryMarketplaceProducts({
            resourceType: candidateType,
            ...defaultFilters(),
          }).items,
      ),
    [],
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

  function handleComparisonSelect(product: MarketplaceProduct) {
    const nextFilters = sanitizeFilters(
      {
        ...defaultFilters(),
        computeType: 'gpu',
        acceleratorModels: product.accelerator
          ? [product.accelerator.model]
          : [],
        acceleratorCounts: product.accelerator
          ? [product.accelerator.count]
          : [],
      },
      product.resourceType,
    );
    setFilters(nextFilters);
    setPage(1);
    setFeedback(`已定位“${product.name}”对应的可购规格。`);
    updateTypeParameter(product.resourceType);
    window.requestAnimationFrame(() => {
      const catalogElement = document.getElementById('marketplace-catalog');
      if (
        catalogElement &&
        typeof catalogElement.scrollIntoView === 'function'
      ) {
        catalogElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
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
        <div className="marketplace-hero__inner">
          <div className="marketplace-hero__content">
            <span className="marketplace-hero__eyebrow">算力资源服务</span>
            <h1>面向业务工作负载的算力资源</h1>
            <p>
              集中比较云服务器与物理机的核心规格、站点和计费方式，进入配置页继续选择镜像、存储与网络。
            </p>
            <div className="marketplace-hero__actions">
              <Button
                className="marketplace-hero__primary-action"
                variant="primary"
                onClick={() => {
                  const catalogElement =
                    document.getElementById('marketplace-catalog');
                  if (
                    catalogElement &&
                    typeof catalogElement.scrollIntoView === 'function'
                  ) {
                    catalogElement.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    });
                  }
                }}
              >
                浏览资源
              </Button>
              <Button
                className="marketplace-hero__secondary-action"
                variant="secondary"
                onClick={() => navigate(APP_PATHS.cloudResources)}
              >
                进入控制台
              </Button>
            </div>
          </div>
          <div className="marketplace-hero__visual" aria-hidden="true">
            <svg viewBox="0 0 520 340">
              <path d="M84 270H430" className="marketplace-hero__visual-line" />
              <path d="M132 270V190H260V270" className="marketplace-hero__visual-line" />
              <path d="M260 270V126H388V270" className="marketplace-hero__visual-line" />
              <rect x="112" y="70" width="164" height="112" rx="12" />
              <rect x="238" y="106" width="174" height="116" rx="12" />
              <rect x="150" y="102" width="88" height="12" rx="6" className="marketplace-hero__visual-slot" />
              <rect x="150" y="130" width="56" height="10" rx="5" className="marketplace-hero__visual-slot" />
              <rect x="276" y="140" width="98" height="12" rx="6" className="marketplace-hero__visual-slot" />
              <rect x="276" y="168" width="62" height="10" rx="5" className="marketplace-hero__visual-slot" />
              <circle cx="126" cy="294" r="13" />
              <circle cx="260" cy="294" r="13" />
              <circle cx="394" cy="294" r="13" />
              <path d="M126 281V250M260 281V222M394 281V250" className="marketplace-hero__visual-line" />
            </svg>
          </div>
        </div>
      </section>

      <section className="marketplace-capability-strip" aria-label="资源购买能力">
        <div className="marketplace-capability-strip__inner">
          <div><span>01</span><strong>多类型算力</strong><p>云服务器与物理机集中选择。</p></div>
          <div><span>02</span><strong>GPU 规格覆盖</strong><p>按型号和卡数核对可购配置。</p></div>
          <div><span>03</span><strong>灵活计费</strong><p>按资源类型查看包月或按量价格。</p></div>
          <div><span>04</span><strong>状态持续追踪</strong><p>订单与资源处理状态统一记录。</p></div>
        </div>
      </section>

      <section
        className="marketplace-section marketplace-pricing-section"
        aria-label="算力方案与价格"
      >
        <UnderlineTabs
          className="marketplace-price-tabs"
          aria-label="资源类型"
          value={resourceTypeQueryValue(resourceType)}
          onValueChange={handleResourceTypeChange}
          items={[
            {
              value: 'cloud',
              label: '云服务器',
              panel: (
                <MarketplacePriceMatrix
                  products={priceMatrixProducts}
                  billingMode={effectiveQuery.billingMode}
                  onConfigure={handleConfigure}
                />
              ),
            },
            {
              value: 'physical',
              label: '物理机',
              panel: (
                <MarketplacePriceMatrix
                  products={priceMatrixProducts}
                  billingMode={effectiveQuery.billingMode}
                  onConfigure={handleConfigure}
                />
              ),
            },
          ]}
        />
      </section>

      <section
        className="marketplace-section marketplace-catalog-section"
        id="marketplace-catalog"
        aria-labelledby="marketplace-catalog-title"
      >
        <div className="marketplace-section-heading marketplace-catalog-heading">
          <div>
            <span>完整资源目录</span>
            <h2 id="marketplace-catalog-title">筛选并配置算力资源</h2>
          </div>
          <p>当前显示{resourceType === 'cloud-server' ? '云服务器' : '物理机'}，可使用条件栏进一步缩小范围。</p>
        </div>
        {catalog}
      </section>

      <section
        className="marketplace-section marketplace-comparison-section"
        aria-labelledby="marketplace-comparison-title"
      >
        <div className="marketplace-section-heading marketplace-section-heading--centered">
          <span>规格比较</span>
          <h2 id="marketplace-comparison-title">算力规格对比</h2>
          <p>配置规模按当前目录最大可购卡数归一化，不代表理论性能或实测跑分。</p>
        </div>
        <MarketplaceSpecificationComparison
          products={comparisonProducts}
          onSelect={handleComparisonSelect}
        />
      </section>

      <section
        className="marketplace-value-story"
        aria-labelledby="marketplace-value-title"
      >
        <figure className="marketplace-value-story__visual">
          <img
            src={marketplaceResourceImage}
            alt="算力资源统一选择与管理示意"
            width="1280"
            height="853"
            loading="lazy"
          />
          <figcaption>
            <strong>一个入口连接资源全流程</strong>
            <span>云服务器与物理机沿用同一套选择和管理路径</span>
          </figcaption>
        </figure>
        <div className="marketplace-value-story__content">
          <span>不止是列出规格</span>
          <h2 id="marketplace-value-title">
            把算力选择、购买配置和资源管理连成一条线
          </h2>
          <p>
            面对云服务器与物理机，不必在规格表、价格说明和管理入口之间来回寻找。
            平台把关键选择集中起来，也把购买后的资源状态接回同一个控制台。
          </p>
          <div className="marketplace-value-story__points" role="list">
            <div role="listitem">
              <span>01</span>
              <div>
                <strong>规格更好找</strong>
                <p>按站点、计算类型、加速卡型号、卡数和计费模式组合筛选。</p>
              </div>
            </div>
            <div role="listitem">
              <span>02</span>
              <div>
                <strong>价格更清楚</strong>
                <p>目录与配置页读取统一价格，完整金额在下单前继续核对。</p>
              </div>
            </div>
            <div role="listitem">
              <span>03</span>
              <div>
                <strong>买完接着管</strong>
                <p>订单、资源准备和后续管理入口保持关联，不让流程断在购买页。</p>
              </div>
            </div>
          </div>
          <div className="marketplace-value-story__actions">
            <Button
              className="marketplace-value-story__primary-action"
              variant="primary"
              onClick={() =>
                document
                  .getElementById('marketplace-catalog')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            >
              选择算力资源
            </Button>
            <Button
              className="marketplace-value-story__secondary-action"
              variant="secondary"
              onClick={() => navigate(APP_PATHS.cloudResources)}
            >
              管理已有资源
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
