import { useNavigate, useSearchParams } from 'react-router-dom';
import type { AppPageRoute } from '../app/routes';
import { Button, Container } from '../components/ui';
import { getMarketplaceProductById } from '../features/marketplace';
import './PurchasePlaceholderPage.css';

type PurchasePlaceholderPageProps = Readonly<{
  route: AppPageRoute;
}>;

export function PurchasePlaceholderPage({ route }: PurchasePlaceholderPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedProduct = getMarketplaceProductById(searchParams.get('product') ?? '');
  const expectedResourceType =
    route.pageId === 'BUY-01' ? 'cloud-server' : 'physical-machine';
  const validSelectedProduct =
    selectedProduct?.resourceType === expectedResourceType
      ? selectedProduct
      : undefined;
  const marketplaceType = expectedResourceType === 'cloud-server' ? 'cloud' : 'physical';

  return (
    <section className="purchase-placeholder-page" aria-labelledby="purchase-placeholder-title">
      <Container className="purchase-placeholder-page__content">
        <p className="purchase-placeholder-page__eyebrow">Task 05A 购买入口</p>
        <h2 id="purchase-placeholder-title">购买配置将在 Task 05B 实现</h2>
        <p>
          当前页面只验证从资源商城进入正确配置路由，不包含配置表单、提交、订单或资源开通流程。
        </p>

        {validSelectedProduct && (
          <Container className="purchase-placeholder-page__selection" variant="info">
            <span>已从资源商城选择演示规格</span>
            <strong>{validSelectedProduct.name}</strong>
            <span>
              {validSelectedProduct.site} · {validSelectedProduct.cpu} ·{' '}
              {validSelectedProduct.memoryGb} GB 内存
            </span>
          </Container>
        )}

        <div className="purchase-placeholder-page__actions">
          <Button
            variant="secondary"
            onClick={() => navigate(`/marketplace?type=${marketplaceType}`)}
          >
            返回资源商城
          </Button>
        </div>
      </Container>
    </section>
  );
}
