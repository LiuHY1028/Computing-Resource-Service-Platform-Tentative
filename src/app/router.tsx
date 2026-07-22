import { Navigate, Route, Routes } from 'react-router-dom';
import { ModulePlaceholderPage } from '../pages/ModulePlaceholderPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { UiSpecPage } from '../pages/UiSpecPage';
import { FoundationComponentsPage } from '../pages/FoundationComponentsPage';
import { AppShell } from './shell/AppShell';
import {
  APP_PAGE_ROUTES,
  DEFAULT_APP_ROUTE,
  FOUNDATION_COMPONENTS_ROUTE,
} from './routes';

export const ROUTE_PATHS = Object.freeze({
  root: '/',
  default: DEFAULT_APP_ROUTE.path,
  uiSpec: '/__dev/ui-spec',
  foundationComponents: FOUNDATION_COMPONENTS_ROUTE.path,
  fallback: '*',
});

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
            element={<ModulePlaceholderPage route={route} />}
            key={route.pageId}
          />
        ))}
        <Route
          path={ROUTE_PATHS.foundationComponents}
          element={<FoundationComponentsPage />}
        />
      </Route>
      <Route path={ROUTE_PATHS.uiSpec} element={<UiSpecPage />} />
      <Route
        path={ROUTE_PATHS.fallback}
        element={<NotFoundPage homePath={ROUTE_PATHS.default} />}
      />
    </Routes>
  );
}
