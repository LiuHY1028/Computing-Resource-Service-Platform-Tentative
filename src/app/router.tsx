import { Route, Routes } from 'react-router-dom';
import { EngineeringPlaceholderPage } from '../pages/EngineeringPlaceholderPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { UiSpecPage } from '../pages/UiSpecPage';

export const ROUTE_PATHS = Object.freeze({
  home: '/',
  uiSpec: '/__dev/ui-spec',
  fallback: '*',
});

export function AppRouter() {
  return (
    <Routes>
      <Route
        path={ROUTE_PATHS.home}
        element={<EngineeringPlaceholderPage />}
      />
      <Route path={ROUTE_PATHS.uiSpec} element={<UiSpecPage />} />
      <Route
        path={ROUTE_PATHS.fallback}
        element={<NotFoundPage homePath={ROUTE_PATHS.home} />}
      />
    </Routes>
  );
}
