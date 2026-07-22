import { useId } from 'react';
import { Button, Container, Tooltip } from '../../../components/ui';
import type { MarketplaceProduct } from '../types';

type ResourceProductCardProps = Readonly<{
  product: MarketplaceProduct;
  onConfigure: (product: MarketplaceProduct) => void;
}>;

function resourceTypeLabel(product: MarketplaceProduct) {
  return product.resourceType === 'cloud-server' ? '云服务器' : '物理机';
}

function computeTypeLabel(product: MarketplaceProduct) {
  return product.computeType === 'gpu' ? 'GPU 计算' : 'CPU 计算';
}

export function ResourceProductCard({
  product,
  onConfigure,
}: ResourceProductCardProps) {
  const unavailableReasonId = useId();
  const availabilityLabel = product.configurable ? '可继续配置' : '暂不可配置';
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
      data-product-id={product.id}
      aria-label={`${product.name}，${availabilityLabel}`}
    >
      <header className="resource-product-card__header">
        <div className="resource-product-card__identity">
          <span className="resource-product-card__type">
            {resourceTypeLabel(product)}
          </span>
          <h3>{product.name}</h3>
        </div>
        <span
          className="resource-product-card__availability"
          data-status={product.configurable ? 'available' : 'unavailable'}
        >
          <span aria-hidden="true" />
          {availabilityLabel}
        </span>
      </header>

      <div className="resource-product-card__summary">
        <span>{product.site}</span>
        <span>{computeTypeLabel(product)}</span>
      </div>

      <dl className="resource-product-card__specifications">
        <div>
          <dt>CPU 规格</dt>
          <dd>{product.cpu}</dd>
        </div>
        <div>
          <dt>内存</dt>
          <dd>{product.memoryGb} GB</dd>
        </div>
        {product.accelerator && (
          <>
            <div>
              <dt>加速卡型号</dt>
              <dd>{product.accelerator.model}</dd>
            </div>
            <div>
              <dt>加速卡数量</dt>
              <dd>{product.accelerator.count} 张</dd>
            </div>
          </>
        )}
        {product.resourceType === 'cloud-server' &&
          product.defaultSystemDiskGb !== undefined && (
            <div>
              <dt>默认系统盘</dt>
              <dd>{product.defaultSystemDiskGb} GB</dd>
            </div>
          )}
        {product.resourceType === 'physical-machine' &&
          product.machineSummary && (
            <div>
              <dt>整机摘要</dt>
              <dd>{product.machineSummary}</dd>
            </div>
          )}
      </dl>

      <footer className="resource-product-card__footer">
        {!product.configurable && (
          <p
            className="resource-product-card__unavailable-reason"
            id={unavailableReasonId}
          >
            {product.unavailableReason ?? '该演示规格当前不可继续配置。'}
          </p>
        )}
        <div className="resource-product-card__action">
          {product.configurable ? (
            configureButton
          ) : (
            <Tooltip
              content={
                product.unavailableReason ?? '该演示规格当前不可继续配置。'
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
