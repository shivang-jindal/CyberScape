import { RouteObject, Navigate, useRoutes } from 'react-router-dom';

import { AppShell } from './components/AppShell';
import { OverviewPage } from './pages/OverviewPage';
import { CatalogPage } from './pages/CatalogPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { AssistantPage } from './pages/AssistantPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'overview', element: <Navigate to="/" replace /> },
      { path: 'catalog', element: <CatalogPage /> },
      { path: 'simulator', element: <SimulatorPage /> },
      { path: 'assistant', element: <AssistantPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> }
    ]
  }
];

export function AppRouter() {
  return useRoutes(routes);
}
