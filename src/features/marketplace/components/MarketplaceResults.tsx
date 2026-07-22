import type { ReactNode } from 'react';
import {
  Button,
  Container,
  Grid,
  GridItem,
  Pagination,
} from '../../../components/ui';
import type {
  MarketplaceProduct,
  MarketplaceQueryResult,
  MarketplaceResourceType,
} from '../types';
import { ResourceProductCard } from './ResourceProductCard';

export type MarketplaceResultsState =
  | Readonly<{ status: 'loading' }>
  | Readonly<{ status: 'error'; message: string }>
  | Readonly<{ status: 'success'; result: MarketplaceQueryResult }>;

type MarketplaceResultsProps = Readonly<{
  state: MarketplaceResultsState;
  resourceType: MarketplaceResourceType;
  search: string;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onConfigure: (product: MarketplaceProduct) => void;
  onRetry: () => void;
  onClearSearch: () => void;
  onResetFilters: () => void;
  onSwitchResourceType: () => void;
}>;

function resourceTypeLabel(resourceType: MarketplaceResourceType) {
  return resourceType === 'cloud-server' ? '云服务器' : '物理机';
}

function MarketplaceStatePanel({
  variant,
  title,
  description,
  actions,
}: Readonly<{
  variant: 'loading' | 'error' | 'empty' | 'no-result';
  title: string;
  description: string;
  actions?: ReactNode;
}>) {
  return (
    <Container
      className="marketplace-state"
      variant={variant === 'error' ? 'urgent' : 'borderless'}
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      data-state={variant}
    >
      <span className="marketplace-state__indicator" aria-hidden="true" />
      <h3>{title}</h3>
      <p>{description}</p>
      {actions && <div className="marketplace-state__actions">{actions}</div>}
    </Container>
  );
}

export function MarketplaceResults({
  state,
  resourceType,
  search,
  page,
  pageSize,
  onPageChange,
  onConfigure,
  onRetry,
  onClearSearch,
  onResetFilters,
  onSwitchResourceType,
}: MarketplaceResultsProps) {
  const total = state.status === 'success' ? state.result.total : undefined;
  const heading =
    resourceType === 'cloud-server'
      ? { resource: '云服务器', collection: '精选规格' }
      : { resource: '物理机', collection: '整机资源' };

  return (
    <section
      className="marketplace-results"
      aria-labelledby="marketplace-results-title"
      data-resource-type={resourceType}
    >
      <div className="marketplace-results__header">
        <div className="marketplace-results__heading">
          <span className="marketplace-results__eyebrow">当前资源目录</span>
          <h2 id="marketplace-results-title">
            <span>{heading.resource}</span>
            {heading.collection}
          </h2>
          <p>清晰比较核心硬件规格，并从本地演示资源进入配置。</p>
        </div>
        <div className="marketplace-results__count" aria-live="polite">
          <strong>{total ?? '—'}</strong>
          <span>{total === undefined ? '正在更新' : '项结果'}</span>
        </div>
      </div>

      {state.status === 'loading' && (
        <MarketplaceStatePanel
          variant="loading"
          title="正在加载资源规格"
          description="筛选区保持可用，结果将在本地演示数据准备完成后显示。"
        />
      )}

      {state.status === 'error' && (
        <MarketplaceStatePanel
          variant="error"
          title="资源加载失败"
          description={state.message}
          actions={
            <Button variant="primary" onClick={onRetry}>
              重新加载
            </Button>
          }
        />
      )}

      {state.status === 'success' && state.result.catalogTotal === 0 && (
        <MarketplaceStatePanel
          variant="empty"
          title={`当前暂无${resourceTypeLabel(resourceType)}资源`}
          description="当前开发验收场景没有可展示的演示资源，可查看另一类资源。"
          actions={
            <Button variant="secondary" onClick={onSwitchResourceType}>
              查看另一类资源
            </Button>
          }
        />
      )}

      {state.status === 'success' &&
        state.result.catalogTotal > 0 &&
        state.result.total === 0 && (
          <MarketplaceStatePanel
            variant="no-result"
            title="未找到匹配资源"
            description="当前搜索或筛选条件没有匹配结果，请调整条件后重试。"
            actions={
              <>
                {search.trim() && (
                  <Button variant="secondary" onClick={onClearSearch}>
                    清除搜索
                  </Button>
                )}
                <Button variant="primary" onClick={onResetFilters}>
                  重置筛选
                </Button>
              </>
            }
          />
        )}

      {state.status === 'success' && state.result.total > 0 && (
        <>
          <Grid className="marketplace-results__grid" aria-label="资源商品列表">
            {state.result.items
              .slice((page - 1) * pageSize, page * pageSize)
              .map((product) => (
                <GridItem
                  className="marketplace-results__item"
                  span={6}
                  key={product.id}
                >
                  <ResourceProductCard
                    product={product}
                    onConfigure={onConfigure}
                  />
                </GridItem>
              ))}
          </Grid>
          {state.result.total > pageSize && (
            <Pagination
              className="marketplace-results__pagination"
              page={page}
              totalPages={Math.ceil(state.result.total / pageSize)}
              totalItems={state.result.total}
              onPageChange={onPageChange}
            />
          )}
        </>
      )}
    </section>
  );
}
