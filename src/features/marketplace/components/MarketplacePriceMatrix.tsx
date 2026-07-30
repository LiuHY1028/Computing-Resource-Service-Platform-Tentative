import { TextButton } from '../../../components/ui';
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

type MarketplacePriceMatrixProps = Readonly<{
  products: readonly MarketplaceProduct[];
  billingMode: MarketplaceBillingModeFilter;
  onConfigure: (product: MarketplaceProduct) => void;
}>;

function productSpecification(product: MarketplaceProduct) {
  const accelerator = product.accelerator
    ? ` · ${product.accelerator.model} × ${product.accelerator.count}`
    : '';
  return `${product.cpu} · ${product.memoryGb} GB 内存${accelerator}`;
}

function productPrice(
  product: MarketplaceProduct,
  billingMode: MarketplaceBillingModeFilter,
) {
  const price = getComputePrice(product.skuId);
  if (!price) return undefined;
  if (price.resourceType === 'physical-machine') {
    return {
      primary: formatMonthlyPrice(money(price.monthlyPriceFen)),
      secondary: '包月计费',
    };
  }
  if (billingMode === 'pay-as-you-go') {
    return {
      primary: formatHourlyPrice(money(price.hourlyPriceFen)),
      secondary: `包月 ${formatMonthlyPrice(money(price.monthlyPriceFen))}`,
    };
  }
  return {
    primary: formatMonthlyPrice(money(price.monthlyPriceFen)),
    secondary: `按量 ${formatHourlyPrice(money(price.hourlyPriceFen))}`,
  };
}

export function MarketplacePriceMatrix({
  products,
  billingMode,
  onConfigure,
}: MarketplacePriceMatrixProps) {
  return (
    <div className="marketplace-price-matrix" role="list">
      {products.map((product) => {
        const price = productPrice(product, billingMode);
        return (
          <article
            className="marketplace-price-card"
            data-configurable={product.configurable ? 'true' : 'false'}
            key={product.id}
            role="listitem"
          >
            <div className="marketplace-price-card__heading">
              <div>
                <span>
                  {product.resourceType === 'cloud-server'
                    ? '云服务器'
                    : '物理机'}
                </span>
                <h3>{product.name}</h3>
              </div>
              <span
                className="marketplace-price-card__status"
                data-status={product.configurable ? 'available' : 'unavailable'}
              >
                {product.configurable ? '可继续配置' : '暂不可配置'}
              </span>
            </div>

            <p className="marketplace-price-card__specification">
              {productSpecification(product)}
            </p>
            <p className="marketplace-price-card__site">{product.site}</p>

            <div className="marketplace-price-card__footer">
              {price && (
                <div className="marketplace-price-card__price">
                  <strong>{price.primary}</strong>
                  <span>{price.secondary}</span>
                </div>
              )}
              <span title={product.configurable ? undefined : product.unavailableReason}>
                <TextButton
                  disabled={!product.configurable}
                  onClick={() => onConfigure(product)}
                >
                  配置规格
                </TextButton>
              </span>
            </div>
            {!product.configurable && (
              <p className="marketplace-price-card__reason">
                {product.unavailableReason}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
