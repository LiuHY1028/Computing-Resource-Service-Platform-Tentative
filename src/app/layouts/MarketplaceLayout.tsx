import { Outlet } from 'react-router-dom';
import { ProductAreaFooter } from './ProductAreaFooter';
import { ProductAreaNavigation } from './ProductAreaNavigation';
import { useApplicationPageTitle } from './useApplicationPageTitle';
import './product-layouts.css';

export function MarketplaceLayout() {
  useApplicationPageTitle();

  return (
    <div className="marketplace-layout" data-testid="marketplace-layout">
      <ProductAreaNavigation variant="marketplace" />
      <div className="marketplace-layout__content">
        <main className="product-area-layout__main">
          <Outlet />
        </main>
        <ProductAreaFooter />
      </div>
    </div>
  );
}
