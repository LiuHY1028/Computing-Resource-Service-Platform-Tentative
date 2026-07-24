import { Outlet } from 'react-router-dom';
import { ProductAreaNavigation } from './ProductAreaNavigation';
import { useApplicationPageTitle } from './useApplicationPageTitle';
import './product-layouts.css';

export function SoftwareCenterLayout() {
  useApplicationPageTitle();

  return (
    <div className="software-center-layout" data-testid="software-center-layout">
      <ProductAreaNavigation variant="software" />
      <main className="software-center-layout__content">
        <Outlet />
      </main>
      <footer className="software-center-layout__footer">
        <span>软件中心</span>
        <span>软件版本、兼容性与安装任务统一关联控制台资源</span>
      </footer>
    </div>
  );
}
