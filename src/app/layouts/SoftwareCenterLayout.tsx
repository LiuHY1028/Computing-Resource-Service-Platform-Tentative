import { Outlet } from 'react-router-dom';
import { ProductAreaFooter } from './ProductAreaFooter';
import { ProductAreaNavigation } from './ProductAreaNavigation';
import { useApplicationPageTitle } from './useApplicationPageTitle';
import './product-layouts.css';

export function SoftwareCenterLayout() {
  useApplicationPageTitle();

  return (
    <div className="software-center-layout" data-testid="software-center-layout">
      <ProductAreaNavigation variant="software" />
      <div className="software-center-layout__content">
        <main className="product-area-layout__main">
          <Outlet />
        </main>
        <ProductAreaFooter />
      </div>
    </div>
  );
}
