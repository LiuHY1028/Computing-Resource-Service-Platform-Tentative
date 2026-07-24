import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { productConfig } from '../../config/product';
import { MainContent } from '../shell/MainContent';
import { SideNavigation } from '../shell/SideNavigation';
import { TopNavbar } from '../shell/TopNavbar';
import { useApplicationPageTitle } from './useApplicationPageTitle';
import '../shell/AppShell.css';

export function ConsoleLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const currentRoute = useApplicationPageTitle();

  return (
    <div
      className="app-shell console-layout"
      data-testid="console-layout"
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
