import { useId } from 'react';
import { Button, Container, Tooltip } from '../../../components/ui';
import {
  formatHourlyPrice,
  formatMonthlyPrice,
  getComputePrice,
  money,
} from '../../pricing';
import type {
  MarketplaceBillingModeFilter,
  MarketplaceProduct,
} from '../types';

type ResourceProductCardProps = Readonly<{
  product: MarketplaceProduct;
  preferredBillingMode?: MarketplaceBillingModeFilter;
  onConfigure: (product: MarketplaceProduct) => void;
}>;

function resourceTypeLabel(product: MarketplaceProduct) {
  return product.resourceType === 'cloud-server' ? '云服务器' : '物理机';
}

function computeTypeLabel(product: MarketplaceProduct) {
  return product.computeType === 'gpu' ? 'GPU 计算' : 'CPU 计算';
}

type ProductMetric = Readonly<{
  label: string;
  value: string;
  metric: 'accelerator' | 'accelerator-count' | 'compute' | 'cpu' | 'cpu-long' | 'cpu-wide' | 'memory' | 'system-disk';
  emphasis?: boolean;
  tooltip?: boolean;
}>;

function productMetrics(product: MarketplaceProduct): readonly ProductMetric[] {
  const cpuMetric: ProductMetric = {
    label: 'CPU 规格',
    value: product.cpu,
    metric:
      product.resourceType === 'physical-machine'
        ? product.accelerator
          ? 'cpu-long'
          : 'cpu-wide'
        : 'cpu',
    emphasis: !product.accelerator,
    tooltip: product.resourceType === 'physical-machine',
  };
  const memoryMetric: ProductMetric = {
    label: '内存',
    value: `${product.memoryGb} GB`,
    metric: 'memory',
  };

  if (product.resourceType === 'physical-machine') {
    return product.accelerator
      ? [
          {
            label: '加速卡型号',
            value: product.accelerator.model,
            metric: 'accelerator',
            emphasis: true,
            tooltip: true,
          },
          {
            label: '加速卡数量',
            value: `${product.accelerator.count} 张`,
            metric: 'accelerator-count',
          },
          cpuMetric,
          memoryMetric,
        ]
      : [
          cpuMetric,
          memoryMetric,
          {
            label: '计算类型',
            value: computeTypeLabel(product),
            metric: 'compute',
          },
        ];
  }

  const cloudMetrics: ProductMetric[] = product.accelerator
    ? [
        {
          label: '加速卡型号',
          value: product.accelerator.model,
          metric: 'accelerator',
          emphasis: true,
          tooltip: true,
        },
        cpuMetric,
        memoryMetric,
      ]
    : [
        cpuMetric,
        memoryMetric,
        {
          label: '计算类型',
          value: computeTypeLabel(product),
          metric: 'compute',
        },
      ];

  if (product.defaultSystemDiskGb !== undefined) {
    cloudMetrics.push({
      label: '默认系统盘',
      value: `${product.defaultSystemDiskGb} GB`,
      metric: 'system-disk',
    });
  }

  return cloudMetrics;
}

export function ResourceProductCard({
  product,
  preferredBillingMode = 'all',
  onConfigure,
}: ResourceProductCardProps) {
  const unavailableReasonId = useId();
  const availabilityLabel = product.configurable ? '可继续配置' : '暂不可配置';
  const metrics = productMetrics(product);
  const price = getComputePrice(product.skuId);
  const configureButton = (
    <Button
      variant="primary"
      disabled={!product.configurable}
      aria-describedby={
        product.configurable ? undefined : unavailableReasonId
      }
      onClick={() => onConfigure(product)}
    >
      立即配置
    </Button>
  );

  return (
    <Container
      as="article"
      className="resource-product-card"
      data-configurable={product.configurable ? 'true' : 'false'}
      data-resource-type={product.resourceType}
      data-compute-type={product.computeType}
      data-product-id={product.id}
      aria-label={`${product.name}，${availabilityLabel}`}
    >
      <header className="resource-product-card__header">
        <div className="resource-product-card__header-meta">
          <div className="resource-product-card__classification">
            <span className="resource-product-card__type">
              {resourceTypeLabel(product)}
            </span>
            <span className="resource-product-card__compute-type">
              {computeTypeLabel(product)}
            </span>
          </div>
          <span
            className="resource-product-card__availability"
            data-status={product.configurable ? 'available' : 'unavailable'}
          >
            <span aria-hidden="true" />
            {availabilityLabel}
          </span>
        </div>
        <h3>{product.name}</h3>
      </header>

      <div className="resource-product-card__body">
        <dl
          className="resource-product-card__metrics"
          aria-label="核心硬件规格"
        >
          {metrics.map((metric) => (
            <div
              className="resource-product-card__metric"
              data-emphasis={metric.emphasis ? 'primary' : undefined}
              data-metric={metric.metric}
              key={metric.metric}
            >
              <dt>{metric.label}</dt>
              <dd>
                {metric.tooltip ? (
                  <Tooltip content={metric.value}>
                    <span
                      className="resource-product-card__metric-value"
                      tabIndex={0}
                    >
                      {metric.value}
                    </span>
                  </Tooltip>
                ) : (
                  metric.value
                )}
              </dd>
            </div>
          ))}
        </dl>

        <div
          className="resource-product-card__details"
          aria-label="补充规格信息"
        >
          <span className="resource-product-card__detail">
            <span>站点</span>
            <strong>{product.site}</strong>
          </span>
          {product.resourceType === 'cloud-server' && product.accelerator && (
            <span className="resource-product-card__detail">
              <span>加速卡数量</span>
              <strong>{product.accelerator.count} 张</strong>
            </span>
          )}
          {product.resourceType === 'physical-machine' &&
            product.machineSummary && (
              <Tooltip content={product.machineSummary}>
                <span
                  className="resource-product-card__machine-summary"
                  tabIndex={0}
                >
                  <span>整机摘要</span>
                  <strong>{product.machineSummary}</strong>
                </span>
              </Tooltip>
            )}
        </div>
      </div>

      <footer className="resource-product-card__footer">
        {price && (
          <div className="resource-product-card__pricing" aria-label="资源价格">
            {price.resourceType === 'cloud-server' ? (
              <>
                <strong>
                  {preferredBillingMode === 'pay-as-you-go'
                    ? formatHourlyPrice(money(price.hourlyPriceFen))
                    : formatMonthlyPrice(money(price.monthlyPriceFen))}
                </strong>
                <span>
                  {preferredBillingMode === 'pay-as-you-go'
                    ? `包月 ${formatMonthlyPrice(money(price.monthlyPriceFen))}`
                    : `按量 ${formatHourlyPrice(money(price.hourlyPriceFen))}`}
                </span>
              </>
            ) : (
              <strong>{formatMonthlyPrice(money(price.monthlyPriceFen))}</strong>
            )}
          </div>
        )}
        {product.configurable ? (
          <p className="resource-product-card__action-note">
            进入配置页继续选择
          </p>
        ) : (
          <p
            className="resource-product-card__unavailable-reason"
            id={unavailableReasonId}
          >
            {product.unavailableReason ?? '该规格当前不可继续配置。'}
          </p>
        )}
        <div className="resource-product-card__action">
          {product.configurable ? (
            configureButton
          ) : (
            <Tooltip
              content={
                product.unavailableReason ?? '该规格当前不可继续配置。'
              }
            >
              {configureButton}
            </Tooltip>
          )}
        </div>
      </footer>
    </Container>
  );
}
