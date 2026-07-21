import { Route, Routes } from 'react-router-dom';
import { EngineeringPlaceholderPage } from '../pages/EngineeringPlaceholderPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const ROUTE_PATHS = Object.freeze({
  home: '/',
  fallback: '*',
});

export function AppRouter() {
  return (
    <Routes>
      <Route
        path={ROUTE_PATHS.home}
        element={<EngineeringPlaceholderPage />}
      />
      <Route
        path={ROUTE_PATHS.fallback}
        element={<NotFoundPage homePath={ROUTE_PATHS.home} />}
      />
    </Routes>
  );
}
