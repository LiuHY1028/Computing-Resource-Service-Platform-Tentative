import {
  Table,
  TextButton,
  type TableColumn,
} from '../../../components/ui';
import {
  formatHourlyPrice,
  formatMonthlyPrice,
  getComputePrice,
  money,
} from '../../pricing';
import type { MarketplaceProduct } from '../types';

type MarketplaceSpecificationComparisonProps = Readonly<{
  products: readonly MarketplaceProduct[];
  onSelect: (product: MarketplaceProduct) => void;
}>;

function priceLabel(product: MarketplaceProduct) {
  const price = getComputePrice(product.skuId);
  if (!price) return '价格待核对';
  return price.resourceType === 'cloud-server'
    ? `${formatMonthlyPrice(money(price.monthlyPriceFen))} · ${formatHourlyPrice(money(price.hourlyPriceFen))}`
    : formatMonthlyPrice(money(price.monthlyPriceFen));
}

export function MarketplaceSpecificationComparison({
  products,
  onSelect,
}: MarketplaceSpecificationComparisonProps) {
  const gpuProducts = products.filter(
    (product) => product.computeType === 'gpu' && product.accelerator,
  );
  const maximumCount = Math.max(
    1,
    ...gpuProducts.map((product) => product.accelerator?.count ?? 0),
  );
  const columns: readonly TableColumn<MarketplaceProduct>[] = [
    {
      key: 'product',
      title: '可购规格',
      width: '24%',
      multiline: true,
      render: (product) => (
        <div className="marketplace-comparison-table__cell">
          <TextButton onClick={() => onSelect(product)}>
            {product.name}
          </TextButton>
          <span>
            {product.resourceType === 'cloud-server' ? '云服务器' : '物理机'}
            {' · '}
            {product.site}
          </span>
        </div>
      ),
    },
    {
      key: 'accelerator',
      title: 'GPU / 加速卡',
      width: '25%',
      multiline: true,
      render: (product) => (
        <div className="marketplace-comparison-table__cell">
          <strong>{product.accelerator?.model}</strong>
          <span>{product.cpu} · {product.memoryGb} GB 内存</span>
        </div>
      ),
    },
    {
      key: 'scale',
      title: '配置规模',
      width: '29%',
      multiline: true,
      render: (product) => {
        const count = product.accelerator?.count ?? 0;
        const percent = Math.round((count / maximumCount) * 100);
        return (
          <div className="marketplace-comparison-table__cell">
            <div
              className="marketplace-comparison-table__meter"
              role="progressbar"
              aria-label={`${product.name}配置规模`}
              aria-valuemin={0}
              aria-valuemax={maximumCount}
              aria-valuenow={count}
            >
              <span style={{ width: `${percent}%` }} />
            </div>
            <span>{count} 张 · 相对最大规格 {percent}%</span>
          </div>
        );
      },
    },
    {
      key: 'price',
      title: '计费与价格',
      width: '22%',
      multiline: true,
      render: (product) => (
        <div className="marketplace-comparison-table__cell">
          <strong>{priceLabel(product)}</strong>
          <span>
            {product.configurable ? '可进入配置' : product.unavailableReason}
          </span>
        </div>
      ),
    },
  ];

  return (
    <Table
      aria-label="算力规格对比"
      className="marketplace-comparison-table"
      columns={columns}
      rows={gpuProducts}
      getRowKey={(product) => product.id}
      layout="fixed"
      minWidth="860px"
    />
  );
}
