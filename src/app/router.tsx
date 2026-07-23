import { Navigate, Route, Routes } from 'react-router-dom';
import { ModulePlaceholderPage } from '../pages/ModulePlaceholderPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { UiSpecPage } from '../pages/UiSpecPage';
import { FoundationComponentsPage } from '../pages/FoundationComponentsPage';
import { AdvancedComponentsPage } from '../pages/AdvancedComponentsPage';
import { MarketplacePage } from '../pages/MarketplacePage';
import { PurchasePage } from '../pages/PurchasePage';
import { ResourceListPage } from '../pages/ResourceListPage';
import { ResourceDetailPage } from '../pages/ResourceDetailPage';
import { StorageDetailPage, StorageListPage } from '../pages/StoragePage';
import { ImagesPage } from '../pages/ImagesPage';
import { SoftwarePage } from '../pages/SoftwarePage';
import { AppShell } from './shell/AppShell';
import {
  APP_PAGE_ROUTES,
  ADVANCED_COMPONENTS_ROUTE,
  DEFAULT_APP_ROUTE,
  FOUNDATION_COMPONENTS_ROUTE,
  type AppPageRoute,
} from './routes';

export const ROUTE_PATHS = Object.freeze({
  root: '/',
  default: DEFAULT_APP_ROUTE.path,
  uiSpec: '/__dev/ui-spec',
  foundationComponents: FOUNDATION_COMPONENTS_ROUTE.path,
  advancedComponents: ADVANCED_COMPONENTS_ROUTE.path,
  fallback: '*',
});

function appPageElement(route: AppPageRoute) {
  if (route.pageId === 'MKT-01') {
    return <MarketplacePage />;
  }

  if (route.pageId === 'BUY-01' || route.pageId === 'BUY-02') {
    return (
      <PurchasePage
        resourceType={
          route.pageId === 'BUY-01' ? 'cloud-server' : 'physical-machine'
        }
      />
    );
  }

  if (route.pageId === 'RES-01' || route.pageId === 'RES-03') {
    return (
      <ResourceListPage
        resourceType={
          route.pageId === 'RES-01' ? 'cloud-server' : 'physical-machine'
        }
      />
    );
  }

  if (route.pageId === 'RES-02' || route.pageId === 'RES-04') {
    return (
      <ResourceDetailPage
        resourceType={
          route.pageId === 'RES-02' ? 'cloud-server' : 'physical-machine'
        }
      />
    );
  }

  if (route.pageId === 'STO-01') {
    return <StorageListPage />;
  }

  if (route.pageId === 'STO-02') {
    return <StorageDetailPage />;
  }

  if (route.pageId === 'IMG-01') {
    return <ImagesPage />;
  }

  if (route.pageId === 'SW-01') {
    return <SoftwarePage />;
  }

  return <ModulePlaceholderPage route={route} />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route
        path={ROUTE_PATHS.root}
        element={<Navigate to={ROUTE_PATHS.default} replace />}
      />
      <Route element={<AppShell />}>
        {APP_PAGE_ROUTES.map((route) => (
          <Route
            path={route.path}
            element={appPageElement(route)}
            key={route.pageId}
          />
        ))}
        {import.meta.env.DEV && (
          <>
            <Route
              path={ROUTE_PATHS.foundationComponents}
              element={<FoundationComponentsPage />}
            />
            <Route
              path={ROUTE_PATHS.advancedComponents}
              element={<AdvancedComponentsPage />}
            />
          </>
        )}
      </Route>
      {import.meta.env.DEV && (
        <Route path={ROUTE_PATHS.uiSpec} element={<UiSpecPage />} />
      )}
      <Route
        path={ROUTE_PATHS.fallback}
        element={<NotFoundPage homePath={ROUTE_PATHS.default} />}
      />
    </Routes>
  );
}
