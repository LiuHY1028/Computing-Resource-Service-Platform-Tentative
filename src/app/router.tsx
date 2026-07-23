import { Navigate, Route, Routes } from 'react-router-dom';
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
import { NetworkAccessPage } from '../pages/NetworkAccessPage';
import {
  OperationRecordsPage,
  OrderDetailPage,
  OrderListPage,
} from '../pages/OrdersPage';
import { AppShell } from './shell/AppShell';
import {
  APP_PAGE_ROUTES,
  DEFAULT_APP_ROUTE,
  type AppPageRoute,
} from './routes';

export const ROUTE_PATHS = Object.freeze({
  root: '/',
  default: DEFAULT_APP_ROUTE.path,
  fallback: '*',
});

const developmentRoutes = import.meta.env.DEV
  ? {
      uiSpec: '/__dev/ui-spec',
      foundationComponents: '/__dev/components/foundation',
      advancedComponents: '/__dev/components/advanced',
    }
  : undefined;

function appPageElement(route: AppPageRoute) {
  switch (route.pageId) {
    case 'MKT-01':
      return <MarketplacePage />;
    case 'BUY-01':
      return <PurchasePage resourceType="cloud-server" />;
    case 'BUY-02':
      return <PurchasePage resourceType="physical-machine" />;
    case 'RES-01':
      return <ResourceListPage resourceType="cloud-server" />;
    case 'RES-02':
      return <ResourceDetailPage resourceType="cloud-server" />;
    case 'RES-03':
      return <ResourceListPage resourceType="physical-machine" />;
    case 'RES-04':
      return <ResourceDetailPage resourceType="physical-machine" />;
    case 'STO-01':
      return <StorageListPage />;
    case 'STO-02':
      return <StorageDetailPage />;
    case 'IMG-01':
      return <ImagesPage />;
    case 'SW-01':
      return <SoftwarePage />;
    case 'NET-01':
      return <NetworkAccessPage />;
    case 'ORD-01':
      return <OrderListPage />;
    case 'ORD-02':
      return <OrderDetailPage />;
    case 'OPS-01':
      return <OperationRecordsPage />;
    default: {
      const unsupportedPage: never = route.pageId;
      throw new Error(`Unsupported page: ${unsupportedPage}`);
    }
  }
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
        {developmentRoutes && (
          <>
            <Route
              path={developmentRoutes.foundationComponents}
              element={<FoundationComponentsPage />}
            />
            <Route
              path={developmentRoutes.advancedComponents}
              element={<AdvancedComponentsPage />}
            />
          </>
        )}
      </Route>
      {developmentRoutes && (
        <Route path={developmentRoutes.uiSpec} element={<UiSpecPage />} />
      )}
      <Route
        path={ROUTE_PATHS.fallback}
        element={<NotFoundPage homePath={ROUTE_PATHS.default} />}
      />
    </Routes>
  );
}
