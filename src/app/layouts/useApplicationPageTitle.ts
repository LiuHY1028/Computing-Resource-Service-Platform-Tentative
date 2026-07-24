import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { productConfig } from '../../config/product';
import { findShellPageRoute } from '../routes';

export function useApplicationPageTitle() {
  const location = useLocation();
  const currentRoute = findShellPageRoute(location.pathname);

  useEffect(() => {
    if (currentRoute) {
      document.title = `${currentRoute.pageTitle} - ${productConfig.displayName}`;
    }
  }, [currentRoute]);

  if (!currentRoute) {
    throw new Error(`No application route matches ${location.pathname}.`);
  }

  return currentRoute;
}
