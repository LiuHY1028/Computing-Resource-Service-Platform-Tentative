import { Outlet } from 'react-router-dom';
import { ProductAreaNavigation } from './ProductAreaNavigation';
import { useApplicationPageTitle } from './useApplicationPageTitle';
import './product-layouts.css';

export function MarketplaceLayout() {
  useApplicationPageTitle();

  return (
    <div className="marketplace-layout" data-testid="marketplace-layout">
      <ProductAreaNavigation variant="marketplace" />
      <main className="marketplace-layout__content">
        <Outlet />
      </main>
      <footer className="marketplace-layout__footer">
        <span>算力资源购买与配置</span>
        <span>订单创建后可在控制台追踪付款和资源交付信息</span>
      </footer>
    </div>
  );
}
