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

  return (
    <section className="marketplace-results" aria-labelledby="marketplace-results-title">
      <div className="marketplace-results__header">
        <div>
          <h2 id="marketplace-results-title">资源规格</h2>
          <p>
            {total === undefined
              ? '正在更新结果数量'
              : `共 ${total} 项${resourceTypeLabel(resourceType)}结果`}
          </p>
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
                <GridItem span={8} key={product.id}>
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
