import { Button, Container, TextButton } from '../../../components/ui';
import type { PurchaseProduct } from '../types';

type SelectedProductSummaryProps = Readonly<{
  product: PurchaseProduct;
  onReturn: () => void;
  onChangeProduct: () => void;
}>;

export function SelectedProductSummary({
  product,
  onReturn,
  onChangeProduct,
}: SelectedProductSummaryProps) {
  const gpu = product.accelerator
    ? `${product.accelerator.model} × ${product.accelerator.count}`
    : '无 GPU';
  return (
    <Container
      as="section"
      className="purchase-selected-product"
      id="purchase-selected-product"
      aria-labelledby="purchase-selected-product-title"
    >
      <div className="purchase-section-heading">
        <div>
          <span>已选{product.resourceType === 'cloud-server' ? '资源' : '整机'}</span>
          <h3 id="purchase-selected-product-title">{product.name}</h3>
        </div>
        <div className="purchase-selected-product__actions">
          <TextButton onClick={onReturn}>返回商城</TextButton>
          <Button variant="secondary" onClick={onChangeProduct}>
            更换规格
          </Button>
        </div>
      </div>
      <dl className="purchase-spec-grid">
        <div><dt>站点</dt><dd>{product.site}</dd></div>
        <div><dt>计算类型</dt><dd>{product.computeType === 'gpu' ? 'GPU 计算' : 'CPU 计算'}</dd></div>
        <div><dt>CPU</dt><dd>{product.cpu}</dd></div>
        <div><dt>内存</dt><dd>{product.memoryGb} GB</dd></div>
        <div><dt>GPU</dt><dd>{gpu}</dd></div>
        <div>
          <dt>{product.resourceType === 'cloud-server' ? '默认系统盘' : '整机摘要'}</dt>
          <dd>
            {product.resourceType === 'cloud-server'
              ? `${product.defaultSystemDiskGb} GB`
              : product.machineSummary ?? '以所选整机规格为准'}
          </dd>
        </div>
      </dl>
      <div className="purchase-availability" data-available={product.configurable}>
        <span aria-hidden="true" />
        {product.configurable ? '当前规格可配置' : '当前规格暂不可配置'}
      </div>
    </Container>
  );
}
