import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { productConfig } from '../../config/product';
import { findShellPageRoute } from '../routes';
import { MainContent } from './MainContent';
import { SideNavigation } from './SideNavigation';
import { TopNavbar } from './TopNavbar';
import './AppShell.css';

export function AppShell() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const currentRoute = findShellPageRoute(location.pathname);

  useEffect(() => {
    if (currentRoute) {
      document.title = `${currentRoute.pageTitle} - ${productConfig.displayName}`;
    }
  }, [currentRoute]);

  if (!currentRoute) {
    throw new Error(`No application shell route matches ${location.pathname}.`);
  }

  return (
    <div
      className="app-shell"
      data-sidebar-state={collapsed ? 'collapsed' : 'expanded'}
    >
      <TopNavbar product={productConfig} collapsed={collapsed} />
      <SideNavigation
        collapsed={collapsed}
        activeItemId={currentRoute.navigationItemId}
        onCollapsedChange={setCollapsed}
      />
      <MainContent pageTitle={currentRoute.pageTitle}>
        <Outlet />
      </MainContent>
    </div>
  );
}
